# Graphic Editor Specification Delta

## ADDED Requirements

### Requirement: Performant Element Dragging with Transient State

The Graphic Editor SHALL use a transient state system to achieve lag-free dragging of elements. During drag operations, intermediate positions SHALL be stored in React refs and committed to application state only on mouseup, avoiding excessive state updates and re-renders.

#### Scenario: Drag single element smoothly

- **WHEN** user drags an element by 200 pixels
- **THEN** the element moves smoothly at 60fps
- **AND** no Redux actions are dispatched during the drag (only on mouseup)
- **AND** the element position updates reflect the final drop position after mouseup

#### Scenario: Drag multiple elements simultaneously

- **WHEN** user multi-selects 50 elements and drags them
- **THEN** all elements move smoothly without visible lag
- **AND** frame rate maintains 60fps throughout the drag
- **AND** a single BATCH_UPDATE_ELEMENTS action is dispatched on mouseup

#### Scenario: Transient state cleared on selection change

- **WHEN** user is dragging an element and clicks elsewhere
- **THEN** transient state is cleared immediately
- **AND** the element returns to its pre-drag position (since drag was interrupted)

#### Scenario: Transient state cleared on page switch

- **WHEN** user is dragging an element and switches to another page
- **THEN** transient state is cleared immediately
- **AND** the original page's elements are unaffected

### Requirement: Batch Element Updates

The Graphic Editor SHALL support updating multiple elements with different attribute values in a single Redux action for performance optimization.

#### Scenario: Batch update different positions

- **WHEN** application dispatches BATCH_UPDATE_ELEMENTS with updates for 10 elements, each with different x/y positions
- **THEN** all 10 elements are updated in a single reducer run
- **AND** only one re-render occurs
- **AND** all position changes are reflected immediately

#### Scenario: Batch update mixed attributes

- **WHEN** application dispatches BATCH_UPDATE_ELEMENTS with updates for 5 elements with different properties (position, size, rotation)
- **THEN** all elements receive their respective updates
- **AND** no other elements are affected

### Requirement: Eight-Handle Element Resizing

The Graphic Editor SHALL provide 8 resize handles on selected elements: 4 corner handles (nw, ne, se, sw) and 4 edge handles (n, e, s, w). Corner handles SHALL maintain aspect ratio, while edge handles SHALL resize only width or height independently.

#### Scenario: Resize from corner handle

- **WHEN** user drags the southeast corner handle of a 100x100 rectangle
- **THEN** both width and height change proportionally
- **AND** aspect ratio is maintained (if width increases by 2x, height increases by 2x)
- **AND** the opposite corner (nw) remains fixed

#### Scenario: Resize from edge handle (north)

- **WHEN** user drags the north edge handle of a 100x100 rectangle
- **THEN** only the height changes
- **AND** width remains 100
- **AND** the element moves upward as height increases

#### Scenario: Resize from edge handle (east)

- **WHEN** user drags the east edge handle of a 100x100 rectangle
- **THEN** only the width changes
- **AND** height remains 100
- **AND** the left edge remains fixed

#### Scenario: Visual distinction between handle types

- **WHEN** an element is selected
- **THEN** corner handles are rendered as circles
- **AND** edge handles are rendered as pill shapes (rounded rectangles)
- **AND** all handles are white with purple border

#### Scenario: Resize handles on rotated element

- **WHEN** user selects an element rotated 45 degrees
- **THEN** all 8 resize handles are positioned correctly relative to the rotated bounding box
- **AND** dragging handles works correctly despite rotation
- **AND** corner aspect lock still applies

### Requirement: Element-to-Element Snapping

The Graphic Editor SHALL provide alignment snapping between elements during drag operations. Elements SHALL snap to the edges, centers, and midpoints of other non-selected elements when within the snap threshold.

#### Scenario: Snap to element edge (left)

- **WHEN** user drags a rectangle near another rectangle's left edge
- **AND** the dragged rectangle's left edge is within 10 pixels of the target's left edge
- **THEN** the dragged rectangle snaps to align its left edge with the target's left edge
- **AND** a pink guide line is displayed at the snap position

#### Scenario: Snap to element center (horizontal)

- **WHEN** user drags a rectangle near another rectangle's horizontal center
- **AND** the dragged rectangle's center is within 10 pixels of the target's center
- **THEN** the dragged rectangle snaps to align its center with the target's center horizontally
- **AND** a pink guide line is displayed at the snap position

