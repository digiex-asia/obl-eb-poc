# Testing Checklist - Command Pattern Implementation

## Pre-Test Setup

### 1. Backend Setup
- [ ] Backend server is running (`cd api && npm run start:dev`)
- [ ] Database is accessible
- [ ] Check legacy template exists in database (optional, for testing adapter)

### 2. Frontend Setup
- [ ] Frontend dev server is running (`bun run dev`)
- [ ] Console is open (F12) to see command logs
- [ ] Network tab is open to monitor API calls

### 3. Switch to Command Pattern
```typescript
// In src/components/GraphicEditor/app-v2/index.ts
export { default } from './AppWithCommands'; // Use command version
```

---

## Backend Tests

### Test 1: Legacy Adapter - Format Detection
**Purpose**: Verify backend detects and transforms legacy templates

```bash
# If you have a legacy template in DB
curl http://localhost:3000/templates/{template_id}
```

**Expected**:
- [ ] Response contains `designData` object
- [ ] `designData.pages` is an array (not `children`)
- [ ] `designData.canvas` exists with width/height
- [ ] Console shows: Format detected as v1/v2

### Test 2: Operation Application
**Purpose**: Verify operations are applied correctly

```bash
POST http://localhost:3000/templates/{template_id}/operations
Content-Type: application/json

{
  "operations": [
    {
      "id": "op_test_123",
      "type": "update_element",
      "target": { "pageId": "page_1", "elementId": "el_1" },
      "payload": { "x": 200, "y": 300 },
      "timestamp": 1234567890
    }
  ],
  "baseVersion": 1
}
```

**Expected**:
- [ ] Status 200
- [ ] Response contains `appliedOps: ["op_test_123"]`
- [ ] Response contains updated template with new version
- [ ] Element position updated to x:200, y:300

### Test 3: Version Conflict Detection
**Purpose**: Verify optimistic locking works

```bash
POST http://localhost:3000/templates/{template_id}/operations
{
  "operations": [...],
  "baseVersion": 999  // Wrong version
}
```

**Expected**:
- [ ] Status 409 (Conflict)
- [ ] Response contains `currentVersion` and `requestedVersion`
- [ ] No changes applied to template

### Test 4: Audio Operations
**Purpose**: Verify audio operations work

```bash
POST http://localhost:3000/templates/{template_id}/operations
{
  "operations": [
    {
      "id": "op_audio_1",
      "type": "add_audio_clip",
      "target": { "audioLayerId": "layer_1", "clipId": "clip_1" },
      "payload": {
        "src": "audio.mp3",
        "label": "BGM",
        "startAt": 0,
        "duration": 10,
        "offset": 0,
        "totalDuration": 10
      },
      "timestamp": 1234567890
    }
  ],
  "baseVersion": 1
}
```

**Expected**:
- [ ] Status 200
- [ ] Audio clip added to template
- [ ] `audioLayers` array contains new clip

---

## Frontend Tests

### Test 5: Command Dispatcher Setup
**Purpose**: Verify command system is initialized

**Steps**:
1. Open GraphicEditor
2. Open browser console
3. Look for logs

**Expected Console Output**:
```
[AppWithCommands] Template saved with version: X
```

**Checklist**:
- [ ] No errors in console
- [ ] Command dispatcher initialized
- [ ] Operation queue initialized

### Test 6: Keyboard Shortcuts
**Purpose**: Verify undo/redo keyboard shortcuts work

**Steps**:
1. Add a rectangle (click "Add Rectangle" button)
2. Press `Ctrl+Z` (Mac: `Cmd+Z`)
3. Press `Ctrl+Shift+Z` (Mac: `Cmd+Shift+Z`)

**Expected**:
- [ ] Rectangle appears after step 1
- [ ] Rectangle disappears after undo (step 2)
- [ ] Rectangle reappears after redo (step 3)
- [ ] Console shows: `[AppWithCommands] Undo triggered`
- [ ] Console shows: `[AppWithCommands] Redo triggered`

### Test 7: Add Element Command
**Purpose**: Verify AddElementCommand works

**Steps**:
1. Click any shape tool (Rectangle, Circle, etc.)
2. Check console
3. Check canvas

**Expected Console Output**:
```
[AppWithCommands] Auto-generated operations: [{type: "add_element", ...}]
```

**Checklist**:
- [ ] Element appears on canvas
- [ ] Operation generated automatically
- [ ] Network request sent to backend (check Network tab)
- [ ] POST to `/templates/{id}/operations` with operation

