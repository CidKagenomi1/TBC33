/**
 * LotteryEngine.js - Luxury VIP Togel 4D Terminal Engine
 * Focused on state management, betting rules (4D/3D/2D, Colok Bebas, 50:50),
 * progressive jackpot pool, and mechanical drum draw evaluation.
 * HTML & CSS template rendering is separated into LotteryView.js.
 */

import financeManager from '../finance/FinanceManager.js';
import gameState from '../core/GameState.js';
import ui from '../ui/UIManager.js';
import pixiEffects from '../graphics/PixiEffects.js';
import {
    renderLotteryRateStatusHTML,
    renderLotteryHistoryChipsHTML,
    renderLotteryHTML
} from './LotteryView.js';

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
        return renderLotteryRateStatusHTML(plays);
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
        return renderLotteryHTML({
            jackpot: this.getJackpot(),
            history: this.getHistory(),
            lotteryTokens: this.lotteryTokens,
            activeMarketTab: this.activeMarketTab,
            activeDigitSlot: this.activeDigitSlot,
            digits: this.digits,
            bet4D: this.bet4D,
            bet3D: this.bet3D,
            bet2D: this.bet2D,
            selectedColokDigit: this.selectedColokDigit,
            selectedFiftyChoice: this.selectedFiftyChoice,
            isDrawing: this.isDrawing,
            rateStatusHTML: this.getRateStatusHTML(),
            formatCurrency: (v) => financeManager.formatCurrency(v)
        });
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
                    input.value = parseInt(btn.dataset.val, 10).toLocaleString('en-US');
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

                container.querySelectorAll('.seg-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

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

            if (wrap) wrap.addEventListener('click', () => setActiveSlot(idx));

            if (el) {
                el.addEventListener('focus', () => setActiveSlot(idx));

                el.addEventListener('input', (e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    const val = raw ? raw[raw.length - 1] : '';
                    e.target.value = val;
                    this.digits[idx] = val;
                    this.updateGuessPreview();

                    if (val && idx < 3) setActiveSlot(idx + 1);
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

                    if (this.activeDigitSlot < 3) setActiveSlot(this.activeDigitSlot + 1);
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

            financeManager.addExpense(totalCost, 'Lainnya', `Taruhan Togel VIP (${this.activeMarketTab.toUpperCase()})`);
            const addedJp = Math.round(totalCost * 0.10);
            this.setJackpot(this.getJackpot() + addedJp);
            const jpDisplay = document.getElementById('togel-jackpot-pool-val');
            if (jpDisplay) jpDisplay.textContent = this.getJackpot().toLocaleString('en-US');
        }

        this.onBalanceRefresh?.();

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

        let resultDigits = [
            Math.floor(Math.random() * 10),
            Math.floor(Math.random() * 10),
            Math.floor(Math.random() * 10),
            Math.floor(Math.random() * 10)
        ];

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
        const winDetails = [];

        if (this.activeMarketTab === '4d') {
            const user4DStr = this.digits.join('');

            if (this.bet4D && user4DStr === resultStr) {
                const payout4D = unitBet * 3000 + this.getJackpot();
                totalWin += payout4D;
                winDetails.push(`TEMBUS 4D (+${financeManager.formatCurrency(payout4D)} TC)`);
                this.setJackpot(25000000);
                gameState.set('casino.ratePlays', 0);
            }
            if (this.bet3D && user4DStr.slice(1) === resultStr.slice(1)) {
                const payout3D = unitBet * 400;
                totalWin += payout3D;
                winDetails.push(`TEMBUS 3D (+${financeManager.formatCurrency(payout3D)} TC)`);
                gameState.set('casino.ratePlays', 0);
            }
            if (this.bet2D && user4DStr.slice(2) === resultStr.slice(2)) {
                const payout2D = unitBet * 70;
                totalWin += payout2D;
                winDetails.push(`TEMBUS 2D (+${financeManager.formatCurrency(payout2D)} TC)`);
            }
        } else if (this.activeMarketTab === 'quick') {
            const occurrences = resultDigits.filter(d => d === this.selectedColokDigit).length;
            if (occurrences > 0) {
                const payoutColok = Math.round(unitBet * 1.55 * occurrences);
                totalWin += payoutColok;
                winDetails.push(`COLOK ${this.selectedColokDigit} (+${financeManager.formatCurrency(payoutColok)} TC)`);
            }

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

        const isWin = totalWin > 0;
        if (isWin) {
            financeManager.addIncome(totalWin, 'Investasi', `Hasil Togel VIP: ${resultStr}`);
            this.onBalanceRefresh?.();

            if (winDetails.some(d => d.includes('4D'))) {
                pixiEffects.celebrateWin({ amount: totalWin, type: 'jackpot', onComplete: () => this.onBalanceRefresh?.() });
                import('../ui/AuraSound.js').then(m => m.default.playCasinoWin());
                ui.success(`🏆 TEMBUS 4D SEJATI! Hasil: ${resultStr}! Total Hadiah: ${financeManager.formatCurrency(totalWin)} TC!`, 'JACKPOT 4D');
            } else {
                pixiEffects.celebrateWin({ amount: totalWin, type: totalWin >= unitBet * 70 ? 'big' : 'win', onComplete: () => this.onBalanceRefresh?.() });
                import('../ui/AuraSound.js').then(m => m.default.playClaimMoney());
                ui.success(`MENANG TOGEL! ${winDetails.join(', ')}`, '🎯 Tembus Angka');
            }
            if (statusTicker) statusTicker.textContent = `🎉 SELAMAT! Result [ ${resultStr} ] - ${winDetails.join(' | ')}`;
        } else {
            import('../ui/AuraSound.js').then(m => m.default.playCasinoLose());
            ui.toast({ type: 'warning', title: 'Togel Belum Tembus', message: `Hasil Result: [ ${resultStr} ]. Coba racik angka hoki lagi!` });
            if (statusTicker) statusTicker.textContent = `💥 ZONK! Hasil pengundian: [ ${resultStr} ]. Tebakan Anda belum cocok.`;
        }

        const history = this.getHistory();
        history.unshift({
            id: Date.now(),
            numbers: resultStr,
            market: this.activeMarketTab === '4d' ? '4D/3D/2D' : 'Colok & 50:50',
            payout: totalWin,
            isWin
        });
        this.saveHistory(history);

        const historyList = document.getElementById('togel-history-list');
        if (historyList) {
            historyList.innerHTML = renderLotteryHistoryChipsHTML(history, (v) => financeManager.formatCurrency(v));
        }

        this.isDrawing = false;
        if (drawBtn) { drawBtn.disabled = false; drawBtn.innerHTML = '🎲 PASANG &amp; PUTAR DRUM'; }
        if (tokenBtn) { tokenBtn.disabled = this.lotteryTokens <= 0; }
    }
}
