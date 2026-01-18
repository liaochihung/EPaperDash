<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import CanvasEditor from './components/CanvasEditor.vue';
import AppLogo from './components/AppLogo.vue';
import ToolSidebar from './components/ToolSidebar.vue';
import EditToolbar from './components/EditToolbar.vue';
import PropertiesPanel from './components/PropertiesPanel.vue';
import DeviceSettingsDialog from './components/DeviceSettingsDialog.vue';
import ConsolePanel from './components/ConsolePanel.vue';
import DeviceToolbar from './components/DeviceToolbar.vue'; // New Import

import { useWebSerial } from './composables/useWebSerial';
import { useFirmwareUpload } from './composables/useFirmwareUpload';
import { displayOptions, colorModes } from './constants/displays';

const canvasEditorRef = ref(null);
const selectedObject = ref(null);
const { isConnected, connect, disconnect, sendBinary, sendJSON, onLineReceived } = useWebSerial();

// Dialogs
const isSettingsOpen = ref(false);
const settingsDialogRef = ref(null);
const canUndo = ref(false);
const canRedo = ref(false);

// Console
const isConsoleOpen = ref(false);
const consoleLogs = ref([]);

const addLog = (text) => {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    consoleLogs.value.push({ time, text });
    if (consoleLogs.value.length > 500) {
        consoleLogs.value.shift();
    }
};

// Handle incoming serial data
onLineReceived.value = (line) => {
    addLog(line);
    try {
        const data = JSON.parse(line);
        console.log("RX:", data);
        if (data.result === 'scan_complete' && data.networks) {
            settingsDialogRef.value?.updateWifiList(data.networks);
        }
    } catch (e) {
        // Ignore
    }
};

const handleSendCommand = (cmdObj) => {
    sendJSON(cmdObj);
};

const selectedDisplay = ref(displayOptions.find(d => d.width === 648) || displayOptions[0]);
const selectedColorMode = ref(colorModes[0]);

sendBinary.sendJSON = sendJSON;
const { isUploading, uploadToScreen } = useFirmwareUpload(sendBinary, isConnected);

