/**
 * ParlayView.js - HTML Template & View Renderer for ParlayEngine
 * Separates UI markup, dynamic sportsbook fixture cards, betting slip, live broadcast arena, and scoped CSS from game logic.
 */

export function renderParlayRateStatusHTML(plays = 0) {
    const rateOn = plays >= 250;
    return rateOn
        ? `<div class="rate-badge rate-on-badge" style="display:inline-flex; align-items:center; gap:0.35rem; background:linear-gradient(135deg,#ef4444,#fbbf24); color:#fff; font-weight:900; font-size:0.75rem; padding:0.3rem 0.75rem; border-radius:999px; box-shadow:0 0 14px rgba(239,68,68,0.6); animation: rateGlow 1s ease-in-out infinite alternate; text-transform:uppercase; letter-spacing:0.06em; border: 1.5px solid #fff;">⚡ RATE ON (PREDIKSI FAVORIT AKURAT!)</div>`
        : `<div class="rate-badge rate-off-badge" style="display:inline-flex; align-items:center; gap:0.35rem; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); color:rgba(255,255,255,0.65); font-weight:800; font-size:0.72rem; padding:0.25rem 0.6rem; border-radius:999px; text-transform:uppercase; letter-spacing:0.06em;">⚡ RATE: OFF (${plays}/250 SPINS)</div>`;
}

export function renderBroadcastLegsHTML(simLegStates = [], matches = []) {
    if (!simLegStates || simLegStates.length === 0) return '';
    return simLegStates.map(leg => {
        const match = matches.find(m => m.id === leg.matchId);
        let statusBadge = '<span class="broadcast-status-badge status-live">MENUNGGU ⏳</span>';
        if (leg.status === 'live') {
            statusBadge = '<span class="broadcast-status-badge status-live">LIVE ⏱️</span>';
        } else if (leg.status === 'won') {
            statusBadge = '<span class="broadcast-status-badge status-won">TEMBUS ✅</span>';
        } else if (leg.status === 'lost') {
            statusBadge = '<span class="broadcast-status-badge status-lost">GAGAL ❌</span>';
        }

        return `
            <div class="broadcast-leg-row">
                <div class="broadcast-leg-left">
                    <div class="broadcast-leg-match">${match ? `${match.home.emoji} ${match.home.name} vs ${match.away.name} ${match.away.emoji}` : 'Match'}</div>
                    <div class="broadcast-leg-market">Pilihan: <strong style="color:#fbbf24;">${leg.marketLabel}</strong> (${leg.odds.toFixed(2)}x)</div>
                </div>
                <div class="broadcast-leg-right">
                    <div class="broadcast-score-text">${leg.currentScore}</div>
                    ${statusBadge}
                </div>
            </div>
        `;
    }).join('');
}

export function renderBroadcastSummaryHTML({ simResult, simLegCount = 0, simWinAmount = 0, simBetAmount = 0 }) {
    if (simResult === null) return '';

    if (simResult === 'win') {
        return `
            <div style="margin-top:0.75rem; text-align:center; background:rgba(16,185,129,0.1); border:1.5px solid #10b981; padding:1.25rem; border-radius:10px; animation: popIn 0.3s ease-out;">
                <div style="font-size:2rem; margin-bottom:0.25rem;">🏆</div>
                <h4 style="margin:0; font-size:1.2rem; font-weight:900; color:#10b981; letter-spacing:0.04em;">TIKET PARLAY TEMBUS SEMPURNA!</h4>
                <p style="margin:6px 0 0 0; font-size:0.85rem; color:rgba(255,255,255,0.85);">
                    Seluruh ${simLegCount} tebakan Anda benar! Payout kemenangan: <strong style="color:#fbbf24; font-size:1.15rem;">+$ ${simWinAmount.toLocaleString()} TC</strong>
                </p>
            </div>
        `;
    }

    return `
        <div style="margin-top:0.75rem; text-align:center; background:rgba(239,68,68,0.1); border:1.5px solid #ef4444; padding:1.25rem; border-radius:10px; animation: popIn 0.3s ease-out;">
            <div style="font-size:2rem; margin-bottom:0.25rem;">💥</div>
            <h4 style="margin:0; font-size:1.15rem; font-weight:900; color:#ef4444;">TIKET PARLAY GAGAL</h4>
            <p style="margin:6px 0 0 0; font-size:0.82rem; color:rgba(255,255,255,0.7);">
                Sayang sekali, dalam sistem Parlay murni semua tebakan wajib tembus. Taruhan sebesar <span style="color:#fff;">$ ${simBetAmount.toLocaleString()}</span> hangus.
            </p>
        </div>
    `;
}

