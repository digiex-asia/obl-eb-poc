# Legacy Adapter Design Document

## Overview

This document details the adapter pattern implementation for achieving backward compatibility between legacy Konva-based templates (stored as single JSON blob) and the new GraphicEditor Command Pattern architecture, **without requiring any database migration or schema changes**.

## Critical Constraint

**CANNOT change existing template JSON structure in database** because:
1. Database stores entire template as single JSON blob
2. Thousands of existing templates would require migration
3. Legacy Konva editor must continue working unchanged
4. Template structure varies by type (cannot guarantee schema)

## Architecture Principle

**Backend-Only Adapter with Legacy as Source of Truth**

```
┌─────────────────────────────────────────────────────┐
│              Frontend (GraphicEditor)                │
│  Always uses DesignData format                       │
│  No knowledge of legacy structure                    │
└────────────────┬────────────────────────────────────┘
                 │
                 │ GET /templates/:id (receive DesignData)
                 │ POST /templates/:id/operations (send Operations)
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│                API Layer                             │
│  - detectVersion(template)                           │
│  - route to appropriate adapter                      │
└────────────────┬────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌──────────────┐  ┌──────────────┐
│  V1 Adapter  │  │  V2 Native   │
│  (Transform) │  │  (Pass-thru) │
└──────┬───────┘  └──────────────┘
       │
       ├─> LegacyToV2Adapter.toDesignData(legacy)
       │   - Cache original for round-trip
       │   - Map children[] → pages[0].elements[]
       │   - Transform 60+ fields → 15 core fields
       │
       ├─> V2ToLegacyAdapter.toLegacy(designData)
       │   - Restore from cache (preserve unknowns)
       │   - Map pages[0].elements[] → children[]
       │   - Merge changes with preserved fields
       │
       └─> OperationTranslator.applyToLegacy(op, legacy)
           - Translate v2 operation → legacy mutation
           - Apply mutation to legacy JSON
           - Return updated legacy template
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│           Database (PostgreSQL/MongoDB)              │
│  Templates stored as JSON blob (unchanged)           │
│  { id, children[], width, height, ... }             │
└─────────────────────────────────────────────────────┘
```

## Format Comparison

### Legacy Konva Format (v1)

```json
{
  "id": "3ea81e638f01468da5f46ed4670c724b",
  "domainId": "65cbacdc222f627b9bb69de0",
  "name": "Header1234",
  "templateType": "Editor",
  "width": 1200,
  "height": 1400,
  "background": "#361E1E",
  "duration": 5000,
  "children": [
    {
      "id": "9d014b58-ed74-4c43-bece-95cd7ce31d25",
      "type": "shape",
      "elementType": "graphicShape",
      "x": 73,
      "y": 1079,
      "width": 208,
      "height": 275,
      "rotation": 0,
      "opacity": 1,
      "fill": "#D0D0D0",
      "padding": { /* 12 fields */ },
      "svgElement": { /* complex nested object */ },
      "elementAnimation": { /* animation config */ },
      "cropX": 0,
      "cropY": 0,
      "cropWidth": 1,
      "cropHeight": 1,
      // ... 50+ more fields
    }
  ],
  "animationConfig": { "speed": 300, "animate": "enter" },
  "guideConfig": { "columnX": 0, "columnY": 0 },
  "marginConfig": { "top": 0, "right": 0, "bottom": 0, "left": 0 }
}
```

**Key Characteristics:**
- Single-page concept (flat `children[]`)
- 60+ fields per element
- Dual type classification (`type` + `elementType`)
- Complex nested objects (`svgElement`, `padding`)
- No version field

### GraphicEditor DesignData Format (v2)

```typescript
{
  canvas: {
    width: 1200,
    height: 1400
  },
  pages: [
    {
      id: "page-1",
      duration: 5,  // seconds
      background: "#361E1E",
      elements: [
        {
          id: "9d014b58-ed74-4c43-bece-95cd7ce31d25",
          type: "polygon",
          className: "graphicShape",  // For Konva compat
          x: 73,
          y: 1079,
          width: 208,
          height: 275,
          rotation: 0,
          opacity: 1,
          fill: "#D0D0D0",
          animation: {
            type: "neon",
            speed: 1.5,
            delay: 0.4,
            direction: "up",
            mode: "enter"
          }
        }
      ],
      animation: {
        type: "fade",
        speed: 1,
        delay: 0,
        mode: "enter"
      }
    }
  ],
  audioLayers: []
}
```

