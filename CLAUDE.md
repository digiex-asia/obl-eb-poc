# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-editor canvas/email builder application using React, TypeScript, and Vite. The project explores different rendering approaches (Canvas, Konva, Gemini, Skia, and a custom Graphic Editor) for building interactive WYSIWYG editors. The application allows users to create layouts with rows and columns, add various elements, and manipulate them on a canvas.

## Development Setup

### Building and Running

- **Development server**: `bun run dev` - Starts Vite dev server on http://localhost:5173
- **Build for production**: `bun run build` - Compiles TypeScript and bundles with Vite
- **Linting**: `bun run lint` - Runs ESLint on all TypeScript/TSX files with strict settings
- **Code formatting**: `bun run format` - Formats code with Prettier
- **Format check**: `bun run format:check` - Validates code formatting without changes
- **Preview production build**: `bun run preview` - Serves the built files locally

### Key Tools and Configuration

- **TypeScript**: Strict mode enabled with `noUnusedLocals` and `noUnusedParameters`
- **Package Manager**: Uses Bun
- **UI Components**: Lucide React icons, Tailwind CSS for styling
- **Linting**: ESLint with strict settings (max-warnings: 0)
- **Formatting**: Prettier (see .prettierrc and .prettierignore)
- **Module System**: ES modules (`"type": "module"` in package.json)

## Architecture

### State Management: MobX

The application uses **MobX** for reactive state management via the `EditorStore` class (`src/common/stores/EditorStore.ts`):

- **EditorStore**: Single observable store managing editor state using `makeAutoObservable()`
- **Core state**:
  - `rows`: Array of EditorRow objects representing the page layout
  - `selectedRowId`, `selectedElementId`: Track current selections
  - `hoveredElementId`, `hoveredRowId`: Track hover state
  - `dragTarget`, `reorderTargetIndex`: Track drag/reorder operations
  - `zoom`: Canvas zoom level
- **Performance optimization**: Uses internal Maps (`_elementsByRowId`, `_elementsByColumnIndex`, `_elementsByRowAndColumn`) for O(1) element lookups instead of O(n) filtering
- **Data shapes**: See `src/common/stores/types.ts` for `EditorElement`, `EditorRow`, and `EditorState` interfaces

### Component Structure

The application is organized as a multi-editor exploration with React Router:

- **App.tsx**: Main router setup with navigation to different editor implementations
- **Editors**:
  - `CanvasEditor/`: Uses HTML Canvas API
  - `KonvaEditor/`: Uses Konva.js library (2D drawing library)
  - `GeminiEditor/`: Custom implementation
  - `SkiaEditor/`: Skia-based rendering
  - `GraphicEditor/`: Another rendering approach
- **Shared Components** (`src/components/shared/`):
  - `TopBar.tsx`: Header controls
  - `Sidebar.tsx`: Properties and tools panel
  - `ZoomControls.tsx`: Zoom UI
  - `ColorPicker.tsx`: Color selection
- **KonvaEditor Debug Tools** (`src/components/KonvaEditor/debug/`):
  - `DebugPanel.tsx`: Main debug interface
  - `EventLoggerTab.tsx`: Event logging
  - `StoreViewerTab.tsx`: Store state inspection
  - `GridOverlay.tsx`, `SnapGuides.tsx`: Visual debugging aids
- **KonvaEditor Features** (`src/components/KonvaEditor/features/`):
  - `SmartGuides.tsx`: Alignment guides
  - `AlignmentToolbar.tsx`: Alignment controls
  - `DistanceMeasurement.tsx`: Distance measurements

### Editor Implementation Pattern

Each editor (Canvas, Konva, etc.) follows this pattern:

1. Creates an instance of `EditorStore` or uses a local store
2. Renders elements based on rows and columns layout
3. Implements drag-drop, selection, and manipulation features
4. Uses the store's element lookup methods for efficient queries

## Important Data Models

### EditorRow
- `id`: Unique identifier
- `height`: Row height in pixels
- `layout`: Array of column widths as percentages (e.g., [50, 50] for 2 equal columns)
- `elements`: Array of EditorElements in this row
- `backgroundColor`: Optional background color

### EditorElement
- `id`: Unique identifier
- `type`: Element type (rect, circle, triangle, star, polygon, image, text, button, divider, spacer)
- `x`, `y`: Position relative to row/column
- `width`, `height`: Dimensions
- `fill`: Color (optional)
- `src`: Image source (for image elements)
- `text`: Text content (for text elements)

## Constants and Styling

Key constants are defined in `src/common/stores/types.ts`:
- `CANVAS_WIDTH`: 600px - Fixed canvas width
- Color constants for UI: `SELECTION_COLOR`, `ROW_HOVER_COLOR`, `DROP_TARGET_COLOR`, etc.
- `RESIZE_HANDLE_HIT_TOLERANCE`: Hit detection tolerance for resize handles
- `ADD_BUTTON_HIT_TOLERANCE`: Hit detection tolerance for add buttons

## Tailwind CSS

The project uses Tailwind CSS for styling. Configuration in `tailwind.config.js`.

## TypeScript Strict Mode

The codebase enforces strict TypeScript:
- No implicit any
- Strict null checks
- No unused locals/parameters
- All files must be properly typed

Always maintain type safety when adding or modifying code.
