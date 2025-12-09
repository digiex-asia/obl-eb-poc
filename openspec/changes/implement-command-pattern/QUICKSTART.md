# Quick-Start Implementation Guide

## Overview

This guide helps you get started implementing the Command Pattern with legacy adapter support. Follow these steps in order for the fastest path to a working implementation.

## Prerequisites

- Node.js 18+ or Bun
- TypeScript 5.0+
- PostgreSQL 14+ (or MongoDB with transaction support)
- Existing GraphicEditor codebase
- Access to legacy template database

## Phase 1: Read-Only Adapters (Week 1-2)

### Day 1-2: Setup and Structure

#### 1. Create Adapter Directory Structure

```bash
# Backend
mkdir -p src/adapters/{types,legacy,v2,utils}
mkdir -p src/adapters/__tests__

# Create files
touch src/adapters/format-detector.ts
touch src/adapters/legacy/legacy-to-v2.ts
touch src/adapters/legacy/legacy-types.ts
touch src/adapters/legacy/field-defaults.ts
touch src/adapters/utils/cache.ts
```

#### 2. Install Dependencies

```bash
# Backend
bun add nanoid zod  # For ID generation and validation

# If using TypeScript (already installed)
# No additional deps needed for adapters
```

#### 3. Copy Type Definitions

Create `src/adapters/legacy/legacy-types.ts`:

```typescript
// This file defines the legacy Konva template structure
// Extracted from your sample_template.json

export interface LegacyTemplate {
  id: string;
  domainId?: string;
  name: string;
  templateType?: string;
  templateCategory?: string;
  width: number;
  height: number;
  background: string;
  duration: number;
  children: LegacyElement[];
  animationConfig?: LegacyAnimationConfig;
  guideConfig?: {
    columnX: number;
    columnY: number;
  };
  marginConfig?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  displayGuideAndMargin?: boolean;
  emailEditorMode?: boolean;
  version?: number;
  [key: string]: unknown; // Catch-all for unknown fields
}

export interface LegacyElement {
  id: string;
  elementId?: string;
  type: string;
  elementType: string;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  fill?: string;
  text?: string;
  fontSize?: number | null;
  src?: string;

  // Complex nested objects
  padding?: LegacyPadding;
  svgElement?: LegacySvgElement | null;
  elementAnimation?: LegacyElementAnimation | null;

  // Crop properties
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;

  // Many more fields...
  [key: string]: unknown;
}

export interface LegacyPadding {
  paddingRight: boolean;
  paddingLeft: boolean;
  paddingTop: boolean;
  paddingBottom: boolean;
  horizontal: number;
  vertical: number;
  bottom: number;
  left: number;
  right: number;
  top: number;
  isIndependent: boolean;
}

export interface LegacyAnimationConfig {
  speed: number;
  typeWriting?: string;
  animate?: string;
}

export interface LegacyElementAnimation {
  id: string;
  elementType: string;
  animationId: string;
  speed: number;
  delay?: number | null;
  startTime?: number;
  endTime?: number;
  direction?: string | null;
  scale?: string | null;
  animate?: string;
  typeWriting?: string;
  keyframes?: any[];
  enterIndex?: number;
}

export interface LegacySvgElement {
  svgString: string;
  svgUrl?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  svgWidth: number;
  svgHeight: number;
  children?: any[];
}
```

### Day 3-4: Format Detector

Create `src/adapters/format-detector.ts`:

```typescript
export type TemplateFormat = 'v1-legacy' | 'v2-native' | 'unknown';

export interface FormatDetectionResult {
  format: TemplateFormat;
  confidence: number;
}

export class FormatDetector {
  detect(data: unknown): FormatDetectionResult {
    if (!data || typeof data !== 'object') {
      return { format: 'unknown', confidence: 0 };
    }

    const obj = data as Record<string, unknown>;

    // V2 detection
    if (Array.isArray(obj.pages)) {
      const hasCanvas = obj.canvas && typeof obj.canvas === 'object';
      return {
        format: 'v2-native',
        confidence: hasCanvas ? 1.0 : 0.8
      };
    }

    // V1 detection
    if (Array.isArray(obj.children)) {
      const hasLegacyFields =
        'templateType' in obj ||
        'animationConfig' in obj ||
        ('width' in obj && 'height' in obj);

      return {
        format: 'v1-legacy',
        confidence: hasLegacyFields ? 1.0 : 0.7
      };
    }

    return { format: 'unknown', confidence: 0 };
  }
}
```

**Test it:**

