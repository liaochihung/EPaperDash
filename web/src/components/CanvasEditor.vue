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
    toggleGrid,
    bringToFront,
    sendToBack,
    copySelected,
    addTimeNode,
    addWeatherNode,
    addDateNode,
    getPartialDataURL,
    addRect,
    addCircle,
    addBatteryNode,
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
    importState,
    toggleGrid,
    bringToFront,
    sendToBack,
    copySelected,
    addTimeNode,
    addWeatherNode,
    addDateNode,
    getPartialDataURL
});

const handleDrop = (e) => {
    e.preventDefault();
    try {
        const raw = e.dataTransfer.getData('application/json');
        if (!raw) return;
        const { type } = JSON.parse(raw);
        
        switch (type) {
            case 'text': addText(); break;
            case 'time': addTimeNode(); break;
            case 'date': addDateNode(); break;
            case 'weather': addWeatherNode(); break;
            case 'rect': addRect(); break;
            case 'circle': addCircle(); break;
            case 'battery': addBatteryNode(); break;
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
