/**
 * Icons.js - Crisp SVG Vector Icon Helper
 */

export const Icons = {
    svg(pathContent, size = 16, color = 'currentColor', strokeWidth = 2, extraClass = '') {
        return `<svg class="svg-icon ${extraClass}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; flex-shrink:0;">${pathContent}</svg>`;
    },

    checkCircle(size = 18, color = '#10b981') {
        return this.svg('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>', size, color);
    },

    xCircle(size = 18, color = '#ef4444') {
        return this.svg('<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>', size, color);
    },

    shieldAlert(size = 18, color = '#f59e0b') {
        return this.svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>', size, color);
    },

    fileText(size = 18, color = '#38bdf8') {
        return this.svg('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>', size, color);
    },

    x(size = 16, color = 'currentColor') {
        return this.svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', size, color);
    }
};

export default Icons;

