<script setup>
import { ref, watch } from 'vue';
import CanvasEditor from './components/CanvasEditor.vue';
import { useWebSerial } from './composables/useWebSerial';
import { dataURLtoImageData, floydSteinbergDithering, pack1Bit } from './utils/imageProcessing';

const canvasEditorRef = ref(null);
const selectedObject = ref(null);
const { isConnected, connect, disconnect, sendBinary } = useWebSerial();
const isUploading = ref(false);

const displayOptions = [
    // 1.02" to 1.54"
    { id: 'GxEPD2_102', name: '1.02" (80x128) - GDEW0102T4', width: 80, height: 128 },
    { id: 'GxEPD2_150_BN', name: '1.50" (200x200) - DEPG0150BN', width: 200, height: 200 },
    { id: 'GxEPD2_154', name: '1.54" (200x200) - GDEP015OC1/D67/GDEY', width: 200, height: 200 },
    { id: 'GxEPD2_154_T8', name: '1.54" (152x152) - GDEW0154T8/M10', width: 152, height: 152 },
    
    // 2.13"
    { id: 'GxEPD2_213', name: '2.13" (122x250) - GDE0213B1/B72/B73/B74/BN', width: 122, height: 250 },
    { id: 'GxEPD2_213_flex', name: '2.13" (104x212) - GDEW0213I5F/M21/T5D', width: 104, height: 212 },

    // 2.6" to 2.9"
    { id: 'GxEPD2_260', name: '2.60" (152x296) - GDEW026T0/M01', width: 152, height: 296 },
    { id: 'GxEPD2_266_BN', name: '2.66" (152x296) - DEPG0266BN/GDEY', width: 152, height: 296 },
    { id: 'GxEPD2_270', name: '2.70" (176x264) - GDEW027W3/GDEY', width: 176, height: 264 },
    { id: 'GxEPD2_290', name: '2.90" (128x296) - GDEH029A1/T5/T5D/T94', width: 128, height: 296 },
    { id: 'GxEPD2_290_GDEY029T71H', name: '2.90" (168x384) - GDEY029T71H', width: 168, height: 384 },
    { id: 'GxEPD2_300c', name: '3.00" (400x300) - Waveshare 3.0"', width: 400, height: 300 },
    
    // 3.7" +
    { id: 'GxEPD2_370', name: '3.70" (240x416) - GDEY037T03/W7', width: 240, height: 416 },
    { id: 'GxEPD2_370_TC1', name: '3.70" (280x480) - ED037TC1', width: 280, height: 480 },
    { id: 'GxEPD2_397', name: '3.97" (480x800) - GDEM0397T81', width: 480, height: 800 },
    { id: 'GxEPD2_420', name: '4.20" (400x300) - GDEW042T2/M01/GDEY', width: 400, height: 300 },
    { id: 'GxEPD2_426', name: '4.26" (480x800) - GDEQ0426T82', width: 480, height: 800 },
    
    // 5.83" +
    { id: 'GxEPD2_579', name: '5.79" (792x272) - GDEY0579T93', width: 792, height: 272 },
    { id: 'GxEPD2_583', name: '5.83" (600x448) - GDEW0583T7', width: 600, height: 448 },
    { id: 'GxEPD2_583_T8', name: '5.83" (648x480) - GDEW0583T8/T31/Z83', width: 648, height: 480 },
    
    // 7.5" +
    { id: 'GxEPD2_750', name: '7.50" (640x384) - GDEW075T8', width: 640, height: 384 },
    { id: 'GxEPD2_750_T7', name: '7.50" (800x480) - GDEW075T7', width: 800, height: 480 },
    { id: 'GxEPD2_750c_Z90', name: '7.50" (880x528) - GDEH075Z90', width: 880, height: 528 },
    
    // Large
    { id: 'GxEPD2_1020', name: '10.2" (960x640) - GDEM102T91', width: 960, height: 640 },
    { id: 'GxEPD2_1160', name: '11.6" (960x640) - GDEH116T91', width: 960, height: 640 },
    { id: 'GxEPD2_1248', name: '12.48" (1304x984) - GDEW1248T3', width: 1304, height: 984 },
    { id: 'GxEPD2_1330', name: '13.3" (960x680) - GDEM133T91', width: 960, height: 680 },
];
const selectedDisplay = ref(displayOptions.find(d => d.width === 648) || displayOptions[0]); // Default to user's 5.83"

