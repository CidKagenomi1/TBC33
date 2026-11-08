/**
 * CrashEngine.js - Golden Marlin: Fishing Crash Game (Standard Aviator / Big Bass Crash Mechanics)
 * Features:
 * - Authentic Continuous Crash Game Cycle: WAITING (4s Countdown) -> FLYING (Curve Ascent) -> CRASHED (2.6s)
 * - Real-time Exponential Crash Graph & Curve with Coordinate Grid (powered by PixiFishingStage)
 * -Curve continues climbing after player Cashes Out so player can see the final Crash Point (and cash out Panel 2 later!)
 * - Standard Dual Bet Panels side-by-side (Panel 1 & Panel 2) with Queue Next Round, Cancel, Auto-Bet, and Auto-Cashout
 * - Dynamic Fish Tier Evolution as multiplier rises (Snapper -> Barracuda -> Bluefin Tuna -> Golden Marlin -> Leviathan)
 * - Top Recent Crash Multiplier History Bar with color-coded tiers
 */

import financeManager from '../finance/FinanceManager.js';
import gameState from '../core/GameState.js';
import ui from '../ui/UIManager.js';
import AuraSound from '../ui/AuraSound.js';
import PixiFishingStage from '../graphics/PixiFishingStage.js';
import pixiEffects from '../graphics/PixiEffects.js';
import casinoVolatility from './CasinoVolatilityEngine.js';
import rewardManager from '../rewards/RewardManager.js';

export class CrashEngine {
    constructor(onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;

        // Stage & Loop
        this.pixiStage = null;
        this.canvasEl = null;
        this.containerEl = null;
        this.animFrameId = null;
        this._keyHandler = null;

        // Standard Crash Game States: 'WAITING' | 'FLYING' | 'CRASHED'
        this.gameState = 'WAITING';
        this.waitDuration = 4.5;
        this.waitTimer = 4.5;
        this.crashHoldDuration = 2.6;
        this.crashHoldTimer = 0;
        this.lastTimestamp = 0;

        // Multiplier progression
        this.currentMultiplier = 1.0;
        this.crashMultiplier = 2.0;
        this.flightElapsedSec = 0;
        this.roundSeed = '';
        this.roundHash = '';

        // Sound throttling
        this.lastHumTime = 0;
        this.lastHeartbeatTime = 0;

        // Standard Dual Bet Panels (Aviator / Spaceman / Big Bass Crash layout)
        // status: 'IDLE' | 'QUEUED' | 'ACTIVE' | 'CASHED_OUT' | 'LOST'
        this.panels = {
            panel1: {
                id: 'panel1',
                title: 'TARUHAN 1',
                bet: 100000,
                autoBet: false,
                autoCashoutEnabled: false,
                autoCashoutTarget: 2.0,
                status: 'IDLE',
                cashedOutMultiplier: null,
                winAmount: 0
            },
            panel2: {
                id: 'panel2',
                title: 'TARUHAN 2',
                bet: 200000,
                autoBet: false,
                autoCashoutEnabled: false,
                autoCashoutTarget: 5.0,
                status: 'IDLE',
                cashedOutMultiplier: null,
                winAmount: 0
            }
        };

        // History
        this.history = gameState.get('casino.crashHistory') || [1.84, 2.45, 1.15, 4.30, 1.42, 12.80, 1.95, 3.12, 1.08, 8.55];

        this._generateHash();
    }

    getRateStatusHTML() {
        const plays = gameState.get('casino.ratePlays') || 0;
        const rateOn = plays >= 250;
        return rateOn
            ? `<div class="rate-badge rate-on-badge" style="display:inline-flex; align-items:center; gap:0.35rem; background:linear-gradient(135deg,#0284c7,#38bdf8); color:#fff; font-weight:900; font-size:0.75rem; padding:0.3rem 0.75rem; border-radius:999px; box-shadow:0 0 14px rgba(56,189,248,0.7); animation: rateGlow 1s ease-in-out infinite alternate; text-transform:uppercase; letter-spacing:0.06em; border: 1.5px solid #fff;">⚡ RATE ON (MARLIN EMAS GACOR 3.5X BOOST!)</div>`
            : `<div class="rate-badge rate-off-badge" style="display:inline-flex; align-items:center; gap:0.35rem; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); color:rgba(255,255,255,0.65); font-weight:800; font-size:0.72rem; padding:0.25rem 0.6rem; border-radius:999px; text-transform:uppercase; letter-spacing:0.06em;">⚡ RATE: OFF (${plays}/250 PLAYS)</div>`;
    }

