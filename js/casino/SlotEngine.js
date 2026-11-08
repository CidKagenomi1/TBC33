/**
 * SlotEngine.js - Premium Gold Digger 6x3 Multi-Line Slot Engine
 * Extends BaseSlotEngine for 6x3 grid mechanics, 5 paylines, TNT 3x3 area blast,
 * Gold Rush Fever combo multiplier (up to x10), and WebGL/Canvas effects.
 */

import financeManager from '../finance/FinanceManager.js';
import { getSlotSVG } from './SlotIcons.js';
import AuraSound from '../ui/AuraSound.js';
import { BaseSlotEngine } from './BaseSlotEngine.js';

const SYMBOLS = [
    { emoji: '💎', name: 'Berlian Mulia',  baseWeight: 4,  multiplier3x: 50, multiplier2x: 0 },
    { emoji: '💰', name: 'Kantung Emas',   baseWeight: 8,  multiplier3x: 25, multiplier2x: 0 },
    { emoji: '🪙', name: 'Koin Emas',      baseWeight: 12, multiplier3x: 7,  multiplier2x: 0 },
    { emoji: '⛏️', name: 'Beliung Tambang',baseWeight: 18, multiplier3x: 5,  multiplier2x: 0 },
    { emoji: '🧨', name: 'Dinamit',        baseWeight: 25, multiplier3x: 3,  multiplier2x: 0 },
    { emoji: '🪨', name: 'Batu Bara',      baseWeight: 32, multiplier3x: 1,  multiplier2x: 0 },
];

const PAYLINES = [
    { name: 'Line 1 (Top Horizontal)', coordinates: [0, 0, 0, 0, 0, 0], color: '#3b82f6' },
    { name: 'Line 2 (Middle Horizontal)', coordinates: [1, 1, 1, 1, 1, 1], color: '#ec4899' },
    { name: 'Line 3 (Bottom Horizontal)', coordinates: [2, 2, 2, 2, 2, 2], color: '#10b981' },
    { name: 'Line 4 (V-Shape)', coordinates: [0, 1, 2, 2, 1, 0], color: '#fbbf24' },
    { name: 'Line 5 (Inverted V-Shape)', coordinates: [2, 1, 0, 0, 1, 2], color: '#a855f7' }
];

export class SlotEngine extends BaseSlotEngine {
    constructor(onBalanceRefresh) {
        super(onBalanceRefresh, {
            gameId: 'slot',
            cols: 6,
            rows: 3,
            symbols: SYMBOLS,
            paylines: PAYLINES,
            pixiThemeColor: 0xfbbf24,
            turboAccentColor: '#fbbf24',
            turboTextColor: '#000',
            spinIcon: '⛏️',
            spinActiveText: 'GALI...',
            spinningStatusText: 'Mesin Gali Sedang Berputar...',
            idleStatusText: 'TEKAN SPIN UNTUK MENGGALI EMAS',
            expenseLabel: 'Taruhan Slot 6x3',
            rateContainerId: 'slot-rate-container'
        });

        this.grid = Array.from({ length: 6 }, () => ['🪨', '🪨', '🪨']);
    }

    renderSymbolSVG(item) {
        return getSlotSVG(item);
    }

    getHTML() {
        return this.renderCabinetHTML({
            initialSymbol: '🪨',
            lightColors: ['#fbbf24', '#f97316'],
            accentColor: '#fbbf24',
            paytableTitle: 'TABEL BAYARAN GOLDY CRUSH',
            paytableDesc: '6 Kolom, 3 Baris &amp; 5 Garis Payout. Simbol cocok dihitung dari kiri ke kanan.',
            paytableRowsHTML: SYMBOLS.map(s => `
                <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); padding:0.45rem 0.6rem; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.8rem; font-weight:700;">${s.emoji} ${s.name}</span>
                    <span style="color:#fbbf24; font-weight:800; font-size:0.75rem;">${s.multiplier3x}×</span>
                </div>`).join('')
        });
    }

