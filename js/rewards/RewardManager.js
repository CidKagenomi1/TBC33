/**
 * RewardManager.js - VIP Rewards, Timed Claims, Daily Streak & Quest Engine
 * Provides casual and engaging gamification for Trilliun-Bet33:
 * - Timed Cooldown Faucet (15-minute claims)
 * - VIP Emergency Bailout (instant bailout chips if bankrupt)
 * - 7-Day Consecutive Login Streak
 * - Real-time Daily Quests & Progress Tracking
 * - Long-term VIP Achievements
 * - Rich Interactive Rewards Center Modal
 */

import gameState from '../core/GameState.js';
import financeManager from '../finance/FinanceManager.js';
import ui from '../ui/UIManager.js';
import AuraSound from '../ui/AuraSound.js';
import pixiEffects from '../graphics/PixiEffects.js';

export const FAUCET_COOLDOWN_MS = 15 * 60 * 1000; // 15 Menit Cooldown
export const FAUCET_AMOUNT = 5000000;             // 5.000.000 TC
export const BAILOUT_THRESHOLD = 100000;          // Saldo < 100k = Bangkrut
export const BAILOUT_AMOUNT = 5000000;            // 5.000.000 TC

export const DAILY_STREAK_REWARDS = [
    { day: 1, chips: 5000000, label: '5M', bonus: '' },
    { day: 2, chips: 8000000, label: '8M', bonus: '' },
    { day: 3, chips: 12000000, label: '12M', bonus: '+1 Tiket Lotre', lotteryTokens: 1 },
    { day: 4, chips: 18000000, label: '18M', bonus: '' },
    { day: 5, chips: 25000000, label: '25M', bonus: '+2 Tiket Lotre', lotteryTokens: 2 },
    { day: 6, chips: 40000000, label: '40M', bonus: '' },
    { day: 7, chips: 100000000, label: '100M', bonus: '+5 Tiket Lotre! 🎉', lotteryTokens: 5, isGrand: true }
];

export const QUEST_DEFINITIONS = [
    {
        id: 'slotSpins',
        title: 'Spin Master Slot',
        desc: 'Putar mesin slot 15 kali (Goldy Crush, Mahjong, atau Zeus)',
        icon: '🎰',
        target: 15,
        rewardChips: 10000000,
        unit: 'Spin'
    },
    {
        id: 'bigWin',
        title: 'Pesta Kemenangan Besar',
        desc: 'Dapatkan kemenangan minimal 3x lipat nilai taruhan',
        icon: '💥',
        target: 1,
        rewardChips: 15000000,
        unit: 'Win'
    },
    {
        id: 'highRollerBet',
        title: 'Taruhan High Roller',
        desc: 'Pasang taruhan bernilai minimal 1.000.000 TC',
        icon: '💎',
        target: 1,
        rewardChips: 12000000,
        unit: 'Bet'
    },
    {
        id: 'wheelSpins',
        title: 'Putaran Keberuntungan',
        desc: 'Putar Mega Fortune Wheel 2 kali',
        icon: '🎡',
        target: 2,
        rewardChips: 10000000,
        unit: 'Putaran'
    },
    {
        id: 'lotteryTickets',
        title: 'Investor Togel 4D',
        desc: 'Beli minimal 2 tiket Lotre Mega Progresif',
        icon: '🎫',
        target: 2,
        rewardChips: 8000000,
        unit: 'Tiket'
    },
    {
        id: 'parlayBets',
        title: 'Analis Parlay Sports',
        desc: 'Pasang 1 taruhan tiket Parlay / Derby',
        icon: '🚀',
        target: 1,
        rewardChips: 12000000,
        unit: 'Taruhan'
    }
];

export const ACHIEVEMENT_DEFINITIONS = [
    {
        id: 'totalSpins50',
        title: 'Pecandu Putaran',
        desc: 'Mainkan total 50 putaran mesin kasino',
        icon: '🥉',
        target: 50,
        metric: 'stats.totalSpins',
        rewardChips: 25000000
    },
    {
        id: 'totalWon100M',
        title: 'Sultan Menang Besar',
        desc: 'Akumulasikan total kemenangan 100.000.000 TC',
        icon: '🥈',
        target: 100000000,
        metric: 'player.totalWon',
        rewardChips: 50000000
    },
    {
        id: 'reach500MBalance',
        title: 'Trillionaire Club VIP',
        desc: 'Miliki saldo mencapai 500.000.000 TC di dompet kasino',
        icon: '👑',
        target: 500000000,
        metric: 'player.balance',
        rewardChips: 100000000
    },
    {
        id: 'mahjongCombo',
        title: 'Kebangkitan Naga Mahjong',
        desc: 'Dapatkan kombo runtuhan beruntun di Mahjong Ways',
        icon: '🐉',
        target: 1,
        metric: 'achievements.mahjongCombo.count',
        rewardChips: 30000000
    },
    {
        id: 'zeusLightning',
        title: 'Kemurkaan Dewa Petir',
        desc: 'Dapatkan pengali petir Zeus di Gates of Olympus',
        icon: '⚡',
        target: 1,
        metric: 'achievements.zeusLightning.count',
        rewardChips: 30000000
    }
];

class RewardManager {
    constructor() {
        this.activeTab = 'faucet'; // 'faucet' | 'quests' | 'achievements'
        this.tickerInterval = null;
        this.modalEl = null;
    }

    init() {
        this._ensureStateDefaults();
        this._checkDailyReset();
        this._startTicker();
        this._mountModalContainer();
        this._bindGameStateListeners();
        this.updateHeaderDisplay();
    }

