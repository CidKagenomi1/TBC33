/**
 * ParlayEngine.js - Parlay Bet Casino Engine
 * Allows players to chain multiple bets (Football, Horse Racing, Random Bets) 
 * into a single high-yielding parlay card.
 * Integrates 100 real European football clubs dynamically.
 */

import financeManager from '../finance/FinanceManager.js';
import gameState from '../core/GameState.js';
import ui from '../ui/UIManager.js';
import pixiEffects from '../graphics/PixiEffects.js';

const CLUBS = [
    { name: "Manchester United", country: "Inggris", emoji: "🔴" },
    { name: "Manchester City", country: "Inggris", emoji: "🔵" },
    { name: "Arsenal", country: "Inggris", emoji: "🔴" },
    { name: "Liverpool", country: "Inggris", emoji: "🔴" },
    { name: "Aston Villa", country: "Inggris", emoji: "🦁" },
    { name: "Chelsea", country: "Inggris", emoji: "🔵" },
    { name: "Tottenham Hotspur", country: "Inggris", emoji: "⚪" },
    { name: "Newcastle United", country: "Inggris", emoji: "⚫" },
    { name: "West Ham United", country: "Inggris", emoji: "⚒️" },
    { name: "Brighton & Hove Albion", country: "Inggris", emoji: "🔵" },
    { name: "Real Madrid", country: "Spanyol", emoji: "⚪" },
    { name: "Barcelona", country: "Spanyol", emoji: "🔵" },
    { name: "Atletico Madrid", country: "Spanyol", emoji: "🔴" },
    { name: "Girona", country: "Spanyol", emoji: "🔴" },
    { name: "Athletic Bilbao", country: "Spanyol", emoji: "🔴" },
    { name: "Real Sociedad", country: "Spanyol", emoji: "🔵" },
    { name: "Real Betis", country: "Spanyol", emoji: "🟢" },
    { name: "Sevilla", country: "Spanyol", emoji: "⚪" },
    { name: "Villarreal", country: "Spanyol", emoji: "🟡" },
    { name: "Valencia", country: "Spanyol", emoji: "🦇" },
    { name: "Inter Milan", country: "Italia", emoji: "🔵" },
    { name: "AC Milan", country: "Italia", emoji: "🔴" },
    { name: "Juventus", country: "Italia", emoji: "⚪" },
    { name: "Atalanta", country: "Italia", emoji: "🔵" },
    { name: "Bologna", country: "Italia", emoji: "🔴" },
    { name: "AS Roma", country: "Italia", emoji: "🟡" },
    { name: "Lazio", country: "Italia", emoji: "🦅" },
    { name: "Napoli", country: "Italia", emoji: "🔵" },
    { name: "Fiorentina", country: "Italia", emoji: "🟣" },
    { name: "Torino", country: "Italia", emoji: "🐂" },
    { name: "Bayer Leverkusen", country: "Jerman", emoji: "🔴" },
    { name: "Bayern Munchen", country: "Jerman", emoji: "🔴" },
    { name: "VfB Stuttgart", country: "Jerman", emoji: "⚪" },
    { name: "RB Leipzig", country: "Jerman", emoji: "🔴" },
    { name: "Borussia Dortmund", country: "Jerman", emoji: "🟡" },
    { name: "Eintracht Frankfurt", country: "Jerman", emoji: "🦅" },
    { name: "Hoffenheim", country: "Jerman", emoji: "🔵" },
    { name: "Freiburg", country: "Jerman", emoji: "🔴" },
    { name: "Werder Bremen", country: "Jerman", emoji: "🟢" },
    { name: "Heidenheim", country: "Jerman", emoji: "🔴" },
    { name: "Paris Saint-Germain", country: "Prancis", emoji: "🔵" },
    { name: "AS Monaco", country: "Prancis", emoji: "🔴" },
    { name: "Lille", country: "Prancis", emoji: "🔴" },
    { name: "Brest", country: "Prancis", emoji: "🔴" },
    { name: "Nice", country: "Prancis", emoji: "🔴" },
    { name: "Lyon", country: "Prancis", emoji: "🔵" },
    { name: "Lens", country: "Prancis", emoji: "🟡" },
    { name: "Marseille", country: "Prancis", emoji: "🔵" },
    { name: "Rennes", country: "Prancis", emoji: "🔴" },
    { name: "Reims", country: "Prancis", emoji: "🔴" },
    { name: "PSV Eindhoven", country: "Belanda", emoji: "🔴" },
    { name: "Feyenoord", country: "Belanda", emoji: "🔴" },
    { name: "Twente", country: "Belanda", emoji: "🔴" },
    { name: "AZ Alkmaar", country: "Belanda", emoji: "🔴" },
    { name: "Ajax Amsterdam", country: "Belanda", emoji: "⚪" },
    { name: "Utrecht", country: "Belanda", emoji: "🔴" },
    { name: "Go Ahead Eagles", country: "Belanda", emoji: "🔴" },
    { name: "Sparta Rotterdam", country: "Belanda", emoji: "🔴" },
    { name: "Sporting Lisbon", country: "Portugal", emoji: "🟢" },
    { name: "Benfica", country: "Portugal", emoji: "🔴" },
    { name: "FC Porto", country: "Portugal", emoji: "🔵" },
    { name: "Braga", country: "Portugal", emoji: "🔴" },
    { name: "Vitoria de Guimaraes", country: "Portugal", emoji: "⚪" },
    { name: "Moreirense", country: "Portugal", emoji: "🟢" },
    { name: "Club Brugge", country: "Belgia", emoji: "🔵" },
    { name: "Union Saint-Gilloise", country: "Belgia", emoji: "🟡" },
    { name: "Anderlecht", country: "Belgia", emoji: "🟣" },
    { name: "Genk", country: "Belgia", emoji: "🔵" },
    { name: "Antwerp", country: "Belgia", emoji: "🔴" },
    { name: "Cercle Brugge", country: "Belgia", emoji: "🟢" },
    { name: "Galatasaray", country: "Turki", emoji: "🟡" },
    { name: "Fenerbahce", country: "Turki", emoji: "🟡" },
    { name: "Trabzonspor", country: "Turki", emoji: "🔵" },
    { name: "Besiktas", country: "Turki", emoji: "🦅" },
    { name: "Istanbul Basaksehir", country: "Turki", emoji: "🟠" },
    { name: "Celtic", country: "Skotlandia", emoji: "🟢" },
    { name: "Rangers", country: "Skotlandia", emoji: "🔵" },
    { name: "Red Bull Salzburg", country: "Austria", emoji: "🔴" },
    { name: "Sturm Graz", country: "Austria", emoji: "⚫" },
    { name: "Young Boys", country: "Swiss", emoji: "🟡" },
    { name: "Servette", country: "Swiss", emoji: "🔴" },
    { name: "Sparta Praha", country: "Ceko", emoji: "🔴" },
    { name: "Slavia Praha", country: "Ceko", emoji: "🔴" },
    { name: "Viktoria Plzen", country: "Ceko", emoji: "🔴" },
    { name: "PAOK", country: "Yunani", emoji: "⚫" },
    { name: "AEK Athena", country: "Yunani", emoji: "🟡" },
    { name: "Olympiacos", country: "Yunani", emoji: "🔴" },
    { name: "Panathinaikos", country: "Yunani", emoji: "🟢" },
    { name: "FC Copenhagen", country: "Danmark", emoji: "⚪" },
    { name: "Midtjylland", country: "Danmark", emoji: "🔴" },
    { name: "Brondby", country: "Danmark", emoji: "🟡" },
    { name: "Bodø/Glimt", country: "Norwegia", emoji: "🟡" },
    { name: "Molde", country: "Norwegia", emoji: "🔵" },
    { name: "Malmo FF", country: "Swedia", emoji: "🔵" },
    { name: "Shakhtar Donetsk", country: "Ukraina", emoji: "🟠" },
    { name: "Dynamo Kyiv", country: "Ukraina", emoji: "🔵" },
    { name: "Dinamo Zagreb", country: "Kroasia", emoji: "🔵" },
    { name: "Rijeka", country: "Kroasia", emoji: "🔵" },
    { name: "Red Star Belgrade", country: "Serbia", emoji: "🔴" },
    { name: "Partizan Belgrade", country: "Serbia", emoji: "⚫" }
];

