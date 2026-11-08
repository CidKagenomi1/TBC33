/**
 * ZeusSlotEngine.js - Premium Gates of Olympus 6x5 Scatter-Pays Slot Engine
 * Extends BaseSlotEngine for 6x5 grid mechanics, 8+ Scatter Pays anywhere,
 * 4+ Zeus Lightning Scatters, and accumulating Multiplier Orbs (2x - 100x).
 */

import financeManager from '../finance/FinanceManager.js';
import { getSlotSVG } from './SlotIcons.js';
import AuraSound from '../ui/AuraSound.js';
import { BaseSlotEngine } from './BaseSlotEngine.js';
import { OLYMPUS_PARTICLE_PALETTE } from '../graphics/CanvasParticleSystem.js';

const SYMBOLS = [
    // Simbol Premium Tertinggi
    { emoji: '👑', name: 'Mahkota Zeus',     baseWeight: 4,  multiplier3x: 50, multiplier2x: 0 },
    { emoji: '⏳', name: 'Jam Pasir Waktu',  baseWeight: 6,  multiplier3x: 25, multiplier2x: 0 },
    { emoji: '💍', name: 'Cincin Delima',    baseWeight: 8,  multiplier3x: 15, multiplier2x: 0 },
    { emoji: '🏆', name: 'Cawan Emas',       baseWeight: 10, multiplier3x: 12, multiplier2x: 0 },

    // Simbol Menengah (Artefak Olympus)
    { emoji: '🏛️', name: 'Kuil Olympus',     baseWeight: 14, multiplier3x: 8,  multiplier2x: 0 },
    { emoji: '🏺', name: 'Vas Suci',         baseWeight: 18, multiplier3x: 5,  multiplier2x: 0 },

    // Simbol Permata Rendah
    { emoji: '🔮', name: 'Permata Ungu',     baseWeight: 22, multiplier3x: 4,  multiplier2x: 0 },
    { emoji: '🧿', name: 'Mata Biru',        baseWeight: 26, multiplier3x: 3,  multiplier2x: 0 },
    { emoji: '💠', name: 'Batu Permata',     baseWeight: 30, multiplier3x: 2,  multiplier2x: 0 },

    // Simbol Scatter Zeus (4+ di mana saja memicu bayaran scatter & petir)
    { emoji: '⚡', name: 'Petir Zeus',       baseWeight: 4,  multiplier3x: 20, multiplier2x: 0, isScatter: true },
];

const PAYLINES = [
    { name: 'Baris 1', coordinates: [0, 0, 0, 0, 0, 0], color: '#ef4444' },
    { name: 'Baris 2', coordinates: [1, 1, 1, 1, 1, 1], color: '#f97316' },
    { name: 'Baris 3', coordinates: [2, 2, 2, 2, 2, 2], color: '#f59e0b' },
    { name: 'Baris 4', coordinates: [3, 3, 3, 3, 3, 3], color: '#84cc16' },
    { name: 'Baris 5', coordinates: [4, 4, 4, 4, 4, 4], color: '#10b981' },
    { name: 'V-Shape Atas', coordinates: [0, 1, 2, 3, 2, 0], color: '#ec4899' },
    { name: 'V-Shape Bawah', coordinates: [4, 3, 2, 1, 2, 4], color: '#f43f5e' }
];

export class ZeusSlotEngine extends BaseSlotEngine {
    constructor(onBalanceRefresh) {
        super(onBalanceRefresh, {
            gameId: 'zeus',
            cols: 6,
            rows: 5,
            symbols: SYMBOLS,
            paylines: PAYLINES,
            pixiThemeColor: 0x38bdf8,
            turboAccentColor: '#38bdf8',
            turboTextColor: '#000',
            spinIcon: '⚡',
            spinActiveText: 'PETIR...',
            spinningStatusText: 'Petir Zeus Sedang Menyambar...',
            idleStatusText: 'TEKAN SPIN UNTUK MEMANGGIL PETIR',
            expenseLabel: 'Taruhan Slot 6x5',
            rateContainerId: 'zeus-rate-container',
            particlePalette: OLYMPUS_PARTICLE_PALETTE,
            praiseStyle: {
                color: '#38bdf8',
                stroke: '2px #0369a1',
                shadow: '0 0 16px rgba(56,189,248,0.9), 0 4px 0 #0c4a6e'
            }
        });

        this.grid = Array.from({ length: 6 }, () => Array(5).fill('💠'));
    }

