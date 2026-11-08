/**
 * ViewManager.js - Dynamic View Mounting Engine for Trilliun Chip
 */

class ViewManager {
    constructor() {
        this.activeView = null;
    }

    showDynamicView(title, subtitle, contentHTML) {
        this.activeView = title;
        let container = document.getElementById('dynamic-view-content');
        if (!container) {
            container = document.getElementById('app');
        }
        if (container) {
            container.innerHTML = contentHTML;
        }

        const titleEl = document.getElementById('view-title');
        if (titleEl) titleEl.textContent = title;

        const subEl = document.getElementById('view-subtitle');
        if (subEl) subEl.textContent = subtitle;

        if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
}

const viewManager = new ViewManager();
if (typeof window !== 'undefined') {
    window.viewManager = viewManager;
}
export default viewManager;
