/**
 * LotteryEngine.js - Interactive Mega Lottery Engine
 * Handles tickets, lucky number selection, bouncing draw animation, and progressive jackpots.
 * Mobile responsive optimized (preventing vertical scrolling).
 */

import financeManager from '../finance/FinanceManager.js';
import gameState from '../core/GameState.js';
import ui from '../ui/UIManager.js';
import pixiEffects from '../graphics/PixiEffects.js';

export class LotteryEngine {
    getRateStatusHTML() {
        const plays = gameState.get('casino.ratePlays') || 0;
        const rateOn = plays >= 250;
        return rateOn 
            ? `<div class="rate-badge rate-on-badge" style="display:inline-flex; align-items:center; gap:0.25rem; background:linear-gradient(135deg,#ef4444,#fbbf24); color:#fff; font-weight:900; font-size:0.75rem; padding:0.25rem 0.6rem; border-radius:999px; box-shadow:0 0 10px rgba(239,68,68,0.5); animation: rateGlow 1s ease-in-out infinite alternate; text-transform:uppercase; letter-spacing:0.05em; margin-bottom: 0.5rem; border: 1.5px solid #fff;">⚡ RATE ON (JACKPOT UP!)</div>`
            : `<div class="rate-badge rate-off-badge" style="display:inline-flex; align-items:center; gap:0.25rem; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.6); font-weight:800; font-size:0.7rem; padding:0.2rem 0.5rem; border-radius:999px; text-transform:uppercase; letter-spacing:0.05em; margin-bottom: 0.5rem;">Rate: OFF (${plays}/250 Spins)</div>`;
    }

