/**
 * GamblingPanel.js - Trilliun Chip VIP Casino Terminal
 * Features:
 * - Goldy Crush Slot (6x3)
 * - Mahjong Ways Slot (6x3)
 * - Zeus Gates Slot (6x3)
 * - Mega Lottery (Togel Progresif)
 * - Spinning Wheel (Roda Keberuntungan & Kripto)
 * - Parlay Sports & Club Betting
 */

import financeManager from './finance/FinanceManager.js';
import gameState from './core/GameState.js';
import ui from './ui/UIManager.js';
import viewManager from './ui/ViewManager.js';
import pixiEffects from './graphics/PixiEffects.js';

import { SlotEngine } from './casino/SlotEngine.js';
import { MahjongSlotEngine } from './casino/MahjongSlotEngine.js';
import { ZeusSlotEngine } from './casino/ZeusSlotEngine.js';
import { LotteryEngine } from './casino/LotteryEngine.js';
import { WheelEngine } from './casino/WheelEngine.js';
import { ParlayEngine } from './casino/ParlayEngine.js';
import casinoVolatility from './casino/CasinoVolatilityEngine.js';

const GAME_CATALOG = {
    slot: { id: 'slot', name: 'Goldy Crush', icon: '🎰', fullTitle: '🎰 Goldy Crush (6x3)', reel: '6x3 REEL' },
    mahjong: { id: 'mahjong', name: 'Mahjong Ways', icon: '🀄', fullTitle: '🀄 Mahjong Ways Macau (6x8)', reel: '6x8 REEL' },
    zeus: { id: 'zeus', name: 'Gates of Olympus', icon: '⚡', fullTitle: '⚡ Gates of Olympus (6x5)', reel: '6x5 REEL' },
    wheel: { id: 'wheel', name: 'Mega Wheel', icon: '🎡', fullTitle: '🎡 Mega Fortune Wheel', reel: 'INSTANT' },
    lottery: { id: 'lottery', name: 'Lotre 4D', icon: '🎫', fullTitle: '🎫 Lotre Mega Progresif 4D', reel: 'JACKPOT' },
    parlay: { id: 'parlay', name: 'Parlay Bola', icon: '⚽', fullTitle: '⚽ Parlay Sepak Bola Eropa', reel: 'SPORTSBOOK' }
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
        this.activeTab = 'slot'; // 'slot' | 'mahjong' | 'zeus' | 'lottery' | 'wheel' | 'parlay'
        this._lobbyEventsBound = false;

        // Auto-update luck meter and rate badges whenever casino loss counter updates
        gameState.on('casino.ratePlays', () => {
            this.updateLuckMeter();
            this.updateHeaderRateBadge();
        });
    }

    getGameMeta(tabId) {
        return GAME_CATALOG[tabId] || GAME_CATALOG.slot;
    }

    show() {
        const balance = gameState.getBalance();

        // Screen is 100% dedicated to the active machine theater (no horizontal tab bloat)
        const content = `
            <div class="casino-root" style="padding: 0.1rem 0.25rem; max-width: 1040px; margin: 0 auto; width: 100%;">
                <!-- ── Main Game Board (Reels Front & Center) ── -->
                <div class="casino-board" style="position: relative; padding: 0;">
                    <!-- Active View Panel -->
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
                @keyframes spin { to { transform: rotate(360deg); } }
            </style>
        `;

        viewManager.showDynamicView('Trilliun Chip', 'VIP Casino & Slots Entertainment Suite', content);
        this._bindEvents();
    }

    getActiveTabHTML() {
        switch (this.activeTab) {
            case 'slot': return this.slot.getHTML();
            case 'mahjong': return this.mahjong.getHTML();
            case 'zeus': return this.zeus.getHTML();
            case 'lottery': return this.lottery.getHTML();
            case 'wheel': return this.wheel.getHTML();
            case 'parlay': return this.parlay.getHTML();
            default: return this.slot.getHTML();
        }
    }

    openLobby() {
        const drawer = document.getElementById('lobby-drawer');
        const overlay = document.getElementById('lobby-drawer-overlay');
        if (!drawer || !overlay) return;
        drawer.classList.add('open');
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
        this.updateLobbyUI();
    }

    closeLobby() {
        const drawer = document.getElementById('lobby-drawer');
        const overlay = document.getElementById('lobby-drawer-overlay');
        if (!drawer || !overlay) return;
        drawer.classList.remove('open');
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
    }

    toggleLobby() {
        const drawer = document.getElementById('lobby-drawer');
        if (drawer && drawer.classList.contains('open')) {
            this.closeLobby();
        } else {
            this.openLobby();
        }
    }

    switchGame(tabId) {
        if (!GAME_CATALOG[tabId]) return;
        if (tabId === this.activeTab) {
            this.closeLobby();
            return;
        }

        // Cek apakah ada game yang sedang berjalan / spinning
        if ((this.slot && (this.slot.isSpinning || this.slot.isAutoSpinning)) ||
            (this.mahjong && (this.mahjong.isSpinning || this.mahjong.isAutoSpinning)) ||
            (this.zeus && (this.zeus.isSpinning || this.zeus.isAutoSpinning)) ||
            (this.wheel && (this.wheel.isSpinning || this.wheel.isAutoSpinning))) {
            
            ui.error("Harap hentikan putaran / spin terlebih dahulu sebelum berpindah game!");
            return;
        }

        // Stop any running animations / spins
        this.slot.stopAutoSpin();
        this.mahjong.stopAutoSpin();
        this.zeus.stopAutoSpin();
        this.wheel.stopAutoSpin();

        this.activeTab = tabId;
        this.updateLobbyUI();
        this.closeLobby();

        // Update active game content with GSAP entrance animation
        const gamePanel = document.getElementById('casino-game-panel');
        if (gamePanel) {
            gamePanel.innerHTML = this.getActiveTabHTML();
            this.bindActiveTabEvents(gamePanel);
            if (window.gsap) {
                window.gsap.fromTo(gamePanel, 
                    { opacity: 0, y: 16, scale: 0.98 }, 
                    { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: 'power2.out' }
                );
            }
        }

        const meta = this.getGameMeta(tabId);
        ui.info(`Beralih ke wahana ${meta.name}`, '🎮 Game Dimuat');
    }

    updateHeaderRateBadge() {
        const headerRateContainer = document.getElementById('header-rate-badge-container');
        if (headerRateContainer) {
            let rateHTML = '';
            if (this.activeTab === 'slot' && this.slot) {
                rateHTML = this.slot.getRateStatusHTML();
            } else if (this.activeTab === 'mahjong' && this.mahjong) {
                rateHTML = this.mahjong.getRateStatusHTML();
            } else if (this.activeTab === 'zeus' && this.zeus) {
                rateHTML = this.zeus.getRateStatusHTML();
            } else if (this.activeTab === 'wheel' && this.wheel) {
                rateHTML = this.wheel.getRateStatusHTML();
            } else if (this.activeTab === 'lottery' && this.lottery) {
                rateHTML = this.lottery.getRateStatusHTML();
            } else if (this.activeTab === 'parlay' && this.parlay) {
                rateHTML = this.parlay.getRateStatusHTML();
            }
            headerRateContainer.innerHTML = rateHTML;
        }
    }

    updateLuckMeter() {
        const info = casinoVolatility.getLuckInfo();

        const statusEl = document.getElementById('drawer-luck-status');
        if (statusEl) {
            statusEl.textContent = `${info.tierLabel} • ${info.losses} Kalah`;
        }

        const badgeContainer = document.getElementById('drawer-luck-badge-container');
        if (badgeContainer) {
            badgeContainer.innerHTML = info.isRateOn
                ? `<div class="rate-badge rate-on-badge" style="display:inline-flex; align-items:center; gap:0.25rem; background:linear-gradient(135deg,#ef4444,#fbbf24); color:#fff; font-weight:900; font-size:0.68rem; padding:0.18rem 0.55rem; border-radius:999px; box-shadow:0 0 10px rgba(239,68,68,0.5); animation: rateGlow 1s ease-in-out infinite alternate; text-transform:uppercase; letter-spacing:0.05em; border: 1.5px solid #fff;">⚡ RATE ON</div>`
                : `<div class="rate-badge rate-off-badge" style="display:inline-flex; align-items:center; gap:0.25rem; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:rgba(255,255,255,0.65); font-weight:800; font-size:0.65rem; padding:0.18rem 0.5rem; border-radius:999px; text-transform:uppercase; letter-spacing:0.05em;">Rate: OFF (${info.losses}/250)</div>`;
        }

        const barEl = document.getElementById('drawer-luck-bar');
        if (barEl) {
            barEl.style.width = `${info.percent}%`;
            barEl.classList.toggle('rate-on', info.isRateOn);
        }

        const accumEl = document.getElementById('drawer-luck-accum-info');
        if (accumEl) {
            accumEl.textContent = `Akumulasi Kalah: ${info.losses} / ${info.target}`;
        }

        const rateLabelEl = document.getElementById('drawer-luck-rate-label');
        if (rateLabelEl) {
            rateLabelEl.textContent = info.isRateOn 
                ? '⚡ GACOR (3.5×)' 
                : `${info.percent}% (${info.multiplier.toFixed(2)}×)`;
            rateLabelEl.style.color = info.badgeColor;
        }
    }

    updateLobbyUI() {
        const meta = this.getGameMeta(this.activeTab);

        // Update header active game pill
        const headerPill = document.getElementById('header-active-game-pill');
        if (headerPill) {
            headerPill.innerHTML = `<span>${meta.icon}</span> ${meta.name}`;
        }

        // Update header rate badge for active game
        this.updateHeaderRateBadge();

        // Update drawer current game banner
        const drawerTitle = document.getElementById('drawer-current-game-title');
        if (drawerTitle) {
            drawerTitle.textContent = meta.fullTitle;
        }

        // Update luck meter widget inside drawer
        this.updateLuckMeter();

        // Update game cards active state
        document.querySelectorAll('#drawer-game-grid .lobby-game-card').forEach(card => {
            const isCurrent = card.dataset.gameId === this.activeTab;
            card.classList.toggle('active', isCurrent);
            const actionEl = card.querySelector('.game-card-action');
            if (actionEl) {
                actionEl.textContent = isCurrent ? 'AKTIF' : 'MAIN';
            }
        });
    }

    _bindEvents() {
        const container = document.getElementById('dynamic-view-content') || document.getElementById('app');
        if (!container) return;

        // Bind Drawer controls once
        this._bindLobbyDrawerEvents();

        // Initial binding for active tab
        const gamePanel = document.getElementById('casino-game-panel');
        if (gamePanel) {
            this.bindActiveTabEvents(gamePanel);
        }

        this.updateLobbyUI();
    }

    _bindLobbyDrawerEvents() {
        if (this._lobbyEventsBound) return;
        this._lobbyEventsBound = true;

        // Open lobby buttons (Header button + any in-game quick pills)
        document.addEventListener('click', (e) => {
            const openBtn = e.target.closest('#btn-open-lobby') || e.target.closest('.btn-lobby-pill');
            if (openBtn) {
                e.preventDefault();
                pixiEffects.buttonPress(openBtn);
                this.openLobby();
                return;
            }

            const closeBtn = e.target.closest('#btn-close-lobby') || e.target.closest('#lobby-drawer-overlay');
            if (closeBtn) {
                e.preventDefault();
                this.closeLobby();
                return;
            }

            const gameCard = e.target.closest('#drawer-game-grid .lobby-game-card');
            if (gameCard) {
                e.preventDefault();
                pixiEffects.buttonPress(gameCard);
                const gameId = gameCard.dataset.gameId;
                this.switchGame(gameId);
                return;
            }
        });

        // Keyboard navigation (Esc to close, L to toggle)
        document.addEventListener('keydown', (e) => {
            // Ignore if user is currently typing in an input
            const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

            if (e.key === 'Escape') {
                this.closeLobby();
            } else if (e.key === 'l' || e.key === 'L') {
                this.toggleLobby();
            }
        });
    }

    bindActiveTabEvents(gamePanel) {
        const refreshCb = () => this.refreshBalanceDisplay();
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

    getLuckStatus() {
        const info = casinoVolatility.getLuckInfo();
        if (info.isRateOn) {
            return `🔥 RATE ON GACOR (3.5×)`;
        }
        return `${info.tierIcon} ${info.tierLabel} • ${info.losses} Kalah`;
    }

    refreshBalanceDisplay() {
        const bal = gameState.getBalance();
        const formatted = financeManager.formatCurrency(bal);

        const slotHudBal = document.getElementById('slot-player-balance');
        if (slotHudBal) slotHudBal.textContent = formatted;

        const casinoEl = document.getElementById('casino-player-balance-value');
        if (casinoEl) casinoEl.textContent = `${formatted} TC`;

        const topHeaderBal = document.getElementById('header-chip-balance');
        if (topHeaderBal) topHeaderBal.textContent = `${formatted} TC`;

        const sidebarBal = document.getElementById('sidebar-balance-value');
        if (sidebarBal) sidebarBal.textContent = `${financeManager.formatCurrency(bal, true)} TC`;

        const mainBal = document.getElementById('balance-value');
        if (mainBal) mainBal.textContent = `${formatted} TC`;
    }
}

export default new GamblingPanel();
