# Adapter Implementation Code Templates

## Overview

This document provides copy-paste ready code templates for implementing the legacy adapter pattern. All code is production-ready with error handling, TypeScript types, and comments.

---

## Directory Structure

Create this structure in your backend:

```
src/
  adapters/
    types/
      index.ts              # Re-export all types
    legacy/
      legacy-types.ts       # Legacy Konva types
      legacy-to-v2.ts       # Transform legacy → v2
      v2-to-legacy.ts       # Restore v2 → legacy
      field-defaults.ts     # Default values for 60+ fields
      operation-translator.ts  # Translate operations
    utils/
      cache.ts              # Cache utilities
    format-detector.ts      # Format detection
    index.ts                # Public API
    __tests__/
      format-detector.test.ts
      legacy-to-v2.test.ts
      v2-to-legacy.test.ts
      round-trip.test.ts
      operation-translator.test.ts
```

---

## 1. Legacy Types Definition

**File**: `src/adapters/legacy/legacy-types.ts`

```typescript
/**
 * Legacy Konva Template Types
 *
 * These types match the structure of templates stored in the database
 * from the original Konva-based editor. Fields marked with ? are optional.
 *
 * IMPORTANT: Do not modify these types - they must match existing data.
 */

export interface LegacyTemplate {
  // Core identification
  id: string;
  domainId?: string;
  name: string;
  templateType?: string;
  templateCategory?: string;
  channel?: string;
  templateId?: string;
  statusType?: string;
  state?: string;

  // Canvas properties
  width: number;
  height: number;
  background: string;
  duration: number;  // milliseconds

  // Content
  children: LegacyElement[];

  // Configuration
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

  // Metadata
  ordinalNumber?: number;
  categoryId?: string;
  subCategoryId?: string;
  approvalDetail?: Record<string, unknown>;
  emailEditorMode?: boolean;
  deleted?: boolean;

  // Versioning (may not exist in old templates)
  version?: number;

  // Catch-all for unknown fields
  [key: string]: unknown;
}

export interface LegacyElement {
  // Identity
  id: string;
  elementId?: string;
  type: string;           // 'image', 'text', 'shape'
  elementType: string;    // 'graphicShape', 'rect', 'image', etc.
  name?: string;

  // Position and dimensions
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  offsetX: number;
  offsetY: number;

  // Visual properties
  opacity: number;
  fill?: string;
  visible: boolean;
  listening: boolean;
  index: number;
  scaleX: number;
  scaleY: number;

  // Text properties
  text?: string;
  fontSize?: number | null;
  align?: string;
  verticalAlign?: string;
  fontStyle?: string;
  fontFamily?: string;
  letterSpacing?: number;
  paragraphSpacing?: number;
  lineHeight?: number;
  textTransform?: string;
  textDecoration?: string;
  textHtml?: string;
  textArr?: any[];
  richTextArr?: any[];
  hangingPunctuation?: boolean;
  autoFitTextContent?: boolean;

  // Image properties
  src?: string;
  imageWidth?: number | null;
  imageHeight?: number | null;
  s3FilePath?: string;
  carouselImage?: any[];
  carouselImageIndex?: number;

  // Styling
  stroke?: string;
  strokeWidth: number;
  strokeBgWidth?: number;
  borderColor?: string;
  cornerRadius?: number | null;
  cornerRadiusTopLeft?: number;
  cornerRadiusTopRight?: number;
  cornerRadiusBottomLeft?: number;
  cornerRadiusBottomRight?: number;
  radiusEnabled?: boolean;

  // Crop
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;

  // Padding (complex nested object)
  padding?: LegacyPadding;

  // Shadow
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOpacity?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;

  // Fill patterns
  fillPatternScaleX?: number;
  fillPatternScaleY?: number;

  // SVG (for graphic shapes)
  svgElement?: LegacySvgElement | null;

  // Animation
  elementAnimation?: LegacyElementAnimation | null;

  // Grouping and layout
  groupId?: string | null;
  rowId?: string | null;
  colId?: string | null;

  // Miscellaneous
  category?: string;
  paddingRatio?: number;
  alpha?: number;
  logoScale?: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  valueList?: any[];
  boundaryBox?: Record<string, unknown>;
  listType?: string;
  hasTransparentBg?: boolean;
  autoFitEnabled?: boolean;
  autoFitBackgroundEnabled?: boolean;
  mute?: boolean;
  language?: string;
  hyperlink?: string;
  disableSync?: boolean;

  // Catch-all
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
```

