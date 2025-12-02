# Graphic Editor Specification

## ADDED Requirements

### Requirement: Multi-Page Timeline Editor

The Graphic Editor SHALL support creating and managing multiple pages in a timeline-based composition. Each page SHALL have a configurable duration and background. Pages SHALL be displayed as thumbnails in a timeline track and SHALL be selectable, duplicatable, deletable, and reorderable.

#### Scenario: Create new page

- **WHEN** user clicks "Add Page" button or presses Cmd/Ctrl+Alt+N
- **THEN** a new page is created with default duration of 3 seconds and white background
- **AND** the new page becomes the active page

#### Scenario: Duplicate page

- **WHEN** user presses Cmd/Ctrl+D while a page is selected
- **THEN** a duplicate of the current page is created with all elements copied
- **AND** each element receives a new unique ID
- **AND** the duplicate page is inserted after the original page

#### Scenario: Delete page

- **WHEN** user clicks delete button on a page thumbnail or presses Delete/Backspace
- **THEN** the page is removed from the timeline
- **AND** if it was the last page, deletion is prevented (minimum 1 page required)
- **AND** if it was the active page, the first remaining page becomes active

#### Scenario: Resize page duration

- **WHEN** user drags the right edge of a page block in the timeline
- **THEN** the page duration updates in real-time
- **AND** minimum duration is 1 second
- **AND** the page block width reflects the new duration

#### Scenario: Select page

- **WHEN** user clicks on a page thumbnail in the timeline
- **THEN** that page becomes the active page
- **AND** the canvas displays the selected page's content
- **AND** the timeline playhead jumps to the start of that page

### Requirement: Canvas Rendering Engine

The Graphic Editor SHALL render pages and elements using HTML5 Canvas API with support for zoom, pan, device pixel ratio scaling, and real-time animation preview.

#### Scenario: Render canvas with proper scaling

- **WHEN** the canvas is displayed
- **THEN** it uses device pixel ratio for crisp rendering on high-DPI displays
- **AND** the canvas fills its container and resizes responsively
- **AND** the canvas maintains a fixed aspect ratio of 16:9 (800x450px)

#### Scenario: Zoom canvas

- **WHEN** user scrolls with Cmd/Ctrl key pressed or uses zoom controls
- **THEN** the canvas content scales proportionally
- **AND** zoom level is displayed in the top bar
- **AND** minimum zoom is 0.1x and maximum is 5x

#### Scenario: Pan canvas

- **WHEN** user holds Space key and drags
- **THEN** the canvas viewport moves
- **AND** pan position is maintained during zoom operations

#### Scenario: Render page background

- **WHEN** a page is displayed
- **THEN** the background color or gradient is rendered
- **AND** linear gradients are supported with color stops
- **AND** a drop shadow is applied to the page canvas

### Requirement: Element Management

The Graphic Editor SHALL support adding, selecting, moving, resizing, rotating, and deleting visual elements on pages. Elements SHALL include shapes (rect, circle, triangle, star, hexagon, heart, diamond), images, and text.

#### Scenario: Add element from sidebar

- **WHEN** user clicks a shape, image, or text element in the sidebar
- **THEN** a new element of that type is added to the active page
- **AND** the element is positioned at the canvas center or drop location
- **AND** default dimensions are applied (100x100 for shapes, 300x50 for text)
- **AND** the element is selected automatically

#### Scenario: Drag and drop element

- **WHEN** user drags an element from the sidebar and drops it on the canvas
- **THEN** the element is created at the drop position
- **AND** for images, the element size matches the image aspect ratio (max 400px width)
- **AND** the element is selected after creation

#### Scenario: Select element

- **WHEN** user clicks on an element on the canvas
- **THEN** that element becomes selected
- **AND** selection handles and rotation handle are displayed
- **AND** the properties panel opens showing element properties
- **AND** only one element can be selected at a time

#### Scenario: Move element

- **WHEN** user drags a selected element
- **THEN** the element position updates in real-time
- **AND** element coordinates are constrained to canvas bounds
- **AND** movement respects element rotation

#### Scenario: Resize element

