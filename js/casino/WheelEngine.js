/**
 * WheelEngine.js - Dual-Wheel Luxury Fortune Terminal
 * Features:
 * - 2 Separate Wheels:
 *   1) 👑 RODA UTAMA (VIP Cash Wheel): High-stakes multipliers (100x Grand Jackpot, 25x Mega, 10x, 5x, 3x, 2x, 1.5x, 1.2x, Free Spins, Lottery Tokens)
 *   2) 🎁 RODA BONUS & PUTARAN GRATIS (Dedicated Free Spin Wheel): Special wheel for free spins with pure rewards (TC Cash, Token Lotre, Extra Spins)
 * - FULL AUTO-SPIN SUPPORT on BOTH Wheels (including auto-spinning through all available Free Spins!)
 * - NO PAGE / WHEEL RESET ON STOP: Updates UI state selectively in-place without rebuilding the DOM or destroying the canvas rotation angle!
 * - Toggle mode buttons (Main VIP Wheel vs Dedicated Free Wheel)
 * - Smooth WebGL PixiJS rendering + SVG fallback
 */

import financeManager from '../finance/FinanceManager.js';
import gameState from '../core/GameState.js';
import ui from '../ui/UIManager.js';
import PixiWheelStage from '../graphics/PixiWheelStage.js';
import pixiEffects from '../graphics/PixiEffects.js';
import casinoVolatility from './CasinoVolatilityEngine.js';
import mobileHandler from '../ui/MobileHandler.js';

// 1) Roda Utama (VIP Wheel - Memakai Taruhan Kas)
const MAIN_SECTORS = [
    { label: '🏆 100x', multiplier: 100.0, color: '#fbbf24', text: '#000', type: 'usd' },        // Grand Jackpot Gold
    { label: '🪙 1.5x', multiplier: 1.5,   color: '#10b981', text: '#fff', type: 'usd' },        // Emerald Safe Win
    { label: '⭐ 5.0x', multiplier: 5.0,   color: '#8b5cf6', text: '#fff', type: 'usd' },        // Violet Strike
    { label: '🪙 1.2x', multiplier: 1.2,   color: '#06b6d4', text: '#fff', type: 'usd' },        // Cyan Quick Win
    { label: '🎁 5 FREE', multiplier: 0, amount: 5, color: '#3b82f6', text: '#fff', type: 'freespin' },   // Free Spins Ticket
    { label: '👑 25.0x', multiplier: 25.0, color: '#f59e0b', text: '#000', type: 'usd' },        // Amber Mega
    { label: '🪙 2.0x', multiplier: 2.0,   color: '#84cc16', text: '#000', type: 'usd' },        // Lime Double
    { label: '🎟️ 5 TIKET', multiplier: 0, amount: 5, color: '#f43f5e', text: '#fff', type: 'lottery' }, // Rose Tickets
    { label: '⭐ 3.0x', multiplier: 3.0,   color: '#f97316', text: '#fff', type: 'usd' },        // Orange Triple
    { label: '🪙 0.8x', multiplier: 0.8,   color: '#64748b', text: '#fff', type: 'usd' },        // Slate Rebate
    { label: '💎 10.0x', multiplier: 10.0, color: '#0ea5e9', text: '#fff', type: 'usd' },        // Sky Diamond
    { label: '🎁 10 FREE', multiplier: 0, amount: 10, color: '#ec4899', text: '#fff', type: 'freespin' }  // 10 Free Spins
];

