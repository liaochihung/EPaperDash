# Canvas History & Undo/Redo Implementation

## Status
- [x] Create `useHistory.js` composable (Memento Pattern)
- [x] Refactor `useKonvaCanvas.js` to use `useHistory`
- [x] Expose `undo`, `redo`, `canUndo`, `canRedo` in `useKonvaCanvas`
- [x] Update `CanvasEditor.vue` to emit `history-change` events
- [x] Update `App.vue` to handle history state and pass to toolbar
- [x] Update `EditToolbar.vue` to disable buttons using `canUndo`/`canRedo` props
- [x] Verify functionality with browser tests

## Details
### 1. History Management
Implemented a robust history stack using the Memento pattern in `src/composables/useHistory.js`.
- Separated history logic from canvas logic.
- Managed `history` array and `currentIndex`.
- Provided `pushState`, `undo`, `redo`, `reset` methods.
- Computed `canUndo` and `canRedo` for UI state.

### 2. Canvas Integration
Refactored `src/composables/useKonvaCanvas.js`:
- Integrated `useHistory`.
- `saveHistory` now pushes the JSON state of the canvas.
- `undo`/`redo` calls `importState` to restore canvas.
- Fixed `updateNode` and other mutation methods (resize, drag end) to trigger `saveHistory`.

### 3. UI Reactivity
- **CanvasEditor**: Watches `canUndo`/`canRedo` from the composable and emits `history-change`.
- **App**: Listens to `history-change` from `CanvasEditor` and updates local refs `canUndo`/`canRedo`.
- **EditToolbar**: Receives `canUndo`/`canRedo` as props.
  - Undo button: Enabled only when `canUndo` is true.
  - Redo button: Enabled only when `canRedo` is true.
  - Disabled buttons have `opacity-40` and `cursor-not-allowed`.

### 4. Verification
Browser subagent confirmed:
- Initial state: Buttons disabled.
- Action (Add Text): Undo enabled.
- Action (Undo): Text removed, Undo disabled, Redo enabled.
