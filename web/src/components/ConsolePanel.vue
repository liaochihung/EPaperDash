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
    class="fixed bottom-0 left-0 right-0 h-64 bg-gray-900/90 backdrop-blur-md border-t border-gray-700 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] z-50 flex flex-col font-mono text-xs transition-transform duration-300 ease-out"
    :class="isOpen ? 'translate-y-0' : 'translate-y-full'"
  >
    <!-- Handle for resizing or just visual grip -->
    <div class="h-1 bg-gray-800 w-full cursor-ns-resize hover:bg-blue-500/50 transition-colors"></div>

    <!-- Toolbar -->
    <div class="flex items-center justify-between px-4 py-2 bg-gray-800/80 border-b border-gray-700/50 shrink-0">
      <div class="text-gray-300 font-bold flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        <span class="tracking-wider uppercase text-[10px]">Serial Monitor</span>
      </div>
      <div class="flex items-center gap-2">
        <button 
          @click="$emit('clear')" 
          class="px-2 py-1 text-[10px] uppercase tracking-wider text-gray-400 hover:text-white hover:bg-white/10 rounded transition"
        >
          Clear
        </button>
        <button 
          @click="$emit('close')" 
          class="text-gray-400 hover:text-white p-1 hover:bg-white/10 rounded transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Log Content -->
    <div 
        ref="logsContainerRef"
        class="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-xs custom-scrollbar"
    >
      <div v-if="logs.length === 0" class="text-gray-600 italic flex items-center justify-center h-full opacity-50">
          <span>Ready for output...</span>
      </div>
      <div v-for="(log, index) in logs" :key="index" class="whitespace-pre-wrap break-all border-b border-gray-800/30 pb-0.5 last:border-0 hover:bg-white/5 transition-colors font-mono">
        <span class="text-gray-600 mr-2 select-none">[{{ log.time }}]</span>
        <span class="text-gray-300">{{ log.text }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  background: #111827;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #374151;
  border-radius: 3px;
}
</style>
