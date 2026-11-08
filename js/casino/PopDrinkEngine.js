/**
 * PopDrinkEngine.js - Pop Drink! Vending Machine Plinko Terminal
 * Theme: Cold Drink Vending Machine Refrigerator with Colorful Bouncing Beverage Cans
 * Features:
 * - Real-time WebGL beverage can physics powered by PixiVendingStage & GSAP
 * - Customizable Rows (8, 10, 12, 14, 16 Rows) & Risk Levels (Low, Medium, High Sultan)
 * - Authentic Plinko Multiplier tables up to 1000x Maxwin
 * - Sultan 24K Golden Can with 2x Multiplier Payout Boost
 * - Multi-Can Dispense "Vending Rush" (1x, 5x, 10x, and Continuous Auto-Vend)
 * - Pity & Volatility Boost integration with CasinoVolatilityEngine
 * - Top Multiplier History Strip & Live Session Stats
 * - Web Audio Sound integration (metallic clink, soda carbonation fizz, dispenser solenoid clunk)
 */

import financeManager from '../finance/FinanceManager.js';
import gameState from '../core/GameState.js';
import ui from '../ui/UIManager.js';
import AuraSound from '../ui/AuraSound.js';
import PixiVendingStage from '../graphics/PixiVendingStage.js';
import pixiEffects from '../graphics/PixiEffects.js';
import casinoVolatility from './CasinoVolatilityEngine.js';
import rewardManager from '../rewards/RewardManager.js';

// Multiplier Tables by Rows and Risk
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

