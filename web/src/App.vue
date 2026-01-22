<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import CanvasEditor from './components/CanvasEditor.vue';
import AppLogo from './components/AppLogo.vue';
import ToolSidebar from './components/ToolSidebar.vue';
import PropertiesPanel from './components/PropertiesPanel.vue';
import LayersPanel from './components/LayersPanel.vue'; 
import DeviceSettingsDialog from './components/DeviceSettingsDialog.vue';
import ConsolePanel from './components/ConsolePanel.vue';
import DeviceToolbar from './components/DeviceToolbar.vue'; 

import { useWebSerial } from './composables/useWebSerial';
import { useFirmwareUpload } from './composables/useFirmwareUpload';
import { displayOptions, colorModes } from './constants/displays';

const canvasEditorRef = ref(null);
const selectedObject = ref(null);
const canvasNodes = ref([]);
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
    } catch {
        // Not JSON - expected for plain text serial output
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
    globalThis.addEventListener('keydown', handleKeyDown);
    const saved = localStorage.getItem('epaper_dash_layout');
    if (saved) {
        setTimeout(() => {
            canvasEditorRef.value?.importState(saved);
        }, 100);
    }
    onUnmounted(() => {
        globalThis.removeEventListener('keydown', handleKeyDown);
        globalThis.removeEventListener('keyup', handleKeyUp);
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

const handleDeleteById = (id) => {
    canvasEditorRef.value?.selectById(id);
    setTimeout(() => {
        handleDelete();
    }, 0);
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

const canvasScale = ref(1);
const zoomIn = () => canvasEditorRef.value?.zoomIn();
const zoomOut = () => canvasEditorRef.value?.zoomOut();
const resetZoom = () => canvasEditorRef.value?.resetZoom();
const setZoom = (val) => canvasEditorRef.value?.setZoom(val);

const handleZoomInput = (e) => {
    let val = Number.parseInt(e.target.value);
    if (!Number.isNaN(val)) {
        setZoom(val / 100);
    }
};

const toolMode = ref('select');
const setToolMode = (mode) => canvasEditorRef.value?.setToolMode(mode);

const isSpacePressed = ref(false);
const previousToolMode = ref('select');

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
    
    // Mark as saved
    canvasEditorRef.value.markSaved?.();
};

const handleNewProject = () => {
    if (!canvasEditorRef.value) return;
    
    // Check if there are unsaved changes or items on canvas
    const isDirtyValue = canvasEditorRef.value.isDirty?.value ?? false;
    const hasNodes = (canvasEditorRef.value.getNodes?.().length ?? 0) > 0;
    
    if (isDirtyValue || hasNodes) {
        const message = isDirtyValue 
            ? 'You have unsaved changes. Creating a new project will delete all current work. Continue?'
            : 'Clear current workspace and start a new project?';
            
        if (!confirm(message)) {
            return;
        }
    }
    
    // Clear the canvas
    canvasEditorRef.value.clearCanvas();
    
    // Clear localStorage
    localStorage.removeItem('epaper_dash_layout');
};

const handleLoadProject = () => {
    if (!canvasEditorRef.value) return;

    // Check if there are unsaved changes
    const isDirtyValue = canvasEditorRef.value.isDirty?.value ?? false;
    if (isDirtyValue) {
        if (!confirm('You have unsaved changes. Loading a new project will discard them. Continue?')) {
            return;
        }
    }

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
                    // Mark as saved after loading
                    canvasEditorRef.value.markSaved?.();
                }
            } catch (err) {
                console.error("Failed to load project", err);
                alert("Error: Invalid project file");
            }
        });
    };
    fileInput.click();
};