const HORSES = [
    { name: '🐎 Red Fury', odds: 2.5, winChance: 0.35, color: '#ef4444' },
    { name: '🐎 Thunder', odds: 4.5, winChance: 0.20, color: '#3b82f6' },
    { name: '🐎 Wind Runner', odds: 6.0, winChance: 0.15, color: '#10b981' },
    { name: '🐎 Star Gold', odds: 10.0, winChance: 0.09, color: '#fbbf24' },
    { name: '🐎 Slow Jack', odds: 18.0, winChance: 0.05, color: '#6b7280' }
];

export class ParlayEngine {
    constructor(onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;
        this.selectedLegs = []; // Array of { id, type, label, prediction, odds }
        this.isSimulating = false;
        this.simLegStates = [];
        this.simResult = null; // 'win' | 'lose' | null
        this.simWinAmount = 0;
        this.simBetAmount = 0;
        this.matches = [];
        this.generateMatches();
    }

    generateMatches() {
        this.matches = [];
        const shuffled = [...CLUBS].sort(() => 0.5 - Math.random());
        for (let i = 0; i < 3; i++) {
            const home = shuffled[i * 2];
            const away = shuffled[i * 2 + 1];
            
            const homeOdds = parseFloat((Math.random() * 1.3 + 1.5).toFixed(2));
            const drawOdds = parseFloat((Math.random() * 0.8 + 2.8).toFixed(2));
            const awayOdds = parseFloat((Math.random() * 1.4 + 1.7).toFixed(2));

            this.matches.push({
                id: `fb_${i}_${Date.now()}`,
                home: `${home.emoji} ${home.name} (${home.country})`,
                away: `${away.emoji} ${away.name} (${away.country})`,
                odds: { home: homeOdds, draw: drawOdds, away: awayOdds }
            });
        }
    }

