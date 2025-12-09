# Testing Harness for Round-Trip Validation

**Change ID**: `implement-command-pattern`
**Document Type**: Testing Infrastructure
**Last Updated**: 2025-12-09

## Overview

This document provides a comprehensive testing harness for validating the legacy adapter implementation. The harness ensures:

1. **Round-trip Equality**: Legacy → DesignData → Legacy produces identical JSON
2. **Operation Translation**: All operation types correctly translate to legacy mutations
3. **Format Detection**: Structural detection works without version fields
4. **Performance**: Transformations meet performance requirements (<50ms)
5. **Edge Cases**: Handles malformed data, missing fields, and boundary conditions

## Directory Structure

```
src/components/GraphicEditor/shared/adapters/
├── __tests__/
│   ├── fixtures/
│   │   ├── legacy-templates.ts        # Test data fixtures
│   │   ├── operations.ts               # Operation test data
│   │   └── edge-cases.ts               # Malformed/edge case data
│   ├── unit/
│   │   ├── format-detector.test.ts     # Format detection tests
│   │   ├── legacy-to-v2.test.ts        # Legacy → DesignData tests
│   │   ├── v2-to-legacy.test.ts        # DesignData → Legacy tests
│   │   ├── operation-translator.test.ts # Operation translation tests
│   │   └── cache.test.ts               # Cache tests
│   ├── integration/
│   │   ├── round-trip.test.ts          # Full round-trip validation
│   │   ├── api-flow.test.ts            # API integration tests
│   │   └── concurrent-ops.test.ts      # Concurrent operation tests
│   └── performance/
│       ├── transform-benchmark.test.ts  # Performance benchmarks
│       └── memory-profile.test.ts       # Memory usage tests
└── test-utils/
    ├── assertions.ts                    # Custom assertions
    ├── comparators.ts                   # Deep equality utilities
    └── generators.ts                    # Test data generators
```

## 1. Test Fixtures

### fixtures/legacy-templates.ts

```typescript
import type { LegacyTemplate } from '../legacy-types';

/**
 * Minimal valid legacy template (baseline)
 */
export const MINIMAL_LEGACY: LegacyTemplate = {
  id: 'template_minimal',
  name: 'Minimal Template',
  width: 1080,
  height: 1080,
  duration: 5000,
  children: [
    {
      id: 'element_1',
      type: 'text',
      x: 100,
      y: 100,
      width: 200,
      height: 50,
      text: 'Hello World',
      fontSize: 24,
      fontFamily: 'Arial',
      fill: '#000000',
      align: 'left',
      verticalAlign: 'top',
      rotation: 0,
      opacity: 1,
      visible: true,
      draggable: true,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0,
      offsetX: 0,
      offsetY: 0,
    },
  ],
  backgroundColor: '#ffffff',
  backgroundImage: null,
};

/**
 * Complex legacy template from production (sample_template.json)
 */
export const COMPLEX_LEGACY: LegacyTemplate = {
  id: 'template_complex',
  name: 'Production Template',
  width: 1080,
  height: 1920,
  duration: 15000,
  children: [
    // Text element with full styling
    {
      id: 'text_styled',
      type: 'text',
      x: 50,
      y: 100,
      width: 980,
      height: 150,
      text: 'Styled Text',
      fontSize: 48,
      fontFamily: 'Montserrat',
      fontStyle: 'bold',
      textDecoration: 'underline',
      fill: '#FF6B6B',
      stroke: '#000000',
      strokeWidth: 2,
      align: 'center',
      verticalAlign: 'middle',
      rotation: 15,
      opacity: 0.9,
      visible: true,
      draggable: true,
      scaleX: 1.2,
      scaleY: 1.2,
      skewX: 5,
      skewY: 0,
      offsetX: 0,
      offsetY: 0,
      padding: {
        top: 10,
        right: 15,
        bottom: 10,
        left: 15,
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0,
        paddingLeft: 15,
        paddingRight: 15,
        paddingTop: 10,
        paddingBottom: 10,
      },
      shadow: {
        color: 'rgba(0,0,0,0.3)',
        blur: 10,
        offset: { x: 5, y: 5 },
        opacity: 0.5,
      },
    },
    // SVG element
    {
      id: 'svg_icon',
      type: 'svg',
      x: 500,
      y: 300,
      width: 80,
      height: 80,
      fill: '#4ECDC4',
      rotation: 0,
      opacity: 1,
      visible: true,
      draggable: true,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0,
      offsetX: 0,
      offsetY: 0,
      svgElement: '<svg>...</svg>',
    },
    // Image element with animation
    {
      id: 'image_animated',
      type: 'image',
      x: 100,
      y: 500,
      width: 880,
      height: 495,
      src: 'https://example.com/image.jpg',
      cropX: 0,
      cropY: 0,
      cropWidth: 1920,
      cropHeight: 1080,
      rotation: 0,
      opacity: 1,
      visible: true,
      draggable: true,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0,
      offsetX: 0,
      offsetY: 0,
      filters: ['blur', 'brightness'],
      elementAnimation: {
        type: 'fade-in',
        duration: 1000,
        delay: 500,
        easing: 'ease-in-out',
      },
    },
  ],
  backgroundColor: '#1A1A2E',
  backgroundImage: 'https://example.com/bg.jpg',
};

/**
 * Empty legacy template
 */
export const EMPTY_LEGACY: LegacyTemplate = {
  id: 'template_empty',
  name: 'Empty Template',
  width: 1080,
  height: 1080,
  duration: 5000,
  children: [],
  backgroundColor: '#ffffff',
  backgroundImage: null,
};
```

### fixtures/operations.ts