const colorModes = [
    { id: '1bit', name: 'BW (1-bit)' },
    { id: '3c', name: 'BWR (3-Color)' },
    { id: '4c', name: '4-Color' },
    { id: '7c', name: '7-Color' },
];
const selectedColorMode = ref(colorModes[0]);

const handleAddText = () => {
    canvasEditorRef.value?.addText();
};

const handleAddImage = () => {
    canvasEditorRef.value?.addImage();
};

const handleSelected = (obj) => {
    // Clone to avoid direct mutation issues
    selectedObject.value = obj ? { ...obj } : null;
};

const handleConnect = async () => {
    if (isConnected.value) {
        await disconnect();
    } else {
        await connect();
    }
};

const handleUpload = async () => {
    if (!isConnected.value) {
        alert("Please connect to the device first.");
        return;
    }
    
    if (!canvasEditorRef.value) return;
    
    isUploading.value = true;
    try {
        console.log("Generating image...");
        const dataURL = canvasEditorRef.value.getDataURL();
        
        console.log("Converting to ImageData...");
        const imageData = await dataURLtoImageData(dataURL);
        
        console.log("Dithering...");
        floydSteinbergDithering(imageData);
        
        console.log("Packing bits...");
        const binaryData = pack1Bit(imageData);
        
        console.log("Sending " + binaryData.length + " bytes...");
        // Send Magic Header? Or just raw data for now?
        // Let's send a simple header: 'EPD' + Width(2) + Height(2) ?
        // For MVP, if firmware expects just raw 800*480/8 = 48000 bytes, send raw.
        // Let's assume firmware expects raw stream for now.
        
        await sendBinary(binaryData);
        console.log("Upload complete!");
        alert("Upload Complete!");
    } catch (e) {
        console.error("Upload failed", e);
        alert("Upload Failed: " + e.message);
    } finally {
        isUploading.value = false;
    }
};

// Watch for property changes in the side panel and update canvas
watch(selectedObject, (newVal) => {
    if (newVal && canvasEditorRef.value) {
        canvasEditorRef.value.updateNode(newVal.id, {
            x: Number(newVal.x),
            y: Number(newVal.y),
            text: newVal.text,
            fontSize: Number(newVal.fontSize),
            width: Number(newVal.width),
            height: Number(newVal.height),
        });
    }
}, { deep: true });
</script>

