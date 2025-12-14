# Email Builder Documentation

Welcome to the Email Builder documentation. This documentation provides comprehensive guides for understanding and maintaining the email builder components.

## Overview

The Email Builder is a React-based application that provides three different rendering implementations:

- **CanvasEditor** (`/`) - Uses HTML5 Canvas API with imperative rendering
- **KonvaEditor** (`/konva`) - Uses React Konva with declarative rendering
- **SkiaEditor** (`/skia`) - Placeholder for future Skia implementation

## Documentation Structure

### CanvasEditor

The Canvas API-based implementation uses:
- **State Management**: React `useReducer` hook
- **Rendering**: Imperative Canvas API drawing
- **Architecture**: Multi-pass rendering strategy

[Read CanvasEditor Documentation →](CanvasEditor.md)

### KonvaEditor

The React Konva-based implementation uses:
- **State Management**: MobX store
- **Rendering**: Declarative React Konva components
- **Architecture**: Component composition with observer pattern

[Read KonvaEditor Documentation →](KonvaEditor.md)

## Key Features

- **Row Management**: Add, delete, resize, and reorder rows
- **Element Management**: Add, move, resize, and delete elements
- **Column Layout**: Multi-column layouts with resizable columns
- **Drag and Drop**: Intuitive drag-and-drop interface
- **Zoom Control**: Zoom in/out with Cmd/Ctrl + scroll
- **Visual Feedback**: Selection, hover, and drag target highlighting

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- React 18+
- TypeScript 5+

### Installation

```bash
# Using npm
npm install

# Using bun
bun install
```

### Development

```bash
# Start development server
npm run dev
# or
bun run dev
```

Navigate to:
- `http://localhost:5173/` for CanvasEditor
- `http://localhost:5173/konva` for KonvaEditor
- `http://localhost:5173/skia` for SkiaEditor (placeholder)

## Project Structure

```
src/
├── components/
│   ├── CanvasEditor.tsx      # Canvas API implementation
│   ├── KonvaEditor.tsx        # React Konva implementation
│   ├── SkiaEditor.tsx         # Skia implementation (placeholder)
│   └── shared/                # Shared UI components
│       ├── Sidebar.tsx
│       ├── TopBar.tsx
│       ├── ZoomControls.tsx
│       └── ColorPicker.tsx
├── stores/
│   ├── EditorStore.ts         # MobX store for Konva/Skia
│   └── types.ts               # Shared TypeScript types
└── utils/
    └── constants.ts           # Shared constants
```

## Contributing

When contributing to the codebase:

1. **Read the relevant documentation** for the editor you're modifying
2. **Follow the existing patterns** (useReducer for Canvas, MobX for Konva)
3. **Maintain feature parity** between Canvas and Konva implementations
4. **Update documentation** when adding new features

## Additional Resources

- [React Documentation](https://react.dev)
- [React Konva Documentation](https://konvajs.org/docs/react/)
- [MobX Documentation](https://mobx.js.org)
- [Canvas API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)