**Key Characteristics:**
- Multi-page structure
- 12-15 fields per element (minimized)
- Single type classification
- Simplified animation object
- Audio support (new)

## Adapter Implementation

### 1. Format Detector

```typescript
// /src/adapters/format-detector.ts

export type TemplateFormat = 'v1-legacy' | 'v2-native' | 'unknown';

export interface FormatDetectionResult {
  format: TemplateFormat;
  confidence: number; // 0.0 to 1.0
}

export function detectFormat(data: unknown): FormatDetectionResult {
  if (!data || typeof data !== 'object') {
    return { format: 'unknown', confidence: 0 };
  }

  const obj = data as Record<string, unknown>;

  // V2 detection: has 'pages' array
  if (Array.isArray(obj.pages)) {
    const hasCanvas = obj.canvas && typeof obj.canvas === 'object';
    return {
      format: 'v2-native',
      confidence: hasCanvas ? 1.0 : 0.8
    };
  }

  // V1 detection: has 'children' array at root
  if (Array.isArray(obj.children)) {
    const hasLegacyFields =
      'templateType' in obj &&
      'animationConfig' in obj &&
      'width' in obj &&
      'height' in obj;

    return {
      format: 'v1-legacy',
      confidence: hasLegacyFields ? 1.0 : 0.7
    };
  }

  return { format: 'unknown', confidence: 0 };
}
```

### 2. Legacy to V2 Adapter

```typescript
// /src/adapters/legacy-to-v2.ts

import { LegacyTemplate, LegacyElement } from './legacy-types';
import { DesignData, DesignElement } from '../types/api.types';

// Cache for round-trip preservation
const originalTemplateCache = new Map<string, LegacyTemplate>();
const originalElementCache = new Map<string, LegacyElement>();

export class LegacyToV2Adapter {
  /**
   * Transform legacy Konva template to DesignData
   */
  toDesignData(legacy: LegacyTemplate): DesignData {
    // Cache complete original for round-trip
    originalTemplateCache.set(legacy.id, structuredClone(legacy));

    // Cache all elements
    for (const child of legacy.children) {
      originalElementCache.set(child.id, structuredClone(child));
    }

    return {
      canvas: {
        width: legacy.width,
        height: legacy.height,
      },
      pages: [
        {
          id: legacy.id, // Reuse template ID as single page ID
          duration: legacy.duration / 1000, // ms → seconds
          background: legacy.background,
          elements: legacy.children.map(child => this.transformElement(child)),
          animation: this.transformAnimationConfig(legacy.animationConfig),
        },
      ],
      audioLayers: [], // Legacy doesn't support audio
    };
  }

  /**
   * Transform legacy element to DesignElement
   */
  private transformElement(legacy: LegacyElement): DesignElement {
    return {
      id: legacy.id,
      type: this.mapElementType(legacy.type, legacy.elementType),
      className: legacy.elementType, // Preserve for Konva compatibility
      x: legacy.x,
      y: legacy.y,
      width: legacy.width,
      height: legacy.height,
      rotation: legacy.rotation || 0,
      fill: legacy.fill || '#000000',
      opacity: legacy.opacity ?? 1,
      text: legacy.text || undefined,
      fontSize: legacy.fontSize || undefined,
      src: legacy.src || undefined,
      animation: legacy.elementAnimation
        ? this.transformElementAnimation(legacy.elementAnimation)
        : undefined,
    };
  }

  /**
   * Map legacy dual-type to single type
   */
  private mapElementType(type: string, elementType: string): ElementType {
    if (type === 'image') return 'image';
    if (type === 'text') return 'text';

    // Shape types
    if (type === 'shape') {
      if (elementType === 'graphicShape') return 'polygon';
      if (elementType.includes('rect')) return 'rect';
      if (elementType.includes('circle')) return 'circle';
      if (elementType.includes('triangle')) return 'triangle';
      if (elementType.includes('star')) return 'star';
    }

    return 'rect'; // Default fallback
  }

  /**
   * Transform legacy elementAnimation to simplified animation
   */
  private transformElementAnimation(legacyAnim: any): AnimationSettings {
    return {
      type: legacyAnim.animationId || 'fade',
      speed: legacyAnim.speed ? legacyAnim.speed / 1000 : 1, // ms → seconds
      delay: legacyAnim.delay ? legacyAnim.delay / 1000 : 0,
      direction: legacyAnim.direction || 'up',
      mode: legacyAnim.animate || 'enter',
    };
  }

  /**
   * Transform template-level animationConfig
   */
  private transformAnimationConfig(config: any): AnimationSettings | undefined {
    if (!config) return undefined;

    return {
      type: 'fade', // Default
      speed: config.speed ? config.speed / 1000 : 1,
      delay: 0,
      direction: 'up',
      mode: config.animate || 'enter',
    };
  }

  /**
   * Clear cache (call when session ends)
   */
  clearCache(templateId: string): void {
    originalTemplateCache.delete(templateId);

    const template = originalTemplateCache.get(templateId);
    if (template) {
      template.children.forEach(child => {
        originalElementCache.delete(child.id);
      });
    }
  }
}
```

