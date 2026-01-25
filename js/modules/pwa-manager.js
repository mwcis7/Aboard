class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.statusIndicator = null;
        this.statusText = null;
        this.installBtn = null;
        this.init();
    }

    init() {
        this.registerServiceWorker();
        // Wait for DOM to be ready before setting up UI
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupUI());
        } else {
            this.setupUI();
        }
        this.setupEventListeners();
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(registration => {
                        console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    })
                    .catch(err => {
                        console.log('ServiceWorker registration failed: ', err);
                    });
            });
        }
    }

    setupUI() {
        // Inject Status and Version info into About section
        const aboutInfo = document.querySelector('#about-settings .about-info');
        if (aboutInfo) {
            const section = document.createElement('div');
            section.className = 'about-section';

            // App Status
            const statusTitle = document.createElement('h4');
            statusTitle.textContent = '应用状态 / App Status';

            const statusContainer = document.createElement('div');
            statusContainer.style.display = 'flex';
            statusContainer.style.alignItems = 'center';
            statusContainer.style.gap = '8px';
            statusContainer.style.marginTop = '8px';

            const statusIndicator = document.createElement('span');
            statusIndicator.id = 'pwa-status-indicator';
            statusIndicator.style.width = '10px';
            statusIndicator.style.height = '10px';
            statusIndicator.style.borderRadius = '50%';
            statusIndicator.style.display = 'inline-block';

            const statusText = document.createElement('span');
            statusText.id = 'pwa-status-text';

            statusContainer.appendChild(statusIndicator);
            statusContainer.appendChild(statusText);

            // Install Button (hidden by default)
            const installBtn = document.createElement('button');
            installBtn.id = 'pwa-install-btn';
            installBtn.textContent = '安装应用 / Install App';
            installBtn.style.display = 'none';
            installBtn.style.marginTop = '10px';
            installBtn.style.padding = '8px 16px';
            installBtn.style.backgroundColor = 'var(--theme-color, #007AFF)';
            installBtn.style.color = 'white';
            installBtn.style.border = 'none';
            installBtn.style.borderRadius = '4px';
            installBtn.style.cursor = 'pointer';
            installBtn.style.fontSize = '14px';

            installBtn.addEventListener('click', () => this.installApp());

            section.appendChild(statusTitle);
            section.appendChild(statusContainer);
            section.appendChild(installBtn);

            // Append to about info
            aboutInfo.appendChild(section);

            this.statusIndicator = statusIndicator;
            this.statusText = statusText;
            this.installBtn = installBtn;

            this.updateOnlineStatus();
        }
    }

    setupEventListeners() {
        window.addEventListener('online', () => this.updateOnlineStatus());
        window.addEventListener('offline', () => this.updateOnlineStatus());

        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            this.deferredPrompt = e;
            // Update UI to notify the user they can add to home screen
            if (this.installBtn) {
                this.installBtn.style.display = 'block';
            }
        });
    }

    updateOnlineStatus() {
        if (!this.statusIndicator || !this.statusText) return;

        const isOnline = navigator.onLine;
        this.statusIndicator.style.backgroundColor = isOnline ? '#34C759' : '#8E8E93'; // Green or Gray
        this.statusText.textContent = isOnline ? '在线 / Online' : '离线 / Offline';
    }

    async installApp() {
        if (!this.deferredPrompt) return;

        // Show the prompt
        this.deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // We've used the prompt, and can't use it again, throw it away
        this.deferredPrompt = null;
        if (this.installBtn) {
            this.installBtn.style.display = 'none';
        }
    }
}

// Initialize
window.pwaManager = new PWAManager();
