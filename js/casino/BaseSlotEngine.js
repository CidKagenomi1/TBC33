/**
 * BaseSlotEngine.js - Shared Foundation for Multi-Reel Cascading Slot Engines
 * Consolidates:
 * - Cabinet & Paytable HTML template rendering
 * - Auto-Spin lifecycle & WakeLock management
 * - Bet Stepper & Mobile Quick-Bet / Swipe-to-Spin event bindings
 * - Weighted Random symbol selection with bet-tier & pity-luck scaling
 * - Cabinet Shake, Floating Praise Text, and 2D Canvas Particle delegation
 * - PixiSlotStage WebGL & DOM Fallback reel spin and cascade animations
 * - Core Tumble / Cascade loop orchestration & Payout celebration lifecycle
 */

import financeManager from '../finance/FinanceManager.js';
import gameState from '../core/GameState.js';
import ui from '../ui/UIManager.js';
import PixiSlotStage from '../graphics/PixiSlotStage.js';
import pixiEffects from '../graphics/PixiEffects.js';
import AuraSound from '../ui/AuraSound.js';
import mobileHandler from '../ui/MobileHandler.js';
import casinoVolatility from './CasinoVolatilityEngine.js';
import { CanvasParticleSystem, DEFAULT_PARTICLE_PALETTE } from '../graphics/CanvasParticleSystem.js';

export const DEFAULT_BET_TIERS = [
    10000, 25000, 50000, 100000, 250000, 500000,
    1000000, 2500000, 5000000, 10000000, 25000000, 50000000
];

export class BaseSlotEngine {
    constructor(onBalanceRefresh, config = {}) {
        this.isSpinning = false;
        this.onBalanceRefresh = onBalanceRefresh;
        this.autoSpinCount = 0;
        this.isAutoSpinning = false;
        this.isSpeedUp = false;
        this.skipRequested = false;
        this.pixiStage = null;
        this.currentNearMiss = false;
        this._autoSpinTimer = null;

        this.gameId = config.gameId || 'slot';
        this.cols = config.cols || 6;
        this.rows = config.rows || 3;
        this.symbols = config.symbols || [];
        this.paylines = config.paylines || [];
        this.pixiThemeColor = config.pixiThemeColor ?? 0xfbbf24;
        this.turboAccentColor = config.turboAccentColor || '#fbbf24';
        this.turboTextColor = config.turboTextColor || '#000';
        this.spinIcon = config.spinIcon || '⛏️';
        this.spinActiveText = config.spinActiveText || 'SPIN...';
        this.spinningStatusText = config.spinningStatusText || 'Mesin Sedang Berputar...';
        this.idleStatusText = config.idleStatusText || 'TEKAN SPIN UNTUK BERMAIN';
        this.expenseLabel = config.expenseLabel || `Taruhan Slot ${this.cols}x${this.rows}`;
        this.rateContainerId = config.rateContainerId || 'slot-rate-container';
        this.praiseStyle = config.praiseStyle || {
            color: '#fbbf24',
            stroke: '2px #451a03',
            shadow: '0 0 16px rgba(251,191,36,0.9), 0 4px 0 #7c2d12'
        };

        this.particleSystem = new CanvasParticleSystem(
            'slot-particle-canvas',
            config.particlePalette || DEFAULT_PARTICLE_PALETTE
        );
    }

    renderSymbolSVG(item) {
        return String(item ?? '');
    }

    getRateStatusHTML() {
        const plays = gameState.get('casino.ratePlays') || 0;
        const rateOn = plays >= 250;
        return rateOn
            ? `<div class="rate-badge rate-on-badge" style="display:inline-flex; align-items:center; gap:0.25rem; background:linear-gradient(135deg,#ef4444,#fbbf24); color:#fff; font-weight:900; font-size:0.72rem; padding:0.2rem 0.6rem; border-radius:999px; box-shadow:0 0 10px rgba(239,68,68,0.5); animation: rateGlow 1s ease-in-out infinite alternate; text-transform:uppercase; letter-spacing:0.05em; border: 1.5px solid #fff;">⚡ RATE ON</div>`
            : `<div class="rate-badge rate-off-badge" style="display:inline-flex; align-items:center; gap:0.25rem; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:rgba(255,255,255,0.65); font-weight:800; font-size:0.68rem; padding:0.18rem 0.5rem; border-radius:999px; text-transform:uppercase; letter-spacing:0.05em;">Rate: OFF (${plays}/250)</div>`;
    }