    _getCurrentFishLabel(mult) {
        if (mult >= 50.0) return '🐉 LEVIATHAN LAUT DALAM (50x+)';
        if (mult >= 10.0) return '👑 SULTAN GOLDEN MARLIN (10x+)';
        if (mult >= 5.0)  return '🐟 GIANT BLUEFIN TUNA (5x+)';
        if (mult >= 2.0)  return '🥈 BARRACUDA PERAK (2x+)';
        return '🐠 KAKAP KARANG (1x+)';
    }

    /**
     * Generates crash point using provably fair inverse distribution & volatility
     */
    _generateCrashPoint() {
        const luckInfo = casinoVolatility.getLuckInfo();
        const rand = Math.random();

        // ~3% house instant crash edge
        if (rand < 0.03) {
            return parseFloat((1.00 + Math.random() * 0.04).toFixed(2));
        }

        let rawCrash = 0.96 / (1.0 - Math.random());

        if (luckInfo.isRateOn) {
            rawCrash *= 2.2;
        } else if (luckInfo.multiplier > 1.0) {
            rawCrash *= (1.0 + (luckInfo.multiplier - 1.0) * 0.4);
        }

        const finalMultiplier = Math.max(1.01, Math.min(10000.0, rawCrash));
        return parseFloat(finalMultiplier.toFixed(2));
    }

    _generateHash() {
        this.roundSeed = 'RND_' + Math.random().toString(36).substring(2, 10).toUpperCase();
        let hash = '';
        const hex = '0123456789abcdef';
        for (let i = 0; i < 40; i++) {
            hash += hex[Math.floor(Math.random() * hex.length)];
        }
        this.roundHash = hash;
    }

    /**
     * Starts the continuous 60fps Crash Game state machine loop
     */
    _startTicker() {
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }

        this.lastTimestamp = (typeof performance !== 'undefined' ? performance.now() : Date.now());

        const loop = (now) => {
            if (!this.containerEl) return;

            const dt = Math.min(0.06, Math.max(0.001, (now - this.lastTimestamp) / 1000));
            this.lastTimestamp = now;

            this._tick(dt);
            this.animFrameId = requestAnimationFrame(loop);
        };

