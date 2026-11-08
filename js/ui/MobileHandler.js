/**
 * MobileHandler.js - Dedicated Mobile & Touch Ergonomics Handler
 * Trilliun-Bet33 VIP Casino Suite
 * 
 * Features:
 * 1. Device & Touch Capability Detection (Mobile/Tablet/iOS/Android)
 * 2. Real-time Orientation Tracking (Portrait vs Landscape) + PixiJS stage auto-sync
 * 3. Dynamic Viewport Height (--vh) handling for mobile address bars
 * 4. Hardware Haptic Feedback (Vibration API)
 * 5. Physical Pull-Down Swipe-to-Spin Gesture on Reels
 * 6. One-Thumb Quick Bet Bottom Sheet Chip Selector
 * 7. Unified Slot Engine Mobile Binder (One-line integration for all slot machines)
 */

import financeManager from '../finance/FinanceManager.js';
import gameState from '../core/GameState.js';
import AuraSound from './AuraSound.js';

export class MobileHandler {
    constructor() {
        this.isMobile = false;
        this.isTouch = false;
        this.isIOS = false;
        this.isAndroid = false;
        this.orientation = 'portrait'; // 'portrait' | 'landscape'

        this._betSheetEl = null;
        this._autoSpinSheetEl = null;
        this._swipeTouchStartY = 0;
        this._swipeTouchStartX = 0;
        this._swipeStartTime = 0;
        this._activeEngine = null;
        this._initialized = false;

        // Screen Wake Lock states
        this._wakeLock = null;
        this._wakeLockActive = false;
        this._noSleepVideo = null;
    }

