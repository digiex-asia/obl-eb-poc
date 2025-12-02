# Project Context

## Purpose

This is a multi-editor canvas/email builder application that explores different rendering approaches for building interactive WYSIWYG editors. The project serves as a comparison platform for evaluating various canvas rendering technologies (HTML5 Canvas API, Konva.js, Skia, and custom implementations) to understand their performance characteristics, developer experience, and suitability for building complex visual editors.

**Primary Goals:**
- Compare different rendering approaches (Canvas, Konva, Gemini, Skia, Graphic Editor)
- Build a feature-rich email/canvas builder with drag-and-drop functionality
- Maintain feature parity across different editor implementations
- Optimize performance with efficient data structures and rendering strategies

## Tech Stack

### Core Framework & Language
- **React 18.2+** - UI framework with React Router for navigation
- **TypeScript 5.0+** - Type-safe JavaScript with strict mode enabled
- **Vite 4.4+** - Build tool and development server

### State Management
- **MobX 6.15+** - Reactive state management with `makeAutoObservable()`
- **mobx-react-lite 4.1+** - React bindings for MobX

### Rendering Libraries
- **Konva 10.0+** - 2D canvas library
- **react-konva 18.2+** - React bindings for Konva
- **HTML5 Canvas API** - Native browser canvas implementation

### UI & Styling
- **Tailwind CSS 3.3+** - Utility-first CSS framework
- **Lucide React 0.554+** - Icon library
- **PostCSS** - CSS processing

### Development Tools
- **Prettier 3.2+** - Code formatter
- **ESLint** - Code linting with strict settings (max-warnings: 0)
- **Bun** - Package manager and runtime (preferred over npm)

### Documentation
- **MkDocs** - Documentation generator with Material theme
- **Python 3.8+** - Required for MkDocs

## Project Conventions

### Code Style

**Formatting (Prettier):**
- Semicolons: Required
- Quotes: Single quotes for JavaScript/TypeScript, double quotes for JSX
- Print width: 100 characters
- Tab width: 4 spaces (no tabs)
- Trailing commas: ES5 style
- Arrow function parentheses: Always include
- Line endings: LF (Unix-style)

**TypeScript:**
- Strict mode: Enabled
- Unused locals/parameters: Not allowed (`noUnusedLocals`, `noUnusedParameters`)
- Module system: ES modules (`"type": "module"`)
- JSX: React JSX transform (`react-jsx`)

**Naming Conventions:**
- Components: PascalCase (e.g., `CanvasEditor`, `EditorStore`)
- Files: Match component/class name (e.g., `CanvasEditor.tsx`, `EditorStore.ts`)
- Functions/variables: camelCase (e.g., `getElementsByRowId`, `selectedRowId`)
- Private methods: Prefix with underscore (e.g., `_rebuildElementMappings`, `_elementsByRowId`)
- Constants: UPPER_SNAKE_CASE (e.g., `CANVAS_WIDTH`, `SELECTION_COLOR`)
- Types/interfaces: PascalCase (e.g., `EditorElement`, `EditorRow`)

**File Organization:**
- Components organized by feature/editor type
- Shared components in `src/components/shared/`
- Store logic in `src/common/stores/`
- Types and constants in dedicated files
- Each major editor has its own directory with related files

### Architecture Patterns

**State Management:**
- **MobX Store Pattern**: Single `EditorStore` class manages all editor state
  - Uses `makeAutoObservable()` for automatic reactivity
  - Internal Maps for O(1) element lookups (`_elementsByRowId`, `_elementsByColumnIndex`, `_elementsByRowAndColumn`)
  - Version tracking for cache invalidation (`_elementsVersion`)
- **React useReducer**: Used in CanvasEditor for imperative rendering approach
- **Component-level state**: Used for UI-only concerns (navigation visibility, etc.)

**Component Architecture:**
- **Feature-based organization**: Each editor (Canvas, Konva, Gemini, Skia, Graphic) is self-contained
- **Shared components**: Reusable UI components in `shared/` directory
- **Observer pattern**: MobX observers for reactive updates
- **Composition over inheritance**: Component composition with props

**Performance Optimizations:**
- Element lookup maps for O(1) access instead of O(n) array filtering
- Version-based cache invalidation
- Efficient rendering strategies (multi-pass for Canvas, declarative for Konva)