- **WHEN** user drags a resize handle on a selected element
- **THEN** the element dimensions update in real-time
- **AND** minimum size is 10x10 pixels
- **AND** Shift key maintains aspect ratio
- **AND** Alt key resizes from center
- **AND** resize handles work correctly with rotated elements

#### Scenario: Rotate element

- **WHEN** user drags the rotation handle on a selected element
- **THEN** the element rotates around its center
- **AND** rotation angle updates in real-time
- **AND** Shift key snaps to 45-degree increments
- **AND** rotation is displayed in degrees (0-360)

#### Scenario: Delete element

- **WHEN** user presses Delete or Backspace with an element selected
- **OR** user right-clicks and selects "Delete" from context menu
- **THEN** the element is removed from the page
- **AND** selection is cleared

#### Scenario: Duplicate element

- **WHEN** user right-clicks an element and selects "Duplicate"
- **THEN** a copy of the element is created with offset position (20px right and down)
- **AND** the duplicate receives a new unique ID
- **AND** the duplicate becomes selected

### Requirement: Element Properties Panel

The Graphic Editor SHALL provide a properties panel that displays and allows editing of selected element properties including dimensions, rotation, opacity, fill color, and animation settings.

#### Scenario: Display element properties

- **WHEN** an element is selected
- **THEN** the properties panel opens on the left side
- **AND** it displays element type, ID, width, height, rotation, opacity, and fill color
- **AND** for text elements, it displays text content and font size
- **AND** for images, it displays image source

#### Scenario: Edit element dimensions

- **WHEN** user changes width or height in the properties panel
- **THEN** the element size updates immediately on the canvas
- **AND** values are rounded to integers

#### Scenario: Edit element rotation

- **WHEN** user changes rotation value in the properties panel
- **THEN** the element rotates immediately on the canvas
- **AND** value is rounded to nearest degree

#### Scenario: Edit element opacity

- **WHEN** user adjusts the opacity slider
- **THEN** the element opacity updates in real-time
- **AND** opacity range is 0.0 to 1.0

#### Scenario: Edit element fill color

- **WHEN** user clicks a color swatch or uses the color picker
- **THEN** the element fill color updates immediately
- **AND** color is displayed as hex value
- **AND** preset colors are available for quick selection

### Requirement: Animation System

The Graphic Editor SHALL support element-level and page-level animations with configurable types, speeds, delays, directions, and modes. Animations SHALL play during timeline playback and SHALL support preview on hover.

#### Scenario: Apply element animation

- **WHEN** user selects an animation type for an element in the properties panel
- **THEN** the animation is assigned to that element
- **AND** animation settings include type, speed (0.5x-3x), delay, direction, and mode (enter/exit/both)
- **AND** supported types include: fade, rise, pan, pop, shake, pulse, wiggle, and none

#### Scenario: Preview element animation

- **WHEN** user hovers over an animation option in the properties panel
- **THEN** a preview of that animation plays on the canvas
- **AND** preview stops when mouse leaves the option

#### Scenario: Apply page animation

- **WHEN** user selects a page animation type in the animation tab
- **THEN** the animation is assigned to the active page
- **AND** supported types include: none, fade, slide, zoom, wipe
- **AND** page animations play when the page appears in the timeline

#### Scenario: Play animations during timeline playback

- **WHEN** timeline is playing
- **THEN** element animations play according to their delay and speed settings
- **AND** page animations play when pages transition
- **AND** animations respect their configured modes (enter/exit/both)

### Requirement: Audio Layer Management

The Graphic Editor SHALL support multiple audio layers with clips that can be positioned on a timeline, moved between layers, and synchronized with page playback.

#### Scenario: Add audio layer

- **WHEN** user clicks "Add Audio Track" button
- **THEN** a new audio layer is created
- **AND** the layer appears as a track in the timeline
- **AND** layers are numbered sequentially (Audio 1, Audio 2, etc.)

#### Scenario: Add audio clip from library

- **WHEN** user clicks the plus button on an audio track in the sidebar
- **OR** user drags an audio track from sidebar to timeline
- **THEN** an audio clip is added to the selected layer
- **AND** clip starts at the current timeline playhead position
- **AND** clip uses the track's source, label, and duration

