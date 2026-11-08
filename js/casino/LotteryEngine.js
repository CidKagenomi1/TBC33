/**
 * LotteryEngine.js - VIP 4D/3D/2D Togel Digital Terminal
 * Mengadopsi mekanisme lotre/togel asli dunia nyata dengan mata uang virtual (TC):
 * - Pasar 4D (Odds 3000x), 3D (Odds 400x), 2D (Odds 70x)
 * - Pasar Colok Bebas (Tebak 1 angka di mana saja, odds 1.55x)
 * - Pasar 50:50 (Besar/Kecil & Genap/Ganjil di 2D belakang, odds 1.95x)
 * - Animasi 4 Drum Reel Silinder (As, Kop, Kepala, Ekor)
 * - Quick Pick / Angka Hoki Acak & Papan Result Macau/Singapore Pools
 */

import financeManager from '../finance/FinanceManager.js';
import gameState from '../core/GameState.js';
import ui from '../ui/UIManager.js';
import pixiEffects from '../graphics/PixiEffects.js';

export class LotteryEngine {
    constructor(onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;
        this.activeMarketTab = '4d'; // '4d' | 'colok' | 'fifty'
        this.isDrawing = false;
        
        // Form states
        this.digits = ['', '', '', '']; // [As, Kop, Kepala, Ekor]
        this.selectedColokDigit = 7;
        this.selectedFiftyChoice = 'besar'; // 'besar' | 'kecil' | 'genap' | 'ganjil'

        // Bet distribution for 4D/3D/2D
        this.bet4D = true;
        this.bet3D = true;
        this.bet2D = true;

        this.ticketUnitCost = 10000; // $10,000 per unit
    }