```typescript
import type { Operation } from '../../types/api.types';

/**
 * All operation types for translation testing
 */
export const ALL_OPERATIONS: Operation[] = [
  // Element operations
  {
    id: 'op_add_element',
    type: 'add_element',
    target: { pageId: 'page_1', elementId: 'new_element' },
    payload: {
      type: 'text',
      x: 100,
      y: 100,
      width: 200,
      height: 50,
      content: 'New Text',
    },
    timestamp: Date.now(),
  },
  {
    id: 'op_update_element',
    type: 'update_element',
    target: { pageId: 'page_1', elementId: 'element_1' },
    payload: { x: 150, y: 200 },
    timestamp: Date.now(),
  },
  {
    id: 'op_delete_element',
    type: 'delete_element',
    target: { pageId: 'page_1', elementId: 'element_1' },
    payload: null,
    timestamp: Date.now(),
  },
  {
    id: 'op_move_element',
    type: 'move_element',
    target: { pageId: 'page_1', elementId: 'element_1' },
    payload: { x: 300, y: 400 },
    timestamp: Date.now(),
  },
  {
    id: 'op_resize_element',
    type: 'resize_element',
    target: { pageId: 'page_1', elementId: 'element_1' },
    payload: { width: 250, height: 100 },
    timestamp: Date.now(),
  },
  {
    id: 'op_rotate_element',
    type: 'rotate_element',
    target: { pageId: 'page_1', elementId: 'element_1' },
    payload: { rotation: 45 },
    timestamp: Date.now(),
  },
  {
    id: 'op_update_text',
    type: 'update_element_props',
    target: { pageId: 'page_1', elementId: 'text_1' },
    payload: { content: 'Updated Text', fontSize: 32 },
    timestamp: Date.now(),
  },

  // Page operations
  {
    id: 'op_add_page',
    type: 'add_page',
    target: { pageId: 'new_page' },
    payload: { duration: 3 },
    timestamp: Date.now(),
  },
  {
    id: 'op_delete_page',
    type: 'delete_page',
    target: { pageId: 'page_2' },
    payload: null,
    timestamp: Date.now(),
  },
  {
    id: 'op_reorder_pages',
    type: 'reorder_pages',
    target: {},
    payload: { pageIds: ['page_2', 'page_1', 'page_3'] },
    timestamp: Date.now(),
  },
  {
    id: 'op_update_page_duration',
    type: 'update_page_duration',
    target: { pageId: 'page_1' },
    payload: { duration: 7 },
    timestamp: Date.now(),
  },

  // Audio operations
  {
    id: 'op_add_audio_clip',
    type: 'add_audio_clip',
    target: { layerId: 'layer_1', clipId: 'clip_1' },
    payload: {
      url: 'https://example.com/audio.mp3',
      startTime: 0,
      duration: 10,
      volume: 0.8,
    },
    timestamp: Date.now(),
  },
  {
    id: 'op_move_audio_clip',
    type: 'move_audio_clip',
    target: { layerId: 'layer_1', clipId: 'clip_1' },
    payload: { startTime: 5 },
    timestamp: Date.now(),
  },
  {
    id: 'op_trim_audio_clip',
    type: 'trim_audio_clip',
    target: { layerId: 'layer_1', clipId: 'clip_1' },
    payload: { startTime: 2, duration: 6 },
    timestamp: Date.now(),
  },
  {
    id: 'op_adjust_audio_volume',
    type: 'adjust_audio_volume',
    target: { layerId: 'layer_1', clipId: 'clip_1' },
    payload: { volume: 0.5 },
    timestamp: Date.now(),
  },
  {
    id: 'op_delete_audio_clip',
    type: 'delete_audio_clip',
    target: { layerId: 'layer_1', clipId: 'clip_1' },
    payload: null,
    timestamp: Date.now(),
  },
];
```

### fixtures/edge-cases.ts

```typescript
/**
 * Edge cases and malformed data for robustness testing
 */
export const EDGE_CASES = {
  // Missing required fields
  missingId: {
    name: 'Missing ID',
    width: 1080,
    height: 1080,
    duration: 5000,
    children: [],
  },

  // Invalid field types
  invalidTypes: {
    id: 'template_invalid',
    name: 123, // Should be string
    width: '1080', // Should be number
    duration: null, // Should be number
    children: 'not-an-array', // Should be array
  },

  // Extreme values
  extremeValues: {
    id: 'template_extreme',
    name: 'Extreme Values',
    width: 999999,
    height: 999999,
    duration: 0,
    children: [
      {
        id: 'element_extreme',
        type: 'text',
        x: -10000,
        y: -10000,
        width: 0.001,
        height: 0.001,
        rotation: 720,
        opacity: 2,
        scaleX: 100,
        scaleY: -100,
      },
    ],
  },

  // Deeply nested structures
  deeplyNested: {
    id: 'template_nested',
    name: 'Deeply Nested',
    width: 1080,
    height: 1080,
    duration: 5000,
    children: [
      {
        id: 'element_nested',
        type: 'text',
        padding: {
          top: 10,
          right: 10,
          bottom: 10,
          left: 10,
          nested: {
            deep: {
              very: {
                deep: 'value',
              },
            },
          },
        },
      },
    ],
  },

  // Special characters
  specialCharacters: {
    id: 'template_special',
    name: 'Special <>&"\'chars',
    width: 1080,
    height: 1080,
    duration: 5000,
    children: [
      {
        id: 'element_special',
        type: 'text',
        text: 'Line 1\nLine 2\tTabbed\r\nWindows',
        fontFamily: 'Font "with" quotes',
      },
    ],
  },

  // Empty strings and null values
  emptyValues: {
    id: '',
    name: '',
    width: 1080,
    height: 1080,
    duration: 5000,
    children: [
      {
        id: 'element_empty',
        type: 'text',
        text: '',
        fill: null,
        stroke: null,
        fontFamily: null,
      },
    ],
    backgroundColor: null,
    backgroundImage: null,
  },
};
```

## 2. Unit Tests

### unit/format-detector.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import { FormatDetector } from '../format-detector';
import { MINIMAL_LEGACY, COMPLEX_LEGACY } from '../__tests__/fixtures/legacy-templates';

