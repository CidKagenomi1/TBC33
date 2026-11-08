/**
 * FinanceManager.js - Trilliun Chip Financial Engine
 * Handles chip balance, payouts, bets, formatting, and transaction records.
 */

import gameState from '../core/GameState.js';

class FinanceManager {
    constructor() {
        this.categories = {
            income: ['Jackpot', 'Slot Win', 'Lottery', 'Wheel', 'Parlay', 'Bonus', 'Faucet', 'Lainnya'],
            expense: ['Slot Bet', 'Lottery Ticket', 'Wheel Spin', 'Parlay Bet', 'Lainnya']
        };
    }

    /**
     * Add chip income (win / payout / bonus)
     */
    addIncome(amount, category = 'Lainnya', description = '') {
        const num = Number(amount);
        if (isNaN(num) || num <= 0) return 0;

        const currentBalance = gameState.getBalance();
        const newBalance = currentBalance + num;

        gameState.update('player', p => ({
            ...p,
            balance: newBalance,
            totalWon: (p?.totalWon || 0) + num
        }));

        this.recordTransaction({
            type: 'income',
            amount: num,
            category,
            description,
            timestamp: Date.now()
        });

        gameState.emit('income', { amount: num, category, description });

        return num;
    }

    /**
     * Deduct chips for bet or purchase
     */
    addExpense(amount, category = 'Lainnya', description = '') {
        const num = Number(amount);
        if (isNaN(num) || num <= 0) return 0;

        const currentBalance = gameState.getBalance();
        if (num > currentBalance) {
            throw new Error('Saldo chip tidak mencukupi untuk taruhan ini!');
        }

        const newBalance = currentBalance - num;

        gameState.update('player', p => ({
            ...p,
            balance: newBalance,
            totalBet: (p?.totalBet || 0) + num
        }));

        this.recordTransaction({
            type: 'expense',
            amount: num,
            category,
            description,
            timestamp: Date.now()
        });

        gameState.emit('expense', { amount: num, category, description });

        return num;
    }

    /**
     * Faucet / Top-up bonus chips
     */
    topUp(amount = 5000000, source = 'Daily VIP Faucet') {
        return this.addIncome(amount, 'Faucet', source);
    }

    /**
     * Record a transaction into state history
     */
    recordTransaction(tx) {
        const history = gameState.get('transactions') || [];
        const next = [tx, ...history].slice(0, 50);
        gameState.set('transactions', next);
    }

    /**
     * Format chip amounts cleanly.
     * Amounts >= 100,000,000 are automatically shortened with standard suffixes:
     * M (Million), B (Billion), T (Trillion), Q (Quadrillion), Qi (Quintillion), etc.
     * Examples:
     * - formatCurrency(50000) => "50.000"
     * - formatCurrency(10000000) => "10.000.000"
     * - formatCurrency(99999999) => "99.999.999"
     * - formatCurrency(100000000) => "100M"
     * - formatCurrency(100670000) => "100.67M"
     * - formatCurrency(1250000000) => "1.25B"
     * - formatCurrency(1000000000000) => "1T"
     * - formatCurrency(2500000000000000) => "2.5Q"
     */
    formatCurrency(amount, compact = false) {
        const num = Number(amount);
        if (!Number.isFinite(num) || num === 0) return '0';
        const abs = Math.abs(num);

        // Standard formatting with dot separators for amounts strictly below 100,000,000
        if (!compact && abs < 100000000) {
            return new Intl.NumberFormat('id-ID').format(Math.round(num));
        }

        if (abs < 1000) {
            return compact ? num.toString() : new Intl.NumberFormat('id-ID').format(Math.round(num));
        }

        const UNITS = [
            '', 'K', 'M', 'B', 'T', 'Q', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
            'Dc', 'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod', 'Vg',
            'Uvg', 'Dvg', 'Tvg', 'Qavg', 'Qivg', 'Sxvg', 'Spvg', 'Ocvg', 'Novg', 'Tg',
            'Utg', 'Dtg', 'Ttg'
        ];

        let tier = Math.floor(Math.log10(abs) / 3);
        let divisor = Math.pow(10, tier * 3);
        let scaled = num / divisor;
        let formatted = scaled.toFixed(2).replace(/\.?0+$/, '');

        // Handle edge rounding cases (e.g. 999.999M rounding up to 1000M -> 1B)
        if (Math.abs(parseFloat(formatted)) >= 1000) {
            tier += 1;
            divisor = Math.pow(10, tier * 3);
            scaled = num / divisor;
            formatted = scaled.toFixed(2).replace(/\.?0+$/, '');
        }

        if (tier < UNITS.length) {
            return formatted + UNITS[tier];
        }

        return num.toExponential(2).replace('+', '');
    }
}

const financeManager = new FinanceManager();
if (typeof window !== 'undefined') {
    window.financeManager = financeManager;
}
export default financeManager;

