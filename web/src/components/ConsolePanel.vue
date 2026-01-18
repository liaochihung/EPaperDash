<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps({
  isOpen: Boolean,
  logs: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['close', 'clear']);

const logsContainerRef = ref(null);

watch(() => props.logs.length, () => {
    if (props.isOpen) {
        scrollToBottom();
    }
});

watch(() => props.isOpen, (newVal) => {
    if (newVal) {
        scrollToBottom();
    }
});

const scrollToBottom = () => {
    nextTick(() => {
        if (logsContainerRef.value) {
            logsContainerRef.value.scrollTop = logsContainerRef.value.scrollHeight;
        }
    });
};
</script>

<template>
  <div 
    v-if="isOpen"
    class="fixed bottom-0 left-0 right-0 h-64 bg-gray-900 border-t border-gray-700 shadow-lg z-30 flex flex-col font-mono text-sm"
  >
    <!-- Toolbar -->
    <div class="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
      <div class="text-gray-300 font-bold flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Serial Monitor
      </div>
      <div class="flex items-center gap-2">
        <button 
          @click="$emit('clear')" 
          class="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition"
        >
          Clear
        </button>
        <button 
          @click="$emit('close')" 
          class="text-gray-400 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Log Content -->
    <div 
        ref="logsContainerRef"
        class="flex-1 overflow-y-auto p-4 space-y-1 text-green-400 bg-gray-900"
    >
      <div v-if="logs.length === 0" class="text-gray-600 italic">No output...</div>
      <div v-for="(log, index) in logs" :key="index" class="whitespace-pre-wrap break-all border-b border-gray-800/50 pb-0.5 last:border-0">
        <span class="text-gray-500 mr-2">[{{ log.time }}]</span>
        <span>{{ log.text }}</span>
      </div>
    </div>
  </div>
</template>
