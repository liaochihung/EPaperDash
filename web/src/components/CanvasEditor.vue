<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useKonvaCanvas } from '../composables/useKonvaCanvas';

const props = defineProps({
  width: {
    type: Number,
    default: 648
  },
  height: {
    type: Number,
    default: 480
  }
});

const emit = defineEmits(['selected', 'change']);

const stageContainer = ref(null);
let resizeObserver = null;

// Use the composable
const {
    initStage,
    fitStageToParent,
    updatePaperSize,
    addText,
    addImage,
    deleteSelected,
    updateNode,
    getDataURL,
    exportState,
    importState,
    stage // access ref if needed for cleanup
} = useKonvaCanvas(stageContainer, props, emit);

// Lifecycle
onMounted(() => {
    initStage();
    
    // Resize Observer handles window/container resizing
    resizeObserver = new ResizeObserver(() => {
        fitStageToParent();
    });
    if (stageContainer.value) {
        resizeObserver.observe(stageContainer.value);
    }
});

onUnmounted(() => {
    if (resizeObserver) resizeObserver.disconnect();
    if(stage.value) stage.value.destroy();
});

// React to Prop changes (Paper Size)
watch(() => [props.width, props.height], ([newW, newH]) => {
    updatePaperSize(newW, newH);
});

// Expose methods to parent
defineExpose({
    addText,
    addImage,
    updateNode,
    deleteSelected,
    getDataURL,
    exportState,
    importState
});
</script>

<template>
  <div ref="stageContainer" class="w-full h-full bg-gray-200">
    <!-- Konva will attach here with its own canvas -->
  </div>
</template>
