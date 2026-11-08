/**
 * MahjongSlotEngine.js - Premium Mahjong Ways 6x8 Slot Engine
 * Extends BaseSlotEngine for 6x8 grid mechanics, 10 Macau paylines,
 * Golden Plated Tile -> WILD Dragon transformation, and x1->x2->x3->x5 Multiplier Bar.
 */

import financeManager from '../finance/FinanceManager.js';
import AuraSound from '../ui/AuraSound.js';
import { BaseSlotEngine } from './BaseSlotEngine.js';
import {
    getMahjongSVG,
    MAHJONG_SYMBOLS_CONFIG,
    getTileEmoji,
    isTileGold,
    isTileWild,
    renderMahjongPaytableRow
} from './MahjongSymbols.js';

const SYMBOLS = MAHJONG_SYMBOLS_CONFIG;

const PAYLINES = [
    { name: 'Baris 1', coordinates: [0, 0, 0, 0, 0, 0], color: '#ef4444' },
    { name: 'Baris 2', coordinates: [1, 1, 1, 1, 1, 1], color: '#f97316' },
    { name: 'Baris 3', coordinates: [2, 2, 2, 2, 2, 2], color: '#f59e0b' },
    { name: 'Baris 4', coordinates: [3, 3, 3, 3, 3, 3], color: '#84cc16' },
    { name: 'Baris 5', coordinates: [4, 4, 4, 4, 4, 4], color: '#10b981' },
    { name: 'Baris 6', coordinates: [5, 5, 5, 5, 5, 5], color: '#06b6d4' },
    { name: 'Baris 7', coordinates: [6, 6, 6, 6, 6, 6], color: '#3b82f6' },
    { name: 'Baris 8', coordinates: [7, 7, 7, 7, 7, 7], color: '#8b5cf6' },
    { name: 'V-Shape Atas', coordinates: [0, 1, 2, 2, 1, 0], color: '#ec4899' },
    { name: 'V-Shape Bawah', coordinates: [7, 6, 5, 5, 6, 7], color: '#f43f5e' }
];

export class MahjongSlotEngine extends BaseSlotEngine {
    constructor(onBalanceRefresh) {
        super(onBalanceRefresh, {
            gameId: 'mahjong',
            cols: 6,
            rows: 8,
            symbols: SYMBOLS,
            paylines: PAYLINES,
            pixiThemeColor: 0xef4444,
            turboAccentColor: '#ef4444',
            turboTextColor: '#fff',
            spinIcon: '🀄',
            spinActiveText: 'SPIN...',
            spinningStatusText: 'Ubin Mahjong Sedang Diacak...',
            idleStatusText: 'TEKAN SPIN UNTUK MEMUTAR UBIN',
            expenseLabel: 'Taruhan Slot 6x8',
            rateContainerId: 'mahjong-rate-container'
        });

        this.grid = Array.from({ length: 6 }, () =>
            Array.from({ length: 8 }, () => {
                const s = SYMBOLS[Math.floor(Math.random() * (SYMBOLS.length - 1)) + 1];
                return { emoji: s.emoji, isGold: Math.random() < 0.2, isWild: false };
            })
        );
    }

    renderSymbolSVG(item) {
        return getMahjongSVG(item);
    }

