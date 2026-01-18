import { ref } from 'vue';
import Konva from 'konva';
import { useHistory } from './useHistory';

export function useKonvaCanvas(stageContainer, props, emit) {
    const stage = ref(null);
    const layer = ref(null);
    const paperGroup = ref(null);
    const transformer = ref(null);
    const selectedId = ref(null);
    const gridLayer = ref(null);
    const showGrid = ref(false);

    // Selection state
    const selectionRect = ref(null);
    const isSelecting = ref(false);
    const selectionStart = ref({ x: 0, y: 0 });

    // History
    // History Management
    const {
        history,
        pushState,
        undo: historyUndo,
        redo: historyRedo,
        reset: resetHistory,
        canUndo,
        canRedo
    } = useHistory();

    const saveHistory = () => {
        if (!paperGroup.value) return;
        const state = exportState();
        pushState(state);
    };

    const undo = () => {
        const prevState = historyUndo();
        if (prevState) {
            // Clear selection to avoid issues
            transformer.value.nodes([]);
            selectedId.value = null;
            emit('selected', null);

            importState(prevState, false);
        }
    };

    const redo = () => {
        const nextState = historyRedo();
        if (nextState) {
            // Clear selection
            transformer.value.nodes([]);
            selectedId.value = null;
            emit('selected', null);

            importState(nextState, false);
        }
    };

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
            keepRatio: false, // Allow non-uniform scaling (width/height independent)
            rotateEnabled: true,
            enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center', 'middle-left', 'middle-right']
        });
        layer.value.add(transformer.value);

        // 5. Selection Rectangle
        selectionRect.value = new Konva.Rect({
            fill: 'rgba(0, 161, 255, 0.3)',
            visible: false,
            listening: false, // Do not catch events
        });
        layer.value.add(selectionRect.value);

        // 6. Events
        setupEvents();

        // Initial history save
        saveHistory();
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

            // Handle Group Selection (if clicked element is inside a group like Weather)
            let nodeToSelect = target;
            if (target.getParent() && target.getParent().name() && target.getParent().name().includes('editable-group')) {
                nodeToSelect = target.getParent();
            }

            // Handle multi-selection with Shift/Ctrl key
            const isMulti = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
            const currentNodes = transformer.value.nodes();

            if (isMulti) {
                // If already selected, remove it
                if (currentNodes.includes(nodeToSelect)) {
                    const newNodes = currentNodes.filter(n => n !== nodeToSelect);
                    transformer.value.nodes(newNodes);
                    if (newNodes.length > 0) {
                        selectedId.value = newNodes[newNodes.length - 1].id();
                        emitNodeProperties(newNodes[newNodes.length - 1]);
                    } else {
                        selectedId.value = null;
                        emit('selected', null);
                    }
                } else {
                    // Add to selection
                    const newNodes = [...currentNodes, nodeToSelect];
                    transformer.value.nodes(newNodes);
                    selectedId.value = nodeToSelect.id();
                    emitNodeProperties(nodeToSelect); // Emit the latest selected
                }
            } else {
                // Single select
                transformer.value.nodes([nodeToSelect]);
                selectedId.value = nodeToSelect.id();
                emitNodeProperties(nodeToSelect);
            }
        });

        // Rubber Band Selection Logic
        stage.value.on('mousedown touchstart', (e) => {
            if (e.target !== stage.value && e.target.id() !== 'paper-bg') {
                return;
            }

            e.evt.preventDefault();
            const pos = stage.value.getPointerPosition();
            selectionStart.value = { x: pos.x, y: pos.y }; // Relative to stage

            selectionRect.value.width(0);
            selectionRect.value.height(0);
            selectionRect.value.visible(true);
            isSelecting.value = true;
        });

        stage.value.on('mousemove touchmove', (e) => {
            if (!isSelecting.value) return;

            e.evt.preventDefault();
            const pos = stage.value.getPointerPosition();

            selectionRect.value.setAttrs({
                x: Math.min(selectionStart.value.x, pos.x),
                y: Math.min(selectionStart.value.y, pos.y),
                width: Math.abs(pos.x - selectionStart.value.x),
                height: Math.abs(pos.y - selectionStart.value.y),
            });
        });

        stage.value.on('mouseup touchend', (e) => {
            if (!isSelecting.value) return;

            isSelecting.value = false;

            if (!selectionRect.value.visible()) return;

            e.evt.preventDefault();
            selectionRect.value.visible(false);

            const sr = selectionRect.value.getClientRect();

            // Find intersecting nodes
            const children = paperGroup.value.getChildren();
            const selected = children.filter(node => {
                if (node.id() === 'paper-bg') return false;

                // Use client rect for intersection
                // The selection rect is in stage coords (absolute)
                // The node is in group coords, but getClientRect returns absolute
                const nr = node.getClientRect();

                return Konva.Util.haveIntersection(sr, nr);
            });

            transformer.value.nodes(selected);
            if (selected.length > 0) {
                // Maybe communicate specific selection info if needed
                selectedId.value = selected[0].id();
            } else {
                selectedId.value = null;
                emit('selected', null);
            }
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

        stage.value.on('dragend', () => {
            saveHistory();
            if (selectedId.value) {
                const node = paperGroup.value.findOne('#' + selectedId.value);
                if (node) emitNodeProperties(node);
            }
            emit('change');
        });

        // Update properties on transform/drag end
        stage.value.on('transformend', (e) => {
            const node = e.target;

            // Normalize scale to width/height
            if (node.scaleX() !== 1 || node.scaleY() !== 1) {
                const scaleX = node.scaleX();
                const scaleY = node.scaleY();

                // For Text nodes, scaling affects fontSize, not width/height usually
                if (node.className === 'Text') {
                    // Logic remains: scale affects font size effectively, but good to normalize if possible
                    // But for simplicity in Konva, often keeping scale is easier for Text
                    // If we want exact width control:
                    // node.fontSize(node.fontSize() * scaleX);
                    // node.width(node.width() * scaleX);
                    // node.scaleX(1); node.scaleY(1);
                    // Let's keep Text scaling as is for now, or just normalize
                } else {
                    node.width(node.width() * scaleX);
                    node.height(node.height() * scaleY);
                    node.scaleX(1);
                    node.scaleY(1);
                }
            }

            if (selectedId.value === node.id()) {
                emitNodeProperties(node);
                emit('change');
            }
            saveHistory();
        });
    };

    const emitNodeProperties = (node) => {
        const nodeProps = {
            id: node.id(),
            type: node.className,
            nodeType: node.getAttr('nodeType') || 'basic',
            x: Math.round(node.x()),
            y: Math.round(node.y()),
            width: Math.round(node.width() * (node.scaleX() || 1)),
            height: Math.round(node.height() * (node.scaleY() || 1)),
            rotation: Math.round(node.rotation()),
            draggable: node.draggable()
        };

        if (node.className === 'Text') {
            nodeProps.text = node.text();
            nodeProps.fontSize = Math.round(node.fontSize() * node.scaleX());
            nodeProps.fill = node.fill();
        }

        // Custom Props for Weather Grouo
        if (node.getAttr('nodeType') === 'weather') {
            const icon = node.findOne('.weather-icon');
            const temp = node.findOne('.weather-temp');
            const details = node.findOne('.weather-details');

            if (icon) nodeProps.weatherIcon = icon.text();
            if (temp) nodeProps.weatherTemp = temp.text();
            if (details) nodeProps.weatherDetails = details.text();
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
        saveHistory();
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
            saveHistory();
            emit('change');
        });
    };

    const deleteSelected = () => {
        const nodes = transformer.value.nodes();
        if (nodes.length > 0) {
            nodes.forEach(n => n.destroy());
            transformer.value.nodes([]);
            selectedId.value = null;
            emit('selected', null);
            layer.value.batchDraw();
            saveHistory();
            emit('change');
            return;
        }

        if (!selectedId.value || !paperGroup.value) return;
        const node = paperGroup.value.findOne('#' + selectedId.value);
        if (node) {
            node.destroy();
            transformer.value.nodes([]);
            selectedId.value = null;
            emit('selected', null);
            layer.value.batchDraw();
            saveHistory();
            emit('change');
        }
    };

    const updateNode = (id, attrs) => {
        if (!paperGroup.value) return;
        const node = paperGroup.value.findOne('#' + id);
        if (node) {
            // Handle specialized Weather updates
            if (node.getAttr('nodeType') === 'weather') {
                if (attrs.weatherIcon !== undefined) {
                    node.findOne('.weather-icon')?.text(attrs.weatherIcon);
                    delete attrs.weatherIcon;
                }
                if (attrs.weatherTemp !== undefined) {
                    node.findOne('.weather-temp')?.text(attrs.weatherTemp);
                    delete attrs.weatherTemp;
                }
                if (attrs.weatherDetails !== undefined) {
                    node.findOne('.weather-details')?.text(attrs.weatherDetails);
                    delete attrs.weatherDetails;
                }
            }

            // Normal attribute updates
            if (attrs.x !== undefined) attrs.x = Math.round(attrs.x);
            if (attrs.y !== undefined) attrs.y = Math.round(attrs.y);

            // Handle explicit Width/Height changes from props panel
            // Reset scale if width/height are manually set to avoid confusion
            if (attrs.width !== undefined || attrs.height !== undefined) {
                node.scaleX(1);
                node.scaleY(1);
            }

            node.setAttrs(attrs);
            layer.value.batchDraw();
            node.setAttrs(attrs);
            layer.value.batchDraw();

            // Save history for property changes (important for Undo to work on props)
            saveHistory();
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
                if (['time', 'date', 'weather'].includes(type) || node.name()?.includes('dynamic')) {
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

        // Custom serialization to handle nested children in groups
        const nodes = paperGroup.value.getChildren((node) => node.id() !== 'paper-bg').map(node => {
            const data = {
                className: node.className,
                attrs: node.getAttrs(),
                children: [] // for groups
            };

            if (node.className === 'Group') {
                data.children = node.getChildren().map(child => ({
                    className: child.className,
                    attrs: child.getAttrs()
                }));
            }

            return data;
        });

        return JSON.stringify(nodes);
    };

    const importState = (json, saveToHistory = true) => {
        if (!json || !paperGroup.value) return;
        try {
            const data = JSON.parse(json);
            // Clear existing
            const children = paperGroup.value.getChildren((node) => node.id() !== 'paper-bg');
            children.forEach(c => c.destroy());
            transformer.value.nodes([]); // Clear selection

            data.forEach(item => {
                let node;

                // Helper to create basic shapes
                const createShape = (def) => {
                    if (def.className === 'Rect') return new Konva.Rect(def.attrs);
                    if (def.className === 'Circle') return new Konva.Circle(def.attrs);
                    if (def.className === 'Text') {
                        const t = new Konva.Text(def.attrs);
                        // Re-add custom hitFunc for better text selection
                        t.hitFunc(function (context) {
                            context.beginPath();
                            context.rect(0, 0, this.width(), this.height());
                            context.closePath();
                            context.fillStrokeShape(this);
                        });
                        return t;
                    }
                    if (def.className === 'Image') {
                        const img = new Konva.Image(def.attrs);
                        if (def.attrs.imageSrc) {
                            Konva.Image.fromURL(def.attrs.imageSrc, (loadedImg) => {
                                img.image(loadedImg.image());
                                layer.value.batchDraw();
                            });
                        }
                        return img;
                    }
                    return null;
                };

                if (item.className === 'Group') {
                    node = new Konva.Group(item.attrs);
                    if (item.children) {
                        item.children.forEach(childDef => {
                            const childNode = createShape(childDef);
                            if (childNode) node.add(childNode);
                        });
                    }
                } else {
                    node = createShape(item);
                }

                if (node) {
                    setupCursorEvents(node);
                    paperGroup.value.add(node);
                }
            });

            layer.value.batchDraw();
            if (saveToHistory) saveHistory();
            emit('change');
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
            saveHistory();
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
            saveHistory();
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
            saveHistory();
            emit('change');
        }
    };

    // Copy Function
    const copySelected = () => {
        if (!selectedId.value || !paperGroup.value) return;
        const node = paperGroup.value.findOne('#' + selectedId.value);
        if (!node || node.id() === 'paper-bg') return;

        // Clone logic needs recursive clone for groups
        const clone = node.clone({
            id: `${node.className.toLowerCase()}-${Date.now()}`,
            x: node.x() + 20,
            y: node.y() + 20
        });

        // Setup events for clone (and its children if group)
        if (clone.className === 'Group') {
            clone.getChildren().forEach(child => {
                // Konva clone already handles children but we might want to ensure properties 
            });
        }

        setupCursorEvents(clone);
        paperGroup.value.add(clone);
        selectNode(clone);
        saveHistory();
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
        saveHistory();
        emit('change');
    };

    // Advanced Weather Node (Group)
    const addWeatherNode = () => {
        if (!paperGroup.value) return;

        const group = new Konva.Group({
            x: 50,
            y: 50,
            width: 200,
            height: 120,
            draggable: true,
            id: `weather-${Date.now()}`,
            name: 'editable-group',
            nodeType: 'weather'
        });

        // 1. Transparent Background for easier selection
        const bg = new Konva.Rect({
            width: 200,
            height: 120,
            fill: 'transparent',
            stroke: '#eee', // Light border while editing
            strokeWidth: 1,
            dash: [4, 4],
            name: 'group-bg'
        });

        // 2. Weather Icon
        const icon = new Konva.Text({
            x: 10,
            y: 10,
            text: '⛅',
            fontSize: 60,
            fontFamily: 'sans-serif',
            fill: 'black',
            name: 'weather-icon'
        });

        // 3. Temperature
        const temp = new Konva.Text({
            x: 80,
            y: 20,
            text: '24°C',
            fontSize: 40,
            fontFamily: 'sans-serif',
            fill: 'black',
            name: 'weather-temp'
        });

        // 4. Details
        const details = new Konva.Text({
            x: 10,
            y: 80,
            text: 'AQI: 45 | 💧 20% | 🍃 5km/h',
            fontSize: 16,
            fontFamily: 'sans-serif',
            fill: '#666',
            name: 'weather-details',
            width: 180
        });

        group.add(bg);
        group.add(icon);
        group.add(temp);
        group.add(details);

        setupCursorEvents(group);
        paperGroup.value.add(group);
        selectNode(group);
        saveHistory();
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
        saveHistory();
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
        saveHistory();
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
        saveHistory();
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
        saveHistory();
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

    const selectAll = () => {
        if (!paperGroup.value) return;
        const children = paperGroup.value.getChildren((node) => node.id() !== 'paper-bg');
        if (children.length > 0) {
            transformer.value.nodes(children);
            selectedId.value = children[0].id();
            // Emit properties of the first selected node or specialized "multi"
            emitNodeProperties(children[0]);
            emit('selected', children[0].id());
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
        updatePaperSize,
        toggleGrid,
        bringToFront,
        sendToBack,
        copySelected,
        addTimeNode,
        addWeatherNode,
        addDateNode,
        getPartialDataURL,
        addRect,
        addCircle,
        addBatteryNode,
        undo,
        redo,
        saveHistory, // Expose for manual saves if needed
        resetHistory, // Expose reset
        canUndo,
        canRedo,
        selectAll
    };
}