    getRateStatusHTML() {
        const plays = gameState.get('casino.ratePlays') || 0;
        const rateOn = plays >= 250;
        return rateOn 
            ? `<div class="rate-badge rate-on-badge" style="display:inline-flex; align-items:center; gap:0.35rem; background:linear-gradient(135deg,#ef4444,#fbbf24); color:#fff; font-weight:900; font-size:0.75rem; padding:0.3rem 0.75rem; border-radius:999px; box-shadow:0 0 14px rgba(239,68,68,0.6); animation: rateGlow 1s ease-in-out infinite alternate; text-transform:uppercase; letter-spacing:0.06em; border: 1.5px solid #fff;">⚡ RATE ON (ANGKA HOKI KELUAR!)</div>`
            : `<div class="rate-badge rate-off-badge" style="display:inline-flex; align-items:center; gap:0.35rem; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); color:rgba(255,255,255,0.65); font-weight:800; font-size:0.72rem; padding:0.25rem 0.6rem; border-radius:999px; text-transform:uppercase; letter-spacing:0.06em;">⚡ RATE: OFF (${plays}/250 SPINS)</div>`;
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
            jp = 25000000; // start at $25,000,000
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

        // Render recent result ticker
        const historyHTML = history.map(h => `
            <div class="result-row ${h.isWin ? 'won' : ''}">
                <div class="result-left">
                    <span class="result-badge">${h.numbers}</span>
                    <span class="result-market">${h.market}</span>
                </div>
                <div class="result-right">
                    <span class="result-payout ${h.isWin ? 'win-text' : 'lose-text'}">
                        ${h.isWin ? '+' + financeManager.formatCurrency(h.payout) + ' TC' : 'ZONK'}
                    </span>
                </div>
            </div>
        `).slice(0, 4).join('');

        return `
        <div class="togel-suite-container">
            <!-- Header Bar -->
            <div class="togel-header">
                <button type="button" class="btn-lobby-pill" title="Buka Menu Game (L)"><span>☰</span> LOBBY / GANTI GAME</button>
                <h3 class="togel-title">
                    🎫 <span class="title-grad">VIP 4D TOGEL TERMINAL</span>
                </h3>
                <p class="togel-sub">PASARAN RESMI 4D • 3D • 2D • COLOK BEBAS • BESAR/KECIL</p>
                <div class="rate-badge-wrap">
                    ${this.getRateStatusHTML()}
                </div>
            </div>

            <!-- Grand Progressive 4D Jackpot Pool -->
            <div class="jackpot-pool-vault">
                <div class="vault-label">🏆 POOL GRAND JACKPOT 4D (STRAIGHT 3000x)</div>
                <div class="vault-value">
                    <span class="vault-curr">$</span>
                    <span id="togel-jackpot-pool-val">${jackpot.toLocaleString('en-US')}</span>
                </div>
                <div class="vault-subtext">Setiap taruhan tiket menyumbang 10% ke dalam akumulasi jackpot pool</div>
            </div>

            <!-- Token Counter Bar -->
            <div class="togel-token-strip">
                <div class="token-left">
                    <span class="token-icon">🎟️</span>
                    <span class="token-label">TIKET TOKEN TOGEL:</span>
                </div>
                <div class="token-count" id="togel-token-display">
                    ${this.lotteryTokens} TIKET GRATIS
                </div>
            </div>

            <!-- Interactive Live 4-Drum Cylinder Result Stage -->
            <div class="cylinder-stage-box">
                <div class="stage-label-top">
                    <span>🔴 HASIL PENGUNDIAN RESMI (AS • KOP • KEPALA • EKOR)</span>
                </div>
                <div class="drums-display-row" id="togel-drums-container">
                    <div class="drum-cylinder" id="drum-0">
                        <span class="drum-pos-label">AS</span>
                        <div class="drum-digit-box">?</div>
                    </div>
                    <div class="drum-cylinder" id="drum-1">
                        <span class="drum-pos-label">KOP</span>
                        <div class="drum-digit-box">?</div>
                    </div>
                    <div class="drum-cylinder" id="drum-2">
                        <span class="drum-pos-label">KEPALA</span>
                        <div class="drum-digit-box">?</div>
                    </div>
                    <div class="drum-cylinder" id="drum-3">
                        <span class="drum-pos-label">EKOR</span>
                        <div class="drum-digit-box">?</div>
                    </div>
                </div>
                <div class="drum-status-ticker" id="togel-drum-status">
                    Silakan pasang tebakan angka Anda di bawah...
                </div>
            </div>

            <!-- Market Selector Tabs -->
            <div class="market-nav-tabs">
                <button class="market-tab-btn ${this.activeMarketTab === '4d' ? 'active' : ''}" data-tab="4d">
                    🎯 4D / 3D / 2D
                </button>
                <button class="market-tab-btn ${this.activeMarketTab === 'colok' ? 'active' : ''}" data-tab="colok">
                    🎲 Colok Bebas (1 Angka)
                </button>
                <button class="market-tab-btn ${this.activeMarketTab === 'fifty' ? 'active' : ''}" data-tab="fifty">
                    ⚖️ 50:50 (Besar/Kecil/Genap/Ganjil)
                </button>
            </div>

            <!-- Betting Controls Workspace -->
            <div class="market-workspace-panel">
                
                <!-- TAB 1: 4D / 3D / 2D -->
                <div class="market-subview ${this.activeMarketTab === '4d' ? 'active' : ''}" id="view-tab-4d">
                    <div class="input-4d-header">
                        <span class="section-title">Masukkan 4 Digit Angka Tebakan:</span>
                        <button id="btn-quickpick-4d" class="btn-action-pill">⚡ Acak Angka Hoki</button>
                    </div>

                    <div class="digit-inputs-row">
                        <input type="text" maxlength="1" class="box-digit-input" id="digit-in-0" value="${this.digits[0]}" placeholder="0">
                        <input type="text" maxlength="1" class="box-digit-input" id="digit-in-1" value="${this.digits[1]}" placeholder="0">
                        <input type="text" maxlength="1" class="box-digit-input" id="digit-in-2" value="${this.digits[2]}" placeholder="0">
                        <input type="text" maxlength="1" class="box-digit-input" id="digit-in-3" value="${this.digits[3]}" placeholder="0">
                    </div>

                    <!-- Package Toggles -->
                    <div class="package-options-grid">
                        <label class="package-checkbox-item ${this.bet4D ? 'checked' : ''}">
                            <input type="checkbox" id="chk-bet-4d" ${this.bet4D ? 'checked' : ''}>
                            <div class="package-info">
                                <span class="pkg-title">Pasang 4D (4 Digit)</span>
                                <span class="pkg-odds">Hadiah 3.000x + Jackpot</span>
                            </div>
                        </label>
                        <label class="package-checkbox-item ${this.bet3D ? 'checked' : ''}">
                            <input type="checkbox" id="chk-bet-3d" ${this.bet3D ? 'checked' : ''}>
                            <div class="package-info">
                                <span class="pkg-title">Pasang 3D (3 Digit Belakang)</span>
                                <span class="pkg-odds">Hadiah 400x Taruhan</span>
                            </div>
                        </label>
                        <label class="package-checkbox-item ${this.bet2D ? 'checked' : ''}">
                            <input type="checkbox" id="chk-bet-2d" ${this.bet2D ? 'checked' : ''}>
                            <div class="package-info">
                                <span class="pkg-title">Pasang 2D (2 Digit Belakang)</span>
                                <span class="pkg-odds">Hadiah 70x Taruhan</span>
                            </div>
                        </label>
                    </div>
                </div>

                <!-- TAB 2: Colok Bebas -->
                <div class="market-subview ${this.activeMarketTab === 'colok' ? 'active' : ''}" id="view-tab-colok">
                    <div class="input-4d-header">
                        <span class="section-title">Pilih 1 Angka Bebas (0 - 9):</span>
                        <span class="odds-highlight">Odds: 1.55x (x2 jika keluar ganda)</span>
                    </div>
                    <div class="colok-balls-grid">
                        ${[0,1,2,3,4,5,6,7,8,9].map(n => `
                            <button class="colok-digit-btn ${this.selectedColokDigit === n ? 'selected' : ''}" data-digit="${n}">
                                ${n}
                            </button>
                        `).join('')}
                    </div>
                    <p class="market-hint">Tebakan benar jika angka yang Anda pilih keluar di salah satu dari posisi As, Kop, Kepala, atau Ekor.</p>
                </div>

                <!-- TAB 3: 50:50 (Besar/Kecil/Genap/Ganjil) -->
                <div class="market-subview ${this.activeMarketTab === 'fifty' ? 'active' : ''}" id="view-tab-fifty">
                    <div class="input-4d-header">
                        <span class="section-title">Pilih Pasar 50:50 (Diambil dari 2D Ekor):</span>
                        <span class="odds-highlight">Odds: 1.95x</span>
                    </div>
                    <div class="fifty-options-grid">
                        <button class="fifty-btn ${this.selectedFiftyChoice === 'besar' ? 'selected' : ''}" data-choice="besar">
                            <span class="btn-main">BESAR</span>
                            <span class="btn-sub">Angka 2D: 50 - 99</span>
                        </button>
                        <button class="fifty-btn ${this.selectedFiftyChoice === 'kecil' ? 'selected' : ''}" data-choice="kecil">
                            <span class="btn-main">KECIL</span>
                            <span class="btn-sub">Angka 2D: 00 - 49</span>
                        </button>
                        <button class="fifty-btn ${this.selectedFiftyChoice === 'genap' ? 'selected' : ''}" data-choice="genap">
                            <span class="btn-main">GENAP</span>
                            <span class="btn-sub">Ekor: 0, 2, 4, 6, 8</span>
                        </button>
                        <button class="fifty-btn ${this.selectedFiftyChoice === 'ganjil' ? 'selected' : ''}" data-choice="ganjil">
                            <span class="btn-main">GANJIL</span>
                            <span class="btn-sub">Ekor: 1, 3, 5, 7, 9</span>
                        </button>
                    </div>
                </div>

                <!-- Universal Stake / Bet Controller -->
                <div class="togel-bet-cockpit">
                    <div class="bet-input-row">
                        <div class="bet-label-group">
                            <span class="lbl-taruhan">TARUHAN PER PAKET</span>
                            <span class="lbl-sub" id="togel-cost-breakdown">Total Biaya: $ 30,000</span>
                        </div>
                        <div class="bet-number-wrap">
                            <span class="currency-prefix">$</span>
                            <input type="text" id="togel-bet-input" value="10,000" ${this.isDrawing ? 'disabled' : ''}>
                        </div>
                    </div>
                    <div class="bet-preset-chips">
                        <button class="bet-chip togel-preset" data-val="10000" ${this.isDrawing ? 'disabled' : ''}>$10K</button>
                        <button class="bet-chip togel-preset" data-val="50000" ${this.isDrawing ? 'disabled' : ''}>$50K</button>
                        <button class="bet-chip togel-preset" data-val="250000" ${this.isDrawing ? 'disabled' : ''}>$250K</button>
                        <button class="bet-chip togel-preset" data-val="1000000" ${this.isDrawing ? 'disabled' : ''}>$1M</button>
                        <button class="bet-chip bet-chip-max togel-preset" id="btn-togel-max" ${this.isDrawing ? 'disabled' : ''}>MAX</button>
                    </div>
                </div>

                <!-- Action Draw Buttons -->
                <div class="togel-action-buttons">
                    <button id="btn-togel-draw" class="main-togel-btn buy">
                        🎲 PASANG TARUHAN &amp; PUTAR UNDIAN
                    </button>
                    <button id="btn-togel-token" class="main-togel-btn token" ${this.lotteryTokens <= 0 ? 'disabled' : ''}>
                        🎟️ PUTAR DENGAN TOKEN (${this.lotteryTokens})
                    </button>
                </div>

            </div>

            <!-- Footer: Live Results History & Payout Reference -->
            <div class="togel-footer-grid">
                <div class="footer-card">
                    <div class="card-title">📜 HASIL KELUARAN SEBELUMNYA</div>
                    <div class="history-rows-box" id="togel-history-list">
                        ${historyHTML}
                    </div>
                </div>
                <div class="footer-card">
                    <div class="card-title">📊 TABEL PEMBAYARAN TOGEL</div>
                    <div class="payout-table-list">
                        <div class="payout-row grand">
                            <span>4D (Straight Tepat)</span>
                            <span class="mult">3.000× Taruhan</span>
                        </div>
                        <div class="payout-row">
                            <span>3D (Tiga Angka Belakang)</span>
                            <span class="mult">400× Taruhan</span>
                        </div>
                        <div class="payout-row">
                            <span>2D (Dua Angka Belakang)</span>
                            <span class="mult">70× Taruhan</span>
                        </div>
                        <div class="payout-row">
                            <span>Colok Bebas (1 Digit)</span>
                            <span class="mult">1.55× Taruhan</span>
                        </div>
                        <div class="payout-row">
                            <span>50:50 (Besar/Kecil/Genap/Ganjil)</span>
                            <span class="mult">1.95× Taruhan</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <style>
            .togel-suite-container {
                max-width: 680px;
                margin: 0 auto;
                text-align: center;
                animation: fade-up 0.3s ease;
                box-sizing: border-box;
                padding-bottom: 2rem;
            }
            .togel-header { margin-bottom: 0.75rem; }
            .togel-title {
                font-family: var(--font-display, 'Russo One', sans-serif);
                font-size: 1.55rem;
                font-weight: 900;
                margin: 0.35rem 0 0.15rem 0;
            }
            .title-grad {
                background: linear-gradient(90deg, #f59e0b, #fbbf24, #ef4444);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .togel-sub {
                color: rgba(255,255,255,0.45);
                font-size: 0.7rem;
                font-weight: 700;
                letter-spacing: 0.08em;
                margin-bottom: 0.5rem;
            }
            .rate-badge-wrap { display: flex; justify-content: center; }

            /* Progressive Vault */
            .jackpot-pool-vault {
                background: radial-gradient(circle at 50% 0%, rgba(245,158,11,0.2) 0%, rgba(18,14,10,0.95) 100%);
                border: 2px solid #fbbf24;
                border-radius: 14px;
                padding: 1rem;
                margin-bottom: 0.75rem;
                box-shadow: 0 0 25px rgba(251,191,36,0.25), inset 0 0 20px rgba(0,0,0,0.8);
            }
            .vault-label {
                font-size: 0.72rem;
                font-weight: 900;
                color: #fbbf24;
                letter-spacing: 0.1em;
            }
            .vault-value {
                font-family: var(--font-num, monospace);
                font-size: 2.3rem;
                font-weight: 900;
                color: #fff;
                text-shadow: 0 0 20px rgba(251,191,36,0.8);
                display: flex;
                align-items: baseline;
                justify-content: center;
                gap: 0.25rem;
                margin: 0.2rem 0;
            }
            .vault-curr { color: #fbbf24; font-size: 1.4rem; }
            .vault-subtext { font-size: 0.65rem; color: rgba(255,255,255,0.45); }

            /* Token Strip */
            .togel-token-strip {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(124,58,237,0.08) 100%);
                border: 1px solid rgba(168,85,247,0.3);
                border-radius: 10px;
                padding: 0.45rem 1rem;
                margin-bottom: 0.75rem;
            }
            .token-left { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; font-weight: 800; color: #c084fc; }
            .token-count { font-size: 0.92rem; font-weight: 900; color: #fff; }

            /* 4-Drum Cylinder Stage */
            .cylinder-stage-box {
                background: #090c10;
                border: 2px solid #1e293b;
                border-radius: 16px;
                padding: 1rem;
                margin-bottom: 0.85rem;
                box-shadow: inset 0 0 25px rgba(0,0,0,0.9);
            }
            .stage-label-top {
                font-size: 0.68rem;
                font-weight: 900;
                color: #ef4444;
                letter-spacing: 0.08em;
                margin-bottom: 0.75rem;
            }
            .drums-display-row {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 0.65rem;
                max-width: 440px;
                margin: 0 auto 0.65rem auto;
            }
            .drum-cylinder {
                background: rgba(255,255,255,0.02);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 10px;
                padding: 0.5rem 0.25rem;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            .drum-pos-label {
                font-size: 0.62rem;
                font-weight: 800;
                color: rgba(255,255,255,0.5);
                display: block;
                margin-bottom: 0.25rem;
            }
            .drum-digit-box {
                height: 52px;
                background: radial-gradient(circle at 35% 35%, #2a221b 0%, #100d0a 100%);
                border: 2px solid #fbbf24;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: var(--font-num, monospace);
                font-size: 2rem;
                font-weight: 900;
                color: #fbbf24;
                box-shadow: inset 0 0 10px rgba(0,0,0,0.9), 0 0 12px rgba(251,191,36,0.3);
                transition: transform 0.2s;
            }
            .drum-digit-box.spinning {
                animation: drumSpin 0.1s linear infinite;
                color: #ef4444;
                border-color: #ef4444;
            }
            .drum-digit-box.revealed {
                animation: popIn 0.3s ease-out;
                background: radial-gradient(circle at 35% 35%, #fde047 0%, #d97706 70%, #78350f 100%);
                color: #000;
                border-color: #fff;
                box-shadow: 0 0 20px rgba(251,191,36,0.8);
            }
            @keyframes drumSpin {
                0% { transform: translateY(-4px); }
                50% { transform: translateY(4px); }
                100% { transform: translateY(-4px); }
            }
            .drum-status-ticker {
                font-size: 0.72rem;
                color: rgba(255,255,255,0.7);
                font-style: italic;
                min-height: 20px;
            }

            /* Market Navigation Tabs */
            .market-nav-tabs {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 0.4rem;
                margin-bottom: 0.85rem;
            }
            .market-tab-btn {
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 10px;
                color: rgba(255,255,255,0.7);
                padding: 0.6rem 0.4rem;
                font-size: 0.75rem;
                font-weight: 800;
                cursor: pointer;
                transition: all 0.2s;
            }
            .market-tab-btn:hover {
                background: rgba(251,191,36,0.1);
                color: #fff;
            }
            .market-tab-btn.active {
                background: linear-gradient(135deg, rgba(251,191,36,0.2) 0%, rgba(217,119,6,0.3) 100%);
                border-color: #fbbf24;
                color: #fbbf24;
                box-shadow: 0 0 12px rgba(251,191,36,0.3);
            }

            /* Workspace */
            .market-workspace-panel {
                background: rgba(21, 17, 13, 0.75);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 16px;
                padding: 1rem;
                backdrop-filter: blur(12px);
                margin-bottom: 0.85rem;
                text-align: left;
            }
            .market-subview { display: none; }
            .market-subview.active { display: block; animation: fade-up 0.25s ease; }

            .input-4d-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.75rem;
                flex-wrap: wrap;
                gap: 0.35rem;
            }
            .section-title { font-size: 0.8rem; font-weight: 800; color: #fff; }
            .odds-highlight { font-size: 0.72rem; font-weight: 800; color: #fbbf24; }
            .btn-action-pill {
                background: rgba(251,191,36,0.12);
                border: 1px solid rgba(251,191,36,0.35);
                color: #fbbf24;
                border-radius: 6px;
                padding: 0.25rem 0.65rem;
                font-size: 0.72rem;
                font-weight: 800;
                cursor: pointer;
            }
            .btn-action-pill:hover { background: rgba(251,191,36,0.25); }

            /* 4D Digits Row */
            .digit-inputs-row {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 0.65rem;
                max-width: 360px;
                margin: 0 auto 1rem auto;
            }
            .box-digit-input {
                height: 58px;
                background: rgba(0,0,0,0.5);
                border: 2px solid rgba(255,255,255,0.2);
                border-radius: 10px;
                color: #fff;
                font-family: var(--font-num, monospace);
                font-size: 2.2rem;
                font-weight: 900;
                text-align: center;
                outline: none;
                transition: border-color 0.2s;
            }
            .box-digit-input:focus {
                border-color: #fbbf24;
                box-shadow: 0 0 12px rgba(251,191,36,0.4);
            }

            /* Package Checkboxes */
            .package-options-grid {
                display: flex;
                flex-direction: column;
                gap: 0.45rem;
                margin-bottom: 1rem;
            }
            .package-checkbox-item {
                display: flex;
                align-items: center;
                gap: 0.65rem;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 8px;
                padding: 0.5rem 0.75rem;
                cursor: pointer;
                transition: all 0.2s;
            }
            .package-checkbox-item.checked {
                background: rgba(251,191,36,0.08);
                border-color: rgba(251,191,36,0.35);
            }
            .package-info { display: flex; justify-content: space-between; width: 100%; align-items: center; }
            .pkg-title { font-size: 0.78rem; font-weight: 800; color: #fff; }
            .pkg-odds { font-size: 0.72rem; font-weight: 800; color: #fbbf24; }

            /* Colok Digit Balls Grid */
            .colok-balls-grid {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 0.5rem;
                justify-items: center;
                margin-bottom: 0.75rem;
            }
            .colok-digit-btn {
                width: 46px;
                height: 46px;
                border-radius: 50%;
                background: radial-gradient(circle at 35% 35%, #2a221b 0%, #15110e 100%);
                border: 1px solid rgba(255,255,255,0.12);
                color: #fff;
                font-family: var(--font-num, monospace);
                font-size: 1.3rem;
                font-weight: 900;
                cursor: pointer;
                transition: all 0.2s;
            }
            .colok-digit-btn:hover { border-color: #fbbf24; transform: scale(1.08); }
            .colok-digit-btn.selected {
                background: radial-gradient(circle at 35% 35%, #fde047 0%, #d97706 70%, #78350f 100%) !important;
                color: #000 !important;
                box-shadow: 0 0 16px rgba(251,191,36,0.7);
                border-color: #fff !important;
                transform: scale(1.1);
            }
            .market-hint { font-size: 0.68rem; color: rgba(255,255,255,0.4); line-height: 1.4; margin-bottom: 0.75rem; }

            /* 50:50 Grid */
            .fifty-options-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 0.6rem;
                margin-bottom: 1rem;
            }
            .fifty-btn {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 10px;
                padding: 0.75rem 0.5rem;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.2rem;
                transition: all 0.2s;
            }
            .fifty-btn:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.25); }
            .fifty-btn.selected {
                background: linear-gradient(135deg, rgba(251,191,36,0.2) 0%, rgba(217,119,6,0.3) 100%);
                border-color: #fbbf24;
                box-shadow: 0 0 12px rgba(251,191,36,0.3);
            }
            .fifty-btn .btn-main { font-family: var(--font-display, sans-serif); font-size: 0.95rem; font-weight: 900; color: #fff; }
            .fifty-btn.selected .btn-main { color: #fbbf24; }
            .fifty-btn .btn-sub { font-size: 0.65rem; color: rgba(255,255,255,0.5); }

            /* Stake Cockpit */
            .togel-bet-cockpit {
                border-top: 1px solid rgba(255,255,255,0.08);
                padding-top: 0.75rem;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                margin-bottom: 0.85rem;
            }
            .bet-input-row { display: flex; justify-content: space-between; align-items: center; }
            .bet-label-group { display: flex; flex-direction: column; gap: 2px; }
            .lbl-taruhan { font-size: 0.68rem; font-weight: 800; color: rgba(255,255,255,0.5); }
            .lbl-sub { font-size: 0.75rem; font-weight: 900; color: #10b981; }
            .bet-number-wrap { display: flex; align-items: center; gap: 0.2rem; border-bottom: 1.5px solid rgba(251,191,36,0.5); }
            .currency-prefix { font-size: 1.1rem; color: #fbbf24; font-weight: 900; }
            #togel-bet-input {
                background: transparent;
                border: none;
                font-family: var(--font-num, monospace);
                font-size: 1.25rem;
                font-weight: 900;
                color: #fff;
                width: 120px;
                text-align: right;
                outline: none;
            }
            .bet-preset-chips {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 0.35rem;
            }

            /* Action Buttons */
            .togel-action-buttons {
                display: flex;
                gap: 0.5rem;
            }
            .main-togel-btn {
                font-family: var(--font-display, 'Russo One', sans-serif);
                border: none;
                border-radius: 12px;
                padding: 0.95rem 1rem;
                font-size: 1.1rem;
                color: #fff;
                cursor: pointer;
                transition: all 0.2s;
                letter-spacing: 0.04em;
                text-shadow: 0 1px 2px rgba(0,0,0,0.6);
            }
            .main-togel-btn.buy {
                flex: 1.6;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                box-shadow: 0 4px 16px rgba(245,158,11,0.35);
            }
            .main-togel-btn.token {
                flex: 1.2;
                background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
                box-shadow: 0 4px 16px rgba(168,85,247,0.35);
            }
            .main-togel-btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); }
            .main-togel-btn:disabled { opacity: 0.45; cursor: not-allowed; }

            /* Footer Panels */
            .togel-footer-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 0.75rem;
                text-align: left;
            }
            .footer-card {
                background: rgba(20, 16, 12, 0.75);
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 12px;
                padding: 0.75rem;
            }
            .card-title {
                font-size: 0.68rem;
                font-weight: 800;
                color: rgba(255,255,255,0.45);
                letter-spacing: 0.08em;
                margin-bottom: 0.5rem;
            }
            .history-rows-box { display: flex; flex-direction: column; gap: 0.35rem; }
            .result-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: rgba(255,255,255,0.02);
                border: 1px solid rgba(255,255,255,0.04);
                padding: 0.35rem 0.55rem;
                border-radius: 6px;
                font-size: 0.72rem;
            }
            .result-row.won { border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.05); }
            .result-badge {
                font-family: var(--font-num, monospace);
                font-size: 0.95rem;
                font-weight: 900;
                color: #fbbf24;
                letter-spacing: 0.1em;
            }
            .result-market { font-size: 0.62rem; color: rgba(255,255,255,0.45); margin-left: 6px; }
            .win-text { color: #10b981; font-weight: 800; }
            .lose-text { color: rgba(255,255,255,0.3); }

            .payout-table-list { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.72rem; }
            .payout-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: rgba(255,255,255,0.02);
                padding: 0.3rem 0.5rem;
                border-radius: 6px;
                color: rgba(255,255,255,0.8);
            }
            .payout-row.grand { background: rgba(251,191,36,0.1); color: #fbbf24; font-weight: 800; }
            .payout-row .mult { font-weight: 900; color: #fbbf24; }

            @media (max-width: 580px) {
                .drums-display-row { gap: 0.35rem; }
                .drum-digit-box { height: 44px; font-size: 1.6rem; }
                .digit-inputs-row { gap: 0.35rem; }
                .box-digit-input { height: 48px; font-size: 1.6rem; }
                .togel-footer-grid { grid-template-columns: 1fr; }
                .main-togel-btn { font-size: 0.95rem; padding: 0.8rem 0.5rem; }
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

        // Market Tab buttons
        container.querySelectorAll('.market-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isDrawing) return;
                import('../ui/AuraSound.js').then(m => m.default.playTap());
                this.activeMarketTab = btn.dataset.tab;
                this.refreshUI(container);
            });
        });

        // 4D Box Digit Inputs auto-focus next
        [0, 1, 2, 3].forEach(idx => {
            const el = document.getElementById(`digit-in-${idx}`);
            if (el) {
                el.addEventListener('input', (e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    e.target.value = val ? val[val.length - 1] : '';
                    this.digits[idx] = e.target.value;
                    if (val && idx < 3) {
                        document.getElementById(`digit-in-${idx + 1}`)?.focus();
                    }
                });
                el.addEventListener('keydown', (e) => {
                    if (e.key === 'Backspace' && !el.value && idx > 0) {
                        document.getElementById(`digit-in-${idx - 1}`)?.focus();
                    }
                });
            }
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
        });

        // Package Checkboxes
        ['chk-bet-4d', 'chk-bet-3d', 'chk-bet-2d'].forEach(id => {
            const chk = document.getElementById(id);
            if (chk) {
                chk.addEventListener('change', () => {
                    if (id === 'chk-bet-4d') this.bet4D = chk.checked;
                    if (id === 'chk-bet-3d') this.bet3D = chk.checked;
                    if (id === 'chk-bet-2d') this.bet2D = chk.checked;
                    chk.closest('.package-checkbox-item')?.classList.toggle('checked', chk.checked);
                    this.updateCostBreakdown();
                });
            }
        });

        // Colok Digit buttons
        container.querySelectorAll('.colok-digit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isDrawing) return;
                import('../ui/AuraSound.js').then(m => m.default.playClick());
                this.selectedColokDigit = parseInt(btn.dataset.digit, 10);
                container.querySelectorAll('.colok-digit-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        // 50:50 Choice buttons
        container.querySelectorAll('.fifty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isDrawing) return;
                import('../ui/AuraSound.js').then(m => m.default.playClick());
                this.selectedFiftyChoice = btn.dataset.choice;
                container.querySelectorAll('.fifty-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
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
            breakdownEl.textContent = `Total Biaya (${packages} Paket): $ ${total.toLocaleString()}`;
        }
    }

    refreshUI(container) {
        const betInputVal = document.getElementById('togel-bet-input')?.value || '10,000';
        container.innerHTML = this.getHTML();
        this.bindEvents(container, this.onBalanceRefresh);
        const newInput = document.getElementById('togel-bet-input');
        if (newInput) newInput.value = betInputVal;
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
            if (tokenEl) tokenEl.textContent = `${this.lotteryTokens} TIKET GRATIS`;
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
                    // Match 2D (Kepala & Ekor)
                    resultDigits[2] = parseInt(this.digits[2], 10);
                    resultDigits[3] = parseInt(this.digits[3], 10);
                } else if (Math.random() < 0.15) {
                    // Match 3D
                    resultDigits[1] = parseInt(this.digits[1], 10);
                    resultDigits[2] = parseInt(this.digits[2], 10);
                    resultDigits[3] = parseInt(this.digits[3], 10);
                }
            } else if (this.activeMarketTab === 'colok') {
                if (Math.random() < 0.80) {
                    const pos = Math.floor(Math.random() * 4);
                    resultDigits[pos] = this.selectedColokDigit;
                }
            } else if (this.activeMarketTab === 'fifty') {
                if (Math.random() < 0.80) {
                    if (this.selectedFiftyChoice === 'besar') {
                        resultDigits[2] = Math.floor(Math.random() * 5) + 5; // 5-9
                    } else if (this.selectedFiftyChoice === 'kecil') {
                        resultDigits[2] = Math.floor(Math.random() * 5); // 0-4
                    } else if (this.selectedFiftyChoice === 'genap') {
                        resultDigits[3] = [0,2,4,6,8][Math.floor(Math.random() * 5)];
                    } else if (this.selectedFiftyChoice === 'ganjil') {
                        resultDigits[3] = [1,3,5,7,9][Math.floor(Math.random() * 5)];
                    }
                }
            }
        }

        // Animate 4 drums spinning
        const drumBoxes = [
            document.querySelector('#drum-0 .drum-digit-box'),
            document.querySelector('#drum-1 .drum-digit-box'),
            document.querySelector('#drum-2 .drum-digit-box'),
            document.querySelector('#drum-3 .drum-digit-box')
        ];

        drumBoxes.forEach(box => {
            if (box) {
                box.className = 'drum-digit-box spinning';
                box.textContent = Math.floor(Math.random() * 10);
            }
        });

        // Stop drums one by one (As -> Kop -> Kepala -> Ekor)
        for (let i = 0; i < 4; i++) {
            await new Promise(r => setTimeout(r, 650));
            import('../ui/AuraSound.js').then(m => m.default.playTap());
            const box = drumBoxes[i];
            if (box) {
                box.className = 'drum-digit-box revealed';
                box.textContent = resultDigits[i];
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
        } else if (this.activeMarketTab === 'colok') {
            const occurrences = resultDigits.filter(d => d === this.selectedColokDigit).length;
            if (occurrences > 0) {
                const multiplier = 1.55 * occurrences;
                const payoutColok = Math.round(unitBet * multiplier);
                totalWin += payoutColok;
                winDetails.push(`COLOK BEBAS ${this.selectedColokDigit} (${occurrences}x tembus: +${financeManager.formatCurrency(payoutColok)} TC)`);
            }
        } else if (this.activeMarketTab === 'fifty') {
            let wonFifty = false;
            if (this.selectedFiftyChoice === 'besar' && user2D >= 50) wonFifty = true;
            if (this.selectedFiftyChoice === 'kecil' && user2D < 50) wonFifty = true;
            if (this.selectedFiftyChoice === 'genap' && ekorDigit % 2 === 0) wonFifty = true;
            if (this.selectedFiftyChoice === 'ganjil' && ekorDigit % 2 !== 0) wonFifty = true;

            if (wonFifty) {
                const payoutFifty = Math.round(unitBet * 1.95);
                totalWin += payoutFifty;
                winDetails.push(`50:50 ${this.selectedFiftyChoice.toUpperCase()} TEMBUS (+${financeManager.formatCurrency(payoutFifty)} TC)`);
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
            market: this.activeMarketTab === '4d' ? '4D/3D/2D' : (this.activeMarketTab === 'colok' ? 'Colok Bebas' : '50:50'),
            payout: totalWin,
            isWin
        });
        this.saveHistory(history);

        // Update history view
        const historyList = document.getElementById('togel-history-list');
        if (historyList) {
            historyList.innerHTML = history.slice(0, 4).map(h => `
                <div class="result-row ${h.isWin ? 'won' : ''}">
                    <div class="result-left">
                        <span class="result-badge">${h.numbers}</span>
                        <span class="result-market">${h.market}</span>
                    </div>
                    <div class="result-right">
                        <span class="result-payout ${h.isWin ? 'win-text' : 'lose-text'}">
                            ${h.isWin ? '+' + financeManager.formatCurrency(h.payout) + ' TC' : 'ZONK'}
                        </span>
                    </div>
                </div>
            `).join('');
        }

        this.isDrawing = false;

        if (drawBtn) { drawBtn.disabled = false; drawBtn.innerHTML = '🎲 PASANG TARUHAN &amp; PUTAR UNDIAN'; }
        if (tokenBtn) { tokenBtn.disabled = this.lotteryTokens <= 0; }
    }
}