        this.animFrameId = requestAnimationFrame(loop);
    }

    _tick(dt) {
        if (this.gameState === 'WAITING') {
            this.waitTimer -= dt;
            if (this.waitTimer <= 0) {
                this.waitTimer = 0;
                this._beginFlyingPhase();
            } else {
                this._updateWaitingUI();
            }
        } else if (this.gameState === 'FLYING') {
            this.flightElapsedSec += dt;

            // Standard Crash exponential curve: M(t) = e^(k * t)
            const k = 0.06 + Math.min(0.065, this.flightElapsedSec * 0.0032);
            this.currentMultiplier = Math.exp(k * this.flightElapsedSec);

            const visualProgress = Math.min(1.0, this.flightElapsedSec / 16.0);

            if (this.currentMultiplier >= this.crashMultiplier) {
                this.currentMultiplier = this.crashMultiplier;
                this._handleCrash();
            } else {
                this._checkAutoCashouts();

                const nowSec = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
                if (nowSec - this.lastHumTime > 0.09) {
                    AuraSound.playReelCrank?.(this.currentMultiplier);
                    this.lastHumTime = nowSec;
                }
                if (this.currentMultiplier >= 5.0 && nowSec - this.lastHeartbeatTime > 0.85) {
                    AuraSound.playHeartbeat?.();
                    this.lastHeartbeatTime = nowSec;
                }

                if (this.pixiStage) {
                    this.pixiStage.updateReel(this.currentMultiplier, visualProgress, this.flightElapsedSec);
                }

                this._updateFlyingUI();
            }
        } else if (this.gameState === 'CRASHED') {
            this.crashHoldTimer -= dt;
            if (this.crashHoldTimer <= 0) {
                this._beginWaitingPhase();
            }
        }
    }

    /**
     * Transitions from Crash hold into the 4.5s Waiting / Betting countdown
     */
    _beginWaitingPhase() {
        this.gameState = 'WAITING';
        this.waitTimer = this.waitDuration;
        this.currentMultiplier = 1.0;
        this.flightElapsedSec = 0;
        this._generateHash();

        // Reset panels that were ACTIVE, CASHED_OUT, or LOST; preserve QUEUED bets from during flight!
        ['panel1', 'panel2'].forEach(key => {
            const p = this.panels[key];
            if (p.status !== 'QUEUED') {
                p.status = 'IDLE';
                p.cashedOutMultiplier = null;
                p.winAmount = 0;
            }
            if (p.autoBet && p.status === 'IDLE') {
                p.status = 'QUEUED';
            }
        });

        if (this.pixiStage) {
            this.pixiStage.setCountdown();
        }

        this._updateUIState();
    }

    /**
     * Transitions from Waiting into Flying (locks in all QUEUED bets & deducts balance)
     */
    _beginFlyingPhase() {
        // Activate any QUEUED bets
        ['panel1', 'panel2'].forEach(key => {
            const p = this.panels[key];
            if (p.status === 'QUEUED') {
                const currentBal = gameState.getBalance();
                if (p.bet <= currentBal) {
                    financeManager.addExpense(p.bet, 'Lainnya', `Taruhan Golden Marlin (${p.title})`);
                    rewardManager.trackCrashBet?.(p.bet);
                    p.status = 'ACTIVE';
                    p.cashedOutMultiplier = null;
                    p.winAmount = 0;
                } else {
                    p.status = 'IDLE';
                    p.autoBet = false;
                    this._syncAutoBetCheckbox(key);
                    ui.error(`Saldo tidak cukup untuk ${p.title} (${financeManager.formatCurrency(p.bet)} TC)!`);
                }
            } else {
                p.status = 'IDLE';
                p.cashedOutMultiplier = null;
                p.winAmount = 0;
            }
        });

        if (this.onBalanceRefresh) this.onBalanceRefresh();

        this.currentMultiplier = 1.0;
        this.flightElapsedSec = 0;
        this.crashMultiplier = this._generateCrashPoint();
        this.gameState = 'FLYING';

        if (typeof AuraSound.playReelCast === 'function') {
            AuraSound.playReelCast();
        } else {
            AuraSound.playTap?.();
        }

        if (this.pixiStage) {
            this.pixiStage.startReel();
        }

        this._updateUIState();
    }

    /**
     * Player clicks the main button on Panel 1 or Panel 2
     */
    handleMainAction(panelKey = 'panel1') {
        const p = this.panels[panelKey];
        if (!p) return;

        // 1. If panel is currently ACTIVE in a flying round -> CASHOUT!
        if (this.gameState === 'FLYING' && p.status === 'ACTIVE') {
            this.cashOut(panelKey, false);
            return;
        }

        // 2. If panel is QUEUED -> Cancel Queue
        if (p.status === 'QUEUED') {
            p.status = 'IDLE';
            if (p.autoBet) {
                p.autoBet = false;
                this._syncAutoBetCheckbox(panelKey);
            }
            AuraSound.playTap?.();
            this._updatePanelActionUI(panelKey);
            return;
        }

        // 3. Otherwise (IDLE / CASHED_OUT / LOST) -> Queue bet for next round (or current waiting countdown)
        this._syncBetFromInput(panelKey);
        const currentBal = gameState.getBalance();
        if (p.bet > currentBal) {
            ui.error(`Saldo chip tidak mencukupi (${financeManager.formatCurrency(p.bet)} TC diperlukan)!`);
            return;
        }

        p.status = 'QUEUED';
        AuraSound.playClick?.();
        this._updatePanelActionUI(panelKey);

        // If we are in WAITING phase and countdown has > 0.6s left, speed it up slightly so solo play feels snappy
        if (this.gameState === 'WAITING' && this.waitTimer > 1.2) {
            this.waitTimer = 1.2;
        }
    }

    /**
     * Cast Rod alias (for backward compatibility & direct start)
     */
    castRod() {
        this.panels.panel1.status = 'QUEUED';
        this._beginFlyingPhase();
    }

    _checkAutoCashouts() {
        ['panel1', 'panel2'].forEach(key => {
            const p = this.panels[key];
            if (p.status === 'ACTIVE' && p.autoCashoutEnabled && p.autoCashoutTarget > 1.0) {
                if (this.currentMultiplier >= p.autoCashoutTarget) {
                    this.cashOut(key, true);
                }
            }
        });
    }

    /**
     * Cashes out an active panel while the Crash Curve continues climbing!
     */
    cashOut(panelKey = 'panel1', isAuto = false) {
        const p = this.panels[panelKey];
        if (!p || p.status !== 'ACTIVE' || this.gameState !== 'FLYING') return;

        p.status = 'CASHED_OUT';
        p.cashedOutMultiplier = parseFloat(this.currentMultiplier.toFixed(2));
        p.winAmount = Math.round(p.bet * p.cashedOutMultiplier);

        // Credit winnings via canonical FinanceManager
        financeManager.addIncome(p.winAmount, 'Jackpot', `Cashout Golden Marlin @ ${p.cashedOutMultiplier}x`);
        casinoVolatility.recordOutcome?.(p.bet, p.winAmount);
        rewardManager.trackCrashCashout?.(p.cashedOutMultiplier);

        if (typeof AuraSound.playStrikeSuccess === 'function') {
            AuraSound.playStrikeSuccess();
        } else {
            AuraSound.playWin?.();
        }
        AuraSound.playCoinStream?.(8);

        // Drop a Cashout Pin Marker onto the rising Crash Curve!
        if (this.pixiStage) {
            this.pixiStage.triggerCatch(p.cashedOutMultiplier, p.title);
        }

        if (p.cashedOutMultiplier >= 10.0) {
            pixiEffects.celebrateWin({
                amount: p.winAmount,
                bet: p.bet,
                type: p.cashedOutMultiplier >= 50 ? 'sensational' : 'mega'
            });
        }

        if (this.onBalanceRefresh) this.onBalanceRefresh();

        ui.success(
            `${isAuto ? '⚡ AUTO CASHOUT' : '💰 CASHOUT'} (${p.title}) @ ${p.cashedOutMultiplier.toFixed(2)}×! Menang +${financeManager.formatCurrency(p.winAmount)} TC`,
            '🎣 STRIKE BERHASIL!'
        );

        this._updatePanelActionUI(panelKey);
        this._updateFlyingUI();
    }

    _handleCrash() {
        this.gameState = 'CRASHED';
        this.crashHoldTimer = this.crashHoldDuration;

        AuraSound.playLineSnap?.();

        if (this.pixiStage) {
            this.pixiStage.triggerEscape(this.crashMultiplier);
        }

        let anyLoss = false;
        ['panel1', 'panel2'].forEach(key => {
            const p = this.panels[key];
            if (p.status === 'ACTIVE') {
                p.status = 'LOST';
                anyLoss = true;
                casinoVolatility.recordLoss?.();
            }
        });

        if (anyLoss) {
            AuraSound.playCasinoLose?.();
        }

        this._recordHistory(this.crashMultiplier);
        this._updateUIState();
    }

    _recordHistory(multiplier) {
        this.history.unshift(multiplier);
        if (this.history.length > 25) this.history.pop();
        gameState.set('casino.crashHistory', this.history);

        const highestSoFar = gameState.get('rewards.stats.highestCrashMultiplier') || 0;
        if (multiplier > highestSoFar) {
            gameState.set('rewards.stats.highestCrashMultiplier', multiplier);
        }
    }

    /**
     * HTML Template - Authentic Crash Game Layout (History Strip + Crash Graph Stage + Dual Bet Panels)
     */
    getHTML() {
        return `
        <div class="crash-terminal-root fishing-terminal-root">
            <!-- 1. Top Bar: Recent Crash Multipliers Strip -->
            <div class="crash-history-bar fishing-history-bar">
                <div class="crash-history-title">
                    <span>🎣 RIWAYAT CRASH:</span>
                </div>
                <div class="crash-history-scroll" id="crash-history-container">
                    ${this._renderHistoryPillsHTML()}
                </div>
            </div>

            <!-- 2. Main Crash Graph Stage (Canvas + Center Multiplier Overlay) -->
            <div class="crash-stage-wrapper fishing-stage-wrapper" id="crash-stage-wrapper">
                <canvas id="pixi-crash-canvas" class="pixi-crash-canvas"></canvas>

                <!-- Center Crash Multiplier / Countdown Readout -->
                <div class="crash-center-overlay" id="crash-center-overlay">
                    ${this._getCenterOverlayHTML()}
                </div>

                <!-- Provably Fair Watermark -->
                <div class="crash-watermark-strip">
                    <span class="watermark-tag">🛡️ PROVABLY FAIR CRASH</span>
                    <span class="watermark-hash" id="crash-round-hash">HASH: ${this.roundHash.substring(0, 14)}...</span>
                </div>
            </div>

            <!-- 3. Dual Bet Control Deck (Panel 1 & Panel 2 Side-by-Side like Aviator / Spaceman) -->
            <div class="crash-deck-grid dual-rod-grid" id="crash-deck-container">
                ${this._renderBetPanelHTML('panel1', 'PANEL TARUHAN 1 🎣')}
                ${this._renderBetPanelHTML('panel2', 'PANEL TARUHAN 2 🎣')}
            </div>
        </div>
        `;
    }

    _renderHistoryPillsHTML() {
        return this.history.map((m, idx) => {
            let colorClass = 'pill-low';
            if (m >= 50.0) {
                colorClass = 'pill-rainbow';
            } else if (m >= 10.0) {
                colorClass = 'pill-gold';
            } else if (m >= 2.0) {
                colorClass = 'pill-mid';
            }
            return `<div class="crash-pill ${colorClass}" title="Ronde #${this.history.length - idx}: ${m.toFixed(2)}x">${m.toFixed(2)}×</div>`;
        }).join('');
    }

    _getCenterOverlayHTML() {
        if (this.gameState === 'WAITING') {
            const pct = Math.max(0, Math.min(100, (this.waitTimer / this.waitDuration) * 100));
            return `
                <div class="crash-waiting-hud">
                    <div class="waiting-icon-title">🎣 MENYIAPKAN UMPAN PANCING...</div>
                    <div class="waiting-timer-text" id="crash-wait-timer">MULAI DALAM ${this.waitTimer.toFixed(1)}s</div>
                    <div class="waiting-progress-track">
                        <div class="waiting-progress-fill" id="crash-wait-bar" style="width: ${pct}%;"></div>
                    </div>
                    <div class="waiting-sub-tip">Pasang taruhan di bawah sebelum grafik meluncur!</div>
                </div>
            `;
        } else if (this.gameState === 'FLYING') {
            const fishLabel = this._getCurrentFishLabel(this.currentMultiplier);
            return `
                <div class="crash-multiplier-box">
                    <div class="crash-fish-tier-pill" id="crash-fish-tier">${fishLabel}</div>
                    <div class="multiplier-num flying-glow" id="crash-main-multiplier">${this.currentMultiplier.toFixed(2)}×</div>
                </div>
            `;
        } else {
            // CRASHED
            return `
                <div class="crash-multiplier-box crashed-box">
                    <div class="crashed-banner">🌊 TALI PUTUS! IKAN KABUR!</div>
                    <div class="multiplier-num crashed-num">${this.crashMultiplier.toFixed(2)}×</div>
                </div>
            `;
        }
    }

    _renderBetPanelHTML(panelKey, title) {
        const p = this.panels[panelKey];
        const isLocked = (this.gameState === 'FLYING' && p.status === 'ACTIVE') || p.status === 'QUEUED';

        return `
        <div class="crash-bet-card" id="card-${panelKey}">
            <!-- Top Strip: Auto Bet & Auto Cashout -->
            <div class="bet-card-header">
                <span class="bet-card-title">${title}</span>
                <div class="auto-controls-group">
                    <label class="auto-toggle-label" title="Otomatis pasang taruhan setiap ronde">
                        <input type="checkbox" id="${panelKey}-autobet-toggle" class="crash-checkbox" ${p.autoBet ? 'checked' : ''}>
                        <span>AUTO BET</span>
                    </label>
                    <div class="auto-cashout-toggle-wrap">
                        <label class="auto-toggle-label" for="${panelKey}-auto-toggle">AUTO CASHOUT:</label>
                        <input type="checkbox" id="${panelKey}-auto-toggle" class="crash-checkbox" ${p.autoCashoutEnabled ? 'checked' : ''}>
                        <div class="auto-input-wrap ${p.autoCashoutEnabled ? 'active' : ''}" id="${panelKey}-auto-wrap">
                            <input type="number" id="${panelKey}-auto-target" class="crash-num-input auto-target-input" step="0.1" min="1.1" max="1000" value="${p.autoCashoutTarget.toFixed(2)}">
                            <span class="auto-x-unit">×</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bet-card-body">
                <div class="bet-input-row">
                    <!-- Left: Bet Amount & Quick Chips -->
                    <div class="input-label-box">
                        <span class="input-lbl">JUMLAH TARUHAN (TC)</span>
                        <div class="input-with-icon">
                            <span class="chip-curr">🪙</span>
                            <input type="text" id="${panelKey}-bet-input" class="crash-num-input main-bet-input" value="${new Intl.NumberFormat('id-ID').format(p.bet)}" ${isLocked ? 'disabled' : ''}>
                        </div>
                        <div class="quick-chip-strip">
                            <button type="button" class="btn-quick-chip" data-panel="${panelKey}" data-add="100000" ${isLocked ? 'disabled' : ''}>+100K</button>
                            <button type="button" class="btn-quick-chip" data-panel="${panelKey}" data-add="500000" ${isLocked ? 'disabled' : ''}>+500K</button>
                            <button type="button" class="btn-quick-chip" data-panel="${panelKey}" data-mult="0.5" ${isLocked ? 'disabled' : ''}>½</button>
                            <button type="button" class="btn-quick-chip" data-panel="${panelKey}" data-mult="2" ${isLocked ? 'disabled' : ''}>2×</button>
                            <button type="button" class="btn-quick-chip chip-max" data-panel="${panelKey}" data-max="true" ${isLocked ? 'disabled' : ''}>MAX</button>
                        </div>
                    </div>

                    <!-- Right: Giant Crash Action Button (BET / CANCEL / CASHOUT) -->
                    <div class="action-btn-col">
                        ${this._getActionButtonHTML(panelKey)}
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    _getActionButtonHTML(panelKey) {
        const p = this.panels[panelKey];

        // 1. Currently ACTIVE in a flying round -> Show Giant Orange/Gold CASHOUT button!
        if (this.gameState === 'FLYING' && p.status === 'ACTIVE') {
            const currentPayout = Math.round(p.bet * this.currentMultiplier);
            return `
                <button type="button" class="btn-crash-action btn-cashout-active btn-fishing-strike" data-panel="${panelKey}" id="btn-action-${panelKey}">
                    <span class="action-main-text">💰 CASHOUT</span>
                    <span class="action-sub-text" id="cashout-amt-${panelKey}">${financeManager.formatCurrency(currentPayout)} TC (${this.currentMultiplier.toFixed(2)}×)</span>
                </button>
            `;
        }

        // 2. Currently QUEUED for next round -> Show Red CANCEL button
        if (p.status === 'QUEUED') {
            const subLabel = this.gameState === 'WAITING' ? 'SIAP MELUNCUR...' : 'UNTUK RONDE BERIKUTNYA';
            return `
                <button type="button" class="btn-crash-action btn-cancel-bet" data-panel="${panelKey}" id="btn-action-${panelKey}">
                    <span class="action-main-text">✕ BATALKAN</span>
                    <span class="action-sub-text">${subLabel} (${financeManager.formatCurrency(p.bet)} TC)</span>
                </button>
            `;
        }

        // 3. Just Cashed Out this round -> Show Green Win Badge + Click to Queue Next Round
        if (this.gameState === 'FLYING' && p.status === 'CASHED_OUT') {
            return `
                <button type="button" class="btn-crash-action btn-place-bet" data-panel="${panelKey}" id="btn-action-${panelKey}">
                    <span class="action-main-text">✅ MENANG +${financeManager.formatCurrency(p.winAmount)} TC</span>
                    <span class="action-sub-text">KLIK UNTUK TARUHAN RONDE BERIKUTNYA</span>
                </button>
            `;
        }

        // 4. Default IDLE -> Show Green BET ("PASANG TARUHAN") button
        const subText = this.gameState === 'FLYING'
            ? `RONDE BERIKUTNYA (${financeManager.formatCurrency(p.bet)} TC)`
            : `${financeManager.formatCurrency(p.bet)} TC`;
        return `
            <button type="button" class="btn-crash-action btn-place-bet btn-ready-cast" data-panel="${panelKey}" id="btn-action-${panelKey}">
                <span class="action-main-text">🎣 PASANG TARUHAN</span>
                <span class="action-sub-text">${subText}</span>
            </button>
        `;
    }

    _updateWaitingUI() {
        if (!this.containerEl) return;
        const timerEl = this.containerEl.querySelector('#crash-wait-timer');
        if (timerEl) {
            timerEl.textContent = `MULAI DALAM ${Math.max(0, this.waitTimer).toFixed(1)}s`;
        }
        const barEl = this.containerEl.querySelector('#crash-wait-bar');
        if (barEl) {
            const pct = Math.max(0, Math.min(100, (this.waitTimer / this.waitDuration) * 100));
            barEl.style.width = `${pct}%`;
        }
    }

    _updateFlyingUI() {
        if (!this.containerEl) return;
        const multEl = this.containerEl.querySelector('#crash-main-multiplier');
        if (multEl) {
            multEl.textContent = `${this.currentMultiplier.toFixed(2)}×`;
        }

        const tierEl = this.containerEl.querySelector('#crash-fish-tier');
        if (tierEl) {
            tierEl.textContent = this._getCurrentFishLabel(this.currentMultiplier);
        }

        ['panel1', 'panel2'].forEach(key => {
            const p = this.panels[key];
            if (p.status === 'ACTIVE') {
                const cashoutAmtEl = this.containerEl.querySelector(`#cashout-amt-${key}`);
                if (cashoutAmtEl) {
                    const payout = Math.round(p.bet * this.currentMultiplier);
                    cashoutAmtEl.textContent = `${financeManager.formatCurrency(payout)} TC (${this.currentMultiplier.toFixed(2)}×)`;
                }
            }
        });
    }

    _updateUIState() {
        if (!this.containerEl) return;

        const overlay = this.containerEl.querySelector('#crash-center-overlay');
        if (overlay) {
            overlay.innerHTML = this._getCenterOverlayHTML();
        }

        const hashEl = this.containerEl.querySelector('#crash-round-hash');
        if (hashEl) {
            hashEl.textContent = `HASH: ${this.roundHash.substring(0, 14)}...`;
        }

        const histEl = this.containerEl.querySelector('#crash-history-container');
        if (histEl) {
            histEl.innerHTML = this._renderHistoryPillsHTML();
        }

        ['panel1', 'panel2'].forEach(key => {
            this._updatePanelActionUI(key);
        });
    }

    _updatePanelActionUI(panelKey) {
        if (!this.containerEl) return;
        const card = this.containerEl.querySelector(`#card-${panelKey}`);
        if (!card) return;

        const actionCol = card.querySelector('.action-btn-col');
        if (actionCol) {
            actionCol.innerHTML = this._getActionButtonHTML(panelKey);
            this._bindPanelActionButton(panelKey);
        }

        const p = this.panels[panelKey];
        const isLocked = (this.gameState === 'FLYING' && p.status === 'ACTIVE') || p.status === 'QUEUED';

        const betInput = card.querySelector(`#${panelKey}-bet-input`);
        if (betInput) betInput.disabled = isLocked;

        card.querySelectorAll('.btn-quick-chip').forEach(btn => {
            btn.disabled = isLocked;
        });
    }

    _syncAutoBetCheckbox(panelKey) {
        if (!this.containerEl) return;
        const cb = this.containerEl.querySelector(`#${panelKey}-autobet-toggle`);
        if (cb) cb.checked = this.panels[panelKey].autoBet;
    }

    _syncBetFromInput(panelKey) {
        if (!this.containerEl) return;
        const betInput = this.containerEl.querySelector(`#${panelKey}-bet-input`);
        if (betInput) {
            const parsed = parseInt(betInput.value.replace(/\D/g, ''), 10);
            if (!isNaN(parsed) && parsed > 0) {
                this.panels[panelKey].bet = Math.max(10000, Math.min(100000000, parsed));
                betInput.value = new Intl.NumberFormat('id-ID').format(this.panels[panelKey].bet);
            }
        }
    }

    _bindPanelActionButton(panelKey) {
        if (!this.containerEl) return;
        const btn = this.containerEl.querySelector(`#btn-action-${panelKey}`);
        if (!btn) return;

        btn.onclick = (e) => {
            e.preventDefault();
            pixiEffects.buttonPress(btn);
            this.handleMainAction(panelKey);
        };
    }

    /**
     * Binds DOM events, keyboard shortcuts, and starts the continuous Crash loop
     */
    bindEvents(container, onBalanceRefresh) {
        this.containerEl = container;
        this.onBalanceRefresh = onBalanceRefresh;

        const canvas = container.querySelector('#pixi-crash-canvas');
        if (canvas) {
            this.canvasEl = canvas;
            if (this.pixiStage) {
                this.pixiStage.destroy();
            }
            this.pixiStage = new PixiFishingStage(canvas);
        }

        this._bindPanelEvents('panel1');
        this._bindPanelEvents('panel2');

        // Spacebar shortcut: Cashout active panels during flight, or Place Bet on Panel 1 when idle
        if (typeof window !== 'undefined') {
            if (this._keyHandler) {
                window.removeEventListener('keydown', this._keyHandler);
            }
            this._keyHandler = (e) => {
                if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
                    e.preventDefault();
                    if (this.gameState === 'FLYING') {
                        if (this.panels.panel1.status === 'ACTIVE') this.cashOut('panel1', false);
                        else if (this.panels.panel2.status === 'ACTIVE') this.cashOut('panel2', false);
                    } else {
                        this.handleMainAction('panel1');
                    }
                }
            };
            window.addEventListener('keydown', this._keyHandler);
        }

        // Start continuous Crash game cycle!
        this._beginWaitingPhase();
        this._startTicker();
    }

    _bindPanelEvents(key) {
        if (!this.containerEl) return;
        const container = this.containerEl;
        const p = this.panels[key];

        // Bet input change
        const betInput = container.querySelector(`#${key}-bet-input`);
        if (betInput) {
            betInput.addEventListener('change', () => {
                const parsed = parseInt(betInput.value.replace(/\D/g, ''), 10) || 10000;
                p.bet = Math.max(10000, Math.min(100000000, parsed));
                betInput.value = new Intl.NumberFormat('id-ID').format(p.bet);
                this._updatePanelActionUI(key);
            });
        }

        // Quick chip buttons
        container.querySelectorAll(`.btn-quick-chip[data-panel="${key}"]`).forEach(qBtn => {
            qBtn.addEventListener('click', () => {
                pixiEffects.buttonPress(qBtn);
                const bal = gameState.getBalance();

                if (qBtn.dataset.add) {
                    p.bet = Math.min(100000000, Math.min(bal, p.bet + parseInt(qBtn.dataset.add, 10)));
                } else if (qBtn.dataset.mult) {
                    p.bet = Math.min(100000000, Math.min(bal, Math.max(10000, Math.round(p.bet * parseFloat(qBtn.dataset.mult)))));
                } else if (qBtn.dataset.max) {
                    p.bet = Math.min(100000000, Math.max(10000, bal));
                }

                if (betInput) {
                    betInput.value = new Intl.NumberFormat('id-ID').format(p.bet);
                }
                this._updatePanelActionUI(key);
            });
        });

        // Auto Bet Toggle
        const autoBetToggle = container.querySelector(`#${key}-autobet-toggle`);
        if (autoBetToggle) {
            autoBetToggle.addEventListener('change', () => {
                p.autoBet = autoBetToggle.checked;
                AuraSound.playClick?.();
                if (p.autoBet && p.status === 'IDLE') {
                    p.status = 'QUEUED';
                    this._updatePanelActionUI(key);
                } else if (!p.autoBet && p.status === 'QUEUED') {
                    p.status = 'IDLE';
                    this._updatePanelActionUI(key);
                }
            });
        }

        // Auto Cashout Toggle
        const toggle = container.querySelector(`#${key}-auto-toggle`);
        const targetWrap = container.querySelector(`#${key}-auto-wrap`);
        const targetInput = container.querySelector(`#${key}-auto-target`);

        if (toggle) {
            toggle.addEventListener('change', () => {
                p.autoCashoutEnabled = toggle.checked;
                if (targetWrap) {
                    targetWrap.classList.toggle('active', p.autoCashoutEnabled);
                }
                AuraSound.playClick?.();
            });
        }

        if (targetInput) {
            targetInput.addEventListener('change', () => {
                const val = parseFloat(targetInput.value) || 2.0;
                p.autoCashoutTarget = Math.max(1.1, Math.min(1000.0, val));
                targetInput.value = p.autoCashoutTarget.toFixed(2);
            });
        }

        this._bindPanelActionButton(key);
    }

    destroy() {
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }

        if (this._keyHandler && typeof window !== 'undefined') {
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

export default CrashEngine;
