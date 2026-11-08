/**
 * LotteryEngine.js - Refactored Luxury VIP Togel 4D Terminal
 * Theme: Cyber-VIP Arcade Cabinet with Gold Bezel & Mechanical Tumblers
 * Features:
 * - Ultra-responsive, compact luxury UI matching Slot Theater
 * - 4 Mechanical Tumbler Drums (As, Kop, Kepala, Ekor) with smooth 3D tumbler lighting
 * - Dual-tab Market navigation:
 *   1) 🎯 4D / 3D / 2D (Straight Guessing with Quick Digit Fillers & Preset Packages)
 *   2) 🎲 Colok Bebas & 50:50 (Quick Action Betting)
 * - Live Draw countdown, realistic drum rolling, and instant win celebration
 * - In-place DOM updates preventing unnecessary layout jumps
 */

import financeManager from '../finance/FinanceManager.js';
import gameState from '../core/GameState.js';
import ui from '../ui/UIManager.js';
import pixiEffects from '../graphics/PixiEffects.js';

export class LotteryEngine {
    constructor(onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;
        this.activeMarketTab = '4d'; // '4d' | 'quick'
        this.isDrawing = false;
        
        // 4D Digits: [As, Kop, Kepala, Ekor]
        this.digits = ['7', '4', '2', '9'];
        this.activeDigitSlot = 0; // Current active slot index (0 - 3)

        // Package toggles
        this.bet4D = true;
        this.bet3D = true;
        this.bet2D = true;

        // Quick Bets states
        this.selectedColokDigit = 7;
        this.selectedFiftyChoice = 'besar'; // 'besar' | 'kecil' | 'genap' | 'ganjil'

        this.ticketUnitCost = 10000;
    }

    getRateStatusHTML() {
        const plays = gameState.get('casino.ratePlays') || 0;
        const rateOn = plays >= 250;
        return rateOn 
            ? `<div class="rate-badge rate-on-badge" style="display:inline-flex; align-items:center; gap:0.3rem; background:linear-gradient(135deg,#ef4444,#fbbf24); color:#fff; font-weight:900; font-size:0.7rem; padding:0.2rem 0.6rem; border-radius:999px; box-shadow:0 0 10px rgba(239,68,68,0.6); animation: rateGlow 1s ease-in-out infinite alternate; text-transform:uppercase; border: 1.5px solid #fff;">⚡ RATE ON</div>`
            : `<div class="rate-badge rate-off-badge" style="display:inline-flex; align-items:center; gap:0.3rem; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.65); font-weight:800; font-size:0.68rem; padding:0.18rem 0.5rem; border-radius:999px;">RATE: OFF (${plays}/250)</div>`;
    }

    get lotteryTokens() {
        return gameState.get('casino.lotteryTokens') || 0;
    }
    set lotteryTokens(val) {
        gameState.set('casino.lotteryTokens', Math.max(0, val));
    }

    getJackpot() {
        let jp = gameState.get('casino.lotteryJackpot');
        if (jp === undefined || jp === null) {
            jp = 25000000;
            gameState.set('casino.lotteryJackpot', jp);
        }
        return jp;
    }

    setJackpot(amount) {
        gameState.set('casino.lotteryJackpot', amount);
    }

    getHistory() {
        return gameState.get('casino.lotteryHistory') || [
            { id: 1, numbers: '8415', market: '4D/3D/2D', payout: 700000, isWin: true },
            { id: 2, numbers: '3920', market: 'Colok Bebas', payout: 155000, isWin: true },
            { id: 3, numbers: '7108', market: '50:50', payout: 0, isWin: false }
        ];
    }

    saveHistory(history) {
        gameState.set('casino.lotteryHistory', history.slice(0, 10));
    }