<template>
  <div class="flex h-screen w-screen bg-gray-50 text-gray-800 font-sans overflow-hidden">
    <!-- Left Sidebar: Tools -->
    <aside class="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 space-y-4 shadow-sm z-10 shrink-0">
      <div class="font-bold text-[0.6rem] text-center mb-2 text-gray-500 uppercase">Tools</div>
      
      <button @click="handleAddText" class="w-10 h-10 rounded hover:bg-gray-100 flex items-center justify-center border border-transparent hover:border-gray-300 transition-colors group relative" aria-label="Add Text" title="Add Text">
        <span class="font-serif font-bold text-xl">T</span>
      </button>
      
      <button @click="handleAddImage" class="w-10 h-10 rounded hover:bg-gray-100 flex items-center justify-center border border-transparent hover:border-gray-300 transition-colors group relative" aria-label="Add Image" title="Add Image">
         <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
      </button>

      <button class="w-10 h-10 rounded hover:bg-gray-100 flex items-center justify-center border border-transparent hover:border-gray-300 transition-colors group relative" aria-label="Shapes" title="Shapes">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      </button>
    </aside>

    <!-- Center: Workspace -->
    <main class="flex-1 flex flex-col relative min-w-0">
      <!-- Topbar -->
      <header class="h-14 bg-white border-b border-gray-200 flex items-center px-6 justify-between shadow-sm z-20">
        <div class="flex items-center space-x-2">
            <h1 class="font-bold text-xl tracking-tight bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">EPaperDash</h1>
        </div>
        
        <div class="flex items-center space-x-3">
             <div class="text-xs text-gray-400 mr-2 flex items-center">
                <span :class="isConnected ? 'bg-green-400' : 'bg-red-400'" class="w-2 h-2 rounded-full mr-1 transition-colors"></span> 
                {{ isConnected ? 'Connected' : 'Disconnected' }}
             </div>
             
             <!-- Display Selector -->
             <select v-model="selectedDisplay" class="mr-2 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 transition-colors" aria-label="Select Display Size">
                <option v-for="opt in displayOptions" :key="opt.id" :value="opt">
                    {{ opt.name }}
                </option>
             </select>

             <!-- Color Mode Selector -->
             <select v-model="selectedColorMode" class="mr-2 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 transition-colors" aria-label="Select Color Mode">
                <option v-for="opt in colorModes" :key="opt.id" :value="opt">
                    {{ opt.name }}
                </option>
             </select>

            <button @click="handleConnect" class="px-4 py-1.5 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800 font-medium transition-colors shadow-sm flex items-center space-x-2" aria-label="Connect Device">
                 <!-- USB Icon -->
                 <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                 </svg>
                <span>{{ isConnected ? 'Disconnect' : 'Connect Device' }}</span>
            </button>
            <button @click="handleUpload" :disabled="isUploading || !isConnected" :class="{'opacity-50 cursor-not-allowed': isUploading || !isConnected}" class="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 font-medium transition-colors shadow-sm flex items-center" aria-label="Upload">
                <svg v-if="isUploading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Upload</span>
            </button>
        </div>
      </header>
      
      <!-- Canvas Area -->
      <div class="flex-1 relative overflow-hidden bg-gray-100 flex items-center justify-center p-4">
         <!-- This container handles the infinite bg feeling -->
         <CanvasEditor 
            ref="canvasEditorRef" 
            @selected="handleSelected" 
            :width="selectedDisplay.width" 
            :height="selectedDisplay.height"
         />
      </div>
    </main>

    <!-- Right Sidebar: Properties -->
    <aside class="w-72 bg-white border-l border-gray-200 shadow-sm z-10 flex flex-col shrink-0 overflow-y-auto">
      <div class="h-10 border-b border-gray-100 flex items-center px-4 bg-gray-50/50">
        <h2 class="font-bold text-xs text-gray-500 uppercase tracking-wide">Properties</h2>
      </div>
      
      <div v-if="selectedObject" class="p-4 space-y-6">
          
          <!-- Common Properties -->
          <div class="space-y-3">
              <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Position</label>
              <div class="grid grid-cols-2 gap-3">
                  <div>
                      <label for="prop-x" class="block text-xs text-gray-500 mb-1">X</label>
                      <input id="prop-x" v-model="selectedObject.x" type="number" class="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                  </div>
                  <div>
                      <label for="prop-y" class="block text-xs text-gray-500 mb-1">Y</label>
                      <input id="prop-y" v-model="selectedObject.y" type="number" class="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                  </div>
              </div>
          </div>

          <!-- Text Properties -->
          <div v-if="selectedObject.type === 'Text'" class="space-y-3">
              <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Typography</label>
               <div>
                  <label for="prop-content" class="block text-xs text-gray-500 mb-1">Content</label>
                  <textarea id="prop-content" v-model="selectedObject.text" rows="3" class="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"></textarea>
              </div>
               <div>
                  <label for="prop-fontsize" class="block text-xs text-gray-500 mb-1">Font Size</label>
                   <input id="prop-fontsize" v-model="selectedObject.fontSize" type="number" class="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
          </div>
          
           <div class="pt-4 border-t border-gray-100">
               <div class="text-xs text-gray-400">ID: {{ selectedObject.id }}</div>
           </div>

      </div>

      <div v-else class="p-6 flex-1 flex flex-col items-center justify-center text-center text-gray-400 opacity-60">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
           <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span class="text-sm">Select an object to edit</span>
      </div>
    </aside>
  </div>
</template>

<style>
/* Global resets if needed */
body {
    margin: 0;
    overflow: hidden; /* Prevent native scroll */
}
</style>