    getHTML() {
        return this.renderCabinetHTML({
            initialSymbol: '🀫',
            lightColors: ['#ef4444', '#fbbf24'],
            accentColor: '#ef4444',
            cabinetStyle: 'border-color: #3b1717; box-shadow: 0 25px 60px -10px rgba(0,0,0,0.98), 0 0 0 2px #260e0e, inset 0 2px 2px rgba(255,255,255,0.16), inset 0 -3px 5px rgba(0,0,0,0.95);',
            ornamentsHTML: `
                <div style="position:absolute; top:-5px; left:-5px; font-size:3.5rem; opacity:0.12; transform:rotate(-15deg); pointer-events:none;">🏮</div>
                <div style="position:absolute; bottom:-10px; right:-10px; font-size:3.5rem; opacity:0.12; transform:rotate(15deg); pointer-events:none;">🐉</div>
            `,
            topMeterHTML: `
                <div id="mahjong-multiplier-bar" style="display:flex; justify-content:center; align-items:center; gap:0.45rem; margin-bottom:0.35rem; font-family:var(--font-display, sans-serif);">
                    <span style="font-size:0.65rem; color:rgba(255,255,255,0.6); font-weight:800; letter-spacing:0.05em;">PENGALI:</span>
                    <div id="mj-mult-1" class="mj-mult-badge" style="padding:2px 8px; border-radius:6px; font-size:0.75rem; font-weight:900; background:rgba(239,68,68,0.3); border:1.5px solid #ef4444; color:#fff; box-shadow:0 0 8px rgba(239,68,68,0.6); transition:all 0.25s ease;">x1</div>
                    <span style="color:rgba(255,255,255,0.25); font-size:0.65rem;">➔</span>
                    <div id="mj-mult-2" class="mj-mult-badge" style="padding:2px 8px; border-radius:6px; font-size:0.75rem; font-weight:900; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:rgba(255,255,255,0.4); transition:all 0.25s ease;">x2</div>
                    <span style="color:rgba(255,255,255,0.25); font-size:0.65rem;">➔</span>
                    <div id="mj-mult-3" class="mj-mult-badge" style="padding:2px 8px; border-radius:6px; font-size:0.75rem; font-weight:900; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:rgba(255,255,255,0.4); transition:all 0.25s ease;">x3</div>
                    <span style="color:rgba(255,255,255,0.25); font-size:0.65rem;">➔</span>
                    <div id="mj-mult-5" class="mj-mult-badge" style="padding:2px 8px; border-radius:6px; font-size:0.75rem; font-weight:900; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:rgba(255,255,255,0.4); transition:all 0.25s ease;">x5 🔥</div>
                </div>
            `,
            windowStyle: 'border-color: #2b1111; background: radial-gradient(circle at center, #140505 0%, #050202 100%);',
            winStripStyle: 'color:#ef4444; text-shadow:0 0 10px rgba(239,68,68,0.5);',
            initialBannerText: 'TEKAN SPIN UNTUK MEMUTAR MAHJONG',
            controlBarStyle: 'border-color: #3b1717;',
            spinBtnStyle: 'background:linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%); color:#fff; border-color:#fff; box-shadow:0 0 25px rgba(239,68,68,0.7), 0 6px 16px rgba(0,0,0,0.7);',
            maxBtnStyle: 'background:rgba(239,68,68,0.15); border-color:rgba(239,68,68,0.4); color:#ef4444;',
            paytableDialogStyle: 'border-color:#ef4444; box-shadow:0 0 30px rgba(239,68,68,0.35);',
            paytableBorderColor: 'rgba(239,68,68,0.3)',
            paytableTitle: 'TABEL BAYARAN MAHJONG WAYS',
            paytableDesc: '6 Kolom, 8 Baris &amp; 10 Garis Payout Macau. Simbol cocok dihitung dari kiri ke kanan.',
            paytableCols: '1fr',
            paytableRowsHTML: SYMBOLS.map(s => renderMahjongPaytableRow(s)).join(''),
            winBg: 'rgba(239,68,68,0.2)',
            winBorder: '#ef4444'
        });
    }

    updateMultiplierBar(multiplier = 1) {
        [1, 2, 3, 5].forEach(val => {
            const el = document.getElementById(`mj-mult-${val}`);
            if (!el) return;
            const isActive = multiplier === val || (val === 5 && multiplier >= 5);
            if (isActive) {
                el.style.background = val >= 5 ? 'linear-gradient(135deg, #fbbf24, #ef4444)' : 'rgba(239, 68, 68, 0.4)';
                el.style.borderColor = val >= 5 ? '#fbbf24' : '#ef4444';
                el.style.color = '#fff';
                el.style.boxShadow = val >= 5 ? '0 0 14px rgba(251, 191, 36, 0.8)' : '0 0 10px rgba(239, 68, 68, 0.7)';
                el.style.transform = 'scale(1.15)';
            } else {
                el.style.background = 'rgba(255,255,255,0.06)';
                el.style.borderColor = 'rgba(255,255,255,0.12)';
                el.style.color = 'rgba(255,255,255,0.4)';
                el.style.boxShadow = 'none';
                el.style.transform = 'scale(1)';
            }
        });
    }

