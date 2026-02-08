// Selection Module
// Handles selection of drawn strokes, images, and text

class SelectionManager {
    constructor(canvas, ctx, drawingEngine, strokeControls) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.drawingEngine = drawingEngine;
        this.strokeControls = strokeControls;
        this.textManager = null; // Set later via setTextManager
        this.historyManager = null; // Set later via setHistoryManager
        
        this.isActive = false;
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.selectedStrokes = [];
        
        // Current selection type and index
        this.selectionType = null; // 'stroke', 'text', 'image', or 'multi'
        this.selectedIndex = null;
        
        // Dragging state
        this.isDragging = false;
        this.dragStartPos = { x: 0, y: 0 };
        this.dragStartObjectPos = { x: 0, y: 0 };
        
        // Rotating state
        this.isRotating = false;
        this.rotateStartAngle = 0;
        this.rotateStartRotation = 0;
        
        // Resizing state
        this.isResizing = false;
        this.resizeHandle = null;
        this.resizeStartBounds = null;
        
        // Track if changes were made that need to be saved
        this.hasUnsavedChanges = false;
        
        // Constants
        this.COPY_OFFSET = 20;
        this.HANDLE_SIZE = 8;
        this.ROTATION_HANDLE_DISTANCE = 30;
        this.HANDLE_THRESHOLD = 10;
        this.MIN_SIZE = 10;
        
        // For lasso/rectangle selection
        this.selectionMode = 'click'; // 'click', 'rectangle', or 'lasso'
        this.isBoxSelecting = false;
        this.boxSelectStart = null;
        this.boxSelectEnd = null;
        
        // Lasso selection state
        this.isLassoSelecting = false;
        this.lassoPoints = []; // Array of {x, y} screen coords
        
        // Multi-select state
        this.multiDragStartPositions = [];
        this.multiBounds = null;
        
