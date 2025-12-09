# Legacy Template Adapter Specification

## Purpose

This specification defines the adapter pattern for achieving backward compatibility between legacy Konva-based templates and the new GraphicEditor Command Pattern architecture. The adapter enables zero-database-migration transformation between legacy JSON format and DesignData format while preserving all legacy fields and maintaining compatibility with existing Konva editor.

## ADDED Requirements

### Requirement: Format Detection and Version Identification

The system SHALL automatically detect template format version without requiring explicit version fields in legacy templates.

#### Scenario: Detect v1 legacy format

- **WHEN** backend receives template data with `children` array at root level
- **AND** template has legacy fields like `templateType`, `animationConfig`, `guideConfig`
- **THEN** format is identified as 'v1-legacy'
- **AND** confidence score is 1.0 if all legacy fields present
- **AND** LegacyToV2Adapter is selected for transformation

#### Scenario: Detect v2 GraphicEditor format

- **WHEN** backend receives template data with `pages` array at root level
- **AND** template has `canvas` object with width and height
- **THEN** format is identified as 'v2-native'
- **AND** confidence score is 1.0
- **AND** no adapter transformation is needed

#### Scenario: Handle unknown format

- **WHEN** template structure does not match v1 or v2 patterns
- **THEN** format detection returns 'unknown' with confidence 0
- **AND** HTTP 400 error is returned with error message
- **AND** error describes expected format structure

### Requirement: Legacy to DesignData Transformation

The system SHALL transform legacy Konva JSON to GraphicEditor DesignData format while caching original data for round-trip preservation.

#### Scenario: Transform legacy template to DesignData

- **WHEN** backend loads legacy template from database
- **THEN** adapter creates DesignData structure with canvas object
- **AND** legacy `width` and `height` map to `canvas.width` and `canvas.height`
- **AND** legacy `children[]` array maps to `pages[0].elements[]`
- **AND** legacy `duration` (milliseconds) converts to `pages[0].duration` (seconds)
- **AND** legacy `background` maps to `pages[0].background`
- **AND** legacy `animationConfig` transforms to `pages[0].animation`
- **AND** `audioLayers` is initialized as empty array (legacy has no audio)

#### Scenario: Transform legacy element to DesignElement

- **WHEN** legacy child element is transformed
- **THEN** adapter extracts core fields: id, x, y, width, height, rotation, opacity
- **AND** legacy dual-type (type + elementType) maps to single type
- **AND** legacy `elementAnimation` object transforms to simplified `animation`
- **AND** legacy `fill` maps to DesignElement `fill`
- **AND** element `className` is set to legacy `elementType` for Konva compatibility
- **AND** text-specific fields (text, fontSize) are preserved if present
- **AND** image-specific fields (src) are preserved if present

#### Scenario: Cache original legacy template

- **WHEN** transformation begins
- **THEN** complete legacy template is deep-cloned using structuredClone
- **AND** original is stored in cache with template ID as key
- **AND** cache entry includes all 60+ element fields and 30+ template fields
- **AND** cache is retained for duration of session

#### Scenario: Map legacy element types

- **WHEN** element has type='image'
- **THEN** DesignElement type is 'image'
- **WHEN** element has type='text'
- **THEN** DesignElement type is 'text'
- **WHEN** element has type='shape' and elementType='graphicShape'
- **THEN** DesignElement type is inferred from shape characteristics (default 'polygon')

### Requirement: DesignData to Legacy Restoration

The system SHALL restore DesignData back to legacy format while preserving all original fields that were not explicitly modified.

#### Scenario: Restore DesignData to legacy template

- **WHEN** GraphicEditor saves changes
- **THEN** adapter retrieves cached original legacy template
- **AND** starts with complete original (all fields preserved)
- **AND** overrides only fields that changed: width, height, background, duration
- **AND** overrides children array with restored elements
- **AND** preserves all other legacy fields unchanged (guideConfig, marginConfig, etc.)
- **AND** returns complete legacy JSON ready for database storage

#### Scenario: Restore DesignElement to legacy child

- **WHEN** element is being restored
- **THEN** adapter retrieves original legacy element from cache by ID
- **AND** starts with complete original element (all 60+ fields)
- **AND** overrides position: x, y from DesignElement
- **AND** overrides dimensions: width, height from DesignElement
- **AND** overrides rotation from DesignElement
- **AND** overrides fill, opacity from DesignElement
- **AND** transforms simplified animation back to legacy elementAnimation object
- **AND** preserves all unmodified legacy fields (padding, svgElement, cropX, etc.)