export class PopDrinkEngine {
    constructor(onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;

        // Settings
        this.currentBet = 100000;
        this.rows = 12; // 8, 10, 12, 14, 16
        this.risk = this.getRiskFromLuck(); // Automatically determined by the game's luck system

        // Auto-vend state
        this.isAutoDropping = false;
        this.autoDropInterval = null;

        // Session Stats
        this.sessionDrops = 0;
        this.sessionTotalBet = 0;
        this.sessionTotalWon = 0;

        // History
        this.history = gameState.get('casino.popDrinkHistory') || [3.0, 0.6, 1.1, 0.3, 11.0, 2.0, 0.6, 33.0, 0.3, 4.0];

        // Stage & Elements
        this.pixiStage = null;
        this.containerEl = null;
        this.canvasEl = null;
        this._ratePlaysListener = null;
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
            riskLabel: 'RINGAN (RENDAH)',
            shortLabel: 'RINGAN (16×)',
            badgeClass: 'risk-badge-low',
            icon: '🍀',
            tierName: luckInfo.tierName,
            multiplier: luckInfo.multiplier,
            desc: '🍀 Kondisi Normal: Pengembalian kaleng stabil, risiko rendah di pusat (~0.5×–1.0×)',
            luckInfo
        };
    }

    /**
     * Synchronizes the PopDrink vending risk with current luck state
     */
    syncRiskWithLuck(silent = false) {
        const newRisk = this.getRiskFromLuck();
        const changed = newRisk !== this.risk;
        this.risk = newRisk;

        if (this.pixiStage) {
            this.pixiStage.rebuildBoard(this.rows, this.getActiveMultipliers());
        }

        this._updateLuckRiskUI();

        if (changed && !silent) {
            const details = this.getLuckRiskDetails();
            ui.info(`⚡ Sistem Keberuntungan menyesuaikan tingkat soda Pop Drink ke: ${details.riskLabel}!`, '🥤 Pop Drink!');
        }
    }

    getRateStatusHTML() {
        const plays = gameState.get('casino.ratePlays') || 0;
        const rateOn = plays >= 250;
        return rateOn
            ? `<div class="rate-badge rate-on-badge" style="display:inline-flex; align-items:center; gap:0.35rem; background:linear-gradient(135deg,#06b6d4,#ec4899); color:#fff; font-weight:900; font-size:0.75rem; padding:0.3rem 0.75rem; border-radius:999px; box-shadow:0 0 14px rgba(6,182,212,0.6); animation: rateGlow 1s ease-in-out infinite alternate; text-transform:uppercase; letter-spacing:0.06em; border: 1.5px solid #fff;">⚡ RATE ON (SULTAN CAN 28% &amp; EDGE BOOST!)</div>`
            : `<div class="rate-badge rate-off-badge" style="display:inline-flex; align-items:center; gap:0.35rem; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); color:rgba(255,255,255,0.65); font-weight:800; font-size:0.72rem; padding:0.25rem 0.6rem; border-radius:999px; text-transform:uppercase; letter-spacing:0.06em;">⚡ RATE: OFF (${plays}/250 PLAYS)</div>`;
    }

    getActiveMultipliers() {
        this.risk = this.getRiskFromLuck();
        const rowTable = MULTIPLIER_TABLES[this.rows] || MULTIPLIER_TABLES[12];
        return rowTable[this.risk] || rowTable.medium;
    }

    _fallbackDrop(isGolden = false) {
        setTimeout(() => {
            const mults = this.getActiveMultipliers();
            const n = mults.length - 1;
            let k = 0;
            for (let i = 0; i < n; i++) {
                if (Math.random() < 0.5) k++;
            }
            const multiplier = mults[k] || 1.0;
            this._handleCanLanding({
                multiplier,
                basketIndex: k,
                bet: this.currentBet,
                isGolden
            });
        }, 1200);
    }

    /**
     * Dispenses one beverage can into the vending machine
     */
    dropOne() {
        if (this.containerEl) {
            const betInput = this.containerEl.querySelector('#vending-bet-input');
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
            ui.error(`Saldo chip tidak mencukupi untuk mengeluarkan minuman ${financeManager.formatCurrency(this.currentBet)} TC!`);
            return;
        }

        // Deduct bet from balance via canonical FinanceManager
        financeManager.addExpense(this.currentBet, 'Lainnya', 'Taruhan Pop Drink! Vending Plinko');
        this.sessionDrops++;
        this.sessionTotalBet += this.currentBet;
        rewardManager.trackPlinkoDrop?.(this.currentBet);

        if (this.onBalanceRefresh) this.onBalanceRefresh();

        // Sultan 24K Golden Can Chance
        const luckInfo = casinoVolatility.getLuckInfo();
        const goldenChance = luckInfo.isRateOn ? 0.28 : (luckInfo.multiplier > 1.0 ? 0.12 : 0.05);
        const isGolden = Math.random() < goldenChance;

        if (isGolden) {
            ui.info('⭐ SULTAN 24K GOLD CAN DIKELUARKAN! Payout pengali berlipat 2x!', '🥤 Pop Drink!');
        }

        if (this.pixiStage && this.pixiStage.isPixiReady) {
            this.pixiStage.dropCan({
                bet: this.currentBet,
                isGolden,
                onLand: (landData) => this._handleCanLanding(landData)
            });
        } else {
            this._fallbackDrop(isGolden);
        }

        this._updateStatsUI();
    }

    /**
     * Dispenses a batch of cans in rapid sequence (Vending Rush / Party Pack)
     */
    dropBatch(count = 5) {
        let dropped = 0;
        const interval = setInterval(() => {
            if (dropped >= count) {
                clearInterval(interval);
                return;
            }
            if (gameState.getBalance() < this.currentBet) {
                clearInterval(interval);
                this.stopAutoDrop();
                ui.error('Saldo chip habis saat Vending Rush!');
                return;
            }
            this.dropOne();
            dropped++;
        }, 180);
    }

    /**
     * Toggles continuous auto-vend mode
     */
    toggleAutoDrop() {
        if (this.isAutoDropping) {
            this.stopAutoDrop();
        } else {
            this.startAutoDrop();
        }
    }

    startAutoDrop() {
        if (this.isAutoDropping) return;
        this.isAutoDropping = true;
        this._updateAutoDropBtnUI();
        ui.info('Mode Auto-Vend diaktifkan! Kaleng soda akan keluar terus-menerus.', '🥤 Pop Drink!');

        this.autoDropInterval = setInterval(() => {
            if (!this.isAutoDropping) return;
            if (gameState.getBalance() < this.currentBet) {
                this.stopAutoDrop();
                ui.error('Auto-Vend dihentikan: Saldo chip tidak mencukupi!');
                return;
            }
            this.dropOne();
        }, 320);
    }

    stopAutoDrop() {
        if (!this.isAutoDropping && !this.autoDropInterval) return;
        this.isAutoDropping = false;
        if (this.autoDropInterval) {
            clearInterval(this.autoDropInterval);
            this.autoDropInterval = null;
        }
        this._updateAutoDropBtnUI();
    }

    /**
     * Resolves when a beverage can lands in a bottom retrieval tray
     */
    _handleCanLanding(landData) {
        let multiplier = landData.multiplier;
        if (landData.isGolden) {
            multiplier *= 2; // Sultan 2x booster
        }

        const winAmount = Math.round(landData.bet * multiplier);
        this.sessionTotalWon += winAmount;

        // Credit winnings to player balance via canonical FinanceManager
        if (winAmount > 0) {
            financeManager.addIncome(winAmount, 'Jackpot', `Pop Drink! @ ${multiplier}x`);
        }

        if (multiplier >= 1.0) {
            casinoVolatility.recordOutcome?.(landData.bet, winAmount);
        } else {
            casinoVolatility.recordLoss?.();
        }

        rewardManager.trackPlinkoWin?.(multiplier, winAmount);

        if (this.onBalanceRefresh) this.onBalanceRefresh();

        // Big win visual celebration for huge multipliers
        if (multiplier >= 20) {
            pixiEffects.celebrateWin({
                amount: winAmount,
                bet: landData.bet,
                type: multiplier >= 100 ? 'sensational' : 'mega'
            });
        }

        // Add to history
        this.history.unshift(multiplier);
        if (this.history.length > 20) this.history.pop();
        gameState.set('casino.popDrinkHistory', this.history);

        this._updateHistoryUI();
        this._updateStatsUI();

        // Sync risk level dynamically with updated luck state
        this.syncRiskWithLuck(true);
    }

    setRows(newRows) {
        if (newRows === this.rows) return;
        this.rows = newRows;
        if (this.pixiStage) {
            this.pixiStage.rebuildBoard(this.rows, this.getActiveMultipliers());
        }
        this._updateRowButtonsUI();
    }

    setRisk(newRisk) {
        // Automatically determined by the game's luck system
        this.syncRiskWithLuck();
    }

    /**
     * HTML Template of Pop Drink! Vending Machine Plinko Terminal
     */
    getHTML() {
        const luckDetails = this.getLuckRiskDetails();
        const multipliers = this.getActiveMultipliers();

        return `
        <div class="vending-terminal-root">
            <!-- 1. Top Multiplier History Bar -->
            <div class="vending-history-bar">
                <div class="vending-history-title">
                    <span>🥤 RIWAYAT POP DRINK:</span>
                </div>
                <div class="vending-history-scroll" id="vending-history-container">
                    ${this._renderHistoryPillsHTML()}
                </div>
            </div>

            <!-- 2. Main Vending Machine Cooler Board & Canvas -->
            <div class="vending-theater-wrapper">
                <canvas id="pixi-vending-canvas" class="pixi-vending-canvas"></canvas>

                <!-- Vending Cooler Header Overlay -->
                <div class="vending-neon-banner">
                    <span class="vending-crest">🥤 POP DRINK! VENDING MACHINE ⚡</span>
                </div>

                <!-- Live Floating Stats Pill -->
                <div class="vending-floating-stats" id="vending-floating-stats">
                    <span>Kaleng: <b id="stat-vending-drops">${this.sessionDrops}</b></span>
                    <span class="stat-dot">•</span>
                    <span>Profit: <b id="stat-vending-profit" class="${(this.sessionTotalWon - this.sessionTotalBet) >= 0 ? 'profit-pos' : 'profit-neg'}">${financeManager.formatCurrency(this.sessionTotalWon - this.sessionTotalBet)} TC</b></span>
                </div>
            </div>

            <!-- 3. Vending Control Deck (Settings, Vend Buttons & Bets) -->
            <div class="vending-control-deck">
                <!-- Settings Bar: Rows & Risk Selectors -->
                <div class="vending-settings-strip">
                    <div class="setting-group luck-risk-indicator-group" title="${luckDetails.desc}">
                        <div class="setting-lbl-row">
                            <span class="setting-lbl">TINGKAT SODA (RISIKO):</span>
                            <span class="luck-auto-badge">⚡ OTOMATIS SISTEM</span>
                        </div>
                        <div class="luck-risk-status-pill vending-luck-risk ${luckDetails.badgeClass}" id="vending-luck-risk-display" title="${luckDetails.desc}">
                            <span class="luck-risk-icon">${luckDetails.icon}</span>
                            <span class="luck-risk-name">${luckDetails.riskLabel}</span>
                            <span class="luck-risk-stat">${luckDetails.tierName} (${luckDetails.multiplier}×)</span>
                        </div>
                    </div>

                    <div class="setting-group">
                        <span class="setting-lbl">BARIS RAK KALENG:</span>
                        <div class="btn-group-pills">
                            <button type="button" class="btn-pill-rows-vending ${this.rows === 8 ? 'active' : ''}" data-rows="8">8</button>
                            <button type="button" class="btn-pill-rows-vending ${this.rows === 10 ? 'active' : ''}" data-rows="10">10</button>
                            <button type="button" class="btn-pill-rows-vending ${this.rows === 12 ? 'active' : ''}" data-rows="12">12</button>
                            <button type="button" class="btn-pill-rows-vending ${this.rows === 14 ? 'active' : ''}" data-rows="14">14</button>
                            <button type="button" class="btn-pill-rows-vending ${this.rows === 16 ? 'active' : ''}" data-rows="16">16</button>
                        </div>
                    </div>
                </div>

                <!-- Bet Input & Action Buttons -->
                <div class="vending-action-row">
                    <!-- Chip Bet Input Box -->
                    <div class="vending-bet-box">
                        <span class="input-lbl">HARGA PER KALENG MINUMAN</span>
                        <div class="input-with-icon">
                            <span class="currency-tag">TC</span>
                            <input type="text" id="vending-bet-input" class="vending-bet-input" value="${new Intl.NumberFormat('id-ID').format(this.currentBet)}">
                        </div>
                        <div class="quick-chip-strip">
                            <button type="button" class="btn-quick-vending" data-add="50000">+50K</button>
                            <button type="button" class="btn-quick-vending" data-add="250000">+250K</button>
                            <button type="button" class="btn-quick-vending" data-mult="0.5">1/2</button>
                            <button type="button" class="btn-quick-vending" data-mult="2">2X</button>
                            <button type="button" class="btn-quick-vending" data-max="true">MAX</button>
                        </div>
                    </div>

                    <!-- Dispense Action Triggers -->
                    <div class="vending-buttons-grid">
                        <button type="button" class="btn-vending-main" id="btn-vending-drop">
                            <span class="btn-main-txt">🥤 KELUARKAN SODA</span>
                            <span class="btn-sub-txt">${financeManager.formatCurrency(this.currentBet)} TC</span>
                        </button>

                        <div class="vending-sub-actions">
                            <button type="button" class="btn-vending-rush" id="btn-vending-rush-5" title="Keluarkan 5 Kaleng Sekaligus">
                                <span>⚡ RUSH (5×)</span>
                            </button>
                            <button type="button" class="btn-vending-rush" id="btn-vending-rush-10" title="Keluarkan 10 Kaleng Party Pack">
                                <span>🎉 PARTY (10×)</span>
                            </button>
                            <button type="button" class="btn-vending-auto ${this.isAutoDropping ? 'active' : ''}" id="btn-vending-autodrop">
                                <span>${this.isAutoDropping ? '⏹ STOP AUTO' : '🔄 AUTO VEND'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    _renderHistoryPillsHTML() {
        if (!this.history || this.history.length === 0) {
            return `<div class="vending-pill pill-low">1.0×</div>`;
        }

        return this.history.map(m => {
            let colorClass = 'pill-low';
            if (m >= 100) {
                colorClass = 'pill-rainbow';
            } else if (m >= 10.0) {
                colorClass = 'pill-gold';
            } else if (m >= 2.0) {
                colorClass = 'pill-mid';
            }
            return `<div class="vending-pill ${colorClass}">🥤 ${m >= 100 ? Math.round(m) : m.toFixed(m % 1 !== 0 ? 1 : 0)}×</div>`;
        }).join('');
    }

    _updateHistoryUI() {
        if (!this.containerEl) return;
        const histContainer = this.containerEl.querySelector('#vending-history-container');
        if (histContainer) {
            histContainer.innerHTML = this._renderHistoryPillsHTML();
        }
    }

    _updateStatsUI() {
        if (!this.containerEl) return;
        const dropsEl = this.containerEl.querySelector('#stat-vending-drops');
        if (dropsEl) dropsEl.textContent = this.sessionDrops;

        const profitEl = this.containerEl.querySelector('#stat-vending-profit');
        if (profitEl) {
            const net = this.sessionTotalWon - this.sessionTotalBet;
            profitEl.textContent = `${(net >= 0 ? '+' : '')}${financeManager.formatCurrency(net)} TC`;
            profitEl.className = net >= 0 ? 'profit-pos' : 'profit-neg';
        }
    }

    _updateRowButtonsUI() {
        if (!this.containerEl) return;
        this.containerEl.querySelectorAll('.btn-pill-rows-vending').forEach(btn => {
            const r = parseInt(btn.dataset.rows, 10);
            btn.classList.toggle('active', r === this.rows);
        });
    }

    _updateLuckRiskUI() {
        if (!this.containerEl) return;
        const badgeEl = this.containerEl.querySelector('#vending-luck-risk-display');
        if (!badgeEl) return;

        const details = this.getLuckRiskDetails();
        badgeEl.className = `luck-risk-status-pill vending-luck-risk ${details.badgeClass}`;
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

    _updateAutoDropBtnUI() {
        if (!this.containerEl) return;
        const btn = this.containerEl.querySelector('#btn-vending-autodrop');
        if (btn) {
            btn.classList.toggle('active', this.isAutoDropping);
            btn.innerHTML = `<span>${this.isAutoDropping ? '⏹ STOP AUTO' : '🔄 AUTO VEND'}</span>`;
        }
    }

    /**
     * Binds DOM events and initializes PixiVendingStage
     */
    bindEvents(container, onBalanceRefresh) {
        this.containerEl = container;
        this.onBalanceRefresh = onBalanceRefresh;

        // Initialize WebGL stage
        const canvas = container.querySelector('#pixi-vending-canvas');
        if (canvas) {
            this.canvasEl = canvas;
            if (this.pixiStage) {
                this.pixiStage.destroy();
            }
            this.pixiStage = new PixiVendingStage(canvas, {
                rows: this.rows,
                risk: this.risk,
                multipliers: this.getActiveMultipliers(),
                onCanLand: (landData) => this._handleCanLanding(landData)
            });
        }

        // Single Drop Button
        const dropBtn = container.querySelector('#btn-vending-drop');
        if (dropBtn) {
            dropBtn.addEventListener('click', () => {
                pixiEffects.buttonPress(dropBtn);
                this.dropOne();
            });
        }

        // 5x Rush Drop
        const rush5Btn = container.querySelector('#btn-vending-rush-5');
        if (rush5Btn) {
            rush5Btn.addEventListener('click', () => {
                pixiEffects.buttonPress(rush5Btn);
                this.dropBatch(5);
            });
        }

        // 10x Party Drop
        const rush10Btn = container.querySelector('#btn-vending-rush-10');
        if (rush10Btn) {
            rush10Btn.addEventListener('click', () => {
                pixiEffects.buttonPress(rush10Btn);
                this.dropBatch(10);
            });
        }

        // Auto Vend Toggle
        const autoBtn = container.querySelector('#btn-vending-autodrop');
        if (autoBtn) {
            autoBtn.addEventListener('click', () => {
                pixiEffects.buttonPress(autoBtn);
                this.toggleAutoDrop();
            });
        }

        // Bet Input Change & Input sync
        const betInput = container.querySelector('#vending-bet-input');
        if (betInput) {
            const syncBet = () => {
                const parsed = parseInt(betInput.value.replace(/\D/g, ''), 10) || 10000;
                this.currentBet = Math.max(10000, Math.min(100000000, parsed));
                this._updateBetButtonText();
            };
            betInput.addEventListener('input', syncBet);
            betInput.addEventListener('change', () => {
                syncBet();
                betInput.value = new Intl.NumberFormat('id-ID').format(this.currentBet);
            });
        }

        // Quick Chip Buttons
        container.querySelectorAll('.btn-quick-vending').forEach(qBtn => {
            qBtn.addEventListener('click', () => {
                pixiEffects.buttonPress(qBtn);
                const bal = gameState.getBalance();

                if (qBtn.dataset.add) {
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
        container.querySelectorAll('.btn-pill-rows-vending').forEach(btn => {
            btn.addEventListener('click', () => {
                pixiEffects.buttonPress(btn);
                this.setRows(parseInt(btn.dataset.rows, 10));
            });
        });

        // Listen to dynamic luck system updates across the casino
        this._ratePlaysListener = () => {
            this.syncRiskWithLuck(true);
        };
        gameState.on('casino.ratePlays', this._ratePlaysListener);
    }

    _updateBetButtonText() {
        if (!this.containerEl) return;
        const subTxt = this.containerEl.querySelector('.btn-vending-main .btn-sub-txt');
        if (subTxt) {
            subTxt.textContent = `${financeManager.formatCurrency(this.currentBet)} TC`;
        }
    }

    destroy() {
        this.stopAutoDrop();
        if (this._ratePlaysListener) {
            gameState.off('casino.ratePlays', this._ratePlaysListener);
            this._ratePlaysListener = null;
        }
        if (this.pixiStage) {
            this.pixiStage.destroy();
            this.pixiStage = null;
        }
        this.containerEl = null;
        this.canvasEl = null;
    }
}

export default PopDrinkEngine;