    getFallbackReelsHTML(initialSymbol) {
        let colsHTML = '';
        for (let col = 0; col < this.cols; col++) {
            colsHTML += '<div class="slot-reel-wrap">';
            for (let row = 0; row < this.rows; row++) {
                colsHTML += `<div id="slot-reel-${col}-${row}" class="slot-symbol-block">${this.renderSymbolSVG(initialSymbol)}</div>`;
            }
            colsHTML += '</div>';
        }
        return colsHTML;
    }

    renderCabinetHTML(cfg = {}) {
        const [evenLight, oddLight] = cfg.lightColors || ['#fbbf24', '#f97316'];
        const lightsHTML = Array.from({ length: 11 }, (_, i) => {
            const c = i % 2 === 0 ? evenLight : oddLight;
            return `<div class="slot-light" style="width:7px;height:7px;border-radius:50%;background:${c};box-shadow:0 0 6px ${c};animation:lightBlink ${0.5 + i * 0.1}s ease-in-out infinite alternate;"></div>`;
        }).join('');

        const accentStyle = cfg.accentColor ? `style="color:${cfg.accentColor};"` : '';
        const winBg = cfg.winBg || 'rgba(251,191,36,0.2)';
        const winBorder = cfg.winBorder || '#fbbf24';
        const jackpotFlash = cfg.jackpotFlash || `
            0%, 100% { background: linear-gradient(135deg,#fbbf24 0%,#d97706 100%); }
            50% { background: linear-gradient(135deg,#f43f5e 0%,#e11d48 100%); }
        `;

        return `
        <div class="slot-theater" style="max-width: 900px; margin: 0 auto; text-align: center;">
            <div class="slot-cabinet-theater" ${cfg.cabinetStyle ? `style="${cfg.cabinetStyle}"` : ''}>
                ${cfg.ornamentsHTML || ''}
                <canvas id="slot-particle-canvas" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:10;"></canvas>

                <div style="display:flex; justify-content:center; gap:0.4rem; margin-bottom:0.35rem;">${lightsHTML}</div>
                ${cfg.topMeterHTML || ''}

                <div class="slot-window-theater" ${cfg.windowStyle ? `style="${cfg.windowStyle}"` : ''}>
                    <div class="slot-column-grid-lines" aria-hidden="true">
                        <div></div><div></div><div></div><div></div><div></div><div></div>
                    </div>
                    <canvas id="slot-pixi-canvas" style="width:100%; height:100%; display:block; border-radius:10px;"></canvas>
                    <div id="slot-dom-fallback" style="display:none; grid-template-columns:repeat(6,1fr); gap:0.35rem; width:100%; height:100%; padding:0.5rem; position:relative; z-index:1;">
                        ${this.getFallbackReelsHTML(cfg.initialSymbol)}
                    </div>
                </div>

                <div id="slot-win-display" class="slot-win-strip" ${cfg.winStripStyle ? `style="${cfg.winStripStyle}"` : ''}>
                    <span class="idle-text">${cfg.initialBannerText || this.idleStatusText}</span>
                </div>

                <div class="slot-control-bar" ${cfg.controlBarStyle ? `style="${cfg.controlBarStyle}"` : ''}>
                    <div class="hud-item hud-balance">
                        <span class="hud-label">SALDO</span>
                        <div class="hud-val-box">
                            <span id="slot-player-balance" class="hud-num">0</span>
                            <span class="hud-unit" ${accentStyle}>TC</span>
                        </div>
                    </div>
                    <div class="hud-item hud-bet">
                        <span class="hud-label">TARUHAN</span>
                        <div class="bet-stepper">
                            <button type="button" id="btn-bet-minus" class="stepper-btn" ${accentStyle} title="Kurangi Bet">−</button>
                            <input type="text" id="slot-bet-input" class="bet-input" value="100,000" readonly>
                            <button type="button" id="btn-bet-plus" class="stepper-btn" ${accentStyle} title="Tambah Bet">+</button>
                        </div>
                    </div>
                    <div class="hud-spin-wrapper">
                        <button type="button" id="btn-slot-spin" class="btn-spin-giant" ${cfg.spinBtnStyle ? `style="${cfg.spinBtnStyle}"` : ''} title="Mulai Putaran">
                            <span class="spin-icon">${this.spinIcon}</span>
                            <span class="spin-text">SPIN</span>
                        </button>
                    </div>
                    <button type="button" id="btn-slot-auto" class="btn-hud-action" title="Putaran Otomatis (25x)">
                        <span class="action-icon">🤖</span>
                        <span id="slot-auto-text" class="action-text">AUTO</span>
                    </button>
                    <button type="button" id="btn-slot-max" class="btn-hud-action btn-hud-max" ${cfg.maxBtnStyle ? `style="${cfg.maxBtnStyle}"` : ''} title="Taruhan Maksimal">
                        <span class="action-icon">🚀</span>
                        <span class="action-text">MAX</span>
                    </button>
                    <button type="button" id="btn-slot-speedup" class="btn-hud-action" title="Mode Cepat (Turbo)">
                        <span class="action-icon">⚡</span>
                        <span id="slot-speedup-text" class="action-text">TURBO</span>
                    </button>
                    <button type="button" id="btn-slot-info" class="btn-hud-action" title="Lihat Tabel Bayaran">
                        <span class="action-icon">ℹ️</span>
                        <span class="action-text">INFO</span>
                    </button>
                </div>
            </div>

            <div id="slot-paytable-modal" class="paytable-overlay">
                <div class="paytable-dialog" ${cfg.paytableDialogStyle ? `style="${cfg.paytableDialogStyle}"` : ''}>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid ${cfg.paytableBorderColor || 'rgba(251,191,36,0.3)'}; padding-bottom:0.5rem;">
                        <h4 style="margin:0; font-weight:900; color:${cfg.accentColor || '#fbbf24'}; font-size:1.1rem; display:flex; align-items:center; gap:0.4rem;">
                            ℹ️ ${cfg.paytableTitle || 'TABEL BAYARAN'}
                        </h4>
                        <button type="button" id="btn-close-paytable" style="background:none; border:none; color:#fff; font-size:1.5rem; cursor:pointer; line-height:1;">&times;</button>
                    </div>
                    <div style="max-height:55vh; overflow-y:auto; padding-right:0.25rem;">
                        <p style="font-size:0.75rem; color:rgba(255,255,255,0.7); margin-bottom:0.75rem; text-align:left;">
                            ${cfg.paytableDesc || ''}
                        </p>
                        <div style="display:grid; grid-template-columns:${cfg.paytableCols || '1fr 1fr'}; gap:0.4rem;">
                            ${cfg.paytableRowsHTML || ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <style>
            @keyframes lightBlink { to { opacity: 0.2; } }
            @keyframes slotSpin { 0% { transform: translateY(0); } 100% { transform: translateY(-200%); } }
            @keyframes winPulse { 0%, 100% { text-shadow: 0 0 8px currentColor; } 50% { text-shadow: 0 0 24px currentColor, 0 0 48px currentColor; } }
            @keyframes jackpotFlash { ${jackpotFlash} }
            @keyframes rateGlow {
                from { box-shadow: 0 0 4px rgba(239,68,68,0.4), 0 0 10px rgba(251,191,36,0.2); transform: scale(1); }
                to { box-shadow: 0 0 12px rgba(239,68,68,0.8), 0 0 20px rgba(251,191,36,0.6); transform: scale(1.03); }
            }
            @keyframes shake {
                0%, 100% { transform: translate(0, 0) rotate(0deg); }
                20% { transform: translate(-2px, 1px) rotate(-0.5deg); }
                40% { transform: translate(2px, -1px) rotate(0.5deg); }
                60% { transform: translate(-1px, 2px) rotate(-0.5deg); }
                80% { transform: translate(1px, -1px) rotate(0.5deg); }
            }
            .shake-anim { animation: shake 0.5s ease-in-out; }
            @keyframes praiseBounce {
                0% { transform: translate(-50%, -50%) scale(0) rotate(-10deg); opacity: 0; }
                30% { transform: translate(-50%, -50%) scale(1.25) rotate(5deg); opacity: 1; }
                40% { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
                80% { opacity: 1; transform: translate(-50%, -65%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -80%) scale(0.7); }
            }
            .winning-symbol {
                background: ${winBg} !important;
                border: 2px solid ${winBorder} !important;
                border-radius: 6px;
                animation: pulseSymbol 0.5s ease-in-out infinite alternate;
            }
            @keyframes pulseSymbol { 0% { transform: scale(1); } 100% { transform: scale(1.08); } }
        </style>
        `;
    }