#### Scenario: Snap to multiple elements

- **WHEN** user drags a rectangle that aligns with Element A horizontally and Element B vertically
- **THEN** the rectangle snaps to both alignments simultaneously
- **AND** both horizontal and vertical guide lines are displayed

#### Scenario: Snap to canvas center

- **WHEN** user drags an element near the canvas horizontal or vertical center
- **AND** the element's center is within 10 pixels of the canvas center
- **THEN** the element snaps to the canvas center
- **AND** a pink guide line is displayed

#### Scenario: Snap guides disappear after drag

- **WHEN** user completes a drag operation
- **THEN** all snap guide lines disappear immediately

### Requirement: Image Aspect Ratio Preservation

The Graphic Editor SHALL automatically calculate and preserve the original aspect ratio of images when they are added to the canvas via click, drag-and-drop, or other methods.

#### Scenario: Add landscape image preserving aspect

- **WHEN** user clicks on a 1200x800 image in the sidebar
- **THEN** the image is added to the canvas scaled to 400x267 (max 400px width, aspect 1.5:1 preserved)
- **AND** the image is centered on the canvas
- **AND** contentWidth is 400, contentHeight is 267

#### Scenario: Add portrait image preserving aspect

- **WHEN** user clicks on an 800x1200 image in the sidebar
- **THEN** the image is added scaled to 267x400 (aspect 2:3 preserved, max width 400px)
- **AND** contentWidth is 267, contentHeight is 400

#### Scenario: Add square image

- **WHEN** user clicks on a 1000x1000 square image
- **THEN** the image is added as 400x400
- **AND** aspect ratio 1:1 is preserved

#### Scenario: Drop image at specific location

- **WHEN** user drags a 600x400 image from sidebar and drops it at canvas position (500, 300)
- **THEN** the image is added scaled to 400x267
- **AND** the image is centered at the drop point (image center at 500, 300)
- **AND** x position is 300 (500 - 400/2), y position is 166.5 (300 - 267/2)

### Requirement: Corner Resize Aspect Lock

The Graphic Editor SHALL automatically maintain element aspect ratio when resizing from corner handles to prevent accidental distortion.

#### Scenario: Resize square from corner maintains square

- **WHEN** user resizes a 100x100 square from the southeast corner
- **AND** mouse moves 50 pixels right and 30 pixels down
- **THEN** the square resizes to 150x150 (aspect 1:1 maintained)
- **AND** the dominant axis (50 > 30) determines the final size

#### Scenario: Resize rectangle from corner maintains ratio

- **WHEN** user resizes a 200x100 rectangle (aspect 2:1) from the northeast corner
- **AND** mouse moves 40 pixels right and 50 pixels up
- **THEN** the rectangle resizes proportionally to maintain 2:1 aspect
- **AND** if height changes by factor X, width changes by factor X

#### Scenario: Multi-select resize maintains relative positions

- **WHEN** user multi-selects 3 elements forming a triangle layout
- **AND** resizes the group from a corner handle
- **THEN** all elements scale proportionally
- **AND** relative positions and spacing are maintained

### Requirement: Image Content Dimensions

The Graphic Editor SHALL support separate content dimensions for image elements, allowing image content to exceed visible frame boundaries for zoom/pan effects.

#### Scenario: Add image with initial content dimensions

- **WHEN** an image element is created with width 400, height 300
- **THEN** contentWidth is initialized to 400
- **AND** contentHeight is initialized to 300
- **AND** image content fills the frame exactly

#### Scenario: Resize image from edge increases content

- **WHEN** user resizes an image from an edge handle (north or east)
- **AND** the new dimensions exceed current content dimensions
- **THEN** contentWidth and contentHeight scale up to maintain content aspect ratio
- **AND** content always covers the visible frame (no gaps)

#### Scenario: Resize image from corner scales content proportionally

- **WHEN** user resizes an image from a corner handle
- **THEN** contentWidth and contentHeight scale proportionally with frame dimensions
- **AND** content aspect ratio is maintained

#### Scenario: Render image with content overflow

- **WHEN** an image element has contentWidth 600, contentHeight 400, but frame width 300, height 200
- **THEN** the image is rendered clipped to the 300x200 frame
- **AND** only the top-left portion of the 600x400 content is visible (zoom-in effect)