### Test 8: Move Element Command
**Purpose**: Verify MoveElementCommand works

**Steps**:
1. Add a rectangle
2. Drag it to a new position
3. Release mouse
4. Check console

**Expected Console Output**:
```
[AppWithCommands] Auto-generated operations: [{type: "move_element", ...}]
```

**Checklist**:
- [ ] Element moves visually
- [ ] Move operation generated
- [ ] Backend receives update
- [ ] Undo restores original position

### Test 9: Delete Element Command
**Purpose**: Verify DeleteElementCommand works

**Steps**:
1. Add a rectangle
2. Right-click on it
3. Select "Delete" from context menu
4. Check console

**Expected**:
- [ ] Element disappears
- [ ] Delete operation generated
- [ ] Console shows operation
- [ ] Undo restores element

### Test 10: Update Element Command
**Purpose**: Verify UpdateElementCommand works (if Properties Panel updated)

**Steps**:
1. Add a rectangle
2. Select it
3. Change fill color in properties panel
4. Check console

**Expected**:
- [ ] Color changes visually
- [ ] Update operation generated
- [ ] Backend receives update
- [ ] Undo restores original color

### Test 11: Add Page Command
**Purpose**: Verify AddPageCommand works

**Steps**:
1. Click "Add Page" button
2. Check timeline
3. Check console

**Expected**:
- [ ] New page appears in timeline
- [ ] Add page operation generated
- [ ] Backend receives operation
- [ ] Undo removes page

### Test 12: Add Audio Command
**Purpose**: Verify AddAudioClipCommand works

**Steps**:
1. Click record button (microphone)
2. Speak for 3 seconds
3. Click stop
4. Check timeline audio track

**Expected**:
- [ ] Audio clip appears in timeline
- [ ] Add audio operation generated
- [ ] Backend receives operation
- [ ] Undo removes clip

### Test 13: Undo/Redo Stack
**Purpose**: Verify history management works

**Steps**:
1. Add 5 rectangles
2. Press undo 3 times
3. Press redo 2 times
4. Add another rectangle
5. Try to redo

**Expected**:
- [ ] First 3 rectangles removed by undo
- [ ] 2 rectangles restored by redo
- [ ] New rectangle added (step 4)
- [ ] Redo button disabled after step 5 (redo stack cleared)

### Test 14: Backend Sync
**Purpose**: Verify operations sync to backend

**Steps**:
1. Create a new template
2. Add 3 elements quickly
3. Wait 2 seconds (operation queue delay)
4. Check Network tab

**Expected**:
- [ ] All 3 operations batched in single request
- [ ] POST to `/templates/{id}/operations`
- [ ] Request body contains all 3 operations
- [ ] Response returns new version number

### Test 15: Version Conflict Handling
**Purpose**: Verify conflict detection works

**Steps**:
1. Open template in two browser tabs
2. In tab 1: Add a rectangle
3. In tab 2: Add a circle
4. Check for conflict alert

**Expected**:
- [ ] Tab 2 shows conflict alert
- [ ] Alert message shows version numbers
- [ ] No data loss
- [ ] User prompted to reload

### Test 16: Offline Behavior
**Purpose**: Verify graceful degradation

**Steps**:
1. Add a rectangle
2. Stop backend server
3. Add another rectangle
4. Check console

**Expected**:
- [ ] Element still appears locally
- [ ] Operation queued
- [ ] Console shows error after retry
- [ ] UI still functional (local state works)

### Test 17: Round-Trip Preservation (Legacy)
**Purpose**: Verify legacy templates preserve all fields

**Prerequisites**: Have a legacy template in database

**Steps**:
1. Load legacy template
2. Make a change (move element)
3. Save
4. Check database JSON

**Expected**:
- [ ] All 60+ legacy fields preserved
- [ ] Only changed field updated
- [ ] No data loss
- [ ] Template still loads in old Konva editor

---

## Performance Tests

### Test 18: Command Execution Speed
**Purpose**: Verify commands execute quickly

**Steps**:
1. Open Performance tab in DevTools
2. Add 100 rectangles in a loop:
```javascript
for (let i = 0; i < 100; i++) {
  // Add rectangle via command
}
```

**Expected**:
- [ ] All 100 elements appear
- [ ] Total execution time <500ms
- [ ] No UI freezing
- [ ] Console logs appear immediately