    _bindGameStateListeners() {
        gameState.on('balanceChanged', () => {
            this.updateHeaderDisplay();
            this._checkAchievements();
            this._updateModalLiveElements();
            this._updateLobbyLiveElements();
        });

        gameState.on('expense', (data) => {
            if (!data) return;
            const desc = data.description || '';
            const amt = data.amount || 0;
            if (desc.includes('Slot 6x3') || desc.includes('Slot 6x8') || desc.includes('Slot 6x5')) {
                this.trackSpin('slot', amt);
            } else if (desc.includes('Roda Keberuntungan')) {
                this.trackWheelSpin();
            } else if (desc.includes('Tiket Lotre')) {
                const match = desc.match(/Membeli\s+(\d+)\s+Tiket/);
                const qty = match ? parseInt(match[1], 10) : 1;
                this.trackLotteryPurchase(qty);
            } else if (desc.includes('Parlay')) {
                this.trackParlayBet(amt);
            }
        });

        gameState.on('action:slotWin', (data) => {
            if (!data) return;
            this.trackWin(data.gameId || 'slot', data.winAmount || 0, data.betAmount || 0);
        });

        gameState.on('action:mahjongCombo', () => {
            this.trackMahjongCombo();
        });

        gameState.on('action:zeusLightning', () => {
            this.trackZeusLightning();
        });
    }

    _ensureStateDefaults() {
        const rewards = gameState.get('rewards');
        if (!rewards) {
            gameState.set('rewards', {
                lastFaucetClaim: 0,
                lastDailyClaimDate: null,
                dailyStreak: 0,
                dailyDate: this._getTodayDateString(),
                dailyQuests: {},
                achievements: {},
                stats: {
                    totalSpins: 0,
                    totalWheelSpins: 0,
                    totalLotteryTickets: 0,
                    totalParlayBets: 0,
                    highestWin: 0
                }
            });
        }
    }

    _getTodayDateString() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    _checkDailyReset() {
        const today = this._getTodayDateString();
        const savedDate = gameState.get('rewards.dailyDate');

        if (savedDate !== today) {
            console.log(`[RewardManager] New day detected (${today}). Resetting daily quests.`);
            // Reset quests progress
            const quests = {};
            QUEST_DEFINITIONS.forEach(q => {
                quests[q.id] = { progress: 0, target: q.target, claimed: false };
            });

            gameState.update('rewards', r => ({
                ...(r || {}),
                dailyDate: today,
                dailyQuests: quests
            }));
        }
    }

    _startTicker() {
        if (this.tickerInterval) clearInterval(this.tickerInterval);
        this.tickerInterval = setInterval(() => {
            this.updateHeaderDisplay();
            this._updateModalLiveElements();
            this._updateLobbyLiveElements();
        }, 1000);
    }

    /* ── Cooldown Faucet & Bailout Helpers ── */

    getFaucetRemainingSeconds() {
        const lastClaim = gameState.get('rewards.lastFaucetClaim') || 0;
        const now = Date.now();
        const elapsed = now - lastClaim;
        const remaining = Math.max(0, Math.ceil((FAUCET_COOLDOWN_MS - elapsed) / 1000));
        return remaining;
    }

    isFaucetReady() {
        return this.getFaucetRemainingSeconds() <= 0;
    }

    isBankrupt() {
        return (gameState.getBalance() || 0) < BAILOUT_THRESHOLD;
    }

    canClaimDailyStreak() {
        const today = this._getTodayDateString();
        const lastClaim = gameState.get('rewards.lastDailyClaimDate');
        return lastClaim !== today;
    }

    getCurrentStreakDay() {
        const current = gameState.get('rewards.dailyStreak') || 0;
        // 1 to 7 cycle
        return ((current) % 7) + 1;
    }

    getClaimableCount() {
        let count = 0;
        if (this.isFaucetReady()) count++;
        if (this.isBankrupt()) count++;
        if (this.canClaimDailyStreak()) count++;

        // Count quests
        const quests = gameState.get('rewards.dailyQuests') || {};
        QUEST_DEFINITIONS.forEach(q => {
            const data = quests[q.id];
            if (data && data.progress >= q.target && !data.claimed) count++;
        });

        // Count achievements
        const achs = gameState.get('rewards.achievements') || {};
        ACHIEVEMENT_DEFINITIONS.forEach(a => {
            const data = achs[a.id];
            if (this.isAchievementComplete(a) && !(data?.claimed)) count++;
        });

        return count;
    }

    /* ── Tracking Engine Actions ── */

    trackSpin(gameId, betAmount = 0) {
        this._ensureStateDefaults();
        // Stats
        let totalSpins = (gameState.get('rewards.stats.totalSpins') || 0) + 1;
        gameState.set('rewards.stats.totalSpins', totalSpins);

        // Daily Quest: slotSpins
        if (['slot', 'mahjong', 'zeus'].includes(gameId)) {
            this._incrementQuestProgress('slotSpins', 1);
        }

        // Daily Quest: highRollerBet
        if (betAmount >= 1000000) {
            this._incrementQuestProgress('highRollerBet', 1);
        }

        this._checkAchievements();
        this.updateHeaderDisplay();
    }

