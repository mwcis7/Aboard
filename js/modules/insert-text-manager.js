// Insert Text Module
// Handles inserting text onto the canvas as stamped pixels

class InsertTextManager {
    constructor(canvas, ctx, historyManager, drawingEngine) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.historyManager = historyManager;
        this.drawingEngine = drawingEngine;

        // State
        this.isActive = false;
        this.textConfig = {
            text: '',
            fontSize: 48,
            color: '#000000',
            fontFamily: 'sans-serif'
        };

        this.textPosition = { x: 0, y: 0 };
        this.textRotation = 0;
        this.textScale = 1.0; // We use scale to adjust font size visually during manipulation

        // Interaction State
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;

        this.dragStartPos = { x: 0, y: 0 };
        this.dragStartTextPos = { x: 0, y: 0 };

        this.resizeHandle = null;
        this.resizeStartScale = 1.0;
        this.resizeStartPos = { x: 0, y: 0 };

        this.rotateStartAngle = 0;
        this.rotateStartRotation = 0;

        this.createControls();
        this.setupEventListeners();
    }

    createControls() {
        // Create Modal HTML if not exists
        if (!document.getElementById('insert-text-modal')) {
            const modalHTML = `
            <div id="insert-text-modal" class="modal">
                <div class="modal-content text-input-modal-content">
                    <div class="modal-header">
                        <h2 data-i18n="tools.text.insertTitle"></h2>
                        <button id="insert-text-modal-close-btn" class="modal-close-btn">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <textarea id="insert-text-input" class="text-input-area" placeholder="Enter text..." data-i18n-placeholder="tools.text.placeholder"></textarea>

                        <div class="text-input-controls">
                            <div class="text-control-group">
                                <label data-i18n="tools.text.font">Font</label>
                                <select id="insert-text-font-select" class="format-select">
                                    <option value="sans-serif">Sans Serif</option>
                                    <option value="serif">Serif</option>
                                    <option value="monospace">Monospace</option>
                                    <option value="cursive">Cursive</option>
                                </select>
                            </div>

                            <div class="text-control-group">
                                <label><span data-i18n="tools.text.size">Size</span>: <span id="insert-text-size-value">48</span>px</label>
                                <input type="range" id="insert-text-size-slider" min="12" max="200" value="48" class="slider">
                            </div>

                            <div class="text-control-group">
                                <label data-i18n="tools.text.color">Color</label>
                                <div class="color-picker-row">
                                    <div class="color-picker-main">
                                        <button class="color-btn active" data-text-color="#000000" style="background-color: #000000;"></button>
                                        <button class="color-btn" data-text-color="#FF0000" style="background-color: #FF0000;"></button>
                                        <button class="color-btn" data-text-color="#0000FF" style="background-color: #0000FF;"></button>
                                        <button class="color-btn" data-text-color="#008000" style="background-color: #008000;"></button>
                                    </div>
                                    <div class="color-picker-main">
                                        <button class="color-btn" data-text-color="#FFA500" style="background-color: #FFA500;"></button>
                                        <button class="color-btn" data-text-color="#800080" style="background-color: #800080;"></button>
                                        <button class="color-btn" data-text-color="#FFC0CB" style="background-color: #FFC0CB;"></button>
                                        <label class="color-picker-icon-btn" for="insert-text-custom-color">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
                                                <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
                                            </svg>
                                            <input type="color" id="insert-text-custom-color" class="custom-color-picker-input" value="#000000">
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="text-input-buttons">
                            <button id="insert-text-modal-cancel-btn" class="confirm-btn cancel-btn" data-i18n="common.cancel"></button>
                            <button id="insert-text-modal-ok-btn" class="confirm-btn ok-btn" data-i18n="common.confirm"></button>
                        </div>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        // Create Overlay HTML
        if (!document.getElementById('insert-text-overlay')) {
            const overlayHTML = `
            <div id="insert-text-overlay" style="display: none;">
                <div id="insert-text-box">
                    <div id="insert-text-content"></div>

                    <!-- Resize Handles -->
                    <div class="resize-handle top-left" data-handle="top-left"></div>
                    <div class="resize-handle top-right" data-handle="top-right"></div>
                    <div class="resize-handle bottom-left" data-handle="bottom-left"></div>
                    <div class="resize-handle bottom-right" data-handle="bottom-right"></div>

                    <!-- Rotation Handle -->
                    <div class="rotate-handle" id="insert-text-rotate-handle">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                        </svg>
                    </div>

                    <!-- Toolbar -->
                    <div class="text-controls-toolbar">
                        <button id="insert-text-edit-btn" class="text-control-btn text-edit-btn" title="Edit Text">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button id="insert-text-cancel-btn" class="text-control-btn text-cancel-btn" title="Cancel">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                        <button id="insert-text-confirm-btn" class="text-control-btn text-done-btn" title="Confirm">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', overlayHTML);
        }

        this.modal = document.getElementById('insert-text-modal');
        this.overlay = document.getElementById('insert-text-overlay');
        this.controlBox = document.getElementById('insert-text-box');
        this.textContentDiv = document.getElementById('insert-text-content');

        if (window.i18n) {
            window.i18n.applyTranslations();
        }

        // Populate fonts
        this.populateFonts();
    }

    populateFonts() {
        const select = document.getElementById('insert-text-font-select');
        if (!select) return;

        const fonts = [
            { value: 'sans-serif', label: 'settings.general.fonts.sansSerif' },
            { value: 'serif', label: 'settings.general.fonts.serif' },
            { value: 'monospace', label: 'settings.general.fonts.monospace' },
            { value: 'cursive', label: 'settings.general.fonts.cursive' },
            { value: 'Microsoft YaHei', label: 'settings.general.fonts.yahei' },
            { value: 'SimSun', label: 'settings.general.fonts.simsun' },
            { value: 'SimHei', label: 'settings.general.fonts.simhei' },
            { value: 'KaiTi', label: 'settings.general.fonts.kaiti' },
            { value: 'FangSong', label: 'settings.general.fonts.fangsong' },
            { value: 'Arial', label: 'settings.general.fonts.arial' },
            { value: 'Times New Roman', label: 'settings.general.fonts.timesNewRoman' },
            { value: 'Courier New', label: 'settings.general.fonts.courier' },
            { value: 'Verdana', label: 'settings.general.fonts.verdana' },
            { value: 'Georgia', label: 'settings.general.fonts.georgia' },
            { value: 'Impact', label: 'settings.general.fonts.impact' }
        ];

        select.innerHTML = '';
        fonts.forEach(font => {
            const option = document.createElement('option');
            option.value = font.value;
            // Use translation if available
            option.textContent = window.i18n ? window.i18n.t(font.label) : font.value;
            select.appendChild(option);
        });
    }

    setupEventListeners() {
        // Modal Events
        document.getElementById('insert-text-modal-close-btn').addEventListener('click', () => this.closeModal());
        document.getElementById('insert-text-modal-cancel-btn').addEventListener('click', () => this.closeModal());
        document.getElementById('insert-text-modal-ok-btn').addEventListener('click', () => this.confirmModal());

        const sizeSlider = document.getElementById('insert-text-size-slider');
        const sizeValue = document.getElementById('insert-text-size-value');
        sizeSlider.addEventListener('input', (e) => {
            sizeValue.textContent = e.target.value;
            this.textConfig.fontSize = parseInt(e.target.value);
        });

        // Font Selection
        const fontSelect = document.getElementById('insert-text-font-select');
        fontSelect.addEventListener('change', (e) => {
            this.textConfig.fontFamily = e.target.value;
        });

        // Color Picking
        document.querySelectorAll('#insert-text-modal .color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const color = e.target.dataset.textColor;
                this.updateColor(color);

                // Update active state
                document.querySelectorAll('#insert-text-modal .color-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                // Deactivate custom picker visual
                const customLabel = document.querySelector('label[for="insert-text-custom-color"]');
                if (customLabel) customLabel.classList.remove('active');
            });
        });

        const customColorPicker = document.getElementById('insert-text-custom-color');
        customColorPicker.addEventListener('input', (e) => {
            this.updateColor(e.target.value);

            document.querySelectorAll('#insert-text-modal .color-btn').forEach(b => b.classList.remove('active'));
            const customLabel = document.querySelector('label[for="insert-text-custom-color"]');
            if (customLabel) customLabel.classList.add('active');
        });

        // Overlay Events
        const handleDragStart = (e) => {
            e.stopPropagation();
            if (e.target === this.controlBox || e.target.closest('#insert-text-box') === this.controlBox) {
                // Ignore touches on handles or toolbar buttons
                if (!e.target.classList.contains('resize-handle') &&
                    !e.target.classList.contains('rotate-handle') &&
                    !e.target.closest('.text-controls-toolbar')) {
                    this.startDrag(e);
                }
            }
        };

        this.controlBox.addEventListener('mousedown', handleDragStart);
        this.controlBox.addEventListener('touchstart', handleDragStart, { passive: false });

        // Resize Handles
        this.controlBox.querySelectorAll('.resize-handle').forEach(handle => {
            const startResize = (e) => {
                e.stopPropagation();
                if (e.type === 'touchstart') e.preventDefault();
                this.startResize(e, handle.dataset.handle);
            };
            handle.addEventListener('mousedown', startResize);
            handle.addEventListener('touchstart', startResize, { passive: false });
        });

        // Rotate Handle
        const rotateHandle = document.getElementById('insert-text-rotate-handle');
        const startRotate = (e) => {
            e.stopPropagation();
            if (e.type === 'touchstart') e.preventDefault();
            this.startRotate(e);
        };
        rotateHandle.addEventListener('mousedown', startRotate);
        rotateHandle.addEventListener('touchstart', startRotate, { passive: false });

        // Overlay Toolbar
        document.getElementById('insert-text-cancel-btn').addEventListener('click', () => this.cancelOverlay());
        document.getElementById('insert-text-confirm-btn').addEventListener('click', () => this.stampText());
        document.getElementById('insert-text-edit-btn').addEventListener('click', () => this.showModal(true)); // Re-open modal for editing

        // Double click to edit
        this.controlBox.addEventListener('dblclick', () => this.showModal(true));

        // Global Move/Up
        const handleMove = (e) => {
            if (this.isDragging) this.drag(e);
            else if (this.isResizing) this.resize(e);
            else if (this.isRotating) this.rotate(e);
        };

        const handleEnd = () => {
            this.stopDrag();
            this.stopResize();
            this.stopRotate();
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchend', handleEnd);
    }

    trigger() {
        // Reset state for new text
        this.textConfig = {
            text: '',
            fontSize: 48,
            color: '#000000',
            fontFamily: 'sans-serif'
        };
        // Reset slider
        document.getElementById('insert-text-size-slider').value = 48;
        document.getElementById('insert-text-size-value').textContent = '48';
        document.getElementById('insert-text-input').value = '';

        // Reset font
        const fontSelect = document.getElementById('insert-text-font-select');
        if (fontSelect) fontSelect.value = 'sans-serif';

        // Reset active color to black
        document.querySelectorAll('#insert-text-modal .color-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.color-btn[data-text-color="#000000"]').classList.add('active');
        const customLabel = document.querySelector('label[for="insert-text-custom-color"]');
        if (customLabel) customLabel.classList.remove('active');

        this.showModal();
    }

    showModal(isEditing = false) {
        this.modal.classList.add('show');
        // Re-populate fonts to ensure translations are up to date
        this.populateFonts();

        const input = document.getElementById('insert-text-input');

        if (isEditing) {
            input.value = this.textConfig.text;
            document.getElementById('insert-text-size-slider').value = this.textConfig.fontSize;
            document.getElementById('insert-text-size-value').textContent = this.textConfig.fontSize;
            document.getElementById('insert-text-font-select').value = this.textConfig.fontFamily;
        }

        input.focus();
    }

    closeModal() {
        this.modal.classList.remove('show');
    }

    confirmModal() {
        const text = document.getElementById('insert-text-input').value;
        if (!text.trim()) {
            this.closeModal();
            return;
        }

        this.textConfig.text = text;
        this.closeModal();

        // Show Overlay
        this.showOverlay();
    }

    updateColor(color) {
        this.textConfig.color = color;
    }

    showOverlay() {
        this.isActive = true;
        this.overlay.style.display = 'block';
        this.textScale = 1.0;
        this.textRotation = 0;

        // Calculate initial position (center of screen)
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;

        const canvasRect = this.canvas.getBoundingClientRect();
        const scaleX = canvasRect.width / (this.canvas.width / window.devicePixelRatio);
        const scaleY = canvasRect.height / (this.canvas.height / window.devicePixelRatio);

        this.textPosition.x = (cx - canvasRect.left) / scaleX;
        this.textPosition.y = (cy - canvasRect.top) / scaleY;

        this.updateOverlay();

        // Adjust to center the box
        const boxRect = this.controlBox.getBoundingClientRect();
        const logicalW = boxRect.width / scaleX;
        const logicalH = boxRect.height / scaleY;

        this.textPosition.x -= logicalW / 2;
        this.textPosition.y -= logicalH / 2;

        this.updateOverlay();
    }

    updateOverlay() {
        const canvasRect = this.canvas.getBoundingClientRect();
        const logicalWidth = this.canvas.width / window.devicePixelRatio;
        const logicalHeight = this.canvas.height / window.devicePixelRatio;
        const scaleX = canvasRect.width / logicalWidth;
        const scaleY = canvasRect.height / logicalHeight;

        const screenX = canvasRect.left + this.textPosition.x * scaleX;
        const screenY = canvasRect.top + this.textPosition.y * scaleY;

        this.controlBox.style.left = `${screenX}px`;
        this.controlBox.style.top = `${screenY}px`;

        this.textContentDiv.style.fontSize = `${this.textConfig.fontSize * this.textScale * scaleX}px`; // Apply zoom scale to font
        this.textContentDiv.style.color = this.textConfig.color;
        this.textContentDiv.style.fontFamily = this.textConfig.fontFamily;
        this.textContentDiv.textContent = this.textConfig.text;

        this.controlBox.style.transform = `rotate(${this.textRotation}deg)`;
    }

    cancelOverlay() {
        this.isActive = false;
        this.overlay.style.display = 'none';
    }

    stampText() {
        this.ctx.save();

        const fontSize = this.textConfig.fontSize * this.textScale;
        this.ctx.font = `${fontSize}px ${this.textConfig.fontFamily}`;
        this.ctx.textBaseline = 'top';
        this.ctx.fillStyle = this.textConfig.color;

        const lines = this.textConfig.text.split('\n');
        const lineHeight = fontSize * 1.2; // Standard CSS line height approximation

        // Measure width
        let maxWidth = 0;
        lines.forEach(line => {
            const m = this.ctx.measureText(line);
            if (m.width > maxWidth) maxWidth = m.width;
        });

        const totalHeight = lines.length * lineHeight;

        // Center of text box
        const centerX = this.textPosition.x + maxWidth / 2;
        const centerY = this.textPosition.y + totalHeight / 2;

        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(this.textRotation * Math.PI / 180);
        this.ctx.translate(-centerX, -centerY);

        // Draw text
        lines.forEach((line, i) => {
            const padding = 4;
            this.ctx.fillText(line, this.textPosition.x + padding, this.textPosition.y + padding + (i * lineHeight));
        });

        this.ctx.restore();

        this.historyManager.saveState();
        this.cancelOverlay();
    }

    // Interactions
    getClientPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    getCanvasScale() {
        const rect = this.canvas.getBoundingClientRect();
        const logicalWidth = this.canvas.width / window.devicePixelRatio;
        return rect.width / logicalWidth;
    }

    startDrag(e) {
        this.isDragging = true;
        this.dragStartPos = this.getClientPos(e);
        this.dragStartTextPos = { ...this.textPosition };
    }

    drag(e) {
        const pos = this.getClientPos(e);
        const scale = this.getCanvasScale();

        const dx = (pos.x - this.dragStartPos.x) / scale;
        const dy = (pos.y - this.dragStartPos.y) / scale;

        this.textPosition.x = this.dragStartTextPos.x + dx;
        this.textPosition.y = this.dragStartTextPos.y + dy;

        this.updateOverlay();
    }

    stopDrag() {
        this.isDragging = false;
    }

    startResize(e, handle) {
        this.isResizing = true;
        this.resizeHandle = handle;
        this.resizeStartPos = this.getClientPos(e);
        this.resizeStartScale = this.textScale;
    }

    resize(e) {
        const pos = this.getClientPos(e);
        const scale = this.getCanvasScale(); // Screen pixels per Logical unit

        const dy = (pos.y - this.resizeStartPos.y) / scale;
        const dx = (pos.x - this.resizeStartPos.x) / scale;

        let change = 0;
        if (this.resizeHandle.includes('right') || this.resizeHandle.includes('bottom')) {
            change = (dx + dy) / 2; // Rough approximation
        } else {
            change = -(dx + dy) / 2;
        }

        // Sensitivity
        const sensitivity = 0.01;
        this.textScale = Math.max(0.1, this.resizeStartScale + (change * sensitivity));

        this.updateOverlay();
    }

    stopResize() {
        this.isResizing = false;
    }

    startRotate(e) {
        this.isRotating = true;
        const rect = this.controlBox.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const pos = this.getClientPos(e);
        this.rotateStartAngle = Math.atan2(pos.y - centerY, pos.x - centerX) * 180 / Math.PI;
        this.rotateStartRotation = this.textRotation;
    }

    rotate(e) {
        const rect = this.controlBox.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const pos = this.getClientPos(e);
        const currentAngle = Math.atan2(pos.y - centerY, pos.x - centerX) * 180 / Math.PI;
        const angleDelta = currentAngle - this.rotateStartAngle;

        this.textRotation = this.rotateStartRotation + angleDelta;
        this.updateOverlay();
    }

    stopRotate() {
        this.isRotating = false;
    }
}