### 3. V2 to Legacy Adapter

```typescript
// /src/adapters/v2-to-legacy.ts

export class V2ToLegacyAdapter {
  /**
   * Restore DesignData to legacy format
   */
  toLegacy(designData: DesignData, templateId: string): LegacyTemplate {
    const original = originalTemplateCache.get(templateId);

    if (!original) {
      throw new Error(`No cached original for template ${templateId}. Cannot restore safely.`);
    }

    const page = designData.pages[0]; // Legacy is single-page

    // Start with complete original (ALL fields preserved)
    const restored: LegacyTemplate = {
      ...structuredClone(original),

      // Override only changed fields
      width: designData.canvas.width,
      height: designData.canvas.height,
      background: page?.background || original.background,
      duration: (page?.duration || 5) * 1000, // seconds → ms
      children: page?.elements.map(el => this.restoreElement(el)) || [],
    };

    // Restore template-level animation if changed
    if (page?.animation) {
      restored.animationConfig = this.restoreAnimationConfig(page.animation);
    }

    return restored;
  }

  /**
   * Restore DesignElement to legacy element
   */
  private restoreElement(el: DesignElement): LegacyElement {
    const original = originalElementCache.get(el.id);

    if (original) {
      // Element exists in cache - preserve all original fields
      return {
        ...structuredClone(original),

        // Override only changed fields
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        rotation: el.rotation,
        fill: el.fill,
        opacity: el.opacity,
        text: el.text,
        fontSize: el.fontSize,
        src: el.src,
        elementAnimation: el.animation
          ? this.restoreElementAnimation(el.animation, original.elementAnimation)
          : original.elementAnimation,
      };
    } else {
      // New element created in GraphicEditor - generate with defaults
      return this.createLegacyElementWithDefaults(el);
    }
  }

  /**
   * Create new legacy element with all default fields
   */
  private createLegacyElementWithDefaults(el: DesignElement): LegacyElement {
    return {
      id: el.id,
      elementId: '',
      type: this.reverseMapType(el.type),
      elementType: el.className || this.reverseMapElementType(el.type),
      name: `Element ${el.type}`,
      src: el.src || '',
      borderColor: '',
      text: el.text || '',
      valueList: [],
      richTextArr: [],
      boundaryBox: {},
      listType: '',
      width: el.width,
      height: el.height,
      groupId: null,
      x: el.x,
      y: el.y,
      offsetX: 0,
      offsetY: 0,
      rotation: el.rotation,
      opacity: el.opacity,
      cropWidth: 1,
      cropHeight: 1,
      cropX: 0,
      cropY: 0,
      fontSize: el.fontSize || null,
      visible: true,
      padding: {
        paddingRight: true,
        paddingLeft: true,
        paddingTop: true,
        paddingBottom: true,
        horizontal: 0,
        vertical: 0,
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
        isIndependent: false,
      },
      fill: el.fill,
      align: 'left',
      verticalAlign: 'top',
      fontStyle: 'normal',
      letterSpacing: 0,
      paragraphSpacing: 0,
      lineHeight: 1,
      textTransform: 'none',
      textDecoration: '',
      stroke: 'transparent',
      strokeWidth: 0,
      strokeBgWidth: 0,
      cornerRadius: null,
      cornerRadiusTopLeft: 0,
      cornerRadiusTopRight: 0,
      cornerRadiusBottomLeft: 0,
      cornerRadiusBottomRight: 0,
      hasTransparentBg: false,
      hangingPunctuation: false,
      fontFamily: 'Arial',
      s3FilePath: '',
      category: '',
      paddingRatio: 1,
      alpha: 0,
      listening: true,
      index: 0,
      scaleX: 1,
      scaleY: 1,
      fillPatternScaleX: 1,
      fillPatternScaleY: 1,
      svgElement: null,
      imageWidth: null,
      imageHeight: null,
      mute: false,
      autoFitEnabled: true,
      autoFitTextContent: false,
      autoFitBackgroundEnabled: false,
      shadowEnabled: true,
      shadowColor: 'undefined',
      shadowBlur: 30,
      shadowOpacity: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      language: '',
      radiusEnabled: false,
      elementAnimation: el.animation
        ? this.restoreElementAnimation(el.animation, null)
        : null,
      logoScale: 1,
      flipHorizontal: false,
      flipVertical: false,
      textArr: [],
      rowId: null,
      colId: null,
      hyperlink: '',
      textHtml: '',
      carouselImage: [],
      carouselImageIndex: 0,
      disableSync: false,
    };
  }

  /**
   * Restore simplified animation to legacy elementAnimation
   */
  private restoreElementAnimation(
    anim: AnimationSettings,
    original: any
  ): any {
    return {
      id: original?.id || '',
      elementType: original?.elementType || '',
      animationId: anim.type,
      speed: anim.speed * 1000, // seconds → ms
      delay: anim.delay * 1000,
      startTime: anim.delay * 1000,
      endTime: original?.endTime || 5000,
      direction: anim.direction,
      scale: original?.scale || null,
      animate: anim.mode,
      typeWriting: 'ELEMENT',
      keyframes: [],
      enterIndex: original?.enterIndex || 0,
    };
  }

  private reverseMapType(type: ElementType): string {
    if (type === 'image') return 'image';
    if (type === 'text') return 'text';
    return 'shape';
  }

  private reverseMapElementType(type: ElementType): string {
    const map: Record<ElementType, string> = {
      'rect': 'rect',
      'circle': 'circle',
      'triangle': 'triangle',
      'star': 'star',
      'polygon': 'graphicShape',
      'heart': 'heart',
      'diamond': 'diamond',
      'image': 'image',
      'text': 'text',
    };
    return map[type] || 'rect';
  }
}
```