    trackWin(gameId, winAmount = 0, betAmount = 0) {
        this._ensureStateDefaults();
        if (winAmount <= 0) return;

        // Daily Quest: bigWin (win >= 3x bet)
        if (betAmount > 0 && winAmount >= betAmount * 3) {
            this._incrementQuestProgress('bigWin', 1);
        }

        // Stats: highest win
        const highest = gameState.get('rewards.stats.highestWin') || 0;
        if (winAmount > highest) {
            gameState.set('rewards.stats.highestWin', winAmount);
        }

        this._checkAchievements();
        this.updateHeaderDisplay();
    }

    trackWheelSpin() {
        this._ensureStateDefaults();
        let wheelSpins = (gameState.get('rewards.stats.totalWheelSpins') || 0) + 1;
        gameState.set('rewards.stats.totalWheelSpins', wheelSpins);
        this._incrementQuestProgress('wheelSpins', 1);
        this.updateHeaderDisplay();
    }

    trackLotteryPurchase(qty = 1) {
        this._ensureStateDefaults();
        let lotto = (gameState.get('rewards.stats.totalLotteryTickets') || 0) + qty;
        gameState.set('rewards.stats.totalLotteryTickets', lotto);
        this._incrementQuestProgress('lotteryTickets', qty);
        this.updateHeaderDisplay();
    }

    trackParlayBet(amount = 0) {
        this._ensureStateDefaults();
        let parlay = (gameState.get('rewards.stats.totalParlayBets') || 0) + 1;
        gameState.set('rewards.stats.totalParlayBets', parlay);
        this._incrementQuestProgress('parlayBets', 1);
        this.updateHeaderDisplay();
    }

    trackMahjongCombo() {
        this._ensureStateDefaults();
        const count = (gameState.get('rewards.achievements.mahjongCombo.count') || 0) + 1;
        gameState.set('rewards.achievements.mahjongCombo.count', count);
        this._checkAchievements();
    }

    trackZeusLightning() {
        this._ensureStateDefaults();
        const count = (gameState.get('rewards.achievements.zeusLightning.count') || 0) + 1;
        gameState.set('rewards.achievements.zeusLightning.count', count);
        this._checkAchievements();
    }

    _incrementQuestProgress(questId, amount = 1) {
        const questDef = QUEST_DEFINITIONS.find(q => q.id === questId);
        if (!questDef) return;

        const currentData = gameState.get(`rewards.dailyQuests.${questId}`) || { progress: 0, target: questDef.target, claimed: false };
        if (currentData.claimed) return;

        const oldProgress = currentData.progress;
        const newProgress = Math.min(questDef.target, oldProgress + amount);

        gameState.set(`rewards.dailyQuests.${questId}`, {
            progress: newProgress,
            target: questDef.target,
            claimed: false
        });

        // Notify user if completed just now
        if (oldProgress < questDef.target && newProgress >= questDef.target) {
            AuraSound.playSuccessAlert();
            ui.toast({
                type: 'success',
                title: '🎯 Misi Harian Selesai!',
                message: `Misi "${questDef.title}" berhasil diselesaikan! Buka Rewards Center untuk klaim +${financeManager.formatCurrency(questDef.rewardChips)} TC!`
            });
        }
    }

    _checkAchievements() {
        ACHIEVEMENT_DEFINITIONS.forEach(ach => {
            const achData = gameState.get(`rewards.achievements.${ach.id}`) || {};
            if (!achData.claimed && this.isAchievementComplete(ach) && !achData.notified) {
                achData.notified = true;
                gameState.set(`rewards.achievements.${ach.id}`, achData);
                AuraSound.playSuccessAlert();
                ui.toast({
                    type: 'success',
                    title: '🏆 Prestasi VIP Tercapai!',
                    message: `Anda membuka prestasi "${ach.title}"! Ambil hadiah +${financeManager.formatCurrency(ach.rewardChips)} TC!`
                });
            }
        });
    }

    isAchievementComplete(ach) {
        if (ach.id === 'totalSpins50') {
            return (gameState.get('rewards.stats.totalSpins') || 0) >= ach.target;
        }
        if (ach.id === 'totalWon100M') {
            return (gameState.get('player.totalWon') || 0) >= ach.target;
        }
        if (ach.id === 'reach500MBalance') {
            return (gameState.getBalance() || 0) >= ach.target;
        }
        if (ach.id === 'mahjongCombo') {
            return (gameState.get('rewards.achievements.mahjongCombo.count') || 0) >= ach.target;
        }
        if (ach.id === 'zeusLightning') {
            return (gameState.get('rewards.achievements.zeusLightning.count') || 0) >= ach.target;
        }
        return false;
    }

    /* ── Claim Handlers ── */

    claimFaucet(sourceElement = null) {
        if (!this.isFaucetReady()) {
            const sec = this.getFaucetRemainingSeconds();
            const min = Math.floor(sec / 60);
            const s = sec % 60;
            ui.warning(`Klaim faucet masih dalam pendingin (Cooldown)! Sisa waktu: ${min}m ${s}s`, '⏳ Belum Siap');
            return false;
        }

        gameState.set('rewards.lastFaucetClaim', Date.now());
        financeManager.topUp(FAUCET_AMOUNT, 'VIP Timed Faucet (15 Menit)');

        AuraSound.playClaimMoney();
        if (sourceElement) {
            pixiEffects.buttonPress(sourceElement);
            pixiEffects.flyChipsToHeader(sourceElement, 15);
        }

        ui.success(`+${financeManager.formatCurrency(FAUCET_AMOUNT)} TC berhasil diklaim dari VIP Faucet!`, '🎉 Bonus Faucet 15 Menit');
        this.updateHeaderDisplay();
        this.renderModalContent();
        return true;
    }

