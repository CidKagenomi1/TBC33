/**
 * SlotEngine.js - Premium Gold Digger 6x3 Multi-Line Slot Engine
 * Handles 6 columns x 3 rows grid mechanics, 5 payline checking,
 * cascading visual animations, canvas particle effects, and auto spin.
 * Mobile responsive optimized (preventing vertical scrolling).
 */

import financeManager from '../finance/FinanceManager.js';
import gameState from '../core/GameState.js';
import ui from '../ui/UIManager.js';
import { getSlotSVG } from './SlotIcons.js';
import PixiSlotStage from '../graphics/PixiSlotStage.js';
import pixiEffects from '../graphics/PixiEffects.js';
import AuraSound from '../ui/AuraSound.js';
import mobileHandler from '../ui/MobileHandler.js';
import casinoVolatility from './CasinoVolatilityEngine.js';

const SYMBOLS = [
    { emoji: '💎', name: 'Berlian Mulia',  baseWeight: 4,  multiplier3x: 50, multiplier2x: 0 },
    { emoji: '💰', name: 'Kantung Emas',   baseWeight: 8,  multiplier3x: 25, multiplier2x: 0 },
    { emoji: '🪙', name: 'Koin Emas',      baseWeight: 12, multiplier3x: 7,  multiplier2x: 0 },
    { emoji: '⛏️', name: 'Beliung Tambang',baseWeight: 18, multiplier3x: 5,  multiplier2x: 0 },
    { emoji: '🧨', name: 'Dinamit',        baseWeight: 25, multiplier3x: 3,  multiplier2x: 0 },
    { emoji: '🪨', name: 'Batu Bara',      baseWeight: 32, multiplier3x: 1,  multiplier2x: 0 },
];

const PAYLINES = [
    { name: 'Line 1 (Top Horizontal)', coordinates: [0, 0, 0, 0, 0, 0], color: '#3b82f6' },
    { name: 'Line 2 (Middle Horizontal)', coordinates: [1, 1, 1, 1, 1, 1], color: '#ec4899' },
    { name: 'Line 3 (Bottom Horizontal)', coordinates: [2, 2, 2, 2, 2, 2], color: '#10b981' },
    { name: 'Line 4 (V-Shape)', coordinates: [0, 1, 2, 2, 1, 0], color: '#fbbf24' },
    { name: 'Line 5 (Inverted V-Shape)', coordinates: [2, 1, 0, 0, 1, 2], color: '#a855f7' }
];

class GoldParticle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'gold', 'diamond', 'spark', 'dust'
        this.vx = (Math.random() - 0.5) * 12;
        this.vy = (Math.random() - 0.5) * 12 - 6; // upward bias
        this.alpha = 1;
        this.size = Math.random() * 8 + 4;
        this.gravity = 0.35;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = (Math.random() - 0.5) * 15;
        
        if (type === 'gold') {
            this.color = '#fbbf24';
        } else if (type === 'diamond') {
            this.color = '#a5f3fc';
        } else if (type === 'spark') {
            this.color = '#f97316';
        } else {
            this.color = '#78716c'; // dust
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.alpha -= 0.025;
        this.rotation += this.rotationSpeed;
    }
}

export class SlotEngine {
    constructor(onBalanceRefresh) {
        this.isSpinning = false;
        this.onBalanceRefresh = onBalanceRefresh;
        this.particles = [];
        this.particleLoopActive = false;
        this.autoSpinCount = 0;
        this.isAutoSpinning = false;
        this.isSpeedUp = false;
        this.skipRequested = false;
        this.pixiStage = null;
        // Matrix 6x3
        this.grid = Array.from({length: 6}, () => ['🪨', '🪨', '🪨']);
    }

    getRateStatusHTML() {
        const plays = gameState.get('casino.ratePlays') || 0;
        const rateOn = plays >= 250;
        return rateOn 
            ? `<div class="rate-badge rate-on-badge" style="display:inline-flex; align-items:center; gap:0.25rem; background:linear-gradient(135deg,#ef4444,#fbbf24); color:#fff; font-weight:900; font-size:0.72rem; padding:0.2rem 0.6rem; border-radius:999px; box-shadow:0 0 10px rgba(239,68,68,0.5); animation: rateGlow 1s ease-in-out infinite alternate; text-transform:uppercase; letter-spacing:0.05em; border: 1.5px solid #fff;">⚡ RATE ON</div>`
            : `<div class="rate-badge rate-off-badge" style="display:inline-flex; align-items:center; gap:0.25rem; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:rgba(255,255,255,0.65); font-weight:800; font-size:0.68rem; padding:0.18rem 0.5rem; border-radius:999px; text-transform:uppercase; letter-spacing:0.05em;">Rate: OFF (${plays}/250)</div>`;
    }

