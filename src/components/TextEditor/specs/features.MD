# Rich Text Editor Features Documentation

This document provides a comprehensive list of all features available in the Rich Text Editor based on the current codebase.

## Table of Contents
1. [Text Formatting](#text-formatting)
2. [Font Management](#font-management)
3. [Text Alignment](#text-alignment)
4. [Text Spacing](#text-spacing)
5. [Text Transformation](#text-transformation)
6. [Lists](#lists)
7. [Text Decoration](#text-decoration)
8. [Colors & Backgrounds](#colors--backgrounds)
9. [Text Effects](#text-effects)
10. [Text Selection & Editing](#text-selection--editing)
11. [Keyboard Shortcuts](#keyboard-shortcuts)
12. [Advanced Features](#advanced-features)
13. [Integration Features](#integration-features)
14. [Layout & Positioning](#layout--positioning)
15. [Auto-Fit Features](#auto-fit-features)

---

## Text Formatting

### Font Style
- **Bold**
  - Toggle bold formatting on selected text
  - Available via toolbar button
  - Keyboard shortcut support (Ctrl/Cmd + B)

- **Italic**
  - Toggle italic formatting on selected text
  - Available via toolbar button
  - Keyboard shortcut support (Ctrl/Cmd + I)

### Text Decoration
- **Underline**
  - Toggle underline on selected text
  - Available via toolbar button

- **Strikethrough**
  - Toggle strikethrough on selected text
  - Available via toolbar button

---

## Font Management

### Font Family
- **Custom Font Selection**
  - Support for brand fonts (custom uploaded fonts)
  - Support for web-safe fonts
  - Font categories: "brand" and "websafe"
  - Font loading and verification system
  - Fonts can be loaded asynchronously

- **Font ID & S3 Path**
  - Support for custom fonts stored in S3
  - Font ID tracking for brand fonts
  - S3 file path support for font files

### Font Size
- **Font Size Control**
  - Editable font size input
  - Dropdown with predefined sizes
  - Math expression evaluator support (e.g., "12*2")
  - Configurable minimum and maximum range
  - Real-time font size updates

- **Font Size per Character**
  - Individual character font size support
  - Rich text allows different font sizes within same text block
  - Each text segment can have its own font size

---

## Text Alignment

### Horizontal Alignment
- **Left Align**
  - Align text to the left edge of container

- **Center Align**
  - Center align text horizontally

- **Right Align**
  - Align text to the right edge of container

- **Justify Align**
  - Justify text alignment (spread text evenly across width)

### Vertical Alignment
- **Top Align**
  - Align text to top of container

- **Middle Align**
  - Vertically center text in container

- **Bottom Align**
  - Align text to bottom of container

---

## Text Spacing

### Letter Spacing
- **Letter Spacing Control**
  - Adjustable letter spacing (tracking)
  - Configurable minimum and maximum range
  - Percentage-based input with slider control
  - Spacing is calculated relative to font size

### Line Height
- **Line Height Control**
  - Adjustable line height (leading)
  - Configurable minimum and maximum range
  - Special minimum range for CTA elements
  - Percentage-based input with slider control

### Paragraph Spacing
- **Paragraph Spacing Control**
  - Adjustable spacing between paragraphs
  - Configurable minimum and maximum range
  - Pixel-based input with slider control
  - Not available for CTA and Link elements

---

## Text Transformation

### Text Case Options
- **As Typed**
  - Preserve original text case as typed by user

- **Sentence Case**
  - Convert text to sentence case (first letter of each sentence capitalized)

- **Uppercase**
  - Convert all text to uppercase letters

- **Lowercase**
  - Convert all text to lowercase letters

- **Title Case**
  - Convert text to title case (first letter of each word capitalized)

---

## Lists

### List Types
- **No List**
  - Remove list formatting from text

- **Bulleted List**
  - Create bulleted list with bullet points
  - Supports nested levels

- **Numbered List**
  - Create numbered list with sequential numbers
  - Supports nested levels

### List Features
- **List Levels**
  - Support for nested lists (indentation)
  - Increase/decrease list level
  - Tab key to increase indentation level
  - Multiple levels of nesting supported

- **List Type Width Calculation**
  - Dynamic bullet/number width calculation
  - Automatically adjusts based on font size
  - Supports different font sizes per list level

---

## Text Decoration

### Decoration Types
- **Underline**
  - Single underline decoration
  - Toggle on/off

- **Strikethrough**
  - Line through text decoration
  - Toggle on/off

- **Decoration Conversion**
  - Convert between decoration types
  - Supports multiple decorations simultaneously

---

## Colors & Backgrounds

### Text Color (Fill)
- **Text Fill Color**
  - Customizable text color
  - Color picker integration
  - Support for hex colors
  - Each text segment can have different colors

### Background Color
- **Text Background Color**
  - Background color for text
  - Separate from element background
  - Color picker integration

### Stroke Background
- **Stroke Background**
  - Border/stroke around text background
  - Adjustable stroke width
  - Stroke color customization
  - Independent from text fill color

### Corner Radius
- **Corner Radius**
  - Rounded corners for text background
  - Individual corner control:
    - Top-left corner
    - Top-right corner
    - Bottom-right corner
    - Bottom-left corner
  - Maximum radius calculated based on element dimensions
  - Configurable minimum and maximum range

---

## Text Effects

### Shadow Effects
- **Text Shadow**
  - Shadow color customization
  - Enable/disable shadow
  - Shadow blur amount
  - Shadow offset X and Y
  - Shadow opacity control

---

## Text Selection & Editing

### Selection Methods
- **Character Selection**
  - Select individual characters
  - Click and drag to select

- **Word Selection**
  - Double-click to select entire word
  - Automatic word boundary detection

- **Line Selection**
  - Triple-click to select entire line
  - Automatic line boundary detection

- **Select All**
  - Select entire text block
  - Keyboard shortcut: Ctrl/Cmd + A

### Selection Features
- **Visual Selection**
  - Visual selection rectangles displayed
  - Selection highlighting
  - Real-time selection feedback

- **Cursor Management**
  - Blinking cursor display
  - Cursor position tracking
  - Cursor style adapts to text formatting

- **Selection Text Retrieval**
  - Get selected text content
  - Get detailed selection information
  - Copy selected text to clipboard

---

## Keyboard Shortcuts

### Text Editing
- **Enter Key**
  - Insert line break
  - Shift + Enter: Insert soft line break (no paragraph break)

- **Delete/Backspace**
  - Delete forward: Delete key removes character after cursor
  - Delete backward: Backspace key removes character before cursor

- **Tab Key**
  - Increase list indentation level
  - Works with bulleted and numbered lists

### Arrow Keys
- **Arrow Key Navigation**
  - Left/Right: Move cursor character by character
  - Up/Down: Move cursor line by line
  - Shift + Arrow: Extend selection in arrow direction

### Copy & Paste
- **Copy (Ctrl/Cmd + C)**
  - Copy selected text to clipboard
  - Preserves formatting when pasting within editor

- **Cut (Ctrl/Cmd + X)**
  - Cut selected text to clipboard
  - Removes text from editor

- **Paste**
  - Paste from clipboard
  - Supports rich text format paste (JSON object)
  - Supports plain text paste
  - Automatically converts pasted content

### Undo/Redo
- **Undo (Ctrl/Cmd + Z)**
  - Undo last action
  - Maintains undo history stack

- **Redo (Ctrl/Cmd + Shift + Z)**
  - Redo last undone action
  - Maintains redo history stack

---

## Advanced Features

### Smart Quotes
- **Smart Quote Conversion**
  - Automatic smart quote conversion
  - Detects open and close quotes
  - Converts straight quotes to curly quotes

### Text Input Handling
- **Text Input**
  - Real-time text input
  - Character-by-character processing
  - Supports all Unicode characters

- **Replace Selection**
  - Replace selected text with new text
  - Preserves formatting of surrounding text
  - Maintains text structure

- **Add New Line**
  - Insert line breaks
  - Support for hard breaks (paragraph break)
  - Support for soft breaks (line break within paragraph)

### Text Area Integration
- **Hidden Text Area**
  - Invisible textarea for input handling
  - Mobile keyboard support
  - Enables native input methods

- **Composition Events**
  - IME (Input Method Editor) support
  - Handles composition start, update, and end events
  - Supports languages requiring IME (Chinese, Japanese, Korean, etc.)

### Emoji
- Support all type of emoji by input or select from popup
- Using Intl.Segmenter for detect and split grapheme

---

## Integration Features

### Merge Tags
- **Merge Tag Support**
  - Insert merge tags (e.g., {{name}}, {{email}})
  - Merge tag detection and validation
  - Merge tag width calculation for email builder
  - Special handling in email builder mode
  - Preserves merge tag structure during editing

### Hyperlinks
- **Hyperlink Support**
  - Add/edit hyperlinks to text
  - Link URL management
  - Clickable links in rendered text
  - Link validation

### WordSmith Integration
- **WordSmith AI**
  - AI-powered text generation and editing
  - Credit-based feature
  - Requires permission access
  - Integrated into text editing workflow

### Replace Text
- **Find & Replace**
  - Find and replace text functionality
  - Modal interface for search and replace
  - Batch replacement support

---

## Layout & Positioning

### Container Dimensions
- **Width & Height**
  - Adjustable text container dimensions
  - Auto-adjustment based on content
  - Manual size override available

### Padding
- **Text Padding**
  - Left padding control
  - Right padding control
  - Top padding control
  - Bottom padding control
  - Independent padding control option

### Positioning
- **X & Y Coordinates**
  - Text element positioning on canvas
  - Container position tracking
  - Precise coordinate control

### Rotation
- **Text Rotation**
  - Rotate text element
  - Rotation angle in degrees
  - Affects text rendering and selection behavior

---

## Auto-Fit Features

### Auto-Fit Text
- **Auto-Fit Enabled**
  - Automatically adjust font size to fit container
  - Respects width and height constraints
  - Maintains text readability
  - Performance optimized with caching

- **Auto-Fit Text Content**
  - Automatically adjust container width to fit text
  - Disabled when text is rotated
  - Disabled when text is in groups
  - Maintains text alignment

- **Auto-Fit Background**
  - Background adjusts to text content automatically
  - Dynamic background sizing

### Auto-Fit Validation
- **Valid Auto-Fit Check**
  - Validates if auto-fit can be applied
  - Checks for rich text content (may disable auto-fit)
  - Ensures compatibility with text formatting

---

## Element Types

### Text Element Types
- **Standard Text**
  - Basic text element
  - Full feature support
  - All formatting options available

- **CTA Text**
  - Call-to-action text element
  - Limited features (no paragraph spacing, no hanging punctuation)
  - Special line height range
  - Optimized for button text

- **Link Text**
  - Link text element
  - Limited features (no paragraph spacing, no hanging punctuation)
  - Optimized for hyperlink text

- **Multi Text**
  - Multi-line text element
  - Email builder specific
  - Special font handling
  - Supports multiple text blocks

---

## Special Features

### Hanging Punctuation
- **Hanging Punctuation Toggle**
  - Enable/disable hanging punctuation
  - Not available for CTA and Link elements
  - Improves typography for certain fonts

### Text Wrapping
- **Word Wrapping**
  - Automatic word wrapping
  - Wraps at word boundaries
  - Prevents text overflow

### Ellipsis
- **Text Ellipsis**
  - Truncate text with ellipsis (...)
  - Configurable truncation
  - Currently disabled when auto-fit is enabled

### Font Loading
- **Font Loading Management**
  - Async font loading
  - Font status tracking
  - Assets manager integration
  - Font verification system
  - Loading indicators during font load

---

## Performance Optimizations

### Text Fit Cache
- **Caching System**
  - Cache text fit calculations
  - Performance optimization
  - Enable/disable cache control
  - Cache clearing functionality

### Debouncing
- **Debounced Updates**
  - Debounced font size changes
  - Debounced text height updates
  - Typing timeout management
  - Reduces unnecessary calculations

### Throttling
- **Throttled Updates**
  - Throttled text height updates
  - Prevents excessive updates during editing

---

## Group Support

### Text in Groups
- **Group Element Support**
  - Text elements can be part of groups
  - Group ID tracking
  - Smart grouping adjustments
  - Group-aware text sizing

### Group Constraints
- **Group Limitations**
  - Auto-fit text content disabled in groups
  - Rotation constraints in groups
  - Group-specific behavior

---

## Animation Support

### Animation Integration
- **Animation**
  - Text element animation support: element/line/word/character (4 types of animation)
  - Animation attributes tracking
  - Animation state management
  - Play/pause control

### Keyframe Support
- **Keyframe Animation**
  - Keyframe props support
  - Keyframe point index tracking
  - Animation timeline control

---

## Notes

- All features are subject to permission checks
- Some features are disabled for specific element types (CTA, Link)
- Email builder has additional constraints and features
- Text selection uses a custom implementation for precise control
- Font loading is asynchronous and may cause temporary display issues
- Auto-fit features may conflict with manual sizing
- Group elements have limitations on certain features

---

*Last Updated: Based on current codebase analysis*
*Documentation Version: 1.0*