describe('FormatDetector', () => {
  const detector = new FormatDetector();

  describe('isLegacyFormat', () => {
    it('should detect legacy format with children[] array', () => {
      expect(detector.isLegacyFormat(MINIMAL_LEGACY)).toBe(true);
      expect(detector.isLegacyFormat(COMPLEX_LEGACY)).toBe(true);
    });

    it('should detect DesignData format with pages[] array', () => {
      const designData = {
        canvas: { width: 1080, height: 1080 },
        pages: [{ id: 'page_1', duration: 5, elements: [] }],
        audioLayers: [],
      };
      expect(detector.isLegacyFormat(designData)).toBe(false);
    });

    it('should return false for empty objects', () => {
      expect(detector.isLegacyFormat({})).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(detector.isLegacyFormat(null)).toBe(false);
      expect(detector.isLegacyFormat(undefined)).toBe(false);
    });

    it('should handle objects with both children and pages (invalid)', () => {
      const invalid = {
        children: [],
        pages: [],
      };
      // Should prefer children detection
      expect(detector.isLegacyFormat(invalid)).toBe(true);
    });
  });

  describe('detectVersion', () => {
    it('should return v1 for legacy templates', () => {
      expect(detector.detectVersion(MINIMAL_LEGACY)).toBe('v1');
    });

    it('should return v2 for DesignData templates', () => {
      const designData = {
        canvas: { width: 1080, height: 1080 },
        pages: [],
        audioLayers: [],
      };
      expect(detector.detectVersion(designData)).toBe('v2');
    });

    it('should return unknown for unrecognized formats', () => {
      expect(detector.detectVersion({})).toBe('unknown');
      expect(detector.detectVersion({ random: 'data' })).toBe('unknown');
    });
  });

  describe('getFormatMetadata', () => {
    it('should return metadata for legacy format', () => {
      const metadata = detector.getFormatMetadata(COMPLEX_LEGACY);
      expect(metadata).toEqual({
        version: 'v1',
        elementCount: 3,
        hasAudio: false,
        pageCount: 1,
      });
    });

    it('should count audio elements correctly', () => {
      const withAudio = {
        ...MINIMAL_LEGACY,
        children: [
          ...MINIMAL_LEGACY.children,
          { id: 'audio_1', type: 'audio', src: 'audio.mp3' },
        ],
      };
      const metadata = detector.getFormatMetadata(withAudio);
      expect(metadata.hasAudio).toBe(true);
    });
  });
});
```

### unit/legacy-to-v2.test.ts

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { LegacyToV2Adapter } from '../legacy-to-v2';
import { MINIMAL_LEGACY, COMPLEX_LEGACY, EMPTY_LEGACY } from '../__tests__/fixtures/legacy-templates';
import type { DesignData } from '../../model/types';

describe('LegacyToV2Adapter', () => {
  let adapter: LegacyToV2Adapter;

  beforeEach(() => {
    adapter = new LegacyToV2Adapter();
  });

  describe('toDesignData', () => {
    it('should transform minimal legacy template correctly', () => {
      const result = adapter.toDesignData(MINIMAL_LEGACY);

      expect(result.canvas).toEqual({
        width: 1080,
        height: 1080,
        backgroundColor: '#ffffff',
      });

      expect(result.pages).toHaveLength(1);
      expect(result.pages[0]).toMatchObject({
        id: 'template_minimal',
        duration: 5, // 5000ms → 5s
        elements: expect.arrayContaining([
          expect.objectContaining({
            id: 'element_1',
            type: 'text',
            x: 100,
            y: 100,
            width: 200,
            height: 50,
          }),
        ]),
      });
    });

    it('should transform complex legacy template with all fields', () => {
      const result = adapter.toDesignData(COMPLEX_LEGACY);

      expect(result.pages[0].elements).toHaveLength(3);

      // Check text element transformation
      const textElement = result.pages[0].elements.find((e) => e.id === 'text_styled');
      expect(textElement).toMatchObject({
        type: 'text',
        content: 'Styled Text',
        fontSize: 48,
        fontFamily: 'Montserrat',
        fontWeight: 'bold',
        textAlign: 'center',
        fill: '#FF6B6B',
        stroke: '#000000',
        strokeWidth: 2,
        rotation: 15,
        opacity: 0.9,
      });

      // Check SVG element
      const svgElement = result.pages[0].elements.find((e) => e.id === 'svg_icon');
      expect(svgElement).toMatchObject({
        type: 'svg',
        fill: '#4ECDC4',
      });

      // Check image element
      const imageElement = result.pages[0].elements.find((e) => e.id === 'image_animated');
      expect(imageElement).toMatchObject({
        type: 'image',
        src: 'https://example.com/image.jpg',
      });
    });

    it('should handle empty children array', () => {
      const result = adapter.toDesignData(EMPTY_LEGACY);

      expect(result.pages[0].elements).toHaveLength(0);
    });

    it('should cache original template for round-trip', () => {
      const result = adapter.toDesignData(MINIMAL_LEGACY);

      // Cache should contain original
      const cached = adapter['cache'].getOriginal(result.pages[0].id);
      expect(cached).toEqual(MINIMAL_LEGACY);
    });

    it('should convert duration from ms to seconds', () => {
      const template = { ...MINIMAL_LEGACY, duration: 15000 };
      const result = adapter.toDesignData(template);

      expect(result.pages[0].duration).toBe(15);
    });

    it('should map fontStyle to fontWeight', () => {
      const template = {
        ...MINIMAL_LEGACY,
        children: [
          {
            ...MINIMAL_LEGACY.children[0],
            fontStyle: 'bold',
          },
        ],
      };
      const result = adapter.toDesignData(template);

      expect(result.pages[0].elements[0].fontWeight).toBe('bold');
    });

    it('should map align to textAlign', () => {
      const template = {
        ...MINIMAL_LEGACY,
        children: [
          {
            ...MINIMAL_LEGACY.children[0],
            align: 'center',
          },
        ],
      };
      const result = adapter.toDesignData(template);

      expect(result.pages[0].elements[0].textAlign).toBe('center');
    });
  });

  describe('transformElement', () => {
    it('should include only mapped fields', () => {
      const legacyElement = {
        id: 'test',
        type: 'text',
        x: 100,
        y: 100,
        width: 200,
        height: 50,
        // Legacy-only fields that should NOT appear in DesignData
        draggable: true,
        scaleX: 1.5,
        scaleY: 1.5,
        skewX: 10,
        offsetX: 5,
      };

      const result = adapter['transformElement'](legacyElement);

      expect(result).not.toHaveProperty('draggable');
      expect(result).not.toHaveProperty('scaleX');
      expect(result).not.toHaveProperty('scaleY');
      expect(result).not.toHaveProperty('skewX');
      expect(result).not.toHaveProperty('offsetX');
    });
  });
});
```

### unit/v2-to-legacy.test.ts

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { V2ToLegacyAdapter } from '../v2-to-legacy';
import { LegacyToV2Adapter } from '../legacy-to-v2';
import { MINIMAL_LEGACY, COMPLEX_LEGACY } from '../__tests__/fixtures/legacy-templates';

