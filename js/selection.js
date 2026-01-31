// Selection Module
// Handles selection of drawn strokes, text objects, and inserted images

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
        this.selectionType = null; // 'stroke', 'text', or 'image'
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
        
        // Constants
        this.COPY_OFFSET = 20;
        this.HANDLE_SIZE = 8;
        this.ROTATION_HANDLE_DISTANCE = 30;
        this.HANDLE_THRESHOLD = 10;
        this.MIN_SIZE = 10;
        
        // For lasso/rectangle selection (future enhancement)
        this.selectionMode = 'click'; // 'click' or 'rectangle'
        
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
                        <button id="selection-copy-btn" class="image-control-btn" title="复制">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                            </svg>
                        </button>
                        <button id="selection-delete-btn" class="image-control-btn image-cancel-btn" title="删除">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                            </svg>
                        </button>
                        <button id="selection-done-btn" class="image-control-btn image-done-btn" title="完成">
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
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Drag selection box
        this.controlBox.addEventListener('mousedown', (e) => {
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
                this.startRotate(e);
            });
            rotateHandle.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.startRotate(e);
            }, { passive: false });
        }
        
        // Global mouse/touch events
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.drag(e);
            } else if (this.isResizing) {
                this.resize(e);
            } else if (this.isRotating) {
                this.rotate(e);
            }
        });
        
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
        
        document.addEventListener('touchend', () => {
            this.stopDrag();
            this.stopResize();
            this.stopRotate();
        });
        
        // Action buttons
        document.getElementById('selection-copy-btn').addEventListener('click', () => {
            this.copySelection();
        });
        
        document.getElementById('selection-delete-btn').addEventListener('click', () => {
            this.deleteSelection();
        });
        
        document.getElementById('selection-done-btn').addEventListener('click', () => {
            this.finishSelection();
        });
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
        
        this.isSelecting = true;
        const coords = this.getCanvasCoordinates(e);
        
        // Try to select something at this point
        // First, check for text objects
        if (this.textManager && this.textManager.textObjects.length > 0) {
            const textIndex = this.textManager.hitTestText(coords.x, coords.y);
            if (textIndex >= 0) {
                this.selectText(textIndex);
                return true;
            }
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
    
    showControls() {
        this.overlay.style.display = 'block';
        this.updateControlBox();
    }
    
    hideControls() {
        this.overlay.style.display = 'none';
    }
    
    updateControlBox() {
        if (this.selectionType === null || this.selectedIndex === null) return;
        
        let bounds = null;
        let rotation = 0;
        
        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            if (!stroke) return;
            bounds = this.drawingEngine.getStrokeBounds(stroke);
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
        }
        
        if (!bounds) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const canvasScale = this.getCanvasScale();
        
        // Calculate actual position and size accounting for canvas transform
        const actualX = rect.left + (bounds.x * canvasScale);
        const actualY = rect.top + (bounds.y * canvasScale);
        const actualWidth = bounds.width * canvasScale;
        const actualHeight = bounds.height * canvasScale;
        
        this.controlBox.style.left = `${actualX}px`;
        this.controlBox.style.top = `${actualY}px`;
        this.controlBox.style.width = `${actualWidth}px`;
        this.controlBox.style.height = `${actualHeight}px`;
        this.controlBox.style.transform = `rotate(${rotation}deg)`;
    }
    
    // Drag handling
    startDrag(e) {
        if (this.selectedIndex === null) return;
        
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
        }
        
        this.controlBox.style.cursor = 'grabbing';
    }
    
    drag(e) {
        if (!this.isDragging || this.selectedIndex === null) return;
        
        const pos = this.getClientPos(e);
        const canvasScale = this.getCanvasScale();
        const deltaX = (pos.x - this.dragStartPos.x) / canvasScale;
        const deltaY = (pos.y - this.dragStartPos.y) / canvasScale;
        
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
        }
        
        this.updateControlBox();
        this.redrawCanvas();
    }
    
    stopDrag() {
        if (this.isDragging) {
            this.isDragging = false;
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
            }
        }
    }
    
    // Resize handling
    startResize(e, handle) {
        if (this.selectedIndex === null) return;
        
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
        }
    }
    
    resize(e) {
        if (!this.isResizing || this.selectedIndex === null || !this.resizeStartBounds) return;
        
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
            const scaleX = newBounds.width / startBounds.width;
            const scaleY = newBounds.height / startBounds.height;
            
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
        }
        
        this.updateControlBox();
        this.redrawCanvas();
    }
    
    stopResize() {
        if (this.isResizing) {
            this.isResizing = false;
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
            }
        }
    }
    
    // Rotation handling
    startRotate(e) {
        if (this.selectedIndex === null) return;
        
        this.isRotating = true;
        const rect = this.controlBox.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const pos = this.getClientPos(e);
        this.rotateStartAngle = Math.atan2(pos.y - centerY, pos.x - centerX) * 180 / Math.PI;
        
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
        }
    }
    
    rotate(e) {
        if (!this.isRotating || this.selectedIndex === null) return;
        
        const rect = this.controlBox.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const pos = this.getClientPos(e);
        const currentAngle = Math.atan2(pos.y - centerY, pos.x - centerX) * 180 / Math.PI;
        const angleDelta = currentAngle - this.rotateStartAngle;
        
        if (this.selectionType === 'stroke') {
            const stroke = this.drawingEngine.strokes[this.selectedIndex];
            stroke.rotation = ((this.rotateStartRotation + angleDelta) % 360 + 360) % 360;
            
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
            textObj.rotation = ((this.rotateStartRotation + angleDelta) % 360 + 360) % 360;
        }
        
        this.updateControlBox();
        this.redrawCanvas();
    }
    
    stopRotate() {
        if (this.isRotating) {
            this.isRotating = false;
            
            if (this.selectionType === 'stroke' && this.selectedIndex !== null) {
                const stroke = this.drawingEngine.strokes[this.selectedIndex];
                if (stroke) {
                    for (let point of stroke.points) {
                        delete point.originalX;
                        delete point.originalY;
                    }
                    delete stroke.originalBounds;
                }
            }
        }
    }
    
    // Action methods
    copySelection() {
        if (this.selectedIndex === null) return false;
        
        if (this.selectionType === 'stroke') {
            const result = this.drawingEngine.copySelectedStroke();
            if (result) {
                // Select the newly copied stroke
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
        }
        
        return false;
    }
    
    deleteSelection() {
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
        }
        
        return false;
    }
    
    finishSelection() {
        this.saveHistory();
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
        return this.selectedIndex !== null;
    }
    
    clearSelection() {
        this.selectionType = null;
        this.selectedIndex = null;
        this.drawingEngine.deselectStroke();
        if (this.textManager) {
            this.textManager.selectedTextIndex = null;
        }
        this.hideControls();
        this.selectedStrokes = [];
        this.redrawCanvas();
    }
    
    redrawWithSelection() {
        // Redraw the canvas to show the selection border
        this.redrawCanvas();
    }
    
    redrawCanvas() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
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
}