    renderSymbolSVG(item) {
        return getSlotSVG(item);
    }

    getHTML() {
        return this.renderCabinetHTML({
            initialSymbol: '💠',
            lightColors: ['#38bdf8', '#bae6fd'],
            accentColor: '#38bdf8',
            ornamentsHTML: `
                <div style="position:absolute; top:-10px; left:-10px; font-size:3.5rem; opacity:0.12; transform:rotate(-15deg); pointer-events:none;">⚡</div>
                <div style="position:absolute; bottom:-10px; right:-10px; font-size:3.5rem; opacity:0.12; transform:rotate(15deg); pointer-events:none;">🏛️</div>
            `,
            topMeterHTML: `
                <div id="zeus-multiplier-meter" style="display:flex; justify-content:center; align-items:center; gap:0.5rem; margin-bottom:0.35rem; font-family:var(--font-display, sans-serif);">
                    <div style="background:rgba(56,189,248,0.12); border:1.5px solid rgba(56,189,248,0.4); padding:3px 14px; border-radius:999px; display:inline-flex; align-items:center; gap:0.4rem; box-shadow:0 0 12px rgba(56,189,248,0.25);">
                        <span style="font-size:0.95rem;">⚡</span>
                        <span style="font-size:0.7rem; color:rgba(255,255,255,0.7); font-weight:800; letter-spacing:0.05em;">PENGALI ZEUS:</span>
                        <span id="zeus-total-mult-val" style="color:#38bdf8; font-weight:900; font-size:0.9rem; text-shadow:0 0 8px #38bdf8; transition:all 0.25s ease;">1x</span>
                    </div>
                </div>
            `,
            windowStyle: 'background: radial-gradient(circle at center, #061524 0%, #02060e 100%);',
            winStripStyle: 'color:#38bdf8; text-shadow:0 0 10px rgba(56,189,248,0.5);',
            initialBannerText: 'TEKAN SPIN UNTUK MENURUNKAN PETIR ZEUS',
            spinBtnStyle: 'background:linear-gradient(135deg, #38bdf8 0%, #0284c7 50%, #0369a1 100%); color:#fff; border-color:#fff; box-shadow:0 0 25px rgba(56,189,248,0.7), 0 6px 16px rgba(0,0,0,0.7);',
            maxBtnStyle: 'background:rgba(56,189,248,0.15); border-color:rgba(56,189,248,0.4); color:#38bdf8;',
            paytableDialogStyle: 'border-color:#38bdf8; box-shadow:0 0 30px rgba(56,189,248,0.35);',
            paytableBorderColor: 'rgba(56,189,248,0.3)',
            paytableTitle: 'TABEL BAYARAN GATES OF OLYMPUS',
            paytableDesc: '6 Kolom &amp; 5 Baris Scatter Pays (8+ simbol kembar di mana saja meledak runtuh). Simbol Petir ⚡ memicu Scatter Bounty (4+ di layar)!',
            paytableRowsHTML: SYMBOLS.map(s => `
                <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); padding:0.45rem 0.6rem; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.8rem; font-weight:700;">${s.emoji} ${s.name}</span>
                    <span style="color:#38bdf8; font-weight:800; font-size:0.75rem;">${s.isScatter ? '4x:' + s.multiplier3x + '×' : '8+:' + s.multiplier3x + '×'}</span>
                </div>`).join(''),
            winBg: 'rgba(56,189,248,0.2)',
            winBorder: '#38bdf8',
            jackpotFlash: `
                0%, 100% { background: linear-gradient(135deg,#38bdf8 0%,#0284c7 100%); }
                50% { background: linear-gradient(135deg,#bae6fd 0%,#e0f2fe 100%); box-shadow: 0 0 30px #ffffff; }
            `
        });
    }

