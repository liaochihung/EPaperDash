<script setup>
import { ref } from 'vue';

const emit = defineEmits(['add-text', 'add-image']);
const fileInput = ref(null);

const handleAddImageClick = () => {
    fileInput.value?.click();
};

const onFileSelected = (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            emit('add-image', e.target.result);
        };
        reader.readAsDataURL(file);
    }
    // Reset input
    event.target.value = '';
};
</script>

<template>
    <aside class="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 space-y-4 shadow-sm z-10 shrink-0" aria-label="Toolbox">
      <input type="file" ref="fileInput" accept="image/*" class="hidden" @change="onFileSelected" />
      <div class="font-bold text-[0.6rem] text-center mb-2 text-gray-500 uppercase">Tools</div>
      
      <button @click="$emit('add-text')" class="w-10 h-10 rounded hover:bg-gray-100 flex items-center justify-center border border-transparent hover:border-gray-300 transition-colors group relative" aria-label="Add Text" title="Add Text">
        <span class="font-serif font-bold text-xl" aria-hidden="true">T</span>
      </button>
      
      <button @click="handleAddImageClick" class="w-10 h-10 rounded hover:bg-gray-100 flex items-center justify-center border border-transparent hover:border-gray-300 transition-colors group relative" aria-label="Add Image" title="Add Image">
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
</template>