// 2) Roda Terpisah Khusus Putaran Gratis (Dedicated Free Spin Wheel - Tanpa Taruhan Kas)
const FREE_SECTORS = [
    { label: '💎 $500K TC', fixedCash: 500000, color: '#0ea5e9', text: '#fff', type: 'cash' },
    { label: '🎟️ 1 TIKET', amount: 1, color: '#f43f5e', text: '#fff', type: 'lottery' },
    { label: '⭐ $100K TC', fixedCash: 100000, color: '#8b5cf6', text: '#fff', type: 'cash' },
    { label: '🎁 +2 SPIN', amount: 2, color: '#3b82f6', text: '#fff', type: 'freespin' },
    { label: '👑 $1M TC', fixedCash: 1000000, color: '#f59e0b', text: '#000', type: 'cash' },
    { label: '🎟️ 3 TIKET', amount: 3, color: '#ec4899', text: '#fff', type: 'lottery' },
    { label: '🪙 $250K TC', fixedCash: 250000, color: '#10b981', text: '#fff', type: 'cash' },
    { label: '🎁 +5 SPIN', amount: 5, color: '#06b6d4', text: '#fff', type: 'freespin' },
    { label: '⭐ $50K TC', fixedCash: 50000, color: '#64748b', text: '#fff', type: 'cash' },
    { label: '🏆 $5M JACKPOT', fixedCash: 5000000, color: '#fbbf24', text: '#000', type: 'cash' }
];

export class WheelEngine {
    constructor(onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;
        this.activeWheelMode = 'main'; // 'main' | 'free'
        this.isSpinning = false;
        this.currentRotation = 0;
        this.autoSpinCount = 0;
        this.isAutoSpinning = false;
        this.skipRequested = false;
        this.pixiWheel = null;
    }

