# Legacy vs. Optimized Editor Comparison

This document details the performance bottlenecks in the legacy `emailPage.js` / `emailStore.js` implementation and how the new `KonvaEditor` architecture solves them.

## 1. Architectural Differences

| Feature | Legacy Implementation (`OBLOldEditor`) | Optimized Implementation (`KonvaEditor`) |
|---------|-----------------------------------|----------------------------------------|
| **State Management** | **Monolithic Mutable Class + Cloning**: The entire page state is stored in a massive `EmailPage` class (10k+ lines). Updates often involve deep cloning or full re-renders. | **MobX Observable Store**: Fine-grained observables (`EditorStore`). Only specific properties (x, y, width) update, triggering minimal re-renders. |
| **Reactivity** | **Coarse-grained**: Changes often trigger updates across the entire page or large sections because dependencies aren't tracked granularly. | **Fine-grained**: Components observe only the data they need. Moving an element only re-renders that specific element's Konva node. |
| **Data Flow** | **Props Drilling / Global Context**: Large state objects passed down, causing `memo` checks to fail. | **Direct Store Access**: Components read directly from the store. `observer` wrapper ensures they only update when relevant data changes. |
| **Serialization** | **Frequent Serialization**: `storeValue` getter uses `JSON.parse(JSON.stringify(this))` to create snapshots, which is extremely CPU intensive. | **On-Demand**: Serialization only happens when saving. Working state is kept as live objects. |

## 2. Specific Performance Bottlenecks in Legacy Code

### A. Deep Cloning on Read
In `src/old/emailPage.js`, the `storeValue` getter creates a deep copy of the entire state on every access:

```javascript
// src/old/emailPage.js
get storeValue() {
  return JSON.parse(
    JSON.stringify({
      id: this.id,
      // ... massive object construction ...
      children: this.childrenToJson, // Recurses down the tree
      // ...
    })
  );
}
```

This turns a simple read operation into an O(N) operation where N is the size of the entire document tree.

### B. Monolithic Classes
`EmailPage` is over 10,000 lines long. It mixes:
- Data storage
- Business logic
- UI logic (handling drag/drop calculations)
- API calls
- History management (Undo/Redo)

This low cohesion makes the app heavy and difficult for the JS engine to optimize (large objects, deoptimization of inline caches).

### C. "Everything is a Prop" Rendering
The legacy rendering often passes the whole `page` or `row` object to children. Since these objects are often mutated or cloned, React cannot effectively skip re-renders using `React.memo` (or `PureComponent`).

## 3. Simulation in `OBLOldEditor`

To demonstrate these issues, `OBLOldEditor` introduces:
1. **`OldLaggyStore`**: A store that forces a full state clone (`JSON.parse(JSON.stringify)`) on every single action (move, resize).
2. **Deep Prop Passing**: Passes the entire root state down to leaves, ensuring that a change in one element invalidates the props for all others.
3. **Artificial Computation**: Adds a small blocking calculation in the render loop to simulate the overhead of the massive 10k line class methods running during render.