**Editor Implementation Pattern:**
Each editor follows a consistent pattern:
1. Creates/uses an `EditorStore` instance (or local state for Canvas)
2. Renders elements based on rows and columns layout
3. Implements drag-drop, selection, and manipulation features
4. Uses store's element lookup methods for efficient queries

### Testing Strategy

**Current Status:** Testing infrastructure is not currently implemented. No test files or testing frameworks are configured in the project.

**Recommendations for Future:**
- Unit tests for store logic and utility functions
- Component tests for UI interactions
- Integration tests for editor workflows
- Performance benchmarks for rendering comparisons

### Git Workflow

**Branch Strategy:** Not explicitly documented. Current branch: `code-with-claude`

**Commit Conventions:** Not explicitly documented. Recommended:
- Use descriptive commit messages
- Reference issue numbers if applicable
- Keep commits focused on single changes

## Domain Context

**Email/Canvas Builder Domain:**

The application is a WYSIWYG editor for creating email templates or canvas-based layouts with the following core concepts:

**Core Entities:**
- **Rows**: Horizontal sections that contain columns and elements
  - Each row has: `id`, `height`, `layout` (column percentages), `elements[]`, `backgroundColor`
  - Rows can be added, deleted, resized, and reordered
- **Columns**: Vertical divisions within rows (defined by `layout` array of percentages)
  - Columns are resizable and determine element placement
- **Elements**: Visual components placed within columns
  - Types: `rect`, `circle`, `triangle`, `star`, `polygon`, `image`, `text`, `button`, `divider`, `spacer`
  - Properties: `id`, `type`, `x`, `y`, `width`, `height`, `fill`, `src` (for images), `text` (for text elements)
  - Elements can be dragged, resized, and deleted

**Key Interactions:**
- **Selection**: Single row and/or element selection with visual feedback
- **Hover States**: Visual feedback for hovered rows and elements
- **Drag & Drop**: Elements can be dragged between columns/rows
- **Resizing**: Elements and rows can be resized with handles
- **Zoom Control**: Canvas zoom with Cmd/Ctrl + scroll
- **Column Resizing**: Drag column boundaries to adjust layout percentages

**Canvas Dimensions:**
- Fixed width: 600px (`CANVAS_WIDTH`)
- Row heights: Variable, user-configurable
- Coordinate system: Top-left origin (0,0)

**Visual Feedback:**
- Selection color: `#d946ef` (purple)
- Row hover color: `#60a5fa` (blue)
- Drop target color: `#10b981` (green)
- Column guide color: `#e879f9` (pink)

## Important Constraints

**Performance:**
- Must maintain 60fps during interactions (drag, resize, hover)
- Element lookups must be O(1) using Maps, not O(n) array filtering
- Cache invalidation must be efficient to avoid stale data

**TypeScript:**
- Strict mode required - no implicit any, strict null checks
- Unused variables/parameters are errors (not warnings)
- All code must pass ESLint with zero warnings

**Rendering:**
- Canvas width is fixed at 600px (responsive design not required)
- Coordinate system is absolute positioning within canvas bounds
- Elements must respect column boundaries when dragged

**Browser Compatibility:**
- Modern browsers with ES2020 support
- Canvas API support required
- UUID generation fallback for older browsers

**Code Quality:**
- All code must be formatted with Prettier
- ESLint must pass with zero warnings
- TypeScript must compile without errors

## External Dependencies

### Key Libraries

**Rendering:**
- **Konva.js** (`konva`, `react-konva`): 2D canvas library for declarative rendering
- **HTML5 Canvas API**: Native browser API for imperative rendering

**State Management:**
- **MobX**: Reactive state management library
- **mobx-react-lite**: React bindings for MobX

**Routing:**
- **react-router-dom 7.9+**: Client-side routing for multi-editor navigation

**UI Components:**
- **Lucide React**: Icon library for UI elements

**Build & Development:**
- **Vite**: Build tool and dev server
- **TypeScript**: Type checking and compilation
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS processing

### External Services

**Deployment:**
- **Vercel**: Deployment platform (configured in `vercel.json`)
  - Build command: `vite build`
  - Output directory: `dist`
  - SPA routing with rewrites to `/index.html`

**Documentation:**
- **MkDocs Material**: Documentation site generator
- **GitHub Pages**: Potential hosting for documentation (via `mkdocs gh-deploy`)

### No External APIs

The application is fully client-side with no external API dependencies. All state is managed locally in the browser.