onMounted(() => {
    globalThis.addEventListener('keydown', handleKeydown);
    const saved = localStorage.getItem('epaper_dash_layout');
    if (saved) {
        setTimeout(() => {
            canvasEditorRef.value?.importState(saved);
        }, 100);
    }
    onUnmounted(() => {
        // globalThis.removeEventListener('keydown', handleKeydown); // Optional cleanup
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

const handleAddText = () => canvasEditorRef.value?.addText();
const handleAddImage = (dataUrl) => canvasEditorRef.value?.addImage(dataUrl);
const handleToggleGrid = () => canvasEditorRef.value?.toggleGrid();
const handleBringToFront = () => canvasEditorRef.value?.bringToFront();
const handleSendToBack = () => canvasEditorRef.value?.sendToBack();
const handleCopy = () => canvasEditorRef.value?.copySelected();
const handleDelete = () => {
    if (!selectedObject.value) return;
    if (confirm(`Delete "${selectedObject.value.type}" element?`)) {
        canvasEditorRef.value?.deleteSelected();
    }
};
const handleUndo = () => canvasEditorRef.value?.undo();
const handleRedo = () => canvasEditorRef.value?.redo();
const handleAddTime = () => canvasEditorRef.value?.addTimeNode();
const handleAddDate = () => canvasEditorRef.value?.addDateNode();
const handleAddRect = () => canvasEditorRef.value?.addRect();
const handleAddCircle = () => canvasEditorRef.value?.addCircle();
const handleAddTriangle = () => canvasEditorRef.value?.addTriangle();
const handleAddStar = () => canvasEditorRef.value?.addStar();
const handleAddHeart = () => canvasEditorRef.value?.addHeart();
const handleAddLine = () => canvasEditorRef.value?.addLine();
const handleAddArrow = () => canvasEditorRef.value?.addArrow();
const handleSelectAll = () => canvasEditorRef.value?.selectAll();

// Weather sub-components
const handleAddWeatherTemp = () => canvasEditorRef.value?.addWeatherTempNode();
const handleAddWeatherHumidity = () => canvasEditorRef.value?.addWeatherHumidityNode();
const handleAddWeatherWind = () => canvasEditorRef.value?.addWeatherWindNode();
const handleAddWeatherPrecip = () => canvasEditorRef.value?.addWeatherPrecipNode();
const handleAddWeatherIcon = () => canvasEditorRef.value?.addWeatherIconNode();

const handleSaveProject = () => {
    if (!canvasEditorRef.value) return;
    const state = canvasEditorRef.value.exportState();
    if (!state) return;
    const blob = new Blob([state], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `epaper-layout-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

const handleLoadProject = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        file.text().then(content => {
            try {
                JSON.parse(content);
                if (canvasEditorRef.value) {
                    canvasEditorRef.value.importState(content);
                    localStorage.setItem('epaper_dash_layout', content);
                }
            } catch (err) {
                console.error("Failed to load project", err);
                alert("Error: Invalid project file");
            }
        });
    };
    fileInput.click();
};

const handleKeydown = (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
        canvasEditorRef.value?.deleteSelected();
    }
    
    // Undo/Redo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
    }
    
    // Copy
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
         handleCopy();
    }
    
    // Select All
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSelectAll();
    }
};

const handleCanvasChange = () => {
    if (canvasEditorRef.value) {
        const state = canvasEditorRef.value.exportState();
        if (state) localStorage.setItem('epaper_dash_layout', state);
        
        // Update history state
        canUndo.value = canvasEditorRef.value.canUndo || false;
        canRedo.value = canvasEditorRef.value.canRedo || false;
    }
};

const handleSelected = (obj) => {
    selectedObject.value = obj ? { ...obj } : null;
};

watch(selectedObject, (newVal) => {
    if (newVal && canvasEditorRef.value) {
        const updateAttrs = {
            x: Math.round(newVal.x),
            y: Math.round(newVal.y),
             // Allow width/height updates
            width: Math.round(newVal.width),
            height: Math.round(newVal.height),
            rotation: Math.round(newVal.rotation)
        };
        // Update specialized weather props
        if (newVal.nodeType === 'weather') {
             updateAttrs.weatherIcon = newVal.weatherIcon;
             updateAttrs.weatherTemp = newVal.weatherTemp;
             updateAttrs.weatherDetails = newVal.weatherDetails;
        }

        if (newVal.type === 'Text') {
            updateAttrs.text = newVal.text;
            updateAttrs.fontSize = Math.round(newVal.fontSize);
            updateAttrs.fill = newVal.fill;
        } else if (newVal.type === 'Image') {
             // Image logic is same as generic now via updateNode normalization
        }

        // Shape properties (Rect, Circle, Star, Line, Path, Arrow)
        const shapeTypes = ['Rect', 'Circle', 'Star', 'Line', 'Path', 'Arrow'];
        if (shapeTypes.includes(newVal.type)) {
            updateAttrs.fill = newVal.fill;
            updateAttrs.stroke = newVal.stroke;
            updateAttrs.strokeWidth = newVal.strokeWidth;
            updateAttrs.dashStyle = newVal.dashStyle;
        }

        canvasEditorRef.value.updateNode(newVal.id, updateAttrs);
        handleCanvasChange();
    }
}, { deep: true });
</script>

<template>
  <div class="flex h-screen w-screen bg-gray-50 text-gray-800 font-sans overflow-hidden">
    
    <!-- Left Sidebar: Tools (Now wider and improved) -->
    <ToolSidebar 
      class="z-30 h-full bg-white/80 backdrop-blur-xl border-r border-gray-200/60"
      @add-text="handleAddText" 
      @add-image="handleAddImage"
      @add-time="handleAddTime"
      @add-date="handleAddDate"
      @add-rect="handleAddRect"
      @add-circle="handleAddCircle"
      @add-triangle="handleAddTriangle"
      @add-star="handleAddStar"
      @add-heart="handleAddHeart"
      @add-line="handleAddLine"
      @add-arrow="handleAddArrow"
      @add-weather-temp="handleAddWeatherTemp"
      @add-weather-humidity="handleAddWeatherHumidity"
      @add-weather-wind="handleAddWeatherWind"
      @add-weather-precip="handleAddWeatherPrecip"
      @add-weather-icon="handleAddWeatherIcon"
    />

    <!-- Center: Workspace -->
    <main class="flex-1 flex flex-col relative min-w-0 bg-gray-100 dot-grid">
      
      <!-- Unified Top Header (Glass Bar) -->
      <header class="relative z-40 bg-white/80 backdrop-blur-md border-b border-gray-200/50 h-14 flex items-center justify-between px-3 md:px-4 shrink-0 shadow-sm">
          
          <!-- Left: Logo -->
          <AppLogo />

          <!-- Center: Device Controls (Scrollable on mobile) -->
          <div class="flex-1 overflow-x-auto flex justify-center mx-2 no-scrollbar">
              <DeviceToolbar 
                :is-connected="isConnected"
                :is-uploading="isUploading"
                v-model:selected-display="selectedDisplay"
                v-model:selected-color-mode="selectedColorMode"
                @connect="handleConnect"
                @upload="handleUpload"
                @open-settings="isSettingsOpen = true"
                @toggle-console="isConsoleOpen = !isConsoleOpen"
              />
          </div>

          <!-- Right: File Actions -->
          <div class="flex items-center gap-2 shrink-0">
               <button @click="handleSaveProject" class="p-1.5 rounded-md text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200" title="Save Project">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </button>

              <button @click="handleLoadProject" class="p-1.5 rounded-md text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200" title="Load Project">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </button>
          </div>
      </header>

      <!-- Edit Toolbar (Floating Bottom Center) -->
      <!-- Adjusted positioning to floating style -->
      <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
          <EditToolbar
            @toggle-grid="handleToggleGrid"
            @bring-to-front="handleBringToFront"
            @send-to-back="handleSendToBack"
            @copy="handleCopy"
            @delete="handleDelete"
            @undo="handleUndo"
            @redo="handleRedo"
            @select-all="handleSelectAll"
            :can-undo="canUndo"
            :can-redo="canRedo"
          />
      </div>
      
      <div class="flex-1 relative overflow-hidden flex flex-col pt-0">
         <CanvasEditor 
            class="flex-1 w-full h-full"
            ref="canvasEditorRef" 
            @selected="handleSelected" 
            @change="handleCanvasChange"
            @history-change="(state) => { canUndo = state.canUndo; canRedo = state.canRedo; }"
            :width="selectedDisplay.width"  
            :height="selectedDisplay.height"
         />
      </div>
    </main>

    <!-- Right Sidebar: Properties (Docked but floating look) -->
    <aside class="w-72 h-full z-20 flex flex-col pointer-events-none p-4">
        <div class="bg-white/90 backdrop-blur-xl border border-white/40 shadow-xl rounded-2xl flex-1 flex flex-col overflow-hidden pointer-events-auto">
            <PropertiesPanel
                class="h-full"
                :selected-object="selectedObject"
                :selected-color-mode="selectedColorMode"
            />
        </div>
    </aside>

    <!-- Dialogs -->
    <DeviceSettingsDialog 
        ref="settingsDialogRef"
        :is-open="isSettingsOpen"
        @close="isSettingsOpen = false"
        @send-command="handleSendCommand"
    />

    <ConsolePanel 
        :is-open="isConsoleOpen" 
        :logs="consoleLogs"
        @close="isConsoleOpen = false"
        @clear="consoleLogs = []"
    />
  </div>
</template>

<style>
body {
    margin: 0;
    overflow: hidden;
}
</style>