---

## 2. Field Defaults

**File**: `src/adapters/legacy/field-defaults.ts`

```typescript
import { LegacyElement, LegacyPadding } from './legacy-types';
import type { DesignElement } from '../../types/api.types';

/**
 * Default values for all legacy element fields.
 *
 * Used when creating new elements in GraphicEditor that need to be
 * saved back to legacy format. Ensures all 60+ fields have valid values.
 */

export function getDefaultLegacyPadding(): LegacyPadding {
  return {
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
  };
}

export function createDefaultLegacyElement(el: DesignElement): LegacyElement {
  return {
    // Identity
    id: el.id,
    elementId: '',
    type: reverseMapType(el.type),
    elementType: el.className || reverseMapElementType(el.type),
    name: `${el.type} element`,

    // Position and dimensions
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    rotation: el.rotation,
    offsetX: 0,
    offsetY: 0,

    // Visual properties
    opacity: el.opacity,
    fill: el.fill,
    visible: true,
    listening: true,
    index: 0,
    scaleX: 1,
    scaleY: 1,

    // Text properties
    text: el.text || '',
    fontSize: el.fontSize || null,
    align: 'left',
    verticalAlign: 'top',
    fontStyle: 'normal',
    fontFamily: 'Arial',
    letterSpacing: 0,
    paragraphSpacing: 0,
    lineHeight: 1,
    textTransform: 'none',
    textDecoration: '',
    textHtml: '',
    textArr: [],
    richTextArr: [],
    hangingPunctuation: false,
    autoFitTextContent: false,

    // Image properties
    src: el.src || '',
    imageWidth: null,
    imageHeight: null,
    s3FilePath: '',
    carouselImage: [],
    carouselImageIndex: 0,

    // Styling
    stroke: 'transparent',
    strokeWidth: 0,
    strokeBgWidth: 0,
    borderColor: '',
    cornerRadius: null,
    cornerRadiusTopLeft: 0,
    cornerRadiusTopRight: 0,
    cornerRadiusBottomLeft: 0,
    cornerRadiusBottomRight: 0,
    radiusEnabled: false,

    // Crop
    cropX: 0,
    cropY: 0,
    cropWidth: 1,
    cropHeight: 1,

    // Padding
    padding: getDefaultLegacyPadding(),

    // Shadow
    shadowEnabled: true,
    shadowColor: 'undefined',
    shadowBlur: 30,
    shadowOpacity: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,

    // Fill patterns
    fillPatternScaleX: 1,
    fillPatternScaleY: 1,

    // SVG
    svgElement: null,

    // Animation
    elementAnimation: el.animation ? restoreElementAnimation(el.animation, null) : null,

    // Grouping
    groupId: null,
    rowId: null,
    colId: null,

    // Miscellaneous
    category: '',
    paddingRatio: 1,
    alpha: 0,
    logoScale: 1,
    flipHorizontal: false,
    flipVertical: false,
    valueList: [],
    boundaryBox: {},
    listType: '',
    hasTransparentBg: false,
    autoFitEnabled: true,
    autoFitBackgroundEnabled: false,
    mute: false,
    language: '',
    hyperlink: '',
    disableSync: false,
  };
}

function reverseMapType(type: string): string {
  if (type === 'image') return 'image';
  if (type === 'text') return 'text';
  return 'shape';
}

function reverseMapElementType(type: string): string {
  const map: Record<string, string> = {
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

function restoreElementAnimation(anim: any, original: any): any {
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
```

