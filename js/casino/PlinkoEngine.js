/**
 * PlinkoEngine.js - Tiki Coco Drop Plinko Terminal (Tropical Beach Theme)
 * Features:
 * - Real-time WebGL hardware-accelerated coconut physics via PixiPlinkoStage & GSAP
 * - Multi-speed physics (1x Normal, 1.8x Cepat, 2.6x Turbo) with anti-tunneling
 * - Customizable Rows (8, 10, 12, 14, 16 Rows) & Risk Levels (Low, Medium, Sultan High 1000x)
 * - Multi-Drop Modes: 1x Drop, 🌧️ 5x Hujan, ⛈️ 10x Badai, 🌊 25x Tsunami
 * - Auto-Drop with Count Selector (10, 25, 50, 100, ∞) and live countdown
 * - Golden Coconut (Kelapa Emas) with 2x multiplier payout boost up to 2,000x Maxwin
 * - Real-time Live Multipliers Visual Strip & Payout Range Calculator
 * - Interactive Multiplier History Bar with Color Tier Pills & Win Tooltips
 * - Detailed Session Statistics Modal & Live HUD Stats Pill
 * - Spacebar hotkey drop & quick sound mute toggle
 * - Pity & Volatility Boost integration with CasinoVolatilityEngine
 */

import financeManager from '../finance/FinanceManager.js';
import gameState from '../core/GameState.js';
import ui from '../ui/UIManager.js';
import AuraSound from '../ui/AuraSound.js';
import PixiPlinkoStage from '../graphics/PixiPlinkoStage.js';
import pixiEffects from '../graphics/PixiEffects.js';
import casinoVolatility from './CasinoVolatilityEngine.js';
import rewardManager from '../rewards/RewardManager.js';