### 4. Operation Translator

```typescript
// /src/adapters/operation-translator.ts

export class OperationTranslator {
  /**
   * Apply v2 operation to legacy template
   */
  applyToLegacy(legacy: LegacyTemplate, operation: Operation): LegacyTemplate {
    switch (operation.type) {
      case 'add_element':
        return this.addElement(legacy, operation);

      case 'move_element':
        return this.moveElement(legacy, operation);

      case 'resize_element':
        return this.resizeElement(legacy, operation);

      case 'rotate_element':
        return this.rotateElement(legacy, operation);

      case 'delete_element':
        return this.deleteElement(legacy, operation);

      case 'update_element_props':
        return this.updateElementProps(legacy, operation);

      default:
        console.warn(`Unknown operation type: ${operation.type}`);
        return legacy;
    }
  }

  private addElement(legacy: LegacyTemplate, op: Operation): LegacyTemplate {
    const adapter = new V2ToLegacyAdapter();
    const newElement = adapter.createLegacyElementWithDefaults({
      id: op.target.elementId!,
      type: op.payload.type,
      x: op.payload.x,
      y: op.payload.y,
      width: op.payload.width,
      height: op.payload.height,
      rotation: op.payload.rotation || 0,
      fill: op.payload.fill,
      opacity: op.payload.opacity || 1,
    } as DesignElement);

    return {
      ...legacy,
      children: [...legacy.children, newElement],
    };
  }

  private moveElement(legacy: LegacyTemplate, op: Operation): LegacyTemplate {
    return {
      ...legacy,
      children: legacy.children.map(child =>
        child.id === op.target.elementId
          ? { ...child, x: op.payload.x, y: op.payload.y }
          : child
      ),
    };
  }

  private resizeElement(legacy: LegacyTemplate, op: Operation): LegacyTemplate {
    return {
      ...legacy,
      children: legacy.children.map(child =>
        child.id === op.target.elementId
          ? {
              ...child,
              x: op.payload.x,
              y: op.payload.y,
              width: op.payload.width,
              height: op.payload.height,
            }
          : child
      ),
    };
  }

  private rotateElement(legacy: LegacyTemplate, op: Operation): LegacyTemplate {
    return {
      ...legacy,
      children: legacy.children.map(child =>
        child.id === op.target.elementId
          ? { ...child, rotation: op.payload.rotation }
          : child
      ),
    };
  }

  private deleteElement(legacy: LegacyTemplate, op: Operation): LegacyTemplate {
    return {
      ...legacy,
      children: legacy.children.filter(child => child.id !== op.target.elementId),
    };
  }

  private updateElementProps(legacy: LegacyTemplate, op: Operation): LegacyTemplate {
    return {
      ...legacy,
      children: legacy.children.map(child =>
        child.id === op.target.elementId
          ? { ...child, ...op.payload }
          : child
      ),
    };
  }
}
```