export function renderParlayHTML({
    leagues,
    activeLeagueFilter,
    matches,
    selectedLegs,
    totalMultiplier,
    estPayout,
    isSimulating,
    simLegStates,
    simCurrentMinute,
    rateStatusHTML,
    broadcastLegsHTML,
    broadcastSummaryHTML,
    isLegSelectedFn
}) {
    const filteredMatches = activeLeagueFilter === 'all'
        ? matches
        : matches.filter(m => m.leagueId === activeLeagueFilter);

    const leagueTabsHTML = leagues.map(league => `
        <button class="league-tab-btn ${activeLeagueFilter === league.id ? 'active' : ''}" data-league-id="${league.id}">
            <span>${league.emoji}</span> ${league.name}
        </button>
    `).join('');

    let fixturesHTML = '';
    filteredMatches.forEach(match => {
        const isHome1 = isLegSelectedFn(match.id, '1x2', 'home');
        const isDrawX = isLegSelectedFn(match.id, '1x2', 'draw');
        const isAway2 = isLegSelectedFn(match.id, '1x2', 'away');

        const isOver = isLegSelectedFn(match.id, 'ou', 'over');
        const isUnder = isLegSelectedFn(match.id, 'ou', 'under');

        const isBttsYes = isLegSelectedFn(match.id, 'btts', 'yes');
        const isBttsNo = isLegSelectedFn(match.id, 'btts', 'no');

        fixturesHTML += `
            <div class="football-fixture-card" data-card-match="${match.id}">
                <div class="fixture-header">
                    <span class="fixture-league-tag">${match.leagueEmoji} ${match.leagueName}</span>
                    <span class="fixture-live-pill">JADWAL UTAMA</span>
                </div>

                <!-- Teams Row -->
                <div class="fixture-teams-row">
                    <div class="team-block home">
                        <span class="team-badge">${match.home.emoji}</span>
                        <span class="team-name">${match.home.name}</span>
                    </div>
                    <div class="fixture-vs-divider">VS</div>
                    <div class="team-block away">
                        <span class="team-name">${match.away.name}</span>
                        <span class="team-badge">${match.away.emoji}</span>
                    </div>
                </div>

                <!-- Betting Markets Grid -->
                <div class="markets-container">
                    <!-- Market 1: 1X2 Match Winner -->
                    <div class="market-section">
                        <div class="market-title">Pemenang Pertandingan (1X2)</div>
                        <div class="odds-btn-group trio">
                            <button class="odds-pill ${isHome1 ? 'selected' : ''}" data-match-id="${match.id}" data-market="1x2" data-pick="home" data-odds="${match.odds.home}">
                                <span class="pick-name">1 (${match.home.name.slice(0, 10)})</span>
                                <span class="odds-val">${match.odds.home.toFixed(2)}x</span>
                            </button>
                            <button class="odds-pill ${isDrawX ? 'selected' : ''}" data-match-id="${match.id}" data-market="1x2" data-pick="draw" data-odds="${match.odds.draw}">
                                <span class="pick-name">X (Seri)</span>
                                <span class="odds-val">${match.odds.draw.toFixed(2)}x</span>
                            </button>
                            <button class="odds-pill ${isAway2 ? 'selected' : ''}" data-match-id="${match.id}" data-market="1x2" data-pick="away" data-odds="${match.odds.away}">
                                <span class="pick-name">2 (${match.away.name.slice(0, 10)})</span>
                                <span class="odds-val">${match.odds.away.toFixed(2)}x</span>
                            </button>
                        </div>
                    </div>

                    <!-- Market 2: Over / Under 2.5 Goals -->
                    <div class="market-section">
                        <div class="market-title">Total Gol (Over / Under 2.5)</div>
                        <div class="odds-btn-group duo">
                            <button class="odds-pill ${isOver ? 'selected' : ''}" data-match-id="${match.id}" data-market="ou" data-pick="over" data-odds="${match.odds.over}">
                                <span class="pick-name">Over &gt; 2.5 Gol</span>
                                <span class="odds-val">${match.odds.over.toFixed(2)}x</span>
                            </button>
                            <button class="odds-pill ${isUnder ? 'selected' : ''}" data-match-id="${match.id}" data-market="ou" data-pick="under" data-odds="${match.odds.under}">
                                <span class="pick-name">Under &lt; 2.5 Gol</span>
                                <span class="odds-val">${match.odds.under.toFixed(2)}x</span>
                            </button>
                        </div>
                    </div>

                    <!-- Market 3: BTTS Both Teams To Score -->
                    <div class="market-section">
                        <div class="market-title">Kedua Tim Cetak Gol (BTTS)</div>
                        <div class="odds-btn-group duo">
                            <button class="odds-pill ${isBttsYes ? 'selected' : ''}" data-match-id="${match.id}" data-market="btts" data-pick="yes" data-odds="${match.odds.bttsYes}">
                                <span class="pick-name">Ya (Kedua Gol)</span>
                                <span class="odds-val">${match.odds.bttsYes.toFixed(2)}x</span>
                            </button>
                            <button class="odds-pill ${isBttsNo ? 'selected' : ''}" data-match-id="${match.id}" data-market="btts" data-pick="no" data-odds="${match.odds.bttsNo}">
                                <span class="pick-name">Tidak (Ada yang 0)</span>
                                <span class="odds-val">${match.odds.bttsNo.toFixed(2)}x</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    let slipLegsHTML = '';
    if (selectedLegs.length === 0) {
        slipLegsHTML = `
            <div class="empty-slip-state">
                <span class="slip-icon">⚽</span>
                <p>Tiket Parlay Kosong</p>
                <small>Pilih minimal 2 pertandingan di sebelah kiri untuk mengaktifkan multiplier akumulatif!</small>
            </div>
        `;
    } else {
        slipLegsHTML = selectedLegs.map((leg, index) => {
            const match = matches.find(m => m.id === leg.matchId);
            let marketLabel = '';
            if (leg.market === '1x2') {
                marketLabel = leg.pick === 'home' ? `Menang: ${match?.home.name}` : (leg.pick === 'away' ? `Menang: ${match?.away.name}` : 'Hasil Seri (X)');
            } else if (leg.market === 'ou') {
                marketLabel = leg.pick === 'over' ? 'Total Gol > 2.5' : 'Total Gol < 2.5';
            } else if (leg.market === 'btts') {
                marketLabel = leg.pick === 'yes' ? 'Kedua Tim Cetak Gol: YA' : 'Kedua Tim Cetak Gol: TIDAK';
            }

            return `
                <div class="slip-leg-item">
                    <div class="slip-leg-info">
                        <div class="match-title">${match ? `${match.home.emoji} ${match.home.name} vs ${match.away.name} ${match.away.emoji}` : 'Match'}</div>
                        <div class="pick-label">${marketLabel}</div>
                    </div>
                    <div class="slip-leg-odds">
                        <span class="odds-tag">${leg.odds.toFixed(2)}x</span>
                        <button class="btn-remove-leg" data-leg-index="${index}" title="Hapus Leg">×</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    return `
        <div class="parlay-sports-suite">
            <!-- Header Bar -->
            <div class="parlay-header">
                <button type="button" class="btn-lobby-pill" title="Buka Menu Game (L)"><span>☰</span> LOBBY / GANTI GAME</button>
                <h3 class="parlay-title">
                    ⚽ <span class="title-grad">EURO SPORTSBOOK PARLAY</span>
                </h3>
                <p class="parlay-sub">PREMIER LEAGUE • CHAMPIONS LEAGUE • LA LIGA • SERIE A • BUNDESLIGA</p>
                <div class="rate-badge-wrap">
                    ${rateStatusHTML}
                </div>
            </div>

            <!-- League Navigation Tabs -->
            <div class="league-nav-strip">
                ${leagueTabsHTML}
            </div>

            <!-- Main Workspace: Fixtures + Betting Slip -->
            <div class="parlay-grid-board">
                
                <!-- Left: Football Match Fixtures Column -->
                <div class="fixtures-column">
                    <div class="fixtures-container-header">
                        <span class="col-title">PERTANDINGAN TERSEDIA</span>
                        <button id="btn-refresh-fixtures" class="btn-refresh-matches" title="Acak Jadwal Baru">
                            🔄 Acak Jadwal
                        </button>
                    </div>
                    <div class="fixtures-scroll-list">
                        ${fixturesHTML}
                    </div>
                </div>

                <!-- Right: Bet Slip & Live Match Broadcast Station -->
                <div class="slip-column">
                    <div class="slip-box-card">
                        <div class="slip-card-header">
                            <div class="slip-title-row">
                                <span class="slip-badge">TIKET PARLAY</span>
                                <span class="slip-legs-count">${selectedLegs.length}/6 Leg</span>
                            </div>
                            <span class="slip-rule-sub">Semua tebakan wajib tembus (All-Win)</span>
                        </div>

                        <!-- Legs Container -->
                        <div class="slip-legs-scroll">
                            ${slipLegsHTML}
                        </div>

                        <!-- Ticket Multiplier Summary -->
                        <div class="slip-summary-footer">
                            <div class="summary-row">
                                <span class="lbl">Total Multiplier:</span>
                                <span class="val-multiplier" id="parlay-total-multiplier-val">${totalMultiplier.toFixed(2)}x</span>
                            </div>
                            <div class="summary-row">
                                <span class="lbl">Potensi Kemenangan:</span>
                                <span class="val-payout" id="parlay-est-payout-val">$ ${estPayout.toLocaleString()}</span>
                            </div>

                            <!-- Bet Input -->
                            <div class="parlay-bet-input-box">
                                <div class="bet-label-row">
                                    <span class="lbl-taruhan">TARUHAN TIKET</span>
                                    <div class="input-inline">
                                        <span class="tc-sign">$</span>
                                        <input type="text" id="parlay-bet-input" value="100,000" ${isSimulating ? 'disabled' : ''}>
                                    </div>
                                </div>
                                <div class="parlay-preset-chips">
                                    <button class="bet-chip parlay-preset" data-val="10000" ${isSimulating ? 'disabled' : ''}>$10K</button>
                                    <button class="bet-chip parlay-preset" data-val="100000" ${isSimulating ? 'disabled' : ''}>$100K</button>
                                    <button class="bet-chip parlay-preset" data-val="1000000" ${isSimulating ? 'disabled' : ''}>$1M</button>
                                    <button class="bet-chip bet-chip-max parlay-preset" id="btn-parlay-max" ${isSimulating ? 'disabled' : ''}>MAX</button>
                                </div>
                            </div>

                            <!-- Submit / Kickoff Button -->
                            <button id="btn-parlay-submit" class="btn-parlay-kickoff" ${selectedLegs.length < 2 || isSimulating ? 'disabled' : ''}>
                                ${isSimulating ? '⏱️ MATCHDAY SEDANG BERLANGSUNG...' : '🚀 PASANG PARLAY &amp; KICK-OFF'}
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            <!-- Live Matchday Broadcast Console Area -->
            <div id="parlay-broadcast-arena" class="broadcast-arena-box" style="display:${isSimulating || simLegStates.length > 0 ? 'block' : 'none'};">
                <div class="broadcast-arena-header">
                    <div class="live-status-indicator">
                        <span class="live-dot"></span>
                        <span class="live-label">LIVE MATCHDAY BROADCAST CENTER</span>
                    </div>
                    <div class="match-clock-badge" id="broadcast-match-clock">
                        ⏱️ MENIT: ${simCurrentMinute}'
                    </div>
                </div>

                <div class="broadcast-scoreboard-grid" id="broadcast-scoreboard-grid">
                    ${broadcastLegsHTML}
                </div>

                <!-- Live Commentary Ticker -->
                <div class="broadcast-ticker-bar">
                    <span class="ticker-prefix">📢 KOMENTAR:</span>
                    <span class="ticker-text" id="broadcast-live-commentary">Menunggu peluit kick-off wasit...</span>
                </div>

                <!-- Final Result Banner -->
                <div id="broadcast-summary-banner">
                    ${broadcastSummaryHTML}
                </div>
            </div>

        </div>

        <style>
            .parlay-sports-suite {
                max-width: 980px;
                margin: 0 auto;
                text-align: center;
                animation: fade-up 0.3s ease;
                box-sizing: border-box;
                padding-bottom: 2rem;
            }
            .parlay-header { margin-bottom: 0.75rem; }
            .parlay-title {
                font-family: var(--font-display, 'Russo One', sans-serif);
                font-size: 1.55rem;
                font-weight: 900;
                margin: 0.35rem 0 0.15rem 0;
            }
            .title-grad {
                background: linear-gradient(90deg, #10b981, #fbbf24, #34d399);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .parlay-sub {
                color: rgba(255,255,255,0.45);
                font-size: 0.7rem;
                font-weight: 700;
                letter-spacing: 0.08em;
                margin-bottom: 0.5rem;
            }
            .rate-badge-wrap { display: flex; justify-content: center; }

            /* League Filter Strip */
            .league-nav-strip {
                display: flex;
                gap: 0.4rem;
                overflow-x: auto;
                padding: 0.35rem 0;
                margin-bottom: 0.85rem;
                justify-content: center;
                scrollbar-width: none;
            }
            .league-tab-btn {
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 999px;
                color: rgba(255,255,255,0.7);
                padding: 0.35rem 0.85rem;
                font-size: 0.75rem;
                font-weight: 800;
                cursor: pointer;
                transition: all 0.2s;
                white-space: nowrap;
                display: flex;
                align-items: center;
                gap: 0.35rem;
            }
            .league-tab-btn:hover {
                background: rgba(16,185,129,0.1);
                border-color: rgba(16,185,129,0.3);
                color: #fff;
            }
            .league-tab-btn.active {
                background: linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.3) 100%);
                border-color: #10b981;
                color: #10b981;
                box-shadow: 0 0 10px rgba(16,185,129,0.3);
            }

            /* Main Grid */
            .parlay-grid-board {
                display: grid;
                grid-template-columns: 1.45fr 1fr;
                gap: 0.85rem;
                text-align: left;
                margin-bottom: 1rem;
            }

            /* Left: Fixtures Column */
            .fixtures-column {
                display: flex;
                flex-direction: column;
                gap: 0.6rem;
                min-width: 0;
            }
            .fixtures-container-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0 0.2rem;
            }
            .col-title {
                font-size: 0.75rem;
                font-weight: 900;
                color: rgba(255,255,255,0.6);
                text-transform: uppercase;
                letter-spacing: 0.06em;
            }
            .btn-refresh-matches {
                background: transparent;
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 6px;
                color: rgba(255,255,255,0.7);
                font-size: 0.68rem;
                font-weight: 800;
                padding: 0.2rem 0.55rem;
                cursor: pointer;
                transition: all 0.2s;
            }
            .btn-refresh-matches:hover {
                background: rgba(255,255,255,0.08);
                color: #fff;
            }

            .fixtures-scroll-list {
                display: flex;
                flex-direction: column;
                gap: 0.65rem;
                max-height: 520px;
                overflow-y: auto;
                padding-right: 4px;
            }

            /* Fixture Card */
            .football-fixture-card {
                background: rgba(20, 16, 12, 0.75);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 12px;
                padding: 0.75rem;
                backdrop-filter: blur(10px);
                transition: border-color 0.2s;
            }
            .football-fixture-card:hover {
                border-color: rgba(251,191,36,0.3);
            }
            .fixture-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
                font-size: 0.68rem;
            }
            .fixture-league-tag {
                color: rgba(255,255,255,0.6);
                font-weight: 800;
            }
            .fixture-live-pill {
                color: #10b981;
                background: rgba(16,185,129,0.1);
                border: 1px solid rgba(16,185,129,0.25);
                padding: 1px 6px;
                border-radius: 4px;
                font-weight: 900;
                font-size: 0.6rem;
            }
            .fixture-teams-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: rgba(0,0,0,0.3);
                border-radius: 8px;
                padding: 0.5rem 0.75rem;
                margin-bottom: 0.6rem;
            }
            .team-block {
                display: flex;
                align-items: center;
                gap: 0.4rem;
                font-weight: 800;
                font-size: 0.85rem;
                color: #fff;
                flex: 1;
            }
            .team-block.home { justify-content: flex-start; }
            .team-block.away { justify-content: flex-end; }
            .fixture-vs-divider {
                font-size: 0.65rem;
                font-weight: 900;
                color: rgba(255,255,255,0.3);
                padding: 0 0.5rem;
            }

            /* Markets Layout */
            .markets-container {
                display: flex;
                flex-direction: column;
                gap: 0.45rem;
            }
            .market-section { display: flex; flex-direction: column; gap: 0.25rem; }
            .market-title {
                font-size: 0.65rem;
                color: rgba(255,255,255,0.5);
                font-weight: 700;
                text-transform: uppercase;
            }
            .odds-btn-group {
                display: grid;
                gap: 0.35rem;
            }
            .odds-btn-group.trio { grid-template-columns: repeat(3, 1fr); }
            .odds-btn-group.duo { grid-template-columns: repeat(2, 1fr); }

            .odds-pill {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 6px;
                padding: 0.35rem 0.25rem;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-family: inherit;
            }
            .odds-pill:hover {
                background: rgba(255,255,255,0.08);
                border-color: rgba(255,255,255,0.2);
            }
            .odds-pill.selected {
                background: linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.3) 100%) !important;
                border-color: #10b981 !important;
                box-shadow: 0 0 10px rgba(16,185,129,0.3);
            }
            .odds-pill .pick-name {
                font-size: 0.68rem;
                color: rgba(255,255,255,0.8);
                font-weight: 700;
                text-align: center;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 100%;
            }
            .odds-pill.selected .pick-name { color: #fff; }
            .odds-pill .odds-val {
                font-size: 0.78rem;
                font-weight: 900;
                color: #fbbf24;
                margin-top: 1px;
            }
            .odds-pill.selected .odds-val { color: #10b981; }

            /* Right: Slip Column */
            .slip-column {
                display: flex;
                flex-direction: column;
                min-width: 0;
            }
            .slip-box-card {
                background: rgba(21, 17, 13, 0.85);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 14px;
                padding: 0.85rem;
                backdrop-filter: blur(14px);
                display: flex;
                flex-direction: column;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                position: sticky;
                top: 1rem;
            }
            .slip-card-header {
                border-bottom: 1px solid rgba(255,255,255,0.08);
                padding-bottom: 0.5rem;
                margin-bottom: 0.5rem;
            }
            .slip-title-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .slip-badge {
                font-family: var(--font-display, sans-serif);
                font-size: 0.85rem;
                color: #fff;
                font-weight: 900;
                letter-spacing: 0.05em;
            }
            .slip-legs-count {
                font-size: 0.72rem;
                font-weight: 800;
                color: #fbbf24;
                background: rgba(251,191,36,0.1);
                border: 1px solid rgba(251,191,36,0.25);
                padding: 2px 6px;
                border-radius: 4px;
            }
            .slip-rule-sub {
                display: block;
                font-size: 0.62rem;
                color: rgba(255,255,255,0.4);
                margin-top: 2px;
            }

            .empty-slip-state {
                padding: 2rem 1rem;
                text-align: center;
                color: rgba(255,255,255,0.4);
            }
            .empty-slip-state .slip-icon { font-size: 2rem; display: block; margin-bottom: 0.4rem; opacity: 0.5; }
            .empty-slip-state p { font-size: 0.82rem; font-weight: 800; color: #fff; margin-bottom: 0.2rem; }
            .empty-slip-state small { font-size: 0.68rem; display: block; line-height: 1.3; }

            .slip-legs-scroll {
                max-height: 200px;
                overflow-y: auto;
                margin-bottom: 0.65rem;
                display: flex;
                flex-direction: column;
                gap: 0.35rem;
            }
            .slip-leg-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 8px;
                padding: 0.45rem 0.6rem;
                font-size: 0.72rem;
            }
            .slip-leg-info { flex: 1; min-width: 0; padding-right: 6px; }
            .slip-leg-info .match-title {
                font-weight: 800;
                color: #fff;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .slip-leg-info .pick-label {
                font-size: 0.65rem;
                color: #10b981;
                font-weight: 700;
                margin-top: 1px;
            }
            .slip-leg-odds {
                display: flex;
                align-items: center;
                gap: 0.4rem;
            }
            .slip-leg-odds .odds-tag {
                font-weight: 900;
                color: #fbbf24;
            }
            .btn-remove-leg {
                background: transparent;
                border: none;
                color: #ef4444;
                font-size: 1.1rem;
                cursor: pointer;
                font-weight: 900;
                line-height: 1;
                padding: 0 2px;
            }

            /* Slip Summary Footer */
            .slip-summary-footer {
                border-top: 1px solid rgba(255,255,255,0.08);
                padding-top: 0.6rem;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            .summary-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 0.78rem;
            }
            .summary-row .lbl { color: rgba(255,255,255,0.6); font-weight: 700; }
            .val-multiplier { font-family: var(--font-display, sans-serif); color: #fbbf24; font-size: 1.05rem; font-weight: 900; }
            .val-payout { font-family: var(--font-num, monospace); color: #10b981; font-size: 1.15rem; font-weight: 900; }

            .parlay-bet-input-box {
                background: rgba(0,0,0,0.3);
                border-radius: 8px;
                padding: 0.5rem;
                border: 1px solid rgba(255,255,255,0.06);
            }
            .bet-label-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.4rem;
            }
            .lbl-taruhan { font-size: 0.65rem; color: rgba(255,255,255,0.5); font-weight: 800; }
            .input-inline { display: flex; align-items: center; gap: 0.2rem; }
            .tc-sign { color: #fbbf24; font-weight: 900; }
            #parlay-bet-input {
                background: transparent;
                border: none;
                font-size: 1.15rem;
                font-weight: 900;
                color: #fff;
                width: 110px;
                text-align: right;
                border-bottom: 1.5px solid rgba(251,191,36,0.4);
                outline: none;
                font-family: var(--font-num, monospace);
            }
            .parlay-preset-chips {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 0.25rem;
            }

            .btn-parlay-kickoff {
                font-family: var(--font-display, 'Russo One', sans-serif);
                width: 100%;
                border: none;
                border-radius: 10px;
                padding: 0.85rem;
                font-size: 1.05rem;
                color: #fff;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                box-shadow: 0 4px 15px rgba(16,185,129,0.35);
                cursor: pointer;
                transition: all 0.2s;
                letter-spacing: 0.04em;
            }
            .btn-parlay-kickoff:hover:not(:disabled) {
                transform: translateY(-2px);
                filter: brightness(1.1);
            }
            .btn-parlay-kickoff:disabled {
                opacity: 0.45;
                cursor: not-allowed;
            }

            /* Live Matchday Broadcast Arena */
            .broadcast-arena-box {
                background: #080c10;
                border: 2px solid #1e293b;
                border-radius: 14px;
                padding: 1rem;
                margin-top: 1rem;
                box-shadow: inset 0 0 20px rgba(0,0,0,0.9);
                text-align: left;
            }
            .broadcast-arena-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid rgba(255,255,255,0.08);
                padding-bottom: 0.6rem;
                margin-bottom: 0.75rem;
            }
            .live-status-indicator {
                display: flex;
                align-items: center;
                gap: 0.4rem;
            }
            .live-dot {
                width: 8px;
                height: 8px;
                background: #ef4444;
                border-radius: 50%;
                animation: rateGlow 1s infinite alternate;
            }
            .live-label {
                font-size: 0.75rem;
                font-weight: 900;
                color: #fff;
                letter-spacing: 0.06em;
            }
            .match-clock-badge {
                font-family: var(--font-num, monospace);
                font-size: 0.85rem;
                font-weight: 900;
                color: #fbbf24;
                background: rgba(251,191,36,0.12);
                border: 1px solid rgba(251,191,36,0.3);
                padding: 2px 8px;
                border-radius: 6px;
            }

            .broadcast-scoreboard-grid {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                margin-bottom: 0.75rem;
            }
            .broadcast-leg-row {
                background: rgba(255,255,255,0.02);
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 8px;
                padding: 0.6rem 0.8rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 0.5rem;
            }
            .broadcast-leg-left { flex: 1; }
            .broadcast-leg-match { font-size: 0.82rem; font-weight: 800; color: #fff; }
            .broadcast-leg-market { font-size: 0.7rem; color: rgba(255,255,255,0.5); margin-top: 2px; }
            .broadcast-leg-right { text-align: right; }
            .broadcast-score-text {
                font-family: var(--font-num, monospace);
                font-size: 1.1rem;
                font-weight: 900;
                color: #fff;
                letter-spacing: 0.08em;
            }
            .broadcast-status-badge {
                font-size: 0.65rem;
                font-weight: 800;
                padding: 2px 6px;
                border-radius: 4px;
                display: inline-block;
                margin-top: 2px;
            }
            .status-live { background: rgba(251,191,36,0.15); color: #fbbf24; }
            .status-won { background: rgba(16,185,129,0.15); color: #10b981; }
            .status-lost { background: rgba(239,68,68,0.15); color: #ef4444; }

            .broadcast-ticker-bar {
                background: rgba(0,0,0,0.5);
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 6px;
                padding: 0.45rem 0.75rem;
                font-size: 0.75rem;
                display: flex;
                align-items: center;
                gap: 0.4rem;
            }
            .ticker-prefix { color: #fbbf24; font-weight: 800; }
            .ticker-text { color: rgba(255,255,255,0.85); font-style: italic; }

            @media (max-width: 768px) {
                .parlay-grid-board {
                    grid-template-columns: 1fr;
                }
                .fixtures-scroll-list {
                    max-height: 380px;
                }
            }
        </style>
    `;
}