// Plinko Multiplier Tables by Rows and Risk
const MULTIPLIER_TABLES = {
    8: {
        low:    [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
        medium: [13, 3.0, 1.3, 0.7, 0.4, 0.7, 1.3, 3.0, 13],
        high:   [29, 4.0, 1.5, 0.3, 0.2, 0.3, 1.5, 4.0, 29]
    },
    10: {
        low:    [8.9, 3.0, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3.0, 8.9],
        medium: [22, 5.0, 2.0, 1.4, 0.6, 0.4, 0.6, 1.4, 2.0, 5.0, 22],
        high:   [76, 10, 3.0, 0.9, 0.3, 0.2, 0.3, 0.9, 3.0, 10, 76]
    },
    12: {
        low:    [10, 3.0, 1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3.0, 10],
        medium: [33, 11, 4.0, 2.0, 1.1, 0.6, 0.3, 0.6, 1.1, 2.0, 4.0, 11, 33],
        high:   [170, 24, 8.1, 2.0, 0.7, 0.2, 0.2, 0.2, 0.7, 2.0, 8.1, 24, 170]
    },
    14: {
        low:    [12, 4.0, 1.9, 1.4, 1.3, 1.1, 1.0, 0.5, 1.0, 1.1, 1.3, 1.4, 1.9, 4.0, 12],
        medium: [58, 15, 7.0, 4.0, 1.9, 1.0, 0.5, 0.2, 0.5, 1.0, 1.9, 4.0, 7.0, 15, 58],
        high:   [420, 56, 18, 5.0, 1.9, 0.3, 0.2, 0.2, 0.2, 0.3, 1.9, 5.0, 18, 56, 420]
    },
    16: {
        low:    [16, 9.0, 2.0, 1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2.0, 9.0, 16],
        medium: [110, 41, 10, 5.0, 3.0, 1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3.0, 5.0, 10, 41, 110],
        high:   [1000, 130, 26, 9.0, 4.0, 2.0, 0.2, 0.2, 0.2, 0.2, 0.2, 2.0, 4.0, 9.0, 26, 130, 1000]
    }
};

export class PlinkoEngine {
    constructor(onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;

        // Settings
        this.currentBet = 100000;
        this.rows = 12; // 8, 10, 12, 14, 16
        this.risk = this.getRiskFromLuck(); // Automatically determined by the game's luck system
        this.speed = 'normal'; // 'normal' (1x), 'fast' (1.8x), 'turbo' (2.6x)

        // Auto-drop state
        this.isAutoDropping = false;
        this.autoDropInterval = null;
        this.autoDropLimit = Infinity; // Infinity, 10, 25, 50, 100
        this.autoDropsCount = 0;
        this.autoDropsRemaining = Infinity;

        // Session Stats
        this.sessionDrops = 0;
        this.sessionTotalBet = 0;
        this.sessionTotalWon = 0;
        this.sessionHighestMult = 0;
        this.sessionGoldenDrops = 0;

        // History: objects { multiplier, winAmount, isGolden, timestamp }
        const rawHistory = gameState.get('casino.plinkoHistory') || [2.0, 0.5, 1.2, 0.2, 5.0, 1.5, 0.5, 10.0, 0.2, 3.0];
        this.history = rawHistory.map(item => {
            if (typeof item === 'object' && item !== null) return item;
            return {
                multiplier: Number(item) || 1.0,
                winAmount: Math.round(100000 * (Number(item) || 1.0)),
                isGolden: false
            };
        });

        // Stage & Elements
        this.pixiStage = null;
        this.containerEl = null;
        this.canvasEl = null;
        this._keyHandler = null;
    }

    getRateStatusHTML() {
        const plays = gameState.get('casino.ratePlays') || 0;
        const rateOn = plays >= 250;
        return rateOn
            ? `<div class="rate-badge rate-on-badge" title="Tingkat Kemenangan Maksimal Aktif!" style="display:inline-flex; align-items:center; gap:0.4rem; background:linear-gradient(135deg,#ef4444,#f59e0b); color:#fff; font-weight:900; font-size:0.75rem; padding:0.32rem 0.8rem; border-radius:999px; box-shadow:0 0 16px rgba(239,68,68,0.7); animation: rateGlow 1s ease-in-out infinite alternate; text-transform:uppercase; letter-spacing:0.06em; border: 1.5px solid #fff;">⚡ RATE ON: KELAPA EMAS 28% + SULTAN BOOST!</div>`
            : `<div class="rate-badge rate-off-badge" title="Mainkan putaran untuk mengaktifkan Rate On" style="display:inline-flex; align-items:center; gap:0.35rem; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.14); color:rgba(255,255,255,0.75); font-weight:800; font-size:0.72rem; padding:0.25rem 0.65rem; border-radius:999px; text-transform:uppercase; letter-spacing:0.06em;">⚡ RATE: OFF (${plays}/250 PLAYS)</div>`;
    }

    /**
     * Determines the active risk tier dynamically from the casino's luck / pity engine
     * @returns {'low'|'medium'|'high'}
     */
    getRiskFromLuck() {
        const luckInfo = casinoVolatility.getLuckInfo();
        const donationLuck = gameState.get('donations.luckMultiplier') || 1.0;
        const effectiveMultiplier = Math.max(luckInfo.multiplier, donationLuck);

        // Rate On (3.5x) or Panas (2.0x, 175+ accumulated losses) -> Sultan High Risk (1,000x Jackpot!)
        if (luckInfo.isRateOn || effectiveMultiplier >= 2.0 || luckInfo.losses >= 175) {
            return 'high';
        }
        // Hangat / Meningkat (1.25x - 1.5x, 50+ losses) -> Medium Risk
        if (effectiveMultiplier >= 1.25 || luckInfo.losses >= 50) {
            return 'medium';
        }
        // Normal baseline -> Low Risk (Safe center buckets, high hit rate)
        return 'low';
    }

    /**
     * Comprehensive luck-based risk metadata for display
     */
    getLuckRiskDetails() {
        const luckInfo = casinoVolatility.getLuckInfo();
        const risk = this.getRiskFromLuck();

        if (risk === 'high') {
            return {
                risk: 'high',
                riskLabel: 'SULTAN TINGGI (1.000×)',
                shortLabel: 'SULTAN (1.000×)',
                badgeClass: 'risk-badge-high',
                icon: luckInfo.isRateOn ? '🔥' : '⚡',
                tierName: luckInfo.tierName,
                multiplier: luckInfo.multiplier,
                desc: luckInfo.isRateOn
                    ? '⚡ RATE ON SULTAN: Peluang Maxwin Ekstrem 1.000× Terbuka Lebar!'
                    : '🔥 Hawa Panas: Potensi Maxwin Ekstrem 1.000× Aktif!',
                luckInfo
            };
        }
        if (risk === 'medium') {
            return {
                risk: 'medium',
                riskLabel: 'SEDANG (DINAMIS)',
                shortLabel: 'SEDANG (110×)',
                badgeClass: 'risk-badge-med',
                icon: '🌟',
                tierName: luckInfo.tierName,
                multiplier: luckInfo.multiplier,
                desc: '🌟 Keberuntungan Meningkat: Potensi hadiah seimbang hingga 110×!',
                luckInfo
            };
        }
        return {
            risk: 'low',
            riskLabel: 'AMAN (RENDAH)',
            shortLabel: 'AMAN (16×)',
            badgeClass: 'risk-badge-low',
            icon: '🍀',
            tierName: luckInfo.tierName,
            multiplier: luckInfo.multiplier,
            desc: '🍀 Kondisi Normal: Pengembalian stabil, risiko rendah di pusat (~0.5×–1.0×)',
            luckInfo
        };
    }

    /**
     * Synchronizes the Plinko board risk with current luck state
     */
    syncRiskWithLuck(silent = false) {
        const newRisk = this.getRiskFromLuck();
        const changed = newRisk !== this.risk;
        this.risk = newRisk;

        if (this.pixiStage) {
            this.pixiStage.rebuildBoard(this.rows, this.getActiveMultipliers());
        }

        this._updateLuckRiskUI();
        this._updateMultipliersPreviewUI();
        this._updatePotentialPayoutUI();

        if (changed && !silent) {
            const details = this.getLuckRiskDetails();
            ui.info(`⚡ Sistem Keberuntungan menyesuaikan tingkat risiko Plinko ke: ${details.riskLabel}!`, '🍀 Sistem Keberuntungan');
        }
    }

    getActiveMultipliers() {
        this.risk = this.getRiskFromLuck();
        const rowTable = MULTIPLIER_TABLES[this.rows] || MULTIPLIER_TABLES[12];
        return rowTable[this.risk] || rowTable.medium;
    }

    getMinMaxPotential() {
        const mults = this.getActiveMultipliers();
        const minMult = Math.min(...mults);
        const maxMult = Math.max(...mults);
        const minWin = Math.round(this.currentBet * minMult);
        const maxWin = Math.round(this.currentBet * maxMult * 2); // 2x for Golden Coconut!
        return { minMult, maxMult, minWin, maxWin };
    }

    /**
     * Simulates mathematical Galton/Plinko binomial distribution landing
     */
    _simulatePlinkoLanding(isGolden = false) {
        const mults = this.getActiveMultipliers();
        const n = mults.length - 1; // number of steps = this.rows
        const luckInfo = casinoVolatility.getLuckInfo();

        // Binomial roll: n trials with p ~ 0.5
        let k = 0;
        const edgeBoost = luckInfo.isRateOn ? 0.08 : (luckInfo.multiplier > 1.0 ? 0.04 : 0);
        for (let step = 0; step < n; step++) {
            let p = 0.5;
            if (edgeBoost > 0) {
                if (k > n / 2) p += edgeBoost;
                else p -= edgeBoost;
            }
            if (Math.random() < p) k++;
        }
        k = Math.max(0, Math.min(n, k));
        const multiplier = mults[k] || 1.0;
        const winAmount = Math.round(this.currentBet * multiplier * (isGolden ? 2 : 1));
        return {
            basketIndex: k,
            multiplier,
            winAmount,
            isGolden,
            bet: this.currentBet
        };
    }

    _fallbackDrop(isGolden) {
        setTimeout(() => {
            const landing = this._simulatePlinkoLanding(isGolden);
            this._handleCoconutLanding(landing);
        }, 1200);
    }

    /**
     * Drops a coconut into the stage with bet deduction & chance of Golden Coconut
     */
    dropOne() {
        // Ensure bet is synced from input if user typed without blurring
        if (this.containerEl) {
            const betInput = this.containerEl.querySelector('#plinko-bet-input');
            if (betInput) {
                const parsed = parseInt(betInput.value.replace(/\D/g, ''), 10);
                if (parsed && !isNaN(parsed)) {
                    this.currentBet = Math.max(10000, Math.min(100000000, parsed));
                }
            }
        }

        const currentBal = gameState.getBalance();
        if (this.currentBet > currentBal) {
            this.stopAutoDrop();
            ui.error(`Saldo chip tidak mencukupi untuk menjatuhkan kelapa ${financeManager.formatCurrency(this.currentBet)} TC!`);
            return false;
        }

        // Deduct bet from balance via canonical FinanceManager
        financeManager.addExpense(this.currentBet, 'Lainnya', 'Taruhan Tiki Coco Drop Plinko');
        this.sessionDrops++;
        this.sessionTotalBet += this.currentBet;
        rewardManager.trackPlinkoDrop?.(this.currentBet);

        if (this.onBalanceRefresh) this.onBalanceRefresh();

        // Golden Coconut Chance
        const luckInfo = casinoVolatility.getLuckInfo();
        const goldenChance = luckInfo.isRateOn ? 0.28 : (luckInfo.multiplier > 1.0 ? 0.12 : 0.05);
        const isGolden = Math.random() < goldenChance;

        if (isGolden) {
            this.sessionGoldenDrops++;
            ui.info('✨ KELAPA EMAS JATUH! Seluruh payout berlipat 2×!', '🥥 Golden Coconut');
        }

        if (this.pixiStage && this.pixiStage.isPixiReady) {
            this.pixiStage.dropCoconut({
                bet: this.currentBet,
                isGolden,
                onLand: (landData) => this._handleCoconutLanding(landData)
            });
        } else {
            // Robust Mathematical Fallback Drop when canvas/WebGL is offline
            this._fallbackDrop(isGolden);
        }

        this._updateStatsUI();
        return true;
    }

    /**
     * Drops a batch of coconuts simultaneously (Coconut Rain / Storm / Tsunami)
     */
    dropBatch(count = 5) {
        let dropped = 0;
        const currentBal = gameState.getBalance();
        if (this.currentBet > currentBal) {
            ui.error(`Saldo chip tidak mencukupi untuk menjatuhkan kelapa!`);
            return;
        }

        const intervalDelay = this.speed === 'turbo' ? 75 : (this.speed === 'fast' ? 115 : 155);
        const interval = setInterval(() => {
            if (dropped >= count) {
                clearInterval(interval);
                return;
            }
            if (gameState.getBalance() < this.currentBet) {
                clearInterval(interval);
                ui.warning('Saldo tidak mencukupi untuk menjatuhkan sisa kelapa!');
                return;
            }
            this.dropOne();
            dropped++;
        }, intervalDelay);
    }

    /**
     * Toggles continuous auto-dropping
     */
    toggleAutoDrop() {
        if (this.isAutoDropping) {
            this.stopAutoDrop();
        } else {
            this.startAutoDrop();
        }
    }

    startAutoDrop() {
        if (gameState.getBalance() < this.currentBet) {
            ui.error('Saldo tidak mencukupi untuk memulai Auto Drop!');
            return;
        }

        this.isAutoDropping = true;
        this.autoDropsCount = 0;
        this.autoDropsRemaining = this.autoDropLimit;

        this._updateAutoDropBtnUI();
        const ok = this.dropOne();
        if (ok) {
            this.autoDropsCount++;
            if (this.autoDropsRemaining !== Infinity) {
                this.autoDropsRemaining--;
            }
            this._updateAutoDropBtnUI();
        }

        if (this.autoDropsRemaining !== Infinity && this.autoDropsRemaining <= 0) {
            this.stopAutoDrop();
            return;
        }

        const dropInterval = this.speed === 'turbo' ? 175 : (this.speed === 'fast' ? 250 : 330);
        this.autoDropInterval = setInterval(() => {
            if (gameState.getBalance() < this.currentBet) {
                this.stopAutoDrop();
                ui.warning('Auto Drop dihentikan: Saldo chip tidak mencukupi.');
                return;
            }

            const success = this.dropOne();
            if (!success) {
                this.stopAutoDrop();
                return;
            }

            this.autoDropsCount++;
            if (this.autoDropsRemaining !== Infinity) {
                this.autoDropsRemaining--;
                if (this.autoDropsRemaining <= 0) {
                    this.stopAutoDrop();
                    ui.success(`Auto Drop selesai! (${this.autoDropsCount} kelapa dijatuhkan).`);
                    return;
                }
            }

            this._updateAutoDropBtnUI();
        }, dropInterval);
    }

    stopAutoDrop() {
        this.isAutoDropping = false;
        if (this.autoDropInterval) {
            clearInterval(this.autoDropInterval);
            this.autoDropInterval = null;
        }
        this._updateAutoDropBtnUI();
    }

    setAutoDropLimit(limit) {
        this.autoDropLimit = limit;
        if (this.containerEl) {
            this.containerEl.querySelectorAll('.btn-auto-limit').forEach(btn => {
                const val = btn.dataset.limit === 'inf' ? Infinity : parseInt(btn.dataset.limit, 10);
                btn.classList.toggle('active', val === this.autoDropLimit);
            });
        }
    }

    setSpeed(newSpeed) {
        this.speed = newSpeed;
        const mult = newSpeed === 'turbo' ? 2.6 : (newSpeed === 'fast' ? 1.8 : 1.0);
        if (this.pixiStage) {
            this.pixiStage.setSpeedMultiplier(mult);
        }
        this._updateSpeedButtonsUI();
    }

    toggleSound() {
        const isCurrentOn = gameState.get('settings.soundEnabled') !== false;
        const nextState = !isCurrentOn;
        gameState.set('settings.soundEnabled', nextState);
        if (nextState) {
            AuraSound.playTap();
            ui.info('🔊 Suara Plinko Diaktifkan');
        } else {
            ui.info('🔇 Suara Plinko Dibisukan');
        }
        this._updateSoundBtnUI();
    }

    _handleCoconutLanding(landData) {
        const { multiplier, winAmount, isGolden, basketIndex } = landData;

        // Add win amount to player balance via canonical FinanceManager
        if (winAmount > 0) {
            financeManager.addIncome(winAmount, 'Jackpot', `Plinko Tiki Coco @ ${multiplier}x`);
        }
        this.sessionTotalWon += winAmount;

        // Record highest effective multiplier
        const effectiveMult = isGolden ? multiplier * 2 : multiplier;
        if (effectiveMult > this.sessionHighestMult) {
            this.sessionHighestMult = effectiveMult;
        }

        // Volatility tracking
        if (multiplier >= 1.0) {
            casinoVolatility.recordOutcome?.(landData.bet, winAmount);
        } else {
            casinoVolatility.recordLoss?.();
        }

        rewardManager.trackPlinkoWin?.(effectiveMult, winAmount);

        if (this.onBalanceRefresh) this.onBalanceRefresh();

        // Big win celebratory overlay on 25x+
        if (effectiveMult >= 25.0) {
            pixiEffects.celebrateWin({
                amount: winAmount,
                bet: landData.bet,
                type: effectiveMult >= 100 ? 'sensational' : 'mega'
            });
        }

        // Add to history
        this.history.unshift({
            multiplier: effectiveMult,
            baseMultiplier: multiplier,
            winAmount,
            isGolden,
            timestamp: Date.now()
        });
        if (this.history.length > 20) this.history.pop();
        gameState.set('casino.plinkoHistory', this.history);

        // Highlight mini preview pill
        this._highlightMultiplierPill(basketIndex);

        this._updateHistoryUI();
        this._updateStatsUI();

        // Sync risk level dynamically with the updated luck state
        this.syncRiskWithLuck(true);
    }

    setRows(newRows) {
        if (newRows === this.rows) return;
        this.rows = newRows;
        if (this.pixiStage) {
            this.pixiStage.rebuildBoard(this.rows, this.getActiveMultipliers());
        }
        this._updateRowButtonsUI();
        this._updateMultipliersPreviewUI();
        this._updatePotentialPayoutUI();
    }

    setRisk(newRisk) {
        // Automatically determined by the game's luck system
        this.syncRiskWithLuck();
    }

    /**
     * HTML Template of Tiki Coco Drop Plinko Terminal
     */
    getHTML() {
        const luckDetails = this.getLuckRiskDetails();
        const multipliers = this.getActiveMultipliers();
        const pot = this.getMinMaxPotential();
        const soundOn = gameState.get('settings.soundEnabled') !== false;

        return `
        <div class="plinko-terminal-root">
            <!-- 1. Top HUD Header (Rate Status, Sound Toggle, Speed, Stats) -->
            <div class="plinko-top-hud">
                <div class="hud-left-group">
                    <button type="button" id="btn-plinko-sound" class="btn-plinko-hud ${soundOn ? 'sound-on' : 'sound-off'}" title="Aktif/Nonaktifkan Suara Plinko (M)">
                        <span class="hud-icon">${soundOn ? '🔊' : '🔇'}</span>
                        <span class="hud-lbl">${soundOn ? 'SUARA' : 'MUTE'}</span>
                    </button>
                    <div id="plinko-rate-pill-container" class="hud-rate-slot">
                        ${this.getRateStatusHTML()}
                    </div>
                </div>

                <div class="hud-right-group">
                    <!-- Drop Speed Selectors -->
                    <div class="speed-toggle-group" title="Kecepatan Jatuh Kelapa">
                        <span class="hud-sub-label">SPEED:</span>
                        <div class="btn-group-pills">
                            <button type="button" class="btn-pill-speed ${this.speed === 'normal' ? 'active' : ''}" data-speed="normal">1×</button>
                            <button type="button" class="btn-pill-speed ${this.speed === 'fast' ? 'active' : ''}" data-speed="fast">1.8×</button>
                            <button type="button" class="btn-pill-speed ${this.speed === 'turbo' ? 'active' : ''}" data-speed="turbo">⚡ TURBO</button>
                        </div>
                    </div>

                    <!-- Session Stats Modal Trigger -->
                    <button type="button" id="btn-plinko-stats" class="btn-plinko-hud btn-stats" title="Lihat Rekap Statistik Sesi">
                        <span class="hud-icon">📊</span>
                        <span class="hud-lbl">STATISTIK</span>
                    </button>
                </div>
            </div>

            <!-- 2. Multiplier History Bar -->
            <div class="plinko-history-bar">
                <div class="plinko-history-title">
                    <span>🥥 RIWAYAT KELAPA:</span>
                </div>
                <div class="plinko-history-scroll" id="plinko-history-container">
                    ${this._renderHistoryPillsHTML()}
                </div>
                <button type="button" id="btn-clear-plinko-hist" class="btn-clear-hist" title="Bersihkan Riwayat">
                    ✕
                </button>
            </div>

            <!-- 3. Main Tropical Plinko Board & Canvas -->
            <div class="plinko-theater-wrapper">
                <canvas id="pixi-plinko-canvas" class="pixi-plinko-canvas"></canvas>

                <!-- Tropical Canopy Header Overlay -->
                <div class="plinko-tropical-banner">
                    <span class="tropical-crest">🌴 TIKI COCONUT DROP 🥥</span>
                </div>

                <!-- Live Floating Stats Pill -->
                <div class="plinko-floating-stats" id="plinko-floating-stats" title="Statistik Sesi Live (Klik untuk detail)">
                    <span>Jatuh: <b id="stat-plinko-drops">${this.sessionDrops}</b></span>
                    <span class="stat-dot">•</span>
                    <span>Profit: <b id="stat-plinko-profit" class="${(this.sessionTotalWon - this.sessionTotalBet) >= 0 ? 'profit-pos' : 'profit-neg'}">${(this.sessionTotalWon - this.sessionTotalBet) >= 0 ? '+' : ''}${financeManager.formatCurrency(this.sessionTotalWon - this.sessionTotalBet)} TC</b></span>
                    <span class="stat-dot">•</span>
                    <span>Max: <b id="stat-plinko-max" class="max-badge">${this.sessionHighestMult > 0 ? this.sessionHighestMult + '×' : '—'}</b></span>
                </div>

                <!-- Golden Coconut Boost Ribbon -->
                <div class="plinko-golden-ribbon" title="Kelapa Emas Sultan melipatgandakan payout 2x!">
                    <span class="ribbon-sparkle">✨</span>
                    <span class="ribbon-text">KELAPA EMAS 2× BOOST</span>
                </div>
            </div>

            <!-- 4. Real-time Multiplier Visual Preview Strip -->
            <div class="plinko-multiplier-strip-wrapper">
                <div class="multiplier-strip-label">
                    <span>POTENSI CAWAN:</span>
                    <span id="plinko-potential-range" class="potential-range-text">
                        Min ${pot.minMult}× (${financeManager.formatCurrency(pot.minWin)} TC) — Max ${pot.maxMult}× (Hingga ${financeManager.formatCurrency(pot.maxWin)} TC!)
                    </span>
                </div>
                <div class="plinko-multiplier-pill-strip" id="plinko-multiplier-preview-container">
                    ${this._renderMultiplierPreviewHTML(multipliers)}
                </div>
            </div>

            <!-- 5. Tropical Control Deck (Settings, Drop Buttons & Bets) -->
            <div class="plinko-control-deck">
                <!-- Settings Bar: Rows & Risk Selectors -->
                <div class="plinko-settings-strip">
                    <div class="setting-group luck-risk-indicator-group" title="${luckDetails.desc}">
                        <div class="setting-lbl-row">
                            <span class="setting-lbl">TINGKAT RISIKO:</span>
                            <span class="luck-auto-badge">⚡ OTOMATIS SISTEM</span>
                        </div>
                        <div class="luck-risk-status-pill ${luckDetails.badgeClass}" id="plinko-luck-risk-display" title="${luckDetails.desc}">
                            <span class="luck-risk-icon">${luckDetails.icon}</span>
                            <span class="luck-risk-name">${luckDetails.riskLabel}</span>
                            <span class="luck-risk-stat">${luckDetails.tierName} (${luckDetails.multiplier}×)</span>
                        </div>
                    </div>

                    <div class="setting-group">
                        <span class="setting-lbl">BARIS PASAK:</span>
                        <div class="btn-group-pills">
                            <button type="button" class="btn-pill-rows ${this.rows === 8 ? 'active' : ''}" data-rows="8">8</button>
                            <button type="button" class="btn-pill-rows ${this.rows === 10 ? 'active' : ''}" data-rows="10">10</button>
                            <button type="button" class="btn-pill-rows ${this.rows === 12 ? 'active' : ''}" data-rows="12">12</button>
                            <button type="button" class="btn-pill-rows ${this.rows === 14 ? 'active' : ''}" data-rows="14">14</button>
                            <button type="button" class="btn-pill-rows ${this.rows === 16 ? 'active' : ''}" data-rows="16">16</button>
                        </div>
                    </div>

                    <!-- Auto-Drop Count Limit Selector -->
                    <div class="setting-group auto-count-group">
                        <span class="setting-lbl">BATAS AUTO:</span>
                        <div class="btn-group-pills">
                            <button type="button" class="btn-auto-limit ${this.autoDropLimit === 10 ? 'active' : ''}" data-limit="10">10</button>
                            <button type="button" class="btn-auto-limit ${this.autoDropLimit === 25 ? 'active' : ''}" data-limit="25">25</button>
                            <button type="button" class="btn-auto-limit ${this.autoDropLimit === 50 ? 'active' : ''}" data-limit="50">50</button>
                            <button type="button" class="btn-auto-limit ${this.autoDropLimit === 100 ? 'active' : ''}" data-limit="100">100</button>
                            <button type="button" class="btn-auto-limit ${this.autoDropLimit === Infinity ? 'active' : ''}" data-limit="inf">∞</button>
                        </div>
                    </div>
                </div>

                <!-- Bet Input & Action Buttons -->
                <div class="plinko-action-row">
                    <!-- Chip Bet Input Box -->
                    <div class="plinko-bet-box">
                        <div class="input-header-row">
                            <span class="input-lbl">NILAI TARUHAN PER KELAPA</span>
                            <span class="input-sub-tip">Min 10.000 TC</span>
                        </div>
                        <div class="input-with-icon">
                            <span class="chip-curr">🪙</span>
                            <input type="text" id="plinko-bet-input" class="plinko-num-input" value="${new Intl.NumberFormat('id-ID').format(this.currentBet)}">
                        </div>
                        <div class="quick-chip-strip">
                            <button type="button" class="btn-quick-plinko" data-min="true">MIN</button>
                            <button type="button" class="btn-quick-plinko" data-add="50000">+50K</button>
                            <button type="button" class="btn-quick-plinko" data-add="100000">+100K</button>
                            <button type="button" class="btn-quick-plinko" data-add="500000">+500K</button>
                            <button type="button" class="btn-quick-plinko" data-add="1000000">+1M</button>
                            <button type="button" class="btn-quick-plinko" data-mult="0.5">½</button>
                            <button type="button" class="btn-quick-plinko" data-mult="2">2×</button>
                            <button type="button" class="btn-quick-plinko chip-max" data-max="true">MAX</button>
                        </div>
                    </div>

                    <!-- Drop Triggers (Single, Multi 5x, 10x, 25x, Auto Drop) -->
                    <div class="plinko-drop-actions">
                        <!-- Primary Drop Button -->
                        <button type="button" id="btn-plinko-drop" class="btn-plinko-main" title="Tekan SPASI untuk menjatuhkan kelapa!">
                            <span class="btn-main-ico">🥥</span>
                            <div class="btn-text-group">
                                <div class="btn-title-row">
                                    <span class="btn-main-txt">JATUHKAN KELAPA</span>
                                    <span class="btn-hotkey-badge">SPASI</span>
                                </div>
                                <span class="btn-sub-txt">${financeManager.formatCurrency(this.currentBet)} TC</span>
                            </div>
                        </button>

                        <!-- Multi-drop & Auto-Drop Row -->
                        <div class="plinko-multi-buttons">
                            <button type="button" id="btn-plinko-rain-5" class="btn-plinko-sub" title="Jatuhkan 5 buah kelapa berturut-turut">
                                🌧️ 5x Hujan
                            </button>
                            <button type="button" id="btn-plinko-rain-10" class="btn-plinko-sub" title="Jatuhkan 10 buah kelapa berturut-turut">
                                ⛈️ 10x Badai
                            </button>
                            <button type="button" id="btn-plinko-rain-25" class="btn-plinko-sub btn-tsunami" title="Jatuhkan 25 buah kelapa badai tropis!">
                                🌊 25x Tsunami
                            </button>
                            <button type="button" id="btn-plinko-autodrop" class="btn-plinko-sub btn-autodrop ${this.isAutoDropping ? 'active' : ''}" title="Otomatis menjatuhkan kelapa secara terus-menerus (A)">
                                ${this.isAutoDropping ? `🛑 STOP (${this.autoDropsCount}/${this.autoDropLimit === Infinity ? '∞' : this.autoDropLimit})` : '🔄 AUTO DROP'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 6. Detailed Session Statistics Modal -->
            <div id="plinko-stats-modal" class="plinko-modal-backdrop" style="display:none;">
                <div class="plinko-modal-card">
                    <div class="modal-header">
                        <div class="modal-title">
                            <span>📊 STATISTIK SESI PLINKO</span>
                        </div>
                        <button type="button" id="btn-close-plinko-stats" class="btn-close-modal">✕</button>
                    </div>

                    <div class="modal-body" id="plinko-stats-modal-body">
                        ${this._renderStatsModalContentHTML()}
                    </div>

                    <div class="modal-footer">
                        <button type="button" id="btn-reset-plinko-stats" class="btn-modal-action btn-danger-soft">
                            🔄 Reset Statistik
                        </button>
                        <button type="button" id="btn-dismiss-plinko-stats" class="btn-modal-action btn-primary-soft">
                            Selesai
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    _renderHistoryPillsHTML() {
        if (!this.history || this.history.length === 0) {
            return `<div class="plinko-empty-hist">Belum ada riwayat tetesan kelapa</div>`;
        }

        return this.history.map((item) => {
            const m = typeof item === 'object' && item !== null ? item.multiplier : Number(item);
            const isGold = typeof item === 'object' && item !== null ? item.isGolden : false;
            const win = typeof item === 'object' && item !== null ? item.winAmount : Math.round(this.currentBet * m);

            let colorClass = 'pill-low';
            if (m >= 100.0) {
                colorClass = 'pill-rainbow';
            } else if (m >= 40.0) {
                colorClass = 'pill-magenta';
            } else if (m >= 10.0) {
                colorClass = 'pill-gold';
            } else if (m >= 2.0) {
                colorClass = 'pill-mid';
            }

            const formattedLabel = m >= 100 ? `${Math.round(m)}×` : `${m.toFixed(m % 1 !== 0 ? 1 : 0)}×`;
            const tooltip = `${isGold ? '✨ Kelapa Emas! ' : ''}Pengali: ${m}× | Menang: ${financeManager.formatCurrency(win)} TC`;

            return `<div class="crash-pill ${colorClass} ${isGold ? 'gold-crown-pill' : ''}" title="${tooltip}">
                ${isGold ? '👑 ' : ''}${formattedLabel}
            </div>`;
        }).join('');
    }

    _renderMultiplierPreviewHTML(multipliers) {
        return multipliers.map((m, idx) => {
            let colorTier = 'preview-green';
            if (m >= 400) {
                colorTier = 'preview-gold-sultan';
            } else if (m >= 70) {
                colorTier = 'preview-magenta';
            } else if (m >= 20) {
                colorTier = 'preview-crimson';
            } else if (m >= 7) {
                colorTier = 'preview-orange';
            } else if (m >= 3) {
                colorTier = 'preview-amber';
            } else if (m >= 1.2) {
                colorTier = 'preview-cyan';
            }

            const label = m >= 100 ? `${Math.round(m)}×` : `${m.toFixed(m < 10 && m % 1 !== 0 ? 1 : 0)}×`;
            return `<div class="preview-mult-box ${colorTier}" id="mult-preview-${idx}">
                <span class="preview-mult-val">${label}</span>
            </div>`;
        }).join('');
    }

    _renderStatsModalContentHTML() {
        const net = this.sessionTotalWon - this.sessionTotalBet;
        const roi = this.sessionTotalBet > 0 ? ((net / this.sessionTotalBet) * 100).toFixed(1) : 0;

        return `
        <div class="stats-grid-card">
            <div class="stat-item-box">
                <span class="stat-box-lbl">TOTAL KELAPA JATUH</span>
                <span class="stat-box-val">🥥 ${this.sessionDrops}</span>
            </div>
            <div class="stat-item-box">
                <span class="stat-box-lbl">KELAPA EMAS TERTANGKAP</span>
                <span class="stat-box-val">✨ ${this.sessionGoldenDrops}</span>
            </div>
            <div class="stat-item-box">
                <span class="stat-box-lbl">TOTAL NILAI TARUHAN</span>
                <span class="stat-box-val">${financeManager.formatCurrency(this.sessionTotalBet)} TC</span>
            </div>
            <div class="stat-item-box">
                <span class="stat-box-lbl">TOTAL KEMENANGAN</span>
                <span class="stat-box-val text-gold">${financeManager.formatCurrency(this.sessionTotalWon)} TC</span>
            </div>
            <div class="stat-item-box ${net >= 0 ? 'profit-box-pos' : 'profit-box-neg'}">
                <span class="stat-box-lbl">LABA BERSIH (NET PROFIT)</span>
                <span class="stat-box-val ${net >= 0 ? 'profit-pos' : 'profit-neg'}">
                    ${net >= 0 ? '+' : ''}${financeManager.formatCurrency(net)} TC (${net >= 0 ? '+' : ''}${roi}%)
                </span>
            </div>
            <div class="stat-item-box">
                <span class="stat-box-lbl">REKOR PENGALI TERTINGGI</span>
                <span class="stat-box-val text-gold">👑 ${this.sessionHighestMult > 0 ? this.sessionHighestMult + '×' : '—'}</span>
            </div>
        </div>
        `;
    }

    _highlightMultiplierPill(basketIndex) {
        if (!this.containerEl) return;
        const pill = this.containerEl.querySelector(`#mult-preview-${basketIndex}`);
        if (pill) {
            pill.classList.add('hit-pulse');
            setTimeout(() => {
                pill.classList.remove('hit-pulse');
            }, 450);
        }
    }

    _updateHistoryUI() {
        if (!this.containerEl) return;
        const histContainer = this.containerEl.querySelector('#plinko-history-container');
        if (histContainer) {
            histContainer.innerHTML = this._renderHistoryPillsHTML();
        }
    }

    _updateStatsUI() {
        if (!this.containerEl) return;
        const dropsEl = this.containerEl.querySelector('#stat-plinko-drops');
        if (dropsEl) dropsEl.textContent = this.sessionDrops;

        const maxEl = this.containerEl.querySelector('#stat-plinko-max');
        if (maxEl) maxEl.textContent = this.sessionHighestMult > 0 ? `${this.sessionHighestMult}×` : '—';

        const profitEl = this.containerEl.querySelector('#stat-plinko-profit');
        if (profitEl) {
            const net = this.sessionTotalWon - this.sessionTotalBet;
            profitEl.textContent = `${(net >= 0 ? '+' : '')}${financeManager.formatCurrency(net)} TC`;
            profitEl.className = net >= 0 ? 'profit-pos' : 'profit-neg';
        }

        // Update modal body if modal is open
        const modalBody = this.containerEl.querySelector('#plinko-stats-modal-body');
        if (modalBody) {
            modalBody.innerHTML = this._renderStatsModalContentHTML();
        }
    }

    _updateRowButtonsUI() {
        if (!this.containerEl) return;
        this.containerEl.querySelectorAll('.btn-pill-rows').forEach(btn => {
            const r = parseInt(btn.dataset.rows, 10);
            btn.classList.toggle('active', r === this.rows);
        });
    }

    _updateLuckRiskUI() {
        if (!this.containerEl) return;
        const badgeEl = this.containerEl.querySelector('#plinko-luck-risk-display');
        if (!badgeEl) return;

        const details = this.getLuckRiskDetails();
        badgeEl.className = `luck-risk-status-pill ${details.badgeClass}`;
        badgeEl.title = details.desc;
        badgeEl.innerHTML = `
            <span class="luck-risk-icon">${details.icon}</span>
            <span class="luck-risk-name">${details.riskLabel}</span>
            <span class="luck-risk-stat">${details.tierName} (${details.multiplier}×)</span>
        `;
    }

    _updateRiskButtonsUI() {
        this._updateLuckRiskUI();
    }

    _updateSpeedButtonsUI() {
        if (!this.containerEl) return;
        this.containerEl.querySelectorAll('.btn-pill-speed').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.speed === this.speed);
        });
    }

    _updateSoundBtnUI() {
        if (!this.containerEl) return;
        const btn = this.containerEl.querySelector('#btn-plinko-sound');
        if (btn) {
            const isCurrentOn = gameState.get('settings.soundEnabled') !== false;
            btn.className = `btn-plinko-hud ${isCurrentOn ? 'sound-on' : 'sound-off'}`;
            btn.querySelector('.hud-icon').textContent = isCurrentOn ? '🔊' : '🔇';
            btn.querySelector('.hud-lbl').textContent = isCurrentOn ? 'SUARA' : 'MUTE';
        }
    }

    _updateAutoDropBtnUI() {
        if (!this.containerEl) return;
        const btn = this.containerEl.querySelector('#btn-plinko-autodrop');
        if (btn) {
            btn.classList.toggle('active', this.isAutoDropping);
            const limitText = this.autoDropLimit === Infinity ? '∞' : this.autoDropLimit;
            btn.textContent = this.isAutoDropping ? `🛑 STOP (${this.autoDropsCount}/${limitText})` : '🔄 AUTO DROP';
        }
    }

    _updateMultipliersPreviewUI() {
        if (!this.containerEl) return;
        const container = this.containerEl.querySelector('#plinko-multiplier-preview-container');
        if (container) {
            container.innerHTML = this._renderMultiplierPreviewHTML(this.getActiveMultipliers());
        }
    }

    _updatePotentialPayoutUI() {
        if (!this.containerEl) return;
        const potEl = this.containerEl.querySelector('#plinko-potential-range');
        if (potEl) {
            const pot = this.getMinMaxPotential();
            potEl.textContent = `Min ${pot.minMult}× (${financeManager.formatCurrency(pot.minWin)} TC) — Max ${pot.maxMult}× (Hingga ${financeManager.formatCurrency(pot.maxWin)} TC!)`;
        }
    }

    _updateBetButtonText() {
        if (!this.containerEl) return;
        const subTxt = this.containerEl.querySelector('.btn-plinko-main .btn-sub-txt');
        if (subTxt) {
            subTxt.textContent = `${financeManager.formatCurrency(this.currentBet)} TC`;
        }
        this._updatePotentialPayoutUI();
    }

    _setupKeyboardListeners() {
        if (this._keyHandler) {
            window.removeEventListener('keydown', this._keyHandler);
        }

        this._keyHandler = (e) => {
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
                return;
            }
            if (!this.containerEl || !document.body.contains(this.containerEl)) {
                return;
            }

            if (e.code === 'Space') {
                e.preventDefault();
                const dropBtn = this.containerEl.querySelector('#btn-plinko-drop');
                if (dropBtn) pixiEffects.buttonPress(dropBtn);
                this.dropOne();
            } else if (e.code === 'KeyA') {
                e.preventDefault();
                this.toggleAutoDrop();
            } else if (e.code === 'KeyM') {
                e.preventDefault();
                this.toggleSound();
            }
        };

        window.addEventListener('keydown', this._keyHandler);
    }

    /**
     * Binds DOM events and initializes PixiPlinkoStage
     */
    bindEvents(container, onBalanceRefresh) {
        this.containerEl = container;
        this.onBalanceRefresh = onBalanceRefresh;

        // Initialize WebGL stage
        const canvas = container.querySelector('#pixi-plinko-canvas');
        if (canvas) {
            this.canvasEl = canvas;
            if (this.pixiStage) {
                this.pixiStage.destroy();
            }
            this.pixiStage = new PixiPlinkoStage(canvas, {
                rows: this.rows,
                risk: this.risk,
                multipliers: this.getActiveMultipliers(),
                onCoconutLand: (landData) => this._handleCoconutLanding(landData)
            });

            // Sync initial speed multiplier
            const mult = this.speed === 'turbo' ? 2.6 : (this.speed === 'fast' ? 1.8 : 1.0);
            this.pixiStage.setSpeedMultiplier(mult);
        }

        // Setup keyboard shortcuts
        this._setupKeyboardListeners();

        // Single Drop Button
        const dropBtn = container.querySelector('#btn-plinko-drop');
        if (dropBtn) {
            dropBtn.addEventListener('click', () => {
                pixiEffects.buttonPress(dropBtn);
                this.dropOne();
            });
        }

        // 5x Rain Drop
        const rain5Btn = container.querySelector('#btn-plinko-rain-5');
        if (rain5Btn) {
            rain5Btn.addEventListener('click', () => {
                pixiEffects.buttonPress(rain5Btn);
                this.dropBatch(5);
            });
        }

        // 10x Rain Drop
        const rain10Btn = container.querySelector('#btn-plinko-rain-10');
        if (rain10Btn) {
            rain10Btn.addEventListener('click', () => {
                pixiEffects.buttonPress(rain10Btn);
                this.dropBatch(10);
            });
        }

        // 25x Tsunami Drop
        const tsunamiBtn = container.querySelector('#btn-plinko-rain-25');
        if (tsunamiBtn) {
            tsunamiBtn.addEventListener('click', () => {
                pixiEffects.buttonPress(tsunamiBtn);
                this.dropBatch(25);
            });
        }

        // Auto Drop Toggle
        const autoBtn = container.querySelector('#btn-plinko-autodrop');
        if (autoBtn) {
            autoBtn.addEventListener('click', () => {
                pixiEffects.buttonPress(autoBtn);
                this.toggleAutoDrop();
            });
        }

        // Auto Drop Limit Selection Pills
        container.querySelectorAll('.btn-auto-limit').forEach(btn => {
            btn.addEventListener('click', () => {
                pixiEffects.buttonPress(btn);
                const limit = btn.dataset.limit === 'inf' ? Infinity : parseInt(btn.dataset.limit, 10);
                this.setAutoDropLimit(limit);
            });
        });

        // Speed Selection Pills
        container.querySelectorAll('.btn-pill-speed').forEach(btn => {
            btn.addEventListener('click', () => {
                pixiEffects.buttonPress(btn);
                this.setSpeed(btn.dataset.speed);
            });
        });

        // Sound Toggle Button
        const soundBtn = container.querySelector('#btn-plinko-sound');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                pixiEffects.buttonPress(soundBtn);
                this.toggleSound();
            });
        }

        // Clear History Button
        const clearHistBtn = container.querySelector('#btn-clear-plinko-hist');
        if (clearHistBtn) {
            clearHistBtn.addEventListener('click', () => {
                pixiEffects.buttonPress(clearHistBtn);
                this.history = [];
                gameState.set('casino.plinkoHistory', []);
                this._updateHistoryUI();
                ui.info('Riwayat tetesan kelapa telah dibersihkan.');
            });
        }

        // Stats Modal Open / Close
        const statsBtn = container.querySelector('#btn-plinko-stats');
        const statsFloatingPill = container.querySelector('#plinko-floating-stats');
        const statsModal = container.querySelector('#plinko-stats-modal');
        const closeStatsBtn = container.querySelector('#btn-close-plinko-stats');
        const dismissStatsBtn = container.querySelector('#btn-dismiss-plinko-stats');
        const resetStatsBtn = container.querySelector('#btn-reset-plinko-stats');

        const openStats = () => {
            if (statsModal) {
                this._updateStatsUI();
                statsModal.style.display = 'flex';
                if (window.gsap) {
                    window.gsap.fromTo(statsModal.querySelector('.plinko-modal-card'),
                        { scale: 0.85, opacity: 0 },
                        { scale: 1.0, opacity: 1, duration: 0.24, ease: 'back.out(2)' }
                    );
                }
            }
        };

        const closeStats = () => {
            if (statsModal) statsModal.style.display = 'none';
        };

        if (statsBtn) statsBtn.addEventListener('click', openStats);
        if (statsFloatingPill) statsFloatingPill.addEventListener('click', openStats);
        if (closeStatsBtn) closeStatsBtn.addEventListener('click', closeStats);
        if (dismissStatsBtn) dismissStatsBtn.addEventListener('click', closeStats);

        if (resetStatsBtn) {
            resetStatsBtn.addEventListener('click', () => {
                this.sessionDrops = 0;
                this.sessionTotalBet = 0;
                this.sessionTotalWon = 0;
                this.sessionHighestMult = 0;
                this.sessionGoldenDrops = 0;
                this._updateStatsUI();
                ui.success('Statistik sesi Plinko berhasil di-reset!');
            });
        }

        // Bet Input Change & Real-time Input Sanitization
        const betInput = container.querySelector('#plinko-bet-input');
        if (betInput) {
            const handleBetUpdate = (formatDisplay = false) => {
                const parsed = parseInt(betInput.value.replace(/\D/g, ''), 10);
                if (!isNaN(parsed) && parsed > 0) {
                    this.currentBet = Math.max(10000, Math.min(100000000, parsed));
                }
                if (formatDisplay) {
                    betInput.value = new Intl.NumberFormat('id-ID').format(this.currentBet);
                }
                this._updateBetButtonText();
            };

            betInput.addEventListener('input', () => handleBetUpdate(false));
            betInput.addEventListener('change', () => handleBetUpdate(true));
        }

        // Quick Chip Buttons
        container.querySelectorAll('.btn-quick-plinko').forEach(qBtn => {
            qBtn.addEventListener('click', () => {
                pixiEffects.buttonPress(qBtn);
                const bal = gameState.getBalance();

                if (qBtn.dataset.min) {
                    this.currentBet = 10000;
                } else if (qBtn.dataset.add) {
                    this.currentBet = Math.min(100000000, Math.min(bal, this.currentBet + parseInt(qBtn.dataset.add, 10)));
                } else if (qBtn.dataset.mult) {
                    this.currentBet = Math.min(100000000, Math.min(bal, Math.max(10000, Math.round(this.currentBet * parseFloat(qBtn.dataset.mult)))));
                } else if (qBtn.dataset.max) {
                    this.currentBet = Math.min(100000000, Math.max(10000, bal));
                }

                if (betInput) {
                    betInput.value = new Intl.NumberFormat('id-ID').format(this.currentBet);
                }
                this._updateBetButtonText();
            });
        });

        // Rows Selection
        container.querySelectorAll('.btn-pill-rows').forEach(btn => {
            btn.addEventListener('click', () => {
                pixiEffects.buttonPress(btn);
                this.setRows(parseInt(btn.dataset.rows, 10));
            });
        });

        // Listen to dynamic luck system updates across the casino
        this._ratePlaysListener = () => {
            this.syncRiskWithLuck(true);
            const ratePillSlot = this.containerEl?.querySelector('#plinko-rate-pill-container');
            if (ratePillSlot) ratePillSlot.innerHTML = this.getRateStatusHTML();
        };
        gameState.on('casino.ratePlays', this._ratePlaysListener);
    }

    destroy() {
        this.stopAutoDrop();
        if (this._ratePlaysListener) {
            gameState.off('casino.ratePlays', this._ratePlaysListener);
            this._ratePlaysListener = null;
        }
        if (this._keyHandler) {
            window.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
        if (this.pixiStage) {
            this.pixiStage.destroy();
            this.pixiStage = null;
        }
        this.containerEl = null;
        this.canvasEl = null;
    }
}

export default PlinkoEngine;