    updateMultiplierMeter(totalMult = 1) {
        const valEl = document.getElementById('zeus-total-mult-val');
        if (!valEl) return;
        valEl.textContent = `${totalMult}x`;
        if (totalMult > 1) {
            valEl.style.color = totalMult >= 25 ? '#f43f5e' : (totalMult >= 10 ? '#fbbf24' : '#38bdf8');
            valEl.style.textShadow = '0 0 14px currentColor';
            valEl.style.transform = 'scale(1.25)';
            setTimeout(() => {
                if (valEl) valEl.style.transform = 'scale(1)';
            }, 300);
        } else {
            valEl.style.color = '#38bdf8';
            valEl.style.textShadow = '0 0 8px #38bdf8';
            valEl.style.transform = 'scale(1)';
        }
    }

    _onSpinStart() {
        this.updateMultiplierMeter(1);
    }

    _sanitizeZonkGrid(matrix, isNearMiss = false, preserveSymbol = null, preserveCount = 8) {
        const safeCandidates = SYMBOLS.filter(s => !s.isScatter).map(s => s.emoji);

        if (isNearMiss) {
            for (let c = 0; c < 6; c++) {
                for (let r = 0; r < 5; r++) {
                    if (matrix[c][r] === '👑' || matrix[c][r] === '⚡') {
                        matrix[c][r] = '🏛️';
                    }
                }
            }
            const teaserSpots = [
                { c: 0, r: 1 }, { c: 1, r: 3 }, { c: 2, r: 0 },
                { c: 3, r: 4 }, { c: 4, r: 2 }, { c: 5, r: 1 }, { c: 2, r: 3 }
            ];
            teaserSpots.forEach(pt => {
                matrix[pt.c][pt.r] = '👑';
            });
        }

        let modified = true;
        let passes = 0;
        while (modified && passes < 12) {
            modified = false;
            passes++;

            const counts = {};
            for (let c = 0; c < 6; c++) {
                for (let r = 0; r < 5; r++) {
                    const s = matrix[c][r];
                    counts[s] = (counts[s] || 0) + 1;
                }
            }

            for (let c = 0; c < 6; c++) {
                for (let r = 0; r < 5; r++) {
                    if (isNearMiss && matrix[c][r] === '👑') continue;

                    const sym = matrix[c][r];
                    if (preserveSymbol && sym === preserveSymbol) {
                        if ((counts[sym] || 0) > preserveCount) {
                            const replacement = safeCandidates.find(cand => cand !== sym && cand !== preserveSymbol && (counts[cand] || 0) < 5)
                                || safeCandidates[0];
                            counts[sym]--;
                            counts[replacement] = (counts[replacement] || 0) + 1;
                            matrix[c][r] = replacement;
                            modified = true;
                        }
                        continue;
                    }

                    const limit = (sym === '⚡') ? 3 : 7;
                    if ((counts[sym] || 0) > limit) {
                        const replacement = safeCandidates.find(cand => cand !== sym && cand !== preserveSymbol && (counts[cand] || 0) < 5)
                            || safeCandidates[Math.floor(Math.random() * safeCandidates.length)];
                        counts[sym]--;
                        counts[replacement] = (counts[replacement] || 0) + 1;
                        matrix[c][r] = replacement;
                        modified = true;
                    }
                }
            }
        }
    }

