<script setup>
import { computed } from 'vue';
import { displayOptions, colorModes } from '../constants/displays';

const props = defineProps({
  isConnected: Boolean,
  isUploading: Boolean,
  selectedDisplay: Object,
  selectedColorMode: Object
});

const emit = defineEmits(['update:selectedDisplay', 'update:selectedColorMode', 'connect', 'upload']);

const displayModel = computed({
  get: () => props.selectedDisplay,
  set: (val) => emit('update:selectedDisplay', val)
});

const colorModeModel = computed({
  get: () => props.selectedColorMode,
  set: (val) => emit('update:selectedColorMode', val)
});
</script>

<template>
  <header class="h-14 bg-white border-b border-gray-200 flex items-center px-6 justify-between shadow-sm z-20 shrink-0">
    <div class="flex items-center space-x-2">
      <h1 class="font-bold text-xl tracking-tight bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">EPaperDash</h1>
    </div>
    
    <div class="flex items-center space-x-3">
      <div class="text-xs text-gray-400 mr-2 flex items-center">
        <span :class="isConnected ? 'bg-green-400' : 'bg-red-400'" class="w-2 h-2 rounded-full mr-1 transition-colors"></span> 
        {{ isConnected ? 'Connected' : 'Disconnected' }}
      </div>
      
      <!-- Display Selector -->
      <select 
        v-model="displayModel" 
        class="mr-2 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 transition-colors" 
        aria-label="Select Display Size"
      >
        <option v-for="opt in displayOptions" :key="opt.id" :value="opt">
          {{ opt.name }}
        </option>
      </select>

      <!-- Color Mode Selector -->
      <select 
        v-model="colorModeModel" 
        class="mr-2 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 transition-colors" 
        aria-label="Select Color Mode"
      >
        <option v-for="opt in colorModes" :key="opt.id" :value="opt">
          {{ opt.name }}
        </option>
      </select>

      <button @click="$emit('connect')" class="px-4 py-1.5 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800 font-medium transition-colors shadow-sm flex items-center space-x-2" aria-label="Connect Device">
         <!-- USB Icon -->
         <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
         </svg>
        <span>{{ isConnected ? 'Disconnect' : 'Connect Device' }}</span>
      </button>

      <button @click="$emit('upload')" :disabled="isUploading || !isConnected" :class="{'opacity-50 cursor-not-allowed': isUploading || !isConnected}" class="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 font-medium transition-colors shadow-sm flex items-center" aria-label="Upload">
        <svg v-if="isUploading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Upload</span>
      </button>
    </div>
  </header>
</template>
