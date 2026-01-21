class SettingsManager {
    deepCompare(obj1, obj2, path = '') {
        const diffs = [];

        if (obj1 === obj2) return diffs;
        if (!obj1 || !obj2) {
            diffs.push({ key: path, old: obj1, new: obj2 });
            return diffs;
        }

        if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
            // Check for potential JSON strings
            try {
                if (typeof obj1 === 'string' && (obj1.startsWith('[') || obj1.startsWith('{'))) {
                    const parsed1 = JSON.parse(obj1);
                    const parsed2 = JSON.parse(obj2);
                    return this.deepCompare(parsed1, parsed2, path);
                }
            } catch (e) {
                // Ignore
            }

            if (obj1 !== obj2) {
                diffs.push({ key: path, old: obj1, new: obj2 });
            }
            return diffs;
        }

        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        const allKeys = new Set([...keys1, ...keys2]);

        for (const key of allKeys) {
            const newPath = path ? `${path}.${key}` : key;
            const subDiffs = this.deepCompare(obj1[key], obj2[key], newPath);
            diffs.push(...subDiffs);
        }

        return diffs;
    }
}

const sm = new SettingsManager();

const current = {
    a: 1,
    b: 'test',
    c: '["x", "y"]',
    d: { sub: 1 },
    e: 'normal string'
};

const newer = {
    a: 2,           // Changed
    b: 'test',      // Same
    c: '["x", "z"]', // Changed inside JSON string
    d: { sub: 1 },  // Same
    e: 'normal string'
};

console.log(JSON.stringify(sm.deepCompare(current, newer), null, 2));