### 5. API Integration

```typescript
// backend/src/controllers/templates.controller.ts

export class TemplatesController {
  constructor(
    private formatDetector: FormatDetector,
    private legacyAdapter: LegacyToV2Adapter,
    private v2Adapter: V2ToLegacyAdapter,
    private opTranslator: OperationTranslator,
    private repository: TemplatesRepository
  ) {}

  /**
   * GET /api/v1/templates/:id
   * Always returns DesignData format
   */
  async getTemplate(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const template = await this.repository.findById(id);

    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    // Detect format
    const { format } = this.formatDetector.detectFormat(template);

    let designData: DesignData;
    if (format === 'v1-legacy') {
      // Transform legacy → v2
      designData = this.legacyAdapter.toDesignData(template as LegacyTemplate);
    } else if (format === 'v2-native') {
      // Already in v2 format
      designData = template.designData;
    } else {
      res.status(400).json({ error: 'Unknown template format' });
      return;
    }

    res.json({
      id: template.id,
      name: template.name,
      designData,
      version: template.version || 1,
      sourceFormat: format, // Informational
    });
  }

  /**
   * POST /api/v1/templates/:id/operations
   * Applies operations to legacy or v2 templates
   */
  async applyOperations(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { operations, baseVersion } = req.body;

    const template = await this.repository.findById(id);

    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    // Version check
    if (template.version !== baseVersion) {
      res.status(409).json({
        error: 'VERSION_CONFLICT',
        message: 'Template was modified by another user',
        currentVersion: template.version,
      });
      return;
    }

    const { format } = this.formatDetector.detectFormat(template);

    if (format === 'v1-legacy') {
      // Apply operations to legacy format
      let updated = template as LegacyTemplate;

      for (const op of operations) {
        updated = this.opTranslator.applyToLegacy(updated, op);
      }

      updated.version = (updated.version || 1) + 1;
      await this.repository.save(updated);

      res.json({
        template: this.legacyAdapter.toDesignData(updated),
        version: updated.version,
        appliedOps: operations.map((op: Operation) => op.id),
      });
    } else if (format === 'v2-native') {
      // Apply operations to v2 format (use OperationApplier from backend-design.md)
      // ... v2 logic
    }
  }
}
```

## Migration Phases

### Phase 1: Read-Only Adapters (Week 1-2)

**Goal**: GraphicEditor can VIEW legacy templates

**Deliverables**:
- `format-detector.ts` - Detect v1 vs v2
- `legacy-to-v2.ts` - Transform legacy → DesignData
- `GET /templates/:id` - Returns DesignData for all formats
- Tests: 20+ real production templates load correctly

**Rollback**: Remove adapter endpoints, frontend falls back to legacy editor

**Success Criteria**:
- All legacy templates load in GraphicEditor
- No data loss (round-trip test with unchanged data)
- Load time <100ms for 100-element template

### Phase 2: Write Operations (Week 3-4)

**Goal**: GraphicEditor can EDIT legacy templates