    _generateSpinGrid(luck, betAmount, evalResult) {
        const resultMatrix = super._generateSpinGrid(luck, betAmount, evalResult);

        if (evalResult.isNearMiss) {
            const teaserSymbol = Math.random() < 0.6 ? '💎' : '💰';
            const targetLine = PAYLINES[Math.floor(Math.random() * 3)];
            resultMatrix[0][targetLine.coordinates[0]] = teaserSymbol;
            resultMatrix[1][targetLine.coordinates[1]] = teaserSymbol;
            resultMatrix[2][targetLine.coordinates[2]] = '🪨';
        } else if (evalResult.targetOutcome === 'ZONK') {
            PAYLINES.forEach(line => {
                const s0 = resultMatrix[0][line.coordinates[0]];
                const s1 = resultMatrix[1][line.coordinates[1]];
                const s2 = resultMatrix[2][line.coordinates[2]];
                if (s0 === s1 && s1 === s2) {
                    resultMatrix[2][line.coordinates[2]] = (s2 === '🪨') ? '⛏️' : '🪨';
                }
            });
        }

        return resultMatrix;
    }

    _checkGridWins(lineBet) {
        let stepPayout = 0;
        const winsList = [];
        const winningLines = [];
        const winningCoordsMap = new Map();
        let foundDynamite = false;

        PAYLINES.forEach((line) => {
            const firstSymbol = this.grid[0][line.coordinates[0]];
            let matchLength = 1;
            for (let col = 1; col < 6; col++) {
                if (this.grid[col][line.coordinates[col]] === firstSymbol) {
                    matchLength++;
                } else {
                    break;
                }
            }

            if (matchLength >= 3) {
                const spec = SYMBOLS.find(s => s.emoji === firstSymbol);
                if (spec) {
                    const lineMultiplier = this.calcLineMultiplier(spec.multiplier3x, matchLength);
                    const lineWin = Math.round(lineBet * lineMultiplier);
                    stepPayout += lineWin;
                    winsList.push(`${line.name}: ${matchLength}x ${firstSymbol} (+${financeManager.formatCurrency(lineWin)} TC)`);
                    winningLines.push(line);

                    for (let col = 0; col < matchLength; col++) {
                        const row = line.coordinates[col];
                        winningCoordsMap.set(`${col}-${row}`, { col, row });
                    }
                }
            }
        });

        // Signature Mechanic: TNT 3x3 Area Blast
        const dynamiteSpots = [];
        for (let col = 0; col < 6; col++) {
            for (let row = 0; row < 3; row++) {
                if (this.grid[col][row] === '🧨') {
                    foundDynamite = true;
                    if (winningCoordsMap.has(`${col}-${row}`) || winningCoordsMap.size > 0) {
                        dynamiteSpots.push({ col, row });
                    }
                }
            }
        }

        let tntBounty = 0;
        let blastCount = 0;
        if (dynamiteSpots.length > 0) {
            dynamiteSpots.forEach(({ col: dCol, row: dRow }) => {
                for (let dc = -1; dc <= 1; dc++) {
                    for (let dr = -1; dr <= 1; dr++) {
                        const nc = dCol + dc;
                        const nr = dRow + dr;
                        if (nc >= 0 && nc < 6 && nr >= 0 && nr < 3 && !winningCoordsMap.has(`${nc}-${nr}`)) {
                            winningCoordsMap.set(`${nc}-${nr}`, { col: nc, row: nr, isBlast: true });
                            blastCount++;
                            const sym = this.grid[nc][nr];
                            if (sym === '🪨') tntBounty += Math.round(lineBet * 1.5);
                            else if (sym === '⛏️') tntBounty += Math.round(lineBet * 2.5);
                            else if (sym === '🪙') tntBounty += Math.round(lineBet * 4.0);
                            else tntBounty += Math.round(lineBet * 1.0);
                        }
                    }
                }
            });

            if (tntBounty > 0) {
                stepPayout += tntBounty;
                winsList.push(`💥 LEDAKAN 3x3 DINAMIT: Hancurkan ${blastCount} Batu Tambang (+${financeManager.formatCurrency(tntBounty)} TC)`);
            }
        }

        return {
            stepPayout,
            winningLines,
            winningCoords: Array.from(winningCoordsMap.values()),
            winsList,
            foundDynamite: dynamiteSpots.length > 0 || foundDynamite,
            hadBlast: blastCount > 0
        };
    }