#### Scenario: Add voiceover recording

- **WHEN** user clicks "Record Voice" button
- **THEN** microphone access is requested
- **AND** if granted, recording starts and timeline begins playing
- **AND** recording button shows "Stop Recording" state
- **AND** when stopped, a new audio clip is created with the recorded audio
- **AND** clip is added to the first audio layer at the current playhead position

#### Scenario: Preview audio track

- **WHEN** user clicks the play button on an audio track in the sidebar
- **THEN** the audio preview plays
- **AND** clicking again pauses the preview
- **AND** only one preview can play at a time

#### Scenario: Move audio clip on timeline

- **WHEN** user drags an audio clip horizontally on the timeline
- **THEN** the clip's start time updates in real-time
- **AND** start time cannot be negative
- **AND** clip position is constrained to timeline bounds

#### Scenario: Move audio clip between layers

- **WHEN** user drags an audio clip to a different audio layer
- **THEN** the clip is moved to the target layer
- **AND** start time is calculated from drop position
- **AND** clip is removed from the original layer

#### Scenario: Select audio clip

- **WHEN** user clicks on an audio clip in the timeline
- **THEN** the clip becomes selected
- **AND** visual selection indicator is displayed (violet border and ring)
- **AND** element selection is cleared

#### Scenario: Delete audio clip

- **WHEN** user presses Delete/Backspace with an audio clip selected
- **OR** user right-clicks and selects "Delete Clip"
- **OR** user clicks the delete button on hover
- **THEN** the audio clip is removed from its layer
- **AND** selection is cleared

### Requirement: Timeline Playback

The Graphic Editor SHALL provide timeline scrubbing, playback controls, and automatic page switching during playback. Audio clips SHALL play synchronized with the timeline.

#### Scenario: Play timeline

- **WHEN** user clicks the play button
- **THEN** timeline begins playing from the current playhead position
- **AND** current time advances at real-time rate
- **AND** animations play according to their timing
- **AND** audio clips play when their start time is reached
- **AND** play button changes to pause button

#### Scenario: Pause timeline

- **WHEN** user clicks the pause button
- **THEN** timeline playback stops
- **AND** current time remains at pause position
- **AND** all animations pause
- **AND** all audio clips pause

#### Scenario: Scrub timeline

- **WHEN** user clicks on the timeline ruler
- **OR** user drags the playhead handle
- **THEN** current time updates to the clicked/dragged position
- **AND** canvas updates to show the frame at that time
- **AND** active page switches if playhead moves to a different page
- **AND** audio clips seek to the correct position

#### Scenario: Automatic page switching

- **WHEN** timeline is playing
- **AND** playhead reaches the end of a page
- **THEN** the next page automatically becomes active
- **AND** page transition animation plays if configured

#### Scenario: Loop playback

- **WHEN** timeline reaches the end of all pages and audio
- **THEN** playback stops
- **AND** playhead resets to time 0
- **AND** active page resets to the first page

### Requirement: Timeline Zoom and Navigation

The Graphic Editor SHALL support zooming the timeline view, panning horizontally, and displaying a time ruler with appropriate tick marks.

#### Scenario: Zoom timeline

- **WHEN** user scrolls with Cmd/Ctrl key pressed in the timeline area
- **OR** user clicks zoom in/out buttons
- **THEN** timeline zoom level changes
- **AND** page and audio clip blocks scale proportionally
- **AND** zoom range is 10 to 200 pixels per second
- **AND** zoom level is displayed in the zoom indicator

#### Scenario: Pan timeline

- **WHEN** user drags in empty timeline area
- **THEN** timeline scrolls horizontally
- **AND** cursor changes to grab/grabbing state
- **AND** scroll position is maintained

#### Scenario: Display time ruler

- **WHEN** timeline is displayed
- **THEN** a ruler shows time markers at the top
- **AND** tick intervals adjust based on zoom level (0.5s, 1s, 5s, or 10s)
- **AND** major ticks show time in M:SS format
- **AND** ruler width matches total timeline duration

#### Scenario: Resize timeline height