**Deliverables**:
- `v2-to-legacy.ts` - Restore DesignData → legacy
- `operation-translator.ts` - Translate operations
- `POST /templates/:id/operations` - Apply operations to legacy
- Tests: All operation types work correctly

**Rollback**: Disable POST endpoint, GraphicEditor becomes read-only

**Success Criteria**:
- All operation types (move, resize, rotate, add, delete) work
- Changes visible in legacy Konva editor
- No field loss on save

### Phase 3: Full Integration (Week 5-6)

**Goal**: Production-ready GraphicEditor with auto-save

**Deliverables**:
- Auto-save with debouncing (2s delay)
- Optimistic UI updates
- Conflict resolution (version checking)
- Telemetry and monitoring

**Rollback**: Feature flag `ENABLE_GRAPHIC_EDITOR_WRITES=false`

**Success Criteria**:
- Users can edit templates without issues
- <1% error rate on saves
- Legacy editor users see no disruption

## Testing Strategy

### Round-Trip Tests

```typescript
describe('Legacy Adapter Round-Trip', () => {
  const realTemplates = loadProductionTemplates(); // 20+ templates

  realTemplates.forEach(template => {
    it(`preserves all fields for ${template.name}`, () => {
      // Transform to v2
      const designData = legacyAdapter.toDesignData(template);

      // Restore to legacy
      const restored = v2Adapter.toLegacy(designData, template.id);

      // Deep equality check
      expect(restored).toEqual(template);
    });

    it(`preserves unknown fields for ${template.name}`, () => {
      const withExtra = { ...template, unknownField: 'test', nested: { foo: 'bar' } };
      const designData = legacyAdapter.toDesignData(withExtra);
      const restored = v2Adapter.toLegacy(designData, withExtra.id);

      expect(restored.unknownField).toBe('test');
      expect(restored.nested).toEqual({ foo: 'bar' });
    });
  });
});
```

### Operation Translation Tests

```typescript
describe('Operation Translator', () => {
  it('move_element updates position in legacy', () => {
    const legacy = createTestTemplate();
    const op: Operation = {
      id: 'op1',
      type: 'move_element',
      target: { elementId: legacy.children[0].id },
      payload: { x: 100, y: 200 },
      timestamp: Date.now(),
    };

    const updated = opTranslator.applyToLegacy(legacy, op);

    expect(updated.children[0].x).toBe(100);
    expect(updated.children[0].y).toBe(200);
    expect(updated.children[0].fill).toBe(legacy.children[0].fill); // Preserved
  });
});
```

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Transform 100 elements | <50ms | p95 latency |
| Transform 500 elements | <200ms | p95 latency |
| Round-trip accuracy | 100% | Field equality |
| Memory overhead | <10MB | Per active template |
| Cache hit rate | >95% | Element cache |

## Monitoring and Telemetry

```typescript
// Log transformation metrics
logger.info('template.transform', {
  templateId,
  sourceFormat: 'v1',
  elementCount: legacy.children.length,
  transformTimeMs: duration,
  templateSizeBytes: JSON.stringify(legacy).length,
});

// Track migration funnel
metrics.gauge('templates.format_distribution', {
  v1: countV1Templates,
  v2: countV2Templates,
});

metrics.increment('templates.edited_in_graphic_editor', {
  sourceFormat: 'v1',
});
```

## Future: Multi-Page Support

For templates that need multiple pages:

```typescript
interface LegacyTemplateWithV2Pages extends LegacyTemplate {
  _v2Pages?: Page[];  // Optional v2-specific field
  // children[] becomes flattened view of all pages for backward compat
}

// On save with multi-page:
if (designData.pages.length > 1) {
  legacy._v2Pages = designData.pages;
  legacy.children = flattenAllPages(designData.pages);
}

// Legacy editor ignores _v2Pages, sees flat children[]
// GraphicEditor uses _v2Pages if available
```

## Summary

This adapter pattern provides:
- ✅ Zero database migration required
- ✅ Zero schema changes
- ✅ Backward compatibility with legacy Konva editor
- ✅ No data loss (100% field preservation)
- ✅ Clean frontend (GraphicEditor only knows DesignData)
- ✅ Incremental rollout with rollback at each phase
- ✅ Foundation for future multi-page and audio features