    claimBailout(sourceElement = null) {
        if (!this.isBankrupt()) {
            ui.info('Saldo Anda masih cukup! Bantuan darurat hanya untuk saldo di bawah 100.000 TC.', 'Bantuan Darurat');
            return false;
        }

        financeManager.topUp(BAILOUT_AMOUNT, 'VIP Emergency Bailout');
        AuraSound.playClaimMoney();
        if (sourceElement) {
            pixiEffects.buttonPress(sourceElement);
            pixiEffects.flyChipsToHeader(sourceElement, 15);
        }

        ui.success(`🚨 DANA TALANGAN DARURAT: +${financeManager.formatCurrency(BAILOUT_AMOUNT)} TC disuntikkan ke saldo Anda! Terus berjuang!`, 'Bantuan Saldo Bangkrut');
        this.updateHeaderDisplay();
        this.renderModalContent();
        return true;
    }

    claimDailyStreak(sourceElement = null) {
        if (!this.canClaimDailyStreak()) {
            ui.info('Anda sudah mengklaim hadiah streak hari ini! Silakan kembali besok.', 'Absensi Harian');
            return false;
        }

        const today = this._getTodayDateString();
        const currentStreak = this.getCurrentStreakDay();
        const rewardObj = DAILY_STREAK_REWARDS[currentStreak - 1];

        // Award chips
        financeManager.topUp(rewardObj.chips, `Daily Streak Hari #${currentStreak}`);

        // Award bonus lottery tokens if any
        if (rewardObj.lotteryTokens) {
            const currTokens = gameState.get('casino.lotteryTokens') || 0;
            gameState.set('casino.lotteryTokens', currTokens + rewardObj.lotteryTokens);
        }

        // Update streak
        gameState.set('rewards.lastDailyClaimDate', today);
        gameState.set('rewards.dailyStreak', (gameState.get('rewards.dailyStreak') || 0) + 1);

        AuraSound.playClaimMoney();
        if (sourceElement) {
            pixiEffects.buttonPress(sourceElement);
            pixiEffects.flyChipsToHeader(sourceElement, 18);
        }

        ui.success(`Absensi Hari #${currentStreak} Berhasil! +${financeManager.formatCurrency(rewardObj.chips)} TC ${rewardObj.bonus ? '(' + rewardObj.bonus + ')' : ''}`, '🎉 Daily Login Streak');
        this.updateHeaderDisplay();
        this.renderModalContent();
        return true;
    }

    claimQuest(questId, sourceElement = null) {
        const questDef = QUEST_DEFINITIONS.find(q => q.id === questId);
        if (!questDef) return false;

        const data = gameState.get(`rewards.dailyQuests.${questId}`);
        if (!data || data.progress < questDef.target || data.claimed) {
            ui.warning('Misi belum selesai atau sudah diklaim!', 'Misi Harian');
            return false;
        }

        gameState.set(`rewards.dailyQuests.${questId}.claimed`, true);
        financeManager.topUp(questDef.rewardChips, `Misi Harian: ${questDef.title}`);

        AuraSound.playClaimMoney();
        if (sourceElement) {
            pixiEffects.buttonPress(sourceElement);
            pixiEffects.flyChipsToHeader(sourceElement, 15);
        }

        ui.success(`Hadiah Misi "${questDef.title}" +${financeManager.formatCurrency(questDef.rewardChips)} TC berhasil dicairkan!`, '🎯 Misi Berhasil');
        this.updateHeaderDisplay();
        this.renderModalContent();
        return true;
    }

    claimAchievement(achId, sourceElement = null) {
        const achDef = ACHIEVEMENT_DEFINITIONS.find(a => a.id === achId);
        if (!achDef) return false;

        const achData = gameState.get(`rewards.achievements.${achId}`) || {};
        if (achData.claimed || !this.isAchievementComplete(achDef)) {
            ui.warning('Prestasi ini belum tercapai atau hadiah sudah diambil!', 'Prestasi VIP');
            return false;
        }

        achData.claimed = true;
        gameState.set(`rewards.achievements.${achId}`, achData);
        financeManager.topUp(achDef.rewardChips, `Prestasi VIP: ${achDef.title}`);

        AuraSound.playClaimMoney();
        if (sourceElement) {
            pixiEffects.buttonPress(sourceElement);
            pixiEffects.flyChipsToHeader(sourceElement, 25);
        }

        ui.success(`🏆 PRESTASI VIP: "${achDef.title}" +${financeManager.formatCurrency(achDef.rewardChips)} TC telah masuk saldo!`, 'Prestasi VIP Terbuka');
        this.updateHeaderDisplay();
        this.renderModalContent();
        return true;
    }

    /* ── Header & Lobby Drawer Live Binding ── */

