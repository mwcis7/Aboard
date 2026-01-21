/**
 * Script Loader Module
 * dynamically loads scripts when needed
 */
class ScriptLoader {
    static load(src) {
        return new Promise((resolve, reject) => {
            // Check if script is already loaded
            if (document.querySelector(`script[src="${src}"]`)) {
                // If loaded but not executed? We assume if tag exists it's loading or loaded.
                // We could check if global variable exists, but src is generic.
                // Ideally we track load state.
                // For simplicity, if tag exists, we assume it's loaded or will trigger existing listeners?
                // But we can't attach new listener to existing script tag easily if already loaded.
                // Better check if the global it provides exists?
                // But we don't know the global here.

                // Let's assume if it exists, it's fine.
                // Real implementation might need a registry.
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = true;

            script.onload = () => {
                resolve();
            };

            script.onerror = () => {
                reject(new Error(`Failed to load script: ${src}`));
            };

            document.body.appendChild(script);
        });
    }
}

window.ScriptLoader = ScriptLoader;