    bindEvents(container, onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;

        const canvas = container.querySelector('#slot-pixi-canvas');
        const fallback = container.querySelector('#slot-dom-fallback');
        if (canvas && typeof window !== 'undefined' && window.PIXI) {
            try {
                this.pixiStage?.destroy();
                this.pixiStage = new PixiSlotStage(canvas, {
                    cols: this.cols,
                    rows: this.rows,
                    symbols: this.symbols,
                    themeColor: this.pixiThemeColor,
                    getSymbolSvg: (item) => this.renderSymbolSVG(item)
                });
                this.pixiStage.preloadTextures().then(() => this.pixiStage?.setGrid(this.grid));
                this.pixiStage.setGrid(this.grid);
                canvas.style.display = 'block';
                if (fallback) fallback.style.display = 'none';
            } catch (err) {
                console.warn(`[${this.constructor.name}] PixiJS WebGL init failed, using DOM fallback:`, err);
                if (canvas) canvas.style.display = 'none';
                if (fallback) fallback.style.display = 'grid';
            }
        } else {
            if (canvas) canvas.style.display = 'none';
            if (fallback) fallback.style.display = 'grid';
        }

        const balEl = container.querySelector('#slot-player-balance');
        if (balEl) balEl.textContent = financeManager.formatCurrency(gameState.getBalance());
        const headerRate = document.getElementById('header-rate-badge-container');
        if (headerRate) headerRate.innerHTML = this.getRateStatusHTML();

        const getCurrentBet = () => {
            const input = container.querySelector('#slot-bet-input');
            return input ? (parseInt(input.value.replace(/,/g, ''), 10) || 100000) : 100000;
        };

        const setBet = (val) => {
            const input = container.querySelector('#slot-bet-input');
            if (input) input.value = Math.max(10000, Math.min(val, 50000000)).toLocaleString('en-US');
        };

        container.querySelector('#btn-bet-minus')?.addEventListener('click', () => {
            mobileHandler.hapticTap();
            const curr = getCurrentBet();
            setBet([...DEFAULT_BET_TIERS].reverse().find(t => t < curr) || DEFAULT_BET_TIERS[0]);
        });

        container.querySelector('#btn-bet-plus')?.addEventListener('click', () => {
            mobileHandler.hapticTap();
            const curr = getCurrentBet();
            setBet(DEFAULT_BET_TIERS.find(t => t > curr) || DEFAULT_BET_TIERS[DEFAULT_BET_TIERS.length - 1]);
        });

        container.querySelector('#btn-slot-max')?.addEventListener('click', () => {
            mobileHandler.hapticTap();
            const balance = gameState.getBalance();
            setBet(DEFAULT_BET_TIERS.slice().reverse().find(t => t <= balance) || DEFAULT_BET_TIERS[0]);
        });

        container.querySelector('#slot-bet-input')?.addEventListener('click', () => {
            if (mobileHandler.isMobile) {
                mobileHandler.openQuickBetSheet({
                    currentBet: getCurrentBet(),
                    betTiers: DEFAULT_BET_TIERS,
                    onSelectBet: (val) => setBet(val),
                    onMaxBet: () => container.querySelector('#btn-slot-max')?.click()
                });
            }
        });

        const windowTheater = container.querySelector('.slot-window-theater');
        if (windowTheater) {
            mobileHandler.bindReelSwipe(windowTheater, () => {
                if (!this.isSpinning) {
                    this.stopAutoSpin();
                    this.spin();
                }
            });
        }

        container.querySelector('#btn-slot-spin')?.addEventListener('click', () => {
            this.stopAutoSpin();
            this.spin();
        });

        container.querySelector('#btn-slot-auto')?.addEventListener('click', () => {
            if (this.isAutoSpinning) {
                this.stopAutoSpin();
            } else {
                mobileHandler.openAutoSpinSheet({
                    currentCount: (this.autoSpinCount && this.autoSpinCount > 0) ? this.autoSpinCount : 25,
                    isSpeedUp: this.isSpeedUp,
                    onStartAutoSpin: ({ count, turbo }) => {
                        if (turbo !== undefined) {
                            this.isSpeedUp = turbo;
                            const speedupBtn = document.getElementById('btn-slot-speedup');
                            if (speedupBtn) {
                                speedupBtn.style.background = this.isSpeedUp ? this.turboAccentColor : '';
                                speedupBtn.style.borderColor = this.isSpeedUp ? this.turboAccentColor : '';
                                speedupBtn.style.color = this.isSpeedUp ? this.turboTextColor : '';
                            }
                        }
                        this.startAutoSpin(count);
                    }
                });
            }
        });

        const speedupBtn = container.querySelector('#btn-slot-speedup');
        if (speedupBtn) {
            const updateSpeedupUI = () => {
                speedupBtn.style.background = this.isSpeedUp ? this.turboAccentColor : '';
                speedupBtn.style.borderColor = this.isSpeedUp ? this.turboAccentColor : '';
                speedupBtn.style.color = this.isSpeedUp ? this.turboTextColor : '';
            };
            updateSpeedupUI();
            speedupBtn.addEventListener('click', () => {
                this.isSpeedUp = !this.isSpeedUp;
                updateSpeedupUI();
                ui.toast({
                    type: 'info',
                    title: this.isSpeedUp ? 'Turbo Mode Aktif ⚡' : 'Mode Normal 🐢',
                    message: this.isSpeedUp ? 'Putaran slot berlangsung lebih cepat!' : 'Putaran slot kembali normal.'
                });
            });
        }

        const infoBtn = container.querySelector('#btn-slot-info');
        const modal = container.querySelector('#slot-paytable-modal');
        const closeBtn = container.querySelector('#btn-close-paytable');
        infoBtn?.addEventListener('click', () => modal?.classList.add('open'));
        closeBtn?.addEventListener('click', () => modal?.classList.remove('open'));
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('open');
        });
    }

    startAutoSpin(count = 25) {
        if (this._autoSpinTimer) {
            clearTimeout(this._autoSpinTimer);
            this._autoSpinTimer = null;
        }
        this.autoSpinCount = count;
        this.isAutoSpinning = true;
        mobileHandler.requestWakeLock('auto-spin');
        if (mobileHandler.isMobile) {
            ui.info('Auto-Spin aktif. Layar HP akan tetap terjaga sampai putaran selesai.', '📱 Layar Tetap Aktif');
        }

        const autoBtn = document.getElementById('btn-slot-auto');
        const autoText = document.getElementById('slot-auto-text');
        if (autoBtn) {
            autoBtn.style.background = 'rgba(239, 68, 68, 0.25)';
            autoBtn.style.borderColor = '#ef4444';
            autoBtn.style.color = '#ef4444';
        }
        if (autoText) {
            autoText.textContent = (count === Infinity || count >= 999999) ? 'STOP (∞)' : `STOP (${this.autoSpinCount})`;
        }
        this.spin();
    }

    stopAutoSpin() {
        if (this._autoSpinTimer) {
            clearTimeout(this._autoSpinTimer);
            this._autoSpinTimer = null;
        }
        this.isAutoSpinning = false;
        this.autoSpinCount = 0;
        if (!this.isSpinning) mobileHandler.releaseWakeLock();

        const autoBtn = document.getElementById('btn-slot-auto');
        const autoText = document.getElementById('slot-auto-text');
        if (autoBtn) {
            autoBtn.style.background = '';
            autoBtn.style.borderColor = '';
            autoBtn.style.color = '';
        }
        if (autoText) autoText.textContent = 'AUTO';
    }

    pickWeightedSymbol(symbolPool, luck, betAmount = 0) {
        const pool = symbolPool || this.symbols;
        const weights = pool.map(s => {
            let w = s.baseWeight * (s.multiplier3x >= 20 ? luck : 1);
            if (s.multiplier3x >= 20) {
                if (betAmount >= 50000000) w *= 0.01;
                else if (betAmount >= 10000000) w *= 0.05;
                else if (betAmount >= 5000000) w *= 0.15;
                else if (betAmount >= 1000000) w *= 0.4;
                else if (betAmount >= 100000) w *= 0.8;
                if (betAmount <= 10000) w *= 2.0;
                else if (betAmount <= 50000) w *= 1.5;
            } else {
                if (betAmount >= 10000000) w *= 1.5;
                if (betAmount <= 10000) w *= 0.6;
                else if (betAmount <= 50000) w *= 0.8;
            }
            return w;
        });
        const total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < pool.length; i++) {
            if (r < weights[i]) return pool[i];
            r -= weights[i];
        }
        return pool[pool.length - 1];
    }

    weightedRandom(luck, betAmount = 0) {
        return this.pickWeightedSymbol(this.symbols, luck, betAmount);
    }

    startParticleLoop() { this.particleSystem.startLoop(); }
    spawnParticles(count, type) { this.particleSystem.spawn(count, type); }

    shakeCabinet() {
        const cabinet = document.querySelector('.slot-cabinet-theater') || document.querySelector('.slot-cabinet');
        if (cabinet) {
            cabinet.classList.add('shake-anim');
            setTimeout(() => cabinet.classList.remove('shake-anim'), 600);
        }
    }

    spawnPraiseText(text) {
        const cabinet = document.querySelector('.slot-cabinet-theater') || document.querySelector('.slot-cabinet');
        if (!cabinet) return;
        const div = document.createElement('div');
        div.textContent = text;
        Object.assign(div.style, {
            position: 'absolute', left: '50%', top: '45%', transform: 'translate(-50%, -50%)',
            fontSize: '2.5rem', fontWeight: '900', color: this.praiseStyle.color,
            webkitTextStroke: this.praiseStyle.stroke, textShadow: this.praiseStyle.shadow,
            pointerEvents: 'none', zIndex: '20',
            animation: 'praiseBounce 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
        });
        cabinet.appendChild(div);
        setTimeout(() => div.remove(), 1000);
    }

    async _animateReel(colIdx, finalItems, delay) {
        return new Promise(resolve => {
            const applyFinal = (withPop = false) => {
                for (let r = 0; r < this.rows; r++) {
                    const el = document.getElementById(`slot-reel-${colIdx}-${r}`);
                    if (el) {
                        el.innerHTML = this.renderSymbolSVG(finalItems[r]);
                        el.style.filter = 'none';
                        if (withPop) {
                            el.style.transform = 'scale(1.08)';
                            setTimeout(() => { el.style.transform = 'scale(1)'; }, this.isSpeedUp ? 50 : 150);
                        }
                    }
                }
            };

            if (this.skipRequested) {
                applyFinal(false);
                resolve();
                return;
            }

            let ticks = 0;
            const baseTicks = 10 + delay * 3;
            const maxTicks = this.isSpeedUp ? Math.max(3, Math.floor(baseTicks / 2)) : baseTicks;
            const interval = setInterval(() => {
                if (this.skipRequested) {
                    clearInterval(interval);
                    applyFinal(false);
                    resolve();
                    return;
                }
                for (let r = 0; r < this.rows; r++) {
                    const el = document.getElementById(`slot-reel-${colIdx}-${r}`);
                    if (el) {
                        const rndSym = this.symbols[Math.floor(Math.random() * this.symbols.length)].emoji;
                        el.innerHTML = this.renderSymbolSVG(rndSym);
                        el.style.filter = 'blur(1px)';
                    }
                }
                if (++ticks >= maxTicks) {
                    clearInterval(interval);
                    applyFinal(true);
                    resolve();
                }
            }, this.isSpeedUp ? 20 : 70);
        });
    }

    async _runReelsAnimation(resultMatrix) {
        if (this.pixiStage) {
            await this.pixiStage.spin(resultMatrix, { isSpeedUp: this.isSpeedUp, skipRequested: this.skipRequested });
        } else {
            for (let col = 0; col < this.cols; col++) {
                if (this.skipRequested) {
                    for (let c = col; c < this.cols; c++) {
                        for (let r = 0; r < this.rows; r++) {
                            const el = document.getElementById(`slot-reel-${c}-${r}`);
                            if (el) {
                                el.innerHTML = this.renderSymbolSVG(resultMatrix[c][r]);
                                el.style.filter = 'none';
                            }
                        }
                    }
                    break;
                }
                await this._animateReel(col, resultMatrix[col], col);
                if (!this.skipRequested) await new Promise(r => setTimeout(r, this.isSpeedUp ? 25 : 100));
            }
        }
    }

    _onSpinStart() {}

    _generateSpinGrid(luck, betAmount) {
        return Array.from({ length: this.cols }, (_, col) =>
            Array.from({ length: this.rows }, () => this.weightedRandom(luck, betAmount, col).emoji)
        );
    }

    async spin() {
        if (this.isSpinning) return;
        document.querySelectorAll('.slot-symbol-block').forEach(el => el.classList.remove('winning-symbol'));

        const input = document.getElementById('slot-bet-input');
        const betAmount = input?.getNumericValue ? input.getNumericValue() : (parseInt(input?.value.replace(/,/g, '') || '0', 10));
        if (betAmount <= 0) { ui.error('Masukkan jumlah taruhan yang valid!'); this.stopAutoSpin(); return; }
        const balance = gameState.getBalance();
        if (betAmount > balance) { ui.error('Saldo tidak mencukupi!'); this.stopAutoSpin(); return; }

        this.isSpinning = true;
        this.skipRequested = false;
        mobileHandler.requestWakeLock('spin');
        mobileHandler.hapticSpin();
        AuraSound.playCasinoSpin();

        const skipBtn = document.getElementById('btn-slot-skip');
        if (skipBtn) {
            skipBtn.disabled = false;
            skipBtn.style.color = '#a855f7';
            skipBtn.style.borderColor = 'rgba(168,85,247,0.6)';
            skipBtn.style.background = 'rgba(168,85,247,0.15)';
        }

        const spinBtn = document.getElementById('btn-slot-spin');
        if (spinBtn) {
            spinBtn.disabled = true;
            spinBtn.innerHTML = `<span class="spin-icon" style="animation:spin 0.5s linear infinite;display:inline-block;">${this.spinIcon}</span> <span class="spin-text">${this.spinActiveText}</span>`;
        }

        const winDisplay = document.getElementById('slot-win-display');
        if (winDisplay) winDisplay.innerHTML = `<span class="idle-text">${this.spinningStatusText}</span>`;
        this._onSpinStart();

        financeManager.addExpense(betAmount, 'Lainnya', this.expenseLabel);
        const balEl = document.getElementById('slot-player-balance');
        if (balEl) balEl.textContent = financeManager.formatCurrency(gameState.getBalance());
        this.onBalanceRefresh?.();

        const luckInfo = casinoVolatility.getLuckInfo();
        const luck = luckInfo.multiplier;
        const rateOn = luckInfo.isRateOn;
        const evalResult = casinoVolatility.evaluateSpin(betAmount, balance, luck);
        this.currentNearMiss = evalResult.isNearMiss;

        this.grid = this._generateSpinGrid(luck, betAmount, evalResult);
        await this._runReelsAnimation(this.grid);
        await this._processTumbleSequence(betAmount, luck, evalResult, rateOn);

        this.isSpinning = false;
        if (!this.isAutoSpinning) mobileHandler.releaseWakeLock();
        if (spinBtn) {
            spinBtn.disabled = false;
            spinBtn.innerHTML = `<span class="spin-icon">${this.spinIcon}</span> <span class="spin-text">SPIN</span>`;
        }
        if (skipBtn) {
            skipBtn.disabled = true;
            skipBtn.style.color = 'rgba(255,255,255,0.4)';
            skipBtn.style.borderColor = 'rgba(168,85,247,0.2)';
            skipBtn.style.background = 'rgba(168,85,247,0.05)';
        }

        if (this.isAutoSpinning) {
            const hasMore = (this.autoSpinCount === Infinity || this.autoSpinCount >= 999999 || this.autoSpinCount > 1);
            if (hasMore) {
                if (this.autoSpinCount !== Infinity && this.autoSpinCount < 999999) this.autoSpinCount--;
                const autoText = document.getElementById('slot-auto-text');
                if (autoText) {
                    autoText.textContent = (this.autoSpinCount === Infinity || this.autoSpinCount >= 999999) ? 'STOP (∞)' : `STOP (${this.autoSpinCount})`;
                }
                this._autoSpinTimer = setTimeout(() => { if (this.isAutoSpinning) this.spin(); }, this.isSpeedUp ? 600 : 1500);
            } else {
                this.stopAutoSpin();
            }
        }
        this.refreshRateBadges();
    }

    refreshRateBadges() {
        const html = this.getRateStatusHTML();
        [this.rateContainerId, 'slot-rate-badge-container', 'header-rate-badge-container'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = html;
        });
    }

    calcLineMultiplier(baseMultiplier3x, matchLength) {
        if (matchLength === 4) return Math.round(baseMultiplier3x * 2.5);
        if (matchLength === 5) return Math.round(baseMultiplier3x * 6);
        if (matchLength >= 6) return Math.round(baseMultiplier3x * 15);
        return baseMultiplier3x;
    }

    _highlightWinningCells(winningLines, winningCoords) {
        if (this.pixiStage && winningLines.length > 0) this.pixiStage.highlightWins(winningLines, winningCoords);
        winningCoords.forEach(({ col, row }) => document.getElementById(`slot-reel-${col}-${row}`)?.classList.add('winning-symbol'));
    }

    _buildTumbledGrid(winningCoords, spawnNewCellFn, onWinningCellTransformFn = null) {
        const newGrid = [];
        for (let col = 0; col < this.cols; col++) {
            const surviving = [];
            for (let row = this.rows - 1; row >= 0; row--) {
                const currentCell = this.grid[col][row];
                const isWinning = winningCoords.some(c => c.col === col && c.row === row);
                if (isWinning) {
                    const transformed = onWinningCellTransformFn?.(currentCell, col, row);
                    if (transformed !== null && transformed !== undefined) surviving.unshift(transformed);
                } else {
                    surviving.unshift(currentCell);
                }
            }
            const needed = this.rows - surviving.length;
            const newSymbols = Array.from({ length: needed }, (_, i) => spawnNewCellFn(col, i));
            newGrid.push([...newSymbols, ...surviving]);
        }
        return newGrid;
    }

    async _animateCascadeDrop(winningCoords, newGrid) {
        mobileHandler.hapticTumble();
        if (this.pixiStage) {
            await this.pixiStage.animateCascade(winningCoords, newGrid, { isSpeedUp: this.isSpeedUp });
        } else {
            for (let col = 0; col < this.cols; col++) {
                for (let row = 0; row < this.rows; row++) {
                    const el = document.getElementById(`slot-reel-${col}-${row}`);
                    if (el) {
                        el.innerHTML = this.renderSymbolSVG(newGrid[col][row]);
                        el.classList.remove('winning-symbol');
                    }
                }
            }
            AuraSound.playCascadePop();
            AuraSound.playTumbleDrop();
            await new Promise(r => setTimeout(r, this.isSpeedUp ? 150 : 300));
        }
    }

    _finalizeSpinOutcome({ betAmount, finalPayout, winDisplay, incomeDescription, extraEvents = [], praiseText = 'STRIKE! 🪙', winSummaryHTML = '' }) {
        if (finalPayout > 0) {
            financeManager.addIncome(finalPayout, 'Investasi', incomeDescription);
            gameState.emit('action:slotWin', { gameId: this.gameId, winAmount: finalPayout, betAmount });
            extraEvents.forEach(evt => gameState.emit(evt));

            const balEl = document.getElementById('slot-player-balance');
            if (balEl) balEl.textContent = financeManager.formatCurrency(gameState.getBalance());
            this.onBalanceRefresh?.();

            if (finalPayout >= betAmount * 5) gameState.set('casino.ratePlays', 0);

            if (finalPayout >= betAmount * 15) {
                mobileHandler.hapticBigWin();
                this.shakeCabinet();
                pixiEffects.celebrateWin({ amount: finalPayout, bet: betAmount, onComplete: () => this.onBalanceRefresh?.() });
            } else {
                mobileHandler.hapticWin();
                pixiEffects.flyChipsToHeader(winDisplay, 10);
                this.spawnPraiseText(praiseText);
                this.spawnParticles(20, 'gold');
                AuraSound.playClaimMoney();
            }

            if (winDisplay && winSummaryHTML) winDisplay.innerHTML = winSummaryHTML;
        } else {
            if (this.currentNearMiss) AuraSound.playNearMiss();
            else AuraSound.playCasinoLose();
            if (winDisplay) winDisplay.innerHTML = `<span class="idle-text">${this.idleStatusText}</span>`;
        }

        casinoVolatility.recordOutcome(betAmount, finalPayout);
        this.refreshRateBadges();
    }
}

export default BaseSlotEngine;