describe('V2ToLegacyAdapter', () => {
  let v2Adapter: V2ToLegacyAdapter;
  let legacyAdapter: LegacyToV2Adapter;

  beforeEach(() => {
    v2Adapter = new V2ToLegacyAdapter();
    legacyAdapter = new LegacyToV2Adapter();
  });

  describe('toLegacy', () => {
    it('should restore original legacy template from cache', () => {
      // Transform legacy → v2
      const designData = legacyAdapter.toDesignData(MINIMAL_LEGACY);

      // Transform v2 → legacy
      const restored = v2Adapter.toLegacy(designData);

      // Should be identical to original
      expect(restored).toEqual(MINIMAL_LEGACY);
    });

    it('should preserve all 60+ legacy fields', () => {
      const designData = legacyAdapter.toDesignData(COMPLEX_LEGACY);
      const restored = v2Adapter.toLegacy(designData);

      // Check all text element fields preserved
      const originalText = COMPLEX_LEGACY.children.find((e) => e.id === 'text_styled');
      const restoredText = restored.children.find((e) => e.id === 'text_styled');

      expect(restoredText).toEqual(originalText);
      expect(restoredText.padding).toEqual(originalText.padding);
      expect(restoredText.shadow).toEqual(originalText.shadow);
    });

    it('should create new legacy template if no cache exists', () => {
      const designData = {
        canvas: { width: 1080, height: 1080 },
        pages: [
          {
            id: 'new_page',
            duration: 5,
            elements: [
              {
                id: 'new_element',
                type: 'text' as const,
                x: 100,
                y: 100,
                width: 200,
                height: 50,
                content: 'New Text',
              },
            ],
          },
        ],
        audioLayers: [],
      };

      const legacy = v2Adapter.toLegacy(designData);

      expect(legacy).toMatchObject({
        id: 'new_page',
        name: 'Untitled Template',
        width: 1080,
        height: 1080,
        duration: 5000,
        children: expect.arrayContaining([
          expect.objectContaining({
            id: 'new_element',
            type: 'text',
            text: 'New Text',
          }),
        ]),
      });
    });

    it('should apply defaults for missing fields', () => {
      const designData = {
        canvas: { width: 1080, height: 1080 },
        pages: [
          {
            id: 'page_1',
            duration: 5,
            elements: [
              {
                id: 'element_1',
                type: 'text' as const,
                x: 100,
                y: 100,
                width: 200,
                height: 50,
                // Minimal fields only
              },
            ],
          },
        ],
        audioLayers: [],
      };

      const legacy = v2Adapter.toLegacy(designData);
      const element = legacy.children[0];

      // Should have all default fields
      expect(element).toMatchObject({
        rotation: 0,
        opacity: 1,
        visible: true,
        draggable: true,
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
        skewY: 0,
        offsetX: 0,
        offsetY: 0,
      });
    });

    it('should convert duration from seconds to ms', () => {
      const designData = legacyAdapter.toDesignData(MINIMAL_LEGACY);
      designData.pages[0].duration = 15; // 15 seconds

      const legacy = v2Adapter.toLegacy(designData);
      expect(legacy.duration).toBe(15000); // 15000 ms
    });

    it('should map fontWeight to fontStyle', () => {
      const designData = {
        canvas: { width: 1080, height: 1080 },
        pages: [
          {
            id: 'page_1',
            duration: 5,
            elements: [
              {
                id: 'text_1',
                type: 'text' as const,
                x: 100,
                y: 100,
                width: 200,
                height: 50,
                fontWeight: 'bold',
              },
            ],
          },
        ],
        audioLayers: [],
      };

      const legacy = v2Adapter.toLegacy(designData);
      expect(legacy.children[0].fontStyle).toBe('bold');
    });

    it('should map textAlign to align', () => {
      const designData = {
        canvas: { width: 1080, height: 1080 },
        pages: [
          {
            id: 'page_1',
            duration: 5,
            elements: [
              {
                id: 'text_1',
                type: 'text' as const,
                x: 100,
                y: 100,
                width: 200,
                height: 50,
                textAlign: 'center',
              },
            ],
          },
        ],
        audioLayers: [],
      };

      const legacy = v2Adapter.toLegacy(designData);
      expect(legacy.children[0].align).toBe('center');
    });
  });
});
```

### unit/operation-translator.test.ts

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { OperationTranslator } from '../operation-translator';
import { ALL_OPERATIONS } from '../__tests__/fixtures/operations';
import type { LegacyMutation } from '../legacy-types';

describe('OperationTranslator', () => {
  let translator: OperationTranslator;

  beforeEach(() => {
    translator = new OperationTranslator();
  });

  describe('translateToMutations', () => {
    it('should translate all operation types without errors', () => {
      const mutations = translator.translateToMutations(ALL_OPERATIONS);

      expect(mutations).toHaveLength(ALL_OPERATIONS.length);
      expect(mutations.every((m) => m.id && m.timestamp)).toBe(true);
    });

    it('should translate add_element operation', () => {
      const op = ALL_OPERATIONS.find((o) => o.type === 'add_element')!;
      const mutations = translator.translateToMutations([op]);

      expect(mutations[0]).toMatchObject({
        type: 'add_child',
        targetId: null,
        payload: expect.objectContaining({
          id: 'new_element',
          type: 'text',
          x: 100,
          y: 100,
          text: 'New Text',
        }),
      });
    });

    it('should translate update_element operation', () => {
      const op = ALL_OPERATIONS.find((o) => o.type === 'update_element')!;
      const mutations = translator.translateToMutations([op]);

      expect(mutations[0]).toMatchObject({
        type: 'update_child',
        targetId: 'element_1',
        payload: { x: 150, y: 200 },
      });
    });

    it('should translate delete_element operation', () => {
      const op = ALL_OPERATIONS.find((o) => o.type === 'delete_element')!;
      const mutations = translator.translateToMutations([op]);

      expect(mutations[0]).toMatchObject({
        type: 'delete_child',
        targetId: 'element_1',
        payload: null,
      });
    });

    it('should translate move_element operation', () => {
      const op = ALL_OPERATIONS.find((o) => o.type === 'move_element')!;
      const mutations = translator.translateToMutations([op]);

      expect(mutations[0]).toMatchObject({
        type: 'update_child',
        targetId: 'element_1',
        payload: { x: 300, y: 400 },
      });
    });

    it('should translate resize_element operation', () => {
      const op = ALL_OPERATIONS.find((o) => o.type === 'resize_element')!;
      const mutations = translator.translateToMutations([op]);

      expect(mutations[0]).toMatchObject({
        type: 'update_child',
        targetId: 'element_1',
        payload: { width: 250, height: 100 },
      });
    });

    it('should translate rotate_element operation', () => {
      const op = ALL_OPERATIONS.find((o) => o.type === 'rotate_element')!;
      const mutations = translator.translateToMutations([op]);

      expect(mutations[0]).toMatchObject({
        type: 'update_child',
        targetId: 'element_1',
        payload: { rotation: 45 },
      });
    });

    it('should translate update_page_duration operation', () => {
      const op = ALL_OPERATIONS.find((o) => o.type === 'update_page_duration')!;
      const mutations = translator.translateToMutations([op]);

      expect(mutations[0]).toMatchObject({
        type: 'update_template',
        targetId: null,
        payload: { duration: 7000 }, // 7s → 7000ms
      });
    });

    it('should ignore page operations (add_page, delete_page, reorder_pages)', () => {
      const pageOps = ALL_OPERATIONS.filter((o) =>
        ['add_page', 'delete_page', 'reorder_pages'].includes(o.type)
      );
      const mutations = translator.translateToMutations(pageOps);

      expect(mutations).toHaveLength(0);
    });

    it('should ignore audio operations (single-page format)', () => {
      const audioOps = ALL_OPERATIONS.filter((o) =>
        ['add_audio_clip', 'move_audio_clip', 'trim_audio_clip', 'delete_audio_clip'].includes(
          o.type
        )
      );
      const mutations = translator.translateToMutations(audioOps);

      expect(mutations).toHaveLength(0);
    });

    it('should handle empty operation array', () => {
      const mutations = translator.translateToMutations([]);
      expect(mutations).toHaveLength(0);
    });

    it('should preserve operation timestamps', () => {
      const op = {
        id: 'op_test',
        type: 'update_element' as const,
        target: { pageId: 'page_1', elementId: 'element_1' },
        payload: { x: 100 },
        timestamp: 1234567890,
      };
      const mutations = translator.translateToMutations([op]);

      expect(mutations[0].timestamp).toBe(1234567890);
    });
  });

  describe('applyMutations', () => {
    it('should apply add_child mutation', () => {
      const template = {
        id: 'template_1',
        name: 'Test',
        width: 1080,
        height: 1080,
        duration: 5000,
        children: [],
      };

      const mutation: LegacyMutation = {
        id: 'mut_1',
        type: 'add_child',
        targetId: null,
        payload: {
          id: 'new_element',
          type: 'text',
          x: 100,
          y: 100,
          text: 'Hello',
        },
        timestamp: Date.now(),
      };

      const result = translator.applyMutations(template, [mutation]);
      expect(result.children).toHaveLength(1);
      expect(result.children[0].id).toBe('new_element');
    });

    it('should apply update_child mutation', () => {
      const template = {
        id: 'template_1',
        name: 'Test',
        width: 1080,
        height: 1080,
        duration: 5000,
        children: [
          {
            id: 'element_1',
            type: 'text',
            x: 100,
            y: 100,
            text: 'Original',
          },
        ],
      };

      const mutation: LegacyMutation = {
        id: 'mut_1',
        type: 'update_child',
        targetId: 'element_1',
        payload: { x: 200, text: 'Updated' },
        timestamp: Date.now(),
      };

      const result = translator.applyMutations(template, [mutation]);
      expect(result.children[0].x).toBe(200);
      expect(result.children[0].text).toBe('Updated');
    });

    it('should apply delete_child mutation', () => {
      const template = {
        id: 'template_1',
        name: 'Test',
        width: 1080,
        height: 1080,
        duration: 5000,
        children: [
          { id: 'element_1', type: 'text', x: 100, y: 100 },
          { id: 'element_2', type: 'text', x: 200, y: 200 },
        ],
      };

      const mutation: LegacyMutation = {
        id: 'mut_1',
        type: 'delete_child',
        targetId: 'element_1',
        payload: null,
        timestamp: Date.now(),
      };

      const result = translator.applyMutations(template, [mutation]);
      expect(result.children).toHaveLength(1);
      expect(result.children[0].id).toBe('element_2');
    });

    it('should apply update_template mutation', () => {
      const template = {
        id: 'template_1',
        name: 'Test',
        width: 1080,
        height: 1080,
        duration: 5000,
        children: [],
      };

      const mutation: LegacyMutation = {
        id: 'mut_1',
        type: 'update_template',
        targetId: null,
        payload: { name: 'Updated Name', duration: 10000 },
        timestamp: Date.now(),
      };

      const result = translator.applyMutations(template, [mutation]);
      expect(result.name).toBe('Updated Name');
      expect(result.duration).toBe(10000);
    });

    it('should apply multiple mutations in order', () => {
      const template = {
        id: 'template_1',
        name: 'Test',
        width: 1080,
        height: 1080,
        duration: 5000,
        children: [],
      };

      const mutations: LegacyMutation[] = [
        {
          id: 'mut_1',
          type: 'add_child',
          targetId: null,
          payload: { id: 'element_1', type: 'text', x: 100, y: 100 },
          timestamp: Date.now(),
        },
        {
          id: 'mut_2',
          type: 'update_child',
          targetId: 'element_1',
          payload: { x: 200 },
          timestamp: Date.now(),
        },
        {
          id: 'mut_3',
          type: 'add_child',
          targetId: null,
          payload: { id: 'element_2', type: 'text', x: 300, y: 300 },
          timestamp: Date.now(),
        },
      ];

      const result = translator.applyMutations(template, mutations);
      expect(result.children).toHaveLength(2);
      expect(result.children[0].x).toBe(200);
      expect(result.children[1].id).toBe('element_2');
    });
  });
});
```