    constructor(onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;
        this.selectedNumbers = [];
        this.isDrawing = false;
        this.ticketCost = 10000; // $10,000
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
            jp = 10000000; // start at $10,000,000
            gameState.set('casino.lotteryJackpot', jp);
        }
        return jp;
    }

    setJackpot(amount) {
        gameState.set('casino.lotteryJackpot', amount);
    }

    getHistory() {
        return gameState.get('casino.lotteryHistory') || [];
    }

    saveHistory(history) {
        gameState.set('casino.lotteryHistory', history.slice(0, 10));
    }

    getHTML() {
        const jackpot = this.getJackpot();
        const history = this.getHistory();
        
        // Render 1-20 number picker
        let numberGrid = '';
        for (let i = 1; i <= 20; i++) {
            const isSelected = this.selectedNumbers.includes(i);
            numberGrid += `
                <button class="lottery-num-btn ${isSelected ? 'selected' : ''}" data-num="${i}">${i}</button>
            `;
        }

        // Render history logs
        const historyHTML = history.length === 0
            ? `<div style="font-size:0.7rem; color:rgba(255,255,255,0.3); font-style:italic;">Belum ada riwayat undian.</div>`
            : history.map(h => {
                const isWin = h.matches > 0;
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding: 0.35rem 0.5rem; border-radius: 6px; font-size:0.7rem; border:1px solid rgba(255,255,255,0.03);">
                        <div style="display:flex; align-items:center; gap:0.3rem;">
                            <span>🎫 ${h.selected.join(', ')}</span>
                            <span style="color:rgba(255,255,255,0.3); font-size: 0.6rem;">vs</span>
                            <span style="color:#fbbf24; font-weight:700;">🔮 ${h.drawn.join(', ')}</span>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-weight:700; color:${isWin ? '#34d399' : 'var(--text-muted)'}">${h.matches} M (${isWin ? '+' + financeManager.formatCurrency(h.payout) : '0'})</div>
                        </div>
                    </div>
                `;
            }).slice(0, 3).join(''); // Show only last 3 items to save mobile vertical height

        return `
        <div style="max-width: 620px; margin: 0 auto; text-align: center; animation: fade-up 0.3s ease;">
            <div style="display:flex; justify-content:center; margin-bottom:0.4rem;">
                <button type="button" class="btn-lobby-pill" title="Buka Menu Game (L)"><span>☰</span> LOBBY / GANTI GAME</button>
            </div>
            <h3 style="font-weight: 900; color: #fff; margin-bottom: 0.35rem; font-size: 1.4rem; letter-spacing: -0.03em;">
                🎫 <span style="background: linear-gradient(90deg,#f59e0b,#fbbf24); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">MEGA LOTTERY</span>
            </h3>
            <p style="color:rgba(255,255,255,0.4); font-size:0.75rem; margin-bottom:0.75rem; text-transform:uppercase; letter-spacing:0.1em;">Pilih 4 Nomor Keberuntungan Anda &amp; Raih Jackpot Progresif!</p>
            ${this.getRateStatusHTML()}

            <!-- Progressive Jackpot Display -->
            <div class="lottery-jackpot-banner">
                <div style="font-size:0.65rem; color:rgba(255,255,255,0.5); font-weight:800; letter-spacing:0.12em; text-transform:uppercase;">GRAND JACKPOT PROGRESIF</div>
                <div class="lottery-jackpot-val-text">
                    <span style="font-size: 1.1rem; color: #fbbf24;">$</span>
                    <span id="lottery-jackpot-pool-val">${jackpot.toLocaleString('en-US')}</span>
                </div>
                <div style="font-size: 0.68rem; color: rgba(255,255,255,0.4); margin-top: 0.15rem;">Biaya: $10K (15% masuk Jackpot)</div>
            </div>

            <!-- Token Balance Indicator -->
            <div style="background: rgba(168,85,247,0.12); border: 1.5px solid rgba(168,85,247,0.3); border-radius: 12px; padding: 0.5rem 1rem; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.75rem; color: #c084fc; font-weight: 800;">🎫 TIKET TOKEN LOTRE:</span>
                <span style="font-size: 0.95rem; font-weight: 900; color: #fff;" id="lottery-token-val">${this.lotteryTokens} TIKET</span>
            </div>

            <!-- Number Picker Board -->
            <div class="lottery-number-picker-board">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                    <div style="text-align:left;">
                        <h4 style="font-size:0.85rem; font-weight:800; color:#fff; margin:0;">Pilih 4 Nomor (1 - 20)</h4>
                        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.1rem;" id="lottery-selected-status">Terpilih: 0 / 4</div>
                    </div>
                    <button id="btn-lottery-quickpick" class="bet-chip" style="border-radius:6px; font-size:0.72rem; font-weight:800; padding:4px 8px;">⚡ QUICK PICK</button>
                </div>

                <div class="lottery-grid-cols">
                    ${numberGrid}
                </div>

                <!-- Ticket Amount Selector -->
                <div class="lottery-qty-cost-bar">
                    <div style="text-align:left;">
                        <label style="display:block; font-size:0.68rem; color:rgba(255,255,255,0.5); margin-bottom:0.1rem; font-weight:700;">JUMLAH TIKET</label>
                        <input type="number" id="lottery-ticket-qty" value="1" min="1" max="100" style="background:var(--bg-surface); border:1px solid var(--border-color); font-size:0.95rem; font-weight:700; color:#fff; width:80px; text-align:center; border-radius:6px; padding: 0.25rem; outline:none;">
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:0.68rem; color:rgba(255,255,255,0.5); font-weight:700;">TOTAL BIAYA</div>
                        <div style="font-size:1.15rem; font-weight:900; color:#fff; margin-top:0.1rem;" id="lottery-total-cost-display">$ 10,000</div>
                    </div>
                </div>
            </div>

            <!-- Draw Ball Animation Area -->
            <div id="lottery-draw-area" class="lottery-draw-area-box">
                <div id="lottery-balls-container" style="display:flex; gap:0.75rem; justify-content:center; align-items:center; width:100%;">
                    <span style="color:rgba(255,255,255,0.2); font-size:0.75rem; font-style:italic;">Hasil undian akan muncul di sini...</span>
                </div>
            </div>

            <!-- Draw Action Buttons -->
            <div style="display: flex; gap: 0.5rem; width: 100%;">
                <button id="btn-lottery-buy-draw" class="spin-btn-action-lottery" style="flex: 2;">
                    🎫 BELI &amp; UNDI SEKARANG
                </button>
                <button id="btn-lottery-token-draw" class="spin-btn-action-lottery" style="flex: 1.2; background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); box-shadow: 0 4px 12px rgba(168,85,247,0.3); padding:0; display:flex; align-items:center; justify-content:center;" ${this.lotteryTokens <= 0 ? 'disabled' : ''}>
                    🎟️ UNDI DENGAN TOKEN
                </button>
            </div>

            <!-- Draw Payout table & History -->
            <div class="lottery-footer-grid">
                <div>
                    <div style="font-size:0.65rem; color:rgba(255,255,255,0.35); text-transform:uppercase; letter-spacing:0.08em; font-weight:800; margin-bottom:0.4rem;">— KELAS HADIAH TIKET —</div>
                    <div style="display:flex; flex-direction:column; gap:0.25rem; font-size:0.72rem;">
                        <div style="display:flex; justify-content:space-between; background:rgba(255,255,255,0.02); padding:0.3rem 0.5rem; border-radius:6px;">
                            <span>4 Match</span>
                            <span style="color:#fbbf24; font-weight:800;">100% JACKPOT</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; background:rgba(255,255,255,0.02); padding:0.3rem 0.5rem; border-radius:6px;">
                            <span>3 Match</span>
                            <span style="color:#fbbf24; font-weight:800;">100× Taruhan</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; background:rgba(255,255,255,0.02); padding:0.3rem 0.5rem; border-radius:6px;">
                            <span>2 Match</span>
                            <span style="color:#fbbf24; font-weight:800;">10x Taruhan</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; background:rgba(255,255,255,0.02); padding:0.3rem 0.5rem; border-radius:6px;">
                            <span>1 Match</span>
                            <span style="color:#fbbf24; font-weight:800;">2x Taruhan</span>
                        </div>
                    </div>
                </div>
                <div>
                    <div style="font-size:0.65rem; color:rgba(255,255,255,0.35); text-transform:uppercase; letter-spacing:0.08em; font-weight:800; margin-bottom:0.4rem;">— RIWAYAT UNDIAN —</div>
                    <div style="display:flex; flex-direction:column; gap:0.25rem;" id="lottery-history-list">
                        ${historyHTML}
                    </div>
                </div>
            </div>
        </div>

        <style>
            .lottery-jackpot-banner {
                background: linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(20,15,10,0.9) 100%);
                border: 2px dashed #f59e0b;
                border-radius: 16px;
                padding: 1rem;
                margin-bottom: 0.75rem;
                box-shadow: 0 0 16px rgba(245,158,11,0.08);
            }
            .lottery-jackpot-val-text {
                font-family: var(--font-num, 'Rajdhani', sans-serif);
                font-size: 2.2rem; 
                font-weight: 700; 
                letter-spacing: 0.04em;
                color: #fbbf24; 
                margin-top: 0.15rem; 
                text-shadow: 0 0 16px rgba(251,191,36,0.5); 
                display: flex; 
                justify-content: center; 
                align-items: baseline; 
                gap: 0.2rem;
            }
            .lottery-number-picker-board {
                background:rgba(0,0,0,0.2); 
                border:1px solid rgba(255,255,255,0.06); 
                border-radius:16px; 
                padding:1rem; 
                margin-bottom:0.75rem;
            }
            .lottery-grid-cols {
                display:grid; 
                grid-template-columns: repeat(5, 1fr); 
                gap: 0.5rem; 
                justify-items: center; 
                margin-bottom: 0.75rem;
            }
            .lottery-num-btn {
                width: 38px; 
                height: 38px; 
                border-radius: 50%;
                background: rgba(255,255,255,0.04);
                color: rgba(255,255,255,0.8);
                border: 1px solid rgba(255,255,255,0.1);
                font-family: var(--font-num, 'Rajdhani', sans-serif);
                font-weight: 700; 
                font-size: 1.05rem; 
                cursor: pointer; 
                transition: all 0.2s;
            }
            .lottery-num-btn.selected {
                background: linear-gradient(135deg, #f59e0b, #d97706) !important;
                color: #000 !important;
                border-color: #fbbf24 !important;
            }
            .lottery-qty-cost-bar {
                border-top:1px solid rgba(255,255,255,0.05); 
                padding-top:0.75rem; 
                display:flex; 
                justify-content:space-between; 
                align-items:center; 
                gap:1rem; 
                flex-wrap:wrap;
            }
            .lottery-draw-area-box {
                background:rgba(255,255,255,0.01); 
                border:1px solid rgba(255,255,255,0.05); 
                border-radius:16px; 
                padding:0.75rem; 
                margin-bottom:0.75rem; 
                position:relative; 
                overflow:hidden; 
                min-height:72px; 
                display:flex; 
                align-items:center; 
                justify-content:center;
            }
            .spin-btn-action-lottery {
                font-family: var(--font-display, 'Russo One', sans-serif);
                background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%); 
                border:none; 
                font-weight:400; 
                font-size:1.25rem; 
                letter-spacing:0.06em;
                padding:0.85rem 2rem; 
                width:100%; 
                border-radius:10px; 
                box-shadow:0 4px 14px rgba(245,158,11,0.3); 
                cursor:pointer; 
                transition:all 0.25s; 
                color:#fff; 
                text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            }
            .lottery-footer-grid {
                margin-top:1.25rem; 
                border-top:1px solid rgba(255,255,255,0.05); 
                padding-top:1rem; 
                display:grid; 
                grid-template-columns:1fr 1fr; 
                gap:1rem; 
                text-align:left;
            }

            .lottery-num-btn:hover:not(.selected) {
                background: rgba(255,255,255,0.08) !important;
                border-color: rgba(255,255,255,0.2) !important;
                color: #fff !important;
            }
            @keyframes ballPop {
                0% { transform: scale(0) rotate(-180deg); opacity: 0; }
                60% { transform: scale(1.2) rotate(10deg); opacity: 1; }
                100% { transform: scale(1) rotate(0deg); }
            }
            @keyframes rateGlow {
                from { box-shadow: 0 0 4px rgba(239,68,68,0.4), 0 0 10px rgba(251,191,36,0.2); transform: scale(1); }
                to { box-shadow: 0 0 12px rgba(239,68,68,0.8), 0 0 20px rgba(251,191,36,0.6); transform: scale(1.03); }
            }
            @keyframes ballSpin {
                to { transform: rotate(360deg); }
            }
            .lottery-ball {
                width: 38px; height: 38px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                font-weight: 900; font-size: 1rem; color: #000;
                box-shadow: 0 3px 6px rgba(0,0,0,0.4), inset -3px -3px 8px rgba(0,0,0,0.3), inset 3px 3px 8px rgba(255,255,255,0.4);
                text-shadow: 0 1px 0 rgba(255,255,255,0.2);
                animation: ballPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            }

            @media (max-width: 600px) {
                .lottery-jackpot-banner {
                    padding: 0.5rem 0.75rem;
                    border-radius: 12px;
                    margin-bottom: 0.5rem;
                }
                .lottery-jackpot-val-text {
                    font-size: 1.35rem;
                }
                .lottery-number-picker-board {
                    padding: 0.65rem;
                    margin-bottom: 0.5rem;
                    border-radius: 12px;
                }
                .lottery-grid-cols {
                    gap: 0.35rem;
                    margin-bottom: 0.5rem;
                }
                .lottery-num-btn {
                    width: 30px;
                    height: 30px;
                    font-size: 0.8rem;
                }
                .lottery-qty-cost-bar {
                    padding-top: 0.5rem;
                }
                .lottery-draw-area-box {
                    padding: 0.4rem;
                    min-height: 52px;
                    margin-bottom: 0.5rem;
                    border-radius: 12px;
                }
                .spin-btn-action-lottery {
                    font-size: 1rem;
                    padding: 0.65rem 1.5rem;
                }
                .lottery-footer-grid {
                    grid-template-columns: 1fr;
                    gap: 0.75rem;
                    margin-top: 0.75rem;
                    padding-top: 0.75rem;
                }
            }
        </style>
        `;
    }

    bindEvents(container, onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;

        // Qty input listener
        const qtyInput = document.getElementById('lottery-ticket-qty');
        if (qtyInput) {
            qtyInput.addEventListener('input', () => {
                let val = parseInt(qtyInput.value, 10);
                if (isNaN(val) || val <= 0) val = 1;
                if (val > 100) val = 100;
                qtyInput.value = val;
                
                const costDisplay = document.getElementById('lottery-total-cost-display');
                if (costDisplay) costDisplay.textContent = '$ ' + (val * this.ticketCost).toLocaleString();
            });
        }

        // Toggle numbers
        container.querySelectorAll('.lottery-num-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isDrawing) return;
                const num = parseInt(btn.dataset.num, 10);
                
                if (this.selectedNumbers.includes(num)) {
                    this.selectedNumbers = this.selectedNumbers.filter(n => n !== num);
                } else {
                    if (this.selectedNumbers.length >= 4) {
                        ui.toast({ type: 'warning', title: 'Limit Pemilihan', message: 'Anda hanya bisa memilih maksimal 4 angka!' });
                        return;
                    }
                    this.selectedNumbers.push(num);
                }
                
                this.selectedNumbers.sort((a, b) => a - b);
                this.refreshSelections(container);
            });
        });

        // Quickpick
        document.getElementById('btn-lottery-quickpick')?.addEventListener('click', () => {
            if (this.isDrawing) return;
            const nums = [];
            while (nums.length < 4) {
                const r = Math.floor(Math.random() * 20) + 1;
                if (!nums.includes(r)) nums.push(r);
            }
            this.selectedNumbers = nums.sort((a, b) => a - b);
            this.refreshSelections(container);
        });

        // Buy & Draw Action
        document.getElementById('btn-lottery-buy-draw')?.addEventListener('click', () => this.buyAndDraw(false));
        document.getElementById('btn-lottery-token-draw')?.addEventListener('click', () => this.buyAndDraw(true));
    }

    refreshSelections(container) {
        container.querySelectorAll('.lottery-num-btn').forEach(btn => {
            const num = parseInt(btn.dataset.num, 10);
            const isSelected = this.selectedNumbers.includes(num);
            if (isSelected) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });

        const statusEl = document.getElementById('lottery-selected-status');
        if (statusEl) statusEl.textContent = `Terpilih: ${this.selectedNumbers.length} / 4`;
    }

    async buyAndDraw(useToken = false) {
        if (this.isDrawing) return;
        if (this.selectedNumbers.length !== 4) {
            ui.error('Pilih tepat 4 nomor keberuntungan terlebih dahulu!');
            return;
        }

        const qtyInput = document.getElementById('lottery-ticket-qty');
        const qty = parseInt(qtyInput ? qtyInput.value : '1', 10) || 1;
        const totalCost = qty * this.ticketCost;

        if (useToken) {
            if (this.lotteryTokens < qty) {
                ui.error(`Token tidak mencukupi! Anda butuh ${qty} Token.`);
                return;
            }
        } else {
            const balance = gameState.getBalance();
            if (totalCost > balance) {
                ui.error('Saldo kas Anda tidak mencukupi untuk membeli tiket lotre!');
                return;
            }
        }

        this.isDrawing = true;
        import('../ui/AuraSound.js').then(m => m.default.playCasinoSpin());
        const drawBtn = document.getElementById('btn-lottery-buy-draw');
        const tokenDrawBtn = document.getElementById('btn-lottery-token-draw');
        if (drawBtn) {
            drawBtn.disabled = true;
            drawBtn.innerHTML = '🔮 MENGUNDI...';
        }
        if (tokenDrawBtn) {
            tokenDrawBtn.disabled = true;
            tokenDrawBtn.innerHTML = '🔮 MENGUNDI...';
        }

        if (useToken) {
            this.lotteryTokens -= qty;
            const tokenValEl = document.getElementById('lottery-token-val');
            if (tokenValEl) tokenValEl.textContent = `${this.lotteryTokens} TIKET`;
        } else {
            // Deduct ticket costs
            financeManager.addExpense(totalCost, 'Lainnya', `Membeli ${qty} Tiket Lotre`);
            
            // Boost progressive jackpot pool by 15% of ticket sales
            const addedJp = Math.round(totalCost * 0.15);
            let jackpot = this.getJackpot() + addedJp;
            this.setJackpot(jackpot);

            const jpDisplay = document.getElementById('lottery-jackpot-pool-val');
            if (jpDisplay) jpDisplay.textContent = jackpot.toLocaleString('en-US');
        }

        this.onBalanceRefresh?.();

        // Increment rate plays
        let plays = gameState.get('casino.ratePlays') || 0;
        plays++;
        gameState.set('casino.ratePlays', plays);
        const rateOn = plays >= 250;

        // Start drawing animation
        const ballsContainer = document.getElementById('lottery-balls-container');
        if (ballsContainer) ballsContainer.innerHTML = '';

        // Draw 4 random numbers from 1 to 20
        let drawnNums = [];
        while (drawnNums.length < 4) {
            const r = Math.floor(Math.random() * 20) + 1;
            if (!drawnNums.includes(r)) drawnNums.push(r);
        }
        drawnNums.sort((a, b) => a - b);

        if (rateOn) {
            const forceMatchRoll = Math.random();
            let targetMatches = 0;
            if (forceMatchRoll < 0.10) targetMatches = 4; // 10% chance for Grand Jackpot!
            else if (forceMatchRoll < 0.35) targetMatches = 3; // 25% chance for 3 matches!
            else if (forceMatchRoll < 0.80) targetMatches = 2; // 45% chance for 2 matches!

            if (targetMatches > 0) {
                const matchedNumbers = this.selectedNumbers.slice(0, targetMatches);
                const remainingCount = 4 - targetMatches;
                const extraNumbers = [];
                while (extraNumbers.length < remainingCount) {
                    const r = Math.floor(Math.random() * 20) + 1;
                    if (!this.selectedNumbers.includes(r) && !extraNumbers.includes(r)) {
                        extraNumbers.push(r);
                    }
                }
                drawnNums = [...matchedNumbers, ...extraNumbers].sort((a, b) => a - b);
            }
        }

        const ballColors = [
            'linear-gradient(135deg, #ef4444, #b91c1c)', // red
            'linear-gradient(135deg, #3b82f6, #1d4ed8)', // blue
            'linear-gradient(135deg, #10b981, #047857)', // green
            'linear-gradient(135deg, #fbbf24, #d97706)', // yellow/orange
        ];

        // Animate drawing balls one by one
        for (let i = 0; i < 4; i++) {
            if (ballsContainer) {
                const placeholder = document.createElement('div');
                placeholder.className = 'lottery-ball';
                placeholder.style.background = 'rgba(255,255,255,0.05)';
                placeholder.style.color = '#fff';
                placeholder.style.border = '1px dashed rgba(255,255,255,0.2)';
                placeholder.innerHTML = '🔮';
                ballsContainer.appendChild(placeholder);

                await new Promise(r => setTimeout(r, 650));
                
                import('../ui/AuraSound.js').then(m => m.default.playTap());
                placeholder.style.background = ballColors[i];
                placeholder.style.border = 'none';
                placeholder.style.color = '#000';
                placeholder.textContent = drawnNums[i];
            }
        }

        // Evaluate matches
        const matches = this.selectedNumbers.filter(n => drawnNums.includes(n)).length;
        
        let multiplier = 0;
        let payout = 0;
        let wonJackpot = false;

        if (matches === 4) {
            wonJackpot = true;
            payout = jackpot;
            this.setJackpot(10000000); // reset progressive jackpot to $10,000,000
            gameState.set('casino.ratePlays', 0);
        } else if (matches === 3) {
            multiplier = 100;
            gameState.set('casino.ratePlays', 0);
        } else if (matches === 2) {
            multiplier = 10;
        } else if (matches === 1) {
            multiplier = 2;
        }

        if (multiplier > 0) {
            payout = (useToken ? qty * this.ticketCost : totalCost) * multiplier;
        }

        // Award payouts
        if (payout > 0) {
            financeManager.addIncome(payout, 'Investasi', `Hadiah Undian Lotre (${matches} Match)`);
            this.onBalanceRefresh?.();
        }

        // Add history log
        const newLog = {
            id: Date.now(),
            selected: [...this.selectedNumbers],
            drawn: [...drawnNums],
            matches,
            payout
        };

        const history = this.getHistory();
        history.unshift(newLog);
        this.saveHistory(history);

        // PixiJS & GSAP Win Celebration & Toast feedback
        if (wonJackpot) {
            import('../ui/AuraSound.js').then(m => m.default.playCasinoWin());
            pixiEffects.celebrateWin({
                amount: payout,
                type: 'jackpot',
                onComplete: () => this.onBalanceRefresh?.()
            });
            ui.success(`🏆 JACKPOT PROGRESIF! Anda mencocokkan seluruh 4 nomor dan memenangkan ${financeManager.formatCurrency(payout)} TC!`, 'Mega Jackpot Lotre');
        } else if (payout > 0) {
            import('../ui/AuraSound.js').then(m => m.default.playCasinoWin());
            if (matches >= 3) {
                pixiEffects.celebrateWin({
                    amount: payout,
                    type: 'big',
                    onComplete: () => this.onBalanceRefresh?.()
                });
            } else {
                pixiEffects.flyChipsToHeader(document.getElementById('lottery-draw-ball-container'), 12);
            }
            ui.success(`Menang ${financeManager.formatCurrency(payout)} TC! Anda mencocokkan ${matches} nomor keberuntungan.`, 'Hadiah Lotre');
        } else {
            import('../ui/AuraSound.js').then(m => m.default.playCasinoLose());
            ui.toast({ type: 'warning', title: 'Lotre Kalah', message: 'Tidak ada nomor yang cocok. Semoga beruntung di undian berikutnya!' });
        }

        // Reload views
        const historyList = document.getElementById('lottery-history-list');
        if (historyList) {
            const freshHistory = this.getHistory();
            historyList.innerHTML = freshHistory.map(h => {
                const isWin = h.payout > 0;
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding: 0.35rem 0.5rem; border-radius: 6px; font-size:0.7rem; border:1px solid rgba(255,255,255,0.03);">
                        <div style="display:flex; align-items:center; gap:0.3rem;">
                            <span>🎫 ${h.selected.join(', ')}</span>
                            <span style="color:rgba(255,255,255,0.3); font-size: 0.6rem;">vs</span>
                            <span style="color:#fbbf24; font-weight:700;">🔮 ${h.drawn.join(', ')}</span>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-weight:700; color:${isWin ? '#34d399' : 'var(--text-muted)'}">${h.matches} M (${isWin ? '+' + financeManager.formatCurrency(h.payout) : '0'})</div>
                        </div>
                    </div>
                `;
            }).slice(0, 3).join('');
        }

        const jpDisplayRefreshed = document.getElementById('lottery-jackpot-pool-val');
        if (jpDisplayRefreshed) jpDisplayRefreshed.textContent = this.getJackpot().toLocaleString('en-US');

        // Reset button states
        this.isDrawing = false;

        // Update rate badge
        const root = document.getElementById('casino-game-panel');
        if (root) {
            const badge = root.querySelector('.rate-badge');
            if (badge) {
                badge.outerHTML = this.getRateStatusHTML();
            }
        }

        if (drawBtn) {
            drawBtn.disabled = false;
            drawBtn.innerHTML = '🎫 BELI &amp; UNDI SEKARANG';
        }
        if (tokenDrawBtn) {
            tokenDrawBtn.disabled = this.lotteryTokens <= 0;
            tokenDrawBtn.innerHTML = '🎟️ UNDI DENGAN TOKEN';
        }
        
        // Update token text
        const tokenValEl = document.getElementById('lottery-token-val');
        if (tokenValEl) tokenValEl.textContent = `${this.lotteryTokens} TIKET`;
    }
}
