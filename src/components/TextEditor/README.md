# Text Editor - Plugin Architecture

This Text Editor has been restructured into a modular plugin-based architecture for easier maintenance and control.

## Directory Structure

```
TextEditor/
├── index.tsx                    # Main component (refactored)
├── types.ts                      # TypeScript type definitions
├── Toolbar.tsx                   # Toolbar component using plugins
├── core/                         # Core utilities and engines
│   ├── constants.ts              # Constants (STAGE_WIDTH, etc.)
│   ├── utils.ts                  # Utility functions (generateId, toTitleCase)
│   ├── history.ts                # Undo/Redo hook
│   ├── textManipulation.ts       # Text span manipulation functions
│   ├── layoutEngine.ts           # Text layout calculation engine
│   └── pluginSystem.ts           # Plugin registry and manager
├── components/                   # Shared UI components
│   ├── icons.tsx                 # Icon components
│   ├── ToolbarComponents.tsx      # Toolbar button, tooltip, separator
│   └── HiddenInput.tsx           # Hidden textarea for input
└── plugins/                      # Feature plugins
    ├── index.ts                  # Plugin registration
    ├── HistoryPlugin.ts          # Undo/Redo (placeholder)
    ├── FormattingPlugin.ts       # Bold, Italic, Underline, Strikethrough
    ├── ColorPlugin.ts            # Text color and highlight
    ├── AlignmentPlugin.ts        # Left, Center, Right, Justify
    ├── ListPlugin.ts             # Bullets, Numbers, Indentation
    ├── TextTransformPlugin.ts    # Uppercase, Lowercase, Capitalize
    ├── SpacingPlugin.ts          # Letter spacing, Line height, Paragraph spacing
    ├── VerticalAlignPlugin.ts    # Top, Middle, Bottom alignment
    ├── AutoFitPlugin.ts          # Auto-fit scaling
    ├── FontPlugin.ts             # Font family and size
    └── ShadowPlugin.ts           # Drop shadow effect
```

## Plugin System

### Plugin Interface

Each plugin implements the `TextEditorPlugin` interface:

```typescript
interface TextEditorPlugin {
  name: string;
  getToolbarButtons?: (context: PluginContext) => ToolbarButtonConfig[];
  getToolbarSections?: (context: PluginContext) => React.ReactNode[];
  handleKeyDown?: (e: KeyboardEvent, context: PluginContext) => boolean;
  onStyleUpdate?: (key: string, value: any, context: PluginContext) => void;
  initialize?: (context: PluginContext) => void;
  cleanup?: () => void;
}
```

### Plugin Context

Plugins receive a `PluginContext` that provides:
- `activeElement`: Currently selected text element
- `currentStyle`: Style at cursor position
- `selection`: Current text selection
- `elements`: All text elements
- `setElements`: Function to update elements
- `onUpdateStyle`: Function to update styles
- `canvasRef`: Reference to canvas element

### Adding a New Plugin

1. Create a new file in `plugins/` directory
2. Implement the `TextEditorPlugin` interface
3. Register it in `plugins/index.ts`:

```typescript
import { MyNewPlugin } from './MyNewPlugin';
pluginRegistry.register(MyNewPlugin);
```

### Example Plugin

```typescript
export const MyNewPlugin: TextEditorPlugin = {
  name: 'myPlugin',
  
  getToolbarButtons: (context: PluginContext) => {
    if (!context.activeElement) return [];
    
    return [{
      icon: Icons.SomeIcon,
      label: 'My Feature',
      onClick: () => context.onUpdateStyle('myProperty', 'value')
    }];
  },
  
  handleKeyDown: (e: KeyboardEvent, context: PluginContext) => {
    if (e.key === 'm' && e.metaKey) {
      // Handle shortcut
      return true; // Indicates we handled it
    }
    return false;
  }
};
```

## Core Modules

### Layout Engine

The `TextLayoutEngine` handles all text measurement and positioning:
- `measureText()`: Measure text dimensions
- `calculateLayout()`: Calculate line breaks and positions
- `calculateOptimalFontSize()`: Binary search for auto-fit
- `getCharIndexFromPos()`: Convert mouse position to text index
- `getWordRangeAt()`: Get word boundaries
- `getLineRangeAt()`: Get line boundaries

### Text Manipulation

Functions for manipulating text spans:
- `deleteTextRange()`: Delete text in a range
- `insertTextAt()`: Insert text at position
- `applyStyleToRange()`: Apply style to selected range

## Benefits of Plugin Architecture

1. **Modularity**: Each feature is self-contained
2. **Maintainability**: Easy to find and fix bugs in specific features
3. **Extensibility**: Add new features without modifying core code
4. **Testability**: Plugins can be tested independently
5. **Selective Loading**: Can enable/disable plugins as needed
6. **Code Organization**: Clear separation of concerns

## Migration Notes

The original monolithic `index.tsx` has been split into:
- Core utilities and engines
- Shared components
- Feature plugins
- Main orchestrator component

All functionality remains the same, but the code is now much more organized and maintainable.