        // Create selection controls overlay
        this.createSelectionControls();
    }
    
    setTextManager(textManager) {
        this.textManager = textManager;
    }
    
    setHistoryManager(historyManager) {
        this.historyManager = historyManager;
    }
    
    createSelectionControls() {
        // Create selection controls overlay similar to stroke-controls
        const controlsHTML = `
            <div id="selection-controls-overlay" class="image-controls-overlay" style="display: none; z-index: 1500;">
                <div id="selection-controls-box" class="image-controls-box">
                    <!-- Corner resize handles -->
                    <div class="resize-handle top-left" data-handle="top-left"></div>
                    <div class="resize-handle top-right" data-handle="top-right"></div>
                    <div class="resize-handle bottom-left" data-handle="bottom-left"></div>
                    <div class="resize-handle bottom-right" data-handle="bottom-right"></div>
                    
                    <!-- Edge resize handles -->
                    <div class="resize-handle top" data-handle="top"></div>
                    <div class="resize-handle right" data-handle="right"></div>
                    <div class="resize-handle bottom" data-handle="bottom"></div>
                    <div class="resize-handle left" data-handle="left"></div>
                    
                    <!-- Rotation handle -->
                    <div class="rotate-handle" id="selection-rotate-handle">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                        </svg>
                    </div>
                    
                    <!-- Control toolbar with action buttons -->
                    <div class="image-controls-toolbar selection-action-toolbar">
                        <button id="selection-copy-btn" class="image-control-btn" data-i18n-title="selection.copy" title="Copy">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                            </svg>
                        </button>
                        <button id="selection-delete-btn" class="image-control-btn image-cancel-btn" data-i18n-title="selection.delete" title="Delete">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                            </svg>
                        </button>
                        <button id="selection-done-btn" class="image-control-btn image-done-btn" data-i18n-title="selection.done" title="Done">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', controlsHTML);
        
        this.overlay = document.getElementById('selection-controls-overlay');
        this.controlBox = document.getElementById('selection-controls-box');
        
        // Box selection rectangle overlay
        this.boxSelectDiv = document.createElement('div');
        this.boxSelectDiv.id = 'box-select-rect';
        this.boxSelectDiv.style.cssText = 'display:none; position:fixed; border:2px dashed #888; background:rgba(128,128,128,0.1); pointer-events:none; z-index:1400;';
        document.body.appendChild(this.boxSelectDiv);
        
        // Lasso selection SVG overlay
        this.lassoSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.lassoSvg.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:1400;';
        this.lassoPath = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        this.lassoPath.setAttribute('fill', 'rgba(128,128,128,0.1)');
        this.lassoPath.setAttribute('stroke', '#888');
        this.lassoPath.setAttribute('stroke-width', '2');
        this.lassoPath.setAttribute('stroke-dasharray', '6 4');
        this.lassoSvg.appendChild(this.lassoPath);
        document.body.appendChild(this.lassoSvg);
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Drag selection box
        this.controlBox.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            if (e.target === this.controlBox || e.target.closest('.image-controls-box') === this.controlBox) {
                if (!e.target.classList.contains('resize-handle') && 
                    !e.target.closest('.resize-handle') &&
                    !e.target.closest('.rotate-handle') &&
                    !e.target.closest('.image-controls-toolbar')) {
                    this.startDrag(e);
                }
            }
        });
        
        this.controlBox.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            if (e.target === this.controlBox || e.target.closest('.image-controls-box') === this.controlBox) {
                if (!e.target.classList.contains('resize-handle') && 
                    !e.target.closest('.resize-handle') &&
                    !e.target.closest('.rotate-handle') &&
                    !e.target.closest('.image-controls-toolbar')) {
                    this.startDrag(e);
                }
            }
        });
        
        this.controlBox.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            if (e.target === this.controlBox || e.target.closest('.image-controls-box') === this.controlBox) {
                if (!e.target.classList.contains('resize-handle') && 
                    !e.target.closest('.resize-handle') &&
                    !e.target.closest('.rotate-handle') &&
                    !e.target.closest('.image-controls-toolbar')) {
                    this.startDrag(e);
                }
            }
        }, { passive: false });
        
        // Resize handles
        this.controlBox.querySelectorAll('.resize-handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.startResize(e, handle.dataset.handle);
            });
            handle.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.startResize(e, handle.dataset.handle);
            });
            handle.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.startResize(e, handle.dataset.handle);
            }, { passive: false });
        });
        
        // Rotation handle
        const rotateHandle = document.getElementById('selection-rotate-handle');
        if (rotateHandle) {
            rotateHandle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.startRotate(e);
            });
            rotateHandle.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.startRotate(e);
            });
            rotateHandle.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.startRotate(e);
            }, { passive: false });
        }
        
        // Global mouse/touch events
        const handleMove = (e) => {
            if (this.isDragging) {
                this.drag(e);
            } else if (this.isResizing) {
                this.resize(e);
            } else if (this.isRotating) {
                this.rotate(e);
            }
        };
        
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('pointermove', handleMove);
        
        document.addEventListener('touchmove', (e) => {
            if (this.isDragging || this.isResizing || this.isRotating) {
                e.preventDefault();
                if (this.isDragging) {
                    this.drag(e);
                } else if (this.isResizing) {
                    this.resize(e);
                } else if (this.isRotating) {
                    this.rotate(e);
                }
            }
        }, { passive: false });
        
        document.addEventListener('mouseup', () => {
            this.stopDrag();
            this.stopResize();
            this.stopRotate();
        });
        
        document.addEventListener('pointerup', () => {
            this.stopDrag();
            this.stopResize();
            this.stopRotate();
        });
        
        document.addEventListener('touchend', () => {
            this.stopDrag();
            this.stopResize();
            this.stopRotate();
        });
        
        // Also handle pointer cancel (e.g., when touch is interrupted)
        document.addEventListener('pointercancel', () => {
            this.stopDrag();
            this.stopResize();
            this.stopRotate();
        });
        
        document.addEventListener('touchcancel', () => {
            this.stopDrag();
            this.stopResize();
            this.stopRotate();
        });
        
        // Action buttons - need to handle both mousedown and click to prevent event propagation
        const copyBtn = document.getElementById('selection-copy-btn');
        const deleteBtn = document.getElementById('selection-delete-btn');
        const doneBtn = document.getElementById('selection-done-btn');
        
        // Add mousedown/pointerdown handlers to prevent events from propagating to document
        [copyBtn, deleteBtn, doneBtn].forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
            });
            btn.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                e.preventDefault();
            });
        });
        
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.copySelection();
        });
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.deleteSelection();
        });
        
        doneBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.finishSelection();
        });
    }
    
    // Normalize angle to 0-360 degrees
    normalizeAngle(angle) {
        return ((angle % 360) + 360) % 360;
    }
    
    getClientPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }
    
    getCanvasScale() {
        const computedStyle = window.getComputedStyle(this.canvas);
        const matrix = new DOMMatrix(computedStyle.transform);
        return matrix.a || 1;
    }
    
    getCanvasCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const pos = this.getClientPos(e);
        const x = pos.x - rect.left;
        const y = pos.y - rect.top;
        
        // Adjust coordinates for canvas scale
        const scaleX = this.canvas.offsetWidth / rect.width;
        const scaleY = this.canvas.offsetHeight / rect.height;
        let adjustedX = x * scaleX;
        let adjustedY = y * scaleY;
        
        return { x: adjustedX, y: adjustedY };
    }

    isEventOnCanvas(e) {
        const rect = this.canvas.getBoundingClientRect();
        const pos = this.getClientPos(e);
        const x = pos.x - rect.left;
        const y = pos.y - rect.top;
        return x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
    }

    activate() {
        this.isActive = true;
        this.canvas.style.cursor = 'crosshair';
    }
    
    deactivate() {
        this.isActive = false;
        this.clearSelection();
        this.canvas.style.cursor = 'default';
    }

    startSelection(e) {
        if (!this.isActive) return false;
        
        // Don't start new selection if clicking on the selection controls overlay
        if (e.target && e.target.closest && e.target.closest('#selection-controls-overlay')) {
            return false;
        }
        
        this.isSelecting = true;
        const coords = this.getCanvasCoordinates(e);
        
        // Rectangle selection mode
        if (this.selectionMode === 'rectangle') {
            this.startBoxSelection(e);
            return true;
        }
        
        // Lasso selection mode
        if (this.selectionMode === 'lasso') {
            this.startLassoSelection(e);
            return true;
        }
        
        // Click selection mode
        // First, check for text objects
        if (this.textManager && this.textManager.textObjects && this.textManager.textObjects.length > 0) {
            const textIndex = this.textManager.hitTestText(coords.x, coords.y);
            if (textIndex >= 0) {
                this.selectText(textIndex);
                return true;
            }
        }
        
        // Check for stamped images
        const imageIndex = this.drawingEngine.findImageAtPoint(coords.x, coords.y);
        if (imageIndex !== null) {
            this.selectImage(imageIndex);
            return true;
        }
        
        // Then check for strokes
        const strokeIndex = this.drawingEngine.findStrokeAtPoint(coords.x, coords.y);
        if (strokeIndex !== null) {
            this.selectStroke(strokeIndex);
            return true;
        }
        
        // If not on any object, deselect everything
        this.clearSelection();
        
        return false;
    }
    
    selectStroke(index) {
        this.selectionType = 'stroke';
        this.selectedIndex = index;
        this.drawingEngine.selectStroke(index);
        this.showControls();
        this.redrawWithSelection();
    }
    
    selectText(index) {
        this.selectionType = 'text';
        this.selectedIndex = index;
        if (this.textManager) {
            this.textManager.selectedTextIndex = index;
        }
        this.showControls();
        this.redrawWithSelection();
    }
    
    selectImage(index) {
        this.selectionType = 'image';
        this.selectedIndex = index;
        this.drawingEngine.selectImage(index);
        this.showControls();
        this.redrawWithSelection();
    }
    
    showControls() {
        this.overlay.style.display = 'block';
        this.updateControlBox();
    }
    
    hideControls() {
        this.overlay.style.display = 'none';
    }
    
    updateControlBox() {
        if (this.selectionType === null) return;
        if (this.selectionType !== 'multi' && this.selectedIndex === null) return;
        
        let bounds = null;
        let rotation = 0;
        
        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            if (!stroke) return;
            if (this.isRotating && stroke.originalBounds) {
                bounds = stroke.originalBounds;
            } else {
                bounds = this.drawingEngine.getStrokeBounds(stroke);
            }
            rotation = stroke.rotation || 0;
        } else if (this.selectionType === 'text' && this.textManager) {
            const textObj = this.textManager.textObjects[this.selectedIndex];
            if (!textObj) return;
            const lineCount = textObj.text.split('\n').length;
            bounds = {
                x: textObj.x - 5,
                y: textObj.y - 5,
                width: textObj.width * textObj.scale + 10,
                height: textObj.height * lineCount * textObj.scale + 10
            };
            rotation = textObj.rotation || 0;
        } else if (this.selectionType === 'image') {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            if (!img) return;
            bounds = this.drawingEngine.getImageBounds(img);
            rotation = img.rotation || 0;
        } else if (this.selectionType === 'multi') {
            bounds = this.getMultiBounds();
            rotation = 0;
        }
        
        if (!bounds) return;
        
        const rect = this.canvas.getBoundingClientRect();
        
        // Use the same scale calculation as getCanvasCoordinates for consistency
        const scaleX = rect.width / this.canvas.offsetWidth;
        const scaleY = rect.height / this.canvas.offsetHeight;
        
        // Calculate actual position and size accounting for canvas transform
        // bounds coordinates are in canvas pixel space, need to convert to screen space
        const actualX = rect.left + (bounds.x * scaleX);
        const actualY = rect.top + (bounds.y * scaleY);
        const actualWidth = bounds.width * scaleX;
        const actualHeight = bounds.height * scaleY;
        
        this.controlBox.style.left = `${actualX}px`;
        this.controlBox.style.top = `${actualY}px`;
        this.controlBox.style.width = `${actualWidth}px`;
        this.controlBox.style.height = `${actualHeight}px`;
        this.controlBox.style.transform = `rotate(${rotation}deg)`;
    }
    
    // Drag handling
    startDrag(e) {
        if (this.selectionType === 'multi') {
            // Multi-select drag
        } else if (this.selectedIndex === null) {
            return;
        }
        
        e.preventDefault();
        this.isDragging = true;
        this.dragStartPos = this.getClientPos(e);
        
        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            const bounds = this.drawingEngine.getStrokeBounds(stroke);
            this.dragStartObjectPos = { x: bounds.x, y: bounds.y };
            // Store original positions
            for (let point of stroke.points) {
                point.originalX = point.x;
                point.originalY = point.y;
            }
        } else if (this.selectionType === 'text' && this.textManager) {
            const textObj = this.textManager.textObjects[this.selectedIndex];
            this.dragStartObjectPos = { x: textObj.x, y: textObj.y };
        } else if (this.selectionType === 'image') {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            this.dragStartObjectPos = { x: img.x, y: img.y };
        } else if (this.selectionType === 'multi') {
            this.multiDragStartPositions = [];
            for (const idx of this.selectedStrokes) {
                const stroke = this.drawingEngine.strokes[idx];
                if (stroke) {
                    for (let point of stroke.points) {
                        point.originalX = point.x;
                        point.originalY = point.y;
                    }
                }
            }
        }
        
        this.controlBox.style.cursor = 'grabbing';
    }
    
    drag(e) {
        if (!this.isDragging) return;
        if (this.selectionType !== 'multi' && this.selectedIndex === null) return;
        
        const pos = this.getClientPos(e);
        const rect = this.canvas.getBoundingClientRect();
        
        // Convert screen delta to canvas coordinate delta
        const scaleX = this.canvas.offsetWidth / rect.width;
        const scaleY = this.canvas.offsetHeight / rect.height;
        const deltaX = (pos.x - this.dragStartPos.x) * scaleX;
        const deltaY = (pos.y - this.dragStartPos.y) * scaleY;
        
        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            for (let point of stroke.points) {
                if (point.originalX !== undefined) {
                    point.x = point.originalX + deltaX;
                    point.y = point.originalY + deltaY;
                }
            }
        } else if (this.selectionType === 'text' && this.textManager) {
            const textObj = this.textManager.textObjects[this.selectedIndex];
            textObj.x = this.dragStartObjectPos.x + deltaX;
            textObj.y = this.dragStartObjectPos.y + deltaY;
        } else if (this.selectionType === 'image') {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            img.x = this.dragStartObjectPos.x + deltaX;
            img.y = this.dragStartObjectPos.y + deltaY;
        } else if (this.selectionType === 'multi') {
            for (const idx of this.selectedStrokes) {
                const stroke = this.drawingEngine.strokes[idx];
                if (stroke) {
                    for (let point of stroke.points) {
                        if (point.originalX !== undefined) {
                            point.x = point.originalX + deltaX;
                            point.y = point.originalY + deltaY;
                        }
                    }
                }
            }
        }
        
        this.updateControlBox();
        this.redrawCanvas();
    }
    
    stopDrag() {
        if (this.isDragging) {
            this.isDragging = false;
            this.hasUnsavedChanges = true;
            this.controlBox.style.cursor = 'move';
            
            // Clear original position markers for strokes
            if (this.selectionType === 'stroke' && this.selectedIndex !== null) {
                const stroke = this.drawingEngine.strokes[this.selectedIndex];
                if (stroke) {
                    for (let point of stroke.points) {
                        delete point.originalX;
                        delete point.originalY;
                    }
                }
            } else if (this.selectionType === 'multi') {
                for (const idx of this.selectedStrokes) {
                    const stroke = this.drawingEngine.strokes[idx];
                    if (stroke) {
                        for (let point of stroke.points) {
                            delete point.originalX;
                            delete point.originalY;
                        }
                    }
                }
            }
        }
    }
    
    // Resize handling
    startResize(e, handle) {
        if (this.selectionType !== 'multi' && this.selectedIndex === null) return;
        
        this.isResizing = true;
        this.resizeHandle = handle;
        this.resizeStartPos = this.getClientPos(e);
        
        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            this.resizeStartBounds = this.drawingEngine.getStrokeBounds(stroke);
            for (let point of stroke.points) {
                point.originalX = point.x;
                point.originalY = point.y;
            }
        } else if (this.selectionType === 'text' && this.textManager) {
            const textObj = this.textManager.textObjects[this.selectedIndex];
            const lineCount = textObj.text.split('\n').length;
            this.resizeStartBounds = {
                x: textObj.x,
                y: textObj.y,
                width: textObj.width * textObj.scale,
                height: textObj.height * lineCount * textObj.scale,
                scale: textObj.scale
            };
        } else if (this.selectionType === 'image') {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            this.resizeStartBounds = { x: img.x, y: img.y, width: img.width, height: img.height };
        } else if (this.selectionType === 'multi') {
            this.resizeStartBounds = this.getMultiBounds();
            for (const idx of this.selectedStrokes) {
                const stroke = this.drawingEngine.strokes[idx];
                if (stroke) {
                    for (let point of stroke.points) {
                        point.originalX = point.x;
                        point.originalY = point.y;
                    }
                }
            }
        }
    }
    
    resize(e) {
        if (!this.isResizing || !this.resizeStartBounds) return;
        if (this.selectionType !== 'multi' && this.selectedIndex === null) return;
        
        const pos = this.getClientPos(e);
        const canvasScale = this.getCanvasScale();
        const deltaX = (pos.x - this.resizeStartPos.x) / canvasScale;
        const deltaY = (pos.y - this.resizeStartPos.y) / canvasScale;
        
        const startBounds = this.resizeStartBounds;
        let newBounds = { ...startBounds };
        
        // Calculate new bounds based on handle
        switch (this.resizeHandle) {
            case 'top-left':
                newBounds.x = startBounds.x + deltaX;
                newBounds.y = startBounds.y + deltaY;
                newBounds.width = Math.max(this.MIN_SIZE, startBounds.width - deltaX);
                newBounds.height = Math.max(this.MIN_SIZE, startBounds.height - deltaY);
                break;
            case 'top-right':
                newBounds.y = startBounds.y + deltaY;
                newBounds.width = Math.max(this.MIN_SIZE, startBounds.width + deltaX);
                newBounds.height = Math.max(this.MIN_SIZE, startBounds.height - deltaY);
                break;
            case 'bottom-left':
                newBounds.x = startBounds.x + deltaX;
                newBounds.width = Math.max(this.MIN_SIZE, startBounds.width - deltaX);
                newBounds.height = Math.max(this.MIN_SIZE, startBounds.height + deltaY);
                break;
            case 'bottom-right':
                newBounds.width = Math.max(this.MIN_SIZE, startBounds.width + deltaX);
                newBounds.height = Math.max(this.MIN_SIZE, startBounds.height + deltaY);
                break;
            case 'top':
                newBounds.y = startBounds.y + deltaY;
                newBounds.height = Math.max(this.MIN_SIZE, startBounds.height - deltaY);
                break;
            case 'bottom':
                newBounds.height = Math.max(this.MIN_SIZE, startBounds.height + deltaY);
                break;
            case 'left':
                newBounds.x = startBounds.x + deltaX;
                newBounds.width = Math.max(this.MIN_SIZE, startBounds.width - deltaX);
                break;
            case 'right':
                newBounds.width = Math.max(this.MIN_SIZE, startBounds.width + deltaX);
                break;
        }
        
        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            for (let point of stroke.points) {
                if (point.originalX !== undefined && point.originalY !== undefined) {
                    const relX = (point.originalX - startBounds.x) / startBounds.width;
                    const relY = (point.originalY - startBounds.y) / startBounds.height;
                    point.x = newBounds.x + relX * newBounds.width;
                    point.y = newBounds.y + relY * newBounds.height;
                }
            }
        } else if (this.selectionType === 'text' && this.textManager) {
            const textObj = this.textManager.textObjects[this.selectedIndex];
            const scaleRatio = newBounds.width / startBounds.width;
            textObj.scale = Math.max(0.1, startBounds.scale * scaleRatio);
            textObj.x = newBounds.x;
            textObj.y = newBounds.y;
        } else if (this.selectionType === 'image') {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            img.x = newBounds.x;
            img.y = newBounds.y;
            img.width = newBounds.width;
            img.height = newBounds.height;
        } else if (this.selectionType === 'multi') {
            for (const idx of this.selectedStrokes) {
                const stroke = this.drawingEngine.strokes[idx];
                if (stroke) {
                    for (let point of stroke.points) {
                        if (point.originalX !== undefined && point.originalY !== undefined) {
                            const relX = (point.originalX - startBounds.x) / startBounds.width;
                            const relY = (point.originalY - startBounds.y) / startBounds.height;
                            point.x = newBounds.x + relX * newBounds.width;
                            point.y = newBounds.y + relY * newBounds.height;
                        }
                    }
                }
            }
        }
        
        this.updateControlBox();
        this.redrawCanvas();
    }
    
    stopResize() {
        if (this.isResizing) {
            this.isResizing = false;
            this.hasUnsavedChanges = true;
            this.resizeHandle = null;
            this.resizeStartBounds = null;
            
            if (this.selectionType === 'stroke' && this.selectedIndex !== null) {
                const stroke = this.drawingEngine.strokes[this.selectedIndex];
                if (stroke) {
                    for (let point of stroke.points) {
                        delete point.originalX;
                        delete point.originalY;
                    }
                }
            } else if (this.selectionType === 'multi') {
                for (const idx of this.selectedStrokes) {
                    const stroke = this.drawingEngine.strokes[idx];
                    if (stroke) {
                        for (let point of stroke.points) {
                            delete point.originalX;
                            delete point.originalY;
                        }
                    }
                }
            }
        }
    }
    
    // Rotation handling
    
    // Calculate the screen-space center of the control box from canvas coordinates.
    // This avoids using getBoundingClientRect() which returns the axis-aligned
    // bounding box and changes size/position as the element rotates.
    getControlBoxScreenCenter() {
        let bounds = null;
        
        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            if (!stroke) return null;
            bounds = stroke.originalBounds || this.drawingEngine.getStrokeBounds(stroke);
        } else if (this.selectionType === 'text' && this.textManager) {
            const textObj = this.textManager.textObjects[this.selectedIndex];
            if (!textObj) return null;
            const lineCount = textObj.text.split('\n').length;
            bounds = {
                x: textObj.x - 5,
                y: textObj.y - 5,
                width: textObj.width * textObj.scale + 10,
                height: textObj.height * lineCount * textObj.scale + 10
            };
        } else if (this.selectionType === 'image') {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            if (!img) return null;
            bounds = { x: img.x, y: img.y, width: img.width, height: img.height };
        } else if (this.selectionType === 'multi') {
            bounds = this.getMultiBounds();
        }
        
        if (!bounds) return null;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = rect.width / this.canvas.offsetWidth;
        const scaleY = rect.height / this.canvas.offsetHeight;
        
        const centerX = rect.left + (bounds.x + bounds.width / 2) * scaleX;
        const centerY = rect.top + (bounds.y + bounds.height / 2) * scaleY;
        return { x: centerX, y: centerY };
    }
    
    startRotate(e) {
        if (this.selectionType !== 'multi' && this.selectedIndex === null) return;
        
        this.isRotating = true;
        
        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            this.rotateStartRotation = stroke.rotation || 0;
            stroke.originalBounds = this.drawingEngine.getStrokeBounds(stroke);
            for (let point of stroke.points) {
                point.originalX = point.x;
                point.originalY = point.y;
            }
        } else if (this.selectionType === 'text' && this.textManager) {
            const textObj = this.textManager.textObjects[this.selectedIndex];
            this.rotateStartRotation = textObj.rotation || 0;
        } else if (this.selectionType === 'image') {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            this.rotateStartRotation = img.rotation || 0;
        } else if (this.selectionType === 'multi') {
            this.rotateStartRotation = 0;
            this.multiBounds = this.getMultiBounds();
            for (const idx of this.selectedStrokes) {
                const stroke = this.drawingEngine.strokes[idx];
                if (stroke) {
                    for (let point of stroke.points) {
                        point.originalX = point.x;
                        point.originalY = point.y;
                    }
                }
            }
        }
        
        const center = this.getControlBoxScreenCenter();
        if (!center) return;
        
        const pos = this.getClientPos(e);
        this.rotateStartAngle = Math.atan2(pos.y - center.y, pos.x - center.x) * 180 / Math.PI;
    }
    
    rotate(e) {
        if (!this.isRotating) return;
        if (this.selectionType !== 'multi' && this.selectedIndex === null) return;
        
        const center = this.getControlBoxScreenCenter();
        if (!center) return;
        
        const pos = this.getClientPos(e);
        const currentAngle = Math.atan2(pos.y - center.y, pos.x - center.x) * 180 / Math.PI;
        const angleDelta = currentAngle - this.rotateStartAngle;
        
        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            stroke.rotation = this.normalizeAngle(this.rotateStartRotation + angleDelta);
            
            const bounds = stroke.originalBounds || this.drawingEngine.getStrokeBounds(stroke);
            const strokeCenterX = bounds.x + bounds.width / 2;
            const strokeCenterY = bounds.y + bounds.height / 2;
            
            const angleRad = (stroke.rotation - this.rotateStartRotation) * Math.PI / 180;
            for (let point of stroke.points) {
                if (point.originalX !== undefined && point.originalY !== undefined) {
                    const relX = point.originalX - strokeCenterX;
                    const relY = point.originalY - strokeCenterY;
                    const rotatedX = relX * Math.cos(angleRad) - relY * Math.sin(angleRad);
                    const rotatedY = relX * Math.sin(angleRad) + relY * Math.cos(angleRad);
                    point.x = strokeCenterX + rotatedX;
                    point.y = strokeCenterY + rotatedY;
                }
            }
        } else if (this.selectionType === 'text' && this.textManager) {
            const textObj = this.textManager.textObjects[this.selectedIndex];
            textObj.rotation = this.normalizeAngle(this.rotateStartRotation + angleDelta);
        } else if (this.selectionType === 'image') {
            const img = this.drawingEngine.stampedImages[this.selectedIndex];
            img.rotation = this.normalizeAngle(this.rotateStartRotation + angleDelta);
        } else if (this.selectionType === 'multi') {
            const bounds = this.multiBounds;
            if (!bounds) return;
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;
            const angleRad = angleDelta * Math.PI / 180;
            for (const idx of this.selectedStrokes) {
                const stroke = this.drawingEngine.strokes[idx];
                if (stroke) {
                    for (let point of stroke.points) {
                        if (point.originalX !== undefined && point.originalY !== undefined) {
                            const relX = point.originalX - centerX;
                            const relY = point.originalY - centerY;
                            point.x = centerX + relX * Math.cos(angleRad) - relY * Math.sin(angleRad);
                            point.y = centerY + relX * Math.sin(angleRad) + relY * Math.cos(angleRad);
                        }
                    }
                }
            }
        }
        
        this.updateControlBox();
        this.redrawCanvas();
    }
    
    stopRotate() {
        if (this.isRotating) {
            this.isRotating = false;
            this.hasUnsavedChanges = true;
            
            if (this.selectionType === 'stroke' && this.selectedIndex !== null) {
                const stroke = this.drawingEngine.strokes[this.selectedIndex];
                if (stroke) {
                    for (let point of stroke.points) {
                        delete point.originalX;
                        delete point.originalY;
                    }
                    delete stroke.originalBounds;
                }
            } else if (this.selectionType === 'multi') {
                for (const idx of this.selectedStrokes) {
                    const stroke = this.drawingEngine.strokes[idx];
                    if (stroke) {
                        for (let point of stroke.points) {
                            delete point.originalX;
                            delete point.originalY;
                        }
                    }
                }
                this.multiBounds = null;
            }
        }
    }
    
    // Action methods
    copySelection() {
        if (this.selectionType === 'multi') {
            if (this.selectedStrokes.length === 0) return false;
            const newIndices = [];
            for (const idx of this.selectedStrokes) {
                const stroke = this.drawingEngine.strokes[idx];
                if (stroke) {
                    const copiedStroke = {
                        points: stroke.points.map(p => ({ x: p.x + this.COPY_OFFSET, y: p.y + this.COPY_OFFSET })),
                        color: stroke.color,
                        size: stroke.size,
                        penType: stroke.penType,
                        tool: stroke.tool,
                        rotation: stroke.rotation || 0
                    };
                    this.drawingEngine.strokes.push(copiedStroke);
                    newIndices.push(this.drawingEngine.strokes.length - 1);
                }
            }
            this.selectedStrokes = newIndices;
            this.updateControlBox();
            this.redrawWithSelection();
            this.saveHistory();
            return true;
        }
        
        if (this.selectedIndex === null) return false;
        
        if (this.selectionType === 'stroke') {
            const result = this.drawingEngine.copySelectedStroke();
            if (result) {
                this.selectedIndex = this.drawingEngine.strokes.length - 1;
                this.updateControlBox();
                this.redrawWithSelection();
                this.saveHistory();
            }
            return result;
        } else if (this.selectionType === 'text' && this.textManager) {
            const result = this.textManager.copySelectedText();
            if (result) {
                this.selectedIndex = this.textManager.textObjects.length - 1;
                this.updateControlBox();
                this.redrawWithSelection();
                this.saveHistory();
            }
            return result;
        } else if (this.selectionType === 'image') {
            const result = this.drawingEngine.copySelectedImage();
            if (result) {
                this.selectedIndex = this.drawingEngine.stampedImages.length - 1;
                this.updateControlBox();
                this.redrawWithSelection();
                this.saveHistory();
            }
            return result;
        }
        
        return false;
    }
    
    deleteSelection() {
        if (this.selectionType === 'multi') {
            if (this.selectedStrokes.length === 0) return false;
            // Sort indices in descending order to remove from end first
            const sorted = [...this.selectedStrokes].sort((a, b) => b - a);
            for (const idx of sorted) {
                this.drawingEngine.strokes.splice(idx, 1);
            }
            this.clearSelection();
            this.redrawCanvas();
            this.saveHistory();
            return true;
        }
        
        if (this.selectedIndex === null) return false;
        
        if (this.selectionType === 'stroke') {
            const result = this.drawingEngine.deleteSelectedStroke();
            if (result) {
                this.clearSelection();
                this.redrawCanvas();
                this.saveHistory();
            }
            return result;
        } else if (this.selectionType === 'text' && this.textManager) {
            const result = this.textManager.deleteSelectedText();
            if (result) {
                this.clearSelection();
                this.redrawCanvas();
                this.saveHistory();
            }
            return result;
        } else if (this.selectionType === 'image') {
            const result = this.drawingEngine.deleteSelectedImage();
            if (result) {
                this.clearSelection();
                this.redrawCanvas();
                this.saveHistory();
            }
            return result;
        }
        
        return false;
    }
    
    finishSelection() {
        // Only save history if something was actually changed (moved, resized, rotated)
        // Copy and delete operations already save history themselves
        if (this.hasUnsavedChanges) {
            this.saveHistory();
        }
        this.clearSelection();
    }
    
    saveHistory() {
        if (this.historyManager) {
            this.historyManager.saveState();
        }
    }
    
    continueSelection(e) {
        if (!this.isSelecting) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.selectionEnd = { x, y };
        
        // Draw selection rectangle
        this.drawSelectionRect();
    }
    
    endSelection() {
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
    }
    
    drawSelectionRect() {
        if (!this.selectionStart || !this.selectionEnd) return;
        
        this.ctx.save();
        this.ctx.strokeStyle = '#0066FF';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        const width = this.selectionEnd.x - this.selectionStart.x;
        const height = this.selectionEnd.y - this.selectionStart.y;
        
        this.ctx.strokeRect(this.selectionStart.x, this.selectionStart.y, width, height);
        
        this.ctx.restore();
    }
    
    hasSelection() {
        return this.selectedIndex !== null || (this.selectionType === 'multi' && this.selectedStrokes.length > 0);
    }
    
    clearSelection() {
        this.selectionType = null;
        this.selectedIndex = null;
        this.hasUnsavedChanges = false;
        this.drawingEngine.deselectStroke();
        this.drawingEngine.deselectImage();
        this.drawingEngine.selectedImageIndex = null;
        if (this.textManager) {
            this.textManager.selectedTextIndex = null;
        }
        this.hideControls();
        this.selectedStrokes = [];
        this.multiBounds = null;
        this.isBoxSelecting = false;
        this.boxSelectStart = null;
        this.boxSelectEnd = null;
        if (this.boxSelectDiv) {
            this.boxSelectDiv.style.display = 'none';
        }
        this.isLassoSelecting = false;
        this.lassoPoints = [];
        if (this.lassoSvg) {
            this.lassoSvg.style.display = 'none';
        }
        this.redrawCanvas();
    }
    
    redrawWithSelection() {
        // Redraw the canvas to show the selection border
        this.redrawCanvas();
    }
    
    redrawCanvas() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Redraw stamped images (preserves inserted images during selection operations)
        this.drawingEngine.redrawStampedImages();
        
        // Redraw all strokes
        for (const stroke of this.drawingEngine.strokes) {
            this.drawingEngine.redrawStroke(stroke);
        }
        
        // Redraw all text objects
        if (this.textManager) {
            this.textManager.drawAllTextObjects();
        }
        
        // Draw selection border if something is selected
        if (this.selectionType === 'stroke') {
            this.drawingEngine.drawSelectionBorder();
        } else if (this.selectionType === 'text' && this.textManager) {
            this.textManager.drawTextSelection();
        }
    }
    
    // Box selection methods
    startBoxSelection(e) {
        this.clearSelection();
        this.isBoxSelecting = true;
        const pos = this.getClientPos(e);
        this.boxSelectStart = { x: pos.x, y: pos.y };
        this.boxSelectEnd = { x: pos.x, y: pos.y };
        this.boxSelectDiv.style.display = 'block';
        this.updateBoxSelectDiv();
    }
    
    continueBoxSelection(e) {
        if (!this.isBoxSelecting) return;
        const pos = this.getClientPos(e);
        this.boxSelectEnd = { x: pos.x, y: pos.y };
        this.updateBoxSelectDiv();
    }
    
    updateBoxSelectDiv() {
        if (!this.boxSelectStart || !this.boxSelectEnd) return;
        const left = Math.min(this.boxSelectStart.x, this.boxSelectEnd.x);
        const top = Math.min(this.boxSelectStart.y, this.boxSelectEnd.y);
        const width = Math.abs(this.boxSelectEnd.x - this.boxSelectStart.x);
        const height = Math.abs(this.boxSelectEnd.y - this.boxSelectStart.y);
        this.boxSelectDiv.style.left = left + 'px';
        this.boxSelectDiv.style.top = top + 'px';
        this.boxSelectDiv.style.width = width + 'px';
        this.boxSelectDiv.style.height = height + 'px';
    }
    
    endBoxSelection(e) {
        if (!this.isBoxSelecting) return;
        this.isBoxSelecting = false;
        this.boxSelectDiv.style.display = 'none';
        
        if (!this.boxSelectStart || !this.boxSelectEnd) return;
        
        // Convert screen coordinates to canvas coordinates
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.offsetWidth / rect.width;
        const scaleY = this.canvas.offsetHeight / rect.height;
        
        const selLeft = Math.min(this.boxSelectStart.x, this.boxSelectEnd.x);
        const selTop = Math.min(this.boxSelectStart.y, this.boxSelectEnd.y);
        const selRight = Math.max(this.boxSelectStart.x, this.boxSelectEnd.x);
        const selBottom = Math.max(this.boxSelectStart.y, this.boxSelectEnd.y);
        
        const canvasSelRect = {
            x: (selLeft - rect.left) * scaleX,
            y: (selTop - rect.top) * scaleY,
            width: (selRight - selLeft) * scaleX,
            height: (selBottom - selTop) * scaleY
        };
        
        // Find strokes whose bounding boxes intersect the selection rectangle
        const foundStrokes = [];
        for (let i = 0; i < this.drawingEngine.strokes.length; i++) {
            const stroke = this.drawingEngine.strokes[i];
            const bounds = this.drawingEngine.getStrokeBounds(stroke);
            if (bounds && this.rectsIntersect(canvasSelRect, bounds)) {
                foundStrokes.push(i);
            }
        }
        
        // Find stamped images whose bounding boxes intersect the selection rectangle
        const foundImages = [];
        for (let i = 0; i < this.drawingEngine.stampedImages.length; i++) {
            const img = this.drawingEngine.stampedImages[i];
            const bounds = this.drawingEngine.getImageBounds(img);
            if (bounds && this.rectsIntersect(canvasSelRect, bounds)) {
                foundImages.push(i);
            }
        }
        
        this.boxSelectStart = null;
        this.boxSelectEnd = null;
        
        this.applyFoundSelection(foundStrokes, foundImages);
    }
    
    // Apply selection from found strokes and images (shared by box and lasso selection)
    applyFoundSelection(foundStrokes, foundImages) {
        const totalFound = foundStrokes.length + foundImages.length;
        
        if (totalFound === 0) {
            return;
        } else if (totalFound === 1 && foundStrokes.length === 1) {
            this.selectStroke(foundStrokes[0]);
        } else if (totalFound === 1 && foundImages.length === 1) {
            this.selectImage(foundImages[0]);
        } else if (foundStrokes.length > 0 && foundImages.length === 0) {
            this.selectedStrokes = foundStrokes;
            this.selectionType = 'multi';
            this.selectedIndex = null;
            this.showControls();
            this.redrawWithSelection();
        } else {
            if (foundStrokes.length > 0) {
                this.selectedStrokes = foundStrokes;
                this.selectionType = 'multi';
                this.selectedIndex = null;
                this.showControls();
                this.redrawWithSelection();
            } else {
                this.selectImage(foundImages[0]);
            }
        }
    }
    
    rectsIntersect(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }
    
    getMultiBounds() {
        if (this.selectedStrokes.length === 0) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const idx of this.selectedStrokes) {
            const stroke = this.drawingEngine.strokes[idx];
            if (!stroke) continue;
            const bounds = this.drawingEngine.getStrokeBounds(stroke);
            if (!bounds) continue;
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
        }
        if (minX === Infinity) return null;
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    
    // Lasso selection methods
    startLassoSelection(e) {
        this.clearSelection();
        this.isLassoSelecting = true;
        const pos = this.getClientPos(e);
        this.lassoPoints = [{ x: pos.x, y: pos.y }];
        this.lassoSvg.style.display = 'block';
        this.updateLassoPath();
    }
    
    continueLassoSelection(e) {
        if (!this.isLassoSelecting) return;
        const pos = this.getClientPos(e);
        this.lassoPoints.push({ x: pos.x, y: pos.y });
        this.updateLassoPath();
    }
    
    updateLassoPath() {
        if (this.lassoPoints.length === 0) return;
        const pointsStr = this.lassoPoints.map(p => `${p.x},${p.y}`).join(' ');
        this.lassoPath.setAttribute('points', pointsStr);
    }
    
    endLassoSelection(e) {
        if (!this.isLassoSelecting) return;
        this.isLassoSelecting = false;
        this.lassoSvg.style.display = 'none';
        
        if (this.lassoPoints.length < 3) {
            this.lassoPoints = [];
            return;
        }
        
        // Convert lasso screen points to canvas coordinates
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            this.lassoPoints = [];
            return;
        }
        const scaleX = this.canvas.offsetWidth / rect.width;
        const scaleY = this.canvas.offsetHeight / rect.height;
        
        const canvasLassoPoints = this.lassoPoints.map(p => ({
            x: (p.x - rect.left) * scaleX,
            y: (p.y - rect.top) * scaleY
        }));
        
        this.lassoPoints = [];
        
        // Find strokes with any point inside the lasso polygon
        const foundStrokes = [];
        for (let i = 0; i < this.drawingEngine.strokes.length; i++) {
            const stroke = this.drawingEngine.strokes[i];
            const bounds = this.drawingEngine.getStrokeBounds(stroke);
            if (!bounds) continue;
            // Check if center of stroke bounds is inside lasso
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;
            if (this.pointInPolygon(cx, cy, canvasLassoPoints)) {
                foundStrokes.push(i);
                continue;
            }
            // Also check if any stroke point is inside lasso
            for (const pt of stroke.points) {
                if (this.pointInPolygon(pt.x, pt.y, canvasLassoPoints)) {
                    foundStrokes.push(i);
                    break;
                }
            }
        }
        
        // Find stamped images inside lasso
        const foundImages = [];
        for (let i = 0; i < this.drawingEngine.stampedImages.length; i++) {
            const img = this.drawingEngine.stampedImages[i];
            const bounds = this.drawingEngine.getImageBounds(img);
            if (!bounds) continue;
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;
            if (this.pointInPolygon(cx, cy, canvasLassoPoints)) {
                foundImages.push(i);
            }
        }
        
        this.applyFoundSelection(foundStrokes, foundImages);
    }
    
    // Ray-casting point-in-polygon algorithm
    pointInPolygon(x, y, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            
            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
}