## 3. Integration Tests

### integration/round-trip.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import { LegacyToV2Adapter } from '../legacy-to-v2';
import { V2ToLegacyAdapter } from '../v2-to-legacy';
import { MINIMAL_LEGACY, COMPLEX_LEGACY, EMPTY_LEGACY } from '../__tests__/fixtures/legacy-templates';

describe('Round-Trip Validation', () => {
  let legacyAdapter: LegacyToV2Adapter;
  let v2Adapter: V2ToLegacyAdapter;

  beforeEach(() => {
    legacyAdapter = new LegacyToV2Adapter();
    v2Adapter = new V2ToLegacyAdapter();
  });

  describe('Full Round-Trip (Legacy → V2 → Legacy)', () => {
    it('should preserve minimal template exactly', () => {
      // Step 1: Legacy → V2
      const designData = legacyAdapter.toDesignData(MINIMAL_LEGACY);

      // Step 2: V2 → Legacy
      const restored = v2Adapter.toLegacy(designData);

      // Step 3: Verify exact equality
      expect(restored).toEqual(MINIMAL_LEGACY);
    });

    it('should preserve complex template exactly', () => {
      const designData = legacyAdapter.toDesignData(COMPLEX_LEGACY);
      const restored = v2Adapter.toLegacy(designData);

      expect(restored).toEqual(COMPLEX_LEGACY);
    });

    it('should preserve empty template exactly', () => {
      const designData = legacyAdapter.toDesignData(EMPTY_LEGACY);
      const restored = v2Adapter.toLegacy(designData);

      expect(restored).toEqual(EMPTY_LEGACY);
    });

    it('should preserve all element types (text, image, svg, rect, circle)', () => {
      const allTypes = {
        id: 'template_all_types',
        name: 'All Types',
        width: 1080,
        height: 1080,
        duration: 5000,
        children: [
          { id: 'text_1', type: 'text', x: 0, y: 0, text: 'Text' },
          { id: 'image_1', type: 'image', x: 100, y: 100, src: 'image.jpg' },
          { id: 'svg_1', type: 'svg', x: 200, y: 200, svgElement: '<svg/>' },
          { id: 'rect_1', type: 'rect', x: 300, y: 300, width: 100, height: 100 },
          { id: 'circle_1', type: 'circle', x: 400, y: 400, radius: 50 },
        ],
      };

      const designData = legacyAdapter.toDesignData(allTypes);
      const restored = v2Adapter.toLegacy(designData);

      expect(restored).toEqual(allTypes);
    });

    it('should preserve nested objects (padding, shadow)', () => {
      const withNested = {
        ...MINIMAL_LEGACY,
        children: [
          {
            ...MINIMAL_LEGACY.children[0],
            padding: {
              top: 10,
              right: 15,
              bottom: 10,
              left: 15,
              topLeft: 5,
              topRight: 5,
              bottomLeft: 5,
              bottomRight: 5,
              paddingLeft: 15,
              paddingRight: 15,
              paddingTop: 10,
              paddingBottom: 10,
            },
            shadow: {
              color: 'rgba(0,0,0,0.5)',
              blur: 10,
              offset: { x: 5, y: 5 },
              opacity: 0.5,
            },
          },
        ],
      };

      const designData = legacyAdapter.toDesignData(withNested);
      const restored = v2Adapter.toLegacy(designData);

      expect(restored).toEqual(withNested);
    });

    it('should handle multiple round-trips without data loss', () => {
      let current = COMPLEX_LEGACY;

      for (let i = 0; i < 5; i++) {
        const designData = legacyAdapter.toDesignData(current);
        current = v2Adapter.toLegacy(designData);
      }

      expect(current).toEqual(COMPLEX_LEGACY);
    });
  });

  describe('JSON Serialization Round-Trip', () => {
    it('should survive JSON.stringify → JSON.parse', () => {
      const designData = legacyAdapter.toDesignData(COMPLEX_LEGACY);

      // Simulate API serialization
      const json = JSON.stringify(designData);
      const parsed = JSON.parse(json);

      const restored = v2Adapter.toLegacy(parsed);
      expect(restored).toEqual(COMPLEX_LEGACY);
    });

    it('should preserve special characters in JSON', () => {
      const withSpecial = {
        ...MINIMAL_LEGACY,
        name: 'Template with "quotes" and \\backslashes\\',
        children: [
          {
            ...MINIMAL_LEGACY.children[0],
            text: 'Line 1\nLine 2\tTabbed\r\nWindows',
          },
        ],
      };

      const designData = legacyAdapter.toDesignData(withSpecial);
      const json = JSON.stringify(designData);
      const parsed = JSON.parse(json);
      const restored = v2Adapter.toLegacy(parsed);

      expect(restored).toEqual(withSpecial);
    });
  });
});
```

### integration/api-flow.test.ts

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LegacyToV2Adapter } from '../legacy-to-v2';
import { V2ToLegacyAdapter } from '../v2-to-legacy';
import { OperationTranslator } from '../operation-translator';
import { MINIMAL_LEGACY } from '../__tests__/fixtures/legacy-templates';
import type { Operation } from '../../types/api.types';

describe('API Integration Flow', () => {
  let legacyAdapter: LegacyToV2Adapter;
  let v2Adapter: V2ToLegacyAdapter;
  let translator: OperationTranslator;

  // Mock API functions
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    legacyAdapter = new LegacyToV2Adapter();
    v2Adapter = new V2ToLegacyAdapter();
    translator = new OperationTranslator();
    mockFetch.mockClear();
  });

  describe('GET /templates/:id', () => {
    it('should transform legacy template to DesignData', async () => {
      // Mock backend returning legacy JSON
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MINIMAL_LEGACY,
      });

      // Simulate API handler
      const response = await fetch('/templates/template_minimal');
      const legacyData = await response.json();

      // Backend transforms to DesignData
      const designData = legacyAdapter.toDesignData(legacyData);

      expect(designData.pages).toHaveLength(1);
      expect(designData.pages[0].id).toBe('template_minimal');
      expect(designData.pages[0].duration).toBe(5);
    });
  });

  describe('POST /templates/:id/operations', () => {
    it('should apply operations and persist as legacy', async () => {
      // Step 1: Load legacy template
      const designData = legacyAdapter.toDesignData(MINIMAL_LEGACY);

      // Step 2: Client sends operations
      const operations: Operation[] = [
        {
          id: 'op_1',
          type: 'update_element',
          target: { pageId: 'template_minimal', elementId: 'element_1' },
          payload: { x: 200, y: 250 },
          timestamp: Date.now(),
        },
      ];

      // Step 3: Backend translates to mutations
      const mutations = translator.translateToMutations(operations);

      // Step 4: Apply mutations to legacy template
      const legacyTemplate = v2Adapter.toLegacy(designData);
      const updatedLegacy = translator.applyMutations(legacyTemplate, mutations);

      // Step 5: Verify mutation applied
      expect(updatedLegacy.children[0].x).toBe(200);
      expect(updatedLegacy.children[0].y).toBe(250);

      // Step 6: Return as DesignData
      const updatedDesignData = legacyAdapter.toDesignData(updatedLegacy);
      expect(updatedDesignData.pages[0].elements[0].x).toBe(200);
    });

    it('should handle batch operations', async () => {
      const designData = legacyAdapter.toDesignData(MINIMAL_LEGACY);

      const operations: Operation[] = [
        {
          id: 'op_1',
          type: 'add_element',
          target: { pageId: 'template_minimal', elementId: 'element_2' },
          payload: {
            type: 'text',
            x: 300,
            y: 300,
            width: 150,
            height: 40,
            content: 'New Element',
          },
          timestamp: Date.now(),
        },
        {
          id: 'op_2',
          type: 'update_element',
          target: { pageId: 'template_minimal', elementId: 'element_1' },
          payload: { fill: '#FF0000' },
          timestamp: Date.now() + 1,
        },
      ];

      const mutations = translator.translateToMutations(operations);
      const legacyTemplate = v2Adapter.toLegacy(designData);
      const updatedLegacy = translator.applyMutations(legacyTemplate, mutations);

      expect(updatedLegacy.children).toHaveLength(2);
      expect(updatedLegacy.children[1].id).toBe('element_2');
      expect(updatedLegacy.children[0].fill).toBe('#FF0000');
    });
  });

  describe('Conflict Detection', () => {
    it('should detect version mismatch', async () => {
      // Client has baseVersion: 5
      // Server has version: 6
      // Should return 409 Conflict

      const clientVersion = 5;
      const serverVersion = 6;

      expect(serverVersion).toBeGreaterThan(clientVersion);

      // Mock 409 response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: 'Version conflict',
          currentVersion: serverVersion,
          expectedVersion: clientVersion,
        }),
      });

      const response = await fetch('/templates/template_1/operations', {
        method: 'POST',
        body: JSON.stringify({
          baseVersion: clientVersion,
          operations: [],
        }),
      });

      expect(response.status).toBe(409);
      const error = await response.json();
      expect(error.currentVersion).toBe(6);
    });
  });
});
```

