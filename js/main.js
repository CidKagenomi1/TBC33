/**
 * main.js - Trilliun Chip Application Entrypoint
 * Boots the VIP Casino Suite, binds top-bar controls (Faucet, Reset, Sound),
 * and mounts the GamblingPanel.
 */

import gameState from './core/GameState.js';
import financeManager from './finance/FinanceManager.js';
import ui from './ui/UIManager.js';
import AuraSound from './ui/AuraSound.js';
import gamblingPanel from './GamblingPanel.js';
import pixiEffects from './graphics/PixiEffects.js';
import mobileHandler from './ui/MobileHandler.js';
import rewardManager from './rewards/RewardManager.js';

function initApp() {
    // 0. Initialize Mobile Handler & Orientation Engine
    mobileHandler.init();

    // 1. Initialize UI Manager
    ui.init();

    // 2. Initialize VIP Rewards & Quest Engine
    rewardManager.init();

    // 3. Render initial balance in header
    updateHeaderBalance();

    // 4. Mount Trilliun Chip VIP Casino Panel
    gamblingPanel.show();

    // 5. Bind Top-Bar Actions
    setupHeaderControls();

    // 5. Listen for reactive balance changes
    gameState.on('balanceChanged', () => {
        updateHeaderBalance();
    });

    console.log('🎰 [Trilliun Chip] VIP Casino Suite loaded successfully!');
}

function updateHeaderBalance() {
    const bal = gameState.getBalance();
    const formatted = financeManager.formatCurrency(bal);

    const headerBal = document.getElementById('header-chip-balance');
    if (headerBal) headerBal.textContent = `${formatted} TC`;

    const subBal = document.getElementById('header-chip-compact');
    if (subBal) subBal.textContent = `≈ ${financeManager.formatCurrency(bal, true)} Chips`;
}

function setupHeaderControls() {
    // VIP Rewards & Quests Hub - Bound to header and drawer buttons
    const openRewardsHub = (sourceBtn) => {
        if (sourceBtn) pixiEffects.buttonPress(sourceBtn);
        // If drawer is open, close drawer first
        gamblingPanel.closeLobby?.();
        rewardManager.openModal('faucet');
    };

    const rewardsHubBtn = document.getElementById('btn-rewards-hub') || document.getElementById('btn-faucet');
    if (rewardsHubBtn) {
        rewardsHubBtn.addEventListener('click', () => openRewardsHub(rewardsHubBtn));
    }
    const drawerFaucetBtn = document.getElementById('drawer-btn-faucet');
    if (drawerFaucetBtn) {
        drawerFaucetBtn.addEventListener('click', () => openRewardsHub(drawerFaucetBtn));
    }

    // Reset State
    const resetBtn = document.getElementById('btn-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            pixiEffects.buttonPress(resetBtn);
            if (confirm('Apakah Anda yakin ingin me-reset saldo dan progres game ke 10.000.000 TC?')) {
                gameState.reset();
                AuraSound.playTap();
                ui.info('Saldo dan game state telah di-reset ke nilai default.', 'Reset Berhasil');
                gamblingPanel.refreshBalanceDisplay();
                gamblingPanel.updateLobbyUI();
            }
        });
    }

    // Sound Toggle
    const soundBtn = document.getElementById('btn-sound-toggle');
    if (soundBtn) {
        const updateSoundIcon = () => {
            const enabled = gameState.get('settings.soundEnabled') !== false;
            soundBtn.textContent = enabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
            soundBtn.style.opacity = enabled ? '1' : '0.6';
            const drawerSoundSub = document.getElementById('drawer-sound-status');
            if (drawerSoundSub) {
                drawerSoundSub.textContent = enabled ? 'Audio ON (Musik putaran & efek aktif)' : 'Audio OFF (Hening)';
            }
        };
        updateSoundIcon();

        soundBtn.addEventListener('click', () => {
            pixiEffects.buttonPress(soundBtn);
            const current = gameState.get('settings.soundEnabled') !== false;
            const next = !current;
            gameState.set('settings.soundEnabled', next);
            updateSoundIcon();
            if (next) AuraSound.playTap();
            ui.info(next ? 'Efek suara diaktifkan' : 'Efek suara dinonaktifkan', 'Audio Setting');
        });
    }

    // Luck Status Boost Cheat (for fun / test)
    const luckBtn = document.getElementById('btn-luck-boost');
    if (luckBtn) {
        luckBtn.addEventListener('click', () => {
            pixiEffects.buttonPress(luckBtn);
            const current = gameState.get('donations') || { luckMultiplier: 1.0, luckTicksRemaining: 0 };
            const isLucky = current.luckMultiplier > 1 && current.luckTicksRemaining > 0;
            if (isLucky) {
                gameState.set('donations', { luckMultiplier: 1.0, luckTicksRemaining: 0 });
                ui.info('Luck status kembali Normal (1.0x)');
            } else {
                gameState.set('donations', { luckMultiplier: 2.5, luckTicksRemaining: 100 });
                AuraSound.playSuccessAlert();
                ui.success('Luck status boosted: 2.5x Multiplier Aktif!', '✨ Lady Luck Smiles!');
            }
            gamblingPanel.refreshBalanceDisplay();
            gamblingPanel.updateLobbyUI();
        });
    }
}

// Auto-run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

