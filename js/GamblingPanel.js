/**
 * GamblingPanel.js - Trilliun Chip VIP Casino Terminal & Grand Lobby
 * Features:
 * - Grand VIP Casino Lobby (Landing page with prominent real-time Claim Center & All 6 Game Showcases)
 * - Goldy Crush Slot (6x3)
 * - Mahjong Ways Slot (6x8)
 * - Gates of Olympus Zeus Slot (6x5)
 * - Mega Lottery (Togel Progresif 4D)
 * - Mega Fortune Wheel (Roda Keberuntungan & Kripto)
 * - Parlay Sports & Derby Betting
 */

import financeManager from './finance/FinanceManager.js';
import gameState from './core/GameState.js';
import ui from './ui/UIManager.js';
import viewManager from './ui/ViewManager.js';
import pixiEffects from './graphics/PixiEffects.js';
import AuraSound from './ui/AuraSound.js';
import rewardManager, { DAILY_STREAK_REWARDS } from './rewards/RewardManager.js';

import { SlotEngine } from './casino/SlotEngine.js';
import { MahjongSlotEngine } from './casino/MahjongSlotEngine.js';
import { ZeusSlotEngine } from './casino/ZeusSlotEngine.js';
import { LotteryEngine } from './casino/LotteryEngine.js';
import { WheelEngine } from './casino/WheelEngine.js';
import { ParlayEngine } from './casino/ParlayEngine.js';
import casinoVolatility from './casino/CasinoVolatilityEngine.js';

const GAME_CATALOG = {
    lobby: { id: 'lobby', name: 'Lobby Kasino', icon: '👑', fullTitle: '👑 VIP Casino Grand Lobby', reel: 'VIP LOBBY' },
    slot: { id: 'slot', name: 'Goldy Crush', icon: '🎰', fullTitle: '🎰 Goldy Crush (6x3)', reel: '6x3 REEL', badge: 'POPULER' },
    mahjong: { id: 'mahjong', name: 'Mahjong Ways', icon: '🀄', fullTitle: '🀄 Mahjong Ways Macau (6x8)', reel: '6x8 REEL', badge: 'HOT MEGAWAYS' },
    zeus: { id: 'zeus', name: 'Gates of Olympus', icon: '⚡', fullTitle: '⚡ Gates of Olympus (6x5)', reel: '6x5 REEL', badge: 'MAXWIN 5000x' },
    wheel: { id: 'wheel', name: 'Mega Wheel', icon: '🎡', fullTitle: '🎡 Mega Fortune Wheel', reel: 'INSTANT WIN', badge: 'JACKPOT 100x' },
    lottery: { id: 'lottery', name: 'Lotre 4D', icon: '🎫', fullTitle: '🎫 Lotre Mega Progresif 4D', reel: 'PROGRESIF', badge: 'GRAND POOL 100M+' },
    parlay: { id: 'parlay', name: 'Parlay Bola', icon: '⚽', fullTitle: '⚽ Parlay Sports & Derby', reel: 'SPORTSBOOK', badge: 'ODDS TINGGI' }
};

class GamblingPanel {
    constructor() {
        const refresh = () => this.refreshBalanceDisplay();
        this.slot = new SlotEngine(refresh);
        this.mahjong = new MahjongSlotEngine(refresh);
        this.zeus = new ZeusSlotEngine(refresh);
        this.lottery = new LotteryEngine(refresh);
        this.wheel = new WheelEngine(refresh);
        this.parlay = new ParlayEngine(refresh);
        this.activeTab = 'lobby'; // << Lobby Utama sebagai landing page terpapar
        this._globalEventsBound = false;

        // Auto-update luck meter and rate badges whenever casino loss counter updates
        gameState.on('casino.ratePlays', () => {
            this.updateLuckMeter();
            this.updateHeaderRateBadge();
        });
    }

    getGameMeta(tabId) {
        return GAME_CATALOG[tabId] || GAME_CATALOG.lobby;
    }

    show() {
        const content = `
            <div class="casino-root" style="padding: 0.1rem 0.25rem; max-width: 1040px; margin: 0 auto; width: 100%;">
                <div class="casino-board" style="position: relative; padding: 0;">
                    <div id="casino-game-panel">
                        ${this.getActiveTabHTML()}
                    </div>
                </div>
            </div>
 
            <style>
                @keyframes winPulse {
                    0%,100% { text-shadow: 0 0 8px currentColor; }
                    50% { text-shadow: 0 0 24px currentColor, 0 0 48px currentColor; }
                }
                @keyframes jackpotFlash {
                    0%,100% { background: linear-gradient(135deg,#fbbf24,#f59e0b); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
                    50% { background: linear-gradient(135deg,#f43f5e,#be123c); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
                }
                @keyframes marqueeScroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            </style>
        `;

        viewManager.showDynamicView('Trilliun Chip', 'VIP Casino & Slots Entertainment Suite', content);
        this._bindEvents();
        this.updateHeaderNavUI();
    }