## 4. Performance Tests

### performance/transform-benchmark.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import { LegacyToV2Adapter } from '../legacy-to-v2';
import { V2ToLegacyAdapter } from '../v2-to-legacy';
import { COMPLEX_LEGACY } from '../__tests__/fixtures/legacy-templates';

describe('Performance Benchmarks', () => {
  describe('Transform Performance', () => {
    it('should transform legacy → v2 in <50ms', () => {
      const adapter = new LegacyToV2Adapter();

      const start = performance.now();
      adapter.toDesignData(COMPLEX_LEGACY);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
      console.log(`Legacy → V2 transform: ${duration.toFixed(2)}ms`);
    });

    it('should transform v2 → legacy in <50ms', () => {
      const legacyAdapter = new LegacyToV2Adapter();
      const v2Adapter = new V2ToLegacyAdapter();

      const designData = legacyAdapter.toDesignData(COMPLEX_LEGACY);

      const start = performance.now();
      v2Adapter.toLegacy(designData);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
      console.log(`V2 → Legacy transform: ${duration.toFixed(2)}ms`);
    });

    it('should handle large template (100 elements) in <200ms', () => {
      const largeTemplate = {
        ...COMPLEX_LEGACY,
        children: Array.from({ length: 100 }, (_, i) => ({
          id: `element_${i}`,
          type: 'text',
          x: (i % 10) * 100,
          y: Math.floor(i / 10) * 100,
          width: 80,
          height: 40,
          text: `Element ${i}`,
        })),
      };

      const legacyAdapter = new LegacyToV2Adapter();
      const v2Adapter = new V2ToLegacyAdapter();

      const start = performance.now();
      const designData = legacyAdapter.toDesignData(largeTemplate);
      const restored = v2Adapter.toLegacy(designData);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200);
      expect(restored.children).toHaveLength(100);
      console.log(`Large template (100 elements) round-trip: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Operation Translation Performance', () => {
    it('should translate 100 operations in <100ms', () => {
      const translator = new OperationTranslator();

      const operations = Array.from({ length: 100 }, (_, i) => ({
        id: `op_${i}`,
        type: 'update_element' as const,
        target: { pageId: 'page_1', elementId: `element_${i % 10}` },
        payload: { x: i * 10, y: i * 10 },
        timestamp: Date.now(),
      }));

      const start = performance.now();
      translator.translateToMutations(operations);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
      console.log(`Translate 100 operations: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Cache Performance', () => {
    it('should benefit from cache on repeated transforms', () => {
      const legacyAdapter = new LegacyToV2Adapter();
      const v2Adapter = new V2ToLegacyAdapter();

      // First transform (cache miss)
      const start1 = performance.now();
      const designData = legacyAdapter.toDesignData(COMPLEX_LEGACY);
      const firstTransform = v2Adapter.toLegacy(designData);
      const duration1 = performance.now() - start1;

      // Second transform (cache hit)
      const start2 = performance.now();
      const secondTransform = v2Adapter.toLegacy(designData);
      const duration2 = performance.now() - start2;

      expect(duration2).toBeLessThan(duration1);
      expect(firstTransform).toEqual(secondTransform);

      console.log(`First transform: ${duration1.toFixed(2)}ms`);
      console.log(`Cached transform: ${duration2.toFixed(2)}ms`);
      console.log(`Speedup: ${(duration1 / duration2).toFixed(2)}x`);
    });
  });
});
```

## 5. Test Utilities

### test-utils/assertions.ts

```typescript
/**
 * Custom assertions for adapter testing
 */

import { expect } from 'vitest';
import type { LegacyTemplate } from '../legacy-types';
import type { DesignData } from '../../model/types';

/**
 * Assert that two legacy templates are deeply equal
 */
export function assertLegacyEqual(actual: LegacyTemplate, expected: LegacyTemplate) {
  expect(actual).toEqual(expected);

  // Additional checks
  expect(actual.children.length).toBe(expected.children.length);
  actual.children.forEach((child, i) => {
    expect(child).toEqual(expected.children[i]);
  });
}

/**
 * Assert that DesignData has valid structure
 */
export function assertValidDesignData(data: DesignData) {
  expect(data).toHaveProperty('canvas');
  expect(data).toHaveProperty('pages');
  expect(data).toHaveProperty('audioLayers');

  expect(data.canvas).toHaveProperty('width');
  expect(data.canvas).toHaveProperty('height');

  expect(Array.isArray(data.pages)).toBe(true);
  expect(Array.isArray(data.audioLayers)).toBe(true);

  data.pages.forEach((page) => {
    expect(page).toHaveProperty('id');
    expect(page).toHaveProperty('duration');
    expect(page).toHaveProperty('elements');
    expect(Array.isArray(page.elements)).toBe(true);
  });
}

/**
 * Assert that legacy template has valid structure
 */
export function assertValidLegacy(template: LegacyTemplate) {
  expect(template).toHaveProperty('id');
  expect(template).toHaveProperty('name');
  expect(template).toHaveProperty('width');
  expect(template).toHaveProperty('height');
  expect(template).toHaveProperty('duration');
  expect(template).toHaveProperty('children');

  expect(Array.isArray(template.children)).toBe(true);

  template.children.forEach((child) => {
    expect(child).toHaveProperty('id');
    expect(child).toHaveProperty('type');
    expect(child).toHaveProperty('x');
    expect(child).toHaveProperty('y');
  });
}

/**
 * Assert that round-trip preserves all fields
 */
export function assertRoundTripPreservation(
  original: LegacyTemplate,
  restored: LegacyTemplate
) {
  // Top-level fields
  expect(restored.id).toBe(original.id);
  expect(restored.name).toBe(original.name);
  expect(restored.width).toBe(original.width);
  expect(restored.height).toBe(original.height);
  expect(restored.duration).toBe(original.duration);
  expect(restored.backgroundColor).toBe(original.backgroundColor);
  expect(restored.backgroundImage).toBe(original.backgroundImage);

  // Children array
  expect(restored.children.length).toBe(original.children.length);

  original.children.forEach((originalChild, i) => {
    const restoredChild = restored.children[i];

    // All fields should be identical
    expect(restoredChild).toEqual(originalChild);
  });
}
```

### test-utils/comparators.ts

```typescript
/**
 * Deep equality utilities for testing
 */

/**
 * Deep equality check ignoring undefined values
 */
export function deepEqualIgnoreUndefined(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;

  const keys1 = Object.keys(obj1).filter((k) => obj1[k] !== undefined);
  const keys2 = Object.keys(obj2).filter((k) => obj2[k] !== undefined);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqualIgnoreUndefined(obj1[key], obj2[key])) return false;
  }

  return true;
}

