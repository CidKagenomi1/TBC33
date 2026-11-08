/**
 * WheelEngine.js - Upgraded Spinning Wheel (Roda Keberuntungan)
 * Features 10 Free Spins, 50 Super Bonus Spins (3x Multiplier), Grand Jackpot 100x,
 * Direct Lottery Tickets reward, and automated numeric auto spin controls.
 * Mobile responsive optimized (preventing vertical scrolling).
 */

import financeManager from '../finance/FinanceManager.js';
import gameState from '../core/GameState.js';
import ui from '../ui/UIManager.js';
import PixiWheelStage from '../graphics/PixiWheelStage.js';
import pixiEffects from '../graphics/PixiEffects.js';

const SECTORS = [
    { label: '🏆 100x', multiplier: 100.0, color: '#fbbf24', text: '#000', type: 'usd' },        // Grand Jackpot Gold
    { label: '🪙 1.5x', multiplier: 1.5,   color: '#10b981', text: '#fff', type: 'usd' },        // Emerald Safe Win
    { label: '⭐ 5.0x', multiplier: 5.0,   color: '#8b5cf6', text: '#fff', type: 'usd' },        // Violet Strike
    { label: '🪙 1.2x', multiplier: 1.2,   color: '#06b6d4', text: '#fff', type: 'usd' },        // Cyan Quick Win
    { label: '🎁 10 FREE', multiplier: 0,  color: '#3b82f6', text: '#fff', type: 'freespin' },   // Sapphire Free Spins
    { label: '👑 25.0x', multiplier: 25.0, color: '#f59e0b', text: '#000', type: 'usd' },        // Amber Mega
    { label: '🪙 2.0x', multiplier: 2.0,   color: '#84cc16', text: '#000', type: 'usd' },        // Lime Double
    { label: '🎟️ 5 TIKET', multiplier: 0, amount: 5, color: '#f43f5e', text: '#fff', type: 'lottery' }, // Rose Tickets
    { label: '⭐ 3.0x', multiplier: 3.0,   color: '#f97316', text: '#fff', type: 'usd' },        // Orange Triple
    { label: '🪙 0.8x', multiplier: 0.8,   color: '#64748b', text: '#fff', type: 'usd' },        // Slate Rebate
    { label: '💎 10.0x', multiplier: 10.0, color: '#0ea5e9', text: '#fff', type: 'usd' },        // Sky Diamond
    { label: '🔥 50 BONUS', multiplier: 0, color: '#ec4899', text: '#fff', type: 'bonusspin' }   // Magenta 3x Bonus
];

export class WheelEngine {
    constructor(onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;
        this.isSpinning = false;
        this.currentRotation = 0;
        this.autoSpinCount = 0;
        this.isAutoSpinning = false;
        this.skipRequested = false;
        this.pixiWheel = null;
    }

    getRateStatusHTML() {
        const plays = gameState.get('casino.ratePlays') || 0;
        const rateOn = plays >= 250;
        return rateOn 
            ? `<div class="rate-badge rate-on-badge" style="display:inline-flex; align-items:center; gap:0.25rem; background:linear-gradient(135deg,#ef4444,#fbbf24); color:#fff; font-weight:900; font-size:0.75rem; padding:0.25rem 0.6rem; border-radius:999px; box-shadow:0 0 10px rgba(239,68,68,0.5); animation: rateGlow 1s ease-in-out infinite alternate; text-transform:uppercase; letter-spacing:0.05em; margin-bottom: 0.5rem; border: 1.5px solid #fff;">⚡ RATE ON (JACKPOT UP!)</div>`
            : `<div class="rate-badge rate-off-badge" style="display:inline-flex; align-items:center; gap:0.25rem; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.6); font-weight:800; font-size:0.7rem; padding:0.2rem 0.5rem; border-radius:999px; text-transform:uppercase; letter-spacing:0.05em; margin-bottom: 0.5rem;">Rate: OFF (${plays}/250 Spins)</div>`;
    }

    get freeSpinsRemaining() {
        return gameState.get('casino.freeSpins') || 0;
    }
    set freeSpinsRemaining(val) {
        gameState.set('casino.freeSpins', Math.max(0, val));
    }
    get bonusSpinsRemaining() {
        return gameState.get('casino.bonusSpins') || 0;
    }
    set bonusSpinsRemaining(val) {
        gameState.set('casino.bonusSpins', Math.max(0, val));
    }
    get lotteryTokens() {
        return gameState.get('casino.lotteryTokens') || 0;
    }
    set lotteryTokens(val) {
        gameState.set('casino.lotteryTokens', Math.max(0, val));
    }

