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
            const now = ctx.currentTime;

            // 1. Initial mechanical whoosh / reel release sweep
            const whooshOsc = ctx.createOscillator();
            const whooshGain = ctx.createGain();
            whooshOsc.type = 'triangle';
            whooshOsc.frequency.setValueAtTime(140, now);
            whooshOsc.frequency.exponentialRampToValueAtTime(360, now + 0.12);
            whooshGain.gain.setValueAtTime(0.06, now);
            whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
            whooshOsc.connect(whooshGain);
            whooshGain.connect(ctx.destination);
            whooshOsc.start(now);
            whooshOsc.stop(now + 0.14);

            // 2. High-speed rhythmic reel ratchet ticks (8 rapid mechanical clicks)
            const tickCount = 8;
            for (let i = 0; i < tickCount; i++) {
                const tickTime = now + 0.02 + i * 0.038;

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                const baseFreq = 480 + (i % 2 === 0 ? 80 : -40);
                osc.frequency.setValueAtTime(baseFreq, tickTime);
                osc.frequency.exponentialRampToValueAtTime(120, tickTime + 0.022);

                const volume = 0.045 - (i * 0.002);
                gain.gain.setValueAtTime(volume, tickTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, tickTime + 0.022);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(tickTime);
                osc.stop(tickTime + 0.022);
            }
        } catch (e) {}
    }

    static playCasinoWin() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Glorious ascending fanfare with bell harmonics:
            // G4 -> C5 -> E5 -> G5 -> C6 -> E6
            const notes = [392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51];

            notes.forEach((freq, idx) => {
                const noteTime = now + idx * 0.075;
                const isFinal = idx >= notes.length - 2;
                const duration = isFinal ? 0.45 : 0.22;

                // Fundamental tone (sine)
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, noteTime);

                const vol = isFinal ? 0.09 : 0.065;
                gain.gain.setValueAtTime(vol, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + duration);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(noteTime);
                osc.stop(noteTime + duration);

                // Sparkling bell overtone (octave harmonic for bright casino chime)
                const bellOsc = ctx.createOscillator();
                const bellGain = ctx.createGain();
                bellOsc.type = 'sine';
                bellOsc.frequency.setValueAtTime(freq * 2, noteTime);

                bellGain.gain.setValueAtTime(vol * 0.35, noteTime);
                bellGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + (duration * 0.8));

                bellOsc.connect(bellGain);
                bellGain.connect(ctx.destination);
                bellOsc.start(noteTime);
                bellOsc.stop(noteTime + duration);
            });

            // Final chord chime shimmer
            const chordTime = now + notes.length * 0.075;
            [1046.50, 1318.51, 1567.98].forEach((chordFreq) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(chordFreq, chordTime);
                gain.gain.setValueAtTime(0.05, chordTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, chordTime + 0.5);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(chordTime);
                osc.stop(chordTime + 0.5);
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

    /**
     * Synthesizes a single high-pitched metallic coin impact / clink
     */
    static _playSingleCoin(ctx, time, pitchShift = 1, volume = 0.05) {
        // Real metallic clink has two distinct high inharmonic frequencies
        const f1 = 2850 * pitchShift;
        const f2 = 4400 * pitchShift;

        [f1, f2].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = idx === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, time);

            const v = volume * (idx === 0 ? 1 : 0.6);
            gain.gain.setValueAtTime(v, time);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(time);
            osc.stop(time + 0.07);
        });
    }

    /**
     * Plays a rich cascading stream of metallic coins pouring into a tray (chip shower)
     */
    static playClaimMoney(coins = 8) {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            const count = Math.max(3, Math.min(coins || 8, 16));

            for (let i = 0; i < count; i++) {
                // Staggered timing with natural jitter
                const jitter = (Math.random() - 0.5) * 0.015;
                const coinTime = now + (i * 0.045) + jitter;
                // Pitch variation (0.9 to 1.15) for diverse coin sizes
                const pitch = 0.92 + Math.random() * 0.22;
                const vol = 0.04 + Math.random() * 0.025;

                this._playSingleCoin(ctx, Math.max(now, coinTime), pitch, vol);
            }
        } catch (e) {}
    }

    static playCoinStream(coins = 10) {
        this.playClaimMoney(coins);
    }

    static playCoinClink() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            this._playSingleCoin(ctx, ctx.currentTime, 1, 0.06);
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