    getHTML() {
        const jackpot = this.getJackpot();
        const history = this.getHistory();

        const historyRows = history.slice(0, 3).map(h => `
            <div class="hist-chip ${h.isWin ? 'won' : ''}">
                <span class="hist-num">${h.numbers}</span>
                <span class="hist-tag">${h.market}</span>
                <span class="hist-win ${h.isWin ? 'win' : ''}">${h.isWin ? '+' + financeManager.formatCurrency(h.payout) : 'ZONK'}</span>
            </div>
        `).join('');

        return `
        <div class="togel-theater-root">
            <!-- Top Industrial Lights -->
            <div class="theater-marquee-lights">
                ${Array.from({length: 11}, (_, i) => `<div class="mini-bulb ${i % 2 === 0 ? 'gold' : 'amber'}"></div>`).join('')}
            </div>

            <!-- Arcade Header -->
            <div class="togel-header-card">
                <div class="header-left">
                    <button type="button" class="btn-lobby-pill" title="Buka Menu Game (L)"><span>☰</span> LOBBY</button>
                    <div class="header-titles">
                        <h3 class="arcade-title">🎫 VIP 4D TOGEL</h3>
                        <span class="arcade-sub">RESMI SINGAPORE &amp; MACAU 4D POOLS</span>
                    </div>
                </div>
                <div class="header-right">
                    ${this.getRateStatusHTML()}
                </div>
            </div>

            <!-- Grand Progressive Jackpot Ribbon -->
            <div class="jackpot-ribbon">
                <div class="ribbon-glow"></div>
                <div class="ribbon-badge">🏆 4D GRAND JACKPOT POOL</div>
                <div class="ribbon-value">
                    <span class="curr">$</span>
                    <span id="togel-jackpot-pool-val">${jackpot.toLocaleString('en-US')}</span>
                    <span class="unit">TC</span>
                </div>
            </div>

            <!-- 4-Reel Drum Tumbler Chamber (The Stage) -->
            <div class="drum-chamber-theater">
                <div class="chamber-header-strip">
                    <span class="live-dot"></span>
                    <span class="strip-text">LIVE MECHANICAL TUMBLER DRAW</span>
                    <span class="token-pill" id="togel-token-display">🎟️ ${this.lotteryTokens} TIKET GRATIS</span>
                </div>

                <div class="tumblers-row" id="togel-drums-container">
                    <div class="tumbler-col" id="drum-0">
                        <span class="tumbler-label">AS (1)</span>
                        <div class="tumbler-disc"><span class="digit-text">?</span></div>
                    </div>
                    <div class="tumbler-col" id="drum-1">
                        <span class="tumbler-label">KOP (2)</span>
                        <div class="tumbler-disc"><span class="digit-text">?</span></div>
                    </div>
                    <div class="tumbler-col" id="drum-2">
                        <span class="tumbler-label">KEPALA (3)</span>
                        <div class="tumbler-disc"><span class="digit-text">?</span></div>
                    </div>
                    <div class="tumbler-col" id="drum-3">
                        <span class="tumbler-label">EKOR (4)</span>
                        <div class="tumbler-disc"><span class="digit-text">?</span></div>
                    </div>
                </div>

                <!-- Status Marquee Ticker -->
                <div class="chamber-status-ticker" id="togel-drum-status">
                    Silakan racik 4 digit angka hoki Anda dan tekan PUTAR...
                </div>
            </div>

            <!-- Market Tabs Bar -->
            <div class="market-segmented-tabs">
                <button class="seg-tab ${this.activeMarketTab === '4d' ? 'active' : ''}" data-tab="4d">
                    <span class="icon">🎯</span> 4D / 3D / 2D STRAIGHT
                </button>
                <button class="seg-tab ${this.activeMarketTab === 'quick' ? 'active' : ''}" data-tab="quick">
                    <span class="icon">🎲</span> COLOK &amp; 50:50 (SIDE BETS)
                </button>
            </div>

            <!-- Interactive Workspace Deck -->
            <div class="market-workspace-deck">
                
                <!-- TAB 1: 4D / 3D / 2D STRAIGHT -->
                <div class="tab-page ${this.activeMarketTab === '4d' ? 'active' : ''}" id="page-tab-4d">
                    <div class="digit-picker-card">
                        <div class="picker-top-row">
                            <div class="caption-with-badge">
                                <span class="card-caption">MASUKKAN 4 DIGIT TEBAKAN</span>
                                <span class="caption-sub">AS • KOP • KEPALA • EKOR</span>
                            </div>
                            <div class="picker-actions">
                                <button type="button" id="btn-quickpick-4d" class="btn-micro-action" title="Acak 4 Digit Hoki">⚡ Acak Hoki</button>
                                <button type="button" id="btn-clear-4d" class="btn-micro-action clear" title="Reset Semua Digit">🧹 Reset</button>
                            </div>
                        </div>

                        <!-- 4 Discrete Digit Slot Chambers (Anti-Blowout Flex/Grid) -->
                        <div class="digit-inputs-chamber">
                            <div class="digit-slot-card ${this.activeDigitSlot === 0 ? 'focused' : ''}" id="slot-wrap-0" data-index="0">
                                <span class="slot-pos-tag">AS (1)</span>
                                <input type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="1" class="box-digit-input" id="digit-in-0" value="${this.digits[0] ?? '7'}" placeholder="0" autocomplete="off">
                            </div>
                            <div class="digit-slot-card ${this.activeDigitSlot === 1 ? 'focused' : ''}" id="slot-wrap-1" data-index="1">
                                <span class="slot-pos-tag">KOP (2)</span>
                                <input type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="1" class="box-digit-input" id="digit-in-1" value="${this.digits[1] ?? '4'}" placeholder="0" autocomplete="off">
                            </div>
                            <div class="digit-slot-card ${this.activeDigitSlot === 2 ? 'focused' : ''}" id="slot-wrap-2" data-index="2">
                                <span class="slot-pos-tag">KEPALA (3)</span>
                                <input type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="1" class="box-digit-input" id="digit-in-2" value="${this.digits[2] ?? '2'}" placeholder="0" autocomplete="off">
                            </div>
                            <div class="digit-slot-card ${this.activeDigitSlot === 3 ? 'focused' : ''}" id="slot-wrap-3" data-index="3">
                                <span class="slot-pos-tag">EKOR (4)</span>
                                <input type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="1" class="box-digit-input" id="digit-in-3" value="${this.digits[3] ?? '9'}" placeholder="0" autocomplete="off">
                            </div>
                        </div>

                        <!-- Mobile-Friendly Quick Touch Keypad -->
                        <div class="digit-touch-keypad">
                            <span class="keypad-title">KEYPAD CEPAT (SENTUH LANGSUNG):</span>
                            <div class="keypad-buttons-grid">
                                ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => `
                                    <button type="button" class="numpad-key-btn" data-key="${n}">${n}</button>
                                `).join('')}
                                <button type="button" class="numpad-key-btn action-del" data-key="backspace" title="Hapus Digit">⌫</button>
                            </div>
                        </div>

                        <!-- Live Guess Breakdown Preview -->
                        <div class="guess-preview-pill">
                            <span class="preview-lbl">ANGKA TEBAKAN:</span>
                            <div class="preview-values">
                                <span class="badge-combo">4D: <b id="lbl-prev-4d">${(this.digits[0]||'0')+(this.digits[1]||'0')+(this.digits[2]||'0')+(this.digits[3]||'0')}</b></span>
                                <span class="badge-combo">3D: <b id="lbl-prev-3d">${(this.digits[1]||'0')+(this.digits[2]||'0')+(this.digits[3]||'0')}</b></span>
                                <span class="badge-combo">2D: <b id="lbl-prev-2d">${(this.digits[2]||'0')+(this.digits[3]||'0')}</b></span>
                            </div>
                        </div>

                        <!-- Package Selection Strip -->
                        <div class="package-strip">
                            <label class="pkg-chip ${this.bet4D ? 'checked' : ''}">
                                <input type="checkbox" id="chk-bet-4d" ${this.bet4D ? 'checked' : ''}>
                                <div class="pkg-label">
                                    <span class="pkg-code">4D STRAIGHT</span>
                                    <span class="pkg-rate">3.000× + JP</span>
                                </div>
                            </label>
                            <label class="pkg-chip ${this.bet3D ? 'checked' : ''}">
                                <input type="checkbox" id="chk-bet-3d" ${this.bet3D ? 'checked' : ''}>
                                <div class="pkg-label">
                                    <span class="pkg-code">3D BELAKANG</span>
                                    <span class="pkg-rate">400×</span>
                                </div>
                            </label>
                            <label class="pkg-chip ${this.bet2D ? 'checked' : ''}">
                                <input type="checkbox" id="chk-bet-2d" ${this.bet2D ? 'checked' : ''}>
                                <div class="pkg-label">
                                    <span class="pkg-code">2D EKOR</span>
                                    <span class="pkg-rate">70×</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- TAB 2: COLOK & 50:50 SIDE BETS -->
                <div class="tab-page ${this.activeMarketTab === 'quick' ? 'active' : ''}" id="page-tab-quick">
                    <div class="sidebets-layout">
                        <!-- Colok Bebas Block -->
                        <div class="sidebet-block">
                            <div class="block-head">
                                <span class="card-caption">🎲 COLOK BEBAS (TEBAK 1 ANGKA)</span>
                                <span class="rate-tag">1.55×</span>
                            </div>
                            <div class="colok-keypad-10">
                                ${[0,1,2,3,4,5,6,7,8,9].map(n => `
                                    <button type="button" class="colok-btn ${this.selectedColokDigit === n ? 'active' : ''}" data-digit="${n}">
                                        ${n}
                                    </button>
                                `).join('')}
                            </div>
                        </div>

                        <!-- 50:50 Block -->
                        <div class="sidebet-block">
                            <div class="block-head">
                                <span class="card-caption">⚖️ 50:50 (DIHITUNG DARI 2D)</span>
                                <span class="rate-tag">1.95×</span>
                            </div>
                            <div class="fifty-quad-grid">
                                <button type="button" class="fifty-pill ${this.selectedFiftyChoice === 'besar' ? 'active' : ''}" data-choice="besar">
                                    <span class="f-title">BESAR</span>
                                    <span class="f-sub">50 - 99</span>
                                </button>
                                <button type="button" class="fifty-pill ${this.selectedFiftyChoice === 'kecil' ? 'active' : ''}" data-choice="kecil">
                                    <span class="f-title">KECIL</span>
                                    <span class="f-sub">00 - 49</span>
                                </button>
                                <button type="button" class="fifty-pill ${this.selectedFiftyChoice === 'genap' ? 'active' : ''}" data-choice="genap">
                                    <span class="f-title">GENAP</span>
                                    <span class="f-sub">Ekor Genap</span>
                                </button>
                                <button type="button" class="fifty-pill ${this.selectedFiftyChoice === 'ganjil' ? 'active' : ''}" data-choice="ganjil">
                                    <span class="f-title">GANJIL</span>
                                    <span class="f-sub">Ekor Ganjil</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Docked Bottom Control Deck -->
                <div class="docked-control-deck">
                    <div class="bet-adjust-row">
                        <div class="stake-label-box">
                            <span class="deck-lbl">TARUHAN PER PAKET</span>
                            <span class="deck-cost" id="togel-cost-breakdown">Total: $ 30,000 (3 Paket)</span>
                        </div>
                        <div class="stake-input-box">
                            <span class="curr-sign">$</span>
                            <input type="text" id="togel-bet-input" value="10,000" ${this.isDrawing ? 'disabled' : ''}>
                        </div>
                    </div>

                    <div class="chips-row">
                        <button type="button" class="deck-chip togel-preset" data-val="10000" ${this.isDrawing ? 'disabled' : ''}>$10K</button>
                        <button type="button" class="deck-chip togel-preset" data-val="50000" ${this.isDrawing ? 'disabled' : ''}>$50K</button>
                        <button type="button" class="deck-chip togel-preset" data-val="250000" ${this.isDrawing ? 'disabled' : ''}>$250K</button>
                        <button type="button" class="deck-chip togel-preset" data-val="1000000" ${this.isDrawing ? 'disabled' : ''}>$1M</button>
                        <button type="button" class="deck-chip chip-max togel-preset" id="btn-togel-max" ${this.isDrawing ? 'disabled' : ''}>MAX</button>
                    </div>

                    <div class="action-buttons-row">
                        <button type="button" id="btn-togel-draw" class="btn-giant-draw buy" ${this.isDrawing ? 'disabled' : ''}>
                            🎲 PASANG &amp; PUTAR DRUM
                        </button>
                        <button type="button" id="btn-togel-token" class="btn-giant-draw token" ${this.lotteryTokens <= 0 || this.isDrawing ? 'disabled' : ''}>
                            🎟️ PUTAR TOKEN (${this.lotteryTokens})
                        </button>
                    </div>
                </div>

            </div>

            <!-- Compact Result History & Payout Bottom Strip -->
            <div class="bottom-history-strip">
                <span class="hist-label">HASIL SEBELUMNYA:</span>
                <div class="hist-list" id="togel-history-list">
                    ${historyRows}
                </div>
            </div>

        </div>

        <style>
            .togel-theater-root {
                max-width: 620px;
                margin: 0 auto;
                text-align: center;
                animation: fade-up 0.3s ease;
                box-sizing: border-box;
                padding: 0.1rem 0.2rem 1.5rem 0.2rem;
            }

            /* Industrial Light Bar */
            .theater-marquee-lights {
                display: flex;
                justify-content: center;
                gap: 0.4rem;
                margin-bottom: 0.35rem;
            }
            .mini-bulb {
                width: 7px;
                height: 7px;
                border-radius: 50%;
            }
            .mini-bulb.gold {
                background: #fbbf24;
                box-shadow: 0 0 6px #fbbf24;
                animation: lightBlink 0.6s infinite alternate;
            }
            .mini-bulb.amber {
                background: #f97316;
                box-shadow: 0 0 6px #f97316;
                animation: lightBlink 0.9s infinite alternate;
            }

            /* Header Card */
            .togel-header-card {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: rgba(22, 17, 13, 0.85);
                border: 1px solid rgba(251, 191, 36, 0.2);
                border-radius: 12px;
                padding: 0.45rem 0.75rem;
                margin-bottom: 0.5rem;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            }
            .header-left {
                display: flex;
                align-items: center;
                gap: 0.6rem;
                text-align: left;
            }
            .header-titles { line-height: 1.15; }
            .arcade-title {
                font-family: var(--font-display, 'Russo One', sans-serif);
                font-size: 1.15rem;
                font-weight: 900;
                color: #fbbf24;
                margin: 0;
                letter-spacing: 0.04em;
            }
            .arcade-sub {
                font-size: 0.58rem;
                color: rgba(255,255,255,0.45);
                font-weight: 800;
                letter-spacing: 0.08em;
            }

            /* Progressive Jackpot Ribbon */
            .jackpot-ribbon {
                position: relative;
                background: radial-gradient(circle at 50% 0%, #3a2618 0%, #15100c 100%);
                border: 2px solid #fbbf24;
                border-radius: 12px;
                padding: 0.5rem 0.75rem;
                margin-bottom: 0.6rem;
                box-shadow: 0 0 18px rgba(251,191,36,0.25), inset 0 0 15px rgba(0,0,0,0.9);
                overflow: hidden;
            }
            .ribbon-badge {
                font-family: var(--font-display, sans-serif);
                font-size: 0.65rem;
                color: #fbbf24;
                font-weight: 900;
                letter-spacing: 0.12em;
            }
            .ribbon-value {
                font-family: var(--font-num, monospace);
                font-size: 1.95rem;
                font-weight: 900;
                color: #fff;
                letter-spacing: 0.05em;
                text-shadow: 0 0 16px rgba(251,191,36,0.7);
                display: flex;
                align-items: baseline;
                justify-content: center;
                gap: 0.25rem;
            }
            .ribbon-value .curr { color: #fbbf24; font-size: 1.2rem; }
            .ribbon-value .unit { font-size: 0.75rem; color: #fbbf24; font-weight: 800; }

            /* 4-Drum Chamber */
            .drum-chamber-theater {
                background: linear-gradient(180deg, #1b1510 0%, #0d0a08 100%);
                border: 3px solid #33271d;
                border-top: 3px solid #4a392b;
                border-radius: 16px;
                padding: 0.65rem 0.75rem;
                margin-bottom: 0.65rem;
                box-shadow: 0 12px 35px rgba(0,0,0,0.9), inset 0 0 20px rgba(0,0,0,0.95);
            }
            .chamber-header-strip {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 0.62rem;
                font-weight: 800;
                color: rgba(255,255,255,0.6);
                border-bottom: 1px solid rgba(255,255,255,0.06);
                padding-bottom: 0.4rem;
                margin-bottom: 0.55rem;
            }
            .live-dot {
                width: 7px;
                height: 7px;
                background: #ef4444;
                border-radius: 50%;
                display: inline-block;
                animation: rateGlow 1s infinite alternate;
            }
            .token-pill {
                color: #c084fc;
                background: rgba(168,85,247,0.15);
                border: 1px solid rgba(168,85,247,0.3);
                padding: 2px 6px;
                border-radius: 4px;
            }

            .tumblers-row {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 0.55rem;
                margin-bottom: 0.55rem;
            }
            .tumbler-col {
                background: rgba(0,0,0,0.4);
                border: 1.5px solid rgba(255,255,255,0.08);
                border-radius: 10px;
                padding: 0.4rem 0.2rem;
                position: relative;
                overflow: hidden;
            }
            .tumbler-label {
                font-size: 0.58rem;
                font-weight: 900;
                color: rgba(255,255,255,0.4);
                letter-spacing: 0.08em;
                display: block;
                margin-bottom: 0.2rem;
            }
            .tumbler-disc {
                height: 52px;
                background: radial-gradient(circle at 35% 35%, #291e16 0%, #100c09 100%);
                border: 2px solid #fbbf24;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: inset 0 0 10px rgba(0,0,0,0.95), 0 0 10px rgba(251,191,36,0.25);
            }
            .digit-text {
                font-family: var(--font-num, monospace);
                font-size: 2.1rem;
                font-weight: 900;
                color: #fbbf24;
                line-height: 1;
            }
            .tumbler-disc.spinning {
                animation: drumSpin 0.08s linear infinite;
                border-color: #ef4444;
            }
            .tumbler-disc.spinning .digit-text { color: #ef4444; }
            .tumbler-disc.revealed {
                background: radial-gradient(circle at 35% 35%, #fde047 0%, #d97706 70%, #78350f 100%);
                border-color: #fff;
                box-shadow: 0 0 18px rgba(251,191,36,0.85);
                animation: popIn 0.3s ease-out;
            }
            .tumbler-disc.revealed .digit-text { color: #000; }

            .chamber-status-ticker {
                font-size: 0.7rem;
                color: rgba(255,255,255,0.7);
                font-style: italic;
                min-height: 20px;
                padding: 0.2rem;
            }

            /* Market Tabs */
            .market-segmented-tabs {
                display: grid;
                grid-template-columns: 1.2fr 1fr;
                gap: 0.35rem;
                margin-bottom: 0.55rem;
            }
            .seg-tab {
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 8px;
                color: rgba(255,255,255,0.7);
                font-size: 0.72rem;
                font-weight: 800;
                padding: 0.5rem 0.25rem;
                cursor: pointer;
                transition: all 0.15s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.3rem;
            }
            .seg-tab:hover { background: rgba(255,255,255,0.08); }
            .seg-tab.active {
                background: linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(217,119,6,0.25) 100%);
                border-color: #fbbf24;
                color: #fbbf24;
                box-shadow: 0 0 10px rgba(251,191,36,0.25);
            }

            /* Workspace Deck */
            .market-workspace-deck {
                background: rgba(20, 16, 12, 0.85);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 14px;
                padding: 0.75rem;
                box-shadow: 0 6px 20px rgba(0,0,0,0.6);
                margin-bottom: 0.6rem;
                text-align: left;
            }
            .tab-page { display: none; }
            .tab-page.active { display: block; animation: fade-up 0.2s ease; }

            /* 4D Digit Grid */
            .picker-top-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.45rem;
            }
            .card-caption {
                font-size: 0.68rem;
                font-weight: 800;
                color: rgba(255,255,255,0.5);
                letter-spacing: 0.06em;
            }
            .btn-micro-action {
                background: rgba(251,191,36,0.12);
                border: 1px solid rgba(251,191,36,0.3);
                color: #fbbf24;
                font-size: 0.65rem;
                font-weight: 800;
                padding: 2px 7px;
                border-radius: 6px;
                cursor: pointer;
            }
            .btn-micro-action.clear {
                background: rgba(255,255,255,0.05);
                border-color: rgba(255,255,255,0.12);
                color: rgba(255,255,255,0.6);
            }
            /* 4D Digit Input Chamber (Anti-Blowout Responsive Grid) */
            .caption-with-badge {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                line-height: 1.15;
            }
            .caption-sub {
                font-size: 0.58rem;
                font-weight: 800;
                color: #fbbf24;
                letter-spacing: 0.08em;
            }
            .digit-inputs-chamber {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 0.45rem;
                width: 100%;
                margin-bottom: 0.55rem;
                box-sizing: border-box;
            }
            .digit-slot-card {
                background: linear-gradient(180deg, #18120d 0%, #0d0907 100%);
                border: 1.5px solid rgba(255,255,255,0.12);
                border-radius: 10px;
                padding: 0.35rem 0.25rem 0.3rem 0.25rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                box-sizing: border-box;
                transition: all 0.2s ease;
                min-width: 0;
                cursor: pointer;
            }
            .digit-slot-card.focused {
                border-color: #fbbf24;
                box-shadow: 0 0 12px rgba(251,191,36,0.4);
                background: linear-gradient(180deg, #241b12 0%, #150f0a 100%);
            }
            .slot-pos-tag {
                font-size: 0.58rem;
                font-weight: 900;
                color: rgba(255,255,255,0.5);
                letter-spacing: 0.08em;
                margin-bottom: 0.2rem;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .digit-slot-card.focused .slot-pos-tag {
                color: #fbbf24;
            }
            .box-digit-input {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                height: 48px;
                background: #090706;
                border: 1.5px solid rgba(255,255,255,0.12);
                border-radius: 8px;
                color: #fff;
                font-family: var(--font-num, monospace);
                font-size: 1.95rem;
                font-weight: 900;
                text-align: center;
                outline: none;
                box-sizing: border-box !important;
                padding: 0 !important;
                margin: 0 !important;
                transition: border-color 0.2s, box-shadow 0.2s, color 0.2s;
            }
            .box-digit-input:focus {
                border-color: #fbbf24;
                box-shadow: 0 0 10px rgba(251,191,36,0.5);
                color: #fbbf24;
            }

            /* Quick Touch Keypad */
            .digit-touch-keypad {
                background: rgba(0,0,0,0.3);
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 8px;
                padding: 0.35rem 0.45rem;
                margin-bottom: 0.55rem;
                box-sizing: border-box;
            }
            .keypad-title {
                font-size: 0.58rem;
                font-weight: 800;
                color: rgba(255,255,255,0.45);
                display: block;
                margin-bottom: 0.25rem;
                letter-spacing: 0.06em;
            }
            .keypad-buttons-grid {
                display: grid;
                grid-template-columns: repeat(11, minmax(0, 1fr));
                gap: 0.25rem;
            }
            .numpad-key-btn {
                height: 32px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 6px;
                color: #fff;
                font-family: var(--font-num, monospace);
                font-size: 0.95rem;
                font-weight: 900;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                box-sizing: border-box;
                transition: all 0.1s;
                -webkit-tap-highlight-color: transparent;
            }
            .numpad-key-btn:hover {
                background: rgba(251,191,36,0.2);
                border-color: #fbbf24;
                color: #fbbf24;
            }
            .numpad-key-btn:active {
                transform: scale(0.92);
                background: #fbbf24;
                color: #000;
            }
            .numpad-key-btn.action-del {
                background: rgba(239,68,68,0.18);
                border-color: rgba(239,68,68,0.35);
                color: #f87171;
            }
            .numpad-key-btn.action-del:hover {
                background: #ef4444;
                color: #fff;
            }

            /* Live Guess Preview Pill */
            .guess-preview-pill {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: rgba(251,191,36,0.06);
                border: 1px dashed rgba(251,191,36,0.3);
                border-radius: 8px;
                padding: 0.3rem 0.55rem;
                margin-bottom: 0.55rem;
                box-sizing: border-box;
            }
            .preview-lbl {
                font-size: 0.6rem;
                font-weight: 900;
                color: rgba(255,255,255,0.5);
                letter-spacing: 0.06em;
            }
            .preview-values {
                display: flex;
                gap: 0.55rem;
            }
            .badge-combo {
                font-size: 0.65rem;
                font-weight: 800;
                color: rgba(255,255,255,0.65);
            }
            .badge-combo b {
                color: #fbbf24;
                font-family: var(--font-num, monospace);
                font-size: 0.78rem;
                letter-spacing: 0.05em;
            }

            .package-strip {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 0.35rem;
                margin-bottom: 0.75rem;
            }
            .pkg-chip {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 8px;
                padding: 0.4rem 0.3rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.35rem;
                transition: all 0.15s;
            }
            .pkg-chip.checked {
                background: rgba(251,191,36,0.08);
                border-color: rgba(251,191,36,0.35);
            }
            .pkg-label { line-height: 1.1; }
            .pkg-code { font-size: 0.68rem; font-weight: 900; color: #fff; display: block; }
            .pkg-rate { font-size: 0.6rem; font-weight: 800; color: #fbbf24; }

            /* Sidebets */
            .sidebets-layout {
                display: flex;
                flex-direction: column;
                gap: 0.6rem;
                margin-bottom: 0.75rem;
            }
            .sidebet-block {
                background: rgba(0,0,0,0.25);
                border: 1px solid rgba(255,255,255,0.05);
                border-radius: 10px;
                padding: 0.5rem;
            }
            .block-head {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.4rem;
            }
            .rate-tag { font-size: 0.68rem; font-weight: 900; color: #fbbf24; }
            .colok-keypad-10 {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 0.35rem;
            }
            .colok-btn {
                height: 38px;
                border-radius: 8px;
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.1);
                color: #fff;
                font-family: var(--font-num, monospace);
                font-size: 1.15rem;
                font-weight: 900;
                cursor: pointer;
                transition: all 0.15s;
            }
            .colok-btn.active {
                background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%);
                color: #000;
                border-color: #fff;
                box-shadow: 0 0 10px rgba(251,191,36,0.6);
            }

            .fifty-quad-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 0.3rem;
            }
            .fifty-pill {
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 8px;
                padding: 0.4rem 0.2rem;
                cursor: pointer;
                text-align: center;
                transition: all 0.15s;
            }
            .fifty-pill.active {
                background: rgba(251,191,36,0.18);
                border-color: #fbbf24;
                box-shadow: 0 0 10px rgba(251,191,36,0.25);
            }
            .f-title { font-size: 0.72rem; font-weight: 900; color: #fff; display: block; }
            .fifty-pill.active .f-title { color: #fbbf24; }
            .f-sub { font-size: 0.58rem; color: rgba(255,255,255,0.4); display: block; }

            /* Docked Deck */
            .docked-control-deck {
                border-top: 1px solid rgba(255,255,255,0.08);
                padding-top: 0.65rem;
                display: flex;
                flex-direction: column;
                gap: 0.45rem;
            }
            .bet-adjust-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .stake-label-box { line-height: 1.15; }
            .deck-lbl { font-size: 0.62rem; color: rgba(255,255,255,0.5); font-weight: 800; display: block; }
            .deck-cost { font-size: 0.75rem; color: #10b981; font-weight: 900; }
            .stake-input-box {
                display: flex;
                align-items: center;
                gap: 0.2rem;
                border-bottom: 1.5px solid rgba(251,191,36,0.5);
            }
            .curr-sign { font-size: 1.1rem; color: #fbbf24; font-weight: 900; }
            #togel-bet-input {
                background: transparent;
                border: none;
                font-family: var(--font-num, monospace);
                font-size: 1.25rem;
                font-weight: 900;
                color: #fff;
                width: 110px;
                text-align: right;
                outline: none;
            }

            .chips-row {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 0.25rem;
            }
            .deck-chip {
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.08);
                color: rgba(255,255,255,0.85);
                font-size: 0.68rem;
                font-weight: 800;
                padding: 0.3rem 0.15rem;
                border-radius: 6px;
                cursor: pointer;
            }
            .deck-chip:hover { border-color: #fbbf24; color: #fbbf24; }
            .deck-chip.chip-max { background: rgba(251,191,36,0.12); border-color: rgba(251,191,36,0.3); color: #fbbf24; }

            .action-buttons-row {
                display: flex;
                gap: 0.4rem;
                margin-top: 0.2rem;
            }
            .btn-giant-draw {
                font-family: var(--font-display, 'Russo One', sans-serif);
                border: none;
                border-radius: 10px;
                padding: 0.85rem 0.5rem;
                font-size: 1rem;
                color: #fff;
                cursor: pointer;
                letter-spacing: 0.04em;
                transition: all 0.15s;
            }
            .btn-giant-draw.buy {
                flex: 1.6;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                box-shadow: 0 4px 14px rgba(245,158,11,0.35);
            }
            .btn-giant-draw.token {
                flex: 1.2;
                background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
                box-shadow: 0 4px 14px rgba(168,85,247,0.35);
            }
            .btn-giant-draw:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); }
            .btn-giant-draw:disabled { opacity: 0.45; cursor: not-allowed; }

            /* Bottom History Strip */
            .bottom-history-strip {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                background: rgba(0,0,0,0.35);
                border: 1px solid rgba(255,255,255,0.05);
                border-radius: 8px;
                padding: 0.35rem 0.6rem;
                overflow-x: auto;
            }
            .hist-label {
                font-size: 0.6rem;
                font-weight: 800;
                color: rgba(255,255,255,0.4);
                white-space: nowrap;
            }
            .hist-list {
                display: flex;
                gap: 0.4rem;
                flex: 1;
            }
            .hist-chip {
                display: inline-flex;
                align-items: center;
                gap: 0.3rem;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 4px;
                padding: 2px 6px;
                font-size: 0.65rem;
                white-space: nowrap;
            }
            .hist-chip.won { border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.08); }
            .hist-num { font-family: var(--font-num, monospace); font-weight: 900; color: #fbbf24; }
            .hist-tag { color: rgba(255,255,255,0.5); font-size: 0.58rem; }
            .hist-win { color: rgba(255,255,255,0.3); }
            .hist-win.win { color: #10b981; font-weight: 800; }

            @media (max-width: 480px) {
                .tumbler-disc { height: 44px; }
                .digit-text { font-size: 1.7rem; }
                .box-digit-input { height: 44px; font-size: 1.7rem; }
                .btn-giant-draw { font-size: 0.85rem; padding: 0.75rem 0.35rem; }
            }
        </style>
        `;
    }

