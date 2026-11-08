/**
 * UIManager.js - Toast and Feedback Management for Trilliun Chip
 */

import { Icons } from './Icons.js';
import AuraSound from './AuraSound.js';

class UIManager {
    constructor() {
        this.toastContainer = null;
    }

    init() {
        if (typeof document === 'undefined') return;
        this.toastContainer = document.getElementById('toast-container');
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.id = 'toast-container';
            this.toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 999999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
                max-width: 90vw;
                width: 380px;
            `;
            if (document.body) {
                document.body.appendChild(this.toastContainer);
            }
        }
    }

    toast(options) {
        this.init();
        const {
            type = 'info',
            title,
            message,
            duration = 3800
        } = typeof options === 'string' ? { message: options } : options;

        if (type === 'success') AuraSound.playSuccessAlert();
        else if (type === 'error') AuraSound.playErrorAlert();
        else if (type === 'warning') AuraSound.playWarningAlert();
        else AuraSound.playInfoAlert();

        const toast = document.createElement('div');
        toast.className = `trilliun-toast trilliun-toast-${type}`;
        toast.style.cssText = `
            pointer-events: auto;
            background: rgba(18, 16, 24, 0.94);
            backdrop-filter: blur(12px);
            border-radius: 12px;
            padding: 12px 16px;
            color: #fff;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5), 0 0 15px ${this._getTypeGlow(type)};
            border: 1px solid ${this._getTypeBorder(type)};
            animation: slideInToast 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            font-family: 'Outfit', sans-serif;
        `;

        const iconHTML = this._getIcon(type);

        toast.innerHTML = `
            <div style="flex-shrink: 0; margin-top: 2px;">${iconHTML}</div>
            <div style="flex: 1; min-width: 0;">
                ${title ? `<div style="font-weight: 800; font-size: 0.88rem; margin-bottom: 2px; color: ${this._getTypeTitleColor(type)};">${title}</div>` : ''}
                <div style="font-size: 0.82rem; color: rgba(255,255,255,0.85); line-height: 1.4; word-break: break-word;">${message}</div>
            </div>
            <button class="toast-close-btn" style="
                background: none;
                border: none;
                color: rgba(255,255,255,0.4);
                cursor: pointer;
                padding: 2px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: color 0.15s;
            ">${Icons.x(14)}</button>
        `;

        const closeBtn = toast.querySelector('.toast-close-btn');
        const dismiss = () => {
            toast.style.animation = 'slideOutToast 0.25s forwards';
            setTimeout(() => toast.remove(), 250);
        };

        closeBtn?.addEventListener('click', dismiss);
        setTimeout(dismiss, duration);

        this.toastContainer.appendChild(toast);
        return toast;
    }

    success(message, title = 'Berhasil!') {
        return this.toast({ type: 'success', title, message });
    }

    error(message, title = 'Perhatian') {
        return this.toast({ type: 'error', title, message });
    }

    warning(message, title = 'Peringatan') {
        return this.toast({ type: 'warning', title, message });
    }

    info(message, title = 'Info') {
        return this.toast({ type: 'info', title, message });
    }

    /**
     * Formats numeric input fields dynamically
     */
    setupNumericInput(inputElement, options = {}) {
        if (!inputElement) return;

        const { isDecimal = false } = options;
        if (inputElement.type === 'number') {
            inputElement.type = 'text';
            inputElement.inputMode = isDecimal ? 'decimal' : 'numeric';
        }

        const formatValue = (val) => {
            let clean = String(val || '');
            if (isDecimal) {
                clean = clean.replace(/[^0-9.]/g, '');
                const parts = clean.split('.');
                if (parts.length > 2) {
                    clean = parts[0] + '.' + parts.slice(1).join('');
                }
            } else {
                clean = clean.replace(/[^0-9]/g, '');
            }

            if (clean === '') return '';

            const parts = clean.split('.');
            let integerPart = parts[0];
            let decimalPart = parts[1];

            let formatted = integerPart ? parseInt(integerPart, 10).toLocaleString('en-US') : '0';
            if (parts.length > 1) {
                formatted += '.' + decimalPart;
            }
            return formatted;
        };

        if (inputElement.value) {
            inputElement.value = formatValue(inputElement.value);
        }

        const onInput = () => {
            let cursorPosition = inputElement.selectionStart;
            let originalLength = inputElement.value.length;

            let formatted = formatValue(inputElement.value);
            inputElement.value = formatted;

            let newLength = formatted.length;
            let newCursorPosition = cursorPosition + (newLength - originalLength);
            try {
                inputElement.setSelectionRange(newCursorPosition, newCursorPosition);
            } catch (e) {}
        };

        inputElement.removeEventListener('input', inputElement._numericListener);
        inputElement._numericListener = onInput;
        inputElement.addEventListener('input', onInput);

        inputElement.getNumericValue = () => {
            let raw = (inputElement.value || '').replace(/,/g, '');
            let val = isDecimal ? parseFloat(raw) : parseInt(raw, 10);
            return isNaN(val) ? 0 : val;
        };
    }

    _getIcon(type) {
        if (type === 'success') return Icons.checkCircle(20, '#10b981');
        if (type === 'error') return Icons.xCircle(20, '#ef4444');
        if (type === 'warning') return Icons.shieldAlert(20, '#f59e0b');
        return Icons.fileText(20, '#38bdf8');
    }

    _getTypeBorder(type) {
        if (type === 'success') return 'rgba(16, 185, 129, 0.4)';
        if (type === 'error') return 'rgba(239, 68, 68, 0.4)';
        if (type === 'warning') return 'rgba(245, 158, 11, 0.4)';
        return 'rgba(56, 189, 248, 0.4)';
    }

    _getTypeGlow(type) {
        if (type === 'success') return 'rgba(16, 185, 129, 0.2)';
        if (type === 'error') return 'rgba(239, 68, 68, 0.2)';
        if (type === 'warning') return 'rgba(245, 158, 11, 0.2)';
        return 'rgba(56, 189, 248, 0.2)';
    }

    _getTypeTitleColor(type) {
        if (type === 'success') return '#34d399';
        if (type === 'error') return '#f87171';
        if (type === 'warning') return '#fbbf24';
        return '#38bdf8';
    }
}

const ui = new UIManager();
if (typeof window !== 'undefined') {
    window.ui = ui;
}
export default ui;
