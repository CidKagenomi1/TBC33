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
     * Format chip amounts cleanly
     * Examples:
     * formatCurrency(1250000) => "1.250.000"
     * formatCurrency(1250000, true) => "1.3M"
     */
    formatCurrency(amount, compact = false) {
        const num = Number(amount) || 0;
        const abs = Math.abs(num);

        if (compact) {
            if (abs >= 1e12) return (num / 1e12).toFixed(1).replace(/\.0$/, '') + 'T';
            if (abs >= 1e9)  return (num / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
            if (abs >= 1e6)  return (num / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
            if (abs >= 1e3)  return (num / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
            return num.toString();
        }

        return new Intl.NumberFormat('id-ID').format(Math.round(num));
    }
}

const financeManager = new FinanceManager();
if (typeof window !== 'undefined') {
    window.financeManager = financeManager;
}
export default financeManager;

