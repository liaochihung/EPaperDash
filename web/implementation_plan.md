# Implementation Plan - Undo/Redo & History

## Problem
The undo/redo buttons in the toolbar were always active or didn't reflect the actual state of the history stack. The history logic was tightly coupled with the canvas and prone to desync.

## Solution

### 1. Dedicated History Composable
Create `src/composables/useHistory.js` to encapsulate stack management.
- State: `history` array, `currentIndex`.
- Actions: `push(state)`, `undo()`, `redo()`, `reset()`.
- Computed: `canUndo`, `canRedo`.

### 2. Integration with Konva
Update `useKonvaCanvas.js` to rely on `useHistory`.
- `saveHistory()` captures `stage.toJSON()`.
- `undo()`/`redo()` restores state via `Konva.Node.create`.
- Ensure `saveHistory` is called on:
    - Shape addition (Text, Image, etc.)
    - Transform end (Resize/Rotate)
    - Drag end (Move)
    - Property changes (via Sidebar)
    - Z-index changes
    - Deletion

### 3. UI Updates
- **EditToolbar**: Add `disabled` state interaction.
- **CanvasEditor**: Expose history state via events.
- **App**: Coordinate state between Canvas and Toolbar.

## Files Modified
- `src/composables/useHistory.js` (Created)
- `src/composables/useKonvaCanvas.js`
- `src/components/CanvasEditor.vue`
- `src/components/EditToolbar.vue`
- `src/App.vue`

## Verification
- Browser automation verified button states correctly toggle based on actions.