    getActiveSectors() {
        return this.activeWheelMode === 'free' ? FREE_SECTORS : MAIN_SECTORS;
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
    get lotteryTokens() {
        return gameState.get('casino.lotteryTokens') || 0;
    }
    set lotteryTokens(val) {
        gameState.set('casino.lotteryTokens', Math.max(0, val));
    }

    renderSVGSectors(sectors) {
        let paths = '';
        const cx = 150;
        const cy = 150;
        const r = 140;
        const totalSectors = sectors.length;
        const anglePerSector = 360 / totalSectors;

        sectors.forEach((sec, i) => {
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
        return paths;
    }

    getHTML() {
        const isFreeMode = this.activeWheelMode === 'free';
        const sectors = this.getActiveSectors();
        const paths = this.renderSVGSectors(sectors);

        return `
        <div class="wheel-suite-container">
            <!-- Header Bar -->
            <div class="wheel-header-area">
                <button type="button" class="btn-lobby-pill" title="Buka Menu Game (L)"><span>☰</span> LOBBY / GANTI GAME</button>
                <h3 class="wheel-title">
                    🎡 <span class="title-grad">${isFreeMode ? 'RODA HADIAH GRATIS' : 'RODA UTAMA VIP'}</span>
                </h3>
                <p class="wheel-subtitle">${isFreeMode ? 'RODA KHUSUS TIKET SPIN GRATIS • HADIAH KAS MURNI &amp; TIKET LOTRE' : 'TARUHAN KAS • MULTIPLIER 100X • PUTARAN GRATIS'}</p>
                <div class="rate-status-wrap">
                    ${this.getRateStatusHTML()}
                </div>
            </div>

            <!-- Mode Switcher Tabs (Roda Utama vs Roda Free Spin) -->
            <div class="wheel-mode-switcher">
                <button class="wheel-mode-btn ${!isFreeMode ? 'active' : ''}" id="btn-switch-main-wheel">
                    <span class="mode-icon">👑</span>
                    <span class="mode-title">RODA UTAMA VIP</span>
                    <span class="mode-tag">Taruhan Kas</span>
                </button>
                <button class="wheel-mode-btn ${isFreeMode ? 'active' : ''}" id="btn-switch-free-wheel">
                    <span class="mode-icon">🎁</span>
                    <span class="mode-title">RODA PUTARAN GRATIS</span>
                    <span class="mode-tag badge-spins" id="badge-free-spins-count">${this.freeSpinsRemaining} SPIN TERSEDIA</span>
                </button>
            </div>

            <!-- Center Stage: The 360-Degree Circular Wheel -->
            <div class="wheel-arena-frame ${isFreeMode ? 'theme-free' : 'theme-main'}">
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

            <!-- Marquee Result Banner -->
            <div id="wheel-win-display" class="wheel-marquee-box">
                <span class="marquee-placeholder">${isFreeMode ? 'Putar roda gratis untuk memenangkan hadiah tanpa modal!' : 'Silakan pasang taruhan dan putar roda keberuntungan...'}</span>
            </div>

            <!-- Cockpit Controls (Sesuai Mode Aktif) -->
            <div class="wheel-cockpit-grid">

                <!-- MAIN WHEEL CONTROLS (Taruhan Kas) -->
                <div class="cockpit-card bet-card" id="main-wheel-controls" style="display:${!isFreeMode ? 'block' : 'none'};">
                    <div class="bet-header-row">
                        <span class="card-tag">TARUHAN PUTARAN</span>
                        <div class="bet-input-wrap">
                            <span class="currency-tag">TC</span>
                            <input type="text" id="wheel-bet-input" value="100,000">
                        </div>
                    </div>
                    <div class="bet-presets-row">
                        <button class="bet-chip wheel-preset" data-val="10000">10K</button>
                        <button class="bet-chip wheel-preset" data-val="100000">100K</button>
                        <button class="bet-chip wheel-preset" data-val="1000000">1M</button>
                        <button class="bet-chip wheel-preset" data-val="10000000">10M</button>
                        <button class="bet-chip bet-chip-max wheel-preset" id="btn-wheel-max">MAX</button>
                    </div>
                </div>

                <!-- FREE WHEEL NOTICE CARD -->
                <div class="cockpit-card free-wheel-card" id="free-wheel-notice" style="display:${isFreeMode ? 'flex' : 'none'};">
                    <div class="free-notice-info">
                        <span class="free-title">🎁 RODA KHUSUS PUTARAN GRATIS</span>
                        <span class="free-desc">Setiap putaran menggunakan 1 Tiket Spin Gratis. Tanpa mengurangi saldo TC Anda!</span>
                    </div>
                    <div class="free-badge-val" id="free-spins-val-box">${this.freeSpinsRemaining} SPIN</div>
                </div>

                <!-- Auto-Spin & Main Action Footer -->
                <div class="cockpit-card auto-action-card">
                    <!-- Auto Spin Row (Available on BOTH Wheels) -->
                    <div class="autospin-row" id="autospin-row-container">
                        <div class="autospin-input-group">
                            <span class="card-tag">${isFreeMode ? 'AUTO PUTAR GRATIS' : 'AUTO SPIN TARUHAN'}</span>
                            <div class="stepper-wrap">
                                <input type="number" id="wheel-autospin-count" value="${isFreeMode ? Math.max(1, this.freeSpinsRemaining) : 10}" min="1" max="500">
                                <span class="stepper-unit">PUTARAN</span>
                            </div>
                        </div>
                        <div class="autospin-btn-group">
                            <button id="btn-wheel-auto-start" class="btn-autospin-start ${isFreeMode ? 'btn-free-auto' : ''}">
                                ${isFreeMode ? '⚡ HABISKAN AUTO SPIN' : '🤖 AUTO SPIN'}
                            </button>
                            <button id="btn-wheel-auto-stop" class="btn-autospin-stop" style="display:none;">⏹️ BERHENTI (0)</button>
                        </div>
                    </div>

                    <!-- Main Action Spin Button -->
                    <button id="btn-wheel-spin" class="main-spin-action ${isFreeMode ? 'spin-free' : 'spin-normal'}" ${isFreeMode && this.freeSpinsRemaining <= 0 ? 'disabled' : ''}>
                        ${isFreeMode ? `🎁 PUTAR GRATIS (${this.freeSpinsRemaining} Sisa)` : '🎡 PUTAR RODA VIP'}
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
            .wheel-header-area { margin-bottom: 0.6rem; }
            .wheel-title {
                font-family: var(--font-display, 'Russo One', sans-serif);
                font-size: 1.5rem;
                font-weight: 900;
                margin: 0.35rem 0 0.15rem 0;
            }
            .title-grad {
                background: linear-gradient(90deg, #ec4899, #fbbf24, #a855f7);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .wheel-subtitle {
                color: rgba(255,255,255,0.45);
                font-size: 0.7rem;
                font-weight: 700;
                letter-spacing: 0.08em;
                margin-bottom: 0.4rem;
            }
            .rate-status-wrap { display: flex; justify-content: center; }

            /* Mode Switcher Tabs */
            .wheel-mode-switcher {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 0.5rem;
                margin-bottom: 0.85rem;
            }
            .wheel-mode-btn {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                padding: 0.6rem 0.5rem;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.15rem;
            }
            .wheel-mode-btn:hover {
                background: rgba(255,255,255,0.08);
                border-color: rgba(255,255,255,0.25);
            }
            .wheel-mode-btn.active {
                background: linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(217,119,6,0.25) 100%);
                border-color: #fbbf24;
                box-shadow: 0 0 15px rgba(251,191,36,0.25);
            }
            .wheel-mode-btn .mode-icon { font-size: 1.25rem; }
            .wheel-mode-btn .mode-title {
                font-family: var(--font-display, sans-serif);
                font-size: 0.78rem;
                font-weight: 900;
                color: #fff;
            }
            .wheel-mode-btn.active .mode-title { color: #fbbf24; }
            .wheel-mode-btn .mode-tag {
                font-size: 0.62rem;
                color: rgba(255,255,255,0.5);
                font-weight: 800;
            }
            .wheel-mode-btn .mode-tag.badge-spins {
                color: #60a5fa;
                background: rgba(59,130,246,0.15);
                padding: 1px 6px;
                border-radius: 4px;
            }

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
            .wheel-arena-frame.theme-free .wheel-bezel-ring {
                box-shadow: 
                    0 0 0 4px #1e293b,
                    0 0 0 6px #3b82f6,
                    0 0 25px rgba(59,130,246,0.35),
                    0 0 40px rgba(14,165,233,0.2),
                    inset 0 0 15px rgba(0,0,0,0.9);
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
            .win-payout-num { color: #10b981; font-size: 1.15rem; }

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
            .currency-tag { color: #ec4899; font-weight: 900; font-size: 0.95rem; }
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

            /* Free Wheel Notice Card */
            .free-wheel-card {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 0.6rem;
                background: linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(14,165,233,0.05) 100%);
                border-color: rgba(59,130,246,0.3);
            }
            .free-notice-info { display: flex; flex-direction: column; gap: 2px; }
            .free-title { font-size: 0.78rem; font-weight: 900; color: #60a5fa; }
            .free-desc { font-size: 0.65rem; color: rgba(255,255,255,0.6); }
            .free-badge-val {
                font-family: var(--font-num, monospace);
                font-size: 1.15rem;
                font-weight: 900;
                color: #fff;
                background: rgba(59,130,246,0.2);
                border: 1px solid rgba(59,130,246,0.4);
                padding: 4px 10px;
                border-radius: 8px;
                white-space: nowrap;
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
            .autospin-input-group { display: flex; flex-direction: column; gap: 0.2rem; }
            .stepper-wrap { display: flex; align-items: center; gap: 0.35rem; }
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
            .stepper-unit { font-size: 0.65rem; color: rgba(255,255,255,0.4); font-weight: 700; }
            .autospin-btn-group { display: flex; gap: 0.4rem; }
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
            .btn-autospin-start.btn-free-auto {
                background: rgba(59,130,246,0.15);
                border-color: rgba(59,130,246,0.35);
                color: #60a5fa;
            }
            .btn-autospin-start:hover {
                filter: brightness(1.2);
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
            .main-spin-action.spin-free {
                background: linear-gradient(135deg, #3b82f6 0%, #0284c7 100%);
                box-shadow: 0 4px 18px rgba(59,130,246,0.45);
            }
            .main-spin-action.spin-skip {
                background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%);
                box-shadow: 0 4px 18px rgba(239,68,68,0.45);
            }
            .main-spin-action:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); }
            .main-spin-action:active:not(:disabled) { transform: translateY(0); }
            .main-spin-action:disabled { opacity: 0.45; cursor: not-allowed; }

            @media (max-width: 480px) {
                .wheel-arena-frame, .wheel-bezel-ring { width: 290px; height: 290px; }
                #wheel-pixi-canvas { width: 280px !important; height: 280px !important; }
                .main-spin-action { font-size: 1.1rem; padding: 0.85rem 1rem; }
            }
        </style>
        `;
    }

    initWheelGraphic(container) {
        const canvas = container.querySelector('#wheel-pixi-canvas');
        const fallback = container.querySelector('#wheel-svg-fallback');
        const pointerArrow = container.querySelector('.wheel-pointer-arrow');
        const sectors = this.getActiveSectors();

        if (canvas && typeof window !== 'undefined' && window.PIXI) {
            try {
                this.pixiWheel?.destroy();
                this.pixiWheel = new PixiWheelStage(canvas, sectors, { size: 320 });
                canvas.style.display = 'block';
                if (fallback) fallback.style.display = 'none';
                if (pointerArrow) pointerArrow.style.display = 'none'; // Pixi uses its internal animated flapper
            } catch (err) {
                console.warn('[WheelEngine] WebGL init fallback:', err);
                if (canvas) canvas.style.display = 'none';
                if (fallback) fallback.style.display = 'block';
                if (pointerArrow) pointerArrow.style.display = 'block';
            }
        } else {
            if (canvas) canvas.style.display = 'none';
            if (fallback) fallback.style.display = 'block';
            if (pointerArrow) pointerArrow.style.display = 'block';
        }
    }

    bindEvents(container, onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;

        // Initialize Wheel graphic stage
        this.initWheelGraphic(container);

        const betInput = document.getElementById('wheel-bet-input');
        if (betInput) {
            import('../ui/UIManager.js').then(m => m.default.setupNumericInput(betInput));
        }

        // Mode Switching
        document.getElementById('btn-switch-main-wheel')?.addEventListener('click', () => {
            if (this.isSpinning) return;
            this.switchMode('main', container);
        });

        document.getElementById('btn-switch-free-wheel')?.addEventListener('click', () => {
            if (this.isSpinning) return;
            if (this.freeSpinsRemaining <= 0) {
                ui.toast({ type: 'warning', title: 'Tiket Habis', message: 'Anda tidak memiliki Tiket Spin Gratis saat ini! Putar Roda Utama untuk mendapatkannya.' });
                return;
            }
            this.switchMode('free', container);
        });

        // Preset Chips
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

        // Spin Button Action
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

        // Auto Spin Buttons
        document.getElementById('btn-wheel-auto-start')?.addEventListener('click', () => {
            const isFree = this.activeWheelMode === 'free';
            let count = 10;
            if (isFree) {
                // In free mode, default to using all available free spins or count input
                const countInput = document.getElementById('wheel-autospin-count');
                const userVal = parseInt(countInput ? countInput.value : '0', 10);
                count = userVal > 0 ? Math.min(userVal, this.freeSpinsRemaining) : this.freeSpinsRemaining;
                if (count <= 0) {
                    ui.error('Tidak ada tiket putaran gratis yang tersisa!');
                    return;
                }
            } else {
                const countInput = document.getElementById('wheel-autospin-count');
                count = parseInt(countInput ? countInput.value : '10', 10);
                if (isNaN(count) || count <= 0) {
                    ui.error('Masukkan jumlah putaran otomatis yang valid!');
                    return;
                }
            }
            this.startAutoSpin(count);
        });

        document.getElementById('btn-wheel-auto-stop')?.addEventListener('click', () => {
            this.stopAutoSpin();
        });
    }

    switchMode(mode, container) {
        if (this.activeWheelMode === mode) return;
        this.activeWheelMode = mode;
        this.stopAutoSpin();

        // Refresh entire UI cleanly when intentionally switching mode
        container.innerHTML = this.getHTML();
        this.bindEvents(container, this.onBalanceRefresh);
    }

    startAutoSpin(count) {
        this.autoSpinCount = count;
        this.isAutoSpinning = true;
        mobileHandler.requestWakeLock('wheel-auto');
        if (mobileHandler.isMobile) {
            ui.info('Auto-Spin Roda aktif. Layar HP akan tetap terjaga sampai putaran selesai.', '📱 Layar Tetap Aktif');
        }

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
        if (!this.isSpinning) {
            mobileHandler.releaseWakeLock();
        }

        const startBtn = document.getElementById('btn-wheel-auto-start');
        const stopBtn = document.getElementById('btn-wheel-auto-stop');
        
        if (startBtn) startBtn.style.display = 'inline-block';
        if (stopBtn) stopBtn.style.display = 'none';
    }

    /**
     * UPDATE UI IN-PLACE:
     * Does NOT rebuild or re-render innerHTML of the entire wheel container!
     * Leaves the PixiJS canvas and its landing rotation angle intact!
     */
    updateUIInPlace() {
        // 1. Update Free Spins badge & counts
        const freeBadge = document.getElementById('badge-free-spins-count');
        if (freeBadge) freeBadge.textContent = `${this.freeSpinsRemaining} SPIN TERSEDIA`;
        
        const freeValBox = document.getElementById('free-spins-val-box');
        if (freeValBox) freeValBox.textContent = `${this.freeSpinsRemaining} SPIN`;

        // 2. Update Spin Button text
        const spinBtn = document.getElementById('btn-wheel-spin');
        if (spinBtn) {
            spinBtn.disabled = false;
            if (this.activeWheelMode === 'free') {
                spinBtn.className = 'main-spin-action spin-free';
                spinBtn.innerHTML = `🎁 PUTAR GRATIS (${this.freeSpinsRemaining} Sisa)`;
                if (this.freeSpinsRemaining <= 0) spinBtn.disabled = true;
            } else {
                spinBtn.className = 'main-spin-action spin-normal';
                spinBtn.innerHTML = '🎡 PUTAR RODA VIP';
            }
        }

        // 3. Update auto spin stop button text if running
        if (this.isAutoSpinning) {
            const stopBtn = document.getElementById('btn-wheel-auto-stop');
            if (stopBtn) stopBtn.textContent = `⏹️ STOP (${this.autoSpinCount})`;
        }

        // 4. Update rate status badge
        const root = document.getElementById('casino-game-panel');
        if (root) {
            const badge = root.querySelector('.rate-badge');
            if (badge) badge.outerHTML = this.getRateStatusHTML();
        }

        // 5. Update balance display at top header
        this.onBalanceRefresh?.();
    }

    async spin() {
        if (this.isSpinning) return;

        const isFreeMode = this.activeWheelMode === 'free';
        const sectors = this.getActiveSectors();
        
        const input = document.getElementById('wheel-bet-input');
        const betAmount = input?.getNumericValue ? input.getNumericValue() : (parseInt(input?.value.replace(/,/g, '') || '0', 10));

        // Validation based on mode
        if (isFreeMode) {
            if (this.freeSpinsRemaining <= 0) {
                ui.error('Tiket Putaran Gratis habis!');
                this.stopAutoSpin();
                return;
            }
        } else {
            if (betAmount <= 0) { ui.error('Masukkan jumlah taruhan yang valid!'); this.stopAutoSpin(); return; }
            const balance = gameState.getBalance();
            if (betAmount > balance) { ui.error('Saldo kas tidak mencukupi!'); this.stopAutoSpin(); return; }
        }

        this.isSpinning = true;
        this.skipRequested = false;
        mobileHandler.requestWakeLock('wheel-spin');
        import('../ui/AuraSound.js').then(m => m.default.playCasinoSpin());

        const spinBtn = document.getElementById('btn-wheel-spin');
        if (spinBtn) {
            spinBtn.disabled = false;
            spinBtn.innerHTML = '⏭️ SPIN BREAK (LEWATI)';
            spinBtn.className = 'main-spin-action spin-skip';
        }

        const winDisplay = document.getElementById('wheel-win-display');
        if (winDisplay) winDisplay.innerHTML = `<span class="marquee-placeholder">Memutar roda keberuntungan...</span>`;

        // Deduct cost
        if (isFreeMode) {
            this.freeSpinsRemaining--;
        } else {
            financeManager.addExpense(betAmount, 'Lainnya', 'Taruhan Roda Keberuntungan VIP');
            this.onBalanceRefresh?.();
        }

        // Read accumulated luck & rate status from loss pity engine
        const luckInfo = casinoVolatility.getLuckInfo();
        const luck = luckInfo.multiplier;
        const rateOn = luckInfo.isRateOn;

        // Pick Sector Index
        let selectedIdx = 0;
        if (isFreeMode) {
            // Free Spin Wheel weights
            const weights = sectors.map(s => {
                let w = 1.0;
                if (s.fixedCash === 5000000) w = 0.05 * luck;
                else if (s.fixedCash === 1000000) w = 0.25 * luck;
                else if (s.fixedCash === 500000) w = 0.60 * luck;
                else if (s.amount === 5) w = 0.50 * luck;
                else if (s.type === 'lottery') w = 0.90 * luck;
                return w;
            });
            const totalWeight = weights.reduce((a, b) => a + b, 0);
            let rVal = Math.random() * totalWeight;
            for (let i = 0; i < sectors.length; i++) {
                if (rVal < weights[i]) { selectedIdx = i; break; }
                rVal -= weights[i];
            }
        } else {
            // Main VIP Wheel weights
            const weights = sectors.map((s) => {
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
                else if (s.type === 'freespin') w = 0.80 * luck;
                else if (s.type === 'lottery') w = 0.70 * luck;
                return w;
            });
            const totalWeight = weights.reduce((a, b) => a + b, 0);
            let rVal = Math.random() * totalWeight;
            for (let i = 0; i < sectors.length; i++) {
                if (rVal < weights[i]) { selectedIdx = i; break; }
                rVal -= weights[i];
            }
        }

        const sector = sectors[selectedIdx];
        const anglePerSector = 360 / sectors.length;

        // Spin rotation physics without resetting
        if (this.pixiWheel) {
            await this.pixiWheel.spinTo(selectedIdx, {
                duration: this.skipRequested ? 0.35 : null
            });
        } else {
            // Natural landing jitter within the selected wedge (-30% to +30%)
            const jitter = (Math.random() - 0.5) * (anglePerSector * 0.60);
            const targetNorm = ((360 - (selectedIdx + 0.5) * anglePerSector + jitter) % 360 + 360) % 360;
            const curNorm = ((this.currentRotation % 360) + 360) % 360;
            let delta = ((targetNorm - curNorm + 360) % 360);
            if (delta < 45) delta += 360;

            const extraSpins = (5 + Math.floor(Math.random() * 3)) * 360;
            const finalRotation = this.currentRotation + extraSpins + delta;
            this.currentRotation = finalRotation;

            const wheelSvg = document.getElementById('wheel-svg-container');
            if (wheelSvg) {
                wheelSvg.style.transition = this.skipRequested 
                    ? 'transform 0.35s cubic-bezier(0.1, 0.8, 0.1, 1)' 
                    : 'transform 3.8s cubic-bezier(0.12, 0.8, 0.2, 1)';
                wheelSvg.style.transform = `rotate(${this.currentRotation}deg)`;
            }

            let elapsed = 0;
            const checkInterval = 50;
            const targetDuration = this.skipRequested ? 350 : 3800;
            while (elapsed < targetDuration) {
                if (this.skipRequested && elapsed > 350) break;
                await new Promise(res => setTimeout(res, checkInterval));
                elapsed += checkInterval;
            }
        }

        // Payout Rewards Evaluation
        let rewardLabel = '';

        if (isFreeMode) {
            if (sector.type === 'cash') {
                financeManager.addIncome(sector.fixedCash, 'Investasi', `Hadiah Roda Gratis: ${sector.label}`);
                rewardLabel = `+${financeManager.formatCurrency(sector.fixedCash)} TC`;
            } else if (sector.type === 'lottery') {
                this.lotteryTokens += sector.amount;
                rewardLabel = `🎟️ +${sector.amount} TIKET LOTRE`;
            } else if (sector.type === 'freespin') {
                this.freeSpinsRemaining += sector.amount;
                rewardLabel = `🎁 +${sector.amount} TIKET PUTARAN GRATIS`;
            }
        } else {
            if (sector.type === 'usd') {
                const payout = Math.round(betAmount * sector.multiplier);
                if (payout > 0) {
                    financeManager.addIncome(payout, 'Investasi', `Hasil Roda VIP: ${sector.label}`);
                    rewardLabel = `+${financeManager.formatCurrency(payout)} TC`;
                    if (sector.multiplier >= 25.0) gameState.set('casino.ratePlays', 0);
                }
            } else if (sector.type === 'lottery') {
                this.lotteryTokens += sector.amount;
                rewardLabel = `🎟️ +${sector.amount} TIKET LOTRE`;
            } else if (sector.type === 'freespin') {
                this.freeSpinsRemaining += sector.amount;
                rewardLabel = `🎁 +${sector.amount} TIKET PUTARAN GRATIS!`;
            }
        }

        // Celebration & Effects & Rate Pity Tracking
        const isJackpot = (!isFreeMode && sector.multiplier >= 25.0) || (isFreeMode && sector.fixedCash >= 1000000);
        if (isJackpot) {
            casinoVolatility.recordBigWin();
            const winAmount = isFreeMode ? sector.fixedCash : Math.round(betAmount * sector.multiplier);
            pixiEffects.celebrateWin({
                amount: winAmount,
                type: (sector.multiplier >= 100.0 || sector.fixedCash >= 5000000) ? 'jackpot' : 'mega',
                onComplete: () => this.onBalanceRefresh?.()
            });
        } else {
            if (!isFreeMode && sector.type === 'usd' && sector.multiplier < 1.0) {
                // Net loss (e.g. 0.8x rebate)
                casinoVolatility.recordLoss();
            }
            pixiEffects.flyChipsToHeader(winDisplay, 12);
            import('../ui/AuraSound.js').then(m => m.default.playClaimMoney());
        }

        // Refresh rate badges
        const badge = document.querySelector('.rate-badge');
        if (badge) badge.outerHTML = this.getRateStatusHTML();
        const headerRate = document.getElementById('header-rate-badge-container');
        if (headerRate) headerRate.innerHTML = this.getRateStatusHTML();

        // Update Marquee Win Box
        if (winDisplay) {
            winDisplay.innerHTML = `<span class="win-text-gold"><span>🎉</span> <span>${sector.label}</span> <span class="win-payout-num">${rewardLabel}</span></span>`;
        }
        ui.success(`Roda mendarat di ${sector.label}! Hadiah: ${rewardLabel}`, '🎡 Hasil Putaran');

        this.isSpinning = false;
        if (!this.isAutoSpinning) {
            mobileHandler.releaseWakeLock();
        }

        // IN-PLACE UPDATE WITHOUT REFRESHING THE WHEEL / DOM
        this.updateUIInPlace();

        // Auto spin loop continuation (Works for BOTH Wheels!)
        if (this.isAutoSpinning) {
            if (isFreeMode) {
                // Free Spin auto loop: continues until free spins run out or user stops
                if (this.freeSpinsRemaining > 0 && this.autoSpinCount > 1) {
                    this.autoSpinCount--;
                    const stopBtn = document.getElementById('btn-wheel-auto-stop');
                    if (stopBtn) stopBtn.textContent = `⏹️ STOP (${Math.min(this.autoSpinCount, this.freeSpinsRemaining)})`;
                    
                    setTimeout(() => {
                        if (this.isAutoSpinning && this.freeSpinsRemaining > 0) this.spin();
                        else this.stopAutoSpin();
                    }, 1400);
                } else {
                    this.stopAutoSpin();
                    if (this.freeSpinsRemaining <= 0) {
                        ui.info('Semua tiket putaran gratis telah selesai diputar!', '🎁 Auto Spin Selesai');
                    }
                }
            } else {
                // Cash Wheel auto loop
                if (this.autoSpinCount > 1) {
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
}