    _onSpinStart() {
        this.updateMultiplierBar(1);
    }

    weightedRandom(luck, betAmount = 0, col = 0) {
        const eligibleSymbols = SYMBOLS.filter(s => !s.isWild);
        const selected = this.pickWeightedSymbol(eligibleSymbols, luck, betAmount);
        const isGold = (col >= 1 && col <= 4 && Math.random() < 0.22);
        return { emoji: selected.emoji, isGold, isWild: false };
    }

    _generateSpinGrid(luck, betAmount, evalResult) {
        const resultMatrix = [];
        for (let col = 0; col < 6; col++) {
            const colSymbols = [];
            for (let row = 0; row < 8; row++) {
                colSymbols.push(this.weightedRandom(luck, betAmount, col));
            }
            resultMatrix.push(colSymbols);
        }

        if (evalResult.isNearMiss) {
            const teaserSymbol = Math.random() < 0.6 ? '🀄' : '🀅';
            const targetLine = PAYLINES[Math.floor(Math.random() * 4)];
            resultMatrix[0][targetLine.coordinates[0]] = { emoji: teaserSymbol, isGold: false, isWild: false };
            resultMatrix[1][targetLine.coordinates[1]] = { emoji: teaserSymbol, isGold: true, isWild: false };
            resultMatrix[2][targetLine.coordinates[2]] = { emoji: '🀫', isGold: false, isWild: false };
        } else if (evalResult.targetOutcome === 'ZONK') {
            PAYLINES.forEach(line => {
                const s0 = getTileEmoji(resultMatrix[0][line.coordinates[0]]);
                const s1 = getTileEmoji(resultMatrix[1][line.coordinates[1]]);
                const s2 = getTileEmoji(resultMatrix[2][line.coordinates[2]]);
                if (s0 === s1 && s1 === s2) {
                    resultMatrix[2][line.coordinates[2]] = { emoji: (s2 === '🀫') ? '🀐' : '🀫', isGold: false, isWild: false };
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
        let hasDynamite = false;

        PAYLINES.forEach((line) => {
            const firstSym = this.grid[0][line.coordinates[0]];
            let targetEmoji = isTileWild(firstSym) ? null : getTileEmoji(firstSym);
            let matchLength = 1;

            for (let col = 1; col < 6; col++) {
                const sym = this.grid[col][line.coordinates[col]];
                if (isTileWild(sym)) {
                    matchLength++;
                } else {
                    const em = getTileEmoji(sym);
                    if (!targetEmoji) {
                        targetEmoji = em;
                        matchLength++;
                    } else if (em === targetEmoji) {
                        matchLength++;
                    } else {
                        break;
                    }
                }
            }

            if (!targetEmoji) targetEmoji = '🐉';

            if (matchLength >= 3) {
                const spec = SYMBOLS.find(s => s.emoji === targetEmoji) || SYMBOLS[1];
                const lineMultiplier = this.calcLineMultiplier(spec.multiplier3x, matchLength);
                const lineWin = Math.round(lineBet * lineMultiplier);
                stepPayout += lineWin;
                winsList.push(`${line.name}: ${matchLength}x ${targetEmoji} (+${financeManager.formatCurrency(lineWin)} TC)`);
                winningLines.push(line);

                for (let col = 0; col < matchLength; col++) {
                    const row = line.coordinates[col];
                    winningCoordsMap.set(`${col}-${row}`, { col, row });
                }
            }
        });

        for (let col = 0; col < 6; col++) {
            for (let row = 0; row < 8; row++) {
                if (getTileEmoji(this.grid[col][row]) === '🀄') {
                    hasDynamite = true;
                }
            }
        }

        return {
            stepPayout,
            winningLines,
            winningCoords: Array.from(winningCoordsMap.values()),
            winsList,
            hasDynamite
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
            const { stepPayout, winningLines, winningCoords, winsList, hasDynamite: foundDragon } = this._checkGridWins(lineBet);
            if (foundDragon) hasDynamite = true;

            if (winningCoords.length === 0) {
                cascadeRound = cascadeRound === 1 ? 0 : cascadeRound - 1;
                break;
            }

            const comboMultiplier = Math.min(cascadeRound, 5);
            const stepWin = Math.round(stepPayout * comboMultiplier);
            totalPayout += stepWin;
            allWinsList.push(...winsList.map(w => `[Runtuhan #${cascadeRound} ×${comboMultiplier}] ${w}`));

            this.updateMultiplierBar(comboMultiplier);
            this._highlightWinningCells(winningLines, winningCoords);

            if (winDisplay) {
                winDisplay.innerHTML = `
                    <div class="win-text-ruby">
                        <span style="color:#ef4444; font-weight:900;">🐉 MAHJONG COMBO x${comboMultiplier}!</span>
                        <span class="win-payout-num">+${financeManager.formatCurrency(totalPayout)} TC</span>
                    </div>
                `;
            }

            AuraSound.playComboUp(comboMultiplier);
            await new Promise(r => setTimeout(r, this.isSpeedUp ? 220 : 500));

            // Signature Mechanic: Golden Plated Tiles that participated in wins transform into WILD (🐉)!
            let wildTransforms = 0;
            const newGrid = this._buildTumbledGrid(
                winningCoords,
                (col) => this.weightedRandom(luck, betAmount, col),
                (currentTile) => {
                    if (isTileGold(currentTile)) {
                        wildTransforms++;
                        return { emoji: '🐉', isWild: true, isGold: false };
                    }
                    return null;
                }
            );

            if (wildTransforms > 0) {
                AuraSound.playWildTransform();
                this.spawnPraiseText(`WILD TRANSFORM! 🐉✨ (${wildTransforms}x)`);
                this.spawnParticles(20, 'gold');
            }

            await this._animateCascadeDrop(winningCoords, newGrid);
            this.grid = newGrid;
            await new Promise(r => setTimeout(r, this.isSpeedUp ? 100 : 250));
        }

        if (hasDynamite) {
            this.shakeCabinet();
            this.spawnParticles(15, 'spark');
            this.spawnParticles(20, 'dust');
        }

        const strikeTexts = ['HU! 🐉', 'NICE TILE! 🎋', 'MATCH! 💮'];
        this._finalizeSpinOutcome({
            betAmount,
            finalPayout: totalPayout,
            winDisplay,
            incomeDescription: `Kemenangan Slot Runtuhan Mahjong Ways (${cascadeRound}x Kombo)`,
            extraEvents: cascadeRound >= 2 ? ['action:mahjongCombo'] : [],
            praiseText: cascadeRound > 1 ? `KOMBO ${cascadeRound}x! 🐉` : strikeTexts[Math.floor(Math.random() * strikeTexts.length)],
            winSummaryHTML: `
                <div class="win-text-ruby">
                    <span>🀄</span>
                    <span>MENANG TOTAL ${cascadeRound > 1 ? `(${cascadeRound}x RUNTUHAN)` : ''}</span>
                    <span class="win-payout-num">+${financeManager.formatCurrency(totalPayout)} TC</span>
                    <span>🐉</span>
                </div>
                <div style="font-size:0.65rem; color:rgba(255,255,255,0.5); max-height:60px; overflow-y:auto; width:100%; margin-top:2px;">
                    ${allWinsList.join(' | ')}
                </div>
            `
        });
    }
}