### Requirement: Developer Debug Mode

The Graphic Editor SHALL provide a toggleable debug mode that displays real-time metrics and state information for developers and troubleshooting.

#### Scenario: Toggle debug mode on

- **WHEN** user clicks the debug icon (bug) in the header
- **THEN** a debug panel appears in the top-right corner
- **AND** the panel displays element count, selected count, zoom %, and pan x/y
- **AND** the panel is styled as a floating overlay with black/80 background

#### Scenario: Debug panel shows selected element details

- **WHEN** debug mode is enabled
- **AND** user selects a single element
- **THEN** the debug panel shows the element's ID (first 6 chars), x, y, width, height
- **AND** values update in real-time as the element is manipulated

#### Scenario: Debug panel updates on state changes

- **WHEN** debug mode is enabled
- **AND** user adds/removes elements, changes zoom, or pans canvas
- **THEN** all metrics in the debug panel update immediately
- **AND** the panel remains in the top-right position

#### Scenario: Debug panel non-interactive

- **WHEN** debug mode is enabled
- **THEN** the debug panel has pointer-events-none
- **AND** clicks pass through the panel to canvas elements below

#### Scenario: Toggle debug mode off

- **WHEN** user clicks the debug icon again while debug mode is enabled
- **THEN** the debug panel disappears immediately

### Requirement: Interactive Zoom Input

The Graphic Editor SHALL allow users to type exact zoom values into the zoom display in the header for precise zoom control.

#### Scenario: Type exact zoom value

- **WHEN** user clicks the zoom display (e.g., "100%")
- **THEN** the zoom input becomes focused and editable
- **AND** all text is selected for easy replacement

#### Scenario: Apply zoom value with Enter key

- **WHEN** user types "250" into the zoom input
- **AND** presses Enter
- **THEN** zoom is set to 250%
- **AND** canvas scales accordingly
- **AND** input loses focus

#### Scenario: Clamp zoom value to valid range

- **WHEN** user types "999" and presses Enter
- **THEN** zoom is clamped to maximum 500%
- **AND** input displays "500"

#### Scenario: Invalid zoom value reverts

- **WHEN** user types "abc" and presses Enter
- **OR** user types nothing and presses Enter
- **THEN** input reverts to current zoom value
- **AND** zoom is unchanged

#### Scenario: Cancel zoom edit on blur

- **WHEN** user clicks the zoom input and types "123"
- **AND** clicks elsewhere without pressing Enter
- **THEN** input reverts to current zoom value
- **AND** typed value is discarded

## MODIFIED Requirements

### Requirement: Element Management

The Graphic Editor SHALL support adding, selecting, moving, resizing, rotating, and deleting visual elements on pages. Elements SHALL include shapes (rect, circle, triangle, star, hexagon, heart, diamond), images, and text. Elements SHALL have optional contentWidth and contentHeight properties for advanced image manipulation.

#### Scenario: Add element from sidebar

- **WHEN** user clicks a shape, image, or text element in the sidebar
- **THEN** a new element of that type is added to the active page
- **AND** the element is positioned at the canvas center or drop location
- **AND** default dimensions are applied (100x100 for shapes, 300x50 for text)
- **AND** for images, dimensions preserve original aspect ratio
- **AND** for images, contentWidth and contentHeight match width and height initially
- **AND** the element is selected automatically

#### Scenario: Resize element

- **WHEN** user drags a resize handle on a selected element
- **THEN** the element dimensions update in real-time
- **AND** minimum size is 10x10 pixels
- **AND** corner handles maintain aspect ratio
- **AND** edge handles resize single axis only
- **AND** resize handles work correctly with rotated elements
- **AND** for images, contentWidth/Height may exceed width/height for zoom effect

### Requirement: Canvas Rendering Engine

The Graphic Editor SHALL render pages and elements using HTML5 Canvas API with support for zoom, pan, device pixel ratio scaling, real-time animation preview, and optional debug overlay.

#### Scenario: Render canvas with debug overlay

- **WHEN** debug mode is enabled
- **AND** the canvas is displayed
- **THEN** the canvas renders normally with all elements
- **AND** a debug panel overlay is displayed in the top-right corner
- **AND** snap guide lines are rendered in pink when dragging
- **AND** resize handles are rendered with visual distinction (circles vs pills)

## REMOVED Requirements

None. All changes are additive.

## RENAMED Requirements

None.
