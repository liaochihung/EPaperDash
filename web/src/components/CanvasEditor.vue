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

const emit = defineEmits(['selected', 'change', 'history-change', 'scale-change', 'tool-change']);

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
    isDirty,
    markSaved,
    clearCanvas,
    scale,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    centerStage,
    toolMode,
    setToolMode,
    selectAll,
    getNodes,
    selectById,
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

// Watch Zoom & Tool Mode to sync with parent UI
watch(scale, (newScale) => {
    emit('scale-change', newScale);
});

watch(toolMode, (newMode) => {
    emit('tool-change', newMode);
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
    isDirty,
    markSaved,
    clearCanvas,
    scale,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    centerStage,
    toolMode,
    setToolMode,
    selectAll,
    getNodes,
    selectById
});

// Handle Wheel Zoom
const handleWheel = (e) => {
    // Ctrl + Wheel to zoom
    if (e.ctrlKey) {
        e.preventDefault();
        const stagePtr = stage.value.getPointerPosition();
        if (!stagePtr) return;

        const oldScale = scale.value;
        const pointer = { x: stagePtr.x, y: stagePtr.y };

        const zoomBy = 1.1;
        const newScale = e.deltaY < 0 ? oldScale * zoomBy : oldScale / zoomBy;

        setZoom(newScale, pointer);
    } 
    // Wheel to Pan (if toolMode is pan) - implicit by Konva Draggable usually,
    // but if we want wheel panning (shift+wheel) we can add later
};

const handleDrop = (e) => {
    e.preventDefault();
    
    // Update Konva's pointer position manually from the drop event
    stage.value.setPointersPositions(e);
    const pos = getRelativePointerPosition();
    
    try {
        // 1. Handle File Drop (from desktop/folder)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (evt) => addImage(evt.target.result, pos);
                reader.readAsDataURL(file);
                return;
            }
        }

        // 2. Handle Tool Drop (from sidebar)
        const raw = e.dataTransfer.getData('application/json');
        if (!raw) return;
        const { type, payload } = JSON.parse(raw);
        
        switch (type) {
            case 'text': addText(pos); break;
            case 'image': 
                if (payload) {
                    addImage(payload, pos);
                } else {
                    // This case handles if we ever make the image tool draggable without payload
                    // but usually images need a file picker
                }
                break;
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
    @wheel="handleWheel"
  >
    <!-- Konva will attach here with its own canvas -->
  </div>
</template>