- **WHEN** user drags the top edge of the timeline
- **THEN** timeline height adjusts
- **AND** minimum height is 150px, maximum is 600px
- **AND** height is maintained across sessions

### Requirement: Context Menu

The Graphic Editor SHALL provide context menus for elements and audio clips with relevant actions.

#### Scenario: Open element context menu

- **WHEN** user right-clicks on an element
- **THEN** a context menu appears at the cursor position
- **AND** menu shows "Duplicate" and "Delete" options
- **AND** menu closes when an option is selected or user clicks elsewhere

#### Scenario: Open audio clip context menu

- **WHEN** user right-clicks on an audio clip
- **THEN** a context menu appears at the cursor position
- **AND** menu shows "Delete Clip" option
- **AND** menu closes when option is selected or user clicks elsewhere

### Requirement: Keyboard Shortcuts

The Graphic Editor SHALL support keyboard shortcuts for common operations.

#### Scenario: Undo shortcut

- **WHEN** user presses Cmd/Ctrl+Z
- **THEN** the last operation is undone

#### Scenario: Redo shortcut

- **WHEN** user presses Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y
- **THEN** the last undone operation is redone

#### Scenario: Add page shortcut

- **WHEN** user presses Cmd/Ctrl+Alt+N
- **THEN** a new page is added

#### Scenario: Duplicate page shortcut

- **WHEN** user presses Cmd/Ctrl+D
- **THEN** the current page is duplicated

#### Scenario: Delete shortcut

- **WHEN** user presses Delete or Backspace
- **AND** an element is selected
- **THEN** the element is deleted
- **AND** if an audio clip is selected, the audio clip is deleted

### Requirement: Sidebar Navigation

The Graphic Editor SHALL provide a sidebar with multiple tabs for accessing design blocks, media, shapes, text, animation, audio, and color tools.

#### Scenario: Switch sidebar tabs

- **WHEN** user clicks a tab icon in the sidebar
- **THEN** the tab content is displayed
- **AND** the active tab is highlighted
- **AND** tab state persists during the session

#### Scenario: Media tab

- **WHEN** user selects the media tab
- **THEN** a grid of image assets is displayed
- **AND** images can be dragged to canvas or clicked to add
- **AND** images are displayed as thumbnails with aspect ratio preserved

#### Scenario: Shapes tab

- **WHEN** user selects the shapes tab
- **THEN** a grid of shape buttons is displayed
- **AND** shapes include: rect, circle, triangle, star, hexagon, heart, diamond
- **AND** shapes can be dragged to canvas or clicked to add

#### Scenario: Text tab

- **WHEN** user selects the text tab
- **THEN** text template buttons are displayed
- **AND** templates include "Add Heading" and "Add Subheading"
- **AND** templates can be dragged to canvas or clicked to add

#### Scenario: Audio tab

- **WHEN** user selects the audio tab
- **THEN** voiceover recording button is displayed
- **AND** audio library with previewable tracks is displayed
- **AND** tracks show label and duration
- **AND** tracks can be previewed with play/pause button

### Requirement: Element Rendering

The Graphic Editor SHALL render all element types correctly with proper transformations, opacity, and visual effects.

#### Scenario: Render rectangle

- **WHEN** a rect element is displayed
- **THEN** it is rendered as a filled rectangle with the specified fill color
- **AND** it respects rotation, scale, and opacity

#### Scenario: Render circle

- **WHEN** a circle element is displayed
- **THEN** it is rendered as a filled ellipse with the specified fill color
- **AND** it respects rotation, scale, and opacity

#### Scenario: Render triangle

- **WHEN** a triangle element is displayed
- **THEN** it is rendered as a filled triangle pointing upward
- **AND** it respects rotation, scale, and opacity

#### Scenario: Render star

- **WHEN** a star element is displayed
- **THEN** it is rendered as a 5-pointed filled star
- **AND** it respects rotation, scale, and opacity

#### Scenario: Render heart

- **WHEN** a heart element is displayed
- **THEN** it is rendered as a filled heart shape using bezier curves
- **AND** it respects rotation, scale, and opacity

#### Scenario: Render diamond