---

## 3. Cache Utilities

**File**: `src/adapters/utils/cache.ts`

```typescript
import type { LegacyTemplate, LegacyElement } from '../legacy/legacy-types';

/**
 * Cache for round-trip preservation.
 *
 * When transforming legacy → v2, we cache the complete original template
 * so that when transforming back v2 → legacy, we can preserve all fields
 * that were not explicitly modified.
 */

export class AdapterCache {
  private templateCache = new Map<string, LegacyTemplate>();
  private elementCache = new Map<string, LegacyElement>();

  cacheTemplate(template: LegacyTemplate): void {
    this.templateCache.set(template.id, structuredClone(template));

    // Cache all elements
    for (const child of template.children) {
      this.elementCache.set(child.id, structuredClone(child));
    }
  }

  getTemplate(id: string): LegacyTemplate | undefined {
    return this.templateCache.get(id);
  }

  getElement(id: string): LegacyElement | undefined {
    return this.elementCache.get(id);
  }

  hasTemplate(id: string): boolean {
    return this.templateCache.has(id);
  }

  hasElement(id: string): boolean {
    return this.elementCache.has(id);
  }

  clearTemplate(id: string): void {
    const template = this.templateCache.get(id);
    if (template) {
      template.children.forEach(child => {
        this.elementCache.delete(child.id);
      });
    }
    this.templateCache.delete(id);
  }

  clearAll(): void {
    this.templateCache.clear();
    this.elementCache.clear();
  }

  size(): { templates: number; elements: number } {
    return {
      templates: this.templateCache.size,
      elements: this.elementCache.size,
    };
  }
}

// Singleton instance
export const adapterCache = new AdapterCache();
```

---

## 4. Format Detector

**File**: `src/adapters/format-detector.ts`

```typescript
export type TemplateFormat = 'v1-legacy' | 'v2-native' | 'unknown';

export interface FormatDetectionResult {
  format: TemplateFormat;
  confidence: number; // 0.0 to 1.0
}

/**
 * Detects template format based on structure.
 *
 * No version field exists in legacy templates, so we detect based on
 * the presence of key fields:
 * - v1: has 'children' array at root
 * - v2: has 'pages' array at root
 */
export class FormatDetector {
  detect(data: unknown): FormatDetectionResult {
    if (!data || typeof data !== 'object') {
      return { format: 'unknown', confidence: 0 };
    }

    const obj = data as Record<string, unknown>;

    // V2 detection
    if (Array.isArray(obj.pages)) {
      const hasCanvas =
        obj.canvas &&
        typeof obj.canvas === 'object' &&
        'width' in obj.canvas &&
        'height' in obj.canvas;

      return {
        format: 'v2-native',
        confidence: hasCanvas ? 1.0 : 0.8,
      };
    }

    // V1 detection
    if (Array.isArray(obj.children)) {
      const hasLegacyFields =
        ('templateType' in obj || 'animationConfig' in obj) &&
        'width' in obj &&
        'height' in obj;

      return {
        format: 'v1-legacy',
        confidence: hasLegacyFields ? 1.0 : 0.7,
      };
    }

    return { format: 'unknown', confidence: 0 };
  }

  isLegacy(data: unknown): boolean {
    return this.detect(data).format === 'v1-legacy';
  }

  isV2(data: unknown): boolean {
    return this.detect(data).format === 'v2-native';
  }
}
```

---

## 5. Legacy to V2 Adapter

**File**: `src/adapters/legacy/legacy-to-v2.ts`

See QUICKSTART.md for the complete implementation (too long to duplicate here).

**Key method signatures:**