    getActiveTabHTML() {
        if (this.activeTab === 'lobby') {
            return this.getLobbyHTML();
        }

        const meta = this.getGameMeta(this.activeTab);
        return `
            <div class="in-game-theater-wrapper">
                <!-- In-Game Return Bar (Quick one-tap back to Grand Lobby) -->
                <div class="game-return-bar">
                    <button type="button" class="btn-vip btn-return-lobby" id="btn-in-game-return-lobby" title="Kembali ke Grand Lobby Kasino">
                        <span class="back-icon">←</span>
                        <span class="return-text">KEMBALI KE LOBBY</span>
                    </button>
                    <div class="game-return-title">
                        <span class="game-icon">${meta.icon}</span>
                        <span class="game-name">${meta.fullTitle}</span>
                    </div>
                    <div class="game-return-rate-slot" id="game-return-rate-badge">
                        ${this.getInnerRateHTML()}
                    </div>
                </div>
                ${this.getGameBodyHTML(this.activeTab)}
            </div>
        `;
    }

    getGameBodyHTML(tabId) {
        switch (tabId) {
            case 'slot': return this.slot.getHTML();
            case 'mahjong': return this.mahjong.getHTML();
            case 'zeus': return this.zeus.getHTML();
            case 'lottery': return this.lottery.getHTML();
            case 'wheel': return this.wheel.getHTML();
            case 'parlay': return this.parlay.getHTML();
            default: return this.getLobbyHTML();
        }
    }

    getInnerRateHTML() {
        if (this.activeTab === 'slot' && this.slot) return this.slot.getRateStatusHTML();
        if (this.activeTab === 'mahjong' && this.mahjong) return this.mahjong.getRateStatusHTML();
        if (this.activeTab === 'zeus' && this.zeus) return this.zeus.getRateStatusHTML();
        if (this.activeTab === 'wheel' && this.wheel) return this.wheel.getRateStatusHTML();
        if (this.activeTab === 'lottery' && this.lottery) return this.lottery.getRateStatusHTML();
        if (this.activeTab === 'parlay' && this.parlay) return this.parlay.getRateStatusHTML();
        return '';
    }

