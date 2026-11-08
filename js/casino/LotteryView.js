/**
 * LotteryView.js - View & Template Renderer for Luxury VIP Togel 4D Terminal
 * Separates all HTML markup, SVG/icon badges, and scoped CSS styles from LotteryEngine.js
 */

export function renderLotteryRateStatusHTML(plays = 0) {
    const rateOn = plays >= 250;
    return rateOn
        ? `<div class="rate-badge rate-on-badge" style="display:inline-flex; align-items:center; gap:0.3rem; background:linear-gradient(135deg,#ef4444,#fbbf24); color:#fff; font-weight:900; font-size:0.7rem; padding:0.2rem 0.6rem; border-radius:999px; box-shadow:0 0 10px rgba(239,68,68,0.6); animation: rateGlow 1s ease-in-out infinite alternate; text-transform:uppercase; border: 1.5px solid #fff;">⚡ RATE ON</div>`
        : `<div class="rate-badge rate-off-badge" style="display:inline-flex; align-items:center; gap:0.3rem; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.65); font-weight:800; font-size:0.68rem; padding:0.18rem 0.5rem; border-radius:999px;">RATE: OFF (${plays}/250)</div>`;
}

export function renderLotteryHistoryChipsHTML(history = [], formatCurrency) {
    return history.slice(0, 3).map(h => `
        <div class="hist-chip ${h.isWin ? 'won' : ''}">
            <span class="hist-num">${h.numbers}</span>
            <span class="hist-tag">${h.market}</span>
            <span class="hist-win ${h.isWin ? 'win' : ''}">${h.isWin ? '+' + formatCurrency(h.payout) : 'ZONK'}</span>
        </div>
    `).join('');
}