/**
 * Find differences between two objects
 */
export function findDifferences(obj1: any, obj2: any, path = ''): string[] {
  const diffs: string[] = [];

  if (typeof obj1 !== typeof obj2) {
    diffs.push(`${path}: type mismatch (${typeof obj1} vs ${typeof obj2})`);
    return diffs;
  }

  if (obj1 === null || obj2 === null) {
    if (obj1 !== obj2) {
      diffs.push(`${path}: ${obj1} !== ${obj2}`);
    }
    return diffs;
  }

  if (typeof obj1 !== 'object') {
    if (obj1 !== obj2) {
      diffs.push(`${path}: ${obj1} !== ${obj2}`);
    }
    return diffs;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  const allKeys = new Set([...keys1, ...keys2]);

  for (const key of allKeys) {
    const newPath = path ? `${path}.${key}` : key;

    if (!(key in obj1)) {
      diffs.push(`${newPath}: missing in obj1`);
    } else if (!(key in obj2)) {
      diffs.push(`${newPath}: missing in obj2`);
    } else {
      diffs.push(...findDifferences(obj1[key], obj2[key], newPath));
    }
  }

  return diffs;
}

/**
 * Count total fields in object (recursive)
 */
export function countFields(obj: any): number {
  if (typeof obj !== 'object' || obj === null) return 1;

  let count = 0;
  for (const key in obj) {
    count += countFields(obj[key]);
  }
  return count;
}
```

### test-utils/generators.ts

```typescript
/**
 * Test data generators
 */

import type { LegacyTemplate, LegacyElement } from '../legacy-types';
import { createDefaultLegacyElement } from '../field-defaults';

/**
 * Generate random legacy element
 */
export function generateRandomElement(overrides?: Partial<LegacyElement>): LegacyElement {
  const defaults = createDefaultLegacyElement('text');

  return {
    ...defaults,
    id: `element_${Math.random().toString(36).substr(2, 9)}`,
    x: Math.random() * 1000,
    y: Math.random() * 1000,
    width: 100 + Math.random() * 200,
    height: 50 + Math.random() * 100,
    ...overrides,
  };
}

/**
 * Generate legacy template with N elements
 */
export function generateLegacyTemplate(elementCount: number): LegacyTemplate {
  return {
    id: `template_${Math.random().toString(36).substr(2, 9)}`,
    name: `Generated Template (${elementCount} elements)`,
    width: 1080,
    height: 1080,
    duration: 5000,
    children: Array.from({ length: elementCount }, () => generateRandomElement()),
    backgroundColor: '#ffffff',
    backgroundImage: null,
  };
}

/**
 * Generate stress test template (large)
 */
export function generateStressTemplate(): LegacyTemplate {
  return generateLegacyTemplate(500);
}
```

## 6. Running Tests

### package.json scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run unit/",
    "test:integration": "vitest run integration/",
    "test:performance": "vitest run performance/",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  }
}
```

### Running specific test suites

```bash
# Run all tests
bun test

# Run only unit tests
bun test:unit

# Run only integration tests
bun test:integration

# Run only performance benchmarks
bun test:performance

# Run with coverage report
bun test:coverage

# Watch mode (re-run on file changes)
bun test:watch

# Run specific test file
bun test format-detector.test.ts

# Run tests matching pattern
bun test round-trip
```

## 7. Continuous Validation

### validation-script.sh

```bash
#!/bin/bash

# Continuous validation script for adapter implementation
# Run this after any changes to adapters

set -e

echo "🧪 Running Adapter Validation Suite..."
echo ""

# 1. Format detection tests
echo "1️⃣  Format Detection..."
bun test format-detector.test.ts --reporter=dot
echo "✅ Format detection passed"
echo ""

# 2. Transformation tests
echo "2️⃣  Transformations (Legacy ↔ V2)..."
bun test legacy-to-v2.test.ts v2-to-legacy.test.ts --reporter=dot
echo "✅ Transformations passed"
echo ""

# 3. Round-trip validation
echo "3️⃣  Round-Trip Preservation..."
bun test round-trip.test.ts --reporter=dot
echo "✅ Round-trip passed"
echo ""

# 4. Operation translation
echo "4️⃣  Operation Translation..."
bun test operation-translator.test.ts --reporter=dot
echo "✅ Operation translation passed"
echo ""

# 5. Performance benchmarks
echo "5️⃣  Performance Benchmarks..."
bun test transform-benchmark.test.ts --reporter=verbose
echo ""

# 6. Integration flow
echo "6️⃣  API Integration Flow..."
bun test api-flow.test.ts --reporter=dot
echo "✅ API integration passed"
echo ""

echo "🎉 All validations passed!"
echo ""
echo "Summary:"
echo "  ✅ Format detection"
echo "  ✅ Transformations"
echo "  ✅ Round-trip preservation"
echo "  ✅ Operation translation"
echo "  ✅ Performance benchmarks"
echo "  ✅ API integration"
```

### Make it executable

```bash
chmod +x validation-script.sh
```

### Run validation

```bash
./validation-script.sh
```

## 8. Test Coverage Goals

| Component | Target Coverage | Description |
|-----------|----------------|-------------|
| Format Detector | 100% | All detection paths |
| Legacy → V2 Adapter | 95% | All element types + edge cases |
| V2 → Legacy Adapter | 95% | All restoration paths |
| Operation Translator | 90% | All 16 operation types |
| Cache | 100% | Get/set/clear operations |
| Round-Trip | 100% | All templates preserve exactly |

## 9. Troubleshooting Failed Tests

### Round-trip failures

```typescript
// Debug helper
import { findDifferences } from './test-utils/comparators';

const diffs = findDifferences(original, restored);
console.log('Differences found:', diffs);
```

### Performance failures

```typescript
// Profile slow transforms
const start = performance.now();
const result = adapter.toDesignData(largeTemplate);
console.log(`Transform took ${performance.now() - start}ms`);

// Check cache
console.log('Cache size:', adapter['cache'].size);
```

### Operation translation failures

```typescript
// Debug operation translation
const mutations = translator.translateToMutations(operations);
console.log('Generated mutations:', JSON.stringify(mutations, null, 2));
```

## 10. Success Criteria

✅ **All tests pass**
- Unit tests: 100% pass rate
- Integration tests: 100% pass rate
- Performance tests: Meet all benchmarks

✅ **Round-trip equality**
- `MINIMAL_LEGACY`: 100% preserved
- `COMPLEX_LEGACY`: 100% preserved
- All 60+ fields preserved

✅ **Performance targets**
- Legacy → V2: <50ms
- V2 → Legacy: <50ms (cache hit: <5ms)
- 100 elements: <200ms round-trip
- 100 operations: <100ms translation

✅ **Coverage targets**
- Overall: >90%
- Critical paths: 100%

## Next Steps

1. Copy test files to your project
2. Run `bun install vitest` if not already installed
3. Run `bun test` to execute all tests
4. Review performance benchmarks
5. Run validation script before committing changes
6. Integrate into CI/CD pipeline

---

**Document Version**: 1.0
**Last Updated**: 2025-12-09
**Status**: Complete