- **WHEN** a diamond element is displayed
- **THEN** it is rendered as a filled diamond (rotated square)
- **AND** it respects rotation, scale, and opacity

#### Scenario: Render image

- **WHEN** an image element is displayed
- **THEN** the image is loaded and rendered at the element's dimensions
- **AND** images are cached for performance
- **AND** a placeholder is shown while loading
- **AND** it respects rotation, scale, and opacity
- **AND** cross-origin images are supported

#### Scenario: Render text

- **WHEN** a text element is displayed
- **THEN** text is rendered with the specified font size and fill color
- **AND** text baseline is set to top
- **AND** it respects rotation, scale, and opacity
- **AND** text content is editable in properties panel

### Requirement: Page Thumbnail Generation

The Graphic Editor SHALL generate thumbnails for pages in the timeline that accurately represent page content.

#### Scenario: Generate page thumbnail

- **WHEN** a page is displayed in the timeline
- **THEN** a thumbnail canvas is rendered showing the page background and all elements
- **AND** thumbnail is scaled to fit the timeline block size
- **AND** thumbnail updates when page content changes
- **AND** images in thumbnails are loaded and cached

### Requirement: Audio Playback Synchronization

The Graphic Editor SHALL synchronize audio clip playback with timeline position, ensuring clips play at the correct time and seek correctly when scrubbing.

#### Scenario: Play audio clip at start time

- **WHEN** timeline reaches an audio clip's start time during playback
- **THEN** the audio clip begins playing
- **AND** audio position is synchronized with timeline position

#### Scenario: Stop audio clip at end time

- **WHEN** timeline reaches an audio clip's end time (startAt + duration)
- **THEN** the audio clip stops playing

#### Scenario: Seek audio on timeline scrub

- **WHEN** user scrubs the timeline
- **THEN** all audio clips seek to the correct position
- **AND** clips that are outside the current time range are paused
- **AND** clips that are within range play from the correct offset

#### Scenario: Handle multiple overlapping audio clips

- **WHEN** multiple audio clips overlap in time
- **THEN** all overlapping clips play simultaneously
- **AND** each clip maintains its own playback state

### Requirement: Undo and Redo System

The Graphic Editor SHALL provide undo and redo functionality to reverse and reapply changes to pages and audio layers. History SHALL be maintained separately from UI state (zoom, pan, selection) and SHALL support keyboard shortcuts and UI buttons.

#### Scenario: Undo operation

- **WHEN** user presses Cmd/Ctrl+Z or clicks the Undo button
- **AND** there is history in the past stack
- **THEN** the previous state is restored (pages and audio layers)
- **AND** the current state is moved to the future stack
- **AND** element selection is cleared
- **AND** the Undo button is disabled if no history remains

#### Scenario: Redo operation

- **WHEN** user presses Cmd/Ctrl+Shift+Z, Cmd/Ctrl+Y, or clicks the Redo button
- **AND** there is history in the future stack
- **THEN** the next state is restored (pages and audio layers)
- **AND** the current state is moved to the past stack
- **AND** element selection is cleared
- **AND** the Redo button is disabled if no future history remains

#### Scenario: Capture history checkpoint

- **WHEN** user starts a continuous operation (e.g., resize, rotate, drag)
- **THEN** a history checkpoint is captured before the operation begins
- **AND** the checkpoint includes the current pages and audio layers state
- **AND** future history is cleared when a new checkpoint is created

#### Scenario: History on discrete operations

- **WHEN** user performs discrete operations (add page, delete element, add audio clip, etc.)
- **THEN** history is automatically captured before the operation
- **AND** the operation is added to the past stack
- **AND** future history is cleared

#### Scenario: History excludes UI state

- **WHEN** undo or redo is performed
- **THEN** only pages and audio layers are restored
- **AND** UI state (zoom, pan, active tab, current time, selection) is preserved or reset appropriately
- **AND** selection is cleared to avoid invalid references

#### Scenario: History button states

- **WHEN** there is no history in the past stack
- **THEN** the Undo button is disabled
- **WHEN** there is no history in the future stack
- **THEN** the Redo button is disabled

### Requirement: Audio Clip Trimming

