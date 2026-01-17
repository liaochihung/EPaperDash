<script setup>
import { onMounted, ref, onUnmounted, defineExpose, watch } from 'vue';
import Konva from 'konva';

const stageContainer = ref(null);
let stage = null;
let layer = null;
let paperGroup = null;
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

// Resize Observer
let resizeObserver = null;

onMounted(() => {
  if (!stageContainer.value) return;

  const width = stageContainer.value.offsetWidth;
  const height = stageContainer.value.offsetHeight;

  // 1. Init Stage
  stage = new Konva.Stage({
    container: stageContainer.value,
    width: width,
    height: height,
  });

  layer = new Konva.Layer();
  stage.add(layer);

  // 2. Create Paper Group
  // The Group holds the background and all content elements (Text, Image)
  paperGroup = new Konva.Group({
      x: (width - props.width) / 2,
      y: (height - props.height) / 2,
      width: props.width,
      height: props.height,
      // clip: true // Optional: clip content to paper edges? For now let's allow bleed for visibility
  });
  layer.add(paperGroup);

  // 3. Draw E-Paper Background (inside Group at 0,0)
  const bg = new Konva.Rect({
    x: 0,
    y: 0,
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
  paperGroup.add(bg);

  // 4. Init Transformer (on Layer, above Group)
  transformer = new Konva.Transformer({
      anchorStroke: '#3b82f6', 
      anchorFill: 'white',
      anchorSize: 10,
      borderStroke: '#3b82f6',
      borderDash: [4, 4],
      keepRatio: true,
      rotateEnabled: true,
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
  });
  layer.add(transformer);

  // 5. Selection Logic
  stage.on('click tap', (e) => {
    // Check if clicked on empty stage or strictly on the background rect
    const target = e.target;
    
    if (target === stage || target.id() === 'paper-bg') {
      transformer.nodes([]);
      selectedId.value = null;
      emit('selected', null);
      return;
    }

    // Ignore clicks on Transformer itself
    if (target.getParent().className === 'Transformer') {
      return;
    }

    // Select the node
    transformer.nodes([target]);
    selectedId.value = target.id();
    
    emitNodeProperties(target);
  });

  // 6. Transform & Drag Events
  stage.on('transformend', (e) => {
      if (selectedId.value === e.target.id()) {
          emitNodeProperties(e.target);
      }
  });

  stage.on('dragend', (e) => {
      if (selectedId.value === e.target.id()) {
          emitNodeProperties(e.target);
      }
  });

  // 7. Setup Resize Observer
  resizeObserver = new ResizeObserver(() => {
      handleResize();
  });
  resizeObserver.observe(stageContainer.value);
});

onUnmounted(() => {
    if (resizeObserver) resizeObserver.disconnect();
    if(stage) stage.destroy();
});

const handleResize = () => {
    if (!stageContainer.value || !stage) return;
    
    const width = stageContainer.value.offsetWidth;
    const height = stageContainer.value.offsetHeight;
    
    stage.width(width);
    stage.height(height);
    
    recenterPaper();
};

const recenterPaper = () => {
    if (!stage || !paperGroup) return;
    
    const w = stage.width();
    const h = stage.height();
    // Use floor/ceil to ensure we don't end up on a half-pixel which causes blur/shifts
    const paperX = Math.floor((w - props.width) / 2);
    const paperY = Math.floor((h - props.height) / 2);
    
    paperGroup.position({ x: paperX, y: paperY });
    layer.batchDraw();
}

const exportState = () => {
    if (!paperGroup) return null;
    // We only want the children of paperGroup (the content)
    // but not the background rect itself (we'll recreate it or just filter it)
    const children = paperGroup.getChildren((node) => node.id() !== 'paper-bg');
    const data = children.map(node => ({
        className: node.className,
        attrs: node.getAttrs()
    }));
    return JSON.stringify(data);
};

const importState = (json) => {
    if (!json || !paperGroup || !transformer) return;
    try {
        const data = JSON.parse(json);
        // Clear existing children except background
        const children = paperGroup.getChildren((node) => node.id() !== 'paper-bg');
        children.forEach(c => c.destroy());
        
        data.forEach(item => {
            let node;
            if (item.className === 'Text') {
                node = new Konva.Text(item.attrs);
                // Re-add hitFunc and cursors since they aren't serialized
                node.hitFunc(function(context) {
                    context.beginPath();
                    context.rect(0, 0, this.width(), this.height());
                    context.closePath();
                    context.fillStrokeShape(this);
                });
                node.on('mouseover', () => { document.body.style.cursor = 'move'; });
                node.on('mouseout', () => { document.body.style.cursor = 'default'; });
            } else if (item.className === 'Image') {
                // For images, we need to handle the Image object
                // But for now, let's assume item.attrs.image is just the URL if saved or we skip
                Konva.Image.fromURL(item.attrs.imageSrc || item.attrs.url, (img) => {
                   img.setAttrs(item.attrs);
                   img.on('mouseover', () => { document.body.style.cursor = 'move'; });
                   img.on('mouseout', () => { document.body.style.cursor = 'default'; });
                   paperGroup.add(img);
                   layer.batchDraw();
                });
                return; // async handled
            }
            if (node) paperGroup.add(node);
        });
        layer.batchDraw();
    } catch (e) {
        console.error("Failed to load state", e);
    }
};

const emitNodeProperties = (node) => {
    const props = {
        id: node.id(),
        type: node.className,
        x: Math.round(node.x()),
        y: Math.round(node.y()),
        width: Math.round(node.width() * node.scaleX()),
        height: Math.round(node.height() * node.scaleY()),
        rotation: Math.round(node.rotation())
    };

    if (node.className === 'Text') {
        props.text = node.text();
        props.fontSize = Math.round(node.fontSize() * node.scaleX());
        props.fill = node.fill();
    }

    emit('selected', props);
}

const deleteSelected = () => {
    if (selectedId.value && paperGroup) {
        // Search in paperGroup
        const node = paperGroup.findOne('#' + selectedId.value);
        if (node) {
            node.destroy();
            transformer.nodes([]);
            selectedId.value = null;
            emit('selected', null);
            layer.batchDraw();
        }
    }
};

watch(() => [props.width, props.height], ([newW, newH]) => {
    if (paperGroup) {
        const bg = paperGroup.findOne('#paper-bg');
        if (bg) {
            bg.width(newW);
            bg.height(newH);
            paperGroup.width(newW);
            paperGroup.height(newH);
            recenterPaper();
        }
    }
});

const updateNode = (id, attrs) => {
    if(!paperGroup) return;
    const node = paperGroup.findOne('#' + id);
    if(node) {
        // Ensure x, y are integers
        if (attrs.x !== undefined) attrs.x = Math.round(attrs.x);
        if (attrs.y !== undefined) attrs.y = Math.round(attrs.y);
        node.setAttrs(attrs);
        layer.batchDraw();
        emit('change'); // Notify parent of change
    }
};

const addText = () => {
    if(!paperGroup) return;
    
    // Add relative to paper (center-ish)
    const x = 50;
    const y = 50;

    const text = new Konva.Text({
        x: x,
        y: y,
        text: 'New Text',
        fontSize: 30,
        fontFamily: 'sans-serif',
        fill: 'black',
        draggable: true,
        id: `text-${Date.now()}`,
        name: 'editable-text',
        hitFunc: function(context) {
            context.beginPath();
            context.rect(0, 0, this.width(), this.height());
            context.closePath();
            context.fillStrokeShape(this);
        }
    });
    
    text.on('mouseover', function () { document.body.style.cursor = 'move'; });
    text.on('mouseout', function () { document.body.style.cursor = 'default'; });

    paperGroup.add(text);
    transformer.nodes([text]);
    selectedId.value = text.id();
    layer.batchDraw(); 
    
    emitNodeProperties(text);
};

const addImage = (url) => {
    if(!paperGroup) return;
    const startX = 50;
    const startY = 50;

    Konva.Image.fromURL(url, (imageNode) => {
        imageNode.setAttrs({
            x: startX,
            y: startY,
            width: 200, 
            height: 200,
            draggable: true,
            id: `image-${Date.now()}`
        });

        imageNode.on('mouseover', function () { document.body.style.cursor = 'move'; });
        imageNode.on('mouseout', function () { document.body.style.cursor = 'default'; });

        paperGroup.add(imageNode);
        transformer.nodes([imageNode]);
        selectedId.value = imageNode.id();
        layer.batchDraw(); 

        emitNodeProperties(imageNode);
    });
};

const getDataURL = () => {
    if (!stage || !paperGroup || !transformer) return null;
    
    // 1. Hide transformer to avoid capturing selection handles
    const oldNodes = transformer.nodes();
    transformer.nodes([]);
    layer.batchDraw();

    // 2. Get the absolute position of the paper background rect on the stage
    const bg = paperGroup.findOne('#paper-bg');
    const pos = bg.getAbsolutePosition();

    // 3. Export a crop from the STAGE using absolute coordinates
    // This is more reliable than group-local export when parent transforms are involved.
    const dataURL = stage.toDataURL({
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        width: props.width,
        height: props.height,
        pixelRatio: 1 // Crucial: ensure 1:1 pixel mapping for e-paper
    });

    // 4. Restore transformer
    transformer.nodes(oldNodes);
    layer.batchDraw();
    
    return dataURL;
};

defineExpose({
    addText,
    addImage,
    updateNode,
    deleteSelected,
    getDataURL,
    exportState,
    importState
});
</script>

<template>
  <div ref="stageContainer" class="w-full h-full bg-gray-200">
    <!-- Konva will attach here with its own canvas -->
  </div>
</template>