    bindEvents(container, onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;

        const betInput = document.getElementById('togel-bet-input');
        if (betInput) {
            import('../ui/UIManager.js').then(m => {
                m.default.setupNumericInput(betInput);
                betInput.addEventListener('input', () => this.updateCostBreakdown());
            });
        }

        // Preset chips
        container.querySelectorAll('.togel-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isDrawing) return;
                import('../ui/AuraSound.js').then(m => m.default.playTap());
                const balance = gameState.getBalance();
                const input = document.getElementById('togel-bet-input');
                if (!input) return;
                if (btn.id === 'btn-togel-max') {
                    input.value = balance.toLocaleString('en-US');
                } else {
                    input.value = parseInt(btn.dataset.val).toLocaleString('en-US');
                }
                input.dispatchEvent(new Event('input'));
            });
        });

        // Market Tabs
        container.querySelectorAll('.seg-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isDrawing) return;
                import('../ui/AuraSound.js').then(m => m.default.playTap());
                this.activeMarketTab = btn.dataset.tab;
                
                // Toggle active class on buttons
                container.querySelectorAll('.seg-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Toggle active pages without wiping the drum stage
                const page4d = document.getElementById('page-tab-4d');
                const pageQuick = document.getElementById('page-tab-quick');
                if (page4d && pageQuick) {
                    page4d.classList.toggle('active', this.activeMarketTab === '4d');
                    pageQuick.classList.toggle('active', this.activeMarketTab === 'quick');
                }
                this.updateCostBreakdown();
            });
        });

        // Update live preview of chosen digits (4D, 3D, 2D)
        this.updateGuessPreview = () => {
            const d0 = this.digits[0] !== '' && this.digits[0] !== undefined ? this.digits[0] : '-';
            const d1 = this.digits[1] !== '' && this.digits[1] !== undefined ? this.digits[1] : '-';
            const d2 = this.digits[2] !== '' && this.digits[2] !== undefined ? this.digits[2] : '-';
            const d3 = this.digits[3] !== '' && this.digits[3] !== undefined ? this.digits[3] : '-';

            const p4d = document.getElementById('lbl-prev-4d');
            const p3d = document.getElementById('lbl-prev-3d');
            const p2d = document.getElementById('lbl-prev-2d');

            if (p4d) p4d.textContent = `${d0}${d1}${d2}${d3}`;
            if (p3d) p3d.textContent = `${d1}${d2}${d3}`;
            if (p2d) p2d.textContent = `${d2}${d3}`;
        };

        const setActiveSlot = (idx) => {
            this.activeDigitSlot = Math.max(0, Math.min(3, idx));
            [0, 1, 2, 3].forEach(i => {
                const wrap = document.getElementById(`slot-wrap-${i}`);
                if (wrap) wrap.classList.toggle('focused', i === this.activeDigitSlot);
            });
            const targetIn = document.getElementById(`digit-in-${this.activeDigitSlot}`);
            if (targetIn && document.activeElement !== targetIn) {
                targetIn.focus();
                targetIn.select();
            }
        };

        // 4D Box Inputs auto-focus & slot selection
        [0, 1, 2, 3].forEach(idx => {
            const el = document.getElementById(`digit-in-${idx}`);
            const wrap = document.getElementById(`slot-wrap-${idx}`);

            if (wrap) {
                wrap.addEventListener('click', () => setActiveSlot(idx));
            }

            if (el) {
                el.addEventListener('focus', () => setActiveSlot(idx));

                el.addEventListener('input', (e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    const val = raw ? raw[raw.length - 1] : '';
                    e.target.value = val;
                    this.digits[idx] = val;
                    this.updateGuessPreview();

                    if (val && idx < 3) {
                        setActiveSlot(idx + 1);
                    }
                });

                el.addEventListener('keydown', (e) => {
                    if (e.key === 'Backspace' && !el.value && idx > 0) {
                        setActiveSlot(idx - 1);
                    } else if (e.key === 'ArrowRight' && idx < 3) {
                        setActiveSlot(idx + 1);
                    } else if (e.key === 'ArrowLeft' && idx > 0) {
                        setActiveSlot(idx - 1);
                    }
                });

                el.addEventListener('paste', (e) => {
                    e.preventDefault();
                    const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
                    if (pasted) {
                        for (let i = 0; i < Math.min(4, pasted.length); i++) {
                            this.digits[i] = pasted[i];
                            const inputEl = document.getElementById(`digit-in-${i}`);
                            if (inputEl) inputEl.value = pasted[i];
                        }
                        this.updateGuessPreview();
                        setActiveSlot(Math.min(3, pasted.length));
                    }
                });
            }
        });

        // Quick Touch Keypad for mobile & desktop
        container.querySelectorAll('.numpad-key-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.isDrawing) return;
                import('../ui/AuraSound.js').then(m => m.default.playTap());
                const key = btn.dataset.key;

                if (key === 'backspace') {
                    const curVal = this.digits[this.activeDigitSlot];
                    if (curVal) {
                        this.digits[this.activeDigitSlot] = '';
                        const curIn = document.getElementById(`digit-in-${this.activeDigitSlot}`);
                        if (curIn) curIn.value = '';
                    } else if (this.activeDigitSlot > 0) {
                        setActiveSlot(this.activeDigitSlot - 1);
                        this.digits[this.activeDigitSlot] = '';
                        const prevIn = document.getElementById(`digit-in-${this.activeDigitSlot}`);
                        if (prevIn) prevIn.value = '';
                    }
                } else if (/^[0-9]$/.test(key)) {
                    this.digits[this.activeDigitSlot] = key;
                    const curIn = document.getElementById(`digit-in-${this.activeDigitSlot}`);
                    if (curIn) curIn.value = key;

                    if (this.activeDigitSlot < 3) {
                        setActiveSlot(this.activeDigitSlot + 1);
                    }
                }
                this.updateGuessPreview();
            });
        });

        // Quickpick 4D
        document.getElementById('btn-quickpick-4d')?.addEventListener('click', () => {
            if (this.isDrawing) return;
            import('../ui/AuraSound.js').then(m => m.default.playTap());
            for (let i = 0; i < 4; i++) {
                this.digits[i] = Math.floor(Math.random() * 10).toString();
                const el = document.getElementById(`digit-in-${i}`);
                if (el) el.value = this.digits[i];
            }
            this.updateGuessPreview();
            setActiveSlot(3);
        });

        // Clear 4D
        document.getElementById('btn-clear-4d')?.addEventListener('click', () => {
            if (this.isDrawing) return;
            import('../ui/AuraSound.js').then(m => m.default.playTap());
            for (let i = 0; i < 4; i++) {
                this.digits[i] = '';
                const el = document.getElementById(`digit-in-${i}`);
                if (el) el.value = '';
            }
            this.updateGuessPreview();
            setActiveSlot(0);
        });

        // Package Checkboxes
        ['chk-bet-4d', 'chk-bet-3d', 'chk-bet-2d'].forEach(id => {
            const chk = document.getElementById(id);
            if (chk) {
                chk.addEventListener('change', () => {
                    if (id === 'chk-bet-4d') this.bet4D = chk.checked;
                    if (id === 'chk-bet-3d') this.bet3D = chk.checked;
                    if (id === 'chk-bet-2d') this.bet2D = chk.checked;
                    chk.closest('.pkg-chip')?.classList.toggle('checked', chk.checked);
                    this.updateCostBreakdown();
                });
            }
        });

        // Colok Digit buttons
        container.querySelectorAll('.colok-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isDrawing) return;
                import('../ui/AuraSound.js').then(m => m.default.playClick());
                this.selectedColokDigit = parseInt(btn.dataset.digit, 10);
                container.querySelectorAll('.colok-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // 50:50 Choice buttons
        container.querySelectorAll('.fifty-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isDrawing) return;
                import('../ui/AuraSound.js').then(m => m.default.playClick());
                this.selectedFiftyChoice = btn.dataset.choice;
                container.querySelectorAll('.fifty-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Draw Actions
        document.getElementById('btn-togel-draw')?.addEventListener('click', () => this.startDraw(false));
        document.getElementById('btn-togel-token')?.addEventListener('click', () => this.startDraw(true));

        this.updateCostBreakdown();
    }

    calculatePackagesCount() {
        if (this.activeMarketTab === '4d') {
            let count = 0;
            if (this.bet4D) count++;
            if (this.bet3D) count++;
            if (this.bet2D) count++;
            return Math.max(1, count);
        }
        return 1;
    }

    updateCostBreakdown() {
        const betInput = document.getElementById('togel-bet-input');
        const unitBet = betInput?.getNumericValue ? betInput.getNumericValue() : (parseInt(betInput?.value.replace(/,/g, '') || '10000', 10));
        const packages = this.calculatePackagesCount();
        const total = unitBet * packages;

        const breakdownEl = document.getElementById('togel-cost-breakdown');
        if (breakdownEl) {
            breakdownEl.textContent = `Total: $ ${total.toLocaleString()} (${packages} Paket)`;
        }
    }

    async startDraw(useToken = false) {
        if (this.isDrawing) return;

        // Validation for 4D tab: must have all 4 digits
        if (this.activeMarketTab === '4d') {
            for (let i = 0; i < 4; i++) {
                if (this.digits[i] === '' || isNaN(this.digits[i])) {
                    ui.error('Harap isi lengkap 4 digit angka tebakan Anda (0000 - 9999)!');
                    return;
                }
            }
            if (!this.bet4D && !this.bet3D && !this.bet2D) {
                ui.error('Pilih minimal salah satu paket taruhan (4D, 3D, atau 2D)!');
                return;
            }
        }

        const betInput = document.getElementById('togel-bet-input');
        const unitBet = betInput?.getNumericValue ? betInput.getNumericValue() : (parseInt(betInput?.value.replace(/,/g, '') || '0', 10));

        if (unitBet <= 0) { ui.error('Masukkan jumlah taruhan yang valid!'); return; }

        const packages = this.calculatePackagesCount();
        const totalCost = unitBet * packages;

        if (useToken) {
            if (this.lotteryTokens <= 0) {
                ui.error('Token tidak mencukupi!');
                return;
            }
            this.lotteryTokens--;
            const tokenEl = document.getElementById('togel-token-display');
            if (tokenEl) tokenEl.textContent = `🎟️ ${this.lotteryTokens} TIKET GRATIS`;
        } else {
            const balance = gameState.getBalance();
            if (totalCost > balance) {
                ui.error('Saldo kas Anda tidak mencukupi!');
                return;
            }

            // Deduct cost
            financeManager.addExpense(totalCost, 'Lainnya', `Taruhan Togel VIP (${this.activeMarketTab.toUpperCase()})`);
            
            // Add 10% to 4D progressive jackpot
            const addedJp = Math.round(totalCost * 0.10);
            this.setJackpot(this.getJackpot() + addedJp);
            const jpDisplay = document.getElementById('togel-jackpot-pool-val');
            if (jpDisplay) jpDisplay.textContent = this.getJackpot().toLocaleString('en-US');
        }

        this.onBalanceRefresh?.();

        // Increment rate plays
        let plays = gameState.get('casino.ratePlays') || 0;
        plays++;
        gameState.set('casino.ratePlays', plays);
        const rateOn = plays >= 250;

        this.isDrawing = true;
        import('../ui/AuraSound.js').then(m => m.default.playCasinoSpin());

        const drawBtn = document.getElementById('btn-togel-draw');
        const tokenBtn = document.getElementById('btn-togel-token');
        if (drawBtn) { drawBtn.disabled = true; drawBtn.innerHTML = '🔮 MENGUNDI DRUM...'; }
        if (tokenBtn) { tokenBtn.disabled = true; }

        const statusTicker = document.getElementById('togel-drum-status');
        if (statusTicker) statusTicker.textContent = 'Drum silinder mekanis sedang berputar kencang...';

        // Prepare outcome (4 digits: As, Kop, Kepala, Ekor)
        let resultDigits = [
            Math.floor(Math.random() * 10),
            Math.floor(Math.random() * 10),
            Math.floor(Math.random() * 10),
            Math.floor(Math.random() * 10)
        ];

        // Rate On assistance
        if (rateOn) {
            if (this.activeMarketTab === '4d') {
                if (Math.random() < 0.35) {
                    resultDigits[2] = parseInt(this.digits[2], 10);
                    resultDigits[3] = parseInt(this.digits[3], 10);
                } else if (Math.random() < 0.15) {
                    resultDigits[1] = parseInt(this.digits[1], 10);
                    resultDigits[2] = parseInt(this.digits[2], 10);
                    resultDigits[3] = parseInt(this.digits[3], 10);
                }
            } else if (this.activeMarketTab === 'quick') {
                if (Math.random() < 0.70) {
                    const pos = Math.floor(Math.random() * 4);
                    resultDigits[pos] = this.selectedColokDigit;
                }
            }
        }

        // Animate 4 drums spinning
        const drumDiscs = [
            document.querySelector('#drum-0 .tumbler-disc'),
            document.querySelector('#drum-1 .tumbler-disc'),
            document.querySelector('#drum-2 .tumbler-disc'),
            document.querySelector('#drum-3 .tumbler-disc')
        ];

        drumDiscs.forEach(disc => {
            if (disc) {
                disc.className = 'tumbler-disc spinning';
                disc.querySelector('.digit-text').textContent = Math.floor(Math.random() * 10);
            }
        });

        // Stop drums one by one (As -> Kop -> Kepala -> Ekor)
        for (let i = 0; i < 4; i++) {
            await new Promise(r => setTimeout(r, 600));
            import('../ui/AuraSound.js').then(m => m.default.playTap());
            const disc = drumDiscs[i];
            if (disc) {
                disc.className = 'tumbler-disc revealed';
                disc.querySelector('.digit-text').textContent = resultDigits[i];
            }
        }

        const resultStr = resultDigits.join('');
        const user2D = parseInt(resultStr.slice(2), 10);
        const ekorDigit = resultDigits[3];

        let totalWin = 0;
        let winDetails = [];

        // Payout Calculations
        if (this.activeMarketTab === '4d') {
            const user4DStr = this.digits.join('');
            
            // Check 4D
            if (this.bet4D && user4DStr === resultStr) {
                const payout4D = unitBet * 3000 + this.getJackpot();
                totalWin += payout4D;
                winDetails.push(`TEMBUS 4D (+${financeManager.formatCurrency(payout4D)} TC)`);
                this.setJackpot(25000000); // reset pool
                gameState.set('casino.ratePlays', 0);
            }
            // Check 3D
            if (this.bet3D && user4DStr.slice(1) === resultStr.slice(1)) {
                const payout3D = unitBet * 400;
                totalWin += payout3D;
                winDetails.push(`TEMBUS 3D (+${financeManager.formatCurrency(payout3D)} TC)`);
                gameState.set('casino.ratePlays', 0);
            }
            // Check 2D
            if (this.bet2D && user4DStr.slice(2) === resultStr.slice(2)) {
                const payout2D = unitBet * 70;
                totalWin += payout2D;
                winDetails.push(`TEMBUS 2D (+${financeManager.formatCurrency(payout2D)} TC)`);
            }
        } else if (this.activeMarketTab === 'quick') {
            // Colok Bebas Check
            const occurrences = resultDigits.filter(d => d === this.selectedColokDigit).length;
            if (occurrences > 0) {
                const multiplier = 1.55 * occurrences;
                const payoutColok = Math.round(unitBet * multiplier);
                totalWin += payoutColok;
                winDetails.push(`COLOK ${this.selectedColokDigit} (+${financeManager.formatCurrency(payoutColok)} TC)`);
            }

            // 50:50 Check
            let wonFifty = false;
            if (this.selectedFiftyChoice === 'besar' && user2D >= 50) wonFifty = true;
            if (this.selectedFiftyChoice === 'kecil' && user2D < 50) wonFifty = true;
            if (this.selectedFiftyChoice === 'genap' && ekorDigit % 2 === 0) wonFifty = true;
            if (this.selectedFiftyChoice === 'ganjil' && ekorDigit % 2 !== 0) wonFifty = true;

            if (wonFifty) {
                const payoutFifty = Math.round(unitBet * 1.95);
                totalWin += payoutFifty;
                winDetails.push(`50:50 ${this.selectedFiftyChoice.toUpperCase()} (+${financeManager.formatCurrency(payoutFifty)} TC)`);
            }
        }

        // Process outcomes
        const isWin = totalWin > 0;
        if (isWin) {
            financeManager.addIncome(totalWin, 'Investasi', `Hasil Togel VIP: ${resultStr}`);
            this.onBalanceRefresh?.();

            if (winDetails.some(d => d.includes('4D'))) {
                pixiEffects.celebrateWin({
                    amount: totalWin,
                    type: 'jackpot',
                    onComplete: () => this.onBalanceRefresh?.()
                });
                import('../ui/AuraSound.js').then(m => m.default.playCasinoWin());
                ui.success(`🏆 TEMBUS 4D SEJATI! Hasil: ${resultStr}! Total Hadiah: ${financeManager.formatCurrency(totalWin)} TC!`, 'JACKPOT 4D');
            } else {
                pixiEffects.celebrateWin({
                    amount: totalWin,
                    type: totalWin >= unitBet * 70 ? 'big' : 'win',
                    onComplete: () => this.onBalanceRefresh?.()
                });
                import('../ui/AuraSound.js').then(m => m.default.playClaimMoney());
                ui.success(`MENANG TOGEL! ${winDetails.join(', ')}`, '🎯 Tembus Angka');
            }

            if (statusTicker) statusTicker.textContent = `🎉 SELAMAT! Result [ ${resultStr} ] - ${winDetails.join(' | ')}`;
        } else {
            import('../ui/AuraSound.js').then(m => m.default.playCasinoLose());
            ui.toast({ type: 'warning', title: 'Togel Belum Tembus', message: `Hasil Result: [ ${resultStr} ]. Coba racik angka hoki lagi!` });
            if (statusTicker) statusTicker.textContent = `💥 ZONK! Hasil pengundian: [ ${resultStr} ]. Tebakan Anda belum cocok.`;
        }

        // Save history
        const history = this.getHistory();
        history.unshift({
            id: Date.now(),
            numbers: resultStr,
            market: this.activeMarketTab === '4d' ? '4D/3D/2D' : 'Colok & 50:50',
            payout: totalWin,
            isWin
        });
        this.saveHistory(history);

        // Update history view in-place
        const historyList = document.getElementById('togel-history-list');
        if (historyList) {
            historyList.innerHTML = history.slice(0, 3).map(h => `
                <div class="hist-chip ${h.isWin ? 'won' : ''}">
                    <span class="hist-num">${h.numbers}</span>
                    <span class="hist-tag">${h.market}</span>
                    <span class="hist-win ${h.isWin ? 'win' : ''}">${h.isWin ? '+' + financeManager.formatCurrency(h.payout) : 'ZONK'}</span>
                </div>
            `).join('');
        }

        this.isDrawing = false;

        if (drawBtn) { drawBtn.disabled = false; drawBtn.innerHTML = '🎲 PASANG &amp; PUTAR DRUM'; }
        if (tokenBtn) { tokenBtn.disabled = this.lotteryTokens <= 0; }
    }
}