The Graphic Editor SHALL support trimming audio clips by adjusting their start and end points. Clips SHALL display resize handles on their left and right edges that allow users to trim the beginning or end of the clip.

#### Scenario: Trim audio clip start

- **WHEN** user drags the left edge of an audio clip
- **THEN** the clip's start time increases (trimming from beginning)
- **AND** the clip's duration decreases accordingly
- **AND** the clip's position on the timeline shifts right
- **AND** minimum clip duration is enforced (e.g., 0.1 seconds)
- **AND** visual feedback shows the trim operation in real-time

#### Scenario: Trim audio clip end

- **WHEN** user drags the right edge of an audio clip
- **THEN** the clip's duration decreases (trimming from end)
- **AND** the clip's start time remains unchanged
- **AND** minimum clip duration is enforced
- **AND** visual feedback shows the trim operation in real-time

#### Scenario: Trim with history checkpoint

- **WHEN** user starts trimming an audio clip
- **THEN** a history checkpoint is captured before trimming begins
- **AND** the trim operation can be undone
- **AND** continuous trimming updates do not create multiple history entries

#### Scenario: Trim handle visibility

- **WHEN** an audio clip is selected or hovered
- **THEN** resize handles appear on the left and right edges
- **AND** handles are visually distinct (e.g., different color or cursor)
- **AND** cursor changes to indicate resize capability (ew-resize)

#### Scenario: Trim prevents invalid states

- **WHEN** user trims a clip
- **THEN** the clip duration cannot become negative
- **AND** the clip start time cannot become negative
- **AND** trimmed clips maintain valid audio playback ranges

### Requirement: Video Export

The Graphic Editor SHALL support exporting the composition as a video file with synchronized audio. The export SHALL render all pages with their animations and combine them with audio layers into a single video file.

#### Scenario: Export video

- **WHEN** user clicks the "Video" export button
- **THEN** export process begins and button shows progress indicator
- **AND** all pages are rendered frame-by-frame with their animations
- **AND** all audio clips are loaded and scheduled according to their timeline positions
- **AND** audio clips respect their trim offsets and durations
- **AND** video and audio are combined into a single media stream
- **AND** progress is displayed as a percentage (0-100%)
- **AND** when complete, a video file is automatically downloaded
- **AND** file format is MP4 (if supported) or WebM (fallback)
- **AND** export button is disabled during export process

#### Scenario: Export progress tracking

- **WHEN** video export is in progress
- **THEN** progress percentage is displayed in the export button
- **AND** progress updates in real-time as frames are rendered
- **AND** export button shows loading spinner during export

#### Scenario: Export includes all content

- **WHEN** video is exported
- **THEN** all pages are included in chronological order
- **AND** page durations determine timing
- **AND** page animations are rendered correctly
- **AND** element animations play according to their settings
- **AND** all audio layers are mixed together
- **AND** audio clips play at their configured start times
- **AND** trimmed audio clips play only their trimmed portions

#### Scenario: Export handles audio trimming

- **WHEN** video is exported with trimmed audio clips
- **THEN** audio clips start at their offset position within the source file
- **AND** audio clips play for their trimmed duration
- **AND** audio timing matches the timeline playback

### Requirement: JSON Project Export

The Graphic Editor SHALL support exporting the project as a JSON file in a Konva-compatible format for backend processing or project saving.

#### Scenario: Export project to JSON

- **WHEN** user clicks the "JSON" export button
- **THEN** project data is serialized to JSON format
- **AND** JSON structure follows Konva scene graph format (Stage -> Layer -> Shape)
- **AND** all pages are included with their elements
- **AND** all audio layers are included
- **AND** element properties (position, size, rotation, opacity, fill, etc.) are preserved
- **AND** animation settings are preserved
- **AND** a JSON file is automatically downloaded with filename "project-export.json"

#### Scenario: JSON format compatibility

- **WHEN** project is exported to JSON
- **THEN** structure matches Konva scene graph hierarchy
- **AND** pages are represented as Layers
- **AND** elements are represented as Shapes with appropriate className
- **AND** custom properties (duration, background) are preserved
- **AND** audio layers are included as separate data structure
- **AND** JSON is properly formatted with indentation for readability