    getHTML() {
        // Build SVG sectors path
        let paths = '';
        const cx = 150;
        const cy = 150;
        const r = 140;
        const totalSectors = SECTORS.length;
        const anglePerSector = 360 / totalSectors;

        SECTORS.forEach((sec, i) => {
            const startAngle = i * anglePerSector - 90;
            const endAngle = (i + 1) * anglePerSector - 90;

            const x1 = cx + r * Math.cos(startAngle * Math.PI / 180);
            const y1 = cy + r * Math.sin(startAngle * Math.PI / 180);
            const x2 = cx + r * Math.cos(endAngle * Math.PI / 180);
            const y2 = cy + r * Math.sin(endAngle * Math.PI / 180);

            const largeArcFlag = anglePerSector > 180 ? 1 : 0;

            paths += `
                <g>
                    <path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z" 
                          fill="${sec.color}" stroke="rgba(0,0,0,0.2)" stroke-width="2" />
                    <text x="${cx + (r * 0.62) * Math.cos((startAngle + anglePerSector/2) * Math.PI / 180)}" 
                          y="${cy + (r * 0.62) * Math.sin((startAngle + anglePerSector/2) * Math.PI / 180)}"
                          fill="${sec.text}" font-weight="900" font-size="9" text-anchor="middle" dominant-baseline="central"
                          transform="rotate(${(startAngle + anglePerSector/2) + 90}, ${cx + (r * 0.62) * Math.cos((startAngle + anglePerSector/2) * Math.PI / 180)}, ${cy + (r * 0.62) * Math.sin((startAngle + anglePerSector/2) * Math.PI / 180)})">
                        ${sec.label.split(' ').slice(1).join(' ')}
                    </text>
                </g>
            `;
        });

        // Special spins remaining indicators
        let statusIndicators = '';
        if (this.freeSpinsRemaining > 0) {
            statusIndicators += `
                <div class="wheel-status-indicator" style="background: rgba(59,130,246,0.12); color: #60a5fa; border-color: rgba(59,130,246,0.25);">
                    <span>🎁 PUTARAN GRATIS SISA:</span>
                    <span style="font-size: 1rem; color: #fff;">${this.freeSpinsRemaining} SPIN</span>
                </div>
            `;
        }
        if (this.bonusSpinsRemaining > 0) {
            statusIndicators += `
                <div class="wheel-status-indicator" style="background: rgba(236,72,153,0.12); color: #f472b6; border-color: rgba(236,72,153,0.25);">
                    <span>🔥 PUTARAN BONUS SISA (3X LIPAT):</span>
                    <span style="font-size: 1rem; color: #fff;">${this.bonusSpinsRemaining} SPIN</span>
                </div>
            `;
        }

        // Determine Spin Button text & color styling
        let spinBtnText = '🎡 PUTAR RODA';
        let spinBtnGrad = 'linear-gradient(135deg,#a855f7 0%,#ec4899 100%)';
        let spinBtnShadow = 'rgba(168,85,247,0.35)';

        if (this.isSpinning) {
            spinBtnText = '⏭️ SPIN BREAK (LEWATI)';
            spinBtnGrad = 'linear-gradient(135deg,#e11d48 0%,#9f1239 100%)';
            spinBtnShadow = 'rgba(225,29,72,0.4)';
        } else if (this.bonusSpinsRemaining > 0) {
            spinBtnText = `🔥 PUTAR BONUS 3X (${this.bonusSpinsRemaining})`;
            spinBtnGrad = 'linear-gradient(135deg,#ec4899 0%,#f43f5e 100%)';
            spinBtnShadow = 'rgba(236,72,153,0.5)';
        } else if (this.freeSpinsRemaining > 0) {
            spinBtnText = `🎁 PUTAR GRATIS (${this.freeSpinsRemaining})`;
            spinBtnGrad = 'linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%)';
            spinBtnShadow = 'rgba(59,130,246,0.5)';
        }

        return `
        <div style="max-width: 620px; margin: 0 auto; text-align: center; animation: fade-up 0.3s ease;">
            <div style="display:flex; justify-content:center; margin-bottom:0.4rem;">
                <button type="button" class="btn-lobby-pill" title="Buka Menu Game (L)"><span>☰</span> LOBBY / GANTI GAME</button>
            </div>
            <h3 style="font-weight: 900; color: #fff; margin-bottom: 0.35rem; font-size: 1.4rem; letter-spacing: -0.03em;">
                🎡 <span style="background: linear-gradient(90deg,#a855f7,#ec4899); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;">SPINNING WHEEL</span>
            </h3>
            <p style="color:rgba(255,255,255,0.4); font-size:0.75rem; margin-bottom:0.75rem; text-transform:uppercase; letter-spacing:0.1em;">DAPATKAN PENGALI HINGGA 100X, PUTARAN GRATIS, &amp; TIKET LOTRE!</p>
            ${this.getRateStatusHTML()}

            ${statusIndicators}

            <!-- Wheel Container -->
            <div class="wheel-container-wrapper" style="position:relative; width:320px; height:320px; margin:0 auto 1.25rem auto;">
                <!-- PixiJS WebGL Wheel Canvas -->
                <canvas id="wheel-pixi-canvas" width="320" height="320" style="display:block; width:100%; height:100%;"></canvas>

                <!-- SVG Fallback Wheel -->
                <div id="wheel-svg-fallback" style="display:none; width:100%; height:100%; position:relative;">
                    <div class="wheel-pointer"></div>
                    <div id="wheel-svg-container" class="wheel-svg-box" style="transform: rotate(${this.currentRotation}deg);">
                        <svg viewBox="0 0 300 300" style="width:100%; height:100%;">
                            ${paths}
                            <circle cx="150" cy="150" r="18" fill="#1c130e" stroke="#fbbf24" stroke-width="3" />
                            <circle cx="150" cy="150" r="6" fill="#fbbf24" />
                        </svg>
                    </div>
                </div>
            </div>

            <!-- Win Display -->
            <div id="wheel-win-display" class="wheel-win-box">
                <span style="color:rgba(255,255,255,0.25); font-size:0.75rem; font-style:italic; text-transform:uppercase; letter-spacing:0.08em;">Silakan Putar Roda Raksasa...</span>
            </div>

            <!-- Auto Spin Controls -->
            <div class="wheel-controls-box">
                <div style="text-align:left; flex: 1; min-width: 110px;">
                    <label style="display:block; font-size:0.65rem; color:rgba(255,255,255,0.5); margin-bottom:0.15rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em;">AUTO SPIN</label>
                    <input type="number" id="wheel-autospin-count" value="10" min="1" max="1000" style="background:var(--bg-surface); border:1px solid var(--border-color); font-size:1rem; font-weight:700; color:#fff; width:100%; text-align:center; border-radius:6px; padding: 0.25rem 0.4rem; outline:none;">
                </div>
                <div style="flex:1.5; display:flex; gap:0.4rem; height: 36px; margin-top: auto; min-width: 150px;">
                    <button id="btn-wheel-auto-start" class="bet-chip" style="flex:1; border-radius:8px; background: rgba(168,85,247,0.15); border-color: rgba(168,85,247,0.3); color: #a855f7; font-size:0.8rem; font-weight: 800;">🤖 AUTO SPIN</button>
                    <button id="btn-wheel-auto-stop" class="bet-chip" style="flex:1; border-radius:8px; background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.3); color: #ef4444; font-size:0.8rem; font-weight: 800; display:none;">⏹️ STOP (0)</button>
                </div>
            </div>

            <!-- Convert Excess Spins to Lottery Tokens -->
            <div class="wheel-convert-panel" style="background:rgba(0,0,0,0.25); border:1.5px dashed rgba(251,191,36,0.3); border-radius:12px; padding:0.6rem 0.75rem; margin-bottom:0.75rem; display:flex; align-items:center; justify-content:space-between; gap:0.5rem; flex-wrap:wrap;">
                <div style="text-align:left;">
                    <span style="font-size:0.72rem; color:rgba(255,255,255,0.7); font-weight:800; display:block; text-transform:uppercase; letter-spacing:0.04em;">🎫 TUKAR SPIN KE TOKEN LOTRE</span>
                    <span style="font-size:0.62rem; color:rgba(255,255,255,0.4); display:block; margin-top:2px;">10 Putaran Gratis = 1 Token | 5 Putaran Bonus = 1 Token</span>
                </div>
                <div style="display:flex; gap:0.35rem;">
                    <button id="btn-convert-free" class="bet-chip" style="font-size:0.68rem; padding:4px 8px; font-weight:800; color:#60a5fa; border-color:rgba(59,130,246,0.3); background:rgba(59,130,246,0.08);" ${this.freeSpinsRemaining < 10 ? 'disabled' : ''}>🎁 TUKAR FREE</button>
                    <button id="btn-convert-bonus" class="bet-chip" style="font-size:0.68rem; padding:4px 8px; font-weight:800; color:#f472b6; border-color:rgba(236,72,153,0.3); background:rgba(236,72,153,0.08);" ${this.bonusSpinsRemaining < 5 ? 'disabled' : ''}>🔥 TUKAR BONUS</button>
                </div>
            </div>

            <!-- Bet Panel -->
            <div class="wheel-bet-panel">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem; flex-wrap:wrap; gap:0.25rem;">
                    <label style="font-size:0.68rem; color:rgba(255,255,255,0.5); font-weight:700; text-transform:uppercase; letter-spacing:0.08em;">TARUHAN</label>
                    <div style="display:flex; gap:0.25rem; align-items:center;">
                        <span style="font-size:0.85rem; font-weight:900; color:#ec4899; margin-right:4px;">TC</span>
                        <input type="text" id="wheel-bet-input" value="100,000" style="background:transparent; border:none; font-size:1.3rem; font-weight:900; color:#fff; width:130px; text-align:right; border-bottom:1.5px solid rgba(236,72,153,0.4); outline:none; padding:0.1rem 0;" ${this.freeSpinsRemaining > 0 || this.bonusSpinsRemaining > 0 ? 'disabled' : ''}>
                    </div>
                </div>
                <div style="display:flex; gap:0.35rem; justify-content:center; flex-wrap:wrap;">
                    <button class="bet-chip wheel-preset" data-val="10000" style="padding:0.25rem 0.5rem; font-size:0.7rem;" ${this.freeSpinsRemaining > 0 || this.bonusSpinsRemaining > 0 ? 'disabled' : ''}>10K</button>
                    <button class="bet-chip wheel-preset" data-val="100000" style="padding:0.25rem 0.5rem; font-size:0.7rem;" ${this.freeSpinsRemaining > 0 || this.bonusSpinsRemaining > 0 ? 'disabled' : ''}>100K</button>
                    <button class="bet-chip wheel-preset" data-val="1000000" style="padding:0.25rem 0.5rem; font-size:0.7rem;" ${this.freeSpinsRemaining > 0 || this.bonusSpinsRemaining > 0 ? 'disabled' : ''}>1M</button>
                    <button class="bet-chip wheel-preset" data-val="10000000" style="padding:0.25rem 0.5rem; font-size:0.7rem;" ${this.freeSpinsRemaining > 0 || this.bonusSpinsRemaining > 0 ? 'disabled' : ''}>10M</button>
                    <button class="bet-chip bet-chip-max wheel-preset" id="btn-wheel-max" style="padding:0.25rem 0.5rem; font-size:0.7rem;" ${this.freeSpinsRemaining > 0 || this.bonusSpinsRemaining > 0 ? 'disabled' : ''}>MAX</button>
                </div>
            </div>

            <!-- Spin Button -->
            <button id="btn-wheel-spin" class="spin-btn-action-wheel" style="background:${spinBtnGrad}; box-shadow:0 4px 12px ${spinBtnShadow};">
                ${spinBtnText}
            </button>
        </div>

        <style>
            .wheel-container-wrapper {
                position:relative; 
                width:360px; 
                height:180px; 
                margin: 1rem auto 1.5rem auto;
                overflow: hidden;
                border-bottom: 3px solid #3c2419;
            }
            .wheel-pointer {
                position: absolute; 
                top: -8px; 
                left: 50%; 
                transform: translateX(-50%);
                width: 0; 
                height: 0; 
                border-left: 14px solid transparent; 
                border-right: 14px solid transparent;
                border-top: 28px solid #ec4899; 
                z-index: 5;
                filter: drop-shadow(0 3px 4px rgba(0,0,0,0.5));
            }
            .wheel-svg-box {
                width: 340px; 
                height: 340px; 
                border-radius: 50%;
                border: 6px solid #3c2419; 
                box-shadow: 0 0 20px rgba(168,85,247,0.25), inset 0 0 10px rgba(0,0,0,0.8);
                transition: transform 4s cubic-bezier(0.1, 0.8, 0.1, 1);
                transform: rotate(0deg); 
                overflow: hidden; 
                margin: 10px auto 0 auto; 
                background: #111;
            }
            .wheel-win-box {
                height: 36px; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                background: rgba(0,0,0,0.3); 
                border-radius: 8px; 
                border: 1px solid rgba(168,85,247,0.15); 
                margin-bottom: 0.6rem;
                font-family: var(--font-display, 'Russo One', sans-serif);
                letter-spacing: 0.05em;
            }
            .wheel-controls-box {
                background:rgba(0,0,0,0.2); 
                border:1px solid rgba(255,255,255,0.05); 
                border-radius:12px; 
                padding:0.75rem; 
                margin-bottom:0.75rem; 
                display:flex; 
                align-items:center; 
                justify-content:space-between; 
                gap:0.75rem; 
                flex-wrap: wrap;
            }
            .wheel-bet-panel {
                background:rgba(0,0,0,0.2); 
                border:1px solid rgba(255,255,255,0.05); 
                border-radius:12px; 
                padding:0.75rem; 
                margin-bottom:0.75rem;
            }
            .spin-btn-action-wheel {
                font-family: var(--font-display, 'Russo One', sans-serif);
                border: none; 
                font-weight: 400; 
                font-size: 1.3rem; 
                letter-spacing: 0.06em;
                padding: 0.85rem 2rem; 
                width: 100%; 
                border-radius: 10px; 
                cursor: pointer; 
                transition: all 0.25s; 
                color:#fff; 
                letter-spacing:0.05em; 
                text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            }
            .wheel-status-indicator {
                border: 1px solid; 
                padding: 0.4rem 0.75rem; 
                border-radius: 6px; 
                font-weight: 800; 
                font-size: 0.75rem; 
                margin-bottom: 0.5rem; 
                display: flex; 
                justify-content: space-between; 
                align-items: center;
            }
            .bet-chip {
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                color: rgba(255,255,255,0.8);
                font-size: 0.72rem;
                font-weight: 700;
                padding: 0.25rem 0.5rem;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .bet-chip:hover:not(:disabled) { background: rgba(236,72,153,0.15); border-color: rgba(236,72,153,0.4); color: #ec4899; }
            .bet-chip-max { background: rgba(236,72,153,0.1); border-color: rgba(236,72,153,0.3); color: #ec4899; }
            @keyframes rateGlow {
                from { box-shadow: 0 0 4px rgba(239,68,68,0.4), 0 0 10px rgba(251,191,36,0.2); transform: scale(1); }
                to { box-shadow: 0 0 12px rgba(239,68,68,0.8), 0 0 20px rgba(251,191,36,0.6); transform: scale(1.03); }
            }
            .spin-btn-action-wheel:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); }
            .spin-btn-action-wheel:active:not(:disabled) { transform: translateY(0); }
            .spin-btn-action-wheel:disabled { opacity: 0.5; cursor: not-allowed; }

            @media (max-width: 600px) {
                .wheel-container-wrapper {
                    width: 300px;
                    height: 150px;
                    margin: 0.5rem auto 1rem auto;
                }
                .wheel-pointer {
                    top: -6px;
                    border-left-width: 12px;
                    border-right-width: 12px;
                    border-top-width: 24px;
                }
                .wheel-svg-box {
                    width: 280px;
                    height: 280px;
                    border-width: 4px;
                    margin: 8px auto 0 auto;
                }
                .wheel-controls-box {
                    padding: 0.5rem;
                    margin-bottom: 0.5rem;
                    gap: 0.5rem;
                }
                .wheel-bet-panel {
                    padding: 0.5rem;
                    margin-bottom: 0.5rem;
                }
                .spin-btn-action-wheel {
                    font-size: 1rem;
                    padding: 0.65rem 1.5rem;
                }
                .wheel-win-box {
                    height: 26px;
                    margin-bottom: 0.5rem;
                }
            }
        </style>
        `;
    }