    /**
     * Initialize all mobile listeners, viewport calculations, and DOM structures.
     */
    init() {
        if (typeof window === 'undefined' || this._initialized) return;
        this._initialized = true;

        this.detectCapabilities();
        this.updateViewportHeight();
        this.updateOrientation();

        // Orientation & Resize event listeners
        if (window.screen && window.screen.orientation) {
            window.screen.orientation.addEventListener('change', () => this.handleOrientationChange());
        }
        window.addEventListener('orientationchange', () => this.handleOrientationChange());
        window.addEventListener('resize', () => {
            this.detectCapabilities();
            this.updateViewportHeight();
            this.updateOrientation();
        });

        // Re-acquire Wake Lock when user returns to tab if spins are still running
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible' && this._wakeLockActive) {
                await this.requestWakeLock('tab-return');
            }
        });

        // Initialize Quick Bet Sheet DOM
        this._initQuickBetSheet();

        console.log(`📱 [MobileHandler] Active. Device: ${this.isMobile ? 'Mobile' : 'Desktop'}, Orientation: ${this.orientation}`);
    }

    /**
     * Detects device capabilities, touch support, and platform.
     */
    detectCapabilities() {
        if (typeof window === 'undefined') return;

        const ua = navigator.userAgent || '';
        this.isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        this.isAndroid = /Android/.test(ua);
        this.isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        this.isMobile = this.isTouch || window.innerWidth <= 900 || this.isIOS || this.isAndroid;

        // Apply state classes to body
        document.body.classList.toggle('mobile-device', this.isMobile);
        document.body.classList.toggle('desktop-device', !this.isMobile);
        document.body.classList.toggle('touch-device', this.isTouch);
        document.body.classList.toggle('is-ios', this.isIOS);
        document.body.classList.toggle('is-android', this.isAndroid);
    }

    /**
     * Calculates real viewport height to prevent mobile browser address bar layout jumps.
     */
    updateViewportHeight() {
        if (typeof window === 'undefined') return;
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    /**
     * Updates orientation state (portrait vs landscape) and toggles body classes.
     */
    updateOrientation() {
        if (typeof window === 'undefined') return;
        const isLandscape = window.innerWidth > window.innerHeight && window.innerHeight < 650;
        this.orientation = isLandscape ? 'landscape' : 'portrait';

        document.body.classList.toggle('orientation-landscape', this.orientation === 'landscape');
        document.body.classList.toggle('orientation-portrait', this.orientation === 'portrait');
    }

    /**
     * Triggered on orientation change: updates state, emits haptic feedback,
     * and forces PixiJS WebGL canvas stages to recalculate geometry.
     */
    handleOrientationChange() {
        this.updateViewportHeight();
        this.updateOrientation();
        this.hapticTap();

        // Multiple debounce timers ensure WebGL stages adapt smoothly as viewport settles
        [100, 250, 500].forEach(delay => {
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, delay);
        });
    }

    // ── Hardware Haptics (Vibration API) ──
    vibrate(pattern) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
                navigator.vibrate(pattern);
            } catch (e) {
                // Silently fallback if vibration is blocked by browser policy
            }
        }
    }

    hapticTap() {
        this.vibrate(15);
    }

    hapticSpin() {
        this.vibrate(35);
    }

    hapticTumble() {
        this.vibrate([15, 25, 20]);
    }

    hapticWin() {
        this.vibrate([35, 25, 45, 30, 70]);
    }

    hapticBigWin() {
        this.vibrate([80, 40, 80, 40, 150]);
    }

    hapticError() {
        this.vibrate([40, 30, 40]);
    }

    // ── Screen Wake Lock Management (Anti-Sleep API) ──

    /**
     * Request Screen Wake Lock (API + Fallback)
     * Keeps the mobile device screen awake while spin or auto-spin sequence is active.
     */
    async requestWakeLock(reason = 'spin') {
        if (typeof window === 'undefined') return;
        this._wakeLockActive = true;

        // 1. Native Screen Wake Lock API (Chrome Android, Safari iOS 16.4+, Edge, Samsung Internet)
        if ('wakeLock' in navigator) {
            try {
                if (!this._wakeLock || this._wakeLock.released) {
                    this._wakeLock = await navigator.wakeLock.request('screen');
                    this._wakeLock.addEventListener('release', () => {
                        this._wakeLock = null;
                    });
                    console.log(`📱 [MobileHandler] Wake Lock AKTIF (${reason}): Layar HP dicegah tidur.`);
                }
                return;
            } catch (err) {
                console.warn('[MobileHandler] Native Wake Lock request error:', err);
            }
        }

        // 2. Microscopic Video Loop Fallback (For older iOS / Android browsers without navigator.wakeLock)
        try {
            if (!this._noSleepVideo) {
                const video = document.createElement('video');
                video.setAttribute('playsinline', '');
                video.setAttribute('webkit-playsinline', '');
                video.setAttribute('loop', '');
                video.setAttribute('muted', '');
                video.muted = true;
                // Tiny 1x1 blank webm data URL to keep display awake
                video.src = 'data:video/webm;base64,GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYUkoakCaVhFoKAExBWWluZ1ZLAAAAAAAKF0NVYXBwZWRCdWZmZXJzAAAAAE5n/wA';
                video.style.position = 'fixed';
                video.style.top = '-9999px';
                video.style.left = '-9999px';
                video.style.opacity = '0';
                video.style.pointerEvents = 'none';
                video.style.width = '1px';
                video.style.height = '1px';
                document.body.appendChild(video);
                this._noSleepVideo = video;
            }
            if (this._noSleepVideo && this._noSleepVideo.paused) {
                await this._noSleepVideo.play().catch(() => {});
            }
        } catch (e) {}
    }

    /**
     * Release Screen Wake Lock when all spins are finished.
     */
    async releaseWakeLock() {
        this._wakeLockActive = false;
        if (this._wakeLock) {
            try {
                await this._wakeLock.release();
            } catch (err) {
                console.warn('[MobileHandler] Wake Lock release error:', err);
            }
            this._wakeLock = null;
        }

        if (this._noSleepVideo && !this._noSleepVideo.paused) {
            try {
                this._noSleepVideo.pause();
            } catch (e) {}
        }
        console.log('📱 [MobileHandler] Wake Lock NON-AKTIF: Layar HP kembali ke batas timeout normal.');
    }

    // ── Physical Swipe-to-Spin Gesture on Reels ──
    bindReelSwipe(reelElement, spinCallback) {
        if (!reelElement || !spinCallback) return;

        reelElement.addEventListener('touchstart', (e) => {
            if (e.touches && e.touches.length === 1) {
                this._swipeTouchStartY = e.touches[0].clientY;
                this._swipeTouchStartX = e.touches[0].clientX;
                this._swipeStartTime = Date.now();
            }
        }, { passive: true });

        reelElement.addEventListener('touchend', (e) => {
            if (e.changedTouches && e.changedTouches.length === 1) {
                const deltaY = e.changedTouches[0].clientY - this._swipeTouchStartY;
                const deltaX = Math.abs(e.changedTouches[0].clientX - this._swipeTouchStartX);
                const elapsed = Date.now() - this._swipeStartTime;

                // Downward swipe > 40px, mostly vertical, under 600ms: Arcade pull spin!
                if (deltaY > 40 && deltaX < deltaY * 0.8 && elapsed < 600) {
                    this.hapticSpin();
                    spinCallback();
                }
            }
        }, { passive: true });
    }

    // ── One-Thumb Quick Bet Bottom Sheet ──
    _initQuickBetSheet() {
        if (document.getElementById('mobile-bet-sheet-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'mobile-bet-sheet-overlay';
        overlay.className = 'mobile-bet-sheet-overlay';

        overlay.innerHTML = `
            <div class="mobile-bet-sheet-panel">
                <div class="bet-sheet-handle"></div>
                <div class="bet-sheet-header">
                    <div>
                        <div class="bet-sheet-title">🪙 PILIH NOMINAL TARUHAN</div>
                        <div class="bet-sheet-subtitle">Pilih cepat chip satu jempol</div>
                    </div>
                    <button type="button" id="btn-close-bet-sheet" class="bet-sheet-close-btn" aria-label="Tutup">&times;</button>
                </div>
                <div class="bet-chips-grid" id="bet-sheet-chips"></div>
                <div class="bet-sheet-footer">
                    <button type="button" id="btn-sheet-max-bet" class="btn-sheet-max">🚀 TARUHAN MAKSIMAL (MAX)</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this._betSheetEl = overlay;

        // Dismiss listeners
        overlay.querySelector('#btn-close-bet-sheet')?.addEventListener('click', () => this.closeQuickBetSheet());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.closeQuickBetSheet();
        });
    }

    openQuickBetSheet({ currentBet, betTiers, onSelectBet, onMaxBet }) {
        if (!this._betSheetEl) this._initQuickBetSheet();
        const chipsContainer = this._betSheetEl.querySelector('#bet-sheet-chips');
        const maxBtn = this._betSheetEl.querySelector('#btn-sheet-max-bet');
        if (!chipsContainer) return;

        this.hapticTap();
        chipsContainer.innerHTML = '';

        betTiers.forEach((tier) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `quick-chip-btn ${tier === currentBet ? 'active' : ''}`;
            btn.innerHTML = `
                <span class="chip-val">${financeManager.formatCurrency(tier, true)}</span>
                <span class="chip-label">TC</span>
            `;
            btn.addEventListener('click', () => {
                this.hapticTap();
                onSelectBet(tier);
                this.closeQuickBetSheet();
            });
            chipsContainer.appendChild(btn);
        });

        if (maxBtn) {
            maxBtn.onclick = () => {
                this.hapticSpin();
                onMaxBet();
                this.closeQuickBetSheet();
            };
        }

        this._betSheetEl.classList.add('open');
    }

    closeQuickBetSheet() {
        if (this._betSheetEl) {
            this._betSheetEl.classList.remove('open');
        }
    }

    // ── Flexible Auto Spin Bottom Sheet ──
    _initAutoSpinSheet() {
        if (document.getElementById('mobile-autospin-sheet-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'mobile-autospin-sheet-overlay';
        overlay.className = 'mobile-bet-sheet-overlay';

        overlay.innerHTML = `
            <div class="mobile-bet-sheet-panel autospin-sheet-panel">
                <div class="bet-sheet-handle"></div>
                <div class="bet-sheet-header">
                    <div>
                        <div class="bet-sheet-title">🤖 PUTARAN OTOMATIS (AUTO SPIN)</div>
                        <div class="bet-sheet-subtitle">Pilih jumlah putaran atau kustom</div>
                    </div>
                    <button type="button" id="btn-close-autospin-sheet" class="bet-sheet-close-btn" aria-label="Tutup">&times;</button>
                </div>
                
                <div class="autospin-presets-grid" id="autospin-sheet-presets">
                    <button type="button" class="autospin-chip-btn" data-count="10">10 <span>PUTAR</span></button>
                    <button type="button" class="autospin-chip-btn active" data-count="25">25 <span>PUTAR</span></button>
                    <button type="button" class="autospin-chip-btn" data-count="50">50 <span>PUTAR</span></button>
                    <button type="button" class="autospin-chip-btn" data-count="100">100 <span>PUTAR</span></button>
                    <button type="button" class="autospin-chip-btn" data-count="500">500 <span>PUTAR</span></button>
                    <button type="button" class="autospin-chip-btn autospin-chip-inf" data-count="Infinity">∞</button>
                </div>

                <div class="autospin-options-box">
                    <div class="autospin-custom-field">
                        <label>JUMLAH KUSTOM</label>
                        <input type="number" id="autospin-custom-input" min="1" max="9999" placeholder="Kustom (misal: 30)">
                    </div>
                    <label class="autospin-turbo-toggle">
                        <input type="checkbox" id="autospin-turbo-checkbox">
                        <span class="turbo-text">⚡ Turbo Mode</span>
                    </label>
                </div>

                <div class="bet-sheet-footer">
                    <button type="button" id="btn-start-autospin-sheet" class="btn-sheet-start-autospin">
                        ▶️ MULAI AUTO SPIN (<span id="autospin-selected-label">25</span>)
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this._autoSpinSheetEl = overlay;

        // Dismiss listeners
        overlay.querySelector('#btn-close-autospin-sheet')?.addEventListener('click', () => this.closeAutoSpinSheet());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.closeAutoSpinSheet();
        });
    }

    openAutoSpinSheet({ currentCount = 25, isSpeedUp = false, onStartAutoSpin }) {
        if (!this._autoSpinSheetEl) this._initAutoSpinSheet();
        const panel = this._autoSpinSheetEl;
        this.hapticTap();

        let selectedCount = currentCount || 25;
        const labelEl = panel.querySelector('#autospin-selected-label');
        const customInput = panel.querySelector('#autospin-custom-input');
        const turboCheckbox = panel.querySelector('#autospin-turbo-checkbox');
        const startBtn = panel.querySelector('#btn-start-autospin-sheet');
        const presetBtns = panel.querySelectorAll('.autospin-chip-btn');

        if (turboCheckbox) turboCheckbox.checked = !!isSpeedUp;
        if (customInput) customInput.value = '';

        const updateSelected = (count) => {
            selectedCount = count;
            presetBtns.forEach(btn => {
                const bVal = btn.dataset.count === 'Infinity' ? Infinity : parseInt(btn.dataset.count, 10);
                btn.classList.toggle('active', bVal === count);
            });
            if (labelEl) {
                labelEl.textContent = count === Infinity ? '∞' : count;
            }
        };

        updateSelected(selectedCount);

        presetBtns.forEach(btn => {
            btn.onclick = () => {
                this.hapticTap();
                if (customInput) customInput.value = '';
                const bVal = btn.dataset.count === 'Infinity' ? Infinity : parseInt(btn.dataset.count, 10);
                updateSelected(bVal);
            };
        });

        if (customInput) {
            customInput.oninput = () => {
                const val = parseInt(customInput.value, 10);
                if (!isNaN(val) && val > 0) {
                    selectedCount = val;
                    presetBtns.forEach(btn => btn.classList.remove('active'));
                    if (labelEl) labelEl.textContent = val;
                }
            };
        }

        if (startBtn) {
            startBtn.onclick = () => {
                this.hapticSpin();
                this.closeAutoSpinSheet();
                const turbo = turboCheckbox ? turboCheckbox.checked : false;
                onStartAutoSpin({ count: selectedCount, turbo });
            };
        }

        panel.classList.add('open');
    }

    closeAutoSpinSheet() {
        if (this._autoSpinSheetEl) {
            this._autoSpinSheetEl.classList.remove('open');
        }
    }

    /**
     * Convenient One-Line Mobile Binder for any Slot Machine Engine.
     * Hooks swipe gestures, quick bet sheet launcher, and haptic clicks.
     */
    attachToSlotEngine(container, engine, { betTiers, getCurrentBet, setBet }) {
        if (!container || !engine) return;

        // 1. Reel Window Swipe-to-Spin
        const windowTheater = container.querySelector('.slot-window-theater');
        if (windowTheater) {
            this.bindReelSwipe(windowTheater, () => {
                if (!engine.isSpinning) {
                    engine.stopAutoSpin?.();
                    engine.spin();
                }
            });
        }

        // 2. Bet Input Tap -> Quick Bet Bottom Sheet
        const betInput = container.querySelector('#slot-bet-input');
        if (betInput) {
            betInput.addEventListener('click', () => {
                if (this.isMobile) {
                    this.openQuickBetSheet({
                        currentBet: getCurrentBet(),
                        betTiers,
                        onSelectBet: (val) => setBet(val),
                        onMaxBet: () => container.querySelector('#btn-slot-max')?.click()
                    });
                }
            });
        }

        // 3. Auto Spin Button -> Flexible Auto Spin Bottom Sheet
        const autoBtn = container.querySelector('#btn-slot-auto');
        if (autoBtn) {
            autoBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.hapticTap();
                if (engine.isAutoSpinning) {
                    engine.stopAutoSpin();
                } else {
                    this.openAutoSpinSheet({
                        currentCount: (engine.autoSpinCount && engine.autoSpinCount > 0) ? engine.autoSpinCount : 25,
                        isSpeedUp: engine.isSpeedUp,
                        onStartAutoSpin: ({ count, turbo }) => {
                            if (turbo !== undefined) {
                                engine.isSpeedUp = turbo;
                                const speedBtn = container.querySelector('#btn-slot-speedup');
                                const speedText = container.querySelector('#slot-speedup-text');
                                if (speedBtn) speedBtn.classList.toggle('active', engine.isSpeedUp);
                                if (speedText) speedText.textContent = engine.isSpeedUp ? 'TURBO ON' : 'TURBO';
                            }
                            engine.startAutoSpin(count);
                        }
                    });
                }
            };
        }

        // 4. Haptics on stepper and controls
        container.querySelector('#btn-bet-minus')?.addEventListener('click', () => this.hapticTap());
        container.querySelector('#btn-bet-plus')?.addEventListener('click', () => this.hapticTap());
        container.querySelector('#btn-slot-max')?.addEventListener('click', () => this.hapticTap());
        container.querySelector('#btn-slot-speedup')?.addEventListener('click', () => this.hapticTap());
        container.querySelector('#btn-slot-info')?.addEventListener('click', () => this.hapticTap());
    }
}

export const mobileHandler = new MobileHandler();
export default mobileHandler;