    getRateStatusHTML() {
        const plays = gameState.get('casino.ratePlays') || 0;
        const rateOn = plays >= 250;
        return rateOn 
            ? `<div class="rate-badge rate-on-badge" style="display:inline-flex; align-items:center; gap:0.25rem; background:linear-gradient(135deg,#ef4444,#fbbf24); color:#fff; font-weight:900; font-size:0.75rem; padding:0.25rem 0.6rem; border-radius:999px; box-shadow:0 0 10px rgba(239,68,68,0.5); animation: rateGlow 1s ease-in-out infinite alternate; text-transform:uppercase; letter-spacing:0.05em; margin-bottom: 0.5rem; border: 1.5px solid #fff;">⚡ RATE ON (JACKPOT UP!)</div>`
            : `<div class="rate-badge rate-off-badge" style="display:inline-flex; align-items:center; gap:0.25rem; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.6); font-weight:800; font-size:0.7rem; padding:0.2rem 0.5rem; border-radius:999px; text-transform:uppercase; letter-spacing:0.05em; margin-bottom: 0.5rem;">Rate: OFF (${plays}/250 Spins)</div>`;
    }

    renderScoreboardRows() {
        if (!this.simLegStates || this.simLegStates.length === 0) return '';
        return this.simLegStates.map((leg, index) => {
            let statusIcon = '⏳';
            let statusText = 'MENUNGGU';
            let statusColor = 'rgba(255,255,255,0.3)';
            
            if (leg.status === 'simulating') {
                statusIcon = '🔄';
                statusText = 'LIVE';
                statusColor = '#fbbf24';
            } else if (leg.status === 'won') {
                statusIcon = '🟢';
                statusText = 'TEMBUS';
                statusColor = '#10b981';
            } else if (leg.status === 'lost') {
                statusIcon = '🔴';
                statusText = 'GAGAL';
                statusColor = '#ef4444';
            }

            return `
                <div style="display:flex; flex-direction:column; background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.05); padding:0.75rem; border-radius:8px; gap:0.25rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.65rem; color:#a855f7; font-weight:800; text-transform:uppercase;">LEG ${index + 1} - ${leg.type.toUpperCase()}</span>
                        <div style="display:flex; align-items:center; gap:0.25rem; font-size:0.65rem; font-weight:900; color:${statusColor}; background:rgba(0,0,0,0.3); padding:2px 8px; border-radius:4px;">
                            <span>${statusIcon}</span>
                            <span>${statusText}</span>
                        </div>
                    </div>
                    <div style="font-size:0.85rem; font-weight:800; color:#fff;">${leg.label}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                        <span style="font-size:0.72rem; color:rgba(255,255,255,0.5);">Pilihan: <strong style="color:#fbbf24;">${leg.prediction.toUpperCase()}</strong> (${leg.odds.toFixed(2)}x)</span>
                        <span style="font-family:monospace; color:#fff; font-weight:900; font-size:0.95rem;">${leg.details}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderSimulationSummary() {
        if (this.simResult === null) {
            return `
                <div style="display:flex; align-items:center; justify-content:center; gap:0.5rem; margin-top:0.75rem; color:#fbbf24; font-size:0.8rem; font-weight:800; background:rgba(251,191,36,0.08); padding:0.6rem; border-radius:6px; border:1px solid rgba(251,191,36,0.15);">
                    <div class="spinner" style="border: 2px solid rgba(255,255,255,0.1); border-top: 2px solid #fbbf24; border-radius: 50%; width: 14px; height: 14px; animation: spin 1s linear infinite;"></div>
                    <span>Simulasi pertandingan sedang berjalan...</span>
                </div>
            `;
        }

        if (this.simResult === 'win') {
            return `
                <div style="margin-top:0.75rem; text-align:center; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.25); padding:1rem; border-radius:8px; animation: popIn 0.3s ease-out;">
                    <div style="font-size:1.5rem; margin-bottom:0.25rem;">🎉</div>
                    <h4 style="margin:0; font-size:1.1rem; font-weight:900; color:#10b981;">HASIL MULTI-BET</h4>
                    <p style="margin:4px 0 0 0; font-size:0.8rem; color:rgba(255,255,255,0.7);">
                        Anda memenangkan hadiah sebesar <strong style="color:#fbbf24; font-size:0.95rem;">+$ ${this.simWinAmount.toLocaleString()}</strong>!
                    </p>
                </div>
            `;
        }

        return `
            <div style="margin-top:0.75rem; text-align:center; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); padding:1rem; border-radius:8px; animation: popIn 0.3s ease-out;">
                <div style="font-size:1.5rem; margin-bottom:0.25rem;">💥</div>
                <h4 style="margin:0; font-size:1.1rem; font-weight:900; color:#ef4444;">TARUHAN GAGAL TOTAL</h4>
                <p style="margin:4px 0 0 0; font-size:0.8rem; color:rgba(255,255,255,0.7);">
                    Tidak ada satupun tebakan yang tembus. Taruhan <span style="color:#fff;">$ ${this.simBetAmount.toLocaleString()}</span> hangus.
                </p>
            </div>
        `;
    }

    getHTML() {
        const totalMultiplier = this.calculateTotalMultiplier();

        // Render Football Match Cards
        let footballHTML = '';
        this.matches.forEach(match => {
            const isHomeSelected = this.isLegSelected(match.id, 'home');
            const isDrawSelected = this.isLegSelected(match.id, 'draw');
            const isAwaySelected = this.isLegSelected(match.id, 'away');

            footballHTML += `
                <div class="parlay-card-item" style="min-width:0;">
                    <div style="font-weight: 800; font-size: 0.82rem; color:#fff; margin-bottom:0.5rem; text-align:left; line-height:1.2; word-wrap: break-word;">
                        ⚽ Match: ${match.home} vs ${match.away}
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:0.35rem;">
                        <button class="parlay-bet-btn ${isHomeSelected ? 'active' : ''}" data-match-id="${match.id}" data-pick="home" data-odds="${match.odds.home}">
                            1 (Home)<br><span style="color:#fbbf24; font-weight:800;">${match.odds.home.toFixed(2)}x</span>
                        </button>
                        <button class="parlay-bet-btn ${isDrawSelected ? 'active' : ''}" data-match-id="${match.id}" data-pick="draw" data-odds="${match.odds.draw}">
                            X (Draw)<br><span style="color:#fbbf24; font-weight:800;">${match.odds.draw.toFixed(2)}x</span>
                        </button>
                        <button class="parlay-bet-btn ${isAwaySelected ? 'active' : ''}" data-match-id="${match.id}" data-pick="away" data-odds="${match.odds.away}">
                            2 (Away)<br><span style="color:#fbbf24; font-weight:800;">${match.odds.away.toFixed(2)}x</span>
                        </button>
                    </div>
                </div>
            `;
        });

        // Render Horse Race Cards
        let horseHTML = '';
        HORSES.forEach(horse => {
            const isSelected = this.isLegSelected('baby_derby', horse.name);
            horseHTML += `
                <button class="parlay-bet-btn ${isSelected ? 'active' : ''}" data-horse-name="${horse.name}" data-odds="${horse.odds}" style="text-align:left; display:flex; justify-content:space-between; align-items:center; padding: 0.5rem 0.75rem;">
                    <span>${horse.name}</span>
                    <span style="color:#fbbf24; font-weight:800;">${horse.odds.toFixed(2)}x</span>
                </button>
            `;
        });

        // Render Current Selected Legs list
        let legsListHTML = '';
        if (this.selectedLegs.length === 0) {
            legsListHTML = `
                <div style="color:rgba(255,255,255,0.3); font-size:0.75rem; font-style:italic; padding: 1.5rem 0; text-align:center;">
                    Belum ada taruhan terpilih. Silakan pilih 2-5 leg di bawah.
                </div>
            `;
        } else {
            this.selectedLegs.forEach((leg, index) => {
                legsListHTML += `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:0.4rem 0.6rem; border-radius:8px; font-size:0.75rem; margin-bottom:0.35rem; width:100%; box-sizing:border-box;">
                        <div style="text-align:left; flex: 1; min-width: 0; padding-right: 5px;">
                            <div style="font-weight:800; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${leg.label}</div>
                            <div style="font-size:0.65rem; color:rgba(255,255,255,0.5); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Pilihan: <span style="color:#10b981; font-weight:700;">${leg.prediction.toUpperCase()}</span></div>
                        </div>
                        <div style="display:flex; align-items:center; gap:0.5rem; flex-shrink: 0;">
                            <span style="color:#fbbf24; font-weight:900;">${leg.odds.toFixed(2)}x</span>
                            <button class="btn-remove-leg" data-leg-index="${index}" style="background:transparent; border:none; color:#ef4444; cursor:pointer; font-weight:900; font-size:0.95rem;">×</button>
                        </div>
                    </div>
                `;
            });
        }

        return `
        <div style="width: 100%; max-width: 760px; margin: 0 auto; text-align: center; animation: fade-up 0.3s ease; box-sizing: border-box; overflow-x: hidden;">
            <div style="display:flex; justify-content:center; margin-bottom:0.4rem;">
                <button type="button" class="btn-lobby-pill" title="Buka Menu Game (L)"><span>☰</span> LOBBY / GANTI GAME</button>
            </div>
            <h3 style="font-weight: 950; color: #fff; margin-bottom: 0.35rem; font-size: 1.5rem; letter-spacing: -0.02em;">
                🎰 <span style="background: linear-gradient(90deg,#10b981,#fbbf24); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">PARLAY BET TERMINAL</span>
            </h3>
            <p style="color:rgba(255,255,255,0.4); font-size:0.75rem; margin-bottom:0.75rem; text-transform:uppercase; letter-spacing:0.1em;">Gabungkan Taruhan Bola &amp; Pacuan Kuda Untuk Multiplier Raksasa!</p>
            ${this.getRateStatusHTML()}

            <div class="parlay-grid-layout" style="display:grid; grid-template-columns: 1.3fr 1fr; gap:0.75rem; text-align:left; margin-bottom:0.75rem; width:100%; box-sizing:border-box;">
                
                <!-- Left Column: Bets Selection -->
                <div style="display:flex; flex-direction:column; gap:0.75rem; min-width:0;">
                    
                    <!-- Mega Football Section -->
                    <div class="parlay-section-box">
                        <h4 style="font-size:0.8rem; font-weight:900; color:#10b981; margin:0 0 0.5rem 0; text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid rgba(16,185,129,0.2); padding-bottom:3px;">⚽ MEGA FOOTBALL</h4>
                        ${footballHTML}
                    </div>

                    <!-- Baby Derby Section -->
                    <div class="parlay-section-box">
                        <h4 style="font-size:0.8rem; font-weight:900; color:#fbbf24; margin:0 0 0.5rem 0; text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid rgba(251,191,36,0.2); padding-bottom:3px;">🐎 BABY DERBY (Pacuan Kuda)</h4>
                        <div style="display:flex; flex-direction:column; gap:0.35rem;">
                            ${horseHTML}
                        </div>
                    </div>

                    <!-- Random Mystery Bet Section -->
                    <div class="parlay-section-box" style="text-align:center; padding:0.75rem;">
                        <button id="btn-add-random-bet" class="bet-chip" style="width:100%; border-radius:8px; background: rgba(168,85,247,0.1); border-color: rgba(168,85,247,0.3); color:#c084fc; font-weight:800; font-size:0.8rem; padding: 0.5rem 1rem;">
                            🎲 TAMBAH TARUHAN ACAK (Odds 2x - 90x)
                        </button>
                    </div>

                </div>

                <!-- Right Column: Ticket Info & Simulation Output -->
                <div style="display:flex; flex-direction:column; gap:0.75rem; min-width:0;">
                    
                    <!-- Current Parlay Card Ticket -->
                    <div class="parlay-section-box" style="flex:1; display:flex; flex-direction:column;">
                        <h4 style="font-size:0.8rem; font-weight:900; color:#fff; margin:0 0 0.5rem 0; text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:3px;">🎫 TIKET PARLAY ANDA</h4>
                        
                        <div style="flex:1; overflow-y:auto; overflow-x:hidden; max-height:220px; margin-bottom:0.5rem; width:100%; box-sizing:border-box;">
                            ${legsListHTML}
                        </div>

                        <!-- Ticket Odds & Multiplier summary -->
                        <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:0.5rem;">
                            <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:rgba(255,255,255,0.6); margin-bottom:0.25rem;">
                                <span>Total Legs:</span>
                                <span style="font-weight:800; color:#fff;">${this.selectedLegs.length} Pilihan</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:rgba(255,255,255,0.8); margin-bottom:0.5rem;">
                                <span>Max Potential Win:</span>
                                <span style="font-weight:900; color:#fbbf24; font-size:1rem;">${totalMultiplier.toFixed(2)}x</span>
                            </div>
                        </div>
                    </div>

                    <!-- Bet Input Panel -->
                    <div class="parlay-section-box" style="padding:0.75rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
                            <span style="font-size:0.65rem; color:rgba(255,255,255,0.5); font-weight:700;">TARUHAN</span>
                            <div style="display:flex; align-items:center; gap:0.15rem;">
                                <span style="color:#fbbf24; font-weight:900; font-size:1rem;">$</span>
                                <input type="text" id="parlay-bet-input" value="100,000" style="background:transparent; border:none; font-size:1.1rem; font-weight:900; color:#fff; width:110px; text-align:right; border-bottom:1.5px solid rgba(251,191,36,0.4); outline:none;">
                            </div>
                        </div>
                        <div style="display:flex; gap:0.25rem; justify-content:center; margin-bottom:0.5rem;">
                            <button class="bet-chip parlay-preset" data-val="10000" style="font-size:0.65rem; padding: 2px 6px;">$10K</button>
                            <button class="bet-chip parlay-preset" data-val="100000" style="font-size:0.65rem; padding: 2px 6px;">$100K</button>
                            <button class="bet-chip parlay-preset" data-val="1000000" style="font-size:0.65rem; padding: 2px 6px;">$1M</button>
                            <button class="bet-chip bet-chip-max parlay-preset" id="btn-parlay-max" style="font-size:0.65rem; padding: 2px 6px;">MAX</button>
                        </div>
                        <button id="btn-parlay-submit" class="spin-btn-action" style="font-size:0.95rem; height:38px; border-radius:8px; background:linear-gradient(135deg,#10b981 0%,#059669 100%); box-shadow:0 3px 8px rgba(16,185,129,0.2);" ${this.selectedLegs.length < 2 || this.isSimulating ? 'disabled' : ''}>
                            🚀 MULAI SIMULASI PARLAY
                        </button>
                    </div>

                </div>

            </div>

            <!-- Simulation Scoreboard Area -->
            <div id="parlay-sim-console" class="parlay-sim-box" style="display:${this.isSimulating || this.simLegStates.length > 0 ? 'block' : 'none'}; padding:1.25rem; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); text-align:left;">
                <div style="font-size:0.85rem; color:#fff; text-transform:uppercase; font-weight:900; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:6px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                    <span>📊 PAPAN SKOR SIMULASI LIVE</span>
                    <span style="font-size:0.75rem; color:#a855f7;">Tiket: ${this.simLegStates.length} Leg</span>
                </div>
                <div id="parlay-scoreboard-area" style="display:flex; flex-direction:column; gap:0.65rem;">
                    ${this.renderScoreboardRows()}
                </div>
                <div id="parlay-summary-area">
                    ${this.renderSimulationSummary()}
                </div>
            </div>

        </div>

        <style>
            .parlay-section-box {
                background: rgba(0,0,0,0.25);
                border: 1px solid rgba(255,255,255,0.05);
                border-radius: 12px;
                padding: 0.65rem;
            }
            .parlay-card-item {
                background: rgba(255,255,255,0.02);
                border: 1px solid rgba(255,255,255,0.04);
                padding: 0.5rem;
                border-radius: 8px;
                margin-bottom: 0.4rem;
            }
            .parlay-bet-btn {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                color: rgba(255,255,255,0.7);
                font-size: 0.72rem;
                padding: 0.35rem 0.25rem;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
                font-family: inherit;
            }
            .parlay-bet-btn:hover {
                background: rgba(255,255,255,0.08);
                border-color: rgba(255,255,255,0.2);
            }
            .parlay-bet-btn.active {
                background: rgba(16,185,129,0.15) !important;
                border-color: #10b981 !important;
                color: #10b981 !important;
                box-shadow: 0 0 8px rgba(16,185,129,0.2);
            }
            .parlay-sim-box {
                background: #05070a;
                border: 2px solid #1e293b;
                border-radius: 12px;
                padding: 0.75rem;
                box-shadow: inset 0 0 15px rgba(0,0,0,0.8);
                margin-top: 0.75rem;
            }
            .bet-chip {
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                color: rgba(255,255,255,0.8);
                cursor: pointer;
                transition: all 0.2s;
            }
            .bet-chip:hover {
                background: rgba(16,185,129,0.1);
                border-color: rgba(16,185,129,0.3);
                color: #10b981;
            }
            .bet-chip-max {
                background: rgba(251,191,36,0.1);
                border-color: rgba(251,191,36,0.3);
                color: #fbbf24;
            }
            @keyframes rateGlow {
                from { box-shadow: 0 0 4px rgba(239,68,68,0.4), 0 0 10px rgba(251,191,36,0.2); transform: scale(1); }
                to { box-shadow: 0 0 12px rgba(239,68,68,0.8), 0 0 20px rgba(251,191,36,0.6); transform: scale(1.03); }
            }
            @media (max-width: 600px) {
                .parlay-grid-layout {
                    grid-template-columns: 1fr !important;
                    gap: 0.5rem !important;
                }
                .parlay-section-box {
                    padding: 0.5rem !important;
                }
                .parlay-bet-btn {
                    font-size: 0.65rem !important;
                    padding: 0.25rem 0.15rem !important;
                    word-wrap: break-word;
                    white-space: normal;
                }
                .parlay-card-item {
                    padding: 0.4rem !important;
                }
                #btn-add-random-bet {
                    font-size: 0.72rem !important;
                    padding: 0.4rem 0.75rem !important;
                }
            }
        </style>
        `;
    }

    bindEvents(container, onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;

        const betInput = document.getElementById('parlay-bet-input');
        if (betInput) {
            import('../ui/UIManager.js').then(m => m.default.setupNumericInput(betInput));
        }

        // Preset Chips
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

        // Football selections click
        container.querySelectorAll('[data-match-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isSimulating) return;
                import('../ui/AuraSound.js').then(m => m.default.playClick());
                const matchId = btn.dataset.matchId;
                const pick = btn.dataset.pick;
                const odds = parseFloat(btn.dataset.odds);
                const match = this.matches.find(m => m.id === matchId);
                const label = `⚽ ${match.home} vs ${match.away}`;

                this.addOrToggleLeg(matchId, 'football', label, pick, odds);
                this.refreshUI(container);
            });
        });

        // Horse selections click
        container.querySelectorAll('[data-horse-name]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isSimulating) return;
                import('../ui/AuraSound.js').then(m => m.default.playClick());
                const name = btn.dataset.horseName;
                const odds = parseFloat(btn.dataset.odds);
                const label = `Baby Derby Pacuan Kuda: ${name}`;

                this.addOrToggleLeg('baby_derby', 'horse', label, name, odds);
                this.refreshUI(container);
            });
        });

        // Add Random Bet click
        container.querySelector('#btn-add-random-bet')?.addEventListener('click', () => {
            if (this.isSimulating) return;
            if (this.selectedLegs.length >= 5) {
                ui.toast({ type: 'warning', title: 'Limit Parlay', message: 'Maksimal taruhan parlay adalah 5 leg!' });
                return;
            }
            import('../ui/AuraSound.js').then(m => m.default.playClick());

            // Generate random odds 2x to 90x
            const randomOdds = parseFloat((Math.random() * 88 + 2).toFixed(2));
            const randomId = 'rand_' + Date.now();
            const label = `🎲 Random Mystery Bet`;

            this.selectedLegs.push({
                id: randomId,
                type: 'random',
                label,
                prediction: `odds ${randomOdds}x`,
                odds: randomOdds
            });
            this.refreshUI(container);
        });

        // Remove leg click
        container.querySelectorAll('.btn-remove-leg').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isSimulating) return;
                import('../ui/AuraSound.js').then(m => m.default.playTap());
                const idx = parseInt(btn.dataset.legIndex, 10);
                this.selectedLegs.splice(idx, 1);
                this.refreshUI(container);
            });
        });

        // Start Parlay Bet submit
        container.querySelector('#btn-parlay-submit')?.addEventListener('click', () => {
            this.startSimulation();
        });
    }

    isLegSelected(id, pick) {
        return this.selectedLegs.some(l => l.id === id && l.prediction === pick);
    }

    addOrToggleLeg(id, type, label, prediction, odds) {
        // Remove existing selection for the same game/match if any
        this.selectedLegs = this.selectedLegs.filter(l => l.id !== id);

        if (this.selectedLegs.length >= 5) {
            ui.toast({ type: 'warning', title: 'Limit Parlay', message: 'Maksimal taruhan parlay adalah 5 leg!' });
            return;
        }

        this.selectedLegs.push({ id, type, label, prediction, odds });
    }

    calculateTotalMultiplier() {
        if (this.selectedLegs.length === 0) return 0.0;
        const sumOdds = this.selectedLegs.reduce((sum, leg) => sum + leg.odds, 0.0);
        return sumOdds / this.selectedLegs.length;
    }

    refreshUI(container) {
        container.innerHTML = this.getHTML();
        this.bindEvents(container, this.onBalanceRefresh);
    }

    refreshUIFromSimulation() {
        const scoreboardArea = document.getElementById('parlay-scoreboard-area');
        const summaryArea = document.getElementById('parlay-summary-area');
        if (scoreboardArea && summaryArea) {
            scoreboardArea.innerHTML = this.renderScoreboardRows();
            summaryArea.innerHTML = this.renderSimulationSummary();
        } else {
            const root = document.getElementById('casino-game-panel');
            if (root) {
                root.innerHTML = this.getHTML();
                this.bindEvents(root, this.onBalanceRefresh);
            }
        }
    }

    async startSimulation() {
        if (this.isSimulating) return;
        if (this.selectedLegs.length < 2) {
            ui.error('Pilih minimal 2 taruhan untuk membuat tiket Parlay!');
            return;
        }

        const input = document.getElementById('parlay-bet-input');
        const betAmount = input?.getNumericValue ? input.getNumericValue() : (parseInt(input?.value.replace(/,/g, '') || '0', 10));

        if (betAmount <= 0) { ui.error('Masukkan jumlah taruhan yang valid!'); return; }
        const balance = gameState.getBalance();
        if (betAmount > balance) { ui.error('Saldo tidak mencukupi!'); return; }

        this.isSimulating = true;
        this.simResult = null;
        this.simWinAmount = 0;
        this.simBetAmount = betAmount;

        // Calculate stake per leg
        const stakePerLeg = betAmount / this.selectedLegs.length;

        // Initialize leg states
        this.simLegStates = this.selectedLegs.map(leg => ({
            ...leg,
            status: 'pending',
            details: '- : -'
        }));

        import('../ui/AuraSound.js').then(m => m.default.playCasinoSpin());

        // Deduct bet
        financeManager.addExpense(betAmount, 'Lainnya', 'Taruhan Parlay / Multi-Bet');
        this.onBalanceRefresh?.();

        // Increment rate plays
        let plays = gameState.get('casino.ratePlays') || 0;
        plays++;
        gameState.set('casino.ratePlays', plays);
        const rateOn = plays >= 250;

        // Render simulation container
        this.refreshUIFromSimulation();

        let wonLegsCount = 0;

        for (let i = 0; i < this.simLegStates.length; i++) {
            const leg = this.simLegStates[i];
            leg.status = 'simulating';
            leg.details = 'LIVE';
            this.refreshUIFromSimulation();
            
            await new Promise(r => setTimeout(r, 600));

            let legSuccess = false;

            if (leg.type === 'football') {
                legSuccess = await this.simulateFootballLeg(leg, rateOn);
            } else if (leg.type === 'horse') {
                legSuccess = await this.simulateHorseLeg(leg, rateOn);
            } else {
                legSuccess = await this.simulateRandomLeg(leg, rateOn);
            }

            if (!legSuccess) {
                leg.status = 'lost';
                import('../ui/AuraSound.js').then(m => m.default.playCasinoLose());
                this.refreshUIFromSimulation();
            } else {
                leg.status = 'won';
                wonLegsCount++;
                this.simWinAmount += (stakePerLeg * leg.odds);
                import('../ui/AuraSound.js').then(m => m.default.playClaimMoney());
                this.refreshUIFromSimulation();
            }
        }

        this.isSimulating = false;

        // Process outcomes
        if (this.simWinAmount > 0) {
            this.simWinAmount = Math.round(this.simWinAmount);
            this.simResult = 'win';
            
            financeManager.addIncome(this.simWinAmount, 'Investasi', `Tiket Multi-Bet: ${wonLegsCount}/${this.selectedLegs.length} Tembus`);
            this.onBalanceRefresh?.();

            // Reset Rate plays on win
            gameState.set('casino.ratePlays', 0);
            pixiEffects.celebrateWin({
                amount: this.simWinAmount,
                type: wonLegsCount >= 3 ? 'mega' : 'big',
                onComplete: () => this.onBalanceRefresh?.()
            });
            ui.success(`MULTI-BET SELESAI! ${wonLegsCount} tembus, menang +${financeManager.formatCurrency(this.simWinAmount)} TC!`, '🎰 Win!');
            import('../ui/AuraSound.js').then(m => m.default.playCasinoWin());
        } else {
            this.simResult = 'lose';
            ui.toast({ type: 'warning', title: 'Taruhan Kalah', message: 'Semua taruhan di tiket gagal!' });
            import('../ui/AuraSound.js').then(m => m.default.playCasinoLose());
        }

        // Clean up ticket
        this.selectedLegs = [];

        // Generate new matches for the next round
        this.generateMatches();
        
        const root = document.getElementById('casino-game-panel');
        if (root) {
            this.refreshUI(root);
            // Ensure scoreboard remains visible at the end of simulation
            const consoleBox = document.getElementById('parlay-sim-console');
            if (consoleBox) consoleBox.style.display = 'block';
        }
    }

    async simulateFootballLeg(leg, rateOn) {
        // Match simulation score steps
        const scoreSteps = [
            "10' | 0 - 0",
            "34' | 0 - 0",
            "65' | 0 - 0",
            "88' | 0 - 0"
        ];

        // Determine outcome
        let outcome = 'draw';
        const roll = Math.random();
        
        if (rateOn) {
            if (Math.random() < 0.80) {
                outcome = leg.prediction;
            } else {
                outcome = roll < 0.4 ? 'home' : (roll < 0.7 ? 'away' : 'draw');
            }
        } else {
            outcome = roll < 0.4 ? 'home' : (roll < 0.7 ? 'away' : 'draw');
        }

        let finalScore = '0 - 0';
        if (outcome === 'home') finalScore = '2 - 1';
        else if (outcome === 'away') finalScore = '0 - 1';
        else finalScore = '1 - 1';

        // Animate scoreboard
        for (const step of scoreSteps) {
            await new Promise(r => setTimeout(r, 600));
            leg.details = step;
            this.refreshUIFromSimulation();
        }

        const isWon = outcome === leg.prediction;
        leg.details = `FT | ${finalScore}`;
        return isWon;
    }

    async simulateHorseLeg(leg, rateOn) {
        const steps = [
            '🐎 100m...',
            '🐎 300m...',
            '🐎 500m...',
            '🐎 Garis Finish!'
        ];

        for (const step of steps) {
            await new Promise(r => setTimeout(r, 600));
            leg.details = step;
            this.refreshUIFromSimulation();
        }

        // Determine winner
        let winner = HORSES[0].name;
        
        if (rateOn) {
            if (Math.random() < 0.80) {
                winner = leg.prediction;
            } else {
                const totalChance = HORSES.reduce((sum, h) => sum + h.winChance, 0);
                let roll = Math.random() * totalChance;
                for (const h of HORSES) {
                    if (roll < h.winChance) {
                        winner = h.name;
                        break;
                    }
                    roll -= h.winChance;
                }
            }
        } else {
            const totalChance = HORSES.reduce((sum, h) => sum + h.winChance, 0);
            let roll = Math.random() * totalChance;
            for (const h of HORSES) {
                if (roll < h.winChance) {
                    winner = h.name;
                    break;
                }
                roll -= h.winChance;
            }
        }

        const isWon = winner === leg.prediction;
        leg.details = `Pemenang: ${winner.replace('🐎 ', '')}`;
        return isWon;
    }

    async simulateRandomLeg(leg, rateOn) {
        await new Promise(r => setTimeout(r, 800));

        const winChance = 1.35 / leg.odds; 
        let rolledSuccess = false;

        if (rateOn) {
            rolledSuccess = Math.random() < Math.min(0.85, winChance * 6.0);
        } else {
            rolledSuccess = Math.random() < winChance;
        }

        leg.details = rolledSuccess ? 'Roll: Berhasil!' : 'Roll: Gagal';
        return rolledSuccess;
    }
}

