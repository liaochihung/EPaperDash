<script setup>
const props = defineProps({
  nodes: {
    type: Array,
    default: () => []
  },
  selectedId: String
});

const emit = defineEmits(['select', 'delete', 'toggle-visible']);

const getNodeLabel = (node) => {
  if (node.nodeType === 'time') return 'Time Widget';
  if (node.nodeType === 'date') return 'Date Widget';
  if (node.nodeType.startsWith('weather')) {
      const parts = node.nodeType.split('-');
      return `Weather ${parts[1] || 'Info'}`;
  }
  return `${node.type} (${node.id.split('-')[1]?.slice(-4) || node.id})`;
};

const getNodeIcon = (node) => {
  if (node.type === 'Text') return 'T';
  if (node.type === 'Rect') return '□';
  if (node.type === 'Circle') return '○';
  if (node.type === 'Star') return '☆';
  if (node.type === 'Line') return '╱';
  if (node.type === 'Arrow') return '→';
  if (node.type === 'Image') return '圖';
  return '•';
};
</script>

<template>
  <div class="flex flex-col h-full bg-white border-t border-gray-100 overflow-hidden">
    <div class="h-10 border-b border-gray-100 flex items-center px-4 bg-gray-50/50">
      <h2 class="font-bold text-xs text-gray-500 uppercase tracking-wide">Layers</h2>
      <span class="ml-auto text-[10px] text-gray-400 font-mono">{{ nodes.length }} items</span>
    </div>
    
    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      <div 
        v-for="node in nodes" 
        :key="node.id"
        @click="emit('select', node.id)"
        :class="[
          'group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all border',
          selectedId === node.id 
            ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
            : 'border-transparent hover:bg-gray-50 text-gray-600'
        ]"
      >
        <!-- Icon -->
        <span class="w-6 h-6 flex items-center justify-center rounded bg-gray-100 text-[10px] font-bold text-gray-400">
          {{ getNodeIcon(node) }}
        </span>

        <!-- Label -->
        <div class="flex-1 min-w-0">
          <div class="text-xs font-medium truncate">{{ getNodeLabel(node) }}</div>
          <div class="text-[9px] text-gray-400 font-mono truncate uppercase">{{ node.id }}</div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            @click.stop="emit('delete', node.id)"
            class="p-1 hovered:text-red-500 text-gray-400 hover:bg-red-50 rounded"
            title="Delete Item"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div v-if="nodes.length === 0" class="py-10 flex flex-col items-center justify-center text-center opacity-30 grayscale scale-75">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span class="text-xs font-medium mt-2">No items yet</span>
      </div>
    </div>
  </div>
</template>