    updateHeaderDisplay() {
        const btnHub = document.getElementById('btn-rewards-hub') || document.getElementById('btn-faucet');
        if (!btnHub) return;

        const badgeEl = document.getElementById('header-rewards-badge');
        const textEl = document.getElementById('header-rewards-text');
        const claimableCount = this.getClaimableCount();

        // Update badge
        if (badgeEl) {
            if (claimableCount > 0) {
                badgeEl.style.display = 'inline-flex';
                badgeEl.textContent = claimableCount;
            } else {
                badgeEl.style.display = 'none';
            }
        }

        // Check conditions
        const isBailout = this.isBankrupt();
        const isFaucet = this.isFaucetReady();
        const remainingSec = this.getFaucetRemainingSeconds();

        if (isBailout) {
            btnHub.classList.add('hub-alert');
            btnHub.classList.remove('hub-cooldown');
            if (textEl) textEl.textContent = `5M`;
            btnHub.title = 'Saldo Kritis! Buka Bantuan Darurat VIP 5.000.000 TC';
        } else if (isFaucet || claimableCount > 0) {
            btnHub.classList.remove('hub-alert', 'hub-cooldown');
            btnHub.classList.add('hub-ready');
            if (textEl) textEl.textContent = `+5M`;
            btnHub.title = `Ada ${claimableCount} Hadiah / Misi Siap Diklaim!`;
        } else {
            btnHub.classList.remove('hub-alert', 'hub-ready');
            btnHub.classList.add('hub-cooldown');
            const min = Math.floor(remainingSec / 60);
            const sec = String(remainingSec % 60).padStart(2, '0');
            if (textEl) textEl.textContent = `${min}:${sec}`;
            btnHub.title = `VIP Faucet Cooldown (${min}:${sec}). Buka untuk lihat Misi & Absensi!`;
        }

        // Also update Drawer tool row if available
        const drawerSub = document.getElementById('drawer-faucet-sub');
        if (drawerSub) {
            if (isBailout) {
                drawerSub.textContent = '🚨 Saldo Kritis! Dana Talangan Tersedia';
                drawerSub.style.color = '#ef4444';
            } else if (isFaucet) {
                drawerSub.textContent = '🎁 Siap Klaim +5.000.000 TC!';
                drawerSub.style.color = '#10b981';
            } else {
                const min = Math.floor(remainingSec / 60);
                const sec = String(remainingSec % 60).padStart(2, '0');
                drawerSub.textContent = `Pendingin Cooldown: ${min}:${sec}`;
                drawerSub.style.color = 'rgba(255,255,255,0.5)';
            }
        }
    }

    _updateModalLiveElements() {
        if (!this.modalEl || !this.modalEl.classList.contains('open')) return;

        // Update countdown text inside modal if present
        const modalTimer = document.getElementById('modal-faucet-timer');
        const modalBtn = document.getElementById('modal-btn-claim-faucet');
        if (modalTimer && modalBtn) {
            const sec = this.getFaucetRemainingSeconds();
            if (sec <= 0) {
                modalTimer.textContent = 'SIAP DIKLAIM!';
                modalTimer.style.color = '#10b981';
                modalBtn.disabled = false;
                modalBtn.textContent = '🎁 KLAIM +5.000.000 TC';
                modalBtn.classList.remove('btn-cooldown');
            } else {
                const m = Math.floor(sec / 60);
                const s = String(sec % 60).padStart(2, '0');
                modalTimer.textContent = `Pendingin Cooldown: ${m}:${s}`;
                modalTimer.style.color = '#f59e0b';
                modalBtn.disabled = true;
                modalBtn.textContent = `⏳ COOLDOWN (${m}:${s})`;
                modalBtn.classList.add('btn-cooldown');
            }
        }
    }

    _updateLobbyLiveElements() {
        // 1. Lobby Faucet Timer & Button
        const faucetTimer = document.getElementById('lobby-faucet-timer');
        const faucetBtn = document.getElementById('lobby-btn-faucet');
        if (faucetTimer && faucetBtn) {
            const sec = this.getFaucetRemainingSeconds();
            if (sec <= 0) {
                faucetTimer.textContent = 'SIAP DIKLAIM!';
                faucetTimer.style.color = '#10b981';
                faucetBtn.disabled = false;
                faucetBtn.textContent = '🎁 KLAIM +5M TC';
                faucetBtn.classList.remove('btn-cooldown');
                faucetBtn.classList.add('btn-ready-glow');
            } else {
                const m = Math.floor(sec / 60);
                const s = String(sec % 60).padStart(2, '0');
                faucetTimer.textContent = `Cooldown: ${m}:${s}`;
                faucetTimer.style.color = '#f59e0b';
                faucetBtn.disabled = true;
                faucetBtn.textContent = `⏳ COOLDOWN (${m}:${s})`;
                faucetBtn.classList.add('btn-cooldown');
                faucetBtn.classList.remove('btn-ready-glow');
            }
        }

        // 2. Lobby Daily Streak Status & Button
        const streakBtn = document.getElementById('lobby-btn-streak');
        const streakStatus = document.getElementById('lobby-streak-status');
        if (streakBtn) {
            const canClaim = this.canClaimDailyStreak();
            if (canClaim) {
                streakBtn.disabled = false;
                streakBtn.textContent = '📅 KLAIM HARIAN';
                streakBtn.classList.remove('btn-claimed', 'btn-cooldown');
                streakBtn.classList.add('btn-ready-glow');
                if (streakStatus) {
                    streakStatus.textContent = '✨ Hadiah Absensi Siap Diklaim!';
                    streakStatus.style.color = '#10b981';
                }
            } else {
                streakBtn.disabled = true;
                streakBtn.textContent = '✅ SUDAH KLAIM';
                streakBtn.classList.add('btn-claimed');
                streakBtn.classList.remove('btn-ready-glow');
                if (streakStatus) {
                    streakStatus.textContent = 'Kembali besok untuk streak berikutnya';
                    streakStatus.style.color = 'rgba(255,255,255,0.45)';
                }
            }
        }

        // 3. Lobby Emergency Bailout Alert Card
        const bailoutCard = document.getElementById('lobby-bailout-card');
        if (bailoutCard) {
            const isBankrupt = this.isBankrupt();
            bailoutCard.style.display = isBankrupt ? 'flex' : 'none';
        }
    }

