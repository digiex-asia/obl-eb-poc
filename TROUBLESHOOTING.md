# Troubleshooting Guide

## Common Issues After Smart Batching Implementation

### Issue 1: Elements not appearing immediately

**Symptom**: Elements take time to appear on canvas after adding them

**Cause**: Operations are being batched (300ms delay)

**Solution**: This is expected behavior. The UI updates instantly via reducer, but backend sync happens after 300ms.

**Test**:
1. Add an element (e.g., rectangle)
2. Element should appear **immediately** on canvas
3. After 300ms, check console for: `[OperationBatcher] Flushing...`

---

### Issue 2: Drag not working

**Symptom**: Can't drag elements

**Possible Causes**:
1. Canvas engine not using dispatch properly
2. Dispatch function has wrong signature
3. State not updating

**Debug Steps**:
1. Open browser console
2. Drag an element
3. Check for logs: `[AppWithCommands] Legacy dispatch: UPDATE_ELEMENT`
4. If no logs → canvas engine not calling dispatch
5. If logs but no visual update → reducer issue

**Check**:
```javascript
// In browser console
window.addEventListener('mousemove', (e) => {
  console.log('Mouse move:', e.clientX, e.clientY);
});
```

---

### Issue 3: Operations not being sent to backend

**Symptom**: No network requests in DevTools

**Possible Causes**:
1. No template loaded (currentTemplateId is null)
2. Batcher not flushing
3. Operation queue not sending

**Debug Steps**:
1. Check console for: `[AppWithCommands] Batched X operations from reducer actions`
2. Check console for: `[SmartOperationQueue] Sending X operations to backend...`
3. Check Network tab for POST requests to `/templates/:id/operations`

**Fix**:
- Make sure to create a template first (click "Create Template")
- Wait 2 seconds after action for operations to send

---

### Issue 4: State not updating

**Symptom**: Actions dispatch but UI doesn't update

**Cause**: Dispatch function might not be calling baseDispatch

**Check**:
```javascript
// In browser console after page load
console.log(window.__REDUX_DEVTOOLS_EXTENSION__);
```

**Fix**: Verify dispatch function:
```typescript
const dispatch = (action: any) => {
  console.log('[AppWithCommands] Legacy dispatch:', action.type);
  baseDispatch(action); // ← This MUST be called
  // ... operation generation ...
};
```

---

### Issue 5: Commands not generating operations

**Symptom**: Commands execute but no operations generated

**Cause**: Commands and reducer actions use different systems

**Explanation**:
- **Commands** (via executeCommand): Generate operations via `command.toOperations()`
- **Reducer actions** (via dispatch): Generate operations via `operationGenerator.fromAction()`

Both systems work independently:
- Commands → SmartCommandDispatcher → operations
- Actions → dispatch → operationGenerator → batcher → operations

---

## Quick Diagnostics

### Check 1: Is the app loading?
```
Expected: No errors in console
If errors: Check BUG_FIXES.md
```

### Check 2: Can you add elements?
```
1. Click "Add Rectangle" in sidebar
2. Rectangle should appear on canvas immediately
3. After 300ms, check console for batching logs
```

### Check 3: Can you drag elements?
```
1. Click an element to select it
2. Drag the element
3. Element should move smoothly
4. After stopping, wait 300ms
5. Check console: "[OperationBatcher] Flushing 1 batched operations"
```

### Check 4: Are operations being sent?
```
1. Create a template first (required!)
2. Add or move an element
3. Wait 2 seconds
4. Check Network tab: POST /templates/:id/operations
5. Check payload: Should have 1 operation, not 100+
```

### Check 5: Does undo/redo work?
```
1. Add an element
2. Press Ctrl+Z
3. Element should disappear
4. Press Ctrl+Shift+Z
5. Element should reappear
```

---

## Console Commands for Debugging

### Check if template is loaded:
```javascript
// Should show template ID
console.log('Template ID:', currentTemplateId);
```

### Check operation queue:
```javascript
// Should show queue stats
console.log('Queue size:', queueSize, 'Coalesced:', coalescedSize);
```

### Check state:
```javascript
// Should show current state
console.log('Pages:', state.pages.length);
console.log('Elements on page 1:', state.pages[0]?.elements.length);
```

### Force flush operations:
```javascript
// If operations are stuck in batcher, this will flush them
batchReducerOperation.flush?.();
```

---

## Expected Console Output (Normal Operation)

### Adding an element:
```
[AppWithCommands] Legacy dispatch: ADD_ELEMENT
[AppWithCommands] Legacy dispatch: SELECT_ELEMENT
[OperationBatcher] Flushing 1 batched operations
[AppWithCommands] Batched 1 operations from reducer actions
[SmartOperationQueue] Coalesced 1 operations → 1 operations (0% reduction)
[SmartOperationQueue] Sending 1 operations to backend...
```

### Dragging an element (2 seconds):
```
[AppWithCommands] Legacy dispatch: UPDATE_ELEMENT (×120 times, fast)
[OperationBatcher] Flushing 1 batched operations
[AppWithCommands] Batched 1 operations from reducer actions
[SmartOperationQueue] Coalesced 1 operations → 1 operations (0% reduction)
[SmartOperationQueue] Sending 1 operations to backend...
```

---

## If Nothing Works

### Fallback to old App:

1. Edit `src/components/GraphicEditor/app-v2/index.tsx`:
```typescript
// Temporarily switch back to old app
import App from './App';
export default App;
```

2. Restart dev server:
```bash
bun run dev
```

3. Test if old app works
4. If old app works, issue is in AppWithCommands
5. Report the specific functionality that's broken

---

## Reporting Issues

When reporting issues, please provide:

1. **What you tried to do**: "I clicked Add Rectangle"
2. **What happened**: "Nothing appeared"
3. **Console logs**: Copy/paste any errors or logs
4. **Network tab**: Screenshot of requests (if relevant)
5. **Steps to reproduce**: "1. Open app, 2. Click button, 3. See error"

This helps diagnose the issue quickly!
