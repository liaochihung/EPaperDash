<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import CanvasEditor from './components/CanvasEditor.vue';
import AppHeader from './components/AppHeader.vue';
import ToolSidebar from './components/ToolSidebar.vue';
import PropertiesPanel from './components/PropertiesPanel.vue';

import { useWebSerial } from './composables/useWebSerial';
import { useFirmwareUpload } from './composables/useFirmwareUpload';
import { displayOptions, colorModes } from './constants/displays';

const canvasEditorRef = ref(null);
const selectedObject = ref(null);
const { isConnected, connect, disconnect, sendBinary } = useWebSerial();

const selectedDisplay = ref(displayOptions.find(d => d.width === 648) || displayOptions[0]); // Default to user's 5.83"
const selectedColorMode = ref(colorModes[0]);

const { isUploading, uploadToScreen } = useFirmwareUpload(sendBinary, isConnected);

const handleConnect = async () => {
    if (isConnected.value) {
        await disconnect();
    } else {
        await connect();
    }
};

const handleUpload = () => {
    uploadToScreen(canvasEditorRef.value, selectedDisplay.value, selectedColorMode.value);
};

const handleAddText = () => {
    canvasEditorRef.value?.addText();
};

const handleAddImage = (dataUrl) => {
    canvasEditorRef.value?.addImage(dataUrl);
};

// Keyboard handling
const handleKeydown = (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            canvasEditorRef.value?.deleteSelected();
        }
    }
};

onMounted(() => {
    globalThis.addEventListener('keydown', handleKeydown);
    
    // Restore state
    const saved = localStorage.getItem('epaper_dash_layout');
    if (saved) {
        setTimeout(() => {
            canvasEditorRef.value?.importState(saved);
        }, 100);
    }
});

onUnmounted(() => {
    globalThis.removeEventListener('keydown', handleKeydown);
});

const handleCanvasChange = () => {
    if (canvasEditorRef.value) {
        const state = canvasEditorRef.value.exportState();
        if (state) {
            localStorage.setItem('epaper_dash_layout', state);
        }
    }
};

const handleSelected = (obj) => {
    // Clone to avoid direct mutation issues
    selectedObject.value = obj ? { ...obj } : null;
};

// Watch for property changes in the side panel and update canvas
watch(selectedObject, (newVal) => {
    if (newVal && canvasEditorRef.value) {
        const updateAttrs = {
            x: Math.round(newVal.x),
            y: Math.round(newVal.y)
        };

        if (newVal.type === 'Text') {
            updateAttrs.text = newVal.text;
            updateAttrs.fontSize = Math.round(newVal.fontSize);
            updateAttrs.fill = newVal.fill;
            updateAttrs.scaleX = 1;
            updateAttrs.scaleY = 1;
        } else if (newVal.type === 'Image') {
            updateAttrs.width = Math.round(newVal.width);
            updateAttrs.height = Math.round(newVal.height);
            updateAttrs.scaleX = 1;
            updateAttrs.scaleY = 1;
        }

        canvasEditorRef.value.updateNode(newVal.id, updateAttrs);
        handleCanvasChange(); // Save on manual change
    }
}, { deep: true });
</script>

<template>
  <div class="flex h-screen w-screen bg-gray-50 text-gray-800 font-sans overflow-hidden">
    
    <!-- Left Sidebar: Tools -->
    <ToolSidebar 
      @add-text="handleAddText" 
      @add-image="handleAddImage" 
    />

    <!-- Center: Workspace -->
    <main class="flex-1 flex flex-col relative min-w-0 bg-gray-100">
      <!-- Topbar -->
      <AppHeader
        :is-connected="isConnected"
        :is-uploading="isUploading"
        v-model:selected-display="selectedDisplay"
        v-model:selected-color-mode="selectedColorMode"
        @connect="handleConnect"
        @upload="handleUpload"
      />
      
      <div class="flex-1 relative overflow-hidden flex flex-col">
         <CanvasEditor 
            class="flex-1 w-full h-full"
            ref="canvasEditorRef" 
            @selected="handleSelected" 
            @change="handleCanvasChange"
            :width="selectedDisplay.width" 
            :height="selectedDisplay.height"
         />
      </div>
    </main>

    <!-- Right Sidebar: Properties -->
    <PropertiesPanel
      :selected-object="selectedObject"
      :selected-color-mode="selectedColorMode"
    />
  </div>
</template>

<style>
/* Global resets if needed */
body {
    margin: 0;
    overflow: hidden; /* Prevent native scroll */
}
</style>