```typescript
// src/adapters/__tests__/format-detector.test.ts
import { FormatDetector } from '../format-detector';
import sampleTemplate from '../../../sample_template.json';

describe('FormatDetector', () => {
  const detector = new FormatDetector();

  it('detects v1 legacy format', () => {
    const result = detector.detect(sampleTemplate);
    expect(result.format).toBe('v1-legacy');
    expect(result.confidence).toBe(1.0);
  });

  it('detects v2 native format', () => {
    const v2Template = {
      canvas: { width: 800, height: 600 },
      pages: [{ id: 'p1', elements: [] }],
      audioLayers: [],
    };
    const result = detector.detect(v2Template);
    expect(result.format).toBe('v2-native');
  });
});
```

Run test: `bun test src/adapters/__tests__/format-detector.test.ts`

### Day 5-7: Legacy to V2 Adapter

See `API_CONTRACTS.md` section "Adapter Code Templates" for complete implementation.

**Quick implementation:**

```typescript
// src/adapters/legacy/legacy-to-v2.ts
import type { LegacyTemplate, LegacyElement } from './legacy-types';
import type { DesignData, DesignElement } from '../../types/api.types';

// Cache for round-trip preservation
const templateCache = new Map<string, LegacyTemplate>();
const elementCache = new Map<string, LegacyElement>();

export class LegacyToV2Adapter {
  toDesignData(legacy: LegacyTemplate): DesignData {
    // Cache original
    templateCache.set(legacy.id, structuredClone(legacy));
    legacy.children.forEach(child => {
      elementCache.set(child.id, structuredClone(child));
    });

    return {
      canvas: {
        width: legacy.width,
        height: legacy.height,
      },
      pages: [{
        id: legacy.id,
        duration: legacy.duration / 1000, // ms -> seconds
        background: legacy.background,
        elements: legacy.children.map(c => this.transformElement(c)),
        animation: this.transformAnimationConfig(legacy.animationConfig),
      }],
      audioLayers: [],
    };
  }

  private transformElement(legacy: LegacyElement): DesignElement {
    return {
      id: legacy.id,
      type: this.mapType(legacy.type, legacy.elementType),
      className: legacy.elementType,
      x: legacy.x,
      y: legacy.y,
      width: legacy.width,
      height: legacy.height,
      rotation: legacy.rotation,
      fill: legacy.fill || '#000000',
      opacity: legacy.opacity,
      text: legacy.text,
      fontSize: legacy.fontSize || undefined,
      src: legacy.src,
      animation: legacy.elementAnimation
        ? this.transformAnimation(legacy.elementAnimation)
        : undefined,
    };
  }

  private mapType(type: string, elementType: string): ElementType {
    if (type === 'image') return 'image';
    if (type === 'text') return 'text';
    if (elementType === 'graphicShape') return 'polygon';
    return 'rect';
  }

  private transformAnimation(anim: any): AnimationSettings | undefined {
    if (!anim) return undefined;
    return {
      type: anim.animationId || 'fade',
      speed: anim.speed / 1000,
      delay: (anim.delay || 0) / 1000,
      direction: anim.direction || 'up',
      mode: anim.animate || 'enter',
    };
  }

  private transformAnimationConfig(config: any): AnimationSettings | undefined {
    if (!config) return undefined;
    return {
      type: 'fade',
      speed: config.speed / 1000,
      delay: 0,
      direction: 'up',
      mode: config.animate || 'enter',
    };
  }

  clearCache(templateId: string): void {
    templateCache.delete(templateId);
  }
}

// Export cache for V2ToLegacy adapter
export { templateCache, elementCache };
```

**Test it:**

```typescript
// Load your real sample_template.json
import sampleTemplate from '../../../sample_template.json';
import { LegacyToV2Adapter } from '../legacy/legacy-to-v2';

describe('LegacyToV2Adapter', () => {
  const adapter = new LegacyToV2Adapter();

  it('transforms sample template', () => {
    const designData = adapter.toDesignData(sampleTemplate);

    expect(designData.canvas.width).toBe(1200);
    expect(designData.canvas.height).toBe(1400);
    expect(designData.pages).toHaveLength(1);
    expect(designData.pages[0].elements).toHaveLength(2);
    expect(designData.pages[0].elements[0].id).toBe('9d014b58-ed74-4c43-bece-95cd7ce31d25');
  });
});
```

### Day 8-10: API Integration

Update your templates controller:

```typescript
// src/controllers/templates.controller.ts
import { FormatDetector } from '../adapters/format-detector';
import { LegacyToV2Adapter } from '../adapters/legacy/legacy-to-v2';

export class TemplatesController {
  private formatDetector = new FormatDetector();
  private legacyAdapter = new LegacyToV2Adapter();

  async getTemplate(req: Request, res: Response) {
    const { id } = req.params;
    const template = await this.repository.findById(id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const { format } = this.formatDetector.detect(template);

    if (format === 'v1-legacy') {
      const designData = this.legacyAdapter.toDesignData(template);
      return res.json({
        id: template.id,
        name: template.name,
        designData,
        version: template.version || 1,
        sourceFormat: 'v1',
      });
    }

    // V2 native - return as-is
    return res.json({
      id: template.id,
      name: template.name,
      designData: template.designData,
      version: template.version,
      sourceFormat: 'v2',
    });
  }
}
```

**Test the endpoint:**

```bash
# Start your backend
bun run dev

# In another terminal, test
curl http://localhost:3000/api/v1/templates/YOUR_TEMPLATE_ID

# Should return DesignData format regardless of storage format
```

### Day 11-14: Frontend Integration

Update GraphicEditor to use the API:

```typescript
// src/components/GraphicEditor/shared/hooks/useTemplate.ts

export function useTemplate(templateId: string) {
  const [designData, setDesignData] = useState<DesignData | null>(null);
  const [sourceFormat, setSourceFormat] = useState<'v1' | 'v2'>('v2');

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/v1/templates/${templateId}`);
      const data = await response.json();

      setDesignData(data.designData);
      setSourceFormat(data.sourceFormat);

      if (data.sourceFormat === 'v1') {
        console.log('Loaded legacy template via adapter');
      }
    }
    load();
  }, [templateId]);

  return { designData, sourceFormat, loading: !designData };
}
```

Use in GraphicEditor:

```typescript
// src/components/GraphicEditor/app-v2/App.tsx

export function App() {
  const { templateId } = useParams();
  const { designData, sourceFormat } = useTemplate(templateId);

  if (!designData) return <div>Loading...</div>;

  // designData is always in v2 format, regardless of storage
  return (
    <div>
      {sourceFormat === 'v1' && (
        <div className="alert">Viewing legacy template</div>
      )}
      <GraphicEditor initialData={designData} />
    </div>
  );
}
```

### ✅ Phase 1 Checklist

- [ ] Format detector implemented and tested
- [ ] LegacyToV2Adapter transforms sample template correctly
- [ ] Round-trip test passes (transform back should equal original)
- [ ] API returns DesignData for legacy templates
- [ ] Frontend loads and displays legacy templates
- [ ] No errors in console when loading legacy templates
- [ ] All fields visible in GraphicEditor

**Rollback Plan**: Remove adapter code, frontend uses legacy editor API.

---

## Phase 2: Write Operations (Week 3-4)

### Day 15-17: V2 to Legacy Adapter

Create `src/adapters/legacy/v2-to-legacy.ts`:

```typescript
import { templateCache, elementCache } from './legacy-to-v2';
import type { DesignData } from '../../types/api.types';
import type { LegacyTemplate } from './legacy-types';
import { createDefaultLegacyElement } from './field-defaults';

export class V2ToLegacyAdapter {
  toLegacy(designData: DesignData, templateId: string): LegacyTemplate {
    const original = templateCache.get(templateId);

    if (!original) {
      throw new Error(`No cached original for template ${templateId}`);
    }

    const page = designData.pages[0];

    return {
      ...structuredClone(original),
      width: designData.canvas.width,
      height: designData.canvas.height,
      background: page.background,
      duration: page.duration * 1000,
      children: page.elements.map(el => this.restoreElement(el)),
    };
  }

  private restoreElement(el: DesignElement): LegacyElement {
    const original = elementCache.get(el.id);

    if (original) {
      return {
        ...structuredClone(original),
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
      };
    }

    // New element - create with defaults
    return createDefaultLegacyElement(el);
  }
}
```

**Test round-trip:**

```typescript
describe('Round-Trip', () => {
  it('preserves all fields', () => {
    const legacy = sampleTemplate;

    const toV2 = new LegacyToV2Adapter();
    const toLegacy = new V2ToLegacyAdapter();

    const designData = toV2.toDesignData(legacy);
    const restored = toLegacy.toLegacy(designData, legacy.id);

    expect(restored).toEqual(legacy);
  });
});
```

### Day 18-20: Operation Translator

See `ADAPTER_TEMPLATES.md` for full implementation.

Quick version:

```typescript
// src/adapters/legacy/operation-translator.ts

