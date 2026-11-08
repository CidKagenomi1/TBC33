/**
 * AuraSound.js - Pure Web Audio Synthesizer for Trilliun Chip
 * Produces crisp, vintage and modern casino sound effects offline with zero external audio assets.
 */

import gameState from '../core/GameState.js';

class AuraSound {
    static isEnabled() {
        try {
            return gameState.get('settings.soundEnabled') !== false;
        } catch (e) {
            return true;
        }
    }

    static getContext() {
        if (!this.isEnabled()) return null;
        if (typeof window === 'undefined') return null;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        if (!this._ctx) {
            this._ctx = new AudioCtx();
        }
        if (this._ctx.state === 'suspended') {
            this._ctx.resume().catch(() => {});
        }
        return this._ctx;
    }

    static playTap() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.02);

            gain.gain.setValueAtTime(0.04, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.02);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.02);
        } catch (e) {}
    }

    static playClick() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.03);

            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.03);
        } catch (e) {}
    }

    static playCasinoSpin() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;

            // Fast ratcheting click / reel tick
            const now = ctx.currentTime;
            for (let i = 0; i < 4; i++) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sawtooth';
                const time = now + i * 0.035;
                osc.frequency.setValueAtTime(350 + i * 80, time);
                osc.frequency.exponentialRampToValueAtTime(120, time + 0.025);

                gain.gain.setValueAtTime(0.04, time);
                gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.025);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(time);
                osc.stop(time + 0.025);
            }
        } catch (e) {}
    }

    static playCasinoWin() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;

            // Joyful ascending arpeggio (C5 -> E5 -> G5 -> C6)
            const notes = [523.25, 659.25, 783.99, 1046.50];
            const now = ctx.currentTime;

            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                const noteTime = now + idx * 0.08;
                osc.frequency.setValueAtTime(freq, noteTime);

                gain.gain.setValueAtTime(0.08, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.25);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(noteTime);
                osc.stop(noteTime + 0.25);
            });
        } catch (e) {}
    }

    static playCascadePop() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(650, now);
            osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.12);
        } catch (e) {}
    }

    static playTumbleDrop() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.09);

            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.09);
        } catch (e) {}
    }

    static playComboUp(level = 1) {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            const baseNotes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51];
            const noteIdx = Math.min(level - 1, baseNotes.length - 1);
            const freq = baseNotes[Math.max(0, noteIdx)];

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + 0.16);

            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.18);
        } catch (e) {}
    }

    static playDynamiteBlast() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.38);
        } catch (e) {}
    }

    static playWildTransform() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            [659.25, 783.99, 987.77, 1318.51].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                const t = now + i * 0.05;
                osc.frequency.setValueAtTime(freq, t);

                gain.gain.setValueAtTime(0.08, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + 0.22);
            });
        } catch (e) {}
    }

    static playZeusThunder() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(55, now + 0.4);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.45);
        } catch (e) {}
    }

    static playClaimMoney() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;

            // Coin drop shimmer
            const now = ctx.currentTime;
            [987.77, 1318.51, 1567.98].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                const t = now + i * 0.05;
                osc.frequency.setValueAtTime(freq, t);

                gain.gain.setValueAtTime(0.07, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + 0.18);
            });
        } catch (e) {}
    }

    static playCasinoLose() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;

            // Low gentle descending thud
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(90, now + 0.18);

            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.18);
        } catch (e) {}
    }

    static playNearMiss() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            // Dramatic rising suspense followed by drop
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.linearRampToValueAtTime(580, now + 0.18);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.38);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.linearRampToValueAtTime(0.12, now + 0.18);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.38);
        } catch (e) {}
    }

    static playSuccessAlert() {
        this.playCasinoWin();
    }

    static playInfoAlert() {
        this.playClick();
    }

    static playWarningAlert() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(330, now + 0.08);

            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.2);
        } catch (e) {}
    }

    static playErrorAlert() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.linearRampToValueAtTime(110, now + 0.15);

            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.15);
        } catch (e) {}
    }
}

export default AuraSound;

