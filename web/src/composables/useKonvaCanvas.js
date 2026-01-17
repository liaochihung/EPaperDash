import { ref } from 'vue';
import Konva from 'konva';

export function useKonvaCanvas(stageContainer, props, emit) {
    const stage = ref(null);
    const layer = ref(null);
    const paperGroup = ref(null);
    const transformer = ref(null);
    const selectedId = ref(null);

    const initStage = () => {
        if (!stageContainer.value) return;

        const width = stageContainer.value.offsetWidth;
        const height = stageContainer.value.offsetHeight;

        // 1. Init Stage
        stage.value = new Konva.Stage({
            container: stageContainer.value,
            width: width,
            height: height,
        });

        layer.value = new Konva.Layer();
        stage.value.add(layer.value);

        // 2. Paper Group
        paperGroup.value = new Konva.Group({
            x: (width - props.width) / 2,
            y: (height - props.height) / 2,
            width: props.width,
            height: props.height,
        });
        layer.value.add(paperGroup.value);

        // 3. Background
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
            shadowOffset: { x: 5, y: 5 },
            id: 'paper-bg',
            listening: true
        });
        paperGroup.value.add(bg);

        // 4. Transformer
        transformer.value = new Konva.Transformer({
            anchorStroke: '#3b82f6',
            anchorFill: 'white',
            anchorSize: 10,
            borderStroke: '#3b82f6',
            borderDash: [4, 4],
            keepRatio: true,
            rotateEnabled: true,
            enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
        });
        layer.value.add(transformer.value);

        // 5. Events
        setupEvents();
    };

    const setupEvents = () => {
        if (!stage.value) return;

        stage.value.on('click tap', (e) => {
            const target = e.target;

            // Deselect if clicked on stage or background
            if (target === stage.value || target.id() === 'paper-bg') {
                transformer.value.nodes([]);
                selectedId.value = null;
                emit('selected', null);
                return;
            }

            // Ignore transformer clicks
            if (target.getParent().className === 'Transformer') return;

            // Select node
            transformer.value.nodes([target]);
            selectedId.value = target.id();
            emitNodeProperties(target);
        });

        // Update properties on transform/drag end
        stage.value.on('transformend dragend', (e) => {
            if (selectedId.value === e.target.id()) {
                emitNodeProperties(e.target);
                emit('change');
            }
        });
    };

    const emitNodeProperties = (node) => {
        const nodeProps = {
            id: node.id(),
            type: node.className,
            x: Math.round(node.x()),
            y: Math.round(node.y()),
            width: Math.round(node.width() * node.scaleX()),
            height: Math.round(node.height() * node.scaleY()),
            rotation: Math.round(node.rotation())
        };

        if (node.className === 'Text') {
            nodeProps.text = node.text();
            nodeProps.fontSize = Math.round(node.fontSize() * node.scaleX());
            nodeProps.fill = node.fill();
        }

        emit('selected', nodeProps);
    };

    const recenterPaper = () => {
        if (!stage.value || !paperGroup.value) return;

        const w = stage.value.width();
        const h = stage.value.height();

        const paperX = Math.floor((w - props.width) / 2);
        const paperY = Math.floor((h - props.height) / 2);

        paperGroup.value.position({ x: paperX, y: paperY });
        layer.value.batchDraw();
    };

    const fitStageToParent = () => {
        if (!stageContainer.value || !stage.value) return;
        const width = stageContainer.value.offsetWidth;
        const height = stageContainer.value.offsetHeight;
        stage.value.width(width);
        stage.value.height(height);
        recenterPaper();
    };

    // Public Actions
    const addText = () => {
        if (!paperGroup.value) return;
        const text = new Konva.Text({
            x: 50,
            y: 50,
            text: 'New Text',
            fontSize: 30,
            fontFamily: 'sans-serif',
            fill: 'black',
            draggable: true,
            id: `text-${Date.now()}`,
            name: 'editable-text',
            hitFunc: function (context) {
                context.beginPath();
                context.rect(0, 0, this.width(), this.height());
                context.closePath();
                context.fillStrokeShape(this);
            }
        });

        setupCursorEvents(text);
        paperGroup.value.add(text);
        selectNode(text);
        emit('change');
    };

    const addImage = (url) => {
        if (!paperGroup.value) return;
        Konva.Image.fromURL(url, (img) => {
            img.setAttrs({
                x: 50,
                y: 50,
                width: 200,
                height: 200,
                draggable: true,
                id: `image-${Date.now()}`
            });
            setupCursorEvents(img);
            paperGroup.value.add(img);
            selectNode(img);
            emit('change');
        });
    };

    const deleteSelected = () => {
        if (!selectedId.value || !paperGroup.value) return;
        const node = paperGroup.value.findOne('#' + selectedId.value);
        if (node) {
            node.destroy();
            transformer.value.nodes([]);
            selectedId.value = null;
            emit('selected', null);
            layer.value.batchDraw();
            emit('change');
        }
    };

    const updateNode = (id, attrs) => {
        if (!paperGroup.value) return;
        const node = paperGroup.value.findOne('#' + id);
        if (node) {
            if (attrs.x !== undefined) attrs.x = Math.round(attrs.x);
            if (attrs.y !== undefined) attrs.y = Math.round(attrs.y);
            node.setAttrs(attrs);
            layer.value.batchDraw();
            emit('change');
        }
    };

    const getDataURL = () => {
        if (!stage.value || !paperGroup.value) return null;

        // Hide transformer
        const oldNodes = transformer.value.nodes();
        transformer.value.nodes([]);
        layer.value.batchDraw();

        const bg = paperGroup.value.findOne('#paper-bg');
        const pos = bg.getAbsolutePosition();

        const dataURL = stage.value.toDataURL({
            x: Math.round(pos.x),
            y: Math.round(pos.y),
            width: props.width,
            height: props.height,
            pixelRatio: 1
        });

        // Restore transformer
        transformer.value.nodes(oldNodes);
        layer.value.batchDraw();

        return dataURL;
    };

    const exportState = () => {
        if (!paperGroup.value) return null;
        const children = paperGroup.value.getChildren((node) => node.id() !== 'paper-bg');
        const data = children.map(node => ({
            className: node.className,
            attrs: node.getAttrs()
        }));
        return JSON.stringify(data);
    };

    const importState = (json) => {
        if (!json || !paperGroup.value) return;
        try {
            const data = JSON.parse(json);
            // Clear existing
            const children = paperGroup.value.getChildren((node) => node.id() !== 'paper-bg');
            children.forEach(c => c.destroy());

            data.forEach(item => {
                if (item.className === 'Text') {
                    const node = new Konva.Text(item.attrs);
                    // Re-add custom hitFunc
                    node.hitFunc(function (context) {
                        context.beginPath();
                        context.rect(0, 0, this.width(), this.height());
                        context.closePath();
                        context.fillStrokeShape(this);
                    });
                    setupCursorEvents(node);
                    paperGroup.value.add(node);
                } else if (item.className === 'Image') {
                    Konva.Image.fromURL(item.attrs.imageSrc || item.attrs.url, (img) => {
                        img.setAttrs(item.attrs);
                        setupCursorEvents(img);
                        paperGroup.value.add(img);
                    });
                }
            });
            layer.value.batchDraw();
        } catch (e) {
            console.error("Failed to load state", e);
        }
    };

    // Helpers
    const setupCursorEvents = (node) => {
        node.on('mouseover', () => { document.body.style.cursor = 'move'; });
        node.on('mouseout', () => { document.body.style.cursor = 'default'; });
    };

    const selectNode = (node) => {
        transformer.value.nodes([node]);
        selectedId.value = node.id();
        layer.value.batchDraw();
        emitNodeProperties(node);
    };

    const updatePaperSize = (newW, newH) => {
        if (!paperGroup.value) return;
        const bg = paperGroup.value.findOne('#paper-bg');
        if (bg) {
            bg.width(newW);
            bg.height(newH);
            paperGroup.value.width(newW);
            paperGroup.value.height(newH);
            recenterPaper();
        }
    };

    return {
        stage,
        initStage,
        fitStageToParent,
        addText,
        addImage,
        deleteSelected,
        updateNode,
        getDataURL,
        exportState,
        importState,
        updatePaperSize
    };
}
