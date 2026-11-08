/**
 * GameState.js - Trilliun-Bet33 Central State Management
 * Handles persistent state (balance, casino spins, lottery, crypto wallet) via localStorage.
 */

class GameState {
    constructor() {
        this.storageKey = 'trilliun_chip_state_v1';
        this.listeners = new Map();
        this.state = this.getDefaultState();
        this.load();
    }

    getDefaultState() {
        return {
            player: {
                name: 'VIP High Roller',
                balance: 10000000, // 10,000,000 Starting Trilliun Chips
                totalWon: 0,
                totalBet: 0,
                joinedAt: Date.now()
            },
            casino: {
                ratePlays: 0,
                lotteryTokens: 5,
                lotteryJackpot: 500000000, // 500M TC starting progressive jackpot
                lotteryHistory: [],
                freeSpins: 0,
                bonusSpins: 0
            },
            donations: {
                luckMultiplier: 1.0,
                luckTicksRemaining: 0
            },
            crypto: {
                ETH: { amount: 0, avgBuyPrice: 3200, totalInvested: 0 },
                SOL: { amount: 0, avgBuyPrice: 150, totalInvested: 0 }
            },
            settings: {
                soundEnabled: true,
                notificationsEnabled: true
            },
            rewards: {
                lastFaucetClaim: 0,
                lastDailyClaimDate: null,
                dailyStreak: 0,
                dailyDate: '',
                dailyQuests: {},
                achievements: {},
                stats: {
                    totalSpins: 0,
                    totalWheelSpins: 0,
                    totalLotteryTickets: 0,
                    totalParlayBets: 0,
                    highestWin: 0
                }
            },
            transactions: []
        };
    }

    load() {
        try {
            if (typeof window === 'undefined' || !window.localStorage) return;
            const saved = window.localStorage.getItem(this.storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Deep merge with defaults to guarantee new fields are always present
                this.state = this._deepMerge(this.getDefaultState(), parsed);
            }
        } catch (e) {
            console.warn('[GameState] Failed to load saved state from localStorage:', e);
        }
    }

    save() {
        try {
            if (typeof window === 'undefined' || !window.localStorage) return;
            window.localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        } catch (e) {
            console.warn('[GameState] Failed to save state to localStorage:', e);
        }
    }

    reset() {
        this.state = this.getDefaultState();
        this.save();
        this.emit('change', { path: 'player.balance', value: this.state.player.balance });
        this.emit('balanceChanged', this.state.player.balance);
    }

    get(path) {
        if (!path) return this.state;
        const keys = path.split('.');
        let current = this.state;
        for (const key of keys) {
            if (current === undefined || current === null) return undefined;
            current = current[key];
        }
        return current;
    }

    set(path, value) {
        if (!path) return;
        const keys = path.split('.');
        const lastKey = keys.pop();
        let target = this.state;

        for (const key of keys) {
            if (!(key in target) || typeof target[key] !== 'object' || target[key] === null) {
                target[key] = {};
            }
            target = target[key];
        }

        const oldValue = target[lastKey];
        target[lastKey] = value;

        this.save();
        this.emit(path, value, oldValue);
        this.emit('change', { path, value, oldValue });

        if (path === 'player.balance') {
            this.emit('balanceChanged', value, oldValue);
        }
    }

    update(path, updater) {
        const current = this.get(path);
        const next = typeof updater === 'function' ? updater(current) : updater;
        this.set(path, next);
        return next;
    }

    getBalance() {
        return this.get('player.balance') ?? 0;
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    emit(event, ...args) {
        if (this.listeners.has(event)) {
            for (const cb of this.listeners.get(event)) {
                try {
                    cb(...args);
                } catch (err) {
                    console.error(`[GameState] Error in event listener '${event}':`, err);
                }
            }
        }
    }

    _deepMerge(target, source) {
        const output = { ...target };
        if (this._isObject(target) && this._isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this._isObject(source[key])) {
                    if (!(key in target)) {
                        output[key] = source[key];
                    } else {
                        output[key] = this._deepMerge(target[key], source[key]);
                    }
                } else {
                    output[key] = source[key];
                }
            });
        }
        return output;
    }

    _isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }
}

const gameState = new GameState();
if (typeof window !== 'undefined') {
    window.gameState = gameState;
}
export default gameState;