    /**
     * Renders the Grand VIP Casino Lobby:
     * - Live Claim Hub (Faucet, Daily Streak, Bailout, Quests, Luck Pity Meter)
     * - Showcase Grid of All 6 Games exposed upfront
     * - VIP Utilities
     */
    getLobbyHTML() {
        const streakDay = rewardManager.getCurrentStreakDay ? rewardManager.getCurrentStreakDay() : 1;
        const streakDef = DAILY_STREAK_REWARDS[streakDay - 1] || DAILY_STREAK_REWARDS[0];
        const streakRewardStr = financeManager.formatCurrency(streakDef.chips);
        const luckInfo = casinoVolatility.getLuckInfo();

        return `
        <div class="casino-lobby-root">
            <!-- 1. Hero Welcome & Golden VIP Crest -->
            <div class="lobby-hero-banner">
                <div class="lobby-hero-crest">
                    <span class="crest-icon">👑</span>
                    <span class="crest-text">TRILLIUN-BET33 LUXURY CASINO SUITE</span>
                </div>
                <h1 class="lobby-hero-title">VIP CASINO &amp; SLOTS ENTERTAINMENT</h1>
                <p class="lobby-hero-subtitle">Klaim bonus chip gratis harian Anda di bawah dan pilih wahana kasino premium favorit Anda</p>
                
                <!-- Live Marquee Ticker -->
                <div class="lobby-marquee-strip">
                    <div class="marquee-tag">LIVE FEED</div>
                    <div class="marquee-content-wrap">
                        <div class="marquee-track">
                            <span>🏆 GRAND JACKPOT 4D: 100.000.000+ TC</span>
                            <span class="marquee-bullet">•</span>
                            <span>⚡ GATES OF OLYMPUS: MULTIPLIER 500x PETIR ZEUS</span>
                            <span class="marquee-bullet">•</span>
                            <span>🀄 MAHJONG WAYS MACAU: TRANSFORMASI NAGA EMAS</span>
                            <span class="marquee-bullet">•</span>
                            <span>🎁 VIP FAUCET +5.000.000 TC SETIAP 15 MENIT</span>
                            <span class="marquee-bullet">•</span>
                            <span>🎰 GOLDY CRUSH: LEDAKAN 3x3 BOM DINAMIT</span>
                            <span class="marquee-bullet">•</span>
                            <span>🎡 FORTUNE WHEEL: PUTARAN BERHADIAH HINGGA 100x</span>
                            <span class="marquee-bullet">•</span>
                            <span>🏆 GRAND JACKPOT 4D: 100.000.000+ TC</span>
                            <span class="marquee-bullet">•</span>
                            <span>⚡ GATES OF OLYMPUS: MULTIPLIER 500x PETIR ZEUS</span>
                            <span class="marquee-bullet">•</span>
                            <span>🀄 MAHJONG WAYS MACAU: TRANSFORMASI NAGA EMAS</span>
                            <span class="marquee-bullet">•</span>
                            <span>🎁 VIP FAUCET +5.000.000 TC SETIAP 15 MENIT</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. VIP Claims Center (Klaim-klaim saldo terpapar langsung di Lobby!) -->
            <div class="lobby-section lobby-claims-section">
                <div class="lobby-section-header">
                    <div class="section-title-wrap">
                        <span class="section-icon">💎</span>
                        <h2 class="section-title">PUSAT KLAIM &amp; BONUS SALDO VIP</h2>
                    </div>
                    <span class="section-badge">KLAIM LANGSUNG DI LOBBY</span>
                </div>

                <!-- Emergency Bailout Banner (Shows dynamically if bankrupt < 100k) -->
                <div id="lobby-bailout-card" class="lobby-bailout-banner" style="display: none;">
                    <div class="bailout-info">
                        <div class="bailout-tag">🚨 DANA TALANGAN DARURAT</div>
                        <div class="bailout-text">Saldo kas Anda kritis di bawah 100.000 TC! Suntikkan bantuan kasino sekarang untuk melanjutkan permainan.</div>
                    </div>
                    <button type="button" id="lobby-btn-bailout" class="btn-vip btn-bailout-action">
                        🚑 SUNTIK +5.000.000 TC
                    </button>
                </div>

                <div class="lobby-claim-grid">
                    <!-- Claim Card 1: VIP Faucet -->
                    <div class="lobby-claim-card" id="card-lobby-faucet">
                        <div class="claim-card-top">
                            <span class="claim-card-badge badge-faucet">15 MENIT SEKALI</span>
                            <span class="claim-card-icon">🎁</span>
                        </div>
                        <div class="claim-card-body">
                            <div class="claim-card-title">VIP Faucet Saldo</div>
                            <div class="claim-card-amount">+5.000.000 TC</div>
                            <div class="claim-card-status" id="lobby-faucet-timer">Memuat cooldown...</div>
                        </div>
                        <button type="button" id="lobby-btn-faucet" class="btn-lobby-claim" title="Klaim Faucet Saldo VIP">
                            🎁 KLAIM +5M TC
                        </button>
                    </div>

                    <!-- Claim Card 2: Daily Login Streak -->
                    <div class="lobby-claim-card" id="card-lobby-streak">
                        <div class="claim-card-top">
                            <span class="claim-card-badge badge-streak">ABSENSI HARIAN</span>
                            <span class="claim-card-icon">📅</span>
                        </div>
                        <div class="claim-card-body">
                            <div class="claim-card-title">Daily Streak <span class="streak-pill">Hari #${streakDay}</span></div>
                            <div class="claim-card-amount">+${streakRewardStr} TC</div>
                            <div class="claim-card-status" id="lobby-streak-status">Klaim bonus login Anda!</div>
                        </div>
                        <button type="button" id="lobby-btn-streak" class="btn-lobby-claim" title="Klaim Absensi Harian">
                            📅 KLAIM HARIAN
                        </button>
                    </div>

                    <!-- Claim Card 3: Quests & Rewards Hub -->
                    <div class="lobby-claim-card" id="card-lobby-quests">
                        <div class="claim-card-top">
                            <span class="claim-card-badge badge-quest">MISI &amp; PRESTASI</span>
                            <span class="claim-card-icon">🎯</span>
                        </div>
                        <div class="claim-card-body">
                            <div class="claim-card-title">Misi &amp; Prestasi VIP</div>
                            <div class="claim-card-amount">Hingga +67.000.000 TC</div>
                            <div class="claim-card-status" id="lobby-quests-status">6 Misi Harian &amp; 5 Gelar Sultan</div>
                        </div>
                        <button type="button" id="lobby-btn-quests" class="btn-lobby-claim btn-quests-action" title="Buka Pusat Misi &amp; Prestasi">
                            🎯 BUKA REWARDS HUB
                        </button>
                    </div>

                    <!-- Claim Card 4: Status Keberuntungan Pity System -->
                    <div class="lobby-claim-card" id="card-lobby-luck">
                        <div class="claim-card-top">
                            <span class="claim-card-badge badge-luck">PITY ENGINE</span>
                            <span class="claim-card-icon">✨</span>
                        </div>
                        <div class="claim-card-body">
                            <div class="claim-card-title">Status Keberuntungan</div>
                            <div class="claim-card-amount" id="lobby-luck-tier-label">${luckInfo.isRateOn ? '⚡ GACOR (3.5×)' : luckInfo.tierLabel}</div>
                            <div class="lobby-luck-bar-box">
                                <div class="lobby-luck-bar-track">
                                    <div id="lobby-luck-bar" class="lobby-luck-bar-fill" style="width: ${luckInfo.percent}%;"></div>
                                </div>
                                <div class="lobby-luck-bar-sub" id="lobby-luck-accum-info">
                                    ${luckInfo.isRateOn ? '⚡ RATE ON AKTIF!' : `${luckInfo.losses} / ${luckInfo.target} Kalah (${luckInfo.percent}%)`}
                                </div>
                            </div>
                        </div>
                        <button type="button" id="lobby-btn-luck-info" class="btn-lobby-claim" title="Klik untuk penjelasan Pity System Rate Gacor">
                            ⚡ INFO RATE GACOR
                        </button>
                    </div>
                </div>
            </div>

            <!-- 3. All Games Showcase (Semua 6 Permainan Terpapar dari Awal!) -->
            <div class="lobby-section lobby-games-section">
                <div class="lobby-section-header">
                    <div class="section-title-wrap">
                        <span class="section-icon">🎰</span>
                        <h2 class="section-title">SEMUA WAHANA PERMAINAN KASINO</h2>
                    </div>
                    <span class="section-badge">6 PERMAINAN RESMI</span>
                </div>

                <div class="lobby-showcase-grid">
                    <!-- 1. Goldy Crush -->
                    <div class="lobby-game-showcase-card card-slot" data-game-id="slot">
                        <div class="showcase-banner">
                            <span class="showcase-tag tag-pop">POPULER • 6x3 REEL</span>
                            <span class="showcase-rate">RTP 96.8%</span>
                        </div>
                        <div class="showcase-body">
                            <div class="showcase-icon-hero">🎰</div>
                            <h3 class="showcase-title">Goldy Crush</h3>
                            <p class="showcase-desc">Tambang Emas Klasik dengan Bom Dinamit 3x3, Tumbling Wilds, dan Pengali Runtuhan Bertingkat!</p>
                            <div class="showcase-features">
                                <span>💎 Simbol Berlian</span>
                                <span>💣 Bom Dinamit 3x3</span>
                                <span>⛏️ Runtuhan Emas</span>
                            </div>
                            <div class="showcase-payout-highlight">
                                <span class="payout-label">Potensi Kemenangan:</span>
                                <span class="payout-val">Maxwin 2.500× Bet</span>
                            </div>
                        </div>
                        <div class="showcase-footer">
                            <button type="button" class="btn-play-showcase" data-game-id="slot">
                                <span class="play-icon">▶</span>
                                <span>MAIN SEKARANG</span>
                            </button>
                        </div>
                    </div>

                    <!-- 2. Mahjong Ways Macau -->
                    <div class="lobby-game-showcase-card card-mahjong" data-game-id="mahjong">
                        <div class="showcase-banner">
                            <span class="showcase-tag tag-mega">HOT • 6x8 REEL</span>
                            <span class="showcase-rate">RTP 97.2%</span>
                        </div>
                        <div class="showcase-body">
                            <div class="showcase-icon-hero">🀄</div>
                            <h3 class="showcase-title">Mahjong Ways Macau</h3>
                            <p class="showcase-desc">Ubin Mahjong Bersepuh Emas, Transformasi Wild Naga Emas Imperial, dan Multiplier Kombo Hingga 10×!</p>
                            <div class="showcase-features">
                                <span>🐉 Naga Emas Wild</span>
                                <span>✨ Simbol Sepuh Emas</span>
                                <span>🀅 Multiplier 10x</span>
                            </div>
                            <div class="showcase-payout-highlight">
                                <span class="payout-label">Potensi Kemenangan:</span>
                                <span class="payout-val">Maxwin 5.000× Bet</span>
                            </div>
                        </div>
                        <div class="showcase-footer">
                            <button type="button" class="btn-play-showcase" data-game-id="mahjong">
                                <span class="play-icon">▶</span>
                                <span>MAIN SEKARANG</span>
                            </button>
                        </div>
                    </div>

                    <!-- 3. Gates of Olympus -->
                    <div class="lobby-game-showcase-card card-zeus" data-game-id="zeus">
                        <div class="showcase-banner">
                            <span class="showcase-tag tag-zeus">VIP GACOR • 6x5 REEL</span>
                            <span class="showcase-rate">RTP 97.5%</span>
                        </div>
                        <div class="showcase-body">
                            <div class="showcase-icon-hero">⚡</div>
                            <h3 class="showcase-title">Gates of Olympus</h3>
                            <p class="showcase-desc">Kuil Dewa Petir Zeus dengan Pengali Petir Hingga 500×, Scatter Tumble &amp; Cluster Pays Seluruh Grid!</p>
                            <div class="showcase-features">
                                <span>⚡ Sambaran Petir 500x</span>
                                <span>🏛️ Scatter Kuil Zeus</span>
                                <span>👑 Cluster Pays</span>
                            </div>
                            <div class="showcase-payout-highlight">
                                <span class="payout-label">Potensi Kemenangan:</span>
                                <span class="payout-val">Maxwin 5.000× Bet</span>
                            </div>
                        </div>
                        <div class="showcase-footer">
                            <button type="button" class="btn-play-showcase" data-game-id="zeus">
                                <span class="play-icon">▶</span>
                                <span>MAIN SEKARANG</span>
                            </button>
                        </div>
                    </div>

                    <!-- 4. Mega Fortune Wheel -->
                    <div class="lobby-game-showcase-card card-wheel" data-game-id="wheel">
                        <div class="showcase-banner">
                            <span class="showcase-tag tag-wheel">INSTANT WIN</span>
                            <span class="showcase-rate">100% FAIR</span>
                        </div>
                        <div class="showcase-body">
                            <div class="showcase-icon-hero">🎡</div>
                            <h3 class="showcase-title">Mega Fortune Wheel</h3>
                            <p class="showcase-desc">Roda Putar Keberuntungan Instan berhadiah Pengali Tunai Hingga 100×, Kripto, dan Tiket Lotre Gratis!</p>
                            <div class="showcase-features">
                                <span>🎡 Roda Mega Putar</span>
                                <span>🪙 Pengali 100x Tunai</span>
                                <span>🎫 Tiket Lotre Gratis</span>
                            </div>
                            <div class="showcase-payout-highlight">
                                <span class="payout-label">Kecepatan Hadiah:</span>
                                <span class="payout-val">Instan 1 Ketukan</span>
                            </div>
                        </div>
                        <div class="showcase-footer">
                            <button type="button" class="btn-play-showcase" data-game-id="wheel">
                                <span class="play-icon">▶</span>
                                <span>PUTAR SEKARANG</span>
                            </button>
                        </div>
                    </div>

                    <!-- 5. Progressive Lottery -->
                    <div class="lobby-game-showcase-card card-lottery" data-game-id="lottery">
                        <div class="showcase-banner">
                            <span class="showcase-tag tag-jackpot">GRAND JACKPOT</span>
                            <span class="showcase-rate">PROGRESIF</span>
                        </div>
                        <div class="showcase-body">
                            <div class="showcase-icon-hero">🎫</div>
                            <h3 class="showcase-title">Lotre Progresif 4D</h3>
                            <p class="showcase-desc">Live Mechanical Drum Tumbler Draw. Pasang 4D, 3D, 2D, Colok Bebas &amp; 50:50 Berhadiah Pool Ratusan Juta TC!</p>
                            <div class="showcase-features">
                                <span>🎱 Live Mechanical Drum</span>
                                <span>💰 Pool 100M+ TC</span>
                                <span>🎟️ 4D, 3D, 2D &amp; Colok</span>
                            </div>
                            <div class="showcase-payout-highlight">
                                <span class="payout-label">Hadiah Utama 4D:</span>
                                <span class="payout-val">Pool Ratusan Juta TC</span>
                            </div>
                        </div>
                        <div class="showcase-footer">
                            <button type="button" class="btn-play-showcase" data-game-id="lottery">
                                <span class="play-icon">▶</span>
                                <span>PASANG NOMOR</span>
                            </button>
                        </div>
                    </div>

                    <!-- 6. Parlay Sports & Derby -->
                    <div class="lobby-game-showcase-card card-parlay" data-game-id="parlay">
                        <div class="showcase-banner">
                            <span class="showcase-tag tag-parlay">SPORTSBOOK</span>
                            <span class="showcase-rate">MULTI-LEG</span>
                        </div>
                        <div class="showcase-body">
                            <div class="showcase-icon-hero">⚽</div>
                            <h3 class="showcase-title">Parlay Sports &amp; Derby</h3>
                            <p class="showcase-desc">Taruhan Kombo Multi-Leg Sepak Bola Eropa &amp; Pacuan Kuda Derby dengan Analitik Pasaran Nyata!</p>
                            <div class="showcase-features">
                                <span>⚽ Big Match Eropa</span>
                                <span>🏇 Pacuan Kuda Derby</span>
                                <span>🚀 Multiplier Kombo</span>
                            </div>
                            <div class="showcase-payout-highlight">
                                <span class="payout-label">Potensi Payout:</span>
                                <span class="payout-val">Odds Akumulasi Lipat</span>
                            </div>
                        </div>
                        <div class="showcase-footer">
                            <button type="button" class="btn-play-showcase" data-game-id="parlay">
                                <span class="play-icon">▶</span>
                                <span>PASANG TARUHAN</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 4. VIP Utilities & Settings Footer -->
            <div class="lobby-footer-tools">
                <div class="footer-tools-left">
                    <button type="button" id="lobby-btn-sound" class="btn-vip btn-secondary-vip">
                        🔊 Sound: ON
                    </button>
                    <button type="button" id="lobby-btn-reset" class="btn-vip btn-secondary-vip">
                        🔄 Reset Saldo (10M TC)
                    </button>
                </div>
                <div class="footer-tools-right">
                    <span>🛡️ Provably Fair RNG Verified</span>
                    <span class="dot">•</span>
                    <span>Trilliun-Bet33 VIP Entertainment Suite</span>
                </div>
            </div>
        </div>
        `;
    }