```typescript
export class LegacyToV2Adapter {
  constructor(private cache: AdapterCache) {}

  toDesignData(legacy: LegacyTemplate): DesignData;
  private transformElement(legacy: LegacyElement): DesignElement;
  private mapElementType(type: string, elementType: string): ElementType;
  private transformElementAnimation(anim: LegacyElementAnimation): AnimationSettings;
  private transformAnimationConfig(config: LegacyAnimationConfig): AnimationSettings | undefined;
}
```

---

## 6. V2 to Legacy Adapter

**File**: `src/adapters/legacy/v2-to-legacy.ts`

```typescript
import type { DesignData, DesignElement } from '../../types/api.types';
import type { LegacyTemplate, LegacyElement } from './legacy-types';
import { AdapterCache } from '../utils/cache';
import { createDefaultLegacyElement } from './field-defaults';

export class V2ToLegacyAdapter {
  constructor(private cache: AdapterCache) {}

  /**
   * Restore DesignData to legacy format.
   *
   * Starts with cached original to preserve all fields, then overrides
   * only the fields that were modified in the GraphicEditor.
   */
  toLegacy(designData: DesignData, templateId: string): LegacyTemplate {
    const original = this.cache.getTemplate(templateId);

    if (!original) {
      throw new Error(
        `No cached original for template ${templateId}. ` +
        `Cannot restore safely without original data.`
      );
    }

    const page = designData.pages[0]; // Legacy is single-page

    if (!page) {
      throw new Error('DesignData must have at least one page');
    }

    // Start with complete original (ALL fields preserved)
    const restored: LegacyTemplate = {
      ...structuredClone(original),

      // Override only changed fields
      width: designData.canvas.width,
      height: designData.canvas.height,
      background: page.background,
      duration: page.duration * 1000, // seconds → ms
      children: page.elements.map(el => this.restoreElement(el)),
    };

    // Restore template-level animation if present
    if (page.animation) {
      restored.animationConfig = {
        speed: page.animation.speed * 1000,
        typeWriting: 'ELEMENT',
        animate: page.animation.mode,
      };
    }

    return restored;
  }

  /**
   * Restore a single element.
   *
   * If element exists in cache (modified existing), preserve all original
   * fields. If new element, create with defaults.
   */
  private restoreElement(el: DesignElement): LegacyElement {
    const original = this.cache.getElement(el.id);

    if (original) {
      // Element exists - preserve all original fields
      return {
        ...structuredClone(original),

        // Override only modified fields
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        rotation: el.rotation,
        fill: el.fill || original.fill,
        opacity: el.opacity,
        text: el.text || original.text,
        fontSize: el.fontSize ?? original.fontSize,
        src: el.src || original.src,

        // Restore animation if present
        elementAnimation: el.animation
          ? this.restoreAnimation(el.animation, original.elementAnimation)
          : original.elementAnimation,
      };
    } else {
      // New element - create with defaults
      return createDefaultLegacyElement(el);
    }
  }

  /**
   * Restore animation object
   */
  private restoreAnimation(anim: any, original: any): any {
    return {
      id: original?.id || '',
      elementType: original?.elementType || '',
      animationId: anim.type,
      speed: anim.speed * 1000, // seconds → ms
      delay: anim.delay ? anim.delay * 1000 : null,
      startTime: anim.delay ? anim.delay * 1000 : 0,
      endTime: original?.endTime || 5000,
      direction: anim.direction,
      scale: original?.scale || null,
      animate: anim.mode,
      typeWriting: 'ELEMENT',
      keyframes: [],
      enterIndex: original?.enterIndex || 0,
    };
  }
}
```

---

## 7. Operation Translator

**File**: `src/adapters/legacy/operation-translator.ts`

