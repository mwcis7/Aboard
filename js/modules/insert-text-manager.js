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
            fontFamily: 'sans-serif',
            bold: false,
            italic: false
        };

        // Custom fonts storage
        this.customFonts = this.loadCustomFonts();

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

        // Text objects storage for selection support
        this.textObjects = [];
        this.selectedTextIndex = null;
        this.editingTextIndex = null; // Index of text being edited

        this.createControls();
        this.setupEventListeners();
        this.loadCustomFontsToDocument();
    }

    // Load custom fonts from localStorage
    loadCustomFonts() {
        const saved = localStorage.getItem('customFonts');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to load custom fonts:', e);
            }
        }
        return [];
    }

    // Save custom fonts to localStorage
    saveCustomFonts() {
        try {
            localStorage.setItem('customFonts', JSON.stringify(this.customFonts));
        } catch (e) {
            // Handle storage quota exceeded
            const msg = window.i18n ? window.i18n.t('tools.text.storageQuotaExceeded') : 'Storage quota exceeded. Please delete some custom fonts.';
            if (window.toastManager) {
                window.toastManager.show(msg, 'error');
            }
            console.warn('Failed to save custom fonts to localStorage:', e);
        }
    }

    // Load custom fonts into the document
    loadCustomFontsToDocument() {
        const loadPromises = this.customFonts.map(font => {
            return this.addFontToDocument(font.name, font.data);
        });
        return Promise.all(loadPromises);
    }

    // Add a font to the document
    addFontToDocument(name, data) {
        const fontFace = new FontFace(name, `url(${data})`);
        return fontFace.load().then(loadedFace => {
            document.fonts.add(loadedFace);
            return loadedFace;
        }).catch(err => {
            console.warn(`Failed to load custom font ${name}:`, err);
            return null;
        });
    }

    // Handle font file upload
    handleFontUpload(file) {
        if (!file) return;
        
        // Check file size (limit to 2MB to avoid localStorage issues)
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
            const msg = window.i18n ? window.i18n.t('tools.text.fontTooLarge') : 'Font file is too large. Maximum size is 2MB.';
            if (window.toastManager) {
                window.toastManager.show(msg, 'error');
            } else {
                alert(msg);
            }
            return;
        }
        
        const extension = file.name.split('.').pop().toLowerCase();
        const validExtensions = ['ttf', 'otf', 'woff', 'woff2'];
        
        if (!validExtensions.includes(extension)) {
            const msg = window.i18n ? window.i18n.t('tools.text.invalidFontFormat') : 'Invalid font format. Please use TTF, OTF, WOFF, or WOFF2 files.';
            if (window.toastManager) {
                window.toastManager.show(msg, 'error');
            } else {
                alert(msg);
            }
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const fontData = e.target.result;
            // Extract font name by removing the extension (handle multiple dots in filename)
            const lastDotIndex = file.name.lastIndexOf('.');
            const fontName = lastDotIndex > 0 ? file.name.substring(0, lastDotIndex) : file.name;
            
            // Check if font already exists
            const exists = this.customFonts.find(f => f.name === fontName);
            if (!exists) {
                this.customFonts.push({ name: fontName, data: fontData });
                this.saveCustomFonts();
                this.addFontToDocument(fontName, fontData);
                this.populateFonts();
                
                // Select the newly uploaded font
                const select = document.getElementById('insert-text-font-select');
                if (select) {
                    select.value = fontName;
                    this.textConfig.fontFamily = fontName;
                }
                
                const msg = window.i18n ? window.i18n.t('tools.text.fontUploadSuccess') : 'Font uploaded successfully!';
                if (window.toastManager) {
                    window.toastManager.show(msg, 'success');
                }
            } else {
                const msg = window.i18n ? window.i18n.t('tools.text.fontExists') : 'This font already exists.';
                if (window.toastManager) {
                    window.toastManager.show(msg, 'warning');
                }
            }
        };
        reader.readAsDataURL(file);
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
                                <div class="font-selection-row">
                                    <select id="insert-text-font-select" class="format-select" aria-label="Font selection">
                                        <option value="sans-serif">Sans Serif</option>
                                        <option value="serif">Serif</option>
                                        <option value="monospace">Monospace</option>
                                        <option value="cursive">Cursive</option>
                                    </select>
                                    <label class="font-upload-btn" for="insert-text-font-upload" data-i18n-title="tools.text.uploadFont" aria-label="Upload custom font">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                            <polyline points="17 8 12 3 7 8"></polyline>
                                            <line x1="12" y1="3" x2="12" y2="15"></line>
                                        </svg>
                                        <input type="file" id="insert-text-font-upload" accept=".ttf,.otf,.woff,.woff2" style="display: none;" aria-label="Upload font file">
                                    </label>
                                </div>
                            </div>

                            <div class="text-control-group">
                                <label data-i18n="tools.text.style">Style</label>
                                <div class="text-style-buttons">
                                    <button id="insert-text-bold-btn" class="text-style-btn" data-i18n-title="tools.text.bold" aria-label="Bold" aria-pressed="false">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                                            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                                        </svg>
                                    </button>
                                    <button id="insert-text-italic-btn" class="text-style-btn" data-i18n-title="tools.text.italic" aria-label="Italic" aria-pressed="false">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="19" y1="4" x2="10" y2="4"></line>
                                            <line x1="14" y1="20" x2="5" y2="20"></line>
                                            <line x1="15" y1="4" x2="9" y2="20"></line>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div class="text-control-group">
                                <label><span data-i18n="tools.text.size">Size</span>: <span id="insert-text-size-value">48</span>px</label>
                                <input type="range" id="insert-text-size-slider" min="12" max="200" value="48" class="slider touch-friendly-slider">
                            </div>

                            <div class="text-control-group">
                                <label data-i18n="tools.text.color">Color</label>
                                <div class="color-picker-row">
                                    <div class="color-picker-main">
                                        <button class="color-btn active touch-target" data-text-color="#000000" style="background-color: #000000;"></button>
                                        <button class="color-btn touch-target" data-text-color="#FF0000" style="background-color: #FF0000;"></button>
                                        <button class="color-btn touch-target" data-text-color="#0000FF" style="background-color: #0000FF;"></button>
                                        <button class="color-btn touch-target" data-text-color="#008000" style="background-color: #008000;"></button>
                                    </div>
                                    <div class="color-picker-main">
                                        <button class="color-btn touch-target" data-text-color="#FFA500" style="background-color: #FFA500;"></button>
                                        <button class="color-btn touch-target" data-text-color="#800080" style="background-color: #800080;"></button>
                                        <button class="color-btn touch-target" data-text-color="#FFC0CB" style="background-color: #FFC0CB;"></button>
                                        <label class="color-picker-icon-btn touch-target" for="insert-text-custom-color">
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
                            <button id="insert-text-modal-cancel-btn" class="confirm-btn cancel-btn touch-target" data-i18n="common.cancel"></button>
                            <button id="insert-text-modal-ok-btn" class="confirm-btn ok-btn touch-target" data-i18n="common.confirm"></button>
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
        
        // Add system fonts
        fonts.forEach(font => {
            const option = document.createElement('option');
            option.value = font.value;
            // Use translation if available
            option.textContent = window.i18n ? window.i18n.t(font.label) : font.value;
            select.appendChild(option);
        });

        // Add custom fonts if any
        if (this.customFonts.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = window.i18n ? window.i18n.t('tools.text.customFonts') : 'Custom Fonts';
            
            this.customFonts.forEach(font => {
                const option = document.createElement('option');
                option.value = font.name;
                option.textContent = font.name;
                optgroup.appendChild(option);
            });
            
            select.appendChild(optgroup);
        }
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

        // Font Upload
        const fontUpload = document.getElementById('insert-text-font-upload');
        if (fontUpload) {
            fontUpload.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.handleFontUpload(e.target.files[0]);
                }
            });
        }

        // Bold Button
        const boldBtn = document.getElementById('insert-text-bold-btn');
        if (boldBtn) {
            boldBtn.addEventListener('click', () => {
                this.textConfig.bold = !this.textConfig.bold;
                boldBtn.classList.toggle('active', this.textConfig.bold);
                boldBtn.setAttribute('aria-pressed', this.textConfig.bold.toString());
            });
        }

        // Italic Button
        const italicBtn = document.getElementById('insert-text-italic-btn');
        if (italicBtn) {
            italicBtn.addEventListener('click', () => {
                this.textConfig.italic = !this.textConfig.italic;
                italicBtn.classList.toggle('active', this.textConfig.italic);
                italicBtn.setAttribute('aria-pressed', this.textConfig.italic.toString());
            });
        }

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
            fontFamily: 'sans-serif',
            bold: false,
            italic: false
        };
        // Reset slider
        document.getElementById('insert-text-size-slider').value = 48;
        document.getElementById('insert-text-size-value').textContent = '48';
        document.getElementById('insert-text-input').value = '';

        // Reset font
        const fontSelect = document.getElementById('insert-text-font-select');
        if (fontSelect) fontSelect.value = 'sans-serif';

        // Reset bold/italic buttons
        const boldBtn = document.getElementById('insert-text-bold-btn');
        const italicBtn = document.getElementById('insert-text-italic-btn');
        if (boldBtn) boldBtn.classList.remove('active');
        if (italicBtn) italicBtn.classList.remove('active');

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
            
            // Restore bold/italic states
            const boldBtn = document.getElementById('insert-text-bold-btn');
            const italicBtn = document.getElementById('insert-text-italic-btn');
            if (boldBtn) boldBtn.classList.toggle('active', this.textConfig.bold);
            if (italicBtn) italicBtn.classList.toggle('active', this.textConfig.italic);
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
        this.textContentDiv.style.fontWeight = this.textConfig.bold ? 'bold' : 'normal';
        this.textContentDiv.style.fontStyle = this.textConfig.italic ? 'italic' : 'normal';
        this.textContentDiv.textContent = this.textConfig.text;

        this.controlBox.style.transform = `rotate(${this.textRotation}deg)`;
    }

    cancelOverlay() {
        this.isActive = false;
        this.overlay.style.display = 'none';
    }

    stampText() {
        const fontSize = this.textConfig.fontSize * this.textScale;
        const fontStyle = this.textConfig.italic ? 'italic' : 'normal';
        const fontWeight = this.textConfig.bold ? 'bold' : 'normal';
        
        // Measure text dimensions
        this.ctx.save();
        this.ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${this.textConfig.fontFamily}`;
        this.ctx.textBaseline = 'top';
        
        const lines = this.textConfig.text.split('\n');
        const lineHeight = fontSize * 1.2;
        
        let maxWidth = 0;
        lines.forEach(line => {
            const m = this.ctx.measureText(line);
            if (m.width > maxWidth) maxWidth = m.width;
        });
        this.ctx.restore();

        // Create text object for selection support
        const textObj = {
            text: this.textConfig.text,
            x: this.textPosition.x,
            y: this.textPosition.y,
            fontSize: this.textConfig.fontSize,
            color: this.textConfig.color,
            fontFamily: this.textConfig.fontFamily,
            bold: this.textConfig.bold || false,
            italic: this.textConfig.italic || false,
            rotation: this.textRotation,
            scale: this.textScale,
            width: maxWidth + 8, // Include padding
            height: lines.length * lineHeight + 8
        };
        
        if (this.editingTextIndex !== null && this.editingTextIndex < this.textObjects.length) {
            // Update existing text object
            this.textObjects[this.editingTextIndex] = textObj;
            this.editingTextIndex = null;
        } else {
            // Add new text object
            this.textObjects.push(textObj);
        }

        // Draw all text objects
        this.redrawCanvas();
        
        this.historyManager.saveState();
        this.cancelOverlay();
    }
    
    // Draw all stored text objects on canvas
    drawAllTextObjects() {
        this.textObjects.forEach(textObj => {
            this.drawTextObject(textObj);
        });
    }
    
    // Draw a single text object
    drawTextObject(textObj) {
        this.ctx.save();
        
        const fontSize = textObj.fontSize * textObj.scale;
        const fontStyle = textObj.italic ? 'italic' : 'normal';
        const fontWeight = textObj.bold ? 'bold' : 'normal';
        this.ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${textObj.fontFamily}`;
        this.ctx.textBaseline = 'top';
        this.ctx.fillStyle = textObj.color;
        
        const lines = textObj.text.split('\n');
        const lineHeight = fontSize * 1.2;
        
        // Center of text box
        let maxWidth = 0;
        lines.forEach(line => {
            const m = this.ctx.measureText(line);
            if (m.width > maxWidth) maxWidth = m.width;
        });
        const totalHeight = lines.length * lineHeight;
        const centerX = textObj.x + maxWidth / 2;
        const centerY = textObj.y + totalHeight / 2;
        
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate((textObj.rotation || 0) * Math.PI / 180);
        this.ctx.translate(-centerX, -centerY);
        
        lines.forEach((line, i) => {
            const padding = 4;
            this.ctx.fillText(line, textObj.x + padding, textObj.y + padding + (i * lineHeight));
        });
        
        this.ctx.restore();
    }
    
    // Draw selection indicator for selected text
    drawTextSelection() {
        if (this.selectedTextIndex === null || this.selectedTextIndex < 0) return;
        const textObj = this.textObjects[this.selectedTextIndex];
        if (!textObj) return;
        
        const lineCount = textObj.text.split('\n').length;
        const w = textObj.width * textObj.scale;
        const h = textObj.height * textObj.scale;
        
        this.ctx.save();
        this.ctx.strokeStyle = '#0066FF';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(textObj.x, textObj.y, w, h);
        this.ctx.restore();
    }
    
    // Hit test for text objects at given canvas coordinates
    hitTestText(x, y) {
        for (let i = this.textObjects.length - 1; i >= 0; i--) {
            const textObj = this.textObjects[i];
            if (!textObj) continue;
            
            const lineCount = textObj.text.split('\n').length;
            const w = textObj.width * textObj.scale;
            const h = textObj.height * textObj.scale;
            
            // Simple AABB hit test (without rotation for now)
            if (x >= textObj.x - 5 && x <= textObj.x + w + 5 &&
                y >= textObj.y - 5 && y <= textObj.y + h + 5) {
                return i;
            }
        }
        return -1;
    }
    
    // Copy selected text object
    copySelectedText() {
        if (this.selectedTextIndex === null || this.selectedTextIndex < 0) return false;
        const textObj = this.textObjects[this.selectedTextIndex];
        if (!textObj) return false;
        
        const copy = {
            ...textObj,
            x: textObj.x + 20,
            y: textObj.y + 20
        };
        this.textObjects.push(copy);
        this.selectedTextIndex = this.textObjects.length - 1;
        this.redrawCanvas();
        return true;
    }
    
    // Delete selected text object
    deleteSelectedText() {
        if (this.selectedTextIndex === null || this.selectedTextIndex < 0) return false;
        this.textObjects.splice(this.selectedTextIndex, 1);
        this.selectedTextIndex = null;
        this.redrawCanvas();
        return true;
    }
    
    // Edit an existing text object by reopening the modal
    editExistingText(index) {
        if (index < 0 || index >= this.textObjects.length) return;
        const textObj = this.textObjects[index];
        if (!textObj) return;
        
        // Store which text object we're editing
        this.editingTextIndex = index;
        
        // Restore text config from the object
        this.textConfig.text = textObj.text;
        this.textConfig.fontSize = textObj.fontSize;
        this.textConfig.color = textObj.color;
        this.textConfig.fontFamily = textObj.fontFamily;
        this.textConfig.bold = textObj.bold || false;
        this.textConfig.italic = textObj.italic || false;
        
        // Restore position and transform
        this.textPosition = { x: textObj.x, y: textObj.y };
        this.textRotation = textObj.rotation || 0;
        this.textScale = textObj.scale || 1.0;
        
        // Show the modal in edit mode
        this.showModal(true);
    }
    
    // Get all text objects (for serialization)
    getTextObjects() {
        return this.textObjects;
    }
    
    // Set text objects (for deserialization)
    setTextObjects(objects) {
        this.textObjects = objects || [];
    }
    
    // Clear all text objects
    clearTextObjects() {
        this.textObjects = [];
        this.selectedTextIndex = null;
    }
    
    // Trigger a canvas redraw 
    redrawCanvas() {
        // Clear and redraw canvas contents
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Redraw stamped images
        if (this.drawingEngine) {
            this.drawingEngine.redrawStampedImages();
            // Redraw all strokes
            for (const stroke of this.drawingEngine.strokes) {
                this.drawingEngine.redrawStroke(stroke);
            }
        }
        
        // Redraw all text objects
        this.drawAllTextObjects();
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
