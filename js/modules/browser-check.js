/**
 * Browser Compatibility Checker
 */
class BrowserCheck {
    static init() {
        const warnings = [];

        // Check for Canvas support
        if (!window.HTMLCanvasElement) {
            warnings.push("Canvas API");
        }

        // Check for ES6 features (basic check)
        try {
            eval("class Test {}");
            eval("const test = () => {}");
        } catch (e) {
            warnings.push("ES6 JavaScript Support");
        }

        if (warnings.length > 0) {
            this.showWarning(warnings);
        }
    }

    static showWarning(missingFeatures) {
        const div = document.createElement('div');
        div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;color:white;text-align:center;font-family:sans-serif;';
        div.innerHTML = `
            <div style="background:#333;padding:20px;border-radius:10px;max-width:400px;color:white;">
                <h2 style="margin-bottom:10px;color:#ff5555;">⚠️ Browser Outdated</h2>
                <p>Your browser does not support the following required features:</p>
                <ul style="text-align:left;margin:15px auto;display:inline-block;color:#ccc;">
                    ${missingFeatures.map(f => `<li>${f}</li>`).join('')}
                </ul>
                <p style="margin-bottom:20px;">Please update your browser to the latest version of Chrome, Edge, Firefox, or Safari.</p>
                <button onclick="this.closest('div').parentElement.remove()" style="padding:10px 20px;cursor:pointer;background:#007AFF;border:none;border-radius:5px;color:white;font-weight:bold;">Continue Anyway</button>
            </div>
        `;
        document.body.appendChild(div);
    }
}

window.BrowserCheck = BrowserCheck;
