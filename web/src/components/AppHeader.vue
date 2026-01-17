<script setup>
import { computed } from 'vue';
import { displayOptions, colorModes } from '../constants/displays';

const props = defineProps({
  isConnected: Boolean,
  isUploading: Boolean,
  selectedDisplay: Object,
  selectedColorMode: Object
});

const emit = defineEmits(['update:selectedDisplay', 'update:selectedColorMode', 'connect', 'upload', 'open-settings', 'save', 'load']);

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
        class="hidden md:block mr-2 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 transition-colors" 
        aria-label="Select Display Size"
      >
        <option v-for="opt in displayOptions" :key="opt.id" :value="opt">
          {{ opt.name }}
        </option>
      </select>

      <!-- Color Mode Selector -->
      <select 
        v-model="colorModeModel" 
        class="hidden md:block mr-2 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 transition-colors" 
        aria-label="Select Color Mode"
      >
        <option v-for="opt in colorModes" :key="opt.id" :value="opt">
          {{ opt.name }}
        </option>
      </select>

      <!-- Save/Load Buttons -->
       <button @click="$emit('save')" class="px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors shadow-sm flex items-center" aria-label="Save Project" title="Save">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 md:mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        <span class="hidden md:inline">Save</span>
      </button>

      <button @click="$emit('load')" class="px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors shadow-sm flex items-center" aria-label="Load Project" title="Load">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 md:mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <span class="hidden md:inline">Load</span>
      </button>

      <button @click="$emit('connect')" class="px-4 py-1.5 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800 font-medium transition-colors shadow-sm flex items-center space-x-2" aria-label="Connect Device">
         <!-- USB Icon -->
         <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
         </svg>
        <span class="hidden sm:inline">{{ isConnected ? 'Disconnect' : 'Connect' }}</span>
      </button>

      <button @click="$emit('open-settings')" :disabled="!isConnected" :class="{'opacity-50 cursor-not-allowed': !isConnected, 'hidden sm:flex': true}" class="px-4 py-1.5 bg-gray-100 text-gray-700 border border-gray-300 rounded-md text-sm hover:bg-gray-200 font-medium transition-colors shadow-sm items-center" aria-label="Device Settings" title="Settings">
         <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 md:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
         </svg>
         <span class="hidden md:inline">Settings</span>
      </button>

      <button @click="$emit('upload')" :disabled="isUploading || !isConnected" :class="{'opacity-50 cursor-not-allowed': isUploading || !isConnected}" class="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 font-medium transition-colors shadow-sm flex items-center" aria-label="Upload" title="Upload">
        <svg v-if="isUploading" class="animate-spin -ml-1 md:mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="hidden md:inline">Upload</span>
        <svg v-if="!isUploading" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 md:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      </button>
    </div>
  </header>
</template>