    getHTML() {
        // Render 6 columns, each having 3 rows
        let colsHTML = '';
        for (let col = 0; col < 6; col++) {
            colsHTML += `
                <div class="slot-reel-wrap">
                    <div id="slot-reel-${col}-0" class="slot-symbol-block">${getSlotSVG('🪨')}</div>
                    <div id="slot-reel-${col}-1" class="slot-symbol-block">${getSlotSVG('🪨')}</div>
                    <div id="slot-reel-${col}-2" class="slot-symbol-block">${getSlotSVG('🪨')}</div>
                </div>
            `;
        }

        return `
        <div class="slot-theater" style="max-width: 900px; margin: 0 auto; text-align: center;">
            <!-- Unified Arcade Cabinet (Chassis tightly enclosing lights, reel chamber, and bottom control deck) -->
            <div class="slot-cabinet-theater">
                <!-- Particle overlay canvas -->
                <canvas id="slot-particle-canvas" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:10;"></canvas>

                <!-- Top lights row (Industrial Gold Marquee) -->
                <div style="display:flex; justify-content:center; gap:0.4rem; margin-bottom:0.35rem;">
                    ${Array.from({length:11}, (_,i) => `<div class="slot-light" style="width:7px;height:7px;border-radius:50%;background:${i%2===0?'#fbbf24':'#f97316'};box-shadow:0 0 6px ${i%2===0?'#fbbf24':'#f97316'};animation:lightBlink ${0.5+i*0.1}s ease-in-out infinite alternate;"></div>`).join('')}
                </div>

                <!-- Reels Window Theater (Recessed optical glass cylinder) -->
                <div class="slot-window-theater">
                    <div class="slot-column-grid-lines" aria-hidden="true">
                        <div></div><div></div><div></div><div></div><div></div><div></div>
                    </div>
                    <!-- WebGL PixiJS Canvas Stage -->
                    <canvas id="slot-pixi-canvas" style="width:100%; height:100%; display:block; border-radius:10px;"></canvas>

                    <!-- DOM Fallback Grid (if WebGL disabled) -->
                    <div id="slot-dom-fallback" style="display:none; grid-template-columns:repeat(6,1fr); gap:0.35rem; width:100%; height:100%; padding:0.5rem; position:relative; z-index:1;">
                        ${colsHTML}
                    </div>
                </div>

                <!-- Win Display Strip -->
                <div id="slot-win-display" class="slot-win-strip">
                    <span class="idle-text">TEKAN SPIN UNTUK MENGGALI EMAS</span>
                </div>

                <!-- Directly Docked Bottom Control Deck inside Cabinet -->
                <div class="slot-control-bar">
                    <!-- Saldo TC -->
                    <div class="hud-item hud-balance">
                        <span class="hud-label">SALDO</span>
                        <div class="hud-val-box">
                            <span id="slot-player-balance" class="hud-num">0</span>
                            <span class="hud-unit">TC</span>
                        </div>
                    </div>

                    <!-- Nilai Bet (- / +) -->
                    <div class="hud-item hud-bet">
                        <span class="hud-label">TARUHAN</span>
                        <div class="bet-stepper">
                            <button type="button" id="btn-bet-minus" class="stepper-btn" title="Kurangi Bet">−</button>
                            <input type="text" id="slot-bet-input" class="bet-input" value="100,000" readonly>
                            <button type="button" id="btn-bet-plus" class="stepper-btn" title="Tambah Bet">+</button>
                        </div>
                    </div>

                    <!-- TOMBOL SPIN BESAR (Pemeran Utama Kontrol) -->
                    <div class="hud-spin-wrapper">
                        <button type="button" id="btn-slot-spin" class="btn-spin-giant" title="Mulai Putaran">
                            <span class="spin-icon">⛏️</span>
                            <span class="spin-text">SPIN</span>
                        </button>
                    </div>

                    <!-- Auto Spin Button -->
                    <button type="button" id="btn-slot-auto" class="btn-hud-action" title="Putaran Otomatis (25x)">
                        <span class="action-icon">🤖</span>
                        <span id="slot-auto-text" class="action-text">AUTO</span>
                    </button>

                    <!-- Max Bet Button -->
                    <button type="button" id="btn-slot-max" class="btn-hud-action btn-hud-max" title="Taruhan Maksimal">
                        <span class="action-icon">🚀</span>
                        <span class="action-text">MAX</span>
                    </button>

                    <!-- Speed Up / Turbo Button -->
                    <button type="button" id="btn-slot-speedup" class="btn-hud-action" title="Mode Cepat (Turbo)">
                        <span class="action-icon">⚡</span>
                        <span id="slot-speedup-text" class="action-text">TURBO</span>
                    </button>

                    <!-- Info / Paytable Button -->
                    <button type="button" id="btn-slot-info" class="btn-hud-action" title="Lihat Tabel Bayaran">
                        <span class="action-icon">ℹ️</span>
                        <span class="action-text">INFO</span>
                    </button>
                </div>
            </div>

            <!-- Paytable Overlay Modal -->
            <div id="slot-paytable-modal" class="paytable-overlay">
                <div class="paytable-dialog">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid rgba(251,191,36,0.3); padding-bottom:0.5rem;">
                        <h4 style="margin:0; font-weight:900; color:#fbbf24; font-size:1.1rem; display:flex; align-items:center; gap:0.4rem;">
                            ℹ️ TABEL BAYARAN GOLDY CRUSH
                        </h4>
                        <button type="button" id="btn-close-paytable" style="background:none; border:none; color:#fff; font-size:1.5rem; cursor:pointer; line-height:1;">&times;</button>
                    </div>
                    <div style="max-height:55vh; overflow-y:auto; padding-right:0.25rem;">
                        <p style="font-size:0.75rem; color:rgba(255,255,255,0.7); margin-bottom:0.75rem; text-align:left;">
                            6 Kolom, 3 Baris &amp; 5 Garis Payout. Simbol cocok dihitung dari kiri ke kanan.
                        </p>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.4rem;">
                            ${SYMBOLS.map(s => `
                            <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); padding:0.45rem 0.6rem; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size:0.8rem; font-weight:700;">${s.emoji} ${s.name}</span>
                                <span style="color:#fbbf24; font-weight:800; font-size:0.75rem;">${s.multiplier3x}×</span>
                            </div>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <style>
            @keyframes lightBlink { to { opacity: 0.2; } }
            @keyframes slotSpin {
                0% { transform: translateY(0); }
                100% { transform: translateY(-200%); }
            }
            @keyframes winPulse {
                0%, 100% { text-shadow: 0 0 8px currentColor; }
                50% { text-shadow: 0 0 24px currentColor, 0 0 48px currentColor; }
            }
            @keyframes jackpotFlash {
                0%, 100% { background: linear-gradient(135deg,#fbbf24 0%,#d97706 100%); }
                50% { background: linear-gradient(135deg,#f43f5e 0%,#e11d48 100%); }
            }
            @keyframes rateGlow {
                from { box-shadow: 0 0 4px rgba(239,68,68,0.4), 0 0 10px rgba(251,191,36,0.2); transform: scale(1); }
                to { box-shadow: 0 0 12px rgba(239,68,68,0.8), 0 0 20px rgba(251,191,36,0.6); transform: scale(1.03); }
            }
            
            /* Shake & Praise Animation styles */
            @keyframes shake {
                0%, 100% { transform: translate(0, 0) rotate(0deg); }
                10% { transform: translate(-2px, 1px) rotate(-0.5deg); }
                20% { transform: translate(1px, -2px) rotate(0.5deg); }
                30% { transform: translate(-1px, 1px) rotate(0deg); }
                40% { transform: translate(2px, 1px) rotate(0.5deg); }
                50% { transform: translate(-1px, -1px) rotate(-0.5deg); }
                60% { transform: translate(1px, 2px) rotate(0deg); }
                70% { transform: translate(-2px, 1px) rotate(0.5deg); }
                80% { transform: translate(1px, -1px) rotate(-0.5deg); }
                90% { transform: translate(-1px, 2px) rotate(0deg); }
            }
            .shake-anim {
                animation: shake 0.5s ease-in-out;
            }

            @keyframes praiseBounce {
                0% { transform: translate(-50%, -50%) scale(0) rotate(-10deg); opacity: 0; }
                30% { transform: translate(-50%, -50%) scale(1.25) rotate(5deg); opacity: 1; }
                40% { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
                80% { opacity: 1; transform: translate(-50%, -65%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -80%) scale(0.7); }
            }

            .winning-symbol {
                background: rgba(251,191,36,0.2) !important;
                border: 2px solid #fbbf24 !important;
                border-radius: 6px;
                animation: pulseSymbol 0.5s ease-in-out infinite alternate;
            }
            @keyframes pulseSymbol {
                0% { transform: scale(1); }
                100% { transform: scale(1.08); }
            }
        </style>
        `;
    }

    bindEvents(container, onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;

        // Initialize PixiJS WebGL Slot Stage
        const canvas = container.querySelector('#slot-pixi-canvas');
        const fallback = container.querySelector('#slot-dom-fallback');
        if (canvas && typeof window !== 'undefined' && window.PIXI) {
            try {
                this.pixiStage?.destroy();
                this.pixiStage = new PixiSlotStage(canvas, {
                    cols: 6,
                    rows: 3,
                    symbols: SYMBOLS,
                    themeColor: 0xfbbf24
                });
                this.pixiStage.setGrid(this.grid);
                canvas.style.display = 'block';
                if (fallback) fallback.style.display = 'none';
            } catch (err) {
                console.warn('[SlotEngine] PixiJS WebGL init failed, using DOM fallback:', err);
                if (canvas) canvas.style.display = 'none';
                if (fallback) fallback.style.display = 'grid';
            }
        } else {
            if (canvas) canvas.style.display = 'none';
            if (fallback) fallback.style.display = 'grid';
        }

        // Initialize HUD Saldo display & Navbar Rate status
        const balEl = container.querySelector('#slot-player-balance');
        if (balEl) {
            balEl.textContent = financeManager.formatCurrency(gameState.getBalance());
        }
        const headerRate = document.getElementById('header-rate-badge-container');
        if (headerRate) {
            headerRate.innerHTML = this.getRateStatusHTML();
        }

        // Stepper Bet Controls
        const BET_TIERS = [
            10000, 25000, 50000, 100000, 250000, 500000,
            1000000, 2500000, 5000000, 10000000, 25000000, 50000000
        ];

        const getCurrentBet = () => {
            const input = container.querySelector('#slot-bet-input');
            if (!input) return 100000;
            return parseInt(input.value.replace(/,/g, ''), 10) || 100000;
        };

        const setBet = (val) => {
            const input = container.querySelector('#slot-bet-input');
            if (!input) return;
            const clamped = Math.max(10000, Math.min(val, 50000000));
            input.value = clamped.toLocaleString('en-US');
        };

        container.querySelector('#btn-bet-minus')?.addEventListener('click', () => {
            mobileHandler.hapticTap();
            const curr = getCurrentBet();
            const prevTier = [...BET_TIERS].reverse().find(t => t < curr) || BET_TIERS[0];
            setBet(prevTier);
        });

        container.querySelector('#btn-bet-plus')?.addEventListener('click', () => {
            mobileHandler.hapticTap();
            const curr = getCurrentBet();
            const nextTier = BET_TIERS.find(t => t > curr) || BET_TIERS[BET_TIERS.length - 1];
            setBet(nextTier);
        });

        container.querySelector('#btn-slot-max')?.addEventListener('click', () => {
            mobileHandler.hapticTap();
            const balance = gameState.getBalance();
            const maxAffordable = BET_TIERS.slice().reverse().find(t => t <= balance) || BET_TIERS[0];
            setBet(maxAffordable);
        });

        // Mobile Quick Bet Sheet on Bet Input tap
        const betInputEl = container.querySelector('#slot-bet-input');
        if (betInputEl) {
            betInputEl.addEventListener('click', () => {
                if (mobileHandler.isMobile) {
                    mobileHandler.openQuickBetSheet({
                        currentBet: getCurrentBet(),
                        betTiers: BET_TIERS,
                        onSelectBet: (val) => setBet(val),
                        onMaxBet: () => container.querySelector('#btn-slot-max')?.click()
                    });
                }
            });
        }

        // Mobile Physical Pull Down Gesture (Swipe-to-Spin) on Reels
        const windowTheater = container.querySelector('.slot-window-theater');
        if (windowTheater) {
            mobileHandler.bindReelSwipe(windowTheater, () => {
                if (!this.isSpinning) {
                    this.stopAutoSpin();
                    this.spin();
                }
            });
        }

        // Giant Primary Spin Button
        container.querySelector('#btn-slot-spin')?.addEventListener('click', () => {
            this.stopAutoSpin();
            this.spin();
        });

        // Auto Spin Toggle Button
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
                                speedupBtn.style.background = this.isSpeedUp ? '#fbbf24' : '';
                                speedupBtn.style.borderColor = this.isSpeedUp ? '#fbbf24' : '';
                                speedupBtn.style.color = this.isSpeedUp ? '#000' : '';
                            }
                        }
                        this.startAutoSpin(count);
                    }
                });
            }
        });

        // Speed Up / Turbo Toggle Button
        const speedupBtn = container.querySelector('#btn-slot-speedup');
        if (speedupBtn) {
            const updateSpeedupUI = () => {
                if (this.isSpeedUp) {
                    speedupBtn.style.background = '#fbbf24';
                    speedupBtn.style.borderColor = '#fbbf24';
                    speedupBtn.style.color = '#000';
                } else {
                    speedupBtn.style.background = '';
                    speedupBtn.style.borderColor = '';
                    speedupBtn.style.color = '';
                }
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

        // Paytable Info Modal Dialog
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
        this.autoSpinCount = count;
        this.isAutoSpinning = true;

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
        this.isAutoSpinning = false;
        this.autoSpinCount = 0;

        const autoBtn = document.getElementById('btn-slot-auto');
        const autoText = document.getElementById('slot-auto-text');
        if (autoBtn) {
            autoBtn.style.background = '';
            autoBtn.style.borderColor = '';
            autoBtn.style.color = '';
        }
        if (autoText) autoText.textContent = 'AUTO';
    }

    weightedRandom(luck, betAmount = 0) {
        const weights = SYMBOLS.map(s => {
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
        for (let i = 0; i < SYMBOLS.length; i++) {
            if (r < weights[i]) return SYMBOLS[i];
            r -= weights[i];
        }
        return SYMBOLS[SYMBOLS.length - 1];
    }

    // Canvas particle loop
    startParticleLoop() {
        if (this.particleLoopActive) return;
        this.particleLoopActive = true;
        const canvas = document.getElementById('slot-particle-canvas');
        if (!canvas) {
            this.particleLoopActive = false;
            return;
        }
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;

        const loop = () => {
            if (this.particles.length === 0) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                this.particleLoopActive = false;
                return;
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.update();
                if (p.alpha <= 0) {
                    this.particles.splice(i, 1);
                    continue;
                }
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation * Math.PI / 180);
                ctx.fillStyle = p.color;

                if (p.type === 'diamond') {
                    ctx.beginPath();
                    ctx.moveTo(0, -p.size);
                    ctx.lineTo(p.size, 0);
                    ctx.lineTo(0, p.size);
                    ctx.lineTo(-p.size, 0);
                    ctx.closePath();
                    ctx.fill();
                } else if (p.type === 'gold') {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                    ctx.fill();
                } else if (p.type === 'spark') {
                    ctx.beginPath();
                    for (let j = 0; j < 5; j++) {
                        ctx.lineTo(Math.cos((18 + j * 72) * Math.PI / 180) * p.size, Math.sin((18 + j * 72) * Math.PI / 180) * p.size);
                        ctx.lineTo(Math.cos((54 + j * 72) * Math.PI / 180) * (p.size/2), Math.sin((54 + j * 72) * Math.PI / 180) * (p.size/2));
                    }
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                }
                ctx.restore();
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    spawnParticles(count, type) {
        const canvas = document.getElementById('slot-particle-canvas');
        if (!canvas) return;
        const x = canvas.width / 2;
        const y = canvas.height / 2;
        for (let i = 0; i < count; i++) {
            this.particles.push(new GoldParticle(x, y, type));
        }
        this.startParticleLoop();
    }

    shakeCabinet() {
        const cabinet = document.querySelector('.slot-cabinet-theater') || document.querySelector('.slot-cabinet');
        if (cabinet) {
            cabinet.classList.add('shake-anim');
            setTimeout(() => {
                cabinet.classList.remove('shake-anim');
            }, 600);
        }
    }

    spawnPraiseText(text) {
        const cabinet = document.querySelector('.slot-cabinet-theater') || document.querySelector('.slot-cabinet');
        if (!cabinet) return;
        const div = document.createElement('div');
        div.textContent = text;
        div.style.position = 'absolute';
        div.style.left = '50%';
        div.style.top = '45%';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.fontSize = '2.5rem';
        div.style.fontWeight = '900';
        div.style.color = '#fbbf24';
        div.style.webkitTextStroke = '2px #451a03';
        div.style.textShadow = '0 0 16px rgba(251,191,36,0.9), 0 4px 0 #7c2d12';
        div.style.pointerEvents = 'none';
        div.style.zIndex = '20';
        div.style.animation = 'praiseBounce 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
        
        cabinet.appendChild(div);
        setTimeout(() => div.remove(), 1000);
    }

    async _animateReel(colIdx, finalEmojis, delay) {
        return new Promise(resolve => {
            if (this.skipRequested) {
                for (let r = 0; r < 3; r++) {
                    const el = document.getElementById(`slot-reel-${colIdx}-${r}`);
                    if (el) {
                        el.innerHTML = getSlotSVG(finalEmojis[r]);
                        el.style.filter = 'none';
                    }
                }
                resolve();
                return;
            }

            let ticks = 0;
            const baseTicks = 10 + delay * 3;
            const maxTicks = this.isSpeedUp ? Math.max(3, Math.floor(baseTicks / 2)) : baseTicks;
            const intervalDuration = this.isSpeedUp ? 20 : 70;

            const interval = setInterval(() => {
                if (this.skipRequested) {
                    clearInterval(interval);
                    for (let r = 0; r < 3; r++) {
                        const el = document.getElementById(`slot-reel-${colIdx}-${r}`);
                        if (el) {
                            el.innerHTML = getSlotSVG(finalEmojis[r]);
                            el.style.filter = 'none';
                        }
                    }
                    resolve();
                    return;
                }

                for (let r = 0; r < 3; r++) {
                    const el = document.getElementById(`slot-reel-${colIdx}-${r}`);
                    if (el) {
                        el.innerHTML = getSlotSVG(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].emoji);
                        el.style.filter = 'blur(1px)';
                    }
                }
                ticks++;
                if (ticks >= maxTicks) {
                    clearInterval(interval);
                    for (let r = 0; r < 3; r++) {
                        const el = document.getElementById(`slot-reel-${colIdx}-${r}`);
                        if (el) {
                            el.innerHTML = getSlotSVG(finalEmojis[r]);
                            el.style.filter = 'none';
                            el.style.transform = 'scale(1.08)';
                            setTimeout(() => { el.style.transform = 'scale(1)'; }, this.isSpeedUp ? 50 : 150);
                        }
                    }
                    resolve();
                }
            }, intervalDuration);
        });
    }

    async spin() {
        if (this.isSpinning) return;

        // Clear any previous winning highlights
        document.querySelectorAll('.slot-symbol-block').forEach(el => el.classList.remove('winning-symbol'));

        const input = document.getElementById('slot-bet-input');
        const betAmount = input?.getNumericValue ? input.getNumericValue() : (parseInt(input?.value.replace(/,/g, '') || '0', 10));

        if (betAmount <= 0) {
            ui.error('Masukkan jumlah taruhan yang valid!');
            this.stopAutoSpin();
            return;
        }
        const balance = gameState.getBalance();
        if (betAmount > balance) {
            ui.error('Saldo tidak mencukupi!');
            this.stopAutoSpin();
            return;
        }

        this.isSpinning = true;
        this.skipRequested = false;
        mobileHandler.hapticSpin();
        import('../ui/AuraSound.js').then(m => m.default.playCasinoSpin());

        // Enable skip button and style it active
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
            spinBtn.innerHTML = '<span class="spin-icon" style="animation:spin 0.5s linear infinite;display:inline-block;">⛏️</span> <span class="spin-text">GALI...</span>';
        }

        const winDisplay = document.getElementById('slot-win-display');
        if (winDisplay) winDisplay.innerHTML = `<span class="idle-text">Mesin Gali Sedang Berputar...</span>`;

        // Deduct bet
        financeManager.addExpense(betAmount, 'Lainnya', 'Taruhan Slot 6x3');
        const balEl = document.getElementById('slot-player-balance');
        if (balEl) balEl.textContent = financeManager.formatCurrency(gameState.getBalance());
        this.onBalanceRefresh?.();

        // Increment rate plays
        let plays = gameState.get('casino.ratePlays') || 0;
        plays++;
        gameState.set('casino.ratePlays', plays);
        const rateOn = plays >= 250;

        const donations = gameState.get('donations') || { luckMultiplier: 1.0 };
        let luck = donations.luckMultiplier || 1.0;
        if (rateOn) {
            luck = Math.max(luck, 3.5);
        }

        // Direct spin outcome via Volatility Engine
        const evalResult = casinoVolatility.evaluateSpin(betAmount, balance, luck);
        this.currentNearMiss = evalResult.isNearMiss;

        // Generate final matrix 6x3
        const resultMatrix = [];
        for (let col = 0; col < 6; col++) {
            const colSymbols = [];
            for (let row = 0; row < 3; row++) {
                colSymbols.push(this.weightedRandom(luck, betAmount).emoji);
            }
            resultMatrix.push(colSymbols);
        }

        // Apply Near-Miss Harapan Palsu setup if triggered
        if (evalResult.isNearMiss) {
            const teaserSymbol = Math.random() < 0.6 ? '💎' : '💰';
            const targetLine = PAYLINES[Math.floor(Math.random() * 3)]; // Line 1, 2, or 3
            resultMatrix[0][targetLine.coordinates[0]] = teaserSymbol;
            resultMatrix[1][targetLine.coordinates[1]] = teaserSymbol;
            // Deliberately miss on reel 2 with rock
            resultMatrix[2][targetLine.coordinates[2]] = '🪨';
        } else if (evalResult.targetOutcome === 'ZONK') {
            // Ensure no accidental Left-to-Right 3-in-a-row connections on paylines
            PAYLINES.forEach(line => {
                const s0 = resultMatrix[0][line.coordinates[0]];
                const s1 = resultMatrix[1][line.coordinates[1]];
                const s2 = resultMatrix[2][line.coordinates[2]];
                if (s0 === s1 && s1 === s2) {
                    resultMatrix[2][line.coordinates[2]] = (s2 === '🪨') ? '⛏️' : '🪨';
                }
            });
        }

        this.grid = resultMatrix;

        // Animate reels via PixiJS WebGL or DOM fallback
        if (this.pixiStage) {
            await this.pixiStage.spin(resultMatrix, {
                isSpeedUp: this.isSpeedUp,
                skipRequested: this.skipRequested
            });
        } else {
            for (let col = 0; col < 6; col++) {
                if (this.skipRequested) {
                    for (let c = col; c < 6; c++) {
                        for (let r = 0; r < 3; r++) {
                            const el = document.getElementById(`slot-reel-${c}-${r}`);
                            if (el) {
                                el.innerHTML = getSlotSVG(resultMatrix[c][r]);
                                el.style.filter = 'none';
                            }
                        }
                    }
                    break;
                }
                await this._animateReel(col, resultMatrix[col], col);
                if (!this.skipRequested) {
                    await new Promise(r => setTimeout(r, this.isSpeedUp ? 25 : 100));
                }
            }
        }

        // Evaluate result with Cascading Tumble chain reaction
        await this._processTumbleSequence(betAmount, luck);

        this.isSpinning = false;
        if (spinBtn) {
            spinBtn.disabled = false;
            spinBtn.innerHTML = '<span class="spin-icon">⛏️</span> <span class="spin-text">SPIN</span>';
        }

        // Disable skip button and reset style
        const skipBtnEnd = document.getElementById('btn-slot-skip');
        if (skipBtnEnd) {
            skipBtnEnd.disabled = true;
            skipBtnEnd.style.color = 'rgba(255,255,255,0.4)';
            skipBtnEnd.style.borderColor = 'rgba(168,85,247,0.2)';
            skipBtnEnd.style.background = 'rgba(168,85,247,0.05)';
        }

        // Handle Auto Spin cycle
        if (this.isAutoSpinning) {
            const hasMore = (this.autoSpinCount === Infinity || this.autoSpinCount >= 999999 || this.autoSpinCount > 1);
            if (hasMore) {
                if (this.autoSpinCount !== Infinity && this.autoSpinCount < 999999) {
                    this.autoSpinCount--;
                }
                const autoText = document.getElementById('slot-auto-text');
                if (autoText) {
                    autoText.textContent = (this.autoSpinCount === Infinity || this.autoSpinCount >= 999999) ? 'STOP (∞)' : `STOP (${this.autoSpinCount})`;
                }
                
                setTimeout(() => {
                    if (this.isAutoSpinning) this.spin();
                }, this.isSpeedUp ? 600 : 1500);
            } else {
                this.stopAutoSpin();
            }
        }

        // Update the Rate badge display in both header navbar and cabinet
        const rateContainer = document.getElementById('slot-rate-badge-container');
        if (rateContainer) {
            rateContainer.innerHTML = this.getRateStatusHTML();
        }
        const headerRate = document.getElementById('header-rate-badge-container');
        if (headerRate) {
            headerRate.innerHTML = this.getRateStatusHTML();
        }
    }

    _checkGridWins(lineBet) {
        let stepPayout = 0;
        const winsList = [];
        const winningLines = [];
        const winningCoordsMap = new Map();
        let foundDynamite = false;

        // Check horizontal & V-shape paylines starting strictly from Reel 1 (Col 0) Left-to-Right
        PAYLINES.forEach((line) => {
            const firstSymbol = this.grid[0][line.coordinates[0]];
            let matchLength = 1;
            for (let col = 1; col < 6; col++) {
                const sym = this.grid[col][line.coordinates[col]];
                if (sym === firstSymbol) {
                    matchLength++;
                } else {
                    break;
                }
            }

            // Only 3 or more matching symbols from Col 0 win
            if (matchLength >= 3) {
                const spec = SYMBOLS.find(s => s.emoji === firstSymbol);
                if (spec) {
                    let lineMultiplier = spec.multiplier3x;
                    if (matchLength === 4) lineMultiplier = Math.round(spec.multiplier3x * 2.5);
                    else if (matchLength === 5) lineMultiplier = Math.round(spec.multiplier3x * 6);
                    else if (matchLength >= 6) lineMultiplier = Math.round(spec.multiplier3x * 15);

                    const lineWin = Math.round(lineBet * lineMultiplier);
                    stepPayout += lineWin;
                    winsList.push(`${line.name}: ${matchLength}x ${firstSymbol} (+${financeManager.formatCurrency(lineWin)} TC)`);
                    winningLines.push(line);

                    for (let col = 0; col < matchLength; col++) {
                        const row = line.coordinates[col];
                        winningCoordsMap.set(`${col}-${row}`, { col, row });
                    }
                }
            }
        });

        // Signature Mechanic: TNT 3x3 Area Blast
        // Detect all dynamite on screen; if involved in a match or if 2+ dynamite appear, trigger 3x3 explosion
        const dynamiteSpots = [];
        for (let col = 0; col < 6; col++) {
            for (let row = 0; row < 3; row++) {
                if (this.grid[col][row] === '🧨') {
                    foundDynamite = true;
                    // If this dynamite is in winningCoordsMap or there are multiple dynamites
                    if (winningCoordsMap.has(`${col}-${row}`) || winningCoordsMap.size > 0) {
                        dynamiteSpots.push({ col, row });
                    }
                }
            }
        }

        let tntBounty = 0;
        let blastCount = 0;
        if (dynamiteSpots.length > 0) {
            dynamiteSpots.forEach(({ col: dCol, row: dRow }) => {
                for (let dc = -1; dc <= 1; dc++) {
                    for (let dr = -1; dr <= 1; dr++) {
                        const nc = dCol + dc;
                        const nr = dRow + dr;
                        if (nc >= 0 && nc < 6 && nr >= 0 && nr < 3) {
                            if (!winningCoordsMap.has(`${nc}-${nr}`)) {
                                winningCoordsMap.set(`${nc}-${nr}`, { col: nc, row: nr, isBlast: true });
                                blastCount++;
                                const sym = this.grid[nc][nr];
                                if (sym === '🪨') tntBounty += Math.round(lineBet * 1.5);
                                else if (sym === '⛏️') tntBounty += Math.round(lineBet * 2.5);
                                else if (sym === '🪙') tntBounty += Math.round(lineBet * 4.0);
                                else tntBounty += Math.round(lineBet * 1.0);
                            }
                        }
                    }
                }
            });

            if (tntBounty > 0) {
                stepPayout += tntBounty;
                winsList.push(`💥 LEDAKAN 3x3 DINAMIT: Hancurkan ${blastCount} Batu Tambang (+${financeManager.formatCurrency(tntBounty)} TC)`);
            }
        }

        return {
            stepPayout,
            winningLines,
            winningCoords: Array.from(winningCoordsMap.values()),
            winsList,
            foundDynamite: dynamiteSpots.length > 0 || foundDynamite,
            hadBlast: blastCount > 0
        };
    }

    async _processTumbleSequence(betAmount, luck) {
        const winDisplay = document.getElementById('slot-win-display');
        const lineBet = betAmount / 5;
        let totalPayout = 0;
        let cascadeRound = 0;
        const allWinsList = [];
        let hasDynamite = false;
        const MAX_CASCADES = 15;

        while (cascadeRound < MAX_CASCADES) {
            cascadeRound++;
            const { stepPayout, winningLines, winningCoords, winsList, foundDynamite, hadBlast } = this._checkGridWins(lineBet);
            if (foundDynamite) hasDynamite = true;

            if (winningCoords.length === 0) {
                // No more wins in this tumble step
                if (cascadeRound === 1) {
                    cascadeRound = 0; // zero wins entirely
                } else {
                    cascadeRound--; // last round was empty
                }
                break;
            }

            // Signature Mechanic: Gold Rush Fever Multiplier progression (x1, x2, x3, x5, up to x10)
            const comboMultiplier = cascadeRound >= 5 ? 10 : (cascadeRound === 4 ? 5 : (cascadeRound === 3 ? 3 : (cascadeRound === 2 ? 2 : 1)));
            const stepWin = Math.round(stepPayout * comboMultiplier);
            totalPayout += stepWin;
            allWinsList.push(...winsList.map(w => `[Runtuhan #${cascadeRound} ×${comboMultiplier}] ${w}`));

            // If a dynamite 3x3 blast occurred, trigger special visual & sound FX
            if (hadBlast) {
                this.shakeCabinet();
                this.spawnParticles(35, 'spark');
                this.spawnParticles(25, 'dust');
                AuraSound.playDynamiteBlast();
                this.spawnPraiseText('BOOM! 3x3 BLAST! 🧨');
            }

            // Visual highlight for winning symbols
            if (this.pixiStage && winningLines.length > 0) {
                this.pixiStage.highlightWins(winningLines, winningCoords);
            }
            winningCoords.forEach(({ col, row }) => {
                document.getElementById(`slot-reel-${col}-${row}`)?.classList.add('winning-symbol');
            });

            // Update win display with active combo and running payout
            if (winDisplay) {
                const isGoldRush = comboMultiplier >= 10;
                winDisplay.innerHTML = `
                    <div class="win-text-gold">
                        <span style="color:${isGoldRush ? '#fbbf24' : '#ef4444'}; font-weight:900;">
                            ${isGoldRush ? '⛏️ GOLD RUSH FEVER x10!' : `🔥 COMBO x${comboMultiplier}!`}
                        </span>
                        <span class="win-payout-num">+${financeManager.formatCurrency(totalPayout)} TC</span>
                    </div>
                `;
            }

            // Play celebratory combo tone
            AuraSound.playComboUp(comboMultiplier);

            // Brief pause so player sees the winning line/connection
            await new Promise(r => setTimeout(r, this.isSpeedUp ? 220 : 500));

            // Generate new tumbled grid:
            // 1. Surviving symbols in each column slide down
            // 2. Newly spawned random symbols fall in from top
            const newGrid = [];
            for (let col = 0; col < 6; col++) {
                const surviving = [];
                for (let row = 2; row >= 0; row--) {
                    const isWinning = winningCoords.some(c => c.col === col && c.row === row);
                    if (!isWinning) {
                        surviving.unshift(this.grid[col][row]);
                    }
                }
                const needed = 3 - surviving.length;
                const newSymbols = [];
                for (let i = 0; i < needed; i++) {
                    newSymbols.push(this.weightedRandom(luck, betAmount).emoji);
                }
                newGrid.push([...newSymbols, ...surviving]);
            }

            // Animate tumble in PixiJS WebGL or DOM fallback
            mobileHandler.hapticTumble();
            if (this.pixiStage) {
                await this.pixiStage.animateCascade(winningCoords, newGrid, { isSpeedUp: this.isSpeedUp });
            } else {
                for (let col = 0; col < 6; col++) {
                    for (let row = 0; row < 3; row++) {
                        const el = document.getElementById(`slot-reel-${col}-${row}`);
                        if (el) {
                            el.innerHTML = getSlotSVG(newGrid[col][row]);
                            el.classList.remove('winning-symbol');
                        }
                    }
                }
                AuraSound.playCascadePop();
                AuraSound.playTumbleDrop();
                await new Promise(r => setTimeout(r, this.isSpeedUp ? 150 : 300));
            }

            // Update current grid
            this.grid = newGrid;

            // Short pause before next tumble evaluation
            await new Promise(r => setTimeout(r, this.isSpeedUp ? 100 : 250));
        }

        // Trigger Screen Shake / Dynamite explosions if found
        if (hasDynamite) {
            this.shakeCabinet();
            this.spawnParticles(15, 'spark');
            this.spawnParticles(20, 'dust');
        }

        // Payout award and final celebration
        if (totalPayout > 0) {
            financeManager.addIncome(totalPayout, 'Investasi', `Kemenangan Slot Runtuhan Goldy Crush (${cascadeRound}x Kombo)`);
            gameState.emit('action:slotWin', { gameId: 'slot', winAmount: totalPayout, betAmount });
            const balEl = document.getElementById('slot-player-balance');
            if (balEl) balEl.textContent = financeManager.formatCurrency(gameState.getBalance());
            this.onBalanceRefresh?.();

            const isJackpot = totalPayout >= betAmount * 5;
            if (isJackpot) {
                gameState.set('casino.ratePlays', 0);
            }

            // Tiered Celebration: Big Win (>= 15x), Mega Win (>= 40x), Sensational (>= 100x)
            if (totalPayout >= betAmount * 15) {
                mobileHandler.hapticBigWin();
                this.shakeCabinet();
                pixiEffects.celebrateWin({
                    amount: totalPayout,
                    bet: betAmount,
                    onComplete: () => {
                        this.onBalanceRefresh?.();
                    }
                });
            } else {
                mobileHandler.hapticWin();
                pixiEffects.flyChipsToHeader(winDisplay, 10);
                this.spawnPraiseText(cascadeRound > 1 ? `KOMBO ${cascadeRound}x! 🔥` : 'STRIKE! 🪙');
                this.spawnParticles(20, 'gold');
                AuraSound.playClaimMoney();
            }

            // Print final results inside slot display with Layered 24K Gold Text Effect
            if (winDisplay) {
                winDisplay.innerHTML = `
                    <div class="win-text-gold">
                        <span>✨</span>
                        <span>MENANG TOTAL ${cascadeRound > 1 ? `(${cascadeRound}x RUNTUHAN)` : ''}</span>
                        <span class="win-payout-num">+${financeManager.formatCurrency(totalPayout)} TC</span>
                        <span>✨</span>
                    </div>
                    <div style="font-size:0.65rem; color:rgba(255,255,255,0.5); max-height:60px; overflow-y:auto; width:100%; margin-top:2px;">
                        ${allWinsList.join(' | ')}
                    </div>
                `;
            }
        } else {
            // Non-winning spin: play audio cue and reset display to idle state
            if (this.currentNearMiss) {
                AuraSound.playNearMiss();
            } else {
                AuraSound.playCasinoLose();
            }
            if (winDisplay) {
                winDisplay.innerHTML = `<span class="idle-text">TEKAN SPIN UNTUK MENGGALI EMAS</span>`;
            }
        }

        // Record outcome for streak tracking & greed punishment
        casinoVolatility.recordOutcome(betAmount, totalPayout);
    }
}
