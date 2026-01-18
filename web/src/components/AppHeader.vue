<script setup>
const emit = defineEmits(['save', 'load']);
</script>

<template>
  <header class="h-16 flex items-center px-6 justify-between shrink-0 pointer-events-none z-20 absolute top-0 left-0 right-0">
    <!-- Branding -->
    <div class="flex items-center space-x-2 shrink-0 pointer-events-auto bg-white/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-sm mt-4 ml-4">
      <h1 class="font-bold text-lg tracking-tight text-gray-900 font-sans">
        EPaper<span class="text-red-500">Dash</span>
      </h1>
    </div>
    
    <!-- File Actions -->
    <div class="flex items-center gap-2 pointer-events-auto mt-4 mr-4">
       <button @click="$emit('save')" class="p-2 bg-white/70 backdrop-blur-md text-gray-700 border border-white/20 rounded-full hover:bg-white hover:text-gray-900 transition-all shadow-sm group" aria-label="Save Project" title="Save">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
      </button>

      <button @click="$emit('load')" class="p-2 bg-white/70 backdrop-blur-md text-gray-700 border border-white/20 rounded-full hover:bg-white hover:text-gray-900 transition-all shadow-sm group" aria-label="Load Project" title="Load">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      </button>
    </div>
  </header>
</template>