#### Scenario: Handle new elements created in GraphicEditor

- **WHEN** DesignElement does not exist in original cache (new element)
- **THEN** adapter creates legacy element with all default fields
- **AND** applies DesignElement values to core fields
- **AND** sets default values for all 60+ legacy fields
- **AND** default padding: all 12 fields initialized to 0 or false
- **AND** default crop: cropWidth=1, cropHeight=1, cropX=0, cropY=0
- **AND** default visibility: visible=true, opacity=1
- **AND** new element is added to children array

#### Scenario: Preserve unknown legacy fields

- **WHEN** legacy template has custom/unknown fields not in specification
- **THEN** original cache preserves these fields exactly
- **AND** restoration includes unknown fields in output
- **AND** round-trip test verifies unknown fields are unchanged
- **AND** no data loss occurs for template-specific extensions

### Requirement: Operation Translation to Legacy Mutations

The system SHALL translate GraphicEditor Command Pattern operations into equivalent legacy JSON mutations.

#### Scenario: Translate move_element operation

- **WHEN** operation type is 'move_element'
- **THEN** adapter finds child in legacy children array by elementId
- **AND** updates child.x to operation.payload.x
- **AND** updates child.y to operation.payload.y
- **AND** preserves all other child fields unchanged
- **AND** returns modified legacy template

#### Scenario: Translate resize_element operation

- **WHEN** operation type is 'resize_element'
- **THEN** adapter finds child by elementId
- **AND** updates child.width to operation.payload.width
- **AND** updates child.height to operation.payload.height
- **AND** updates child.x to operation.payload.x (position may change during resize)
- **AND** updates child.y to operation.payload.y
- **AND** preserves rotation, fill, and all other fields

#### Scenario: Translate rotate_element operation

- **WHEN** operation type is 'rotate_element'
- **THEN** adapter finds child by elementId
- **AND** updates child.rotation to operation.payload.rotation
- **AND** preserves position, dimensions, and all other fields

#### Scenario: Translate add_element operation

- **WHEN** operation type is 'add_element'
- **THEN** adapter creates new legacy element with default fields
- **AND** sets core fields from operation.payload
- **AND** generates default values for all required legacy fields
- **AND** appends to children array
- **AND** increments index for new element

#### Scenario: Translate delete_element operation

- **WHEN** operation type is 'delete_element'
- **THEN** adapter filters children array to remove element with matching elementId
- **AND** returns legacy template with updated children array
- **AND** deleted element data is not preserved (operation is destructive)

#### Scenario: Translate update_element_props operation

- **WHEN** operation type is 'update_element_props'
- **THEN** adapter finds child by elementId
- **AND** merges operation.payload properties into child
- **AND** maps v2 property names to legacy equivalents if needed
- **AND** preserves unmapped legacy-specific properties

### Requirement: Backend API Facade for Format Abstraction

The backend SHALL provide API endpoints that abstract away format differences, always presenting DesignData to frontend.

#### Scenario: GET template with legacy format

- **WHEN** client requests GET /api/v1/templates/:id
- **AND** database contains legacy format template
- **THEN** backend detects format as v1-legacy
- **AND** LegacyToV2Adapter transforms to DesignData
- **AND** response includes: { id, name, designData, version, sourceFormat: 'v1' }
- **AND** frontend receives clean DesignData structure
- **AND** sourceFormat field informs frontend it's working with legacy data

#### Scenario: GET template with v2 format

- **WHEN** client requests GET /api/v1/templates/:id
- **AND** database contains v2-native format template
- **THEN** backend detects format as v2-native
- **AND** no transformation is applied
- **AND** response includes: { id, name, designData, version, sourceFormat: 'v2' }

#### Scenario: POST operations to legacy template

- **WHEN** client sends POST /api/v1/templates/:id/operations with v2 operations
- **AND** template is in legacy format
- **THEN** backend loads legacy template from database
- **AND** OperationTranslator translates each operation to legacy mutation
- **AND** mutations are applied to legacy JSON
- **AND** updated legacy JSON is saved to database
- **AND** response includes version and appliedOps list

#### Scenario: Return template metadata

- **WHEN** API responds with template
- **THEN** response includes `sourceFormat` field ('v1' or 'v2')
- **AND** `sourceFormat` is informational only (frontend behavior unchanged)
- **AND** can be used for telemetry to track migration progress

### Requirement: Round-Trip Data Preservation

The system SHALL guarantee that legacy templates transformed to DesignData and back result in identical JSON (except for modified fields).

