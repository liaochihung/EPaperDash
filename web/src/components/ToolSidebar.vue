<script setup>
import { ref } from 'vue';

const emit = defineEmits([
    'add-text', 'add-image', 'add-time', 'add-date', 'add-weather', 
    'add-rect', 'add-circle', 'add-battery',
    // Weather sub-components
    'add-weather-temp', 'add-weather-humidity', 'add-weather-wind', 'add-weather-precip', 'add-weather-icon'
]);
const fileInput = ref(null);

// Accordion State
const openCategories = ref({
    basic: true,
    data: true,
    media: true
});

const toggleCategory = (cat) => {
    openCategories.value[cat] = !openCategories.value[cat];
};

const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => emit('add-image', evt.target.result);
        reader.readAsDataURL(file);
    }
    e.target.value = '';
};

// Drag Start Handler
const handleDragStart = (e, type, payload = null) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type, payload }));
    e.dataTransfer.effectAllowed = 'copy';
};
</script>

<template>
    <aside class="w-60 bg-white border-r border-gray-200 flex flex-col z-10 shrink-0 h-full shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        
        <!-- Helper Title -->
        <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Components</span>
        </div>

        <div class="flex-1 overflow-y-auto custom-scrollbar">
            
            <!-- Category: Basic -->
            <div class="border-b border-gray-100">
                <button @click="toggleCategory('basic')" class="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                    <span class="text-sm font-semibold text-gray-700">Basic</span>
                    <svg class="w-4 h-4 text-gray-400 transition-transform duration-200" :class="{ 'rotate-180': !openCategories.basic }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                
                <div v-show="openCategories.basic" class="grid grid-cols-2 gap-2 p-3 bg-gray-50/50 transition-all">
                    <div 
                        class="h-20 bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5"
                        draggable="true"
                        @dragstart="(e) => handleDragStart(e, 'text')"
                        @click="$emit('add-text')"
                    >
                        <span class="font-serif font-bold text-2xl text-gray-800 mb-1">T</span>
                        <span class="text-[10px] text-gray-500 uppercase font-medium">Text</span>
                    </div>

                    <div 
                        class="h-20 bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5"
                        draggable="true"
                        @dragstart="(e) => handleDragStart(e, 'rect')"
                        @click="$emit('add-rect')" 
                    >
                        <div class="w-8 h-5 border-2 border-gray-800 mb-1"></div>
                        <span class="text-[10px] text-gray-500 uppercase font-medium">Rect</span>
                    </div>

                    <div 
                        class="h-20 bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5"
                        draggable="true"
                        @dragstart="(e) => handleDragStart(e, 'circle')"
                        @click="$emit('add-circle')" 
                    >
                        <div class="w-6 h-6 border-2 border-gray-800 rounded-full mb-1"></div>
                        <span class="text-[10px] text-gray-500 uppercase font-medium">Circle</span>
                    </div>

                    <div 
                        class="h-20 bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5"
                        draggable="true"
                        @dragstart="(e) => handleDragStart(e, 'battery')"
                        @click="$emit('add-battery')" 
                    >
                        <!-- Simple Battery Icon -->
                        <svg class="h-6 w-6 text-gray-800 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18v-2a6 6 0 016-6v0a6 6 0 016 6v2a6 6 0 01-6 6v0a6 6 0 01-6-6zm-6-2v2a6 6 0 016 6v0a6 6 0 016-6v-2a6 6 0 01-6-6v0a6 6 0 01-6 6z" style="display:none" /> 
                           <!-- Real Battery Path -->
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10V6a2 2 0 012-2h10a2 2 0 012 2v4M3 14v4a2 2 0 002 2h10a2 2 0 002-2v-4M21 10v4" />
                        </svg>
                        <span class="text-[10px] text-gray-500 uppercase font-medium">Battery</span>
                    </div>
                </div>
            </div>

            <!-- Category: Live Data -->
            <div class="border-b border-gray-100">
                <button @click="toggleCategory('data')" class="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                    <span class="text-sm font-semibold text-gray-700">Live Data</span>
                    <svg class="w-4 h-4 text-gray-400 transition-transform duration-200" :class="{ 'rotate-180': !openCategories.data }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                <div v-show="openCategories.data" class="grid grid-cols-2 gap-2 p-3 bg-gray-50/50">
                    
                    <div 
                        class="h-20 bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5"
                        draggable="true"
                        @dragstart="(e) => handleDragStart(e, 'time')"
                        @click="$emit('add-time')"
                    >
                        <span class="text-lg font-mono font-bold text-gray-800 mb-1">12:30</span>
                        <span class="text-[10px] text-gray-500 uppercase font-medium">Time</span>
                    </div>

                    <div 
                        class="h-20 bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5"
                        draggable="true"
                        @dragstart="(e) => handleDragStart(e, 'date')"
                        @click="$emit('add-date')"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-700 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span class="text-[10px] text-gray-500 uppercase font-medium">Date</span>
                    </div>

                    <div 
                        class="h-20 bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5"
                        draggable="true"
                        @dragstart="(e) => handleDragStart(e, 'weather')"
                        @click="$emit('add-weather')"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-700 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                        </svg>
                        <span class="text-[10px] text-gray-500 uppercase font-medium">Weather</span>
                    </div>

                    <!-- Weather Sub-Components -->
                    <div 
                        class="h-20 bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center hover:border-orange-400 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5"
                        draggable="true"
                        @dragstart="(e) => handleDragStart(e, 'weather-temp')"
                        @click="$emit('add-weather-temp')"
                    >
                        <span class="text-lg font-bold text-orange-500 mb-1">°C</span>
                        <span class="text-[10px] text-gray-500 uppercase font-medium">Temp</span>
                    </div>

                    <div 
                        class="h-20 bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5"
                        draggable="true"
                        @dragstart="(e) => handleDragStart(e, 'weather-humidity')"
                        @click="$emit('add-weather-humidity')"
                    >
                        <span class="text-xl mb-1">💧</span>
                        <span class="text-[10px] text-gray-500 uppercase font-medium">Humidity</span>
                    </div>

                    <div 
                        class="h-20 bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center hover:border-green-400 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5"
                        draggable="true"
                        @dragstart="(e) => handleDragStart(e, 'weather-wind')"
                        @click="$emit('add-weather-wind')"
                    >
                        <span class="text-xl mb-1">🍃</span>
                        <span class="text-[10px] text-gray-500 uppercase font-medium">Wind</span>
                    </div>

                    <div 
                        class="h-20 bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5"
                        draggable="true"
                        @dragstart="(e) => handleDragStart(e, 'weather-precip')"
                        @click="$emit('add-weather-precip')"
                    >
                        <span class="text-xl mb-1">☔</span>
                        <span class="text-[10px] text-gray-500 uppercase font-medium">Precip</span>
                    </div>
                </div>
            </div>

            <!-- Category: Media -->
            <div class="border-b border-gray-100">
                <button @click="toggleCategory('media')" class="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                    <span class="text-sm font-semibold text-gray-700">Media</span>
                    <svg class="w-4 h-4 text-gray-400 transition-transform duration-200" :class="{ 'rotate-180': !openCategories.media }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                <div v-show="openCategories.media" class="grid grid-cols-2 gap-2 p-3 bg-gray-50/50">
                    <button 
                        @click="fileInput.click()"
                        class="h-20 bg-white border border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-all text-gray-400 hover:text-blue-500"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span class="text-[10px] uppercase font-medium">Upload Img</span>
                    </button>
                    <input type="file" ref="fileInput" accept="image/*" class="hidden" @change="handleFileSelect" />
                </div>
            </div>

        </div>
    </aside>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #e5e7eb;
}
</style>
