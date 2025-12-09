# Canvas Styling Fix - Match Graphic Mono

## Problem

The canvas display in AppWithCommands (Graphic FSD) didn't look like the Graphic Mono version:
- Dark background instead of light gray
- Extra padding around canvas
- Different layout structure

## Root Cause

AppWithCommands was wrapping the Canvas component in an extra container with wrong styling:

```tsx
// WRONG - Extra wrapper with dark background
<div ref={containerRef} className="flex-1 flex items-center justify-center overflow-auto bg-gray-800 p-4">
  <Canvas ... />
</div>
```

This created:
- Dark background (`bg-gray-800` instead of `bg-[#e5e7eb]`)
- Extra padding (`p-4`)
- Wrong flex direction (`items-center justify-center` for centering)

## Solution

Removed the extra wrapper div and let the Canvas component handle its own styling:

```tsx
// CORRECT - Canvas handles its own wrapper
<Canvas
  canvasRef={canvasRef}
  containerRef={containerRef}
  isSpacePressed={state.isSpacePressed}
  onDragOver={(e: React.DragEvent) => e.preventDefault()}
  onDrop={(e: React.DragEvent) => {
    e.preventDefault();
  }}
/>
```

The Canvas component (Canvas.tsx) already has the correct structure:

```tsx
<div className="flex-1 flex flex-col relative bg-[#e5e7eb] overflow-hidden">
  <div className={`flex-1 relative overflow-hidden ${isSpacePressed ? 'cursor-grab active:cursor-grabbing' : ''}`}>
    <canvas className="block w-full h-full cursor-crosshair" />
  </div>
</div>
```

## Styling Details

### Background Color
- **Before**: `bg-gray-800` (dark gray)
- **After**: `bg-[#e5e7eb]` (light gray)
- **Matches**: Graphic Mono exactly ✅

### Layout
- **Before**: `flex items-center justify-center` (centered)
- **After**: `flex flex-col relative` (full size)
- **Matches**: Graphic Mono exactly ✅

### Padding
- **Before**: `p-4` (16px padding)
- **After**: No padding (full canvas area)
- **Matches**: Graphic Mono exactly ✅

### Canvas Size
- **Before**: Canvas was smaller due to padding
- **After**: Canvas fills entire area
- **Matches**: Graphic Mono exactly ✅

## Visual Comparison

### Before (Wrong)
```
┌────────────────────────────────────────┐
│ Header (violet)                        │
├────────────────────────────────────────┤
│ ┌──────┬────────────────────────────┐ │
│ │Side  │  Dark Gray (bg-gray-800)   │ │
│ │bar   │  ┌──────────────────────┐  │ │
│ │      │  │                      │  │ │ <- Extra padding
│ │      │  │  Canvas (smaller)    │  │ │
│ │      │  │                      │  │ │
│ │      │  └──────────────────────┘  │ │
│ │      │                            │ │
│ └──────┴────────────────────────────┘ │
│ Timeline                               │
└────────────────────────────────────────┘
```

### After (Correct - Matches Mono)
```
┌────────────────────────────────────────┐
│ Header (violet)                        │
├────────────────────────────────────────┤
│ ┌──────┬────────────────────────────┐ │
│ │Side  │Light Gray (bg-[#e5e7eb])   │ │
│ │bar   │                            │ │
│ │      │  Canvas (full size)        │ │
│ │      │                            │ │
│ │      │                            │ │
│ │      │                            │ │
│ └──────┴────────────────────────────┘ │
│ Timeline                               │
└────────────────────────────────────────┘
```

## Files Modified

**app-v2/AppWithCommands.tsx**:
- Removed extra wrapper div around Canvas component
- Canvas now mounts directly in main column

## Result

✅ Canvas background matches Graphic Mono (light gray #e5e7eb)
✅ Canvas fills entire available space
✅ No unwanted padding
✅ Visual appearance identical to Graphic Mono

## Testing

Compare side-by-side:
1. Open http://localhost:5174/graphic-old (Graphic Mono)
2. Open http://localhost:5174/graphic-new (Graphic FSD)
3. Canvas areas should look identical

Both should have:
- Light gray background
- Full-size canvas
- Same cursor behavior
- Same visual appearance
