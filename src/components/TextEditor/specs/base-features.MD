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

## History control

Manage Text styles and content events change
- Text content: Catch change at word level(typing input/delete), break line
- Text styles: Catch all change styles

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

### Language support Integration
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

## Special Features

### Hanging Punctuation
- **Hanging Punctuation Toggle**
  - Enable/disable hanging punctuation
  - Not available for CTA and Link elements
  - Improves typography for certain fonts

### Text Boundary auto-adjust
- **Word Wrapping**
  - Enable: Text boundary always cover fit on Text Content
  - Only apply for Text have no hard return/soft return
  - Only apply for Text single style

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
- Text selection uses a custom implementation for precise control
- Auto-fit features may conflict with manual sizing
- Group elements have limitations on certain features

---

*Last Updated: Based on current codebase analysis*
*Documentation Version: 1.0*