    /* ── Modal Rendering & Logic ── */

    _mountModalContainer() {
        if (document.getElementById('vip-rewards-modal')) return;

        const overlay = document.createElement('div');
        overlay.id = 'vip-rewards-modal';
        overlay.className = 'vip-rewards-overlay';
        overlay.innerHTML = `
            <div class="vip-rewards-dialog" role="dialog" aria-label="VIP Rewards & Quest Center">
                <!-- Modal Header -->
                <div class="rewards-dialog-header">
                    <div class="rewards-title-box">
                        <span class="rewards-header-icon">🎁</span>
                        <div>
                            <h3 class="rewards-modal-title">VIP REWARDS &amp; QUEST CENTER</h3>
                            <span class="rewards-modal-sub">Klaim Chip Gratis, Absensi 7 Hari &amp; Misi Kasino</span>
                        </div>
                    </div>
                    <button type="button" id="btn-close-rewards-modal" class="btn-rewards-close" title="Tutup Modal (Esc)">&times;</button>
                </div>

                <!-- Navigation Tabs -->
                <div class="rewards-tabs-bar">
                    <button type="button" class="rewards-tab-btn active" data-tab="faucet">
                        <span>🎁</span> KLAIM &amp; ABSENSI
                    </button>
                    <button type="button" class="rewards-tab-btn" data-tab="quests">
                        <span>🎯</span> MISI HARIAN
                        <span id="tab-badge-quests" class="tab-mini-badge" style="display:none;">0</span>
                    </button>
                    <button type="button" class="rewards-tab-btn" data-tab="achievements">
                        <span>🏆</span> PRESTASI VIP
                        <span id="tab-badge-achievements" class="tab-mini-badge" style="display:none;">0</span>
                    </button>
                </div>

                <!-- Scrollable Body Content -->
                <div class="rewards-dialog-body" id="rewards-modal-body">
                    <!-- Tab content rendered dynamically -->
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.modalEl = overlay;

        // Bind Close Events
        const closeBtn = overlay.querySelector('#btn-close-rewards-modal');
        closeBtn?.addEventListener('click', () => this.closeModal());

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.closeModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('open')) {
                this.closeModal();
            }
        });

        // Tab Switching
        const tabs = overlay.querySelectorAll('.rewards-tab-btn');
        tabs.forEach(btn => {
            btn.addEventListener('click', () => {
                AuraSound.playClick();
                tabs.forEach(t => t.classList.remove('active'));
                btn.classList.add('active');
                this.activeTab = btn.getAttribute('data-tab');
                this.renderModalContent();
            });
        });
    }

    openModal(tab = 'faucet') {
        this._ensureStateDefaults();
        this._checkDailyReset();
        if (!this.modalEl) this._mountModalContainer();

        this.activeTab = tab;
        const tabs = this.modalEl.querySelectorAll('.rewards-tab-btn');
        tabs.forEach(t => {
            t.classList.toggle('active', t.getAttribute('data-tab') === tab);
        });

        this.renderModalContent();
        this.modalEl.classList.add('open');
        AuraSound.playTap();
    }

    closeModal() {
        if (!this.modalEl) return;
        this.modalEl.classList.remove('open');
        AuraSound.playTap();
    }

    renderModalContent() {
        if (!this.modalEl) return;
        const body = document.getElementById('rewards-modal-body');
        if (!body) return;

        // Update tab notification badges
        this._updateTabBadges();

        if (this.activeTab === 'faucet') {
            body.innerHTML = this._getFaucetTabHTML();
            this._bindFaucetTabEvents();
        } else if (this.activeTab === 'quests') {
            body.innerHTML = this._getQuestsTabHTML();
            this._bindQuestsTabEvents();
        } else if (this.activeTab === 'achievements') {
            body.innerHTML = this._getAchievementsTabHTML();
            this._bindAchievementsTabEvents();
        }
    }

    _updateTabBadges() {
        if (!this.modalEl) return;
        // Quests ready count
        let qReady = 0;
        const quests = gameState.get('rewards.dailyQuests') || {};
        QUEST_DEFINITIONS.forEach(q => {
            const data = quests[q.id];
            if (data && data.progress >= q.target && !data.claimed) qReady++;
        });

        const qBadge = document.getElementById('tab-badge-quests');
        if (qBadge) {
            if (qReady > 0) {
                qBadge.style.display = 'inline-flex';
                qBadge.textContent = qReady;
            } else {
                qBadge.style.display = 'none';
            }
        }

        // Achievements ready count
        let aReady = 0;
        const achs = gameState.get('rewards.achievements') || {};
        ACHIEVEMENT_DEFINITIONS.forEach(a => {
            const data = achs[a.id];
            if (this.isAchievementComplete(a) && !(data?.claimed)) aReady++;
        });

        const aBadge = document.getElementById('tab-badge-achievements');
        if (aBadge) {
            if (aReady > 0) {
                aBadge.style.display = 'inline-flex';
                aBadge.textContent = aReady;
            } else {
                aBadge.style.display = 'none';
            }
        }
    }

    /* ── Tab 1: Faucet & Daily Streak HTML ── */

    _getFaucetTabHTML() {
        const sec = this.getFaucetRemainingSeconds();
        const isFaucetReady = sec <= 0;
        const m = Math.floor(sec / 60);
        const s = String(sec % 60).padStart(2, '0');

        const isBankrupt = this.isBankrupt();
        const canDaily = this.canClaimDailyStreak();
        const streakDay = this.getCurrentStreakDay();

        return `
            <div class="rewards-section-wrapper">
                <!-- 1. Timed Faucet Card -->
                <div class="reward-card faucet-card">
                    <div class="reward-card-header">
                        <div class="reward-card-badge">⏳ KLAIM 15 MENIT</div>
                        <span id="modal-faucet-timer" class="reward-timer-status" style="color: ${isFaucetReady ? '#10b981' : '#f59e0b'};">
                            ${isFaucetReady ? 'SIAP DIKLAIM!' : `Pendingin Cooldown: ${m}:${s}`}
                        </span>
                    </div>
                    <div class="reward-card-content">
                        <div class="reward-icon-box">🎁</div>
                        <div class="reward-info-box">
                            <h4 class="reward-name">VIP Faucet Cooldown</h4>
                            <p class="reward-desc">Klaim suntikan chip gratis setiap 15 menit. Tidak ada batas harian!</p>
                            <div class="reward-chips-val">+5.000.000 TC</div>
                        </div>
                    </div>
                    <div class="reward-card-actions">
                        <button type="button" id="modal-btn-claim-faucet" class="btn-vip btn-claim-action ${isFaucetReady ? '' : 'btn-cooldown'}" ${isFaucetReady ? '' : 'disabled'}>
                            ${isFaucetReady ? '🎁 KLAIM +5.000.000 TC' : `⏳ COOLDOWN (${m}:${s})`}
                        </button>
                    </div>
                </div>

                <!-- 2. Emergency Bailout Card (Only highlighted when bankrupt) -->
                <div class="reward-card bailout-card ${isBankrupt ? 'bailout-active' : ''}">
                    <div class="reward-card-header">
                        <div class="reward-card-badge ${isBankrupt ? 'badge-danger' : 'badge-muted'}">🚨 BANTUAN DARURAT BANGKRUT</div>
                        <span class="reward-timer-status" style="color: ${isBankrupt ? '#ef4444' : 'rgba(255,255,255,0.4)'};">
                            ${isBankrupt ? 'SALDO KRITIS! KLAIM SEKARANG' : 'Status: Saldo Masih Cukup'}
                        </span>
                    </div>
                    <div class="reward-card-content">
                        <div class="reward-icon-box">🛡️</div>
                        <div class="reward-info-box">
                            <h4 class="reward-name">VIP Bankruptcy Relief</h4>
                            <p class="reward-desc">
                                ${isBankrupt 
                                    ? 'Saldo Anda di bawah 100.000 TC! Suntikkan dana talangan darurat 5M secara instan tanpa menunggu cooldown!' 
                                    : 'Dana talangan darurat otomatis menyala ketika saldo Anda jatuh di bawah 100.000 TC.'}
                            </p>
                            <div class="reward-chips-val" style="color:#f87171;">+5.000.000 TC</div>
                        </div>
                    </div>
                    <div class="reward-card-actions">
                        <button type="button" id="modal-btn-claim-bailout" class="btn-vip btn-bailout-action" ${isBankrupt ? '' : 'disabled'}>
                            ${isBankrupt ? '🚨 AMBIL DANA TALANGAN 5M' : 'SALDO AMAN (≥ 100K TC)'}
                        </button>
                    </div>
                </div>

                <!-- 3. Daily Streak Calendar -->
                <div class="reward-card streak-card">
                    <div class="reward-card-header">
                        <div class="reward-card-badge">📅 ABSENSI 7 HARI BERTURUT-TURUT</div>
                        <span class="reward-timer-status" style="color: ${canDaily ? '#10b981' : 'rgba(255,255,255,0.5)'};">
                            ${canDaily ? 'Hadiah Hari Ini Siap!' : 'Sudah Absen Hari Ini (Kembali Besok)'}
                        </span>
                    </div>

                    <p class="streak-intro">Login dan buka kasino setiap hari untuk melipatgandakan chip Anda hingga 100.000.000 TC + Tiket Lotre gratis!</p>

                    <div class="streak-calendar-grid">
                        ${DAILY_STREAK_REWARDS.map(r => {
                            const isPast = r.day < streakDay || (!canDaily && r.day === streakDay);
                            const isCurrent = r.day === streakDay && canDaily;
                            const isLocked = r.day > streakDay;

                            let statusClass = 'streak-day-box';
                            if (isPast) statusClass += ' is-past';
                            if (isCurrent) statusClass += ' is-current';
                            if (isLocked) statusClass += ' is-locked';
                            if (r.isGrand) statusClass += ' is-grand';

                            return `
                                <div class="${statusClass}">
                                    <div class="day-label">HARI ${r.day}</div>
                                    <div class="day-icon">${r.isGrand ? '👑' : isPast ? '✅' : isCurrent ? '🎁' : '🔒'}</div>
                                    <div class="day-reward-chips">+${r.label}</div>
                                    ${r.bonus ? `<div class="day-bonus-text">${r.bonus}</div>` : ''}
                                    <div class="day-status-pill">${isPast ? 'DIKLAIM' : isCurrent ? 'SIAP' : 'KUNCI'}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>

                    <div class="reward-card-actions" style="margin-top: 1rem;">
                        <button type="button" id="modal-btn-claim-streak" class="btn-vip btn-streak-action" ${canDaily ? '' : 'disabled'}>
                            ${canDaily ? `🎁 KLAIM HADIAH HARI #${streakDay} (+${DAILY_STREAK_REWARDS[streakDay - 1].label})` : '✅ ABSENSI HARI INI SELESAI'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    _bindFaucetTabEvents() {
        const faucetBtn = document.getElementById('modal-btn-claim-faucet');
        faucetBtn?.addEventListener('click', () => {
            this.claimFaucet(faucetBtn);
        });

        const bailoutBtn = document.getElementById('modal-btn-claim-bailout');
        bailoutBtn?.addEventListener('click', () => {
            this.claimBailout(bailoutBtn);
        });

        const streakBtn = document.getElementById('modal-btn-claim-streak');
        streakBtn?.addEventListener('click', () => {
            this.claimDailyStreak(streakBtn);
        });
    }

    /* ── Tab 2: Daily Quests HTML ── */

    _getQuestsTabHTML() {
        const quests = gameState.get('rewards.dailyQuests') || {};

        return `
            <div class="quests-tab-container">
                <div class="quests-header-notice">
                    <span class="notice-icon">🎯</span>
                    <div>
                        <div class="notice-title">Misi Kasino Diperbarui Setiap Hari!</div>
                        <div class="notice-sub">Mainkan putaran slot, roda, atau taruhan untuk mengumpulkan hadiah puluhan juta chip.</div>
                    </div>
                </div>

                <div class="quests-list">
                    ${QUEST_DEFINITIONS.map(q => {
                        const data = quests[q.id] || { progress: 0, target: q.target, claimed: false };
                        const progress = Math.min(q.target, data.progress || 0);
                        const percent = Math.min(100, Math.round((progress / q.target) * 100));
                        const isDone = progress >= q.target;
                        const isClaimed = data.claimed;

                        return `
                            <div class="quest-row ${isClaimed ? 'quest-claimed' : isDone ? 'quest-ready' : ''}">
                                <div class="quest-icon-col">${q.icon}</div>
                                <div class="quest-info-col">
                                    <div class="quest-top">
                                        <span class="quest-title">${q.title}</span>
                                        <span class="quest-reward-tag">+${financeManager.formatCurrency(q.rewardChips)} TC</span>
                                    </div>
                                    <div class="quest-desc">${q.desc}</div>
                                    <div class="quest-progress-box">
                                        <div class="quest-progress-bar">
                                            <div class="quest-progress-fill" style="width: ${percent}%;"></div>
                                        </div>
                                        <div class="quest-progress-text">${progress} / ${q.target} ${q.unit} (${percent}%)</div>
                                    </div>
                                </div>
                                <div class="quest-action-col">
                                    ${isClaimed 
                                        ? `<button class="btn-quest-claimed" disabled>SELESAI</button>`
                                        : isDone 
                                            ? `<button class="btn-vip btn-quest-claim" data-quest-id="${q.id}">KLAIM</button>`
                                            : `<div class="quest-in-progress">DALAM PROSES</div>`
                                    }
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    _bindQuestsTabEvents() {
        const claimBtns = document.querySelectorAll('.btn-quest-claim');
        claimBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const qId = btn.getAttribute('data-quest-id');
                if (qId) this.claimQuest(qId, btn);
            });
        });
    }