export function renderLotteryHTML(state) {
    const {
        jackpot,
        history,
        lotteryTokens,
        activeMarketTab,
        activeDigitSlot,
        digits,
        bet4D,
        bet3D,
        bet2D,
        selectedColokDigit,
        selectedFiftyChoice,
        isDrawing,
        rateStatusHTML,
        formatCurrency
    } = state;

    const historyRows = renderLotteryHistoryChipsHTML(history, formatCurrency);
    const d0 = digits[0] || '0';
    const d1 = digits[1] || '0';
    const d2 = digits[2] || '0';
    const d3 = digits[3] || '0';

    const slotLabels = ['AS (1)', 'KOP (2)', 'KEPALA (3)', 'EKOR (4)'];
    const defaultDigits = ['7', '4', '2', '9'];

    return `
    <div class="togel-theater-root">
        <!-- Top Industrial Lights -->
        <div class="theater-marquee-lights">
            ${Array.from({ length: 11 }, (_, i) => `<div class="mini-bulb ${i % 2 === 0 ? 'gold' : 'amber'}"></div>`).join('')}
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
                ${rateStatusHTML}
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
                <span class="token-pill" id="togel-token-display">🎟️ ${lotteryTokens} TIKET GRATIS</span>
            </div>

            <div class="tumblers-row" id="togel-drums-container">
                ${slotLabels.map((lbl, i) => `
                    <div class="tumbler-col" id="drum-${i}">
                        <span class="tumbler-label">${lbl}</span>
                        <div class="tumbler-disc"><span class="digit-text">?</span></div>
                    </div>
                `).join('')}
            </div>

            <div class="chamber-status-ticker" id="togel-drum-status">
                Silakan racik 4 digit angka hoki Anda dan tekan PUTAR...
            </div>
        </div>

        <!-- Market Tabs Bar -->
        <div class="market-segmented-tabs">
            <button class="seg-tab ${activeMarketTab === '4d' ? 'active' : ''}" data-tab="4d">
                <span class="icon">🎯</span> 4D / 3D / 2D STRAIGHT
            </button>
            <button class="seg-tab ${activeMarketTab === 'quick' ? 'active' : ''}" data-tab="quick">
                <span class="icon">🎲</span> COLOK &amp; 50:50 (SIDE BETS)
            </button>
        </div>

        <!-- Interactive Workspace Deck -->
        <div class="market-workspace-deck">
            <!-- TAB 1: 4D / 3D / 2D STRAIGHT -->
            <div class="tab-page ${activeMarketTab === '4d' ? 'active' : ''}" id="page-tab-4d">
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

                    <div class="digit-inputs-chamber">
                        ${slotLabels.map((lbl, i) => `
                            <div class="digit-slot-card ${activeDigitSlot === i ? 'focused' : ''}" id="slot-wrap-${i}" data-index="${i}">
                                <span class="slot-pos-tag">${lbl}</span>
                                <input type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="1" class="box-digit-input" id="digit-in-${i}" value="${digits[i] ?? defaultDigits[i]}" placeholder="0" autocomplete="off">
                            </div>
                        `).join('')}
                    </div>

                    <div class="digit-touch-keypad">
                        <span class="keypad-title">KEYPAD CEPAT (SENTUH LANGSUNG):</span>
                        <div class="keypad-buttons-grid">
                            ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => `
                                <button type="button" class="numpad-key-btn" data-key="${n}">${n}</button>
                            `).join('')}
                            <button type="button" class="numpad-key-btn action-del" data-key="backspace" title="Hapus Digit">⌫</button>
                        </div>
                    </div>

                    <div class="guess-preview-pill">
                        <span class="preview-lbl">ANGKA TEBAKAN:</span>
                        <div class="preview-values">
                            <span class="badge-combo">4D: <b id="lbl-prev-4d">${d0 + d1 + d2 + d3}</b></span>
                            <span class="badge-combo">3D: <b id="lbl-prev-3d">${d1 + d2 + d3}</b></span>
                            <span class="badge-combo">2D: <b id="lbl-prev-2d">${d2 + d3}</b></span>
                        </div>
                    </div>

                    <div class="package-strip">
                        <label class="pkg-chip ${bet4D ? 'checked' : ''}">
                            <input type="checkbox" id="chk-bet-4d" ${bet4D ? 'checked' : ''}>
                            <div class="pkg-label">
                                <span class="pkg-code">4D STRAIGHT</span>
                                <span class="pkg-rate">3.000× + JP</span>
                            </div>
                        </label>
                        <label class="pkg-chip ${bet3D ? 'checked' : ''}">
                            <input type="checkbox" id="chk-bet-3d" ${bet3D ? 'checked' : ''}>
                            <div class="pkg-label">
                                <span class="pkg-code">3D BELAKANG</span>
                                <span class="pkg-rate">400×</span>
                            </div>
                        </label>
                        <label class="pkg-chip ${bet2D ? 'checked' : ''}">
                            <input type="checkbox" id="chk-bet-2d" ${bet2D ? 'checked' : ''}>
                            <div class="pkg-label">
                                <span class="pkg-code">2D EKOR</span>
                                <span class="pkg-rate">70×</span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            <!-- TAB 2: COLOK & 50:50 SIDE BETS -->
            <div class="tab-page ${activeMarketTab === 'quick' ? 'active' : ''}" id="page-tab-quick">
                <div class="sidebets-layout">
                    <div class="sidebet-block">
                        <div class="block-head">
                            <span class="card-caption">🎲 COLOK BEBAS (TEBAK 1 ANGKA)</span>
                            <span class="rate-tag">1.55×</span>
                        </div>
                        <div class="colok-keypad-10">
                            ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `
                                <button type="button" class="colok-btn ${selectedColokDigit === n ? 'active' : ''}" data-digit="${n}">
                                    ${n}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <div class="sidebet-block">
                        <div class="block-head">
                            <span class="card-caption">⚖️ 50:50 (DIHITUNG DARI 2D)</span>
                            <span class="rate-tag">1.95×</span>
                        </div>
                        <div class="fifty-quad-grid">
                            <button type="button" class="fifty-pill ${selectedFiftyChoice === 'besar' ? 'active' : ''}" data-choice="besar">
                                <span class="f-title">BESAR</span>
                                <span class="f-sub">50 - 99</span>
                            </button>
                            <button type="button" class="fifty-pill ${selectedFiftyChoice === 'kecil' ? 'active' : ''}" data-choice="kecil">
                                <span class="f-title">KECIL</span>
                                <span class="f-sub">00 - 49</span>
                            </button>
                            <button type="button" class="fifty-pill ${selectedFiftyChoice === 'genap' ? 'active' : ''}" data-choice="genap">
                                <span class="f-title">GENAP</span>
                                <span class="f-sub">Ekor Genap</span>
                            </button>
                            <button type="button" class="fifty-pill ${selectedFiftyChoice === 'ganjil' ? 'active' : ''}" data-choice="ganjil">
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
                        <input type="text" id="togel-bet-input" value="10,000" ${isDrawing ? 'disabled' : ''}>
                    </div>
                </div>

                <div class="chips-row">
                    <button type="button" class="deck-chip togel-preset" data-val="10000" ${isDrawing ? 'disabled' : ''}>$10K</button>
                    <button type="button" class="deck-chip togel-preset" data-val="50000" ${isDrawing ? 'disabled' : ''}>$50K</button>
                    <button type="button" class="deck-chip togel-preset" data-val="250000" ${isDrawing ? 'disabled' : ''}>$250K</button>
                    <button type="button" class="deck-chip togel-preset" data-val="1000000" ${isDrawing ? 'disabled' : ''}>$1M</button>
                    <button type="button" class="deck-chip chip-max togel-preset" id="btn-togel-max" ${isDrawing ? 'disabled' : ''}>MAX</button>
                </div>

                <div class="action-buttons-row">
                    <button type="button" id="btn-togel-draw" class="btn-giant-draw buy" ${isDrawing ? 'disabled' : ''}>
                        🎲 PASANG &amp; PUTAR DRUM
                    </button>
                    <button type="button" id="btn-togel-token" class="btn-giant-draw token" ${lotteryTokens <= 0 || isDrawing ? 'disabled' : ''}>
                        🎟️ PUTAR TOKEN (${lotteryTokens})
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
        .togel-theater-root { max-width: 620px; margin: 0 auto; text-align: center; animation: fade-up 0.3s ease; box-sizing: border-box; padding: 0.1rem 0.2rem 1.5rem 0.2rem; }
        .theater-marquee-lights { display: flex; justify-content: center; gap: 0.4rem; margin-bottom: 0.35rem; }
        .mini-bulb { width: 7px; height: 7px; border-radius: 50%; }
        .mini-bulb.gold { background: #fbbf24; box-shadow: 0 0 6px #fbbf24; animation: lightBlink 0.6s infinite alternate; }
        .mini-bulb.amber { background: #f97316; box-shadow: 0 0 6px #f97316; animation: lightBlink 0.9s infinite alternate; }

        .togel-header-card { display: flex; justify-content: space-between; align-items: center; background: rgba(22, 17, 13, 0.85); border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 12px; padding: 0.45rem 0.75rem; margin-bottom: 0.5rem; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
        .header-left { display: flex; align-items: center; gap: 0.6rem; text-align: left; }
        .header-titles { line-height: 1.15; }
        .arcade-title { font-family: var(--font-display, 'Russo One', sans-serif); font-size: 1.15rem; font-weight: 900; color: #fbbf24; margin: 0; letter-spacing: 0.04em; }
        .arcade-sub { font-size: 0.58rem; color: rgba(255,255,255,0.45); font-weight: 800; letter-spacing: 0.08em; }

        .jackpot-ribbon { position: relative; background: radial-gradient(circle at 50% 0%, #3a2618 0%, #15100c 100%); border: 2px solid #fbbf24; border-radius: 12px; padding: 0.5rem 0.75rem; margin-bottom: 0.6rem; box-shadow: 0 0 18px rgba(251,191,36,0.25), inset 0 0 15px rgba(0,0,0,0.9); overflow: hidden; }
        .ribbon-badge { font-family: var(--font-display, sans-serif); font-size: 0.65rem; color: #fbbf24; font-weight: 900; letter-spacing: 0.12em; }
        .ribbon-value { font-family: var(--font-num, monospace); font-size: 1.95rem; font-weight: 900; color: #fff; letter-spacing: 0.05em; text-shadow: 0 0 16px rgba(251,191,36,0.7); display: flex; align-items: baseline; justify-content: center; gap: 0.25rem; }
        .ribbon-value .curr { color: #fbbf24; font-size: 1.2rem; }
        .ribbon-value .unit { font-size: 0.75rem; color: #fbbf24; font-weight: 800; }

        .drum-chamber-theater { background: linear-gradient(180deg, #1b1510 0%, #0d0a08 100%); border: 3px solid #33271d; border-top: 3px solid #4a392b; border-radius: 16px; padding: 0.65rem 0.75rem; margin-bottom: 0.65rem; box-shadow: 0 12px 35px rgba(0,0,0,0.9), inset 0 0 20px rgba(0,0,0,0.95); }
        .chamber-header-strip { display: flex; justify-content: space-between; align-items: center; font-size: 0.62rem; font-weight: 800; color: rgba(255,255,255,0.6); border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 0.4rem; margin-bottom: 0.55rem; }
        .live-dot { width: 7px; height: 7px; background: #ef4444; border-radius: 50%; display: inline-block; animation: rateGlow 1s infinite alternate; }
        .token-pill { color: #c084fc; background: rgba(168,85,247,0.15); border: 1px solid rgba(168,85,247,0.3); padding: 2px 6px; border-radius: 4px; }

        .tumblers-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.55rem; margin-bottom: 0.55rem; }
        .tumbler-col { background: rgba(0,0,0,0.4); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 0.4rem 0.2rem; position: relative; overflow: hidden; }
        .tumbler-label { font-size: 0.58rem; font-weight: 900; color: rgba(255,255,255,0.4); letter-spacing: 0.08em; display: block; margin-bottom: 0.2rem; }
        .tumbler-disc { height: 52px; background: radial-gradient(circle at 35% 35%, #291e16 0%, #100c09 100%); border: 2px solid #fbbf24; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 10px rgba(0,0,0,0.95), 0 0 10px rgba(251,191,36,0.25); }
        .digit-text { font-family: var(--font-num, monospace); font-size: 2.1rem; font-weight: 900; color: #fbbf24; line-height: 1; }
        .tumbler-disc.spinning { animation: drumSpin 0.08s linear infinite; border-color: #ef4444; }
        .tumbler-disc.spinning .digit-text { color: #ef4444; }
        .tumbler-disc.revealed { background: radial-gradient(circle at 35% 35%, #fde047 0%, #d97706 70%, #78350f 100%); border-color: #fff; box-shadow: 0 0 18px rgba(251,191,36,0.85); animation: popIn 0.3s ease-out; }
        .tumbler-disc.revealed .digit-text { color: #000; }
        .chamber-status-ticker { font-size: 0.7rem; color: rgba(255,255,255,0.7); font-style: italic; min-height: 20px; padding: 0.2rem; }

        .market-segmented-tabs { display: grid; grid-template-columns: 1.2fr 1fr; gap: 0.35rem; margin-bottom: 0.55rem; }
        .seg-tab { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; color: rgba(255,255,255,0.7); font-size: 0.72rem; font-weight: 800; padding: 0.5rem 0.25rem; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 0.3rem; }
        .seg-tab:hover { background: rgba(255,255,255,0.08); }
        .seg-tab.active { background: linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(217,119,6,0.25) 100%); border-color: #fbbf24; color: #fbbf24; box-shadow: 0 0 10px rgba(251,191,36,0.25); }

        .market-workspace-deck { background: rgba(20, 16, 12, 0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 0.75rem; box-shadow: 0 6px 20px rgba(0,0,0,0.6); margin-bottom: 0.6rem; text-align: left; }
        .tab-page { display: none; }
        .tab-page.active { display: block; animation: fade-up 0.2s ease; }

        .picker-top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.45rem; }
        .card-caption { font-size: 0.68rem; font-weight: 800; color: rgba(255,255,255,0.5); letter-spacing: 0.06em; }
        .btn-micro-action { background: rgba(251,191,36,0.12); border: 1px solid rgba(251,191,36,0.3); color: #fbbf24; font-size: 0.65rem; font-weight: 800; padding: 2px 7px; border-radius: 6px; cursor: pointer; }
        .btn-micro-action.clear { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.12); color: rgba(255,255,255,0.6); }
        .caption-with-badge { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.15; }
        .caption-sub { font-size: 0.58rem; font-weight: 800; color: #fbbf24; letter-spacing: 0.08em; }
        .digit-inputs-chamber { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.45rem; width: 100%; margin-bottom: 0.55rem; box-sizing: border-box; }
        .digit-slot-card { background: linear-gradient(180deg, #18120d 0%, #0d0907 100%); border: 1.5px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 0.35rem 0.25rem 0.3rem 0.25rem; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; transition: all 0.2s ease; min-width: 0; cursor: pointer; }
        .digit-slot-card.focused { border-color: #fbbf24; box-shadow: 0 0 12px rgba(251,191,36,0.4); background: linear-gradient(180deg, #241b12 0%, #150f0a 100%); }
        .slot-pos-tag { font-size: 0.58rem; font-weight: 900; color: rgba(255,255,255,0.5); letter-spacing: 0.08em; margin-bottom: 0.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .digit-slot-card.focused .slot-pos-tag { color: #fbbf24; }
        .box-digit-input { width: 100% !important; min-width: 0 !important; max-width: 100% !important; height: 48px; background: #090706; border: 1.5px solid rgba(255,255,255,0.12); border-radius: 8px; color: #fff; font-family: var(--font-num, monospace); font-size: 1.95rem; font-weight: 900; text-align: center; outline: none; box-sizing: border-box !important; padding: 0 !important; margin: 0 !important; transition: border-color 0.2s, box-shadow 0.2s, color 0.2s; }
        .box-digit-input:focus { border-color: #fbbf24; box-shadow: 0 0 10px rgba(251,191,36,0.5); color: #fbbf24; }

        .digit-touch-keypad { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.35rem 0.45rem; margin-bottom: 0.55rem; box-sizing: border-box; }
        .keypad-title { font-size: 0.58rem; font-weight: 800; color: rgba(255,255,255,0.45); display: block; margin-bottom: 0.25rem; letter-spacing: 0.06em; }
        .keypad-buttons-grid { display: grid; grid-template-columns: repeat(11, minmax(0, 1fr)); gap: 0.25rem; }
        .numpad-key-btn { height: 32px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-family: var(--font-num, monospace); font-size: 0.95rem; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; box-sizing: border-box; transition: all 0.1s; -webkit-tap-highlight-color: transparent; }
        .numpad-key-btn:hover { background: rgba(251,191,36,0.2); border-color: #fbbf24; color: #fbbf24; }
        .numpad-key-btn:active { transform: scale(0.92); background: #fbbf24; color: #000; }
        .numpad-key-btn.action-del { background: rgba(239,68,68,0.18); border-color: rgba(239,68,68,0.35); color: #f87171; }
        .numpad-key-btn.action-del:hover { background: #ef4444; color: #fff; }

        .guess-preview-pill { display: flex; justify-content: space-between; align-items: center; background: rgba(251,191,36,0.06); border: 1px dashed rgba(251,191,36,0.3); border-radius: 8px; padding: 0.3rem 0.55rem; margin-bottom: 0.55rem; box-sizing: border-box; }
        .preview-lbl { font-size: 0.6rem; font-weight: 900; color: rgba(255,255,255,0.5); letter-spacing: 0.06em; }
        .preview-values { display: flex; gap: 0.55rem; }
        .badge-combo { font-size: 0.65rem; font-weight: 800; color: rgba(255,255,255,0.65); }
        .badge-combo b { color: #fbbf24; font-family: var(--font-num, monospace); font-size: 0.78rem; letter-spacing: 0.05em; }

        .package-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.35rem; margin-bottom: 0.75rem; }
        .pkg-chip { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 0.4rem 0.3rem; cursor: pointer; display: flex; align-items: center; gap: 0.35rem; transition: all 0.15s; }
        .pkg-chip.checked { background: rgba(251,191,36,0.08); border-color: rgba(251,191,36,0.35); }
        .pkg-label { line-height: 1.1; }
        .pkg-code { font-size: 0.68rem; font-weight: 900; color: #fff; display: block; }
        .pkg-rate { font-size: 0.6rem; font-weight: 800; color: #fbbf24; }

        .sidebets-layout { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 0.75rem; }
        .sidebet-block { background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; padding: 0.5rem; }
        .block-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; }
        .rate-tag { font-size: 0.68rem; font-weight: 900; color: #fbbf24; }
        .colok-keypad-10 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.35rem; }
        .colok-btn { height: 38px; border-radius: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: #fff; font-family: var(--font-num, monospace); font-size: 1.15rem; font-weight: 900; cursor: pointer; transition: all 0.15s; }
        .colok-btn.active { background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%); color: #000; border-color: #fff; box-shadow: 0 0 10px rgba(251,191,36,0.6); }

        .fifty-quad-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.3rem; }
        .fifty-pill { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 0.4rem 0.2rem; cursor: pointer; text-align: center; transition: all 0.15s; }
        .fifty-pill.active { background: rgba(251,191,36,0.18); border-color: #fbbf24; box-shadow: 0 0 10px rgba(251,191,36,0.25); }
        .f-title { font-size: 0.72rem; font-weight: 900; color: #fff; display: block; }
        .fifty-pill.active .f-title { color: #fbbf24; }
        .f-sub { font-size: 0.58rem; color: rgba(255,255,255,0.4); display: block; }

        .docked-control-deck { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.65rem; display: flex; flex-direction: column; gap: 0.45rem; }
        .bet-adjust-row { display: flex; justify-content: space-between; align-items: center; }
        .stake-label-box { line-height: 1.15; }
        .deck-lbl { font-size: 0.62rem; color: rgba(255,255,255,0.5); font-weight: 800; display: block; }
        .deck-cost { font-size: 0.75rem; color: #10b981; font-weight: 900; }
        .stake-input-box { display: flex; align-items: center; gap: 0.2rem; border-bottom: 1.5px solid rgba(251,191,36,0.5); }
        .curr-sign { font-size: 1.1rem; color: #fbbf24; font-weight: 900; }
        #togel-bet-input { background: transparent; border: none; font-family: var(--font-num, monospace); font-size: 1.25rem; font-weight: 900; color: #fff; width: 110px; text-align: right; outline: none; }

        .chips-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.25rem; }
        .deck-chip { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.85); font-size: 0.68rem; font-weight: 800; padding: 0.3rem 0.15rem; border-radius: 6px; cursor: pointer; }
        .deck-chip:hover { border-color: #fbbf24; color: #fbbf24; }
        .deck-chip.chip-max { background: rgba(251,191,36,0.12); border-color: rgba(251,191,36,0.3); color: #fbbf24; }

        .action-buttons-row { display: flex; gap: 0.4rem; margin-top: 0.2rem; }
        .btn-giant-draw { font-family: var(--font-display, 'Russo One', sans-serif); border: none; border-radius: 10px; padding: 0.85rem 0.5rem; font-size: 1rem; color: #fff; cursor: pointer; letter-spacing: 0.04em; transition: all 0.15s; }
        .btn-giant-draw.buy { flex: 1.6; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); box-shadow: 0 4px 14px rgba(245,158,11,0.35); }
        .btn-giant-draw.token { flex: 1.2; background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); box-shadow: 0 4px 14px rgba(168,85,247,0.35); }
        .btn-giant-draw:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); }
        .btn-giant-draw:disabled { opacity: 0.45; cursor: not-allowed; }

        .bottom-history-strip { display: flex; align-items: center; gap: 0.5rem; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 0.35rem 0.6rem; overflow-x: auto; }
        .hist-label { font-size: 0.6rem; font-weight: 800; color: rgba(255,255,255,0.4); white-space: nowrap; }
        .hist-list { display: flex; gap: 0.4rem; flex: 1; }
        .hist-chip { display: inline-flex; align-items: center; gap: 0.3rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 4px; padding: 2px 6px; font-size: 0.65rem; white-space: nowrap; }
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

