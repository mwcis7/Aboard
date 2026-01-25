/**
 * Rich Text Parser Module
 * Parses custom rich text syntax into HTML with sanitization.
 * Supported syntax:
 * - Bold: **text**
 * - Underline: __text__
 * - Color: [color=red]text[/color] or [color=#ff0000]text[/color]
 * - Size: [size=20px]text[/size]
 * - URLs: Auto-converted to links
 * - Newlines: Converted to line breaks or divs
 */
class RichTextParser {
    static parse(text) {
        if (!text) return '';

        // Handle array input (common in localization files for multiline content)
        if (Array.isArray(text)) {
            text = text.join('\n');
        }

        // Escape HTML first to prevent XSS
        let result = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

        // Bold: **text**
        result = result.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

        // Underline: __text__
        result = result.replace(/__(.*?)__/g, '<u>$1</u>');

        // Color: [color=red]text[/color] or [color=#ff0000]text[/color]
        // Regex to capture color value and content
        result = result.replace(/\[color=([^\]]+)\](.*?)\[\/color\]/g, '<span style="color:$1">$2</span>');

        // Size: [size=20px]text[/size]
        result = result.replace(/\[size=([^\]]+)\](.*?)\[\/size\]/g, '<span style="font-size:$1">$2</span>');

        // Auto-link URLs
        // We look for http/https URLs.
        // Note: We already escaped HTML, so we don't need to worry about breaking existing tags (except the ones we just added? No, the regexes above added HTML tags).
        // Wait, if we added <span style="...">, we inserted HTML characters.
        // URL replacement should ideally happen *before* we add our HTML tags if there's a risk of matching inside tags,
        // OR we need to be careful not to match inside attributes.
        // However, our custom tags [color] etc don't contain http usually.
        // But the <span> tags do contain attributes.
        // A simple URL regex might match parts of style="...".
        // It's safer to do URL linking *before* HTML escaping? No, because we want the link text to be escaped if it contains malicious chars?
        // Actually, URL itself should be encoded.
        // Let's do URL linking *after* escaping but *before* adding custom HTML tags to avoid matching inside the tags we generate.

        // Revised order:
        // 1. Escape HTML
        // 2. Auto-link URLs
        // 3. Apply Custom Syntax (Bold, Color, etc)
        // 4. Handle Newlines

        // Let's re-implement with this safer order.

        // 1. Escape HTML
        // (Already done above)

        // 2. Auto-link URLs
        // Regex for URLs.
        result = result.replace(/(https?:\/\/[^\s]+)/g, (url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--theme-color, #007AFF); text-decoration: none;">${url}</a>`;
        });

        // 3. Apply Custom Syntax
        // Bold
        result = result.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        // Underline
        result = result.replace(/__(.*?)__/g, '<u>$1</u>');
        // Color
        result = result.replace(/\[color=([^\]]+)\](.*?)\[\/color\]/g, '<span style="color:$1">$2</span>');
        // Size
        result = result.replace(/\[size=([^\]]+)\](.*?)\[\/size\]/g, '<span style="font-size:$1">$2</span>');

        // 4. Handle Newlines
        if (result.includes('\n')) {
            result = result.split('\n').map(line => {
                if (!line.trim()) return '<br>';
                // Check for lists
                if (line.trim().match(/^\d+\./)) {
                    return `<div style="margin-bottom:4px; font-weight:bold;">${line}</div>`;
                }
                if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
                    return `<div style="margin-bottom:4px; padding-left:10px;">${line}</div>`;
                }
                return `<div>${line}</div>`;
            }).join('');
        }

        return result;
    }
}

// Export for use
window.RichTextParser = RichTextParser;
