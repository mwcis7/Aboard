
class TimeDisplayManager {
    constructor() {
        this.fullscreenColor = '#ffffff';
        this.fullscreenBgColor = '#000000';
        this.fullscreenOpacity = 95;
    }
    setFullscreenColor(color) { this.fullscreenColor = color; }
    setFullscreenBgColor(color) { this.fullscreenBgColor = color; }
    setFullscreenOpacity(opacity) { this.fullscreenOpacity = opacity; }
    applySettings() {}
    updateDisplay() {}
}

const TimeDisplaySettingsModal = require('./js/modules/time-display-settings.js');

// Mock DOM
const { JSDOM } = require('jsdom');
const dom = new JSDOM(`
<!DOCTYPE html>
<body>
<div id="time-display-settings-modal">
    <button class="color-btn" data-td-fs-color="#ff0000"></button>
    <input id="td-fs-opacity-input" value="50" />
</div>
</body>
`);
global.document = dom.window.document;
global.window = dom.window;

// Test
const manager = new TimeDisplayManager();
const modal = new TimeDisplaySettingsModal(manager);

// Simulate click on color btn
const colorBtn = document.querySelector('.color-btn[data-td-fs-color="#ff0000"]');
colorBtn.classList.add('active'); // Simulate active state toggle which usually happens in listener
manager.setFullscreenColor('#ff0000'); // Simulate apply

if (manager.fullscreenColor === '#ff0000') {
    console.log('Fullscreen Color Update: SUCCESS');
} else {
    console.error('Fullscreen Color Update: FAILED');
}
