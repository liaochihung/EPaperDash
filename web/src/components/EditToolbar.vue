<script setup>
const props = defineProps({
  canUndo: { type: Boolean, default: false },
  canRedo: { type: Boolean, default: false }
});
const emit = defineEmits(['toggle-grid', 'bring-to-front', 'send-to-back', 'copy', 'delete', 'undo', 'redo', 'select-all']);
</script>

<template>
  <div class="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-2 shadow-sm">
    <div class="text-sm font-medium text-gray-600 mr-2">Edit:</div>
    
    <!-- Undo -->
    <button 
      @click="$emit('undo')" 
      class="px-2 py-1.5 rounded flex items-center gap-1.5 border border-transparent transition-colors text-sm"
      :class="canUndo ? 'hover:bg-gray-100 hover:border-gray-300 text-gray-800' : 'opacity-40 cursor-not-allowed text-gray-400'"
      :disabled="!canUndo"
      title="Undo (Ctrl+Z)"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    </button>

    <!-- Redo -->
    <!-- Redo -->
    <button 
      @click="$emit('redo')" 
      class="px-2 py-1.5 rounded flex items-center gap-1.5 border border-transparent transition-colors text-sm"
      :class="canRedo ? 'hover:bg-gray-100 hover:border-gray-300 text-gray-800' : 'opacity-40 cursor-not-allowed text-gray-400'"
      :disabled="!canRedo"
      title="Redo (Ctrl+Y)"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
      </svg>
    </button>

    <div class="w-px h-6 bg-gray-300"></div>
    
    <!-- Grid Toggle -->
    <button @click="$emit('toggle-grid')" class="px-3 py-1.5 rounded hover:bg-gray-100 flex items-center gap-1.5 border border-transparent hover:border-gray-300 transition-colors text-sm" title="Toggle Grid (Ctrl+')">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
      </svg>
      <span>Grid</span>
    </button>

    <div class="w-px h-6 bg-gray-300"></div>

    <!-- Bring to Front -->
    <button @click="$emit('bring-to-front')" class="px-3 py-1.5 rounded hover:bg-gray-100 flex items-center gap-1.5 border border-transparent hover:border-gray-300 transition-colors text-sm" title="Bring to Front (Ctrl+])">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
      </svg>
      <span>Front</span>
    </button>

    <!-- Send to Back -->
    <button @click="$emit('send-to-back')" class="px-3 py-1.5 rounded hover:bg-gray-100 flex items-center gap-1.5 border border-transparent hover:border-gray-300 transition-colors text-sm" title="Send to Back (Ctrl+[)">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
      </svg>
      <span>Back</span>
    </button>

    <div class="w-px h-6 bg-gray-300"></div>

    <div class="w-px h-6 bg-gray-300"></div>
    
    <!-- Select All -->
    <button @click="$emit('select-all')" class="px-3 py-1.5 rounded hover:bg-gray-100 flex items-center gap-1.5 border border-transparent hover:border-gray-300 transition-colors text-sm" title="Select All (Ctrl+A)">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
      <span>All</span>
    </button>
    
    <!-- Copy -->
    <button @click="$emit('copy')" class="px-3 py-1.5 rounded hover:bg-gray-100 flex items-center gap-1.5 border border-transparent hover:border-gray-300 transition-colors text-sm" title="Copy (Ctrl+D)">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      <span>Copy</span>
    </button>

    <!-- Delete -->
    <button @click="$emit('delete')" class="px-3 py-1.5 rounded hover:bg-gray-100 flex items-center gap-1.5 border border-transparent hover:border-gray-300 transition-colors text-sm text-red-600 hover:bg-red-50" title="Delete (Del)">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      <span>Delete</span>
    </button>
  </div>
</template>
