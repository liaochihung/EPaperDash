import { ref } from 'vue';
import Konva from 'konva';

export function useKonvaCanvas(stageContainer, props, emit) {
    const stage = ref(null);
    const layer = ref(null);
    const paperGroup = ref(null);
    const transformer = ref(null);
    const selectedId = ref(null);
    const gridLayer = ref(null);
    const showGrid = ref(false);

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

        // Grid Layer (on top of background, below content)
        gridLayer.value = new Konva.Layer();
        stage.value.add(gridLayer.value);

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

        // Snap to grid on drag
        stage.value.on('dragmove', (e) => {
            if (!showGrid.value) return; // Only snap when grid is visible

            const target = e.target;
            if (target === stage.value || target.id() === 'paper-bg') return;

            const gridSize = 20;
            const x = Math.round(target.x() / gridSize) * gridSize;
            const y = Math.round(target.y() / gridSize) * gridSize;

            target.position({ x, y });
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
                id: `image-${Date.now()}`,
                imageSrc: url
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

    const getDataURL = (options = {}) => {
        if (!stage.value || !paperGroup.value) return null;

        const { excludeDynamic } = options;
        const hiddenNodes = [];

        // Hide transformer
        const oldNodes = transformer.value.nodes();
        transformer.value.nodes([]);

        // Hide dynamic nodes if requested
        if (excludeDynamic) {
            const children = paperGroup.value.getChildren();
            children.forEach(node => {
                const type = node.getAttr('nodeType');
                if (['time', 'date', 'weather'].includes(type)) {
                    if (node.visible()) {
                        node.hide();
                        hiddenNodes.push(node);
                    }
                }
            });
        }

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

        // Restore visibility
        hiddenNodes.forEach(node => node.show());

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
            transformer.value.nodes([]); // Clear selection

            data.forEach(item => {
                // Ensure draggable is preserved or defaulted to true
                if (item.attrs) {
                    item.attrs.draggable = true;
                }

                if (item.attrs) {
                    item.attrs.draggable = true;
                }

                if (['Rect', 'Circle'].includes(item.className) && item.id !== 'paper-bg') {
                    // Generic shape handling
                    let node;
                    if (item.className === 'Rect') node = new Konva.Rect(item.attrs);
                    if (item.className === 'Circle') node = new Konva.Circle(item.attrs);

                    setupCursorEvents(node);
                    paperGroup.value.add(node);
                } else if (item.className === 'Text') {
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
                    const src = item.attrs.imageSrc || item.attrs.url;
                    if (src) {
                        Konva.Image.fromURL(src, (img) => {
                            // Clean attrs to prevent overwriting the image object with invalid data from JSON
                            const cleanAttrs = { ...item.attrs };
                            delete cleanAttrs.image;

                            img.setAttrs(cleanAttrs);
                            setupCursorEvents(img);
                            paperGroup.value.add(img);
                            layer.value.batchDraw();
                        });
                    }
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

    // Grid Functions
    const drawGrid = () => {
        if (!gridLayer.value || !paperGroup.value) return;
        gridLayer.value.destroyChildren();

        const gridSize = 20;
        const bg = paperGroup.value.findOne('#paper-bg');
        const pos = bg.getAbsolutePosition();

        for (let i = 0; i < props.width / gridSize; i++) {
            gridLayer.value.add(new Konva.Line({
                points: [pos.x + i * gridSize, pos.y, pos.x + i * gridSize, pos.y + props.height],
                stroke: '#999',
                strokeWidth: 1,
                dash: [5, 5]
            }));
        }

        for (let j = 0; j < props.height / gridSize; j++) {
            gridLayer.value.add(new Konva.Line({
                points: [pos.x, pos.y + j * gridSize, pos.x + props.width, pos.y + j * gridSize],
                stroke: '#999',
                strokeWidth: 1,
                dash: [5, 5]
            }));
        }

        gridLayer.value.batchDraw();
    };

    const toggleGrid = () => {
        showGrid.value = !showGrid.value;
        if (showGrid.value) {
            drawGrid();
        } else {
            gridLayer.value.destroyChildren();
            gridLayer.value.batchDraw();
        }
    };

    // Layer Functions
    const bringToFront = () => {
        if (!selectedId.value || !paperGroup.value) return;
        const node = paperGroup.value.findOne('#' + selectedId.value);
        if (node && node.id() !== 'paper-bg') {
            node.moveToTop();
            layer.value.batchDraw();
            emit('change');
        }
    };

    const sendToBack = () => {
        if (!selectedId.value || !paperGroup.value) return;
        const node = paperGroup.value.findOne('#' + selectedId.value);
        if (node && node.id() !== 'paper-bg') {
            node.moveToBottom();
            const bg = paperGroup.value.findOne('#paper-bg');
            if (bg) bg.moveToBottom();
            layer.value.batchDraw();
            emit('change');
        }
    };

    // Copy Function
    const copySelected = () => {
        if (!selectedId.value || !paperGroup.value) return;
        const node = paperGroup.value.findOne('#' + selectedId.value);
        if (!node || node.id() === 'paper-bg') return;

        const clone = node.clone({
            id: `${node.className.toLowerCase()}-${Date.now()}`,
            x: node.x() + 20,
            y: node.y() + 20
        });

        setupCursorEvents(clone);
        paperGroup.value.add(clone);
        selectNode(clone);
        emit('change');
    };

    // Special Node Types
    const addTimeNode = () => {
        if (!paperGroup.value) return;
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const text = new Konva.Text({
            x: 50,
            y: 50,
            text: timeStr,
            fontSize: 48,
            fontFamily: 'monospace',
            fill: 'black',
            draggable: true,
            id: `time-${Date.now()}`,
            name: 'editable-text',
            nodeType: 'time', // Custom metadata
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

    const addWeatherNode = () => {
        if (!paperGroup.value) return;
        const text = new Konva.Text({
            x: 50,
            y: 150,
            text: '☀️ 72°F',
            fontSize: 36,
            fontFamily: 'sans-serif',
            fill: 'black',
            draggable: true,
            id: `weather-${Date.now()}`,
            name: 'editable-text',
            nodeType: 'weather', // Custom metadata
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

    const addDateNode = () => {
        if (!paperGroup.value) return;
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        const text = new Konva.Text({
            x: 50,
            y: 100,
            text: dateStr,
            fontSize: 32,
            fontFamily: 'sans-serif',
            fill: 'black',
            draggable: true,
            id: `date-${Date.now()}`,
            name: 'editable-text',
            nodeType: 'date', // Custom metadata
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

    const addRect = () => {
        if (!paperGroup.value) return;
        const rect = new Konva.Rect({
            x: 50,
            y: 50,
            width: 100,
            height: 100,
            fill: 'transparent',
            stroke: 'black',
            strokeWidth: 2,
            draggable: true,
            id: `rect-${Date.now()}`,
            name: 'editable-shape'
        });
        setupCursorEvents(rect);
        paperGroup.value.add(rect);
        selectNode(rect);
        emit('change');
    };

    const addCircle = () => {
        if (!paperGroup.value) return;
        const circle = new Konva.Circle({
            x: 100,
            y: 100,
            radius: 50,
            fill: 'transparent',
            stroke: 'black',
            strokeWidth: 2,
            draggable: true,
            id: `circle-${Date.now()}`,
            name: 'editable-shape'
        });
        setupCursorEvents(circle);
        paperGroup.value.add(circle);
        selectNode(circle);
        emit('change');
    };

    const addBatteryNode = () => {
        if (!paperGroup.value) return;
        const group = new Konva.Group({
            x: 50,
            y: 50,
            draggable: true,
            id: `battery-${Date.now()}`,
            name: 'editable-group'
        });

        // Battery Body
        const body = new Konva.Rect({
            width: 40,
            height: 20,
            stroke: 'black',
            strokeWidth: 2,
            cornerRadius: 2
        });

        // Battery Tip
        const tip = new Konva.Rect({
            x: 40,
            y: 5,
            width: 4,
            height: 10,
            fill: 'black'
        });

        // Level (75%)
        const level = new Konva.Rect({
            x: 4,
            y: 4,
            width: 24,
            height: 12,
            fill: 'black'
        });

        // Percentage Text
        const text = new Konva.Text({
            x: 0,
            y: 24,
            text: '80%',
            fontSize: 14,
            fontFamily: 'sans-serif',
            fill: 'black'
        });

        group.add(body);
        group.add(tip);
        group.add(level);
        group.add(text);

        setupCursorEvents(group);
        paperGroup.value.add(group);
        selectNode(group);
        emit('change');
    };

    // Partial Area Export
    const getPartialDataURL = (x, y, width, height) => {
        if (!stage.value) return null;

        const oldNodes = transformer.value.nodes();
        transformer.value.nodes([]);
        layer.value.batchDraw();

        const bg = paperGroup.value.findOne('#paper-bg');
        const pos = bg.getAbsolutePosition();

        const dataURL = stage.value.toDataURL({
            x: Math.round(pos.x + x),
            y: Math.round(pos.y + y),
            width: width,
            height: height,
            pixelRatio: 1
        });

        transformer.value.nodes(oldNodes);
        layer.value.batchDraw();

        return dataURL;
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
        updatePaperSize,
        toggleGrid,
        bringToFront,
        sendToBack,
        copySelected,
        addTimeNode,
        addWeatherNode,
        addDateNode,
        addDateNode,
        getPartialDataURL,
        addRect,
        addCircle,
        addBatteryNode
    };
}