```typescript
import type { Operation } from '../../types/api.types';
import type { LegacyTemplate, LegacyElement } from './legacy-types';
import { createDefaultLegacyElement } from './field-defaults';

/**
 * Translates v2 Command Pattern operations into legacy template mutations.
 *
 * Each operation type has a corresponding method that applies the change
 * to the legacy template structure.
 */
export class OperationTranslator {
  /**
   * Apply a single operation to a legacy template.
   * Returns a new template with the operation applied.
   */
  applyToLegacy(legacy: LegacyTemplate, op: Operation): LegacyTemplate {
    switch (op.type) {
      case 'add_element':
        return this.addElement(legacy, op);

      case 'move_element':
        return this.moveElement(legacy, op);

      case 'resize_element':
        return this.resizeElement(legacy, op);

      case 'rotate_element':
        return this.rotateElement(legacy, op);

      case 'delete_element':
        return this.deleteElement(legacy, op);

      case 'update_element_props':
        return this.updateElementProps(legacy, op);

      default:
        console.warn(`[OperationTranslator] Unknown operation type: ${op.type}`);
        return legacy;
    }
  }

  private addElement(legacy: LegacyTemplate, op: Operation): LegacyTemplate {
    const newElement = createDefaultLegacyElement({
      id: op.target.elementId!,
      type: op.payload.type,
      x: op.payload.x,
      y: op.payload.y,
      width: op.payload.width,
      height: op.payload.height,
      rotation: op.payload.rotation || 0,
      fill: op.payload.fill,
      opacity: op.payload.opacity || 1,
      className: op.payload.className,
      text: op.payload.text,
      fontSize: op.payload.fontSize,
      src: op.payload.src,
      animation: op.payload.animation,
    } as any);

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

---

## 8. Public API

**File**: `src/adapters/index.ts`

```typescript
// Re-export all adapters
export { FormatDetector } from './format-detector';
export type { TemplateFormat, FormatDetectionResult } from './format-detector';

export { LegacyToV2Adapter } from './legacy/legacy-to-v2';
export { V2ToLegacyAdapter } from './legacy/v2-to-legacy';
export { OperationTranslator } from './legacy/operation-translator';

export { AdapterCache, adapterCache } from './utils/cache';

export type {
  LegacyTemplate,
  LegacyElement,
  LegacyPadding,
  LegacySvgElement,
  LegacyAnimationConfig,
  LegacyElementAnimation,
} from './legacy/legacy-types';

// Convenience function
export function createAdapters() {
  const cache = new AdapterCache();
  return {
    cache,
    formatDetector: new FormatDetector(),
    legacyToV2: new LegacyToV2Adapter(cache),
    v2ToLegacy: new V2ToLegacyAdapter(cache),
    opTranslator: new OperationTranslator(),
  };
}
```

---

## Usage Example

```typescript
import { createAdapters } from './adapters';
import sampleTemplate from '../sample_template.json';

const adapters = createAdapters();

// Detect format
const { format } = adapters.formatDetector.detect(sampleTemplate);
console.log('Format:', format); // 'v1-legacy'

// Transform to v2
const designData = adapters.legacyToV2.toDesignData(sampleTemplate);
console.log('Pages:', designData.pages.length); // 1

// Apply operations
let updated = sampleTemplate;
const moveOp = {
  id: 'op-1',
  type: 'move_element' as const,
  target: { elementId: designData.pages[0].elements[0].id },
  payload: { x: 150, y: 200 },
  timestamp: Date.now(),
};
updated = adapters.opTranslator.applyToLegacy(updated, moveOp);

// Restore to legacy
const restored = adapters.v2ToLegacy.toLegacy(designData, sampleTemplate.id);

// Verify round-trip
console.log('Round-trip successful:',
  JSON.stringify(restored) === JSON.stringify(sampleTemplate)
);
```

---

## Next Steps

1. Copy these templates to your project
2. Adjust import paths for your structure
3. Run tests (see TESTING_HARNESS.md)
4. Integrate with API (see API_CONTRACTS.md)
5. Deploy Phase 1 (read-only)