    bindEvents(container, onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;

        // Initialize PixiJS WebGL Wheel Stage
        const canvas = container.querySelector('#wheel-pixi-canvas');
        const fallback = container.querySelector('#wheel-svg-fallback');
        if (canvas && typeof window !== 'undefined' && window.PIXI) {
            try {
                this.pixiWheel?.destroy();
                this.pixiWheel = new PixiWheelStage(canvas, SECTORS, { size: 320 });
                canvas.style.display = 'block';
                if (fallback) fallback.style.display = 'none';
            } catch (err) {
                console.warn('[WheelEngine] PixiJS WebGL init failed, using SVG fallback:', err);
                if (canvas) canvas.style.display = 'none';
                if (fallback) fallback.style.display = 'block';
            }
        } else {
            if (canvas) canvas.style.display = 'none';
            if (fallback) fallback.style.display = 'block';
        }

        const betInput = document.getElementById('wheel-bet-input');
        if (betInput) {
            import('../ui/UIManager.js').then(m => m.default.setupNumericInput(betInput));
        }

        container.querySelectorAll('.wheel-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isSpinning) return;
                const balance = gameState.getBalance();
                const input = document.getElementById('wheel-bet-input');
                if (!input) return;
                if (btn.id === 'btn-wheel-max') {
                    input.value = balance.toLocaleString('en-US');
                } else {
                    input.value = parseInt(btn.dataset.val).toLocaleString('en-US');
                }
                input.dispatchEvent(new Event('input'));
            });
        });

        document.getElementById('btn-wheel-spin')?.addEventListener('click', () => {
            if (this.isSpinning) {
                this.skipRequested = true;
                const spinBtn = document.getElementById('btn-wheel-spin');
                if (spinBtn) {
                    spinBtn.disabled = true;
                    spinBtn.innerHTML = '🔮 MENYELESAIKAN...';
                }
            } else {
                this.stopAutoSpin();
                this.spin();
            }
        });

        // Convert Free Spins
        const convertFreeBtn = document.getElementById('btn-convert-free');
        if (convertFreeBtn) {
            convertFreeBtn.addEventListener('click', () => {
                if (this.isSpinning) return;
                if (this.freeSpinsRemaining >= 10) {
                    this.freeSpinsRemaining -= 10;
                    this.lotteryTokens += 1;
                    ui.success('Berhasil menukarkan 10 Putaran Gratis menjadi 1 Token Lotre! 🎫', 'Tukar Token');
                    // Refresh view
                    const gamePanel = document.getElementById('casino-game-panel');
                    if (gamePanel) {
                        gamePanel.innerHTML = this.getHTML();
                        this.bindEvents(gamePanel, this.onBalanceRefresh);
                    }
                }
            });
        }

        // Convert Bonus Spins
        const convertBonusBtn = document.getElementById('btn-convert-bonus');
        if (convertBonusBtn) {
            convertBonusBtn.addEventListener('click', () => {
                if (this.isSpinning) return;
                if (this.bonusSpinsRemaining >= 5) {
                    this.bonusSpinsRemaining -= 5;
                    this.lotteryTokens += 1;
                    ui.success('Berhasil menukarkan 5 Putaran Bonus menjadi 1 Token Lotre! 🎫', 'Tukar Token');
                    // Refresh view
                    const gamePanel = document.getElementById('casino-game-panel');
                    if (gamePanel) {
                        gamePanel.innerHTML = this.getHTML();
                        this.bindEvents(gamePanel, this.onBalanceRefresh);
                    }
                }
            });
        }

        // Auto Spin Buttons
        document.getElementById('btn-wheel-auto-start')?.addEventListener('click', () => {
            const countInput = document.getElementById('wheel-autospin-count');
            const count = parseInt(countInput ? countInput.value : '10', 10);
            if (isNaN(count) || count <= 0) {
                ui.error('Masukkan jumlah putaran otomatis yang valid!');
                return;
            }
            this.startAutoSpin(count);
        });

        document.getElementById('btn-wheel-auto-stop')?.addEventListener('click', () => {
            this.stopAutoSpin();
        });
    }

    startAutoSpin(count) {
        this.autoSpinCount = count;
        this.isAutoSpinning = true;

        const startBtn = document.getElementById('btn-wheel-auto-start');
        const stopBtn = document.getElementById('btn-wheel-auto-stop');
        
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) {
            stopBtn.style.display = 'block';
            stopBtn.textContent = `⏹️ STOP (${this.autoSpinCount})`;
        }

        this.spin();
    }

    stopAutoSpin() {
        this.isAutoSpinning = false;
        this.autoSpinCount = 0;

        const startBtn = document.getElementById('btn-wheel-auto-start');
        const stopBtn = document.getElementById('btn-wheel-auto-stop');
        
        if (startBtn) startBtn.style.display = 'block';
        if (stopBtn) stopBtn.style.display = 'none';
    }

    async spin() {
        if (this.isSpinning) return;

        const isFree = this.freeSpinsRemaining > 0;
        const isBonus = this.bonusSpinsRemaining > 0;
        
        const input = document.getElementById('wheel-bet-input');
        const betAmount = input?.getNumericValue ? input.getNumericValue() : (parseInt(input?.value.replace(/,/g, '') || '0', 10));

        // Validation only if spin is paid
        if (!isFree && !isBonus) {
            if (betAmount <= 0) { ui.error('Masukkan jumlah taruhan yang valid!'); this.stopAutoSpin(); return; }
            const balance = gameState.getBalance();
            if (betAmount > balance) { ui.error('Saldo tidak mencukupi!'); this.stopAutoSpin(); return; }
        }

        this.isSpinning = true;
        this.skipRequested = false;
        import('../ui/AuraSound.js').then(m => m.default.playCasinoSpin());
        const spinBtn = document.getElementById('btn-wheel-spin');
        if (spinBtn) {
            spinBtn.disabled = false;
            spinBtn.innerHTML = '⏭️ SPIN BREAK (LEWATI)';
            spinBtn.style.background = 'linear-gradient(135deg,#e11d48 0%,#9f1239 100%)';
            spinBtn.style.boxShadow = '0 4px 12px rgba(225,29,72,0.4)';
        }

        const winDisplay = document.getElementById('wheel-win-display');
        if (winDisplay) winDisplay.innerHTML = `<span style="color:rgba(255,255,255,0.3); font-size:0.75rem; font-style:italic;">Memutar roda keberuntungan...</span>`;

        // Deduct bet if not free/bonus
        if (!isFree && !isBonus) {
            financeManager.addExpense(betAmount, 'Lainnya', 'Taruhan Roda Keberuntungan');
            this.onBalanceRefresh?.();
        } else {
            // Decrement special spins remaining
            if (isBonus) {
                this.bonusSpinsRemaining--;
            } else {
                this.freeSpinsRemaining--;
            }
        }

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

        // Determine winning sector clockwise weights: rewarding, engaging, and highly satisfying hit-rate
        const weights = SECTORS.map((s) => {
            let w = 1.0;
            if (s.multiplier === 100.0) w = 0.05 * luck;
            else if (s.multiplier === 25.0) w = 0.15 * luck;
            else if (s.multiplier === 10.0) w = 0.40 * luck;
            else if (s.multiplier === 5.0) w = 0.85 * luck;
            else if (s.multiplier === 3.0) w = 1.30 * luck;
            else if (s.multiplier === 2.0) w = 1.80;
            else if (s.multiplier === 1.5) w = 2.40;
            else if (s.multiplier === 1.2) w = 2.80;
            else if (s.multiplier === 0.8) w = 2.50; // Minor rebate sector
            else if (s.type === 'freespin') w = 0.70 * luck;
            else if (s.type === 'lottery') w = 0.65 * luck;
            else if (s.type === 'bonusspin') w = 0.08 * luck;
            return w;
        });

        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let rVal = Math.random() * totalWeight;
        let selectedIdx = 0;
        for (let i = 0; i < SECTORS.length; i++) {
            if (rVal < weights[i]) {
                selectedIdx = i;
                break;
            }
            rVal -= weights[i];
        }

        const sector = SECTORS[selectedIdx];
        const anglePerSector = 360 / SECTORS.length;

        // Spin rotation physics via PixiJS WebGL or SVG fallback
        if (this.pixiWheel) {
            await this.pixiWheel.spinTo(selectedIdx, {
                duration: this.skipRequested ? 0.4 : 4.0
            });
        } else {
            const rotationTarget = 360 * 5 + (360 - (selectedIdx * anglePerSector) - (anglePerSector / 2));
            this.currentRotation += rotationTarget - (this.currentRotation % 360);

            const wheelSvg = document.getElementById('wheel-svg-container');
            if (wheelSvg) {
                wheelSvg.style.transform = `rotate(${this.currentRotation}deg)`;
            }

            let elapsed = 0;
            const checkInterval = 50;
            while (elapsed < 4000) {
                if (this.skipRequested) {
                    if (wheelSvg) {
                        wheelSvg.style.transition = 'transform 0.2s cubic-bezier(0.1, 0.8, 0.1, 1)';
                        wheelSvg.style.transform = `rotate(${this.currentRotation}deg)`;
                    }
                    await new Promise(res => setTimeout(res, 200));
                    break;
                }
                await new Promise(res => setTimeout(res, checkInterval));
                elapsed += checkInterval;
            }
        }

        // Evaluate payout rewards
        const payoutMultiplier = isBonus ? 3 : 1; // 3x multiplier applied during bonus spins
        let rewardLabel = '';

        if (sector.type === 'usd') {
            const payout = Math.round(betAmount * sector.multiplier * payoutMultiplier);
            if (payout > 0) {
                financeManager.addIncome(payout, 'Investasi', `Hasil Roda: ${sector.label} (${payoutMultiplier}x multiplier)`);
                rewardLabel = `+${financeManager.formatCurrency(payout)} TC`;
                if (sector.multiplier >= 25.0) {
                    gameState.set('casino.ratePlays', 0);
                }
            }
        } 
        else if (sector.type === 'lottery') {
            const tickets = (sector.amount || 5) * (isBonus ? 2 : 1);
            this.lotteryTokens += tickets;
            rewardLabel = `🎟️ +${tickets} TIKET LOTRE`;
        }
        else if (sector.type === 'freespin') {
            this.freeSpinsRemaining += 10;
            rewardLabel = `🎁 +10 PUTARAN GRATIS`;
        } 
        else if (sector.type === 'bonusspin') {
            this.bonusSpinsRemaining += 50;
            rewardLabel = `🔥 +50 PUTARAN BONUS (3X PENGALI)`;
            gameState.set('casino.ratePlays', 0);
        }

        // PixiJS & GSAP Win Celebration & Sound
        const isJackpot = sector.type === 'bonusspin' || (sector.type === 'usd' && sector.multiplier >= 25.0);
        if (isJackpot) {
            const winAmount = Math.round(betAmount * (sector.multiplier || 50) * payoutMultiplier);
            pixiEffects.celebrateWin({
                amount: winAmount,
                type: sector.multiplier >= 100.0 ? 'jackpot' : 'mega',
                onComplete: () => this.onBalanceRefresh?.()
            });
        } else {
            pixiEffects.flyChipsToHeader(winDisplay, 12);
            import('../ui/AuraSound.js').then(m => m.default.playClaimMoney());
        }

        // Win Toast & Displays with Layered Metallic Text
        if (winDisplay) {
            winDisplay.innerHTML = `<span class="win-text-gold"><span>🎉</span> <span>${sector.label}</span> <span class="win-payout-num">${rewardLabel}</span></span>`;
        }
        ui.success(`Roda mendarat di ${sector.label}! Hadiah: ${rewardLabel}`, '🎡 Roda Berputar');

        // Refresh HTML and state values
        this.onBalanceRefresh?.();

        // Refresh container structure to show new free spin / lottery badges
        const gamePanel = document.getElementById('casino-game-panel');
        if (gamePanel) {
            const activeInputVal = document.getElementById('wheel-bet-input')?.value || '100,000';
            const autoVal = document.getElementById('wheel-autospin-count')?.value || '10';

            gamePanel.innerHTML = this.getHTML();
            this.bindEvents(gamePanel, this.onBalanceRefresh);
            
            // Retain input values
            const newInput = document.getElementById('wheel-bet-input');
            if (newInput) newInput.value = activeInputVal;
            const newAuto = document.getElementById('wheel-autospin-count');
            if (newAuto) newAuto.value = autoVal;
        }

        this.isSpinning = false;
        
        // Reset spin button state
        const freshSpinBtn = document.getElementById('btn-wheel-spin');
        if (freshSpinBtn) {
            freshSpinBtn.disabled = false;
        }

        // Auto spin countdown loops
        const hasSpecialSpins = this.freeSpinsRemaining > 0 || this.bonusSpinsRemaining > 0;
        
        if (this.isAutoSpinning) {
            // If we have free/bonus spins remaining, continue without decrementing autospin count
            if (hasSpecialSpins) {
                const stopBtn = document.getElementById('btn-wheel-auto-stop');
                if (stopBtn) stopBtn.textContent = `⏹️ STOP (${this.autoSpinCount})`;
                
                setTimeout(() => {
                    if (this.isAutoSpinning) this.spin();
                }, 1500);
            } 
            // Otherwise decrement standard auto spin count
            else if (this.autoSpinCount > 1) {
                this.autoSpinCount--;
                
                const stopBtn = document.getElementById('btn-wheel-auto-stop');
                if (stopBtn) stopBtn.textContent = `⏹️ STOP (${this.autoSpinCount})`;
                
                setTimeout(() => {
                    if (this.isAutoSpinning) this.spin();
                }, 1500);
            } else {
                this.stopAutoSpin();
            }
        }
    }
}