    /* ── Tab 3: Achievements HTML ── */

    _getAchievementsTabHTML() {
        const achs = gameState.get('rewards.achievements') || {};

        return `
            <div class="achievements-tab-container">
                <div class="quests-header-notice" style="border-color: rgba(251, 191, 36, 0.3);">
                    <span class="notice-icon">🏆</span>
                    <div>
                        <div class="notice-title">Prestasi VIP Seumur Hidup</div>
                        <div class="notice-sub">Pencapaian permanen dengan hadiah jackpot bernilai puluhan hingga ratusan juta chip!</div>
                    </div>
                </div>

                <div class="achievements-list">
                    ${ACHIEVEMENT_DEFINITIONS.map(a => {
                        const data = achs[a.id] || {};
                        const isDone = this.isAchievementComplete(a);
                        const isClaimed = data.claimed;

                        return `
                            <div class="achievement-row ${isClaimed ? 'ach-claimed' : isDone ? 'ach-ready' : ''}">
                                <div class="ach-icon-col">${a.icon}</div>
                                <div class="ach-info-col">
                                    <div class="ach-top">
                                        <span class="ach-title">${a.title}</span>
                                        <span class="ach-reward-tag">+${financeManager.formatCurrency(a.rewardChips)} TC</span>
                                    </div>
                                    <div class="ach-desc">${a.desc}</div>
                                    <div class="ach-status-hint">
                                        ${isClaimed ? '✅ Prestasi telah diklaim' : isDone ? '✨ Hadiah siap dicairkan!' : '🔒 Syarat belum terpenuhi'}
                                    </div>
                                </div>
                                <div class="ach-action-col">
                                    ${isClaimed
                                        ? `<button class="btn-quest-claimed" disabled>DIBUKA</button>`
                                        : isDone
                                            ? `<button class="btn-vip btn-ach-claim" data-ach-id="${a.id}">KLAIM</button>`
                                            : `<div class="quest-in-progress">TERKUNCI</div>`
                                    }
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    _bindAchievementsTabEvents() {
        const claimBtns = document.querySelectorAll('.btn-ach-claim');
        claimBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const aId = btn.getAttribute('data-ach-id');
                if (aId) this.claimAchievement(aId, btn);
            });
        });
    }
}

const rewardManager = new RewardManager();
if (typeof window !== 'undefined') {
    window.rewardManager = rewardManager;
}
export default rewardManager;