    _seedCluster(matrix, symbolPool, count) {
        const chosen = symbolPool[Math.floor(Math.random() * symbolPool.length)];
        const allPositions = [];
        for (let c = 0; c < 6; c++) {
            for (let r = 0; r < 5; r++) {
                allPositions.push({ c, r });
            }
        }
        for (let i = allPositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]];
        }
        for (let i = 0; i < count; i++) {
            const pos = allPositions[i];
            matrix[pos.c][pos.r] = chosen;
        }
        this._sanitizeZonkGrid(matrix, false, chosen, count);
    }

    _generateSpinGrid(luck, betAmount, evalResult) {
        const resultMatrix = super._generateSpinGrid(luck, betAmount, evalResult);

        if (evalResult.targetOutcome === 'ZONK') {
            this._sanitizeZonkGrid(resultMatrix, evalResult.isNearMiss);
        } else if (evalResult.targetOutcome === 'TRICKLE') {
            this._seedCluster(resultMatrix, ['💠', '🧿', '🔮'], 8);
        } else if (evalResult.targetOutcome === 'PROFIT') {
            this._seedCluster(resultMatrix, ['🏺', '🏛️', '🏆', '💍'], Math.random() < 0.6 ? 8 : 10);
        } else if (evalResult.targetOutcome === 'ERUPTION') {
            if (Math.random() < 0.35) {
                this._seedCluster(resultMatrix, ['⚡'], 4);
            } else {
                this._seedCluster(resultMatrix, ['👑', '⏳', '💍'], 10);
            }
        } else if (evalResult.isNearMiss) {
            this._sanitizeZonkGrid(resultMatrix, true);
        }

        return resultMatrix;
    }

    _checkGridWins(lineBet) {
        let stepPayout = 0;
        const winsList = [];
        const winningLines = [];
        const winningCoordsMap = new Map();
        let hasLightning = false;

        const symbolCounts = new Map();
        const symbolPositions = new Map();
        for (let col = 0; col < 6; col++) {
            for (let row = 0; row < 5; row++) {
                const em = this.grid[col][row];
                symbolCounts.set(em, (symbolCounts.get(em) || 0) + 1);
                if (!symbolPositions.has(em)) symbolPositions.set(em, []);
                symbolPositions.get(em).push({ col, row });
                if (em === '⚡') hasLightning = true;
            }
        }

        symbolCounts.forEach((count, emoji) => {
            if (emoji === '⚡') {
                if (count >= 4) {
                    let scatterMult = 3;
                    if (count >= 6) scatterMult = 100;
                    else if (count >= 5) scatterMult = 5;
                    const scatterWin = Math.round(lineBet * 5 * scatterMult);
                    stepPayout += scatterWin;
                    winsList.push(`⚡ ZEUS SCATTER: ${count}x ⚡ (+${financeManager.formatCurrency(scatterWin)} TC)`);
                    symbolPositions.get(emoji).forEach(({ col, row }) => {
                        winningCoordsMap.set(`${col}-${row}`, { col, row });
                    });
                }
            } else if (count >= 8) {
                const spec = SYMBOLS.find(s => s.emoji === emoji) || SYMBOLS[SYMBOLS.length - 1];
                let clusterMultiplier = spec.multiplier3x;
                if (count >= 12) clusterMultiplier = Math.round(spec.multiplier3x * 5.0);
                else if (count >= 10) clusterMultiplier = Math.round(spec.multiplier3x * 2.5);

                const clusterWin = Math.round(lineBet * clusterMultiplier);
                stepPayout += clusterWin;
                winsList.push(`⚡ CLUSTER OLYMPUS: ${count}x ${emoji} (+${financeManager.formatCurrency(clusterWin)} TC)`);

                symbolPositions.get(emoji).forEach(({ col, row }) => {
                    winningCoordsMap.set(`${col}-${row}`, { col, row });
                });
            }
        });

        return {
            stepPayout,
            winningLines,
            winningCoords: Array.from(winningCoordsMap.values()),
            winsList,
            hasLightning
        };
    }

    async _processTumbleSequence(betAmount, luck, evalResult = {}, rateOn = false) {
        const winDisplay = document.getElementById('slot-win-display');
        const lineBet = betAmount / 5;
        let totalPayout = 0;
        let cascadeRound = 0;
        const allWinsList = [];
        let hasLightning = false;
        let totalOlympusMultiplier = 1;
        const MAX_CASCADES = 15;

        this.updateMultiplierMeter(1);

        while (cascadeRound < MAX_CASCADES) {
            cascadeRound++;
            const { stepPayout, winningLines, winningCoords, winsList, hasLightning: foundBolt } = this._checkGridWins(lineBet);
            if (foundBolt) hasLightning = true;

            if (winningCoords.length === 0) {
                cascadeRound = cascadeRound === 1 ? 0 : cascadeRound - 1;
                break;
            }

            // Zeus Thunder Strike Multiplier Orb chance on winning tumbles
            const isEruption = evalResult?.targetOutcome === 'ERUPTION' || rateOn;
            const isTrickle = evalResult?.targetOutcome === 'TRICKLE';
            const strikeBaseChance = isEruption ? 0.50 : (isTrickle ? 0.05 : 0.18);
            if (Math.random() < strikeBaseChance) {
                const orbRoll = Math.random();
                let orbValue;
                if (isEruption) {
                    orbValue = orbRoll < 0.25 ? 5 : (orbRoll < 0.55 ? 10 : (orbRoll < 0.80 ? 25 : (orbRoll < 0.95 ? 50 : 100)));
                } else {
                    orbValue = orbRoll < 0.50 ? 2 : (orbRoll < 0.80 ? 3 : (orbRoll < 0.93 ? 5 : (orbRoll < 0.98 ? 10 : 25)));
                }

                totalOlympusMultiplier += orbValue;
                this.updateMultiplierMeter(totalOlympusMultiplier);
                this.shakeCabinet();
                this.spawnParticles(35, 'spark');
                AuraSound.playZeusThunder();
                this.spawnPraiseText(`PETIR ZEUS +${orbValue}x! ⚡`);
                winsList.push(`⚡ SAMBARAN PETIR ZEUS: +${orbValue}x Multiplier Orb!`);
            }

            const stepWin = Math.round(stepPayout);
            totalPayout += stepWin;
            allWinsList.push(...winsList.map(w => `[Runtuhan #${cascadeRound}] ${w}`));

            this._highlightWinningCells(winningLines, winningCoords);

            if (winDisplay) {
                winDisplay.innerHTML = `
                    <div class="win-text-chrome">
                        <span style="color:#38bdf8; font-weight:900;">
                            ⚡ RUNTUHAN #${cascadeRound}${totalOlympusMultiplier > 1 ? ` (PENGALI: ${totalOlympusMultiplier}x)` : ''}
                        </span>
                        <span class="win-payout-num">+${financeManager.formatCurrency(totalPayout)} TC</span>
                    </div>
                `;
            }

            AuraSound.playComboUp(cascadeRound);
            await new Promise(r => setTimeout(r, this.isSpeedUp ? 220 : 500));

            const lowTierSafe = ['💠', '🧿', '🔮', '🏺', '🏛️'];
            const newGrid = this._buildTumbledGrid(
                winningCoords,
                () => (isTrickle && cascadeRound >= 2)
                    ? lowTierSafe[Math.floor(Math.random() * lowTierSafe.length)]
                    : this.weightedRandom(luck, betAmount).emoji
            );

            await this._animateCascadeDrop(winningCoords, newGrid);
            this.grid = newGrid;
            await new Promise(r => setTimeout(r, this.isSpeedUp ? 100 : 250));
        }

        if (hasLightning) {
            this.shakeCabinet();
            this.spawnParticles(15, 'spark');
            this.spawnParticles(20, 'dust');
        }

        const finalPayout = totalPayout > 0 ? Math.round(totalPayout * totalOlympusMultiplier) : 0;
        const strikeTexts = ['DIVINE! ✨', 'GODLY! 🏛️', 'BLESSED! 🏺'];

        this._finalizeSpinOutcome({
            betAmount,
            finalPayout,
            winDisplay,
            incomeDescription: `Kemenangan Gates of Olympus (${cascadeRound}x Runtuhan, ${totalOlympusMultiplier}x Petir)`,
            extraEvents: totalOlympusMultiplier > 1 ? ['action:zeusLightning'] : [],
            praiseText: totalOlympusMultiplier > 1
                ? `PETIR OLYMPUS ${totalOlympusMultiplier}x! ⚡`
                : strikeTexts[Math.floor(Math.random() * strikeTexts.length)],
            winSummaryHTML: `
                <div class="win-text-chrome">
                    <span>⚡</span>
                    <span>MENANG TOTAL ${totalOlympusMultiplier > 1 ? `(DIKALI PETIR ${totalOlympusMultiplier}x)` : ''}</span>
                    <span class="win-payout-num">+${financeManager.formatCurrency(finalPayout)} TC</span>
                    <span>⚡</span>
                </div>
                <div style="font-size:0.65rem; color:rgba(255,255,255,0.5); max-height:60px; overflow-y:auto; width:100%; margin-top:2px;">
                    ${allWinsList.join(' | ')}
                </div>
            `
        });
    }
}
