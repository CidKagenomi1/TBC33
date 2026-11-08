/**
 * WheelEngine.js - Refactored Luxury Spinning Wheel (Roda Keberuntungan)
 * Features:
 * - Full 360-degree WebGL / PixiJS Wheel (no visual clipping) with luxury gold bezel
 * - 12 High-Yield Sectors (100x Grand Jackpot, 25x Mega, 10x Diamond, Free & Bonus 3x Spins, Lottery Tickets)
 * - Sleek Cyber-VIP glassmorphism cockpit controls
 * - Quick Token Exchange Hub (Convert Free/Bonus spins to Lottery Tokens)
 * - Multi-speed Auto-Spin & instant Skip capabilities
 * - Fully responsive across mobile, tablet, and desktop
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
            ? `<div class="rate-badge rate-on-badge" style="display:inline-flex; align-items:center; gap:0.35rem; background:linear-gradient(135deg,#ef4444,#fbbf24); color:#fff; font-weight:900; font-size:0.75rem; padding:0.3rem 0.75rem; border-radius:999px; box-shadow:0 0 14px rgba(239,68,68,0.6); animation: rateGlow 1s ease-in-out infinite alternate; text-transform:uppercase; letter-spacing:0.06em; border: 1.5px solid #fff;">⚡ RATE ON (JACKPOT 3.5X BOOST!)</div>`
            : `<div class="rate-badge rate-off-badge" style="display:inline-flex; align-items:center; gap:0.35rem; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); color:rgba(255,255,255,0.65); font-weight:800; font-size:0.72rem; padding:0.25rem 0.6rem; border-radius:999px; text-transform:uppercase; letter-spacing:0.06em;">⚡ RATE: OFF (${plays}/250 SPINS)</div>`;
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
        // Build SVG sectors path for fallback
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
                          fill="${sec.color}" stroke="rgba(0,0,0,0.3)" stroke-width="1.5" />
                    <text x="${cx + (r * 0.62) * Math.cos((startAngle + anglePerSector/2) * Math.PI / 180)}" 
                          y="${cy + (r * 0.62) * Math.sin((startAngle + anglePerSector/2) * Math.PI / 180)}"
                          fill="${sec.text}" font-weight="900" font-size="8.5" text-anchor="middle" dominant-baseline="central"
                          transform="rotate(${(startAngle + anglePerSector/2) + 90}, ${cx + (r * 0.62) * Math.cos((startAngle + anglePerSector/2) * Math.PI / 180)}, ${cy + (r * 0.62) * Math.sin((startAngle + anglePerSector/2) * Math.PI / 180)})">
                        ${sec.label.split(' ').slice(1).join(' ')}
                    </text>
                </g>
            `;
        });

        // Special spins indicators
        let statusIndicators = '';
        if (this.freeSpinsRemaining > 0 || this.bonusSpinsRemaining > 0) {
            statusIndicators = `
                <div class="wheel-spins-strip">
                    ${this.freeSpinsRemaining > 0 ? `
                        <div class="wheel-spin-badge free-spins">
                            <span class="icon">🎁</span>
                            <div class="details">
                                <span class="lbl">PUTARAN GRATIS</span>
                                <span class="val">${this.freeSpinsRemaining} SPIN</span>
                            </div>
                        </div>
                    ` : ''}
                    ${this.bonusSpinsRemaining > 0 ? `
                        <div class="wheel-spin-badge bonus-spins">
                            <span class="icon">🔥</span>
                            <div class="details">
                                <span class="lbl">BONUS 3X LIPAT</span>
                                <span class="val">${this.bonusSpinsRemaining} SPIN</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // Determine Spin Button text & color styling
        let spinBtnText = '🎡 PUTAR RODA';
        let spinBtnClass = 'spin-normal';

        if (this.isSpinning) {
            spinBtnText = '⏭️ SPIN BREAK (LEWATI)';
            spinBtnClass = 'spin-skip';
        } else if (this.bonusSpinsRemaining > 0) {
            spinBtnText = `🔥 PUTAR BONUS 3X (${this.bonusSpinsRemaining} Sisa)`;
            spinBtnClass = 'spin-bonus';
        } else if (this.freeSpinsRemaining > 0) {
            spinBtnText = `🎁 PUTAR GRATIS (${this.freeSpinsRemaining} Sisa)`;
            spinBtnClass = 'spin-free';
        }

        return `
        <div class="wheel-suite-container">
            <!-- Top Nav Pill & Header -->
            <div class="wheel-header-area">
                <button type="button" class="btn-lobby-pill" title="Buka Menu Game (L)"><span>☰</span> LOBBY / GANTI GAME</button>
                <h3 class="wheel-title">
                    🎡 <span class="title-grad">MEGA FORTUNE WHEEL</span>
                </h3>
                <p class="wheel-subtitle">PENGALI HINGGA 100X • PUTARAN GRATIS • TIKET LOTRE</p>
                <div class="rate-status-wrap">
                    ${this.getRateStatusHTML()}
                </div>
            </div>

            ${statusIndicators}

            <!-- Center Stage: The 360-Degree Circular Wheel -->
            <div class="wheel-arena-frame">
                <div class="wheel-pointer-arrow"></div>
                <div class="wheel-bezel-ring">
                    <!-- PixiJS WebGL Canvas (Full 320x320) -->
                    <canvas id="wheel-pixi-canvas" width="320" height="320"></canvas>

                    <!-- SVG Fallback -->
                    <div id="wheel-svg-fallback" class="wheel-fallback-container">
                        <div id="wheel-svg-container" class="wheel-svg-disc" style="transform: rotate(${this.currentRotation}deg);">
                            <svg viewBox="0 0 300 300" style="width:100%; height:100%;">
                                ${paths}
                                <circle cx="150" cy="150" r="22" fill="#1c130e" stroke="#fbbf24" stroke-width="3" />
                                <circle cx="150" cy="150" r="8" fill="#ef4444" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Result Marquee Board -->
            <div id="wheel-win-display" class="wheel-marquee-box">
                <span class="marquee-placeholder">Silakan pasang taruhan dan putar roda keberuntungan...</span>
            </div>

            <!-- Glassmorphism Cockpit Control Section -->
            <div class="wheel-cockpit-grid">
                
                <!-- Quick Token Exchange Hub -->
                <div class="cockpit-card exchange-card">
                    <div class="exchange-info">
                        <span class="card-tag">🎫 TUKAR TOKEN LOTRE</span>
                        <span class="card-sub">10 Free Spin = 1 Tiket | 5 Bonus = 1 Tiket</span>
                    </div>
                    <div class="exchange-actions">
                        <button id="btn-convert-free" class="btn-token-swap free" ${this.freeSpinsRemaining < 10 ? 'disabled' : ''}>
                            <span>🎁</span> +1 Token (10 Free)
                        </button>
                        <button id="btn-convert-bonus" class="btn-token-swap bonus" ${this.bonusSpinsRemaining < 5 ? 'disabled' : ''}>
                            <span>🔥</span> +1 Token (5 Bonus)
                        </button>
                    </div>
                </div>

                <!-- Bet Setting Station -->
                <div class="cockpit-card bet-card">
                    <div class="bet-header-row">
                        <span class="card-tag">TARUHAN PUTARAN</span>
                        <div class="bet-input-wrap">
                            <span class="currency-tag">TC</span>
                            <input type="text" id="wheel-bet-input" value="100,000" ${this.freeSpinsRemaining > 0 || this.bonusSpinsRemaining > 0 ? 'disabled' : ''}>
                        </div>
                    </div>
                    <div class="bet-presets-row">
                        <button class="bet-chip wheel-preset" data-val="10000" ${this.freeSpinsRemaining > 0 || this.bonusSpinsRemaining > 0 ? 'disabled' : ''}>10K</button>
                        <button class="bet-chip wheel-preset" data-val="100000" ${this.freeSpinsRemaining > 0 || this.bonusSpinsRemaining > 0 ? 'disabled' : ''}>100K</button>
                        <button class="bet-chip wheel-preset" data-val="1000000" ${this.freeSpinsRemaining > 0 || this.bonusSpinsRemaining > 0 ? 'disabled' : ''}>1M</button>
                        <button class="bet-chip wheel-preset" data-val="10000000" ${this.freeSpinsRemaining > 0 || this.bonusSpinsRemaining > 0 ? 'disabled' : ''}>10M</button>
                        <button class="bet-chip bet-chip-max wheel-preset" id="btn-wheel-max" ${this.freeSpinsRemaining > 0 || this.bonusSpinsRemaining > 0 ? 'disabled' : ''}>MAX</button>
                    </div>
                </div>

                <!-- Auto-Spin & Main Action Footer -->
                <div class="cockpit-card auto-action-card">
                    <div class="autospin-row">
                        <div class="autospin-input-group">
                            <span class="card-tag">AUTO SPIN</span>
                            <div class="stepper-wrap">
                                <input type="number" id="wheel-autospin-count" value="10" min="1" max="500">
                                <span class="stepper-unit">PUTARAN</span>
                            </div>
                        </div>
                        <div class="autospin-btn-group">
                            <button id="btn-wheel-auto-start" class="btn-autospin-start">🤖 JALANKAN AUTO</button>
                            <button id="btn-wheel-auto-stop" class="btn-autospin-stop" style="display:none;">⏹️ BERHENTI (0)</button>
                        </div>
                    </div>

                    <!-- Big Vibrant Spin Button -->
                    <button id="btn-wheel-spin" class="main-spin-action ${spinBtnClass}">
                        ${spinBtnText}
                    </button>
                </div>

            </div>
        </div>

        <style>
            .wheel-suite-container {
                max-width: 580px;
                margin: 0 auto;
                text-align: center;
                animation: fade-up 0.3s ease;
                box-sizing: border-box;
                padding-bottom: 1.5rem;
            }
            .wheel-header-area {
                margin-bottom: 0.75rem;
            }
            .wheel-title {
                font-family: var(--font-display, 'Russo One', sans-serif);
                font-weight: 900;
                color: #fff;
                font-size: 1.5rem;
                letter-spacing: -0.02em;
                margin: 0.35rem 0 0.2rem 0;
            }
            .title-grad {
                background: linear-gradient(90deg, #ec4899, #fbbf24, #a855f7);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .wheel-subtitle {
                color: rgba(255,255,255,0.45);
                font-size: 0.72rem;
                font-weight: 700;
                letter-spacing: 0.08em;
                margin-bottom: 0.4rem;
            }
            .rate-status-wrap {
                display: flex;
                justify-content: center;
                margin-top: 0.25rem;
            }

            /* Special Free & Bonus Spin Banner */
            .wheel-spins-strip {
                display: flex;
                gap: 0.5rem;
                margin-bottom: 0.75rem;
                justify-content: center;
                flex-wrap: wrap;
            }
            .wheel-spin-badge {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.4rem 0.85rem;
                border-radius: 10px;
                border: 1px solid;
                font-size: 0.75rem;
                font-weight: 800;
                background: rgba(0,0,0,0.4);
                backdrop-filter: blur(8px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
            .wheel-spin-badge.free-spins {
                border-color: rgba(59,130,246,0.4);
                color: #60a5fa;
            }
            .wheel-spin-badge.bonus-spins {
                border-color: rgba(236,72,153,0.4);
                color: #f472b6;
            }
            .wheel-spin-badge .icon { font-size: 1.1rem; }
            .wheel-spin-badge .details { text-align: left; line-height: 1.1; }
            .wheel-spin-badge .details .lbl { font-size: 0.6rem; opacity: 0.8; display: block; }
            .wheel-spin-badge .details .val { font-size: 0.88rem; color: #fff; font-weight: 900; }

            /* Wheel Arena Stage */
            .wheel-arena-frame {
                position: relative;
                width: 320px;
                height: 320px;
                margin: 0.5rem auto 1rem auto;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .wheel-pointer-arrow {
                position: absolute;
                top: -8px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 13px solid transparent;
                border-right: 13px solid transparent;
                border-top: 26px solid #ef4444;
                z-index: 10;
                filter: drop-shadow(0 3px 6px rgba(0,0,0,0.8));
            }
            .wheel-pointer-arrow::after {
                content: '';
                position: absolute;
                top: -24px;
                left: -4px;
                width: 8px;
                height: 8px;
                background: #fbbf24;
                border-radius: 50%;
            }
            .wheel-bezel-ring {
                width: 320px;
                height: 320px;
                border-radius: 50%;
                background: radial-gradient(circle, #1a1410 0%, #0c0806 100%);
                padding: 4px;
                box-shadow: 
                    0 0 0 4px #2b1d15,
                    0 0 0 6px #fbbf24,
                    0 0 25px rgba(251,191,36,0.25),
                    0 0 40px rgba(236,72,153,0.15),
                    inset 0 0 15px rgba(0,0,0,0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
                position: relative;
            }
            #wheel-pixi-canvas {
                border-radius: 50%;
                display: block;
            }
            .wheel-fallback-container {
                display: none;
                width: 100%;
                height: 100%;
                position: relative;
            }
            .wheel-svg-disc {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                transition: transform 4s cubic-bezier(0.1, 0.8, 0.1, 1);
            }

            /* Marquee Output Box */
            .wheel-marquee-box {
                min-height: 44px;
                background: rgba(18, 14, 11, 0.85);
                border: 1px solid rgba(251, 191, 36, 0.25);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0.4rem 1rem;
                margin-bottom: 0.75rem;
                box-shadow: inset 0 0 12px rgba(0,0,0,0.6);
            }
            .marquee-placeholder {
                color: rgba(255,255,255,0.35);
                font-size: 0.75rem;
                font-style: italic;
            }
            .win-text-gold {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-family: var(--font-display, 'Russo One', sans-serif);
                font-size: 1.05rem;
                font-weight: 900;
                color: #fbbf24;
                text-shadow: 0 0 12px rgba(251,191,36,0.6);
                animation: popIn 0.3s ease-out;
            }
            .win-payout-num {
                color: #10b981;
                font-size: 1.15rem;
            }

            /* Cockpit Cards */
            .wheel-cockpit-grid {
                display: flex;
                flex-direction: column;
                gap: 0.65rem;
            }
            .cockpit-card {
                background: rgba(21, 17, 13, 0.75);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 14px;
                padding: 0.75rem 1rem;
                backdrop-filter: blur(12px);
                box-shadow: 0 4px 16px rgba(0,0,0,0.35);
                text-align: left;
            }
            .card-tag {
                font-size: 0.68rem;
                color: rgba(255,255,255,0.55);
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                display: block;
            }
            .card-sub {
                font-size: 0.62rem;
                color: rgba(255,255,255,0.35);
                display: block;
                margin-top: 2px;
            }

            /* Exchange Hub */
            .exchange-card {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 0.5rem;
                flex-wrap: wrap;
                background: linear-gradient(135deg, rgba(236,72,153,0.06) 0%, rgba(26,18,22,0.6) 100%);
                border-color: rgba(236,72,153,0.25);
            }
            .exchange-actions {
                display: flex;
                gap: 0.4rem;
            }
            .btn-token-swap {
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.12);
                color: #fff;
                font-size: 0.68rem;
                font-weight: 800;
                padding: 0.35rem 0.6rem;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                display: inline-flex;
                align-items: center;
                gap: 0.25rem;
            }
            .btn-token-swap.free { color: #60a5fa; border-color: rgba(59,130,246,0.35); }
            .btn-token-swap.bonus { color: #f472b6; border-color: rgba(236,72,153,0.35); }
            .btn-token-swap:hover:not(:disabled) {
                background: rgba(255,255,255,0.12);
                transform: translateY(-1px);
            }
            .btn-token-swap:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }

            /* Bet Setting Card */
            .bet-header-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }
            .bet-input-wrap {
                display: flex;
                align-items: center;
                gap: 0.3rem;
                border-bottom: 1.5px solid rgba(236,72,153,0.5);
                padding-bottom: 2px;
            }
            .currency-tag {
                color: #ec4899;
                font-weight: 900;
                font-size: 0.95rem;
            }
            #wheel-bet-input {
                background: transparent;
                border: none;
                font-size: 1.25rem;
                font-weight: 900;
                color: #fff;
                width: 130px;
                text-align: right;
                outline: none;
                font-family: var(--font-num, monospace);
            }
            .bet-presets-row {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 0.35rem;
            }
            .bet-chip {
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.1);
                color: rgba(255,255,255,0.85);
                font-size: 0.72rem;
                font-weight: 800;
                padding: 0.35rem 0.2rem;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                text-align: center;
            }
            .bet-chip:hover:not(:disabled) {
                background: rgba(236,72,153,0.18);
                border-color: #ec4899;
                color: #fff;
            }
            .bet-chip-max {
                background: rgba(251,191,36,0.12);
                border-color: rgba(251,191,36,0.35);
                color: #fbbf24;
            }
            .bet-chip:disabled {
                opacity: 0.35;
                cursor: not-allowed;
            }

            /* Auto-spin and Spin Button */
            .auto-action-card {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }
            .autospin-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 0.75rem;
                padding-bottom: 0.5rem;
                border-bottom: 1px solid rgba(255,255,255,0.06);
            }
            .autospin-input-group {
                display: flex;
                flex-direction: column;
                gap: 0.2rem;
            }
            .stepper-wrap {
                display: flex;
                align-items: center;
                gap: 0.35rem;
            }
            #wheel-autospin-count {
                width: 60px;
                background: rgba(0,0,0,0.4);
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 6px;
                color: #fff;
                font-size: 0.88rem;
                font-weight: 800;
                text-align: center;
                padding: 0.2rem;
            }
            .stepper-unit {
                font-size: 0.65rem;
                color: rgba(255,255,255,0.4);
                font-weight: 700;
            }
            .autospin-btn-group {
                display: flex;
                gap: 0.4rem;
            }
            .btn-autospin-start, .btn-autospin-stop {
                font-size: 0.75rem;
                font-weight: 800;
                padding: 0.4rem 0.85rem;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                border: 1px solid;
            }
            .btn-autospin-start {
                background: rgba(168,85,247,0.15);
                border-color: rgba(168,85,247,0.35);
                color: #c084fc;
            }
            .btn-autospin-start:hover {
                background: rgba(168,85,247,0.25);
                border-color: #a855f7;
            }
            .btn-autospin-stop {
                background: rgba(239,68,68,0.15);
                border-color: rgba(239,68,68,0.4);
                color: #ef4444;
            }

            /* Main Spin Button */
            .main-spin-action {
                font-family: var(--font-display, 'Russo One', sans-serif);
                width: 100%;
                border: none;
                border-radius: 12px;
                padding: 0.95rem 1.5rem;
                font-size: 1.25rem;
                letter-spacing: 0.05em;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                color: #fff;
                text-shadow: 0 1px 3px rgba(0,0,0,0.6);
            }
            .main-spin-action.spin-normal {
                background: linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f43f5e 100%);
                box-shadow: 0 4px 18px rgba(236,72,153,0.4);
            }
            .main-spin-action.spin-skip {
                background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%);
                box-shadow: 0 4px 18px rgba(239,68,68,0.45);
            }
            .main-spin-action.spin-free {
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                box-shadow: 0 4px 18px rgba(59,130,246,0.5);
            }
            .main-spin-action.spin-bonus {
                background: linear-gradient(135deg, #ec4899 0%, #be123c 100%);
                box-shadow: 0 4px 20px rgba(236,72,153,0.6);
                animation: rateGlow 1.2s infinite alternate;
            }
            .main-spin-action:hover:not(:disabled) {
                transform: translateY(-2px);
                filter: brightness(1.1);
            }
            .main-spin-action:active:not(:disabled) {
                transform: translateY(0);
            }
            .main-spin-action:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            @media (max-width: 480px) {
                .wheel-arena-frame {
                    width: 290px;
                    height: 290px;
                }
                .wheel-bezel-ring {
                    width: 290px;
                    height: 290px;
                }
                #wheel-pixi-canvas {
                    width: 280px !important;
                    height: 280px !important;
                }
                .main-spin-action {
                    font-size: 1.1rem;
                    padding: 0.85rem 1rem;
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
            stopBtn.style.display = 'inline-block';
            stopBtn.textContent = `⏹️ STOP (${this.autoSpinCount})`;
        }

        this.spin();
    }

    stopAutoSpin() {
        this.isAutoSpinning = false;
        this.autoSpinCount = 0;

        const startBtn = document.getElementById('btn-wheel-auto-start');
        const stopBtn = document.getElementById('btn-wheel-auto-stop');
        
        if (startBtn) startBtn.style.display = 'inline-block';
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
            spinBtn.className = 'main-spin-action spin-skip';
        }

        const winDisplay = document.getElementById('wheel-win-display');
        if (winDisplay) winDisplay.innerHTML = `<span class="marquee-placeholder">Memutar roda keberuntungan...</span>`;

        // Deduct bet if not free/bonus
        if (!isFree && !isBonus) {
            financeManager.addExpense(betAmount, 'Lainnya', 'Taruhan Roda Keberuntungan');
            this.onBalanceRefresh?.();
        } else {
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

        // Sector weights
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
            else if (s.multiplier === 0.8) w = 2.50;
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

        // Spin rotation physics
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

        // Payout evaluation
        const payoutMultiplier = isBonus ? 3 : 1;
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
            rewardLabel = `🔥 +50 PUTARAN BONUS (3X)`;
            gameState.set('casino.ratePlays', 0);
        }

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

        if (winDisplay) {
            winDisplay.innerHTML = `<span class="win-text-gold"><span>🎉</span> <span>${sector.label}</span> <span class="win-payout-num">${rewardLabel}</span></span>`;
        }
        ui.success(`Roda mendarat di ${sector.label}! Hadiah: ${rewardLabel}`, '🎡 Roda Berputar');

        this.onBalanceRefresh?.();

        const gamePanel = document.getElementById('casino-game-panel');
        if (gamePanel) {
            const activeInputVal = document.getElementById('wheel-bet-input')?.value || '100,000';
            const autoVal = document.getElementById('wheel-autospin-count')?.value || '10';

            gamePanel.innerHTML = this.getHTML();
            this.bindEvents(gamePanel, this.onBalanceRefresh);
            
            const newInput = document.getElementById('wheel-bet-input');
            if (newInput) newInput.value = activeInputVal;
            const newAuto = document.getElementById('wheel-autospin-count');
            if (newAuto) newAuto.value = autoVal;
        }

        this.isSpinning = false;
        
        const freshSpinBtn = document.getElementById('btn-wheel-spin');
        if (freshSpinBtn) {
            freshSpinBtn.disabled = false;
        }

        const hasSpecialSpins = this.freeSpinsRemaining > 0 || this.bonusSpinsRemaining > 0;
        
        if (this.isAutoSpinning) {
            if (hasSpecialSpins) {
                const stopBtn = document.getElementById('btn-wheel-auto-stop');
                if (stopBtn) stopBtn.textContent = `⏹️ STOP (${this.autoSpinCount})`;
                
                setTimeout(() => {
                    if (this.isAutoSpinning) this.spin();
                }, 1400);
            } else if (this.autoSpinCount > 1) {
                this.autoSpinCount--;
                const stopBtn = document.getElementById('btn-wheel-auto-stop');
                if (stopBtn) stopBtn.textContent = `⏹️ STOP (${this.autoSpinCount})`;
                
                setTimeout(() => {
                    if (this.isAutoSpinning) this.spin();
                }, 1400);
            } else {
                this.stopAutoSpin();
            }
        }
    }
}