const handleKeyDown = (e) => {
    // Canvas related shortcuts
    if (e.ctrlKey) {
        if (e.key === 'z') { e.preventDefault(); handleUndo(); }
        if (e.key === 'y') { e.preventDefault(); handleRedo(); }
        if (e.key === 's') { e.preventDefault(); handleSaveProject(); }
        if (e.key === 'o') { e.preventDefault(); handleLoadProject(); }
        if (e.key === 'a') { e.preventDefault(); handleSelectAll(); }
        if (e.key === 'd') { e.preventDefault(); handleCopy(); }
        if (e.key === '[') { e.preventDefault(); handleSendToBack(); }
        if (e.key === ']') { e.preventDefault(); handleBringToFront(); }
        if (e.key === 'n') { e.preventDefault(); handleNewProject(); }
        if (e.key === '=' || e.key === '+') { e.preventDefault(); zoomIn(); }
        if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomOut(); }
        if (e.key === '0') { e.preventDefault(); resetZoom(); }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            handleDelete();
        }
    } else if (e.key === 'g' || e.key === 'G') {
        handleToggleGrid();
    } else if (e.key === 'v' || e.key === 'V') {
        setToolMode('select');
    } else if (e.key === 'h' || e.key === 'H') {
        setToolMode('pan');
    } else if (e.key === ' ' && !isSpacePressed.value) {
        // Space for temporary panning
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            isSpacePressed.value = true;
            previousToolMode.value = toolMode.value;
            setToolMode('pan');
        }
    }
};

const handleKeyUp = (e) => {
    if (e.key === ' ') {
        if (isSpacePressed.value) {
            isSpacePressed.value = false;
            setToolMode(previousToolMode.value);
        }
    }
};

const isUpdatingFromCanvas = ref(false);

const handleCanvasChange = () => {
    if (canvasEditorRef.value) {
        const state = canvasEditorRef.value.exportState();
        if (state) localStorage.setItem('epaper_dash_layout', state);
        
        // Update history state
        canUndo.value = canvasEditorRef.value.canUndo || false;
        canRedo.value = canvasEditorRef.value.canRedo || false;

        // Update layers list
        canvasNodes.value = canvasEditorRef.value.getNodes();
    }
};

const handleSelected = (obj) => {
    isUpdatingFromCanvas.value = true;
    selectedObject.value = obj ? { ...obj } : null;
    // Reset flag after next tick to ensure watcher finishes
    setTimeout(() => {
        isUpdatingFromCanvas.value = false;
    }, 0);
};

