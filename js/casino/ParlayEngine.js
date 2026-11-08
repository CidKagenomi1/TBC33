/**
 * ParlayEngine.js - European Football Parlay Sportsbook Terminal
 * Refactored VIP Sports Betting Engine:
 * - 100% Football Focused (Top European Leagues & Clubs)
 * - Multiple Betting Markets: 1X2, Over/Under 2.5 Goals, Both Teams To Score (BTTS)
 * - Authentic Parlay Multiplier Formula: Total Odds = Product of all selected legs (Odds1 * Odds2 * ...)
 * - Live Matchday Simulation Broadcast: Real-time minute-by-minute score updates, goal alerts & commentary
 * - Modern Sportsbook Slip UI with instant potential payout calculations
 * - View Separation: HTML/CSS template rendering delegated to ParlayView.js
 */

import financeManager from '../finance/FinanceManager.js';
import gameState from '../core/GameState.js';
import ui from '../ui/UIManager.js';
import pixiEffects from '../graphics/PixiEffects.js';
import casinoVolatility from './CasinoVolatilityEngine.js';
import {
    renderParlayRateStatusHTML,
    renderBroadcastLegsHTML,
    renderBroadcastSummaryHTML,
    renderParlayHTML
} from './ParlayView.js';

const LEAGUES = [
    { id: 'all', name: 'Semua Liga', emoji: '🌍' },
    { id: 'ucl', name: 'Champions League', emoji: '🏆' },
    { id: 'epl', name: 'Premier League', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { id: 'laliga', name: 'La Liga', emoji: '🇪🇸' },
    { id: 'seriea', name: 'Serie A', emoji: '🇮🇹' },
    { id: 'bundesliga', name: 'Bundesliga', emoji: '🇩🇪' }
];

const CLUBS_BY_LEAGUE = {
    ucl: [
        { name: "Real Madrid", flag: "🇪🇸", emoji: "⚪", power: 92 },
        { name: "Manchester City", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", emoji: "🔵", power: 93 },
        { name: "Bayern Munchen", flag: "🇩🇪", emoji: "🔴", power: 90 },
        { name: "Paris Saint-Germain", flag: "🇫🇷", emoji: "🔵", power: 88 },
        { name: "Inter Milan", flag: "🇮🇹", emoji: "⚫", power: 89 },
        { name: "Arsenal", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", emoji: "🔴", power: 89 }
    ],
    epl: [
        { name: "Arsenal", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", emoji: "🔴", power: 89 },
        { name: "Manchester City", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", emoji: "🔵", power: 93 },
        { name: "Liverpool", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", emoji: "🔴", power: 90 },
        { name: "Chelsea", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", emoji: "🔵", power: 84 },
        { name: "Manchester United", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", emoji: "🔴", power: 82 },
        { name: "Aston Villa", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", emoji: "🦁", power: 83 },
        { name: "Tottenham Hotspur", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", emoji: "⚪", power: 83 }
    ],
    laliga: [
        { name: "Real Madrid", flag: "🇪🇸", emoji: "⚪", power: 92 },
        { name: "Barcelona", flag: "🇪🇸", emoji: "🔵", power: 90 },
        { name: "Atletico Madrid", flag: "🇪🇸", emoji: "🔴", power: 87 },
        { name: "Athletic Bilbao", flag: "🇪🇸", emoji: "🔴", power: 82 },
        { name: "Real Sociedad", flag: "🇪🇸", emoji: "🔵", power: 81 },
        { name: "Villarreal", flag: "🇪🇸", emoji: "🟡", power: 80 }
    ],
    seriea: [
        { name: "Inter Milan", flag: "🇮🇹", emoji: "⚫", power: 89 },
        { name: "AC Milan", flag: "🇮🇹", emoji: "🔴", power: 85 },
        { name: "Juventus", flag: "🇮🇹", emoji: "⚪", power: 86 },
        { name: "Atalanta", flag: "🇮🇹", emoji: "🔵", power: 84 },
        { name: "AS Roma", flag: "🇮🇹", emoji: "🟡", power: 82 },
        { name: "Napoli", flag: "🇮🇹", emoji: "🔵", power: 85 }
    ],
    bundesliga: [
        { name: "Bayer Leverkusen", flag: "🇩🇪", emoji: "🔴", power: 90 },
        { name: "Bayern Munchen", flag: "🇩🇪", emoji: "🔴", power: 90 },
        { name: "Borussia Dortmund", flag: "🇩🇪", emoji: "🟡", power: 86 },
        { name: "RB Leipzig", flag: "🇩🇪", emoji: "🔴", power: 85 },
        { name: "VfB Stuttgart", flag: "🇩🇪", emoji: "⚪", power: 83 },
        { name: "Eintracht Frankfurt", flag: "🇩🇪", emoji: "🦅", power: 81 }
    ]
};

const MATCH_COMMENTARY = [
    { minute: "12'", text: "Tendangan bebas melengkung tipis di samping tiang gawang!" },
    { minute: "24'", text: "Serangan balik cepat menusuk pertahanan lawan!" },
    { minute: "38'", text: "Penyelamatan akrobatik fantastis dari sang kiper!" },
    { minute: "53'", text: "Sundulan tajam membentur mistar gawang!" },
    { minute: "68'", text: "Tekel bersih di kotak penalti menyelamatkan situasi genting!" },
    { minute: "79'", text: "Kemelut di mulut gawang, pertahanan berjibaku membuang bola!" },
    { minute: "89'", text: "Tendangan voli spekulatif dari luar kotak penalti!" }
];

export class ParlayEngine {
    constructor(onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;
        this.selectedLegs = []; // Array of { matchId, market, pick, label, odds }
        this.activeLeagueFilter = 'all';
        this.isSimulating = false;
        this.simLegStates = [];
        this.simResult = null; // 'win' | 'lose' | null
        this.simWinAmount = 0;
        this.simBetAmount = 0;
        this.simCurrentMinute = 0;
        this.simFeed = [];
        this.matches = [];
        this.generateFixtureList();
    }

    generateFixtureList() {
        this.matches = [];
        const allLeagueKeys = ['ucl', 'epl', 'laliga', 'seriea', 'bundesliga'];

        allLeagueKeys.forEach(leagueKey => {
            const leagueMeta = LEAGUES.find(l => l.id === leagueKey);
            const clubs = [...CLUBS_BY_LEAGUE[leagueKey]].sort(() => 0.5 - Math.random());
            
            // Pick pairs
            for (let i = 0; i < Math.floor(clubs.length / 2); i++) {
                const home = clubs[i * 2];
                const away = clubs[i * 2 + 1];

                const powerDiff = home.power - away.power;
                
                // Realistic odds based on power difference
                let homeOdds = Math.max(1.30, parseFloat((2.20 - powerDiff * 0.08 + (Math.random() * 0.2 - 0.1)).toFixed(2)));
                let drawOdds = parseFloat((3.10 + Math.random() * 0.50).toFixed(2));
                let awayOdds = Math.max(1.40, parseFloat((2.50 + powerDiff * 0.08 + (Math.random() * 0.2 - 0.1)).toFixed(2)));

                // Over / Under 2.5 Goals
                const overOdds = parseFloat((1.70 + Math.random() * 0.35).toFixed(2));
                const underOdds = parseFloat((1.80 + Math.random() * 0.35).toFixed(2));

                // Both Teams To Score (BTTS)
                const bttsYesOdds = parseFloat((1.75 + Math.random() * 0.30).toFixed(2));
                const bttsNoOdds = parseFloat((1.85 + Math.random() * 0.30).toFixed(2));

                this.matches.push({
                    id: `fix_${leagueKey}_${i}_${Date.now()}`,
                    leagueId: leagueKey,
                    leagueName: leagueMeta.name,
                    leagueEmoji: leagueMeta.emoji,
                    home: home,
                    away: away,
                    odds: {
                        home: homeOdds,
                        draw: drawOdds,
                        away: awayOdds,
                        over: overOdds,
                        under: underOdds,
                        bttsYes: bttsYesOdds,
                        bttsNo: bttsNoOdds
                    }
                });
            }
        });
    }

    getRateStatusHTML() {
        const plays = gameState.get('casino.ratePlays') || 0;
        return renderParlayRateStatusHTML(plays);
    }

    calculateTotalMultiplier() {
        if (this.selectedLegs.length === 0) return 0.0;
        // True Parlay: Product of all leg odds
        const total = this.selectedLegs.reduce((acc, leg) => acc * leg.odds, 1.0);
        return parseFloat(total.toFixed(2));
    }

    isLegSelected(matchId, market, pick) {
        return this.selectedLegs.some(l => l.matchId === matchId && l.market === market && l.pick === pick);
    }

    addOrToggleLeg(matchId, market, pick, label, odds) {
        // Find existing bet for the same match (can only bet 1 market per match in standard parlay)
        const existingIdx = this.selectedLegs.findIndex(l => l.matchId === matchId);
        
        if (existingIdx !== -1) {
            const existing = this.selectedLegs[existingIdx];
            if (existing.market === market && existing.pick === pick) {
                // Deselect
                this.selectedLegs.splice(existingIdx, 1);
                return;
            } else {
                // Replace market pick for same match
                this.selectedLegs.splice(existingIdx, 1);
            }
        }

        if (this.selectedLegs.length >= 6) {
            ui.toast({ type: 'warning', title: 'Limit Parlay', message: 'Maksimal 6 pertandingan per tiket Parlay!' });
            return;
        }

        this.selectedLegs.push({
            id: `${matchId}_${market}_${pick}`,
            matchId,
            market,
            pick,
            label,
            odds
        });
    }

    getHTML() {
        const totalMultiplier = this.calculateTotalMultiplier();
        const betInput = typeof document !== 'undefined' ? document.getElementById('parlay-bet-input') : null;
        const currentBet = betInput?.getNumericValue ? betInput.getNumericValue() : (parseInt(betInput?.value?.replace(/,/g, '') || '100000', 10));
        const estPayout = Math.round(currentBet * totalMultiplier);

        return renderParlayHTML({
            leagues: LEAGUES,
            activeLeagueFilter: this.activeLeagueFilter,
            matches: this.matches,
            selectedLegs: this.selectedLegs,
            totalMultiplier,
            estPayout,
            isSimulating: this.isSimulating,
            simLegStates: this.simLegStates,
            simCurrentMinute: this.simCurrentMinute,
            rateStatusHTML: this.getRateStatusHTML(),
            broadcastLegsHTML: this.renderBroadcastLegs(),
            broadcastSummaryHTML: this.renderBroadcastSummary(),
            isLegSelectedFn: (matchId, market, pick) => this.isLegSelected(matchId, market, pick)
        });
    }

    renderBroadcastLegs() {
        return renderBroadcastLegsHTML(this.simLegStates, this.matches);
    }

    renderBroadcastSummary() {
        return renderBroadcastSummaryHTML({
            simResult: this.simResult,
            simLegCount: this.simLegStates.length,
            simWinAmount: this.simWinAmount,
            simBetAmount: this.simBetAmount
        });
    }

    bindEvents(container, onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;

        const betInput = document.getElementById('parlay-bet-input');
        if (betInput) {
            import('../ui/UIManager.js').then(m => {
                m.default.setupNumericInput(betInput);
                betInput.addEventListener('input', () => {
                    this.updateSummaryValues();
                });
            });
        }

        // League filter click
        container.querySelectorAll('.league-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isSimulating) return;
                this.activeLeagueFilter = btn.dataset.leagueId;
                this.refreshUI(container);
            });
        });

        // Refresh fixtures
        container.querySelector('#btn-refresh-fixtures')?.addEventListener('click', () => {
            if (this.isSimulating) return;
            import('../ui/AuraSound.js').then(m => m.default.playTap());
            this.generateFixtureList();
            this.selectedLegs = [];
            this.refreshUI(container);
            ui.info('Jadwal pertandingan liga Eropa diperbarui!', '⚽ Jadwal Baru');
        });

        // Preset chips
        container.querySelectorAll('.parlay-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isSimulating) return;
                import('../ui/AuraSound.js').then(m => m.default.playTap());
                const balance = gameState.getBalance();
                const input = document.getElementById('parlay-bet-input');
                if (!input) return;
                if (btn.id === 'btn-parlay-max') {
                    input.value = balance.toLocaleString('en-US');
                } else {
                    input.value = parseInt(btn.dataset.val).toLocaleString('en-US');
                }
                input.dispatchEvent(new Event('input'));
            });
        });

        // Odds pill buttons selection
        container.querySelectorAll('.odds-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isSimulating) return;
                import('../ui/AuraSound.js').then(m => m.default.playClick());
                const matchId = btn.dataset.matchId;
                const market = btn.dataset.market;
                const pick = btn.dataset.pick;
                const odds = parseFloat(btn.dataset.odds);
                const label = `${market.toUpperCase()} - ${pick.toUpperCase()}`;

                this.addOrToggleLeg(matchId, market, pick, label, odds);
                this.refreshUI(container);
            });
        });

        // Remove leg
        container.querySelectorAll('.btn-remove-leg').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isSimulating) return;
                import('../ui/AuraSound.js').then(m => m.default.playTap());
                const idx = parseInt(btn.dataset.legIndex, 10);
                this.selectedLegs.splice(idx, 1);
                this.refreshUI(container);
            });
        });

        // Submit parlay
        container.querySelector('#btn-parlay-submit')?.addEventListener('click', () => {
            this.startMatchdaySimulation();
        });
    }

    updateSummaryValues() {
        const betInput = document.getElementById('parlay-bet-input');
        const currentBet = betInput?.getNumericValue ? betInput.getNumericValue() : (parseInt(betInput?.value.replace(/,/g, '') || '0', 10));
        const totalMult = this.calculateTotalMultiplier();
        const estPayout = Math.round(currentBet * totalMult);

        const estEl = document.getElementById('parlay-est-payout-val');
        if (estEl) estEl.textContent = '$ ' + estPayout.toLocaleString();
    }

    refreshUI(container) {
        const activeInputVal = document.getElementById('parlay-bet-input')?.value || '100,000';
        container.innerHTML = this.getHTML();
        this.bindEvents(container, this.onBalanceRefresh);
        const newInput = document.getElementById('parlay-bet-input');
        if (newInput) newInput.value = activeInputVal;
    }

    refreshSimulationConsole() {
        const clockEl = document.getElementById('broadcast-match-clock');
        const gridEl = document.getElementById('broadcast-scoreboard-grid');
        const summaryEl = document.getElementById('broadcast-summary-banner');
        const commentaryEl = document.getElementById('broadcast-live-commentary');

        if (clockEl) clockEl.textContent = `⏱️ MENIT: ${this.simCurrentMinute}'`;
        if (gridEl) gridEl.innerHTML = this.renderBroadcastLegs();
        if (summaryEl) summaryEl.innerHTML = this.renderBroadcastSummary();
        if (commentaryEl && this.simFeed.length > 0) {
            commentaryEl.textContent = this.simFeed[this.simFeed.length - 1];
        }
    }

    async startMatchdaySimulation() {
        if (this.isSimulating) return;
        if (this.selectedLegs.length < 2) {
            ui.error('Pilih minimal 2 taruhan untuk membuat tiket Parlay!');
            return;
        }

        const input = document.getElementById('parlay-bet-input');
        const betAmount = input?.getNumericValue ? input.getNumericValue() : (parseInt(input?.value.replace(/,/g, '') || '0', 10));

        if (betAmount <= 0) { ui.error('Masukkan jumlah taruhan yang valid!'); return; }
        const balance = gameState.getBalance();
        if (betAmount > balance) { ui.error('Saldo kas Anda tidak mencukupi!'); return; }

        this.isSimulating = true;
        this.simResult = null;
        this.simWinAmount = 0;
        this.simBetAmount = betAmount;
        this.simCurrentMinute = 0;
        this.simFeed = ['Wasit meniup peluit kickoff tanda dimulainya matchday!'];

        // Deduct bet
        financeManager.addExpense(betAmount, 'Lainnya', `Taruhan Parlay Sepak Bola (${this.selectedLegs.length} Leg)`);
        this.onBalanceRefresh?.();

        // Read accumulated luck & rate status from loss pity engine
        const luckInfo = casinoVolatility.getLuckInfo();
        const rateOn = luckInfo.isRateOn;

        // Initialize state for each leg
        this.simLegStates = this.selectedLegs.map(leg => {
            const match = this.matches.find(m => m.id === leg.matchId);
            let marketLabel = '';
            if (leg.market === '1x2') {
                marketLabel = leg.pick === 'home' ? `Menang ${match?.home.name}` : (leg.pick === 'away' ? `Menang ${match?.away.name}` : 'Seri');
            } else if (leg.market === 'ou') {
                marketLabel = leg.pick === 'over' ? '> 2.5 Gol' : '< 2.5 Gol';
            } else if (leg.market === 'btts') {
                marketLabel = leg.pick === 'yes' ? 'Kedua Gol (Ya)' : 'Kedua Gol (Tidak)';
            }

            return {
                ...leg,
                marketLabel,
                status: 'live',
                homeScore: 0,
                awayScore: 0,
                currentScore: '0 - 0'
            };
        });

        // Reveal simulation arena
        const arena = document.getElementById('parlay-broadcast-arena');
        if (arena) arena.style.display = 'block';
        this.refreshSimulationConsole();

        import('../ui/AuraSound.js').then(m => m.default.playCasinoSpin());

        // Simulation minute milestones
        const minuteMilestones = [15, 30, 45, 65, 80, 90];

        for (const targetMin of minuteMilestones) {
            await new Promise(r => setTimeout(r, 700));
            this.simCurrentMinute = targetMin;

            // Generate goal chances or events
            this.simLegStates.forEach(leg => {
                const rollGoal = Math.random();

                if (rateOn && Math.random() < 0.35) {
                    // Favor user prediction during Rate On
                    if (leg.market === '1x2' && leg.pick === 'home' && leg.homeScore <= leg.awayScore) {
                        leg.homeScore++;
                    } else if (leg.market === '1x2' && leg.pick === 'away' && leg.awayScore <= leg.homeScore) {
                        leg.awayScore++;
                    } else if (leg.market === 'ou' && leg.pick === 'over') {
                        leg.homeScore++;
                    }
                } else if (rollGoal < 0.35) {
                    // Random goal event
                    if (Math.random() < 0.55) {
                        leg.homeScore++;
                    } else {
                        leg.awayScore++;
                    }
                }

                leg.currentScore = `${leg.homeScore} - ${leg.awayScore}`;
            });

            // Random commentary
            const comment = MATCH_COMMENTARY[Math.floor(Math.random() * MATCH_COMMENTARY.length)];
            this.simFeed.push(`${this.simCurrentMinute}' - ${comment.text}`);

            this.refreshSimulationConsole();
        }

        // Full Time Evaluation
        let allWon = true;

        this.simLegStates.forEach(leg => {
            let isLegWon = false;
            const totalGoals = leg.homeScore + leg.awayScore;

            if (leg.market === '1x2') {
                if (leg.homeScore > leg.awayScore && leg.pick === 'home') isLegWon = true;
                else if (leg.awayScore > leg.homeScore && leg.pick === 'away') isLegWon = true;
                else if (leg.homeScore === leg.awayScore && leg.pick === 'draw') isLegWon = true;
            } else if (leg.market === 'ou') {
                if (totalGoals > 2 && leg.pick === 'over') isLegWon = true;
                if (totalGoals < 3 && leg.pick === 'under') isLegWon = true;
            } else if (leg.market === 'btts') {
                const bothScored = leg.homeScore > 0 && leg.awayScore > 0;
                if (bothScored && leg.pick === 'yes') isLegWon = true;
                if (!bothScored && leg.pick === 'no') isLegWon = true;
            }

            // Rate On guarantee boost
            if (rateOn && Math.random() < 0.65) {
                isLegWon = true;
            }

            leg.status = isLegWon ? 'won' : 'lost';
            if (!isLegWon) allWon = false;
        });

        const totalMultiplier = this.calculateTotalMultiplier();

        if (allWon) {
            this.simResult = 'win';
            this.simWinAmount = Math.round(betAmount * totalMultiplier);
            financeManager.addIncome(this.simWinAmount, 'Investasi', `Tiket Parlay Sepak Bola (${this.selectedLegs.length} Leg) Tembus!`);
            this.onBalanceRefresh?.();

            casinoVolatility.recordBigWin();
            pixiEffects.celebrateWin({
                amount: this.simWinAmount,
                type: this.selectedLegs.length >= 4 ? 'jackpot' : 'mega',
                onComplete: () => this.onBalanceRefresh?.()
            });

            import('../ui/AuraSound.js').then(m => m.default.playCasinoWin());
            ui.success(`PARLAY TEMBUS! Menang +${financeManager.formatCurrency(this.simWinAmount)} TC (${totalMultiplier.toFixed(2)}x)!`, '🏆 Parlay Win');
        } else {
            this.simResult = 'lose';
            casinoVolatility.recordLoss();
            import('../ui/AuraSound.js').then(m => m.default.playCasinoLose());
            ui.toast({ type: 'warning', title: 'Parlay Kalah', message: 'Tiket gagal karena ada pertandingan yang meleset.' });
        }

        // Refresh rate badges
        const badgeWrap = document.querySelector('.parlay-header .rate-badge-wrap');
        if (badgeWrap) badgeWrap.innerHTML = this.getRateStatusHTML();
        const headerRate = document.getElementById('header-rate-badge-container');
        if (headerRate) headerRate.innerHTML = this.getRateStatusHTML();

        this.isSimulating = false;
        this.refreshSimulationConsole();

        // Clear slip selections
        this.selectedLegs = [];

        // Regenerate fixtures for next round
        this.generateFixtureList();

        const root = document.getElementById('casino-game-panel');
        if (root) {
            this.refreshUI(root);
            const arenaAgain = document.getElementById('parlay-broadcast-arena');
            if (arenaAgain) arenaAgain.style.display = 'block';
        }
    }
}
