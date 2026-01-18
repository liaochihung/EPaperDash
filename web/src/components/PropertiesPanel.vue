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
              <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Layout</h3>
              
              <!-- Position X/Y -->
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

              <!-- Size W/H (if applicable) -->
              <!-- For Text, Width/Height might be auto-calculated often, but we can allow overrides or at least show them -->
              <div class="grid grid-cols-2 gap-3">
                  <div>
                      <label for="prop-w" class="block text-xs text-gray-500 mb-1">Width</label>
                      <input id="prop-w" v-model.number="selectedObject.width" type="number" step="1" class="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                  </div>
                  <div>
                      <label for="prop-h" class="block text-xs text-gray-500 mb-1">Height</label>
                      <input id="prop-h" v-model.number="selectedObject.height" type="number" step="1" class="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                  </div>
              </div>

              <!-- Rotation -->
              <div>
                  <label for="prop-rotation" class="block text-xs text-gray-500 mb-1">Rotation (°)</label>
                  <div class="flex items-center gap-2">
                       <input id="prop-rotation" v-model.number="selectedObject.rotation" type="range" min="0" max="360" step="1" class="flex-1" />
                       <input v-model.number="selectedObject.rotation" type="number" class="w-14 px-1 py-1 bg-gray-50 border border-gray-200 rounded text-sm text-center" />
                  </div>
              </div>
          </div>

          <!-- Weather Properties -->
          <div v-if="selectedObject.nodeType === 'weather'" class="space-y-3 pt-3 border-t border-gray-100">
               <h3 class="text-xs font-semibold text-blue-500 uppercase tracking-wider block">Weather Data</h3>
               
               <div>
                  <label class="block text-xs text-gray-500 mb-1">Icon (Emoji)</label>
                  <input v-model="selectedObject.weatherIcon" type="text" class="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 transition-colors" placeholder="e.g. ☀️" />
               </div>

               <div>
                  <label class="block text-xs text-gray-500 mb-1">Temperature</label>
                  <input v-model="selectedObject.weatherTemp" type="text" class="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 transition-colors" placeholder="e.g. 25°C" />
               </div>

               <div>
                  <label class="block text-xs text-gray-500 mb-1">Details (Wind/Humidity)</label>
                  <textarea v-model="selectedObject.weatherDetails" rows="2" class="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none mb-1"></textarea>
                  <div class="text-[10px] text-gray-400">Supports multiline text</div>
               </div>
          </div>

          <!-- Text Properties -->
          <div v-if="selectedObject.type === 'Text'" class="space-y-3 pt-3 border-t border-gray-100">
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

          <!-- Shape Properties (Rect, Circle, Star, Line, Path, Arrow) -->
          <div v-if="['Rect', 'Circle', 'Star', 'Line', 'Path', 'Arrow'].includes(selectedObject.type)" class="space-y-3 pt-3 border-t border-gray-100">
              <h3 class="text-xs font-semibold text-purple-500 uppercase tracking-wider block">Shape Style</h3>
              
              <!-- Fill Color -->
              <div class="space-y-2">
                  <span class="block text-xs text-gray-500">Fill Color</span>
                  <div class="flex flex-wrap gap-2">
                      <button 
                        @click="selectedObject.fill = 'transparent'"
                        :class="{ 'ring-2 ring-blue-500 ring-offset-2': selectedObject.fill === 'transparent' }"
                        class="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 shadow-sm transition-all hover:scale-110 flex items-center justify-center bg-white"
                        title="Transparent"
                      >
                        <svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <button 
                        v-for="color in paletteMap[selectedColorMode.id]" 
                        :key="'fill-' + color"
                        @click="selectedObject.fill = color"
                        :style="{ backgroundColor: color }"
                        :class="{ 'ring-2 ring-blue-500 ring-offset-2': selectedObject.fill === color }"
                        class="w-6 h-6 rounded-full border border-gray-200 shadow-sm transition-all hover:scale-110"
                        :title="color"
                      ></button>
                  </div>
              </div>

              <!-- Stroke Color -->
              <div class="space-y-2">
                  <span class="block text-xs text-gray-500">Stroke Color</span>
                  <div class="flex flex-wrap gap-2">
                      <button 
                        v-for="color in paletteMap[selectedColorMode.id]" 
                        :key="'stroke-' + color"
                        @click="selectedObject.stroke = color"
                        :style="{ backgroundColor: color }"
                        :class="{ 'ring-2 ring-blue-500 ring-offset-2': selectedObject.stroke === color }"
                        class="w-6 h-6 rounded-full border border-gray-200 shadow-sm transition-all hover:scale-110"
                        :title="color"
                      ></button>
                  </div>
              </div>

              <!-- Stroke Width -->
              <div>
                  <label class="block text-xs text-gray-500 mb-1">Stroke Width</label>
                  <div class="flex items-center gap-2">
                       <input v-model.number="selectedObject.strokeWidth" type="range" min="0" max="20" step="1" class="flex-1" />
                       <input v-model.number="selectedObject.strokeWidth" type="number" min="0" class="w-12 px-1 py-1 bg-gray-50 border border-gray-200 rounded text-sm text-center" />
                  </div>
              </div>

              <!-- Line Style -->
              <div>
                  <label class="block text-xs text-gray-500 mb-1">Line Style</label>
                  <select v-model="selectedObject.dashStyle" class="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 transition-colors">
                      <option value="">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted">Dotted</option>
                      <option value="dash-dot">Dash-Dot</option>
                  </select>
              </div>
          </div>
          
           <div class="pt-4 border-t border-gray-100">
               <div class="flex flex-col gap-1">
                   <div class="text-[10px] text-gray-400 font-mono">ID: {{ selectedObject.id }}</div>
                   <div class="text-[10px] text-gray-400 font-mono">Type: {{ selectedObject.type }} / {{ selectedObject.nodeType }}</div>
               </div>
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