watch(selectedObject, (newVal) => {
    if (newVal && canvasEditorRef.value) {
        // Only trigger update if it NOT caused by a canvas event (e.g. user editing in sidebar)
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
        }

        // Shape properties
        const shapeTypes = ['Rect', 'Circle', 'Star', 'Line', 'Path', 'Arrow'];
        if (shapeTypes.includes(newVal.type)) {
            updateAttrs.fill = newVal.fill;
            updateAttrs.stroke = newVal.stroke;
            updateAttrs.strokeWidth = newVal.strokeWidth;
            updateAttrs.dashStyle = newVal.dashStyle;
        }

        // If change comes from Sidebar, we want history. If from Canvas, we skip (it already saved).
        canvasEditorRef.value.updateNode(newVal.id, updateAttrs, isUpdatingFromCanvas.value);
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
      <header class="relative z-40 bg-white/80 backdrop-blur-md border-b border-gray-200/50 h-14 flex items-center justify-between px-4 shrink-0 shadow-sm">
          
          <!-- Left: Logo, File, Tool Actions -->
          <div class="flex items-center gap-4">
              <AppLogo />
              <div class="w-px h-6 bg-gray-200 mx-1"></div>
              
              <!-- File Group -->
              <div class="flex items-center gap-0.5">
                  <button @click="handleNewProject" class="p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors" title="New Project (Ctrl+N)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </button>
                  <button @click="handleLoadProject" class="p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors" title="Load Project (Ctrl+O)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                  </button>
                  <button @click="handleSaveProject" class="p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors" title="Save Project (Ctrl+S)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                  </button>
              </div>

              <div class="w-px h-6 bg-gray-200 mx-1"></div>

              <!-- Tool Group (Select / Pan) -->
              <div class="flex items-center bg-gray-100 p-1 rounded-lg gap-1">
                  <button 
                    @click="setToolMode('select')" 
                    :class="toolMode === 'select' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                    class="p-1.5 rounded-md transition-all duration-200" 
                    title="Select Tool (V)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
                    </svg>
                  </button>
                  <button 
                    @click="setToolMode('pan')" 
                    :class="toolMode === 'pan' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                    class="p-1.5 rounded-md transition-all duration-200" 
                    title="Hand Tool (H / Space)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0V12m3.153-1.46c.15-.436.467-.783.92-.893a1.5 1.5 0 011.897 1.77L15 19a3 3 0 01-3 3h-1.374a3 3 0 01-2.583-1.518L5.27 15.65a1.5 1.5 0 112.121-2.121l1.609 1.609V6.5a1.5 1.5 0 013 0v1.51" />
                    </svg>
                  </button>
              </div>
          </div>

          <!-- Center: Edit Actions (The high-frequency tools) -->
          <div class="flex items-center gap-1 bg-gray-100/50 p-1 rounded-lg border border-gray-200/50">
              <!-- History -->
              <div class="flex items-center px-1">
                  <button @click="handleUndo" :disabled="!canUndo" class="p-1.5 rounded-md text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent transition-all" title="Undo (Ctrl+Z)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                  </button>
                  <button @click="handleRedo" :disabled="!canRedo" class="p-1.5 rounded-md text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent transition-all" title="Redo (Ctrl+Y)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" /></svg>
                  </button>
              </div>

              <div class="w-px h-4 bg-gray-300 mx-1"></div>

              <!-- Content Actions -->
              <div class="flex items-center px-1">
                  <button @click="handleCopy" :disabled="!selectedObject" class="p-1.5 rounded-md text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all font-medium text-xs flex items-center gap-1.5" title="Duplicate (Ctrl+D)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V21a2 2 0 01-2 2h-6a2 2 0 01-2-2v-3" /></svg>
                    <span class="hidden sm:inline">Copy</span>
                  </button>
                  <button @click="handleDelete" :disabled="!selectedObject" class="p-1.5 rounded-md text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-30 transition-all font-medium text-xs flex items-center gap-1.5 ml-1" title="Delete (Del)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    <span class="hidden sm:inline">Delete</span>
                  </button>
              </div>

              <div class="w-px h-4 bg-gray-300 mx-1"></div>

              <!-- View Actions -->
              <div class="flex items-center px-1">
                  <button @click="handleToggleGrid" class="p-1.5 rounded-md text-gray-600 hover:bg-white hover:shadow-sm transition-all" title="Toggle Grid (G)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>
                  </button>
                  <button @click="handleSelectAll" class="p-1.5 rounded-md text-gray-600 hover:bg-white hover:shadow-sm transition-all font-medium text-xs ml-1" title="Select All (Ctrl+A)">
                      ALL
                  </button>
              </div>

              <div class="w-px h-4 bg-gray-300 mx-1"></div>

              <!-- Zoom Control -->
              <div class="flex items-center gap-1 px-1">
                  <button @click="zoomOut" class="p-1.5 rounded-md text-gray-600 hover:bg-white hover:shadow-sm transition-all" title="Zoom Out (-)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" /></svg>
                  </button>
                  
                  <div class="relative group">
                      <input 
                        type="text" 
                        :value="Math.round(canvasScale * 100) + '%'"
                        @change="handleZoomInput"
                        class="w-12 py-1 text-[10px] font-bold text-gray-600 bg-transparent hover:bg-white hover:shadow-sm rounded text-center transition-all focus:outline-none focus:ring-1 focus:ring-blue-300 focus:bg-white"
                        title="Enter zoom %"
                      />
                  </div>

                  <button @click="zoomIn" class="p-1.5 rounded-md text-gray-600 hover:bg-white hover:shadow-sm transition-all" title="Zoom In (+)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                  </button>

                  <button @click="resetZoom" class="p-1.5 rounded-md text-gray-600 hover:bg-white hover:shadow-sm transition-all ml-1" title="Fit to Screen (0)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                  </button>
              </div>
          </div>

          <!-- Right: Layering & View -->
          <div class="flex items-center gap-1">
              <button @click="handleBringToFront" :disabled="!selectedObject" class="p-2 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors" title="Bring to Front">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
              </button>
              <button @click="handleSendToBack" :disabled="!selectedObject" class="p-2 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors" title="Send to Back">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
              </button>
          </div>
      </header>

      <div class="flex-1 relative overflow-hidden flex flex-col pt-0">
         <CanvasEditor 
            class="flex-1 w-full h-full"
            ref="canvasEditorRef" 
            @selected="handleSelected" 
            @change="handleCanvasChange"
            @history-change="(state) => { canUndo = state.canUndo; canRedo = state.canRedo; }"
            @scale-change="(v) => canvasScale = v"
            @tool-change="(v) => toolMode = v"
            :width="selectedDisplay.width"  
            :height="selectedDisplay.height"
         />
      </div>

      <!-- New Status Bar (Device Controls) -->
      <footer class="h-10 bg-white border-t border-gray-200 flex items-center justify-between px-4 z-40 shrink-0 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
          <div class="flex items-center gap-4 text-xs text-gray-500 font-medium">
              <!-- Connection & Status -->
              <div class="flex items-center gap-1.5 min-w-[120px]">
                  <span :class="isConnected ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.4)]' : 'bg-red-400'" class="w-1.5 h-1.5 rounded-full transition-all duration-300"></span>
                  <span class="text-gray-600 truncate">{{ isConnected ? 'Connected' : 'Disconnected' }}</span>
              </div>
              
              <div class="w-px h-3 bg-gray-200"></div>
              
              <!-- Display Info (Compact) -->
              <div class="flex items-center gap-2 text-gray-400" :title="selectedDisplay.name">
                  <span class="text-gray-600">{{ selectedDisplay.name.split(' - ')[0] }}</span>
                  <span>/</span>
                  <span class="text-gray-600">{{ selectedColorMode.name.split(' (')[0] }}</span>
              </div>
          </div>

          <!-- Bottom Actions: Device Toolbar Only -->
          <div class="flex items-center gap-4">
              <DeviceToolbar 
                :is-connected="isConnected"
                :is-uploading="isUploading"
                v-model:selected-display="selectedDisplay"
                v-model:selected-color-mode="selectedColorMode"
                @connect="handleConnect"
                @upload="handleUpload"
                @open-settings="isSettingsOpen = true"
                @toggle-console="isConsoleOpen = !isConsoleOpen"
                class="scale-90 origin-right"
              />
          </div>
      </footer>
    </main>

    <!-- Right Sidebar: Properties & Layers (Docked but floating look) -->
    <aside class="w-72 h-full z-20 flex flex-col pointer-events-none p-4 pb-14">
        <div class="bg-white/90 backdrop-blur-xl border border-white/40 shadow-xl rounded-2xl flex-1 flex flex-col overflow-hidden pointer-events-auto">
            <!-- Properties Panel (Top Half) -->
            <div class="flex-[3] overflow-hidden border-b border-gray-100 flex flex-col">
              <PropertiesPanel
                  class="flex-1 overflow-y-auto"
                  :selected-object="selectedObject"
                  :selected-color-mode="selectedColorMode"
              />
            </div>
            
            <!-- Layers Panel (Bottom Half) -->
            <div class="flex-[2] overflow-hidden flex flex-col">
              <LayersPanel 
                :nodes="canvasNodes"
                :selected-id="selectedObject?.id"
                @select="(id) => canvasEditorRef?.selectById(id)"
                @delete="handleDeleteById"
              />
            </div>
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

/* Custom Scrollbar for a premium look */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}
</style>