    openLobby() {
        this.switchGame('lobby');
    }

    closeLobby() {
        // Alias for compatibility
    }

    toggleLobby() {
        if (this.activeTab !== 'lobby') {
            this.switchGame('lobby');
        }
    }

    switchGame(tabId) {
        if (!GAME_CATALOG[tabId]) return;
        if (tabId === this.activeTab) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // Cek apakah ada game yang sedang berjalan / spinning
        if (this.activeTab !== 'lobby') {
            if ((this.slot && (this.slot.isSpinning || this.slot.isAutoSpinning)) ||
                (this.mahjong && (this.mahjong.isSpinning || this.mahjong.isAutoSpinning)) ||
                (this.zeus && (this.zeus.isSpinning || this.zeus.isAutoSpinning)) ||
                (this.wheel && (this.wheel.isSpinning || this.wheel.isAutoSpinning))) {
                
                ui.error("Harap tunggu putaran / spin selesai sebelum berpindah!");
                return;
            }

            // Stop running auto spins when navigating away
            this.slot.stopAutoSpin();
            this.mahjong.stopAutoSpin();
            this.zeus.stopAutoSpin();
            this.wheel.stopAutoSpin();
        }

        this.activeTab = tabId;
        this.updateHeaderNavUI();

        // Update active game content with GSAP entrance animation
        const gamePanel = document.getElementById('casino-game-panel');
        if (gamePanel) {
            gamePanel.innerHTML = this.getActiveTabHTML();
            this.bindActiveTabEvents(gamePanel);
            if (window.gsap) {
                window.gsap.fromTo(gamePanel, 
                    { opacity: 0, y: 14, scale: 0.99 }, 
                    { opacity: 1, y: 0, scale: 1, duration: 0.28, ease: 'power2.out' }
                );
            }
        }

        if (tabId === 'lobby') {
            AuraSound.playTap();
        } else {
            const meta = this.getGameMeta(tabId);
            ui.info(`Beralih ke wahana ${meta.name}`, '🎮 Game Dimuat');
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    updateHeaderNavUI() {
        const headerLobbyBtn = document.getElementById('btn-open-lobby');
        const headerActivePill = document.getElementById('header-active-game-pill');
        const headerRateContainer = document.getElementById('header-rate-badge-container');

        if (this.activeTab === 'lobby') {
            if (headerLobbyBtn) {
                headerLobbyBtn.innerHTML = `<span class="hamburger-icon">🏠</span> <span class="lobby-label">LOBBY</span>`;
                headerLobbyBtn.classList.remove('btn-in-game');
                headerLobbyBtn.title = 'Lobby Utama Kasino';
            }
            if (headerActivePill) {
                headerActivePill.innerHTML = `<span>👑</span> VIP LOBBY`;
            }
            if (headerRateContainer) {
                headerRateContainer.innerHTML = '';
            }
        } else {
            const meta = this.getGameMeta(this.activeTab);
            if (headerLobbyBtn) {
                headerLobbyBtn.innerHTML = `<span class="back-arrow">←</span> <span class="lobby-label">LOBBY</span>`;
                headerLobbyBtn.classList.add('btn-in-game');
                headerLobbyBtn.title = 'Kembali ke Lobby Utama';
            }
            if (headerActivePill) {
                headerActivePill.innerHTML = `<span>${meta.icon}</span> ${meta.name}`;
            }
            this.updateHeaderRateBadge();
        }
    }

    updateHeaderRateBadge() {
        const headerRateContainer = document.getElementById('header-rate-badge-container');
        if (headerRateContainer && this.activeTab !== 'lobby') {
            headerRateContainer.innerHTML = this.getInnerRateHTML();
        }
    }

    updateLuckMeter() {
        const info = casinoVolatility.getLuckInfo();

        const lobbyTierEl = document.getElementById('lobby-luck-tier-label');
        if (lobbyTierEl) {
            lobbyTierEl.textContent = info.isRateOn ? '⚡ GACOR (3.5×)' : `${info.tierLabel} (${info.multiplier.toFixed(2)}×)`;
            lobbyTierEl.style.color = info.badgeColor;
        }

        const lobbyBarEl = document.getElementById('lobby-luck-bar');
        if (lobbyBarEl) {
            lobbyBarEl.style.width = `${info.percent}%`;
            lobbyBarEl.classList.toggle('rate-on', info.isRateOn);
        }

        const lobbyAccumEl = document.getElementById('lobby-luck-accum-info');
        if (lobbyAccumEl) {
            lobbyAccumEl.textContent = info.isRateOn 
                ? '⚡ RATE ON GACOR AKTIF! Mainkan slot sekarang!' 
                : `${info.losses} / ${info.target} Kalah (${info.percent}%)`;
        }
    }

    updateLobbyUI() {
        this.updateHeaderNavUI();
        this.updateLuckMeter();
    }

    _bindEvents() {
        const container = document.getElementById('dynamic-view-content') || document.getElementById('app');
        if (!container) return;

        // Global listeners (header lobby button, keyboard)
        this._bindGlobalNavigationEvents();

        // Bind active tab events
        const gamePanel = document.getElementById('casino-game-panel');
        if (gamePanel) {
            this.bindActiveTabEvents(gamePanel);
        }

        this.updateLobbyUI();
    }

    _bindGlobalNavigationEvents() {
        if (this._globalEventsBound) return;
        this._globalEventsBound = true;

        // Header Lobby button
        document.addEventListener('click', (e) => {
            const lobbyBtn = e.target.closest('#btn-open-lobby') || e.target.closest('.btn-lobby-pill');
            if (lobbyBtn) {
                e.preventDefault();
                pixiEffects.buttonPress(lobbyBtn);
                if (this.activeTab !== 'lobby') {
                    this.switchGame('lobby');
                } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                return;
            }
        });

        // Keyboard Esc to return to lobby
        document.addEventListener('keydown', (e) => {
            const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

            if (e.key === 'Escape' && this.activeTab !== 'lobby') {
                this.switchGame('lobby');
            }
        });
    }

    bindActiveTabEvents(gamePanel) {
        const refreshCb = () => this.refreshBalanceDisplay();

        if (this.activeTab === 'lobby') {
            this.bindLobbyEvents(gamePanel);
            return;
        }

        // In-game Return to Lobby Button
        const returnBtn = gamePanel.querySelector('#btn-in-game-return-lobby') || gamePanel.querySelector('.btn-return-lobby');
        if (returnBtn) {
            returnBtn.addEventListener('click', () => {
                pixiEffects.buttonPress(returnBtn);
                this.switchGame('lobby');
            });
        }

        if (this.activeTab === 'slot') {
            this.slot.bindEvents(gamePanel, refreshCb);
        } else if (this.activeTab === 'mahjong') {
            this.mahjong.bindEvents(gamePanel, refreshCb);
        } else if (this.activeTab === 'zeus') {
            this.zeus.bindEvents(gamePanel, refreshCb);
        } else if (this.activeTab === 'lottery') {
            this.lottery.bindEvents(gamePanel, refreshCb);
        } else if (this.activeTab === 'wheel') {
            this.wheel.bindEvents(gamePanel, refreshCb);
        } else if (this.activeTab === 'parlay') {
            this.parlay.bindEvents(gamePanel, refreshCb);
        }
    }

    bindLobbyEvents(gamePanel) {
        // 1. Showcase Game Cards Click (Directly switch to that game)
        gamePanel.querySelectorAll('.lobby-game-showcase-card, .btn-play-showcase').forEach(el => {
            el.addEventListener('click', (e) => {
                const gameId = el.dataset.gameId || el.closest('[data-game-id]')?.dataset.gameId;
                if (gameId) {
                    pixiEffects.buttonPress(el);
                    this.switchGame(gameId);
                }
            });
        });

        // 2. VIP Faucet Claim Button
        const faucetBtn = gamePanel.querySelector('#lobby-btn-faucet');
        if (faucetBtn) {
            faucetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                rewardManager.claimFaucet(faucetBtn);
            });
        }

        // 3. Daily Streak Claim Button
        const streakBtn = gamePanel.querySelector('#lobby-btn-streak');
        if (streakBtn) {
            streakBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                rewardManager.claimDailyStreak(streakBtn);
            });
        }

        // 4. Bailout Emergency Claim Button
        const bailoutBtn = gamePanel.querySelector('#lobby-btn-bailout');
        if (bailoutBtn) {
            bailoutBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                rewardManager.claimBailout(bailoutBtn);
            });
        }

        // 5. Quests Modal Button
        const questsBtn = gamePanel.querySelector('#lobby-btn-quests');
        if (questsBtn) {
            questsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                pixiEffects.buttonPress(questsBtn);
                rewardManager.openModal('quests');
            });
        }

        // 6. Luck Pity Info Button
        const luckBtn = gamePanel.querySelector('#lobby-btn-luck-info');
        if (luckBtn) {
            luckBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                pixiEffects.buttonPress(luckBtn);
                AuraSound.playTap();
                const info = casinoVolatility.getLuckInfo();
                ui.info(
                    `Akumulasi Kalah: ${info.losses} / ${info.target} (${info.percent}%)\n` +
                    `Tingkat Status: ${info.tierLabel}\n` +
                    `Pity Multiplier: ${info.multiplier.toFixed(2)}×\n\n` +
                    `Kekalahan dari semua permainan diakumulasi. Pada 250 kekalahan, RATE ON akan aktif sampai memenangkan Jackpot!`,
                    '✨ Pengukur Status Keberuntungan'
                );
            });
        }

        // 7. Sound Toggle in Lobby Footer
        const soundBtn = gamePanel.querySelector('#lobby-btn-sound');
        if (soundBtn) {
            const updateSoundBtn = () => {
                const enabled = gameState.get('settings.soundEnabled') !== false;
                soundBtn.textContent = enabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
                soundBtn.style.opacity = enabled ? '1' : '0.6';
            };
            updateSoundBtn();

            soundBtn.addEventListener('click', () => {
                pixiEffects.buttonPress(soundBtn);
                const current = gameState.get('settings.soundEnabled') !== false;
                const next = !current;
                gameState.set('settings.soundEnabled', next);
                updateSoundBtn();
                if (next) AuraSound.playTap();
                ui.info(next ? 'Efek suara diaktifkan' : 'Efek suara dinonaktifkan', 'Audio Setting');
            });
        }

        // 8. Reset Progres Button in Lobby Footer
        const resetBtn = gamePanel.querySelector('#lobby-btn-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                pixiEffects.buttonPress(resetBtn);
                if (confirm('Apakah Anda yakin ingin me-reset saldo dan progres game ke 10.000.000 TC?')) {
                    gameState.reset();
                    AuraSound.playTap();
                    ui.info('Saldo dan game state telah di-reset ke nilai default.', 'Reset Berhasil');
                    this.refreshBalanceDisplay();
                    this.switchGame('lobby');
                }
            });
        }

        // Live sync timers and status
        rewardManager._updateLobbyLiveElements?.();
        this.updateLuckMeter();
    }

    refreshBalanceDisplay() {
        const bal = gameState.getBalance();
        const formatted = financeManager.formatCurrency(bal);

        const slotHudBal = document.getElementById('slot-player-balance');
        if (slotHudBal) slotHudBal.textContent = formatted;

        const casinoEl = document.getElementById('casino-player-balance-value');
        if (casinoEl) casinoEl.textContent = `${formatted} TC`;

        const topHeaderBal = document.getElementById('header-chip-balance');
        if (topHeaderBal) {
            topHeaderBal.textContent = `${formatted} TC`;
            topHeaderBal.title = `Saldo: ${new Intl.NumberFormat('id-ID').format(Math.round(bal))} TC`;
        }

        const sidebarBal = document.getElementById('sidebar-balance-value');
        if (sidebarBal) sidebarBal.textContent = `${financeManager.formatCurrency(bal, true)} TC`;

        const mainBal = document.getElementById('balance-value');
        if (mainBal) mainBal.textContent = `${formatted} TC`;
    }
}

export default new GamblingPanel();
