import { ref, onUnmounted } from 'vue';
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
    const scale = ref(1); // Zoom level
    const toolMode = ref('select'); // 'select' or 'pan'

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
        canRedo,
        isDirty,
        markSaved
    } = useHistory();

    const saveHistory = () => {
        if (!paperGroup.value) return;
        const state = exportState();
        pushState(state);
    };

    const clearCanvas = () => {
        if (!paperGroup.value) return;

        // Remove all children except the background and selection rect
        const children = paperGroup.value.getChildren((node) =>
            node.id() !== 'paper-bg' && node.id() !== 'selection-rect'
        );
        children.forEach(c => c.destroy());

        // Clear transformer selection
        if (transformer.value) {
            transformer.value.nodes([]);
        }
        selectedId.value = null;
        emit('selected', null);

        // Redraw and reset history
        if (layer.value) {
            layer.value.batchDraw();
        }
        resetHistory();
        saveHistory();
        emit('change');
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
            emit('change');
        }
    };

    const setZoom = (newScale, centerPoint = null) => {
        if (!stage.value) return;

        const oldScale = stage.value.scaleX();
        const stageCenter = {
            x: stage.value.width() / 2,
            y: stage.value.height() / 2
        };

        // Point to zoom towards (default to stage center)
        const point = centerPoint || stageCenter;

        const mousePointTo = {
            x: (point.x - stage.value.x()) / oldScale,
            y: (point.y - stage.value.y()) / oldScale,
        };

        const limitedScale = Math.max(0.1, Math.min(5, newScale));
        scale.value = limitedScale;

        const newPos = {
            x: point.x - mousePointTo.x * limitedScale,
            y: point.y - mousePointTo.y * limitedScale,
        };

        stage.value.scale({ x: limitedScale, y: limitedScale });
        stage.value.position(newPos);
        stage.value.batchDraw();
    };

    const zoomIn = () => setZoom(scale.value * 1.2);
    const zoomOut = () => setZoom(scale.value / 1.2);
    const resetZoom = () => {
        if (!stage.value) return;
        setZoom(1);
        // Small delay to ensure scale update propagates if needed, though usually synchronous
        setTimeout(centerStage, 0);
    };

    const centerStage = () => {
        if (!stage.value) return;
        const stageW = stage.value.width();
        const stageH = stage.value.height();

        // Paper bounds
        const paperW = props.width || 648;
        const paperH = props.height || 480;

        const currentScale = scale.value;
        const newX = (stageW - paperW * currentScale) / 2;
        const newY = (stageH - paperH * currentScale) / 2;

        stage.value.position({ x: newX, y: newY });
        stage.value.batchDraw();
    };

    const setToolMode = (mode) => {
        toolMode.value = mode;
        if (stage.value) {
            stage.value.draggable(mode === 'pan');
            stage.value.container().style.cursor = mode === 'pan' ? 'grab' : 'default';
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
            x: 0,
            y: 0,
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
            id: 'selection-rect', // ID to prevent deletion by clearCanvas
            fill: 'rgba(0, 161, 255, 0.3)',
            stroke: 'rgba(0, 161, 255, 0.8)',
            strokeWidth: 1,
            visible: false,
            listening: false, // Do not catch events
        });
        paperGroup.value.add(selectionRect.value);

        // 6. Events
        setupEvents();

        // Initial history save
        // Initial history save
        saveHistory();

        // Initial Center
        centerStage();
    };

    const isKeyboardMoving = ref(false);

    const handleKeyDown = (e) => {
        const nodes = transformer.value.nodes();
        if (nodes.length === 0) return;

        // Check if typing in an input element
        if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

        const step = e.shiftKey ? 10 : 1;
        let moved = false;

        switch (e.key) {
            case 'ArrowUp':
                nodes.forEach(node => node.y(node.y() - step));
                moved = true;
                break;
            case 'ArrowDown':
                nodes.forEach(node => node.y(node.y() + step));
                moved = true;
                break;
            case 'ArrowLeft':
                nodes.forEach(node => node.x(node.x() - step));
                moved = true;
                break;
            case 'ArrowRight':
                nodes.forEach(node => node.x(node.x() + step));
                moved = true;
                break;
        }

        if (moved) {
            e.preventDefault();
            layer.value.batchDraw();
            isKeyboardMoving.value = true;
            if (nodes.length === 1) emitNodeProperties(nodes[0]);
        }
    };

    const handleKeyUp = (e) => {
        if (isKeyboardMoving.value) {
            // Save history only when we stop moving
            saveHistory();
            emit('change');
            isKeyboardMoving.value = false;
        }
    };

    const handleGlobalMouseUp = () => {
        if (isSelecting.value) {
            isSelecting.value = false;
            if (selectionRect.value) {
                selectionRect.value.visible(false);
            }
            if (layer.value) {
                layer.value.batchDraw();
            }
        }
    };

    const handleWindowFocus = () => {
        // Reset states when window regains focus (e.g. after file dialog)
        isSelecting.value = false;
        if (selectionRect.value) selectionRect.value.visible(false);
        if (layer.value) layer.value.batchDraw();
    };

    onUnmounted(() => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
        window.removeEventListener('touchend', handleGlobalMouseUp);
        window.removeEventListener('focus', handleWindowFocus);
    });

    const setupEvents = () => {
        if (!stage.value) return;

        // Keyboard events
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('focus', handleWindowFocus);



        const handleSelectionAction = (nodeToSelect, isMulti) => {
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
        };

        // Flag to track if we just finished a drag selection
        stage.value.on('click tap', (e) => {
            const target = e.target;

            // Deselect if clicked on stage or background
            if (target === stage.value || target.id() === 'paper-bg') {
                // If the click happened after a drag-selection, e.target might still be stage
                // but we should only deselect if it was a "pure" click, not a box selection release.
                // However, Konva's 'click' event already has a default distance threshold.
                // The issue is likely that our custom selection logic is conflicting.

                // Only deselect if selection box was tiny or didn't exist
                if (!currentSelectionBox || (currentSelectionBox.width < 5 && currentSelectionBox.height < 5)) {
                    transformer.value.nodes([]);
                    selectedId.value = null;
                    emit('selected', null);
                }
                return;
            }
        });

        // State to track the logical selection box during drag
        let currentSelectionBox = null;

        // Helper to get pointer position relative to paperGroup
        const getLocalPointerPosition = () => {
            const transform = paperGroup.value.getAbsoluteTransform().copy();
            transform.invert();
            return transform.point(stage.value.getPointerPosition());
        };

        // Rubber Band Selection Logic
        stage.value.on('mousedown touchstart', (e) => {
            if (toolMode.value !== 'select') return;

            const target = e.target;

            // Selection on mousedown for shapes (Responsive)
            if (target !== stage.value && target.id() !== 'paper-bg') {
                // Ignore transformer clicks
                if (target.getParent() && target.getParent().className === 'Transformer') return;

                // Handle Group Selection
                let nodeToSelect = target;
                if (target.getParent() && target.getParent().name() && target.getParent().name().includes('editable-group')) {
                    nodeToSelect = target.getParent();
                }

                const isMulti = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
                handleSelectionAction(nodeToSelect, isMulti);
                return;
            }

            // Get position relative to paperGroup (handles zoom/pan correctly)
            const pos = getLocalPointerPosition();
            selectionStart.value = { x: pos.x, y: pos.y }; // Relative to stage content


            currentSelectionBox = null;

            // Set the initial position of the selection rectangle
            selectionRect.value.setAttrs({
                x: pos.x,
                y: pos.y,
                width: 0,
                height: 0,
            });
            selectionRect.value.visible(true);
            isSelecting.value = true;

            layer.value.batchDraw();
        });

        stage.value.on('mousemove touchmove', (e) => {
            if (!isSelecting.value) return;

            // Get position relative to paperGroup
            const pos = getLocalPointerPosition();

            const x = Math.min(selectionStart.value.x, pos.x);
            const y = Math.min(selectionStart.value.y, pos.y);
            const w = Math.abs(pos.x - selectionStart.value.x);
            const h = Math.abs(pos.y - selectionStart.value.y);

            currentSelectionBox = { x, y, width: w, height: h };
            // console.log('Selection Move:', currentSelectionBox);

            selectionRect.value.setAttrs({
                x: x,
                y: y,
                width: w,
                height: h,
            });
            layer.value.batchDraw();
        });

        stage.value.on('mouseup touchend', (e) => {
            if (!isSelecting.value) return;
            isSelecting.value = false;
            selectionRect.value.visible(false);

            // Use the last calculated box from mousemove, or calculate if single click/immediate up
            let box = currentSelectionBox;

            if (!box) {
                // Fallback if no move happened (e.g. click)
                const pos = getLocalPointerPosition();
                const sx = selectionStart.value.x;
                const sy = selectionStart.value.y;
                box = {
                    x: Math.min(sx, pos.x),
                    y: Math.min(sy, pos.y),
                    width: Math.abs(pos.x - sx),
                    height: Math.abs(pos.y - sy)
                };
            }



            // Find intersecting nodes
            const children = paperGroup.value.getChildren();
            const selected = children.filter(node => {
                // Skip background and the selection rect itself
                if (node.id() === 'paper-bg') return false;
                if (node === selectionRect.value) return false;
                if (!node.visible()) return false;

                // Get node bounding box using local coordinates
                // This is more reliable than getClientRect with relativeTo for intersection
                const nodeBox = {
                    x: node.x(),
                    y: node.y(),
                    width: node.width() * (node.scaleX() || 1),
                    height: node.height() * (node.scaleY() || 1)
                };

                // Check if nodeBox is fully contained within the selection box
                const isContained =
                    nodeBox.x >= box.x &&
                    nodeBox.y >= box.y &&
                    (nodeBox.x + nodeBox.width) <= (box.x + box.width) &&
                    (nodeBox.y + nodeBox.height) <= (box.y + box.height);



                return isContained;
            });



            // We don't need the flag anymore, we check box size in the click handler

            transformer.value.nodes(selected);
            if (selected.length > 0) {
                selectedId.value = selected[0].id();
                emitNodeProperties(selected[selected.length - 1]);
            } else {
                selectedId.value = null;
                emit('selected', null);
            }

            // Force redraw
            layer.value.batchDraw();
        });

        stage.value.on('dragstart', (e) => {
            // Ensure selection box state is cleared when dragging items
            isSelecting.value = false;
            currentSelectionBox = null;
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
                    // Text scaling is often left as is in Konva to preserve font quality
                    // or handled by changing fontSize. But here we can leave scale.
                } else if (node.className === 'Rect' || node.className === 'Image') {
                    node.width(node.width() * scaleX);
                    node.height(node.height() * scaleY);
                    node.scaleX(1);
                    node.scaleY(1);
                } else if (node.className === 'Circle') {
                    // Only normalize if scaling is uniform to avoid distortion loss
                    if (Math.abs(scaleX - scaleY) < 0.001) {
                        node.radius(node.radius() * scaleX);
                        node.scaleX(1);
                        node.scaleY(1);
                    }
                } else if (node.className === 'Star') {
                    // Fix: Scale both radii to maintain star shape
                    if (Math.abs(scaleX - scaleY) < 0.001) {
                        const s = scaleX;
                        node.innerRadius(node.innerRadius() * s);
                        node.outerRadius(node.outerRadius() * s);
                        node.scaleX(1);
                        node.scaleY(1);
                    }
                } else if (node.className === 'Line' || node.className === 'Arrow') {
                    // For lines, normalizing is complex (need to update points array)
                    // It's safer to just keep the scale for now.
                }
            }

            if (selectedId.value === node.id()) {
                emitNodeProperties(node);
                emit('change');
            }
            saveHistory();
        });

        window.addEventListener('mouseup', handleGlobalMouseUp);
        window.addEventListener('touchend', handleGlobalMouseUp);
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

        // Shape properties (Rect, Circle, Star, Line, Path, Arrow)
        const shapeTypes = ['Rect', 'Circle', 'Star', 'Line', 'Path', 'Arrow'];
        if (shapeTypes.includes(node.className)) {
            nodeProps.fill = node.fill() || 'transparent';
            nodeProps.stroke = node.stroke() || 'black';
            nodeProps.strokeWidth = node.strokeWidth() || 2;
            // Handle dash - convert array to string for UI
            const dash = node.dash();
            if (dash && dash.length > 0) {
                nodeProps.dashStyle = dash.join(',');
            } else {
                nodeProps.dashStyle = '';
            }
        }

        // Custom Props for Weather Group
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
        // Deprecated: Just alias to centerStage to ensure consistency
        centerStage();
    };

    const fitStageToParent = () => {
        if (!stageContainer.value || !stage.value) return;
        const width = stageContainer.value.offsetWidth;
        const height = stageContainer.value.offsetHeight;
        stage.value.width(width);
        stage.value.height(height);
        centerStage();
    };

    // Public Actions
    const addText = (pos = { x: 50, y: 50 }) => {
        if (!paperGroup.value) return;
        const text = new Konva.Text({
            x: pos.x,
            y: pos.y,
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
        isSelecting.value = false;
        if (selectionRect.value) selectionRect.value.visible(false);
        saveHistory();
        emit('change');
    };

    const addImage = (url, pos = null) => {
        if (!paperGroup.value) return;

        // Default position if not provided: center of viewport or 50,50
        const finalPos = pos || { x: 50, y: 50 };

        Konva.Image.fromURL(url, (img) => {
            img.setAttrs({
                x: finalPos.x,
                y: finalPos.y,
                width: 200,
                height: 200,
                draggable: true,
                id: `image-${Date.now()}`,
                name: 'editable-image',
                imageSrc: url
            });
            setupCursorEvents(img);
            paperGroup.value.add(img);
            selectNode(img);

            // Reset selection state to prevent stickiness
            isSelecting.value = false;
            if (selectionRect.value) selectionRect.value.visible(false);

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

    const updateNode = (id, attrs, skipHistory = false) => {
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

            // Handle shape properties
            if (attrs.dashStyle !== undefined) {
                // Convert dashStyle string to array for Konva
                if (attrs.dashStyle === '' || attrs.dashStyle === 'solid') {
                    attrs.dash = [];
                } else if (attrs.dashStyle === 'dashed') {
                    attrs.dash = [10, 5];
                } else if (attrs.dashStyle === 'dotted') {
                    attrs.dash = [2, 4];
                } else if (attrs.dashStyle === 'dash-dot') {
                    attrs.dash = [10, 5, 2, 5];
                } else {
                    // Custom: parse comma-separated values
                    const parts = attrs.dashStyle.split(',').map(Number).filter(n => !Number.isNaN(n));
                    attrs.dash = parts.length > 0 ? parts : [];
                }
                delete attrs.dashStyle;
            }

            // Normal attribute updates
            if (attrs.x !== undefined) attrs.x = Math.round(attrs.x);
            if (attrs.y !== undefined) attrs.y = Math.round(attrs.y);

            // Handle explicit Width/Height changes from props panel
            if (attrs.width !== undefined || attrs.height !== undefined) {
                if (node.className === 'Circle') {
                    const newRadius = (attrs.width || attrs.height || node.width()) / 2;
                    node.radius(newRadius);
                    delete attrs.width;
                    delete attrs.height;
                } else if (node.className === 'Star') {
                    const oldWidth = node.width() * node.scaleX();
                    const newWidth = attrs.width || oldWidth;
                    const ratio = newWidth / oldWidth;
                    node.innerRadius(node.innerRadius() * ratio);
                    node.outerRadius(node.outerRadius() * ratio);
                    delete attrs.width;
                    delete attrs.height;
                }
                // Only reset scale if we've handled the normalization
                if (['Rect', 'Image', 'Circle', 'Star'].includes(node.className)) {
                    node.scaleX(1);
                    node.scaleY(1);
                }
            }

            node.setAttrs(attrs);
            layer.value.batchDraw();

            // Save history for property changes (important for Undo to work on props)
            if (!skipHistory) {
                saveHistory();
            }
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

        // Hide grid layer (so grid lines don't appear in export)
        const gridWasVisible = gridLayer.value && gridLayer.value.visible();
        if (gridLayer.value) {
            gridLayer.value.hide();
        }

        // Hide dynamic nodes if requested
        if (excludeDynamic) {
            const dynamicTypes = [
                'time', 'date', 'weather',
                'weather-temp', 'weather-humidity', 'weather-wind', 'weather-precip', 'weather-icon'
            ];
            const children = paperGroup.value.getChildren();
            children.forEach(node => {
                const type = node.getAttr('nodeType');
                if (dynamicTypes.includes(type) || node.name()?.includes('dynamic')) {
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

        // Restore grid layer visibility
        if (gridWasVisible && gridLayer.value) {
            gridLayer.value.show();
        }

        // Restore transformer
        transformer.value.nodes(oldNodes);
        layer.value.batchDraw();

        return dataURL;
    };

    const exportState = () => {
        if (!paperGroup.value) return null;

        // Custom serialization to handle nested children in groups
        const nodes = paperGroup.value.getChildren((node) => node.id() !== 'paper-bg' && node.id() !== 'selection-rect').map(node => {
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
            // Clear existing (except background and selection rect)
            const children = paperGroup.value.getChildren((node) =>
                node.id() !== 'paper-bg' && node.id() !== 'selection-rect'
            );
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
                    if (def.className === 'Star') return new Konva.Star(def.attrs);
                    if (def.className === 'Line') return new Konva.Line(def.attrs);
                    if (def.className === 'Path') return new Konva.Path(def.attrs);
                    if (def.className === 'Arrow') return new Konva.Arrow(def.attrs);
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
            centerStage();
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
    const addTimeNode = (pos = { x: 50, y: 50 }) => {
        if (!paperGroup.value) return;
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const text = new Konva.Text({
            x: pos.x,
            y: pos.y,
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
        isSelecting.value = false;
        if (selectionRect.value) selectionRect.value.visible(false);
        saveHistory();
        emit('change');
    };

    // Advanced Weather Node (Group)
    const addWeatherNode = (pos = { x: 50, y: 50 }) => {
        if (!paperGroup.value) return;

        const group = new Konva.Group({
            x: pos.x,
            y: pos.y,
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
        isSelecting.value = false;
        if (selectionRect.value) selectionRect.value.visible(false);
        saveHistory();
        emit('change');
    };

    const addDateNode = (pos = { x: 50, y: 100 }) => {
        if (!paperGroup.value) return;
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        const text = new Konva.Text({
            x: pos.x,
            y: pos.y,
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
        isSelecting.value = false;
        if (selectionRect.value) selectionRect.value.visible(false);
        saveHistory();
        emit('change');
    };

    // Weather Sub-Components (Independent Nodes)
    const addWeatherTempNode = (pos = { x: 50, y: 50 }) => {
        if (!paperGroup.value) return;
        const text = new Konva.Text({
            x: pos.x,
            y: pos.y,
            text: '24°C',
            fontSize: 36,
            fontFamily: 'sans-serif',
            fill: 'black',
            draggable: true,
            id: `weather-temp-${Date.now()}`,
            name: 'editable-text',
            nodeType: 'weather-temp',
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
        isSelecting.value = false;
        if (selectionRect.value) selectionRect.value.visible(false);
        saveHistory();
        emit('change');
    };

    const addWeatherHumidityNode = (pos = { x: 50, y: 50 }) => {
        if (!paperGroup.value) return;
        const text = new Konva.Text({
            x: pos.x,
            y: pos.y,
            text: '💧 65%',
            fontSize: 20,
            fontFamily: 'sans-serif',
            fill: '#666',
            draggable: true,
            id: `weather-humidity-${Date.now()}`,
            name: 'editable-text',
            nodeType: 'weather-humidity',
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
        isSelecting.value = false;
        if (selectionRect.value) selectionRect.value.visible(false);
        saveHistory();
        emit('change');
    };

    const addWeatherWindNode = (pos = { x: 50, y: 50 }) => {
        if (!paperGroup.value) return;
        const text = new Konva.Text({
            x: pos.x,
            y: pos.y,
            text: '🍃 12km/h',
            fontSize: 20,
            fontFamily: 'sans-serif',
            fill: '#666',
            draggable: true,
            id: `weather-wind-${Date.now()}`,
            name: 'editable-text',
            nodeType: 'weather-wind',
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
        isSelecting.value = false;
        if (selectionRect.value) selectionRect.value.visible(false);
        saveHistory();
        emit('change');
    };

    const addWeatherPrecipNode = (pos = { x: 50, y: 50 }) => {
        if (!paperGroup.value) return;
        const text = new Konva.Text({
            x: pos.x,
            y: pos.y,
            text: '☔ 20%',
            fontSize: 20,
            fontFamily: 'sans-serif',
            fill: '#666',
            draggable: true,
            id: `weather-precip-${Date.now()}`,
            name: 'editable-text',
            nodeType: 'weather-precip',
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
        isSelecting.value = false;
        if (selectionRect.value) selectionRect.value.visible(false);
        saveHistory();
        emit('change');
    };

    const addWeatherIconNode = (pos = { x: 50, y: 50 }) => {
        if (!paperGroup.value) return;
        const text = new Konva.Text({
            x: pos.x,
            y: pos.y,
            text: '⛅',
            fontSize: 48,
            fontFamily: 'sans-serif',
            fill: 'black',
            draggable: true,
            id: `weather-icon-${Date.now()}`,
            name: 'editable-text',
            nodeType: 'weather-icon',
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
        isSelecting.value = false;
        if (selectionRect.value) selectionRect.value.visible(false);
        saveHistory();
        emit('change');
    };

    const addRect = (pos = { x: 50, y: 50 }) => {
        if (!paperGroup.value) return;
        const rect = new Konva.Rect({
            x: pos.x,
            y: pos.y,
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
        isSelecting.value = false;
        if (selectionRect.value) selectionRect.value.visible(false);
        saveHistory();
        emit('change');
    };

    const addCircle = (pos = { x: 100, y: 100 }) => {
        if (!paperGroup.value) return;
        const circle = new Konva.Circle({
            x: pos.x,
            y: pos.y,
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
        isSelecting.value = false;
        if (selectionRect.value) selectionRect.value.visible(false);
        saveHistory();
        emit('change');
    };

    const addTriangle = (pos = { x: 50, y: 50 }) => {
        if (!paperGroup.value) return;
        const size = 80;
        const height = size * Math.sqrt(3) / 2;
        const triangle = new Konva.Line({
            x: pos.x,
            y: pos.y,
            points: [size / 2, 0, size, height, 0, height],
            closed: true,
            fill: 'transparent',
            stroke: 'black',
            strokeWidth: 2,
            draggable: true,
            id: `triangle-${Date.now()}`,
            name: 'editable-shape'
        });
        setupCursorEvents(triangle);
        paperGroup.value.add(triangle);
        selectNode(triangle);
        isSelecting.value = false;
        if (selectionRect.value) selectionRect.value.visible(false);
        saveHistory();
        emit('change');
    };

    const addStar = (pos = { x: 100, y: 100 }) => {
        if (!paperGroup.value) return;
        const star = new Konva.Star({
            x: pos.x,
            y: pos.y,
            numPoints: 5,
            innerRadius: 25,
            outerRadius: 50,
            fill: 'transparent',
            stroke: 'black',
            strokeWidth: 2,
            draggable: true,
            id: `star-${Date.now()}`,
            name: 'editable-shape'
        });
        setupCursorEvents(star);
        paperGroup.value.add(star);
        selectNode(star);
        isSelecting.value = false;
        if (selectionRect.value) selectionRect.value.visible(false);
        saveHistory();
        emit('change');
    };

    const addHeart = (pos = { x: 50, y: 50 }) => {
        if (!paperGroup.value) return;
        // Heart shape using bezier curves approximation via Path
        const heart = new Konva.Path({
            x: pos.x,
            y: pos.y,
            data: 'M 40 20 C 40 10 30 0 20 0 C 10 0 0 10 0 20 C 0 40 20 55 40 70 C 60 55 80 40 80 20 C 80 10 70 0 60 0 C 50 0 40 10 40 20 Z',
            fill: 'transparent',
            stroke: 'black',
            strokeWidth: 2,
            scaleX: 0.8,
            scaleY: 0.8,
            draggable: true,
            id: `heart-${Date.now()}`,
            name: 'editable-shape'
        });
        setupCursorEvents(heart);
        paperGroup.value.add(heart);
        selectNode(heart);
        isSelecting.value = false;
        if (selectionRect.value) selectionRect.value.visible(false);
        saveHistory();
        emit('change');
    };

    const addLine = (pos = { x: 50, y: 50 }) => {
        if (!paperGroup.value) return;
        const line = new Konva.Line({
            x: pos.x,
            y: pos.y,
            points: [0, 0, 100, 0],
            stroke: 'black',
            strokeWidth: 2,
            draggable: true,
            id: `line-${Date.now()}`,
            name: 'editable-shape'
        });
        setupCursorEvents(line);
        paperGroup.value.add(line);
        selectNode(line);
        isSelecting.value = false;
        if (selectionRect.value) selectionRect.value.visible(false);
        saveHistory();
        emit('change');
    };

    const addArrow = (pos = { x: 50, y: 50 }) => {
        if (!paperGroup.value) return;
        const arrow = new Konva.Arrow({
            x: pos.x,
            y: pos.y,
            points: [0, 0, 100, 0],
            pointerLength: 10,
            pointerWidth: 10,
            fill: 'black',
            stroke: 'black',
            strokeWidth: 2,
            draggable: true,
            id: `arrow-${Date.now()}`,
            name: 'editable-shape'
        });
        setupCursorEvents(arrow);
        paperGroup.value.add(arrow);
        selectNode(arrow);
        isSelecting.value = false;
        if (selectionRect.value) selectionRect.value.visible(false);
        saveHistory();
        emit('change');
    };

    const addBatteryNode = (pos = { x: 50, y: 50 }) => {
        if (!paperGroup.value) return;
        const group = new Konva.Group({
            x: pos.x,
            y: pos.y,
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

    const getRelativePointerPosition = () => {
        if (!stage.value || !paperGroup.value) return { x: 0, y: 0 };

        const transform = paperGroup.value.getAbsoluteTransform().copy();
        transform.invert();

        const pos = stage.value.getPointerPosition();
        if (!pos) return { x: 0, y: 0 };

        return transform.point(pos);
    };

    const getNodes = () => {
        if (!paperGroup.value) return [];
        return paperGroup.value.getChildren(node => node.id() !== 'paper-bg' && node.id() !== 'selection-rect').map(node => ({
            id: node.id(),
            type: node.className,
            nodeType: node.getAttr('nodeType') || 'basic',
            name: node.name(),
            visible: node.visible(),
            zIndex: node.zIndex()
        })).reverse(); // Reverse so top-most (last added) is first in list
    };

    const selectById = (id) => {
        if (!paperGroup.value) return;
        const node = paperGroup.value.findOne('#' + id);
        if (node) {
            selectNode(node);
        } else {
            transformer.value.nodes([]);
            selectedId.value = null;
            emit('selected', null);
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
        // Weather Sub-Components
        addWeatherTempNode,
        addWeatherHumidityNode,
        addWeatherWindNode,
        addWeatherPrecipNode,
        addWeatherIconNode,
        getPartialDataURL,
        addRect,
        addCircle,
        addTriangle,
        addStar,
        addHeart,
        addLine,
        addArrow,
        addBatteryNode,
        undo,
        redo,
        saveHistory, // Expose for manual saves if needed
        resetHistory, // Expose reset
        canUndo,
        canRedo,
        isDirty,
        markSaved,
        clearCanvas,
        scale,
        setZoom,
        zoomIn,
        zoomOut,
        resetZoom,
        centerStage,
        toolMode,
        setToolMode,
        selectAll,
        getNodes,
        selectById,
        getRelativePointerPosition
    };
}