#### Scenario: Round-trip preserves all fields

- **WHEN** legacy template is transformed to DesignData
- **AND** DesignData is restored to legacy format
- **AND** no modifications were made
- **THEN** restored JSON equals original JSON exactly
- **AND** all 60+ element fields are preserved
- **AND** all 30+ template fields are preserved
- **AND** object nesting structure is preserved
- **AND** array order is preserved

#### Scenario: Round-trip preserves unknown fields

- **WHEN** legacy template has custom field `customField: 'value'`
- **AND** template is transformed to DesignData
- **AND** restored to legacy
- **THEN** restored template includes `customField: 'value'`
- **AND** custom field value is unchanged
- **AND** custom field position in JSON is preserved

#### Scenario: Round-trip with modifications

- **WHEN** legacy template is transformed to DesignData
- **AND** element position is changed (x: 100 → x: 200)
- **AND** DesignData is restored to legacy
- **THEN** restored legacy has element.x = 200
- **AND** all other element fields are unchanged from original
- **AND** unmodified elements are identical to original

### Requirement: Default Legacy Field Generation

The system SHALL provide complete default values for all legacy fields when creating new elements in GraphicEditor.

#### Scenario: Generate default padding object

- **WHEN** new element is created
- **THEN** padding object is created with 12 fields:
  - paddingRight: true, paddingLeft: true, paddingTop: true, paddingBottom: true
  - horizontal: 0, vertical: 0, bottom: 0, left: 0, right: 0, top: 0
  - isIndependent: false

#### Scenario: Generate default element fields

- **WHEN** new element is created
- **THEN** all legacy fields are initialized with defaults:
  - elementId: '', borderColor: '', text: ''
  - valueList: [], richTextArr: [], textArr: []
  - groupId: null, offsetX: 0, offsetY: 0
  - cropWidth: 1, cropHeight: 1, cropX: 0, cropY: 0
  - visible: true, listening: true
  - strokeWidth: 0, cornerRadius: null
  - ... (all 60+ fields with appropriate defaults)

#### Scenario: Generate default elementAnimation

- **WHEN** new element has animation in DesignData
- **THEN** legacy elementAnimation object is created:
  - id: element.id, elementType: legacy element type
  - animationId: mapped from DesignData animation.type
  - speed: converted from DesignData, delay: converted
  - direction: mapped, scale: mapped, animate: mapped
  - keyframes: [], enterIndex: element's index in array

### Requirement: Performance Optimization for Transformation

The system SHALL optimize adapter transformation to complete within performance budgets.

#### Scenario: Transform template within budget

- **WHEN** template has 100 elements
- **THEN** transformation completes in <50ms
- **AND** memory usage stays under 10MB for transformation

#### Scenario: Transform template with 500 elements

- **WHEN** template has 500 elements
- **THEN** transformation completes in <200ms
- **AND** uses streaming if template size exceeds threshold

#### Scenario: Cache optimization

- **WHEN** template is transformed
- **THEN** original cache stores shallow references where possible
- **AND** deep clone is performed only for modified branches
- **AND** cache is garbage collected when session ends

### Requirement: Error Handling and Validation

The system SHALL validate legacy template structure and provide meaningful errors for malformed data.

#### Scenario: Validate legacy structure

- **WHEN** template claims to be legacy (has children array)
- **AND** children array contains invalid elements
- **THEN** validation fails with specific error
- **AND** error includes element index and field name
- **AND** HTTP 400 is returned with validation details

#### Scenario: Handle missing required fields

- **WHEN** legacy element is missing required field (e.g., id)
- **THEN** adapter generates synthetic value (nanoid for id)
- **AND** logs warning about missing field
- **AND** transformation continues with generated value

#### Scenario: Handle corrupt animation config

- **WHEN** legacy animationConfig is malformed or null
- **THEN** adapter uses default animation config
- **AND** logs warning about using defaults
- **AND** transformation completes successfully

### Requirement: Backward Compatibility Testing

The system SHALL provide comprehensive tests to ensure legacy templates work correctly in GraphicEditor.

#### Scenario: Test suite with real production templates

- **WHEN** test suite runs
- **THEN** 20+ real production legacy templates are loaded
- **AND** each template is transformed to DesignData
- **AND** each DesignData is restored to legacy
- **AND** deep equality check verifies no data loss
- **AND** all tests pass

#### Scenario: Test operation translation

