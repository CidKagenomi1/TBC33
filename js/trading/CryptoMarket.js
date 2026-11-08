/**
 * CryptoMarket.js - Trilliun Chip Crypto Rewards Engine
 * Handles cryptocurrency rewards (ETH, SOL) won from the Spinning Wheel.
 */

import gameState from '../core/GameState.js';

class CryptoMarket {
    constructor() {
        this.cryptos = {
            ETH: {
                symbol: 'ETH',
                name: 'Ethereum',
                price: 3250.00,
                change24h: 3.42
            },
            SOL: {
                symbol: 'SOL',
                name: 'Solana',
                price: 155.00,
                change24h: 6.85
            },
            BTC: {
                symbol: 'BTC',
                name: 'Bitcoin',
                price: 68500.00,
                change24h: 2.15
            }
        };
    }

    getCrypto(symbol) {
        if (!symbol) return null;
        const key = typeof symbol === 'string' ? symbol.toUpperCase() : symbol;
        return this.cryptos[key] || null;
    }

    getAllCryptos() {
        return Object.values(this.cryptos);
    }

    addToWallet(symbol, amount, price) {
        const key = typeof symbol === 'string' ? symbol.toUpperCase() : symbol;
        const currentWallet = gameState.get('crypto') || {};
        const existing = currentWallet[key] || { amount: 0, avgBuyPrice: 0, totalInvested: 0 };

        const unitPrice = price || (this.cryptos[key]?.price || 1);
        const newAmount = Number(existing.amount || 0) + Number(amount);
        const newInvested = Number(existing.totalInvested || 0) + (unitPrice * Number(amount));

        const updatedWallet = {
            ...currentWallet,
            [key]: {
                amount: newAmount,
                avgBuyPrice: newAmount > 0 ? newInvested / newAmount : unitPrice,
                totalInvested: newInvested
            }
        };

        gameState.set('crypto', updatedWallet);
        return updatedWallet[key];
    }
}

const cryptoMarket = new CryptoMarket();
if (typeof window !== 'undefined') {
    window.cryptoMarket = cryptoMarket;
}
export default cryptoMarket;

