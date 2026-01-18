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

const emit = defineEmits(['selected', 'change', 'history-change']);

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
    toggleGrid,
    bringToFront,
    sendToBack,
    copySelected,
    addTimeNode,
    addWeatherNode,
    addDateNode,
    // Weather sub-components
    addWeatherTempNode,
    addWeatherHumidityNode,
    addWeatherWindNode,
    addWeatherPrecipNode,
    addWeatherIconNode,
    getPartialDataURL,
    addRect,
    addCircle,
    addTriangle,
    addStar,
    addHeart,
    addLine,
    addArrow,
    addBatteryNode,
    undo,
    redo,
    canUndo,
    canRedo,
    selectAll,
    getRelativePointerPosition,
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

// Watch History State
watch([canUndo, canRedo], ([undoState, redoState]) => {
    emit('history-change', { canUndo: undoState, canRedo: redoState });
});

// Expose methods to parent
defineExpose({
    addText,
    addImage,
    updateNode,
    deleteSelected,
    getDataURL,
    exportState,
    importState,
    toggleGrid,
    bringToFront,
    sendToBack,
    copySelected,
    addTimeNode,
    addWeatherNode,
    addDateNode,
    // Weather sub-components
    addWeatherTempNode,
    addWeatherHumidityNode,
    addWeatherWindNode,
    addWeatherPrecipNode,
    addWeatherIconNode,
    getPartialDataURL,
    undo,
    redo,
    addRect,
    addCircle,
    addTriangle,
    addStar,
    addHeart,
    addLine,
    addArrow,
    addBatteryNode,
    canUndo,
    canRedo,
    selectAll
});

const handleDrop = (e) => {
    e.preventDefault();
    
    // Update Konva's pointer position manually from the drop event
    stage.value.setPointersPositions(e);
    const pos = getRelativePointerPosition();
    
    try {
        const raw = e.dataTransfer.getData('application/json');
        if (!raw) return;
        const { type } = JSON.parse(raw);
        
        switch (type) {
            case 'text': addText(pos); break;
            case 'time': addTimeNode(pos); break;
            case 'date': addDateNode(pos); break;
            case 'weather': addWeatherNode(pos); break;
            case 'weather-temp': addWeatherTempNode(pos); break;
            case 'weather-humidity': addWeatherHumidityNode(pos); break;
            case 'weather-wind': addWeatherWindNode(pos); break;
            case 'weather-precip': addWeatherPrecipNode(pos); break;
            case 'weather-icon': addWeatherIconNode(pos); break;
            case 'rect': addRect(pos); break;
            case 'circle': addCircle(pos); break;
            case 'triangle': addTriangle(pos); break;
            case 'star': addStar(pos); break;
            case 'heart': addHeart(pos); break;
            case 'line': addLine(pos); break;
            case 'arrow': addArrow(pos); break;
            case 'battery': addBatteryNode(pos); break;
            default: break;
        }
    } catch (err) {
        console.error("Drop error", err);
    }
};
</script>

<template>
  <div 
    ref="stageContainer" 
    class="w-full h-full bg-transparent"
    @dragover.prevent
    @drop="handleDrop"
  >
    <!-- Konva will attach here with its own canvas -->
  </div>
</template>