- **WHEN** operation translation tests run
- **THEN** each operation type (move, resize, rotate, add, delete) is tested
- **AND** operation is applied to legacy template
- **AND** result is verified against expected legacy structure
- **AND** all tests pass

#### Scenario: Test unknown field preservation

- **WHEN** template with unknown fields is processed
- **THEN** round-trip test verifies unknown fields preserved
- **AND** field values are unchanged
- **AND** field data types are preserved (string vs number vs object)

### Requirement: Migration Phases and Rollback

The system SHALL support phased migration with rollback capability at each phase.

#### Scenario: Phase 1 - Read-only mode

- **WHEN** Phase 1 is deployed (Week 1-2)
- **THEN** GraphicEditor can load and view legacy templates
- **AND** no write operations are enabled
- **AND** legacy editor continues to work unchanged
- **AND** rollback: remove adapter endpoints, frontend falls back to legacy

#### Scenario: Phase 2 - Write operations

- **WHEN** Phase 2 is deployed (Week 3-4)
- **THEN** GraphicEditor can edit legacy templates
- **AND** operations save changes to legacy format
- **AND** legacy editor sees updated changes
- **AND** rollback: disable POST /operations endpoint, read-only mode

#### Scenario: Phase 3 - Full integration

- **WHEN** Phase 3 is deployed (Week 5-6)
- **THEN** auto-save is enabled with debouncing
- **AND** optimistic UI updates work
- **AND** conflict resolution handles concurrent edits
- **AND** rollback: feature flag disables GraphicEditor writes

#### Scenario: Feature flag control

- **WHEN** feature flag ENABLE_GRAPHIC_EDITOR_WRITES is false
- **THEN** POST /operations returns HTTP 503 Service Unavailable
- **AND** error message instructs to use legacy editor
- **AND** GET /templates still works (read-only)

### Requirement: Telemetry and Monitoring

The system SHALL collect metrics on adapter usage to track migration progress and detect issues.

#### Scenario: Log transformation metrics

- **WHEN** adapter transforms template
- **THEN** logs template ID, source format, transformation time
- **AND** logs element count, template size in bytes
- **AND** logs whether transformation succeeded or failed

#### Scenario: Track migration progress

- **WHEN** templates are accessed
- **THEN** metrics track: % of templates in v1 vs v2
- **AND** tracks: # of legacy templates edited in GraphicEditor
- **AND** tracks: # of templates fully migrated to v2
- **AND** dashboard shows migration funnel over time

#### Scenario: Alert on transformation failures

- **WHEN** transformation fails for a template
- **THEN** error is logged with full template structure
- **AND** alert is sent to engineering team
- **AND** template ID is added to blocklist (temporarily disabled)

### Requirement: Multi-Page Future Support

The system SHALL prepare for future multi-page support in v2 templates while maintaining legacy compatibility.

#### Scenario: Detect need for multi-page

- **WHEN** GraphicEditor creates second page
- **THEN** template is flagged as v2-native
- **AND** optional `_v2Pages` field is added to template
- **AND** legacy `children[]` becomes flattened view of all pages for backward compat
- **AND** legacy editor sees all elements in single children array

#### Scenario: Read multi-page template in legacy editor

- **WHEN** legacy Konva editor loads template with `_v2Pages`
- **THEN** legacy editor ignores `_v2Pages` field
- **AND** renders `children[]` array (flattened view)
- **AND** legacy editor continues to function normally

## MODIFIED Requirements

None (this is a new capability).

## REMOVED Requirements

None (this is additive).

## Implementation Notes

### Adapter Service Location
- **Backend**: `/src/adapters/` directory
- `format-detector.ts` - Version detection
- `legacy-to-v2.ts` - Transform legacy → DesignData
- `v2-to-legacy.ts` - Restore DesignData → legacy
- `operation-translator.ts` - Translate operations to legacy mutations
- `field-defaults.ts` - Default values for all 60+ legacy fields

### Caching Strategy
- Use `WeakMap` for template-level cache (auto garbage collection)
- Use `Map` for element-level cache (keyed by element ID)
- Clear cache on session end or template save success
- Maximum cache size: 50 templates per session

### Testing Requirements
- Unit tests for each adapter function (100% coverage)
- Round-trip tests with 20+ real production templates
- Operation translation tests for all operation types
- Performance tests (transformation time, memory usage)
- Regression tests to prevent data loss

### Performance Targets
- Transform 100-element template: <50ms (p95)
- Transform 500-element template: <200ms (p95)
- Memory overhead: <10MB per active template
- Round-trip preservation: 100% field equality