### Test 19: Operation Queue Performance
**Purpose**: Verify operation batching works

**Steps**:
1. Add 20 elements rapidly
2. Watch Network tab
3. Check number of requests

**Expected**:
- [ ] All 20 operations in 1-2 requests (batched)
- [ ] Not 20 separate requests
- [ ] Request size <100KB

### Test 20: Memory Leak Check
**Purpose**: Verify no memory leaks

**Steps**:
1. Open Memory profiler
2. Take heap snapshot
3. Add 100 elements
4. Undo 100 times
5. Take another heap snapshot
6. Compare

**Expected**:
- [ ] Memory returns to ~baseline
- [ ] No retained commands in heap
- [ ] History stack limited to 100 items

---

## Edge Cases

### Test 21: Empty State
**Purpose**: Verify app works with no content

**Steps**:
1. Load app with empty template
2. Try undo
3. Try redo
4. Add an element

**Expected**:
- [ ] No errors
- [ ] Undo/redo buttons disabled when appropriate
- [ ] Element adds successfully

### Test 22: Maximum History
**Purpose**: Verify history limit works

**Steps**:
1. Add 150 elements (exceeds 100 limit)
2. Try to undo all
3. Check how many undos work

**Expected**:
- [ ] Can only undo last 100 operations
- [ ] Oldest operations dropped
- [ ] No memory issues

### Test 23: Rapid Operations
**Purpose**: Verify no race conditions

**Steps**:
1. Rapidly click Add Rectangle 20 times
2. Check if all elements appear
3. Check backend received all operations

**Expected**:
- [ ] All 20 elements appear
- [ ] All 20 operations generated
- [ ] Backend applies all operations
- [ ] No duplicates or missing elements

### Test 24: Special Characters
**Purpose**: Verify text elements handle special chars

**Steps**:
1. Add text element
2. Type: `<script>alert("XSS")</script>`
3. Add emoji: 🚀💻🎨
4. Save and reload

**Expected**:
- [ ] No XSS execution
- [ ] Special chars preserved
- [ ] Emojis render correctly
- [ ] Backend stores correctly

---

## Regression Tests

### Test 25: Export Still Works
**Purpose**: Verify video export not broken

**Steps**:
1. Create template with 3 pages
2. Click Export button
3. Wait for completion

**Expected**:
- [ ] Export starts
- [ ] Progress bar shows
- [ ] Video file downloads
- [ ] No errors

### Test 26: Audio Playback
**Purpose**: Verify audio still plays

**Steps**:
1. Add audio clip
2. Click play button
3. Check audio plays in sync

**Expected**:
- [ ] Audio plays
- [ ] Syncs with timeline cursor
- [ ] No stuttering

### Test 27: Animation Preview
**Purpose**: Verify animations work

**Steps**:
1. Add element
2. Add fade-in animation
3. Preview animation

**Expected**:
- [ ] Animation plays
- [ ] Preview works
- [ ] No errors

---

## Final Checklist

### Before Deploying
- [ ] All 27 tests pass
- [ ] No console errors
- [ ] Backend logs clean
- [ ] Performance acceptable (<5ms per command)
- [ ] Memory usage stable
- [ ] Operations sync reliably
- [ ] Undo/redo works perfectly
- [ ] Legacy templates load correctly
- [ ] Documentation complete

### Post-Deployment Monitoring
- [ ] Monitor error rates
- [ ] Check operation success rate
- [ ] Monitor backend latency
- [ ] Check for version conflicts
- [ ] Verify no data loss
- [ ] User feedback collection

---

## Quick Test Script

Run this in browser console for quick validation:

```javascript
// Quick test script
async function quickTest() {
  console.log('🧪 Starting quick test...');

  // Test 1: Add element
  console.log('Test 1: Add element');
  // Click add button programmatically

  await new Promise(r => setTimeout(r, 1000));

  // Test 2: Undo
  console.log('Test 2: Undo');
  document.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'z',
    ctrlKey: true
  }));

  await new Promise(r => setTimeout(r, 1000));

  // Test 3: Redo
  console.log('Test 3: Redo');
  document.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'z',
    ctrlKey: true,
    shiftKey: true
  }));

  console.log('✅ Quick test complete! Check results above.');
}

quickTest();
```

---

**Status**: Ready for Testing 🚀
**Estimated Time**: 2-3 hours for complete test suite
**Priority**: Tests 1-17 are critical, 18-27 are recommended
