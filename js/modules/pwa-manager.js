class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.statusIndicator = null;
        this.statusText = null;
        this.installBtn = null;

        // Announcement modal elements
        this.announcementStatusContainer = null;
        this.announcementStatusIndicator = null;
        this.announcementStatusText = null;
        this.announcementInstallBtn = null;

        // Update elements
        this.updateSnackbar = null;

        // Local Translations
        this.translations = {
            'zh-CN': {
                'statusTitle': '应用状态',
                'online': '在线',
                'offline': '离线',
                'install': '安装应用',
                'version': '版本',
                'offlineMessage': '当前处于离线模式，更改已保存到本地',
                'updateAvailable': '有新版本可用',
                'update': '立即更新',
                'checkUpdate': '检查更新',
                'checking': '正在检查更新...',
                'latest': '已是最新版本'
            },
            'zh-TW': {
                'statusTitle': '應用狀態',
                'online': '在線',
                'offline': '離線',
                'install': '安裝應用',
                'version': '版本',
                'offlineMessage': '當前處於離線模式，更改已保存到本地',
                'updateAvailable': '有新版本可用',
                'update': '立即更新',
                'checkUpdate': '檢查更新',
                'checking': '正在檢查更新...',
                'latest': '已是最新版本'
            },
            'en-US': {
                'statusTitle': 'App Status',
                'online': 'Online',
                'offline': 'Offline',
                'install': 'Install App',
                'version': 'Version',
                'offlineMessage': 'Offline mode. Changes are saved locally.',
                'updateAvailable': 'New version available',
                'update': 'Update Now',
                'checkUpdate': 'Check for Updates',
                'checking': 'Checking for updates...',
                'latest': 'You are on the latest version'
            }
        };
        // Fallback for other languages to English
        this.defaultLocale = 'en-US';

        this.init();
    }

    init() {
        this.registerServiceWorker();

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupUI();
                this.checkOfflineStatus();
            });
        } else {
            this.setupUI();
            this.checkOfflineStatus();
        }

        this.setupEventListeners();
    }

    getTranslation(key) {
        const locale = window.i18n ? window.i18n.getCurrentLocale() : navigator.language;
        // Try exact match, then language family (e.g. 'zh'), then default
        let dict = this.translations[locale] ||
                   this.translations[locale.split('-')[0]] ||
                   (locale.startsWith('zh') ? this.translations['zh-CN'] : this.translations[this.defaultLocale]);

        return dict[key] || key;
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(registration => {
                        console.log('ServiceWorker registration successful with scope: ', registration.scope);

                        // Check for updates on registration
                        // If there's a waiting worker, it means an update is ready
                        if (registration.waiting) {
                            this.showUpdateNotification(registration.waiting);
                        }

                        // Listen for new updates
                        registration.onupdatefound = () => {
                            const newWorker = registration.installing;
                            newWorker.onstatechange = () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // New version installed and ready to take over
                                    this.showUpdateNotification(newWorker);
                                }
                            };
                        };
                    })
                    .catch(err => {
                        console.log('ServiceWorker registration failed: ', err);
                    });

                // Handle controller change (reload page when new SW takes control)
                let refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (!refreshing) {
                        refreshing = true;
                        window.location.reload();
                    }
                });
            });
        }
    }

    checkOfflineStatus() {
        if (!navigator.onLine) {
            this.showOfflineNotification();
        }
    }

    showOfflineNotification() {
        const msg = this.getTranslation('offlineMessage');
        // Try to find the ToastManager instance
        if (window.drawingBoard && window.drawingBoard.settingsManager && window.drawingBoard.settingsManager.toastManager) {
            window.drawingBoard.settingsManager.toastManager.show(msg, 'warning');
        } else if (window.ToastManager) {
            // Fallback: create a temporary instance if main one isn't ready
            const toast = new window.ToastManager();
            toast.show(msg, 'warning');
        } else {
            console.warn('ToastManager not available for offline notification');
        }
    }

    showUpdateNotification(worker) {
        // Create persistent snackbar if not exists
        if (this.updateSnackbar) return;

        const snackbar = document.createElement('div');
        snackbar.className = 'update-snackbar';
        snackbar.style.position = 'fixed';
        snackbar.style.bottom = '20px';
        snackbar.style.left = '50%';
        snackbar.style.transform = 'translateX(-50%) translateY(100px)';
        snackbar.style.backgroundColor = '#333';
        snackbar.style.color = '#fff';
        snackbar.style.padding = '12px 24px';
        snackbar.style.borderRadius = '8px';
        snackbar.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        snackbar.style.display = 'flex';
        snackbar.style.alignItems = 'center';
        snackbar.style.gap = '16px';
        snackbar.style.zIndex = '3000'; // Above most things
        snackbar.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        snackbar.style.fontFamily = 'var(--font-family, system-ui, -apple-system, sans-serif)';
        snackbar.style.fontSize = '14px';

        const text = document.createElement('span');
        text.textContent = this.getTranslation('updateAvailable');

        const btn = document.createElement('button');
        btn.textContent = this.getTranslation('update');
        btn.style.backgroundColor = 'var(--theme-color, #007AFF)';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.padding = '6px 12px';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = '500';
        btn.style.fontSize = '13px';

        btn.onclick = () => {
            worker.postMessage({ type: 'SKIP_WAITING' });
            snackbar.style.transform = 'translateX(-50%) translateY(100px)'; // Slide down
        };

        snackbar.appendChild(text);
        snackbar.appendChild(btn);
        document.body.appendChild(snackbar);
        this.updateSnackbar = snackbar;

        // Animate in
        requestAnimationFrame(() => {
            snackbar.style.transform = 'translateX(-50%)';
        });
    }

    setupUI() {
        this.injectSettingsUI();
        this.injectAnnouncementUI();
    }

    injectSettingsUI() {
        const aboutInfo = document.querySelector('#about-settings .about-info');
        if (aboutInfo && !document.getElementById('pwa-status-indicator')) {
            const section = document.createElement('div');
            section.className = 'about-section';

            // App Status Title
            const statusTitle = document.createElement('h4');
            statusTitle.textContent = this.getTranslation('statusTitle');

            const statusContainer = document.createElement('div');
            statusContainer.style.display = 'flex';
            statusContainer.style.alignItems = 'center';
            statusContainer.style.gap = '8px';
            statusContainer.style.marginTop = '8px';

            const statusIndicator = document.createElement('span');
            statusIndicator.id = 'pwa-status-indicator';
            this.applyIndicatorStyle(statusIndicator);

            const statusText = document.createElement('span');
            statusText.id = 'pwa-status-text';

            statusContainer.appendChild(statusIndicator);
            statusContainer.appendChild(statusText);

            // Action Buttons Container
            const actionContainer = document.createElement('div');
            actionContainer.style.marginTop = '10px';
            actionContainer.style.display = 'flex';
            actionContainer.style.gap = '10px';
            actionContainer.style.flexWrap = 'wrap';

            // Install Button
            const installBtn = this.createButton('pwa-install-btn', this.getTranslation('install'), () => this.installApp());
            installBtn.style.display = 'none'; // Hidden by default

            // Check Update Button
            const checkUpdateBtn = this.createButton('pwa-check-update-btn', this.getTranslation('checkUpdate'), () => this.checkForUpdates());
            checkUpdateBtn.style.backgroundColor = 'transparent';
            checkUpdateBtn.style.color = 'var(--theme-color, #007AFF)';
            checkUpdateBtn.style.border = '1px solid var(--theme-color, #007AFF)';

            actionContainer.appendChild(installBtn);
            actionContainer.appendChild(checkUpdateBtn);

            section.appendChild(statusTitle);
            section.appendChild(statusContainer);
            section.appendChild(actionContainer);

            aboutInfo.appendChild(section);

            this.statusIndicator = statusIndicator;
            this.statusText = statusText;
            this.installBtn = installBtn;

            this.updateOnlineStatus();
        }
    }

    injectAnnouncementUI() {
        const modalBody = document.querySelector('#announcement-modal .modal-body');
        const contentDiv = document.getElementById('announcement-content');

        if (modalBody && contentDiv && !document.getElementById('pwa-announcement-status')) {
            const container = document.createElement('div');
            container.id = 'pwa-announcement-status';
            container.style.marginTop = '15px';
            container.style.paddingTop = '10px';
            container.style.borderTop = '1px solid #eee';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '8px';
            container.style.fontSize = '14px'; // Match UI font size
            container.style.color = '#333';

            // Status Row
            const statusRow = document.createElement('div');
            statusRow.style.display = 'flex';
            statusRow.style.alignItems = 'center';
            statusRow.style.gap = '8px';

            const indicator = document.createElement('span');
            this.applyIndicatorStyle(indicator);

            const text = document.createElement('span');

            statusRow.appendChild(indicator);
            statusRow.appendChild(text);

            // Version Row
            const versionRow = document.createElement('div');
            versionRow.textContent = `${this.getTranslation('version')}: v2.1.0`;
            versionRow.style.color = '#666';
            versionRow.style.fontSize = '12px';

            // Install Button
            const installBtn = this.createButton('pwa-announcement-install-btn', this.getTranslation('install'), () => this.installApp());
            installBtn.style.alignSelf = 'flex-start'; // Align left like text
            installBtn.style.display = 'none';

            container.appendChild(statusRow);
            container.appendChild(versionRow);
            container.appendChild(installBtn);

            // Insert after content
            if (contentDiv.nextSibling) {
                modalBody.insertBefore(container, contentDiv.nextSibling);
            } else {
                modalBody.appendChild(container);
            }

            this.announcementStatusIndicator = indicator;
            this.announcementStatusText = text;
            this.announcementInstallBtn = installBtn;

            this.updateOnlineStatus();
        }
    }

    applyIndicatorStyle(element) {
        element.style.width = '10px';
        element.style.height = '10px';
        element.style.borderRadius = '50%';
        element.style.display = 'inline-block';
        element.style.flexShrink = '0';
    }

    createButton(id, text, onClick) {
        const btn = document.createElement('button');
        btn.id = id;
        btn.textContent = text;
        btn.style.padding = '6px 12px';
        btn.style.backgroundColor = 'var(--theme-color, #007AFF)';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '13px';

        btn.addEventListener('click', onClick);
        return btn;
    }

    setupEventListeners() {
        window.addEventListener('online', () => {
            this.updateOnlineStatus();
            // Show toast when coming back online
            if (window.drawingBoard && window.drawingBoard.settingsManager && window.drawingBoard.settingsManager.toastManager) {
                window.drawingBoard.settingsManager.toastManager.show(this.getTranslation('online'), 'success');
            }
        });

        window.addEventListener('offline', () => {
            this.updateOnlineStatus();
            this.showOfflineNotification();
        });

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButtons();
        });

        // Listen for language changes if the app supports it via custom event
        window.addEventListener('localeChanged', () => {
            this.updateLabels();
        });
    }

    showInstallButtons() {
        if (this.installBtn) this.installBtn.style.display = 'block';
        if (this.announcementInstallBtn) this.announcementInstallBtn.style.display = 'block';
    }

    hideInstallButtons() {
        if (this.installBtn) this.installBtn.style.display = 'none';
        if (this.announcementInstallBtn) this.announcementInstallBtn.style.display = 'none';
    }

    updateLabels() {
        // Refresh text content based on new locale
        const statusText = navigator.onLine ? this.getTranslation('online') : this.getTranslation('offline');

        // Update Settings UI
        if (this.statusText) this.statusText.textContent = statusText;
        if (this.installBtn) this.installBtn.textContent = this.getTranslation('install');
        const checkUpdateBtn = document.getElementById('pwa-check-update-btn');
        if (checkUpdateBtn) checkUpdateBtn.textContent = this.getTranslation('checkUpdate');

        const statusTitle = document.querySelector('#about-settings .about-section h4');
        if (statusTitle && statusTitle.textContent.includes('Status')) {
             statusTitle.textContent = this.getTranslation('statusTitle');
        }

        // Update Announcement UI
        if (this.announcementStatusText) this.announcementStatusText.textContent = statusText;
        if (this.announcementInstallBtn) this.announcementInstallBtn.textContent = this.getTranslation('install');

        // Update Version Label in Announcement (rough heuristic)
        if (this.announcementStatusText && this.announcementStatusText.parentElement && this.announcementStatusText.parentElement.nextSibling) {
             const versionDiv = this.announcementStatusText.parentElement.nextSibling;
             if (versionDiv && versionDiv.textContent.includes('v2.1.0')) {
                 versionDiv.textContent = `${this.getTranslation('version')}: v2.1.0`;
             }
        }
    }

    updateOnlineStatus() {
        const isOnline = navigator.onLine;
        const color = isOnline ? '#34C759' : '#8E8E93'; // Green or Gray
        const text = isOnline ? this.getTranslation('online') : this.getTranslation('offline');

        if (this.statusIndicator) this.statusIndicator.style.backgroundColor = color;
        if (this.statusText) this.statusText.textContent = text;

        if (this.announcementStatusIndicator) this.announcementStatusIndicator.style.backgroundColor = color;
        if (this.announcementStatusText) this.announcementStatusText.textContent = text;
    }

    async installApp() {
        if (!this.deferredPrompt) return;

        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        this.deferredPrompt = null;
        this.hideInstallButtons();
    }

    checkForUpdates() {
        if (!('serviceWorker' in navigator)) {
            alert('Service Worker not supported');
            return;
        }

        if (window.drawingBoard && window.drawingBoard.settingsManager && window.drawingBoard.settingsManager.toastManager) {
            window.drawingBoard.settingsManager.toastManager.show(this.getTranslation('checking'), 'info');
        }

        navigator.serviceWorker.getRegistration().then(reg => {
            if (reg) {
                reg.update().then(() => {
                    // If no update found after a short delay, show "Latest"
                    // This is a bit of a hack since update() promise resolves whether updated or not
                    // Ideally we rely on onupdatefound, but if that doesn't fire, we assume latest.
                    setTimeout(() => {
                        if (!reg.installing && !reg.waiting) {
                            if (window.drawingBoard && window.drawingBoard.settingsManager && window.drawingBoard.settingsManager.toastManager) {
                                window.drawingBoard.settingsManager.toastManager.show(this.getTranslation('latest'), 'success');
                            }
                        }
                    }, 1000);
                });
            }
        });
    }
}

// Initialize
window.pwaManager = new PWAManager();
