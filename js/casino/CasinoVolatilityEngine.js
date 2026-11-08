/**
 * CasinoVolatilityEngine.js - Dynamic Session Volatility & House Math Director
 * Implements authentic high-volatility slot game dynamics:
 * 
 * 1. Low Hit Frequency (~30-38% win hit rate): The majority of spins are non-winning spins,
 *    building genuine anticipation and preventing constant linear balance inflation.
 * 2. Near-Miss Mathematics: Teases potential wins (e.g. 2 matching symbols on payline,
 *    or 7/8 scatter symbols) without triggering a payout.
 * 3. Loss Disguised as Win (LDW): Low cascade return (0.2x-0.7x of bet) where player 
 *    experiences visual feedback while net balance gradually adjusts downward.
 * 4. Bet Adjustment Reaction: Detects aggressive bet increases after wins, dampening payout probability.
 * 5. Eruption Cycles: Triggers rewarding cascade sequences after prolonged dry spells (6-10 spins),
 *    delivering dynamic balance swings (rollercoaster behavior).
 * 6. Zero tacky or intrusive UI messages: All mechanics operate purely via mathematical distribution.
 */

import gameState from '../core/GameState.js';
import AuraSound from '../ui/AuraSound.js';

export class CasinoVolatilityEngine {
    constructor() {
        this.lossStreak = 0;
        this.winStreak = 0;
        this.lastBetAmount = 100000;
        this.totalSpins = 0;
        this.sessionNetWon = 0;
        this.lastWinAmount = 0;
    }

    /**
     * Evaluates player's current action & returns the target spin outcome
     * @param {number} currentBet 
     * @param {number} playerBalance 
     * @param {number} baseLuck 
     * @returns {object} { targetOutcome: 'ZONK'|'TRICKLE'|'PROFIT'|'ERUPTION', isNearMiss: boolean, mode: string }
     */
    evaluateSpin(currentBet, playerBalance, baseLuck = 1.0) {
        this.totalSpins++;

        // 1. Detect sudden bet increase (Player getting greedy after a win or raising bet significantly)
        const isBetRaised = (this.lastBetAmount > 0 && currentBet >= this.lastBetAmount * 1.5);

        let targetOutcome = 'ZONK';
        let isNearMiss = false;

        // Rate ON / VIP cheat boost override
        const plays = gameState.get('casino.ratePlays') || 0;
        const rateOn = plays >= 250 || baseLuck >= 2.0;

        if (rateOn) {
            // Rate ON mode: High frequency of medium/big wins
            const rand = Math.random();
            if (rand < 0.40) targetOutcome = 'PROFIT';
            else if (rand < 0.70) targetOutcome = 'ERUPTION';
            else targetOutcome = 'TRICKLE';
            return { targetOutcome, isNearMiss: false, mode: 'RATE_ON' };
        }

        // ── Rule 1: Bet Raise Reaction ──
        if (isBetRaised && (this.winStreak >= 1 || this.lastWinAmount > this.lastBetAmount)) {
            // Player won and immediately increased bet: high probability of dry spin with near-miss
            const rand = Math.random();
            if (rand < 0.88) {
                targetOutcome = 'ZONK';
                isNearMiss = (rand < 0.45);
                return { targetOutcome, isNearMiss, mode: 'BET_RAISE_REACTION' };
            }
        }

        // ── Rule 2: Dynamic Comeback Cycle ──
        // After 6 to 10 consecutive non-profit spins, trigger an exciting cascade comeback
        const eruptionThreshold = Math.floor(6 + Math.random() * 4); // 6 - 9 spins
        if (this.lossStreak >= eruptionThreshold) {
            targetOutcome = 'ERUPTION';
            this.lossStreak = 0;
            return { targetOutcome, isNearMiss: false, mode: 'COMEBACK_CYCLE' };
        }

        // ── Rule 3: Natural Slot Volatility Curve ──
        const roll = Math.random();

        if (roll < 0.62) {
            // 62% Dry spin (Zero payout)
            targetOutcome = 'ZONK';
            // 25% of dry spins include near-miss tease
            if (Math.random() < 0.25) {
                isNearMiss = true;
            }
        } else if (roll < 0.84) {
            // 22% Low Cascade Return (0.2x to 0.7x of bet, net negative spin)
            targetOutcome = 'TRICKLE';
        } else if (roll < 0.96) {
            // 12% Medium Profit Win - 1.5x to 3.5x of bet
            targetOutcome = 'PROFIT';
        } else {
            // 4% High Volatility Cascade / Big Multiplier
            targetOutcome = 'ERUPTION';
        }

        return { targetOutcome, isNearMiss, mode: 'STANDARD' };
    }

    /**
     * Call after spin payout is calculated to update streaks
     * @param {number} betAmount 
     * @param {number} totalPayout 
     */
    recordOutcome(betAmount, totalPayout) {
        this.lastBetAmount = betAmount;
        this.lastWinAmount = totalPayout;
        this.sessionNetWon += (totalPayout - betAmount);

        if (totalPayout > betAmount) {
            // Net profit
            this.winStreak++;
            this.lossStreak = 0;
        } else {
            // Net negative or dead spin
            this.lossStreak++;
            this.winStreak = 0;
        }
    }

    /**
     * Play near miss audio cue if applicable
     */
    playNearMissCue() {
        try {
            AuraSound.playNearMiss?.();
        } catch (e) {}
    }
}

export const casinoVolatility = new CasinoVolatilityEngine();
export default casinoVolatility;
