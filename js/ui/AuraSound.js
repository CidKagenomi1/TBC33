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

    /**
     * ── Rocket-X Crash Sound Synthesizers ──
     */
    static playRocketLaunch() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Rocket ignition sweep
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(80, now);
            osc.frequency.exponentialRampToValueAtTime(320, now + 0.35);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.35);
        } catch (e) {}
    }

    static playRocketHum(multiplier = 1.0) {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';

            // Frequency scales smoothly with multiplier (from 160Hz up to 600Hz)
            const baseFreq = Math.min(650, 150 + Math.log(multiplier + 0.5) * 110);
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.linearRampToValueAtTime(baseFreq + 25, now + 0.08);

            gain.gain.setValueAtTime(0.035, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        } catch (e) {}
    }

    static playCrashExplosion() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // 1. Deep rumble sub-bass
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.45);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.45);

            // 2. High snap impact
            const snap = ctx.createOscillator();
            const snapGain = ctx.createGain();
            snap.type = 'square';
            snap.frequency.setValueAtTime(260, now);
            snap.frequency.exponentialRampToValueAtTime(60, now + 0.09);

            snapGain.gain.setValueAtTime(0.12, now);
            snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

            snap.connect(snapGain);
            snapGain.connect(ctx.destination);
            snap.start(now);
            snap.stop(now + 0.09);
        } catch (e) {}
    }

    static playHeartbeat() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Dual thumps: "lub-dub"
            [0, 0.12].forEach((offset, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                const f = idx === 0 ? 75 : 62;
                osc.frequency.setValueAtTime(f, now + offset);
                osc.frequency.exponentialRampToValueAtTime(35, now + offset + 0.09);

                gain.gain.setValueAtTime(0.12, now + offset);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.09);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + offset);
                osc.stop(now + offset + 0.09);
            });
        } catch (e) {}
    }

    static playCashOutSuccess() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Sparkling chime arpeggio: C6 -> E6 -> G6 -> C7
            const notes = [1046.50, 1318.51, 1567.98, 2093.00];
            notes.forEach((freq, idx) => {
                const t = now + idx * 0.045;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);

                gain.gain.setValueAtTime(0.08, t);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.22);
            });
        } catch (e) {}
    }

    /**
     * ── Tropical Tiki Coconut Plinko Synthesizers ──
     */
    static playCoconutLaunch() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Airy whoosh / palm rustle
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

            gain.gain.setValueAtTime(0.045, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        } catch (e) {}
    }

    static playCoconutBounce(pitchOffset = 1.0, isGolden = false) {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Hollow woody "tok" sound (marimba / bamboo block)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';

            // Natural jitter in pitch with row pitch progression
            const jitter = (Math.random() - 0.5) * 60;
            const freq = (680 + jitter) * pitchOffset;
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.35, now + 0.042);

            gain.gain.setValueAtTime(0.075, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.042);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.042);

            // If Golden Coconut, add sparkling celestial bell chime harmonic!
            if (isGolden) {
                const goldOsc = ctx.createOscillator();
                const goldGain = ctx.createGain();
                goldOsc.type = 'sine';
                const bellFreq = (1850 + (Math.random() - 0.5) * 150) * pitchOffset;
                goldOsc.frequency.setValueAtTime(bellFreq, now);
                goldOsc.frequency.exponentialRampToValueAtTime(bellFreq * 0.85, now + 0.09);

                goldGain.gain.setValueAtTime(0.06, now);
                goldGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

                goldOsc.connect(goldGain);
                goldGain.connect(ctx.destination);
                goldOsc.start(now);
                goldOsc.stop(now + 0.09);
            }
        } catch (e) {}
    }

    static playCoconutSplash() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Water splash & sand basket thud
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(90, now + 0.09);

            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.09);
        } catch (e) {}
    }

    static playCoconutLanding(multiplier = 1.0, isGolden = false) {
        try {
            if (multiplier >= 25.0) {
                this.playTikiJackpot();
                return;
            }

            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            if (multiplier >= 4.0) {
                // Cheerful tropical marimba triad
                const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
                notes.forEach((freq, idx) => {
                    const t = now + idx * 0.055;
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, t);
                    gain.gain.setValueAtTime(0.075, t);
                    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.18);
                });
            } else if (multiplier >= 1.0) {
                // Crisp coin / water harmonic chord (C5, G5)
                [523.25, 783.99].forEach((freq, idx) => {
                    const t = now + idx * 0.035;
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, t);
                    gain.gain.setValueAtTime(0.065, t);
                    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.14);
                });
            } else {
                // Below 1x: Soft hollow wooden thud & water splash
                this.playCoconutSplash();
            }
        } catch (e) {}
    }

    static playTikiJackpot() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Cheerful tropical marimba / steel-drum melody: C5 -> E5 -> G5 -> B5 -> C6
            const melody = [523.25, 659.25, 783.99, 987.77, 1046.50];
            melody.forEach((freq, idx) => {
                const t = now + idx * 0.07;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, t);

                gain.gain.setValueAtTime(0.09, t);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.28);
            });
        } catch (e) {}
    }

    /**
     * ── Deep Sea Fishing Crash Synthesizers ──
     */
    static playReelCast() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Fishing rod whoosh + spool spin
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(450, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.28);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.28);
        } catch (e) {}
    }

    static playReelCrank(multiplier = 1.0) {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Metallic ratchet click of fishing reel
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';

            const baseFreq = Math.min(850, 240 + Math.log(multiplier + 0.5) * 140);
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.025);

            gain.gain.setValueAtTime(0.045, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.025);
        } catch (e) {}
    }

    static playLineSnap() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Sharp metallic "TWANG / SNAP"
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(580, now);
            osc.frequency.exponentialRampToValueAtTime(70, now + 0.18);

            gain.gain.setValueAtTime(0.14, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.18);

            // Water splash of fish escaping
            const splash = ctx.createOscillator();
            const splashGain = ctx.createGain();
            splash.type = 'triangle';
            splash.frequency.setValueAtTime(220, now + 0.04);
            splash.frequency.exponentialRampToValueAtTime(50, now + 0.28);
            splashGain.gain.setValueAtTime(0.09, now + 0.04);
            splashGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
            splash.connect(splashGain);
            splashGain.connect(ctx.destination);
            splash.start(now + 0.04);
            splash.stop(now + 0.28);
        } catch (e) {}
    }

    static playStrikeSuccess() {
        this.playCashOutSuccess();
    }

    /**
     * ── Pop Drink! Vending Machine Plinko Synthesizers ──
     */
    static playVendingDispense() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Mechanical coil click / solenoid release
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(480, now);
            osc.frequency.exponentialRampToValueAtTime(120, now + 0.05);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.05);

            // Can drop release thud
            const thud = ctx.createOscillator();
            const thudGain = ctx.createGain();
            thud.type = 'triangle';
            thud.frequency.setValueAtTime(260, now + 0.03);
            thud.frequency.exponentialRampToValueAtTime(60, now + 0.1);
            thudGain.gain.setValueAtTime(0.1, now + 0.03);
            thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

            thud.connect(thudGain);
            thudGain.connect(ctx.destination);
            thud.start(now + 0.03);
            thud.stop(now + 0.1);
        } catch (e) {}
    }

    static playCanClink(pitchOffset = 1.0) {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Metallic aluminum can impact "ting / clink"
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';

            const jitter = (Math.random() - 0.5) * 160;
            const freq = (1750 + jitter) * pitchOffset;
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.82, now + 0.045);

            gain.gain.setValueAtTime(0.07, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

            // Subtle second metallic harmonic
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(freq * 2.14, now);
            gain2.gain.setValueAtTime(0.03, now);
            gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.045);
            osc2.start(now);
            osc2.stop(now + 0.03);
        } catch (e) {}
    }

    static playCanVendLand(multiplier = 1.0) {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Metal retrieval chute landing thud (Ka-chunk!)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.12);

            // If high multiplier (>= 5x), play can pop
            if (multiplier >= 5) {
                this.playSodaCanOpen();
            }
        } catch (e) {}
    }

    static playSodaCanOpen() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // 1. Crisp tab pop crack
            const pop = ctx.createOscillator();
            const popGain = ctx.createGain();
            pop.type = 'square';
            pop.frequency.setValueAtTime(1200, now);
            pop.frequency.exponentialRampToValueAtTime(320, now + 0.03);
            popGain.gain.setValueAtTime(0.12, now);
            popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

            pop.connect(popGain);
            popGain.connect(ctx.destination);
            pop.start(now);
            pop.stop(now + 0.03);

            // 2. Rushing fizzy carbonation noise (Tssshhhh!)
            const bufferSize = ctx.sampleRate * 0.22;
            const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            const whiteNoise = ctx.createBufferSource();
            whiteNoise.buffer = noiseBuffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(4200, now + 0.02);
            filter.frequency.exponentialRampToValueAtTime(1800, now + 0.22);
            filter.Q.value = 3.0;

            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.09, now + 0.02);
            noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

            whiteNoise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(ctx.destination);

            whiteNoise.start(now + 0.02);
            whiteNoise.stop(now + 0.22);
        } catch (e) {}
    }

    static playVendingJackpot() {
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Upbeat neon Japanese vending machine melody: G5 -> B5 -> D6 -> G6
            const notes = [783.99, 987.77, 1174.66, 1567.98];
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const noteTime = now + (idx * 0.075);

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, noteTime);

                gain.gain.setValueAtTime(0.11, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.16);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(noteTime);
                osc.stop(noteTime + 0.16);
            });
        } catch (e) {}
    }
}

export default AuraSound;

