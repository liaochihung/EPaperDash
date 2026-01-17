<script setup>
import { paletteMap } from '../constants/displays';

defineProps({
  selectedObject: Object,
  selectedColorMode: Object
});
</script>

<template>
    <aside class="w-72 bg-white border-l border-gray-200 shadow-sm z-10 flex flex-col shrink-0 overflow-y-auto" aria-label="Properties Panel">
      <div class="h-10 border-b border-gray-100 flex items-center px-4 bg-gray-50/50">
        <h2 class="font-bold text-xs text-gray-500 uppercase tracking-wide">Properties</h2>
      </div>
      
      <div v-if="selectedObject" class="p-4 space-y-6">
          
          <!-- Common Properties -->
          <div class="space-y-3">
              <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Position</h3>
              <div class="grid grid-cols-2 gap-3">
                  <div>
                      <label for="prop-x" class="block text-xs text-gray-500 mb-1">X</label>
                      <input id="prop-x" v-model.number="selectedObject.x" type="number" step="1" class="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                  </div>
                  <div>
                      <label for="prop-y" class="block text-xs text-gray-500 mb-1">Y</label>
                      <input id="prop-y" v-model.number="selectedObject.y" type="number" step="1" class="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                  </div>
              </div>
          </div>

          <!-- Text Properties -->
          <div v-if="selectedObject.type === 'Text'" class="space-y-3">
              <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Typography</h3>
               <div>
                  <label for="prop-content" class="block text-xs text-gray-500 mb-1">Content</label>
                  <textarea id="prop-content" v-model="selectedObject.text" rows="3" class="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"></textarea>
              </div>
               <div>
                  <label for="prop-fontsize" class="block text-xs text-gray-500 mb-1">Font Size</label>
                   <input id="prop-fontsize" v-model.number="selectedObject.fontSize" type="number" step="1" class="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
               <!-- Color Palette -->
               <div class="space-y-2">
                  <span class="block text-xs text-gray-500">Color</span>
                  <div class="flex flex-wrap gap-2">
                      <button 
                        v-for="color in paletteMap[selectedColorMode.id]" 
                        :key="color"
                        @click="selectedObject.fill = color"
                        :style="{ backgroundColor: color }"
                        :class="{ 'ring-2 ring-blue-500 ring-offset-2': selectedObject.fill === color }"
                        class="w-6 h-6 rounded-full border border-gray-200 shadow-sm transition-all hover:scale-110"
                        :title="color"
                      ></button>
                  </div>
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
</template>
