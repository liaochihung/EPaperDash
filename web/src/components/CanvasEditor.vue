<script setup>
import { onMounted, ref, onUnmounted, defineExpose, watch } from 'vue';
import Konva from 'konva';

const stageContainer = ref(null);
let stage = null;
let layer = null;
let transformer = null;

const props = defineProps({
  width: {
    type: Number,
    default: 648
  },
  height: {
    type: Number,
    default: 480
  }
});

// State
const selectedId = ref(null);

// Define emits
const emit = defineEmits(['selected']);

onMounted(() => {
  if (!stageContainer.value) return;

  const width = stageContainer.value.offsetWidth;
  const height = stageContainer.value.offsetHeight;

  stage = new Konva.Stage({
    container: stageContainer.value,
    width: width,
    height: height,
  });

  layer = new Konva.Layer();
  stage.add(layer);
  
  // Draw E-Paper Boundary
  const paperX = (width - props.width) / 2;
  const paperY = (height - props.height) / 2;

  const bg = new Konva.Rect({
    x: paperX,
    y: paperY,
    width: props.width,
    height: props.height,
    fill: 'white',
    stroke: '#333',
    strokeWidth: 2,
    shadowColor: 'black',
    shadowBlur: 10,
    shadowOpacity: 0.1,
    shadowOffset: {x: 5, y: 5},
    id: 'paper-bg',
    listening: true 
  });
  layer.add(bg);

  // Transformer
  transformer = new Konva.Transformer();
  layer.add(transformer);

  // Selection Logic
  stage.on('click tap', (e) => {
    if (e.target === stage || e.target.id() === 'paper-bg') {
      transformer.nodes([]);
      selectedId.value = null;
      emit('selected', null);
      return;
    }

    if (e.target.getParent().className === 'Transformer') {
      return;
    }

    const node = e.target;
    transformer.nodes([node]);
    selectedId.value = node.id();
    
    // Emit selected object properties
    emit('selected', {
        id: node.id(),
        type: node.className, // 'Text', 'Image', etc.
        x: node.x(),
        y: node.y(),
        text: node.className === 'Text' ? node.text() : undefined,
        fontSize: node.className === 'Text' ? node.fontSize() : undefined,
        width: node.width(),
        height: node.height(),
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
        rotation: node.rotation()
    });
  });

  // Listen for transform end to update properties
  stage.on('transformend', (e) => {
      const node = e.target;
      if (selectedId.value === node.id()) {
          emit('selected', {
            id: node.id(),
            type: node.className,
            x: node.x(),
            y: node.y(),
            text: node.className === 'Text' ? node.text() : undefined,
            fontSize: node.className === 'Text' ? node.fontSize() : undefined,
            width: node.width(),
            height: node.height(),
            scaleX: node.scaleX(),
            scaleY: node.scaleY(),
            rotation: node.rotation()
        });
      }
  });

  // Drag end listener
    stage.on('dragend', (e) => {
      const node = e.target;
      if (selectedId.value === node.id()) {
          emit('selected', {
            id: node.id(),
            type: node.className,
            x: node.x(),
            y: node.y(),
            text: node.className === 'Text' ? node.text() : undefined,
            fontSize: node.className === 'Text' ? node.fontSize() : undefined,
            width: node.width(),
            height: node.height(),
            scaleX: node.scaleX(),
            scaleY: node.scaleY(),
            rotation: node.rotation()
        });
      }
  });
});


watch(() => [props.width, props.height], ([newW, newH]) => {
    if (!stage || !layer) return;
    
    const bg = layer.findOne('#paper-bg');
    if (bg) {
        // Recalculate centering
        const stageW = stage.width();
        const stageH = stage.height();
        const paperX = (stageW - newW) / 2;
        const paperY = (stageH - newH) / 2;
        
        bg.width(newW);
        bg.height(newH);
        bg.x(paperX);
        bg.y(paperY);
        
        layer.batchDraw();
    }
});

const updateNode = (id, attrs) => {
    if(!layer) return;
    const node = layer.findOne('#' + id);
    if(node) {
        node.setAttrs(attrs);
        layer.batchDraw();
    }
};

const addText = () => {
    if(!layer) return;
    const paperBg = layer.findOne('#paper-bg');
    const x = paperBg.x() + 50;
    const y = paperBg.y() + 50;

    const text = new Konva.Text({
        x: x,
        y: y,
        text: 'New Text',
        fontSize: 30,
        fontFamily: 'sans-serif',
        fill: 'black',
        draggable: true,
        id: `text-${Date.now()}`
    });
    
    text.on('mouseover', function () { document.body.style.cursor = 'pointer'; });
    text.on('mouseout', function () { document.body.style.cursor = 'default'; });

    layer.add(text);
    transformer.nodes([text]);
    selectedId.value = text.id();
    
    // Emit initial selection for the new text
    emit('selected', {
        id: text.id(),
        type: 'Text',
        x: text.x(),
        y: text.y(),
        text: 'New Text',
        fontSize: 30,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
    });
};

const getDataURL = () => {
    if (!stage) return null;
    
    // Recalculate paper position (same logic as onMounted)
    const width = stage.width();
    const height = stage.height();
    const paperX = (width - props.width) / 2;
    const paperY = (height - props.height) / 2;

    // Hide transformer and grid before snapshot
    transformer.hide();
    
    const dataURL = stage.toDataURL({
        x: paperX,
        y: paperY,
        width: props.width,
        height: props.height,
        pixelRatio: 1 // 1:1 for E-Paper
    });

    // Restore controls
    transformer.show();
    
    return dataURL;
};

const addImage = (url) => {
    if(!layer) return;
    const paperBg = layer.findOne('#paper-bg');
    const startX = paperBg.x() + 50;
    const startY = paperBg.y() + 50;

    Konva.Image.fromURL(url, (imageNode) => {
        imageNode.setAttrs({
            x: startX,
            y: startY,
            width: 200, // Default width
            height: 200, // Default height preserving aspect ratio usually requires more logic, but Konva handles it ok-ish
            draggable: true,
            id: `image-${Date.now()}`
        });

        imageNode.on('mouseover', function () { document.body.style.cursor = 'pointer'; });
        imageNode.on('mouseout', function () { document.body.style.cursor = 'default'; });

        layer.add(imageNode);
        transformer.nodes([imageNode]);
        selectedId.value = imageNode.id();

        emit('selected', {
            id: imageNode.id(),
            type: 'Image',
            x: imageNode.x(),
            y: imageNode.y(),
            width: imageNode.width(),
            height: imageNode.height(),
            scaleX: imageNode.scaleX(),
            scaleY: imageNode.scaleY(),
            rotation: imageNode.rotation()
        });
    });
};

defineExpose({
    addText,
    addImage,
    updateNode,
    getDataURL
});

onUnmounted(() => {
    if(stage) stage.destroy();
});
</script>

<template>
  <div ref="stageContainer" class="w-full h-full">
    <!-- Konva will attach here with its own canvas -->
  </div>
</template>