export class OperationTranslator {
  applyToLegacy(legacy: LegacyTemplate, op: Operation): LegacyTemplate {
    switch (op.type) {
      case 'move_element':
        return {
          ...legacy,
          children: legacy.children.map(c =>
            c.id === op.target.elementId
              ? { ...c, x: op.payload.x, y: op.payload.y }
              : c
          ),
        };

      case 'resize_element':
        return {
          ...legacy,
          children: legacy.children.map(c =>
            c.id === op.target.elementId
              ? { ...c, width: op.payload.width, height: op.payload.height }
              : c
          ),
        };

      // ... other operations

      default:
        return legacy;
    }
  }
}
```

### Day 21-24: POST Operations Endpoint

```typescript
// src/controllers/templates.controller.ts

async applyOperations(req: Request, res: Response) {
  const { id } = req.params;
  const { operations, baseVersion } = req.body;

  const template = await this.repository.findById(id);
  const { format } = this.formatDetector.detect(template);

  if (format === 'v1-legacy') {
    let updated = template;

    for (const op of operations) {
      updated = this.opTranslator.applyToLegacy(updated, op);
    }

    updated.version = (updated.version || 1) + 1;
    await this.repository.save(updated);

    return res.json({
      template: this.legacyAdapter.toDesignData(updated),
      version: updated.version,
      appliedOps: operations.map(o => o.id),
    });
  }

  // V2 logic...
}
```

### Day 25-28: Frontend Command Integration

Wire up commands to POST operations:

```typescript
// src/components/GraphicEditor/shared/hooks/useOperationQueue.ts

export function useOperationQueue(templateId: string) {
  const [queue, setQueue] = useState<Operation[]>([]);

  const queueOperation = useCallback((op: Operation) => {
    setQueue(prev => [...prev, op]);
  }, []);

  const flush = useCallback(async () => {
    if (queue.length === 0) return;

    const response = await fetch(`/api/v1/templates/${templateId}/operations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operations: queue,
        baseVersion: currentVersion,
      }),
    });

    if (response.ok) {
      setQueue([]);
      // Update version...
    }
  }, [queue, templateId]);

  // Debounced flush every 2 seconds
  useEffect(() => {
    const timer = setTimeout(flush, 2000);
    return () => clearTimeout(timer);
  }, [queue, flush]);

  return { queueOperation };
}
```

### ✅ Phase 2 Checklist

- [ ] V2ToLegacy adapter implemented
- [ ] Round-trip test passes (no data loss)
- [ ] Operation translator handles all operation types
- [ ] POST /operations endpoint works for legacy templates
- [ ] Frontend sends operations correctly
- [ ] Changes persist to database
- [ ] Legacy Konva editor sees changes

**Rollback Plan**: Disable POST /operations endpoint, GraphicEditor becomes read-only.

---

## Phase 3: Full Integration (Week 5-6)

### Quick Steps

1. **Add auto-save debouncing** (already in useOperationQueue above)
2. **Add optimistic UI updates** in CommandDispatcher
3. **Add conflict resolution** - handle 409 errors
4. **Add telemetry** - log metrics

See full implementation in `tasks.md` Phase 3.

---

## Testing Commands

```bash
# Run all adapter tests
bun test src/adapters

# Test specific adapter
bun test src/adapters/__tests__/legacy-to-v2.test.ts

# Test round-trip
bun test src/adapters/__tests__/round-trip.test.ts

# Load test with real templates
bun test:load-real-templates
```

---

## Troubleshooting

### "Template not found in cache" error

**Cause**: V2ToLegacy called before LegacyToV2.
**Fix**: Ensure GET /templates is called before POST /operations.

### Round-trip test fails

**Cause**: Field not preserved during transformation.
**Fix**: Check that field is in cache and restored in V2ToLegacy.

### "Unknown operation type" warning

**Cause**: Operation not handled by translator.
**Fix**: Add case to OperationTranslator.applyToLegacy().

---

## Next Steps

Once Phase 1-3 are complete:
1. Monitor error rates and performance
2. Collect metrics on legacy vs v2 template usage
3. Plan Phase 4: Advanced features (conflict resolution, multi-page)
4. Begin gradual migration to v2-native format

---

## Resources

- **Full Design**: See `legacy-adapter-design.md`
- **API Contracts**: See `API_CONTRACTS.md`
- **Code Templates**: See `ADAPTER_TEMPLATES.md`
- **Testing Harness**: See `TESTING_HARNESS.md`
- **Tasks Breakdown**: See `tasks.md`