    async _processTumbleSequence(betAmount, luck) {
        const winDisplay = document.getElementById('slot-win-display');
        const lineBet = betAmount / 5;
        let totalPayout = 0;
        let cascadeRound = 0;
        const allWinsList = [];
        let hasDynamite = false;
        const MAX_CASCADES = 15;

        while (cascadeRound < MAX_CASCADES) {
            cascadeRound++;
            const { stepPayout, winningLines, winningCoords, winsList, foundDynamite, hadBlast } = this._checkGridWins(lineBet);
            if (foundDynamite) hasDynamite = true;

            if (winningCoords.length === 0) {
                cascadeRound = cascadeRound === 1 ? 0 : cascadeRound - 1;
                break;
            }

            // Gold Rush Fever Multiplier progression (x1, x2, x3, x5, up to x10)
            const comboMultiplier = cascadeRound >= 5 ? 10 : (cascadeRound === 4 ? 5 : (cascadeRound === 3 ? 3 : (cascadeRound === 2 ? 2 : 1)));
            const stepWin = Math.round(stepPayout * comboMultiplier);
            totalPayout += stepWin;
            allWinsList.push(...winsList.map(w => `[Runtuhan #${cascadeRound} ×${comboMultiplier}] ${w}`));

            if (hadBlast) {
                this.shakeCabinet();
                this.spawnParticles(35, 'spark');
                this.spawnParticles(25, 'dust');
                AuraSound.playDynamiteBlast();
                this.spawnPraiseText('BOOM! 3x3 BLAST! 🧨');
            }

            this._highlightWinningCells(winningLines, winningCoords);

            if (winDisplay) {
                const isGoldRush = comboMultiplier >= 10;
                winDisplay.innerHTML = `
                    <div class="win-text-gold">
                        <span style="color:${isGoldRush ? '#fbbf24' : '#ef4444'}; font-weight:900;">
                            ${isGoldRush ? '⛏️ GOLD RUSH FEVER x10!' : `🔥 COMBO x${comboMultiplier}!`}
                        </span>
                        <span class="win-payout-num">+${financeManager.formatCurrency(totalPayout)} TC</span>
                    </div>
                `;
            }

            AuraSound.playComboUp(comboMultiplier);
            await new Promise(r => setTimeout(r, this.isSpeedUp ? 220 : 500));

            const newGrid = this._buildTumbledGrid(
                winningCoords,
                () => this.weightedRandom(luck, betAmount).emoji
            );

            await this._animateCascadeDrop(winningCoords, newGrid);
            this.grid = newGrid;
            await new Promise(r => setTimeout(r, this.isSpeedUp ? 100 : 250));
        }

        if (hasDynamite) {
            this.shakeCabinet();
            this.spawnParticles(15, 'spark');
            this.spawnParticles(20, 'dust');
        }

        this._finalizeSpinOutcome({
            betAmount,
            finalPayout: totalPayout,
            winDisplay,
            incomeDescription: `Kemenangan Slot Runtuhan Goldy Crush (${cascadeRound}x Kombo)`,
            praiseText: cascadeRound > 1 ? `KOMBO ${cascadeRound}x! 🔥` : 'STRIKE! 🪙',
            winSummaryHTML: `
                <div class="win-text-gold">
                    <span>✨</span>
                    <span>MENANG TOTAL ${cascadeRound > 1 ? `(${cascadeRound}x RUNTUHAN)` : ''}</span>
                    <span class="win-payout-num">+${financeManager.formatCurrency(totalPayout)} TC</span>
                    <span>✨</span>
                </div>
                <div style="font-size:0.65rem; color:rgba(255,255,255,0.5); max-height:60px; overflow-y:auto; width:100%; margin-top:2px;">
                    ${allWinsList.join(' | ')}
                </div>
            `
        });
    }
}
