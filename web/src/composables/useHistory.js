import { ref, computed } from 'vue';

export function useHistory(initialState = null, options = {}) {
    const { maxHistory = 50 } = options;
    const history = ref(initialState ? [initialState] : []);
    const currentIndex = ref(initialState ? 0 : -1);
    const isUpdating = ref(false);

    const canUndo = computed(() => currentIndex.value > 0);
    const canRedo = computed(() => currentIndex.value < history.value.length - 1);

    /**
     * Saves a new state to history.
     * Removes any future states if we were in the middle of the stack.
     * @param {any} state - The state to save (should be immutable or a snapshot)
     */
    const pushState = (state) => {
        if (isUpdating.value) return;

        // If we are not at the end, cut off the future
        if (currentIndex.value < history.value.length - 1) {
            history.value = history.value.slice(0, currentIndex.value + 1);
        }

        history.value.push(state);
        currentIndex.value++;

        // Limit size
        if (history.value.length > maxHistory) {
            history.value.shift();
            currentIndex.value--;
        }
    };

    /**
     * Undoes to the previous state.
     * @returns {any} The previous state, or null if cannot undo.
     */
    const undo = () => {
        if (!canUndo.value) return null;

        isUpdating.value = true;
        currentIndex.value--;
        const state = history.value[currentIndex.value];
        isUpdating.value = false;

        return state;
    };

    /**
     * Redoes to the next state.
     * @returns {any} The next state, or null if cannot redo.
     */
    const redo = () => {
        if (!canRedo.value) return null;

        isUpdating.value = true;
        currentIndex.value++;
        const state = history.value[currentIndex.value];
        isUpdating.value = false;

        return state;
    };

    /**
     * Resets history to a specific state or empty.
     * @param {any} state 
     */
    const reset = (state = null) => {
        history.value = state ? [state] : [];
        currentIndex.value = state ? 0 : -1;
    };

    // Helper to wrap an action that shouldn't trigger pushState (if using watchers)
    const withoutHistory = (fn) => {
        const wasUpdating = isUpdating.value;
        isUpdating.value = true;
        fn();
        isUpdating.value = wasUpdating;
    };

    return {
        history,
        currentIndex,
        canUndo,
        canRedo,
        pushState,
        undo,
        redo,
        reset,
        withoutHistory
    };
}
