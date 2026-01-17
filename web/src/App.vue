<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import CanvasEditor from './components/CanvasEditor.vue';
import AppHeader from './components/AppHeader.vue';
import ToolSidebar from './components/ToolSidebar.vue';
import EditToolbar from './components/EditToolbar.vue';
import PropertiesPanel from './components/PropertiesPanel.vue';
import DeviceSettingsDialog from './components/DeviceSettingsDialog.vue';

import { useWebSerial } from './composables/useWebSerial';
import { useFirmwareUpload } from './composables/useFirmwareUpload';
import { displayOptions, colorModes } from './constants/displays';

const canvasEditorRef = ref(null);
const selectedObject = ref(null);
const { isConnected, connect, disconnect, sendBinary, sendJSON, onLineReceived } = useWebSerial();

// Dialogs
const isSettingsOpen = ref(false);
const settingsDialogRef = ref(null);

// Handle incoming serial data
onLineReceived.value = (line) => {
    try {
        const data = JSON.parse(line);
        console.log("RX:", data);
        
        // Route to Dialog if scanning
        if (data.result === 'scan_complete' && data.networks) {
            settingsDialogRef.value?.updateWifiList(data.networks);
        }
        
        // Handle other async responses if needed
    } catch (e) {
        // Not JSON or partial, ignore
    }
};

const handleSendCommand = (cmdObj) => {
    sendJSON(cmdObj);
};

const selectedDisplay = ref(displayOptions.find(d => d.width === 648) || displayOptions[0]); // Default to user's 5.83"
const selectedColorMode = ref(colorModes[0]);

// Attach sendJSON to sendBinary for useFirmwareUpload compatibility
sendBinary.sendJSON = sendJSON;

const { isUploading, uploadToScreen, uploadPartialUpdate } = useFirmwareUpload(sendBinary, isConnected);

// Auto-refresh state
const updateCounter = ref(0);
const FULL_REFRESH_INTERVAL = 10; // Full refresh every 10 partial updates

// Auto-refresh logic for dynamic nodes (time, date, weather)
onMounted(() => {
    globalThis.addEventListener('keydown', handleKeydown);
    
    // Restore state
    const saved = localStorage.getItem('epaper_dash_layout');
    if (saved) {
        setTimeout(() => {
            canvasEditorRef.value?.importState(saved);
        }, 100);
    }

    // Start auto-refresh timer (every minute)
    const refreshInterval = setInterval(async () => {
        if (!canvasEditorRef.value || !isConnected.value) return;

        // Get all nodes from canvas
        const state = canvasEditorRef.value.exportState();
        if (!state) return;

        const nodes = JSON.parse(state);
        const dynamicNodes = nodes.filter(n => n.attrs.nodeType && ['time', 'date', 'weather'].includes(n.attrs.nodeType));

        if (dynamicNodes.length === 0) return;

        // Update each dynamic node
        for (const node of dynamicNodes) {
            const nodeId = node.attrs.id;
            let newText = node.attrs.text;

            if (node.attrs.nodeType === 'time') {
                const now = new Date();
                newText = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            } else if (node.attrs.nodeType === 'date') {
                const now = new Date();
                newText = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            }
            // Weather would require API call - skip for now

            if (newText !== node.attrs.text) {
                // Update node text
                canvasEditorRef.value.updateNode(nodeId, { text: newText });

                // Increment counter
                updateCounter.value++;

                // Decide: Partial or Full refresh?
                if (updateCounter.value >= FULL_REFRESH_INTERVAL) {
                    console.log('Full refresh triggered');
                    await uploadToScreen(canvasEditorRef.value, selectedDisplay.value, selectedColorMode.value);
                    updateCounter.value = 0;
                } else {
                    // Partial update for this node's area
                    const x = Math.round(node.attrs.x);
                    const y = Math.round(node.attrs.y);
                    const width = Math.round(node.attrs.width || 200);
                    const height = Math.round(node.attrs.height || 50);
                    
                    console.log(`Partial update for ${nodeId}`);
                    await uploadPartialUpdate(canvasEditorRef.value, x, y, width, height, selectedColorMode.value);
                }
            }
        }
    }, 60000); // Every 60 seconds

    // Cleanup on unmount
    onUnmounted(() => {
        clearInterval(refreshInterval);
    });
});

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

const handleToggleGrid = () => {
    canvasEditorRef.value?.toggleGrid();
};

const handleBringToFront = () => {
    canvasEditorRef.value?.bringToFront();
};

const handleSendToBack = () => {
    canvasEditorRef.value?.sendToBack();
};

const handleCopy = () => {
    canvasEditorRef.value?.copySelected();
};

const handleDelete = () => {
    if (!selectedObject.value) return;
    
    const confirmDelete = confirm(`Delete "${selectedObject.value.type}" element?`);
    if (confirmDelete) {
        canvasEditorRef.value?.deleteSelected();
    }
};

const handleAddTime = () => {
    canvasEditorRef.value?.addTimeNode();
};

const handleAddDate = () => {
    canvasEditorRef.value?.addDateNode();
};

const handleAddWeather = () => {
    canvasEditorRef.value?.addWeatherNode();
};

// Keyboard handling
const handleKeydown = (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            canvasEditorRef.value?.deleteSelected();
        }
    }
};

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
      @add-time="handleAddTime"
      @add-date="handleAddDate"
      @add-weather="handleAddWeather"
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
        @open-settings="isSettingsOpen = true"
      />

      <!-- Edit Toolbar -->
      <EditToolbar
        @toggle-grid="handleToggleGrid"
        @bring-to-front="handleBringToFront"
        @send-to-back="handleSendToBack"
        @copy="handleCopy"
        @delete="handleDelete"
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

    <!-- Dialogs -->
    <DeviceSettingsDialog 
        ref="settingsDialogRef"
        :is-open="isSettingsOpen"
        @close="isSettingsOpen = false"
        @send-command="handleSendCommand"
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
