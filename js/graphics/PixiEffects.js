/**
 * PixiEffects.js - Trilliun Chip Cinema-Grade GSAP & PixiJS Visual FX
 * Handles:
 * - Fullscreen Big Win / Mega Win / Jackpot Celebrations with PixiJS WebGL particles
 * - GSAP Rolling Number Counters
 * - Flying Golden Chips from reels to the balance topbar
 * - Micro-interactions (Button squashes, glows, shakes)
 */

import financeManager from '../finance/FinanceManager.js';
import AuraSound from '../ui/AuraSound.js';

class PixiEffects {
    constructor() {
        this.overlayContainer = null;
        this.pixiApp = null;
        this.coinTextures = [];
        this.isPixiReady = false;
        this._initOverlay();
    }

    _getGSAP() {
        return (typeof window !== 'undefined' && window.gsap) ? window.gsap : null;
    }

    _getPIXI() {
        return (typeof window !== 'undefined' && window.PIXI) ? window.PIXI : null;
    }

    _initOverlay() {
        if (typeof document === 'undefined') return;
        let overlay = document.getElementById('trilliun-fx-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'trilliun-fx-overlay';
            overlay.style.cssText = `
                position: fixed;
                inset: 0;
                z-index: 99999;
                pointer-events: none;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
                overflow: hidden;
            `;
            document.body.appendChild(overlay);
        }
        this.overlayContainer = overlay;
    }

    /**
     * Tiered Celebration Popups with GSAP & PixiJS:
     * - BIG WIN: >= 15x Bet (Gold Theme, 160 Coins)
     * - MEGA WIN: >= 40x Bet (Cyan Diamond Theme, 260 Coins)
     * - SENSATIONAL MAXWIN: >= 100x Bet (Royal Ruby/Gold Theme, 420 Coins + Thunder)
     * - Dynamic progressive tier morphing as the number counter rolls up!
     */
    celebrateWin({ amount, bet = 100000, type = null, onComplete = null }) {
        if (typeof document === 'undefined') return;
        if (!this.overlayContainer) {
            this._initOverlay();
        }
        if (!this.overlayContainer) return;

        const gsap = this._getGSAP();
        const PIXI = this._getPIXI();

        this.overlayContainer.style.pointerEvents = 'auto';
        this.overlayContainer.style.background = 'radial-gradient(circle at center, rgba(30, 20, 10, 0.88) 0%, rgba(5, 4, 3, 0.96) 100%)';
        this.overlayContainer.style.opacity = '1';

        const effectiveBet = Math.max(1000, bet || 100000);
        const finalRatio = amount / effectiveBet;
        const targetTier = type || (finalRatio >= 100 ? 'sensational' : (finalRatio >= 40 ? 'mega' : 'big'));

        // Theme specifications
        const THEMES = {
            win: {
                title: '✨ NICE WIN! ✨',
                gradient: 'linear-gradient(180deg, #ffffff 0%, #d1fae5 20%, #10b981 45%, #047857 50%, #6ee7b7 75%, #064e3b 100%)',
                glow: '#10b981',
                borderColor: '#059669',
                coinCount: 100
            },
            big: {
                title: '🔥 BIG WIN! 🔥',
                gradient: 'linear-gradient(180deg, #ffffff 0%, #fff4b8 20%, #ffd700 45%, #b47800 50%, #ffe270 75%, #784c00 100%)',
                glow: '#fbbf24',
                borderColor: '#f59e0b',
                coinCount: 160
            },
            mega: {
                title: '⚡ MEGA WIN! ⚡',
                gradient: 'linear-gradient(180deg, #ffffff 0%, #e0f2fe 20%, #38bdf8 45%, #0369a1 50%, #bae6fd 75%, #075985 100%)',
                glow: '#38bdf8',
                borderColor: '#0284c7',
                coinCount: 260
            },
            sensational: {
                title: '👑 SENSATIONAL MAXWIN! 👑',
                gradient: 'linear-gradient(180deg, #ffffff 0%, #ffe4e6 20%, #f43f5e 45%, #be123c 50%, #fda4af 75%, #881337 100%)',
                glow: '#f43f5e',
                borderColor: '#e11d48',
                coinCount: 420
            },
            jackpot: {
                title: '🏆 GRAND JACKPOT! 🏆',
                gradient: 'linear-gradient(180deg, #ffffff 0%, #fef08a 20%, #eab308 45%, #a16207 50%, #fde047 75%, #713f12 100%)',
                glow: '#eab308',
                borderColor: '#ca8a04',
                coinCount: 500
            }
        };

        // Normalize targetTier to ensure it exists in THEMES
        const normalizedTier = (targetTier && THEMES[targetTier]) ? targetTier : (finalRatio >= 100 ? 'sensational' : (finalRatio >= 40 ? 'mega' : 'big'));
        const activeTheme = THEMES[normalizedTier] || THEMES.big;

        let currentTier = 'big';
        const initialTheme = THEMES.big;
        const duration = (normalizedTier === 'jackpot' || normalizedTier === 'sensational') ? 4.2 : (normalizedTier === 'mega' ? 3.2 : 2.4);

        // Render HTML content
        this.overlayContainer.innerHTML = `
            <canvas id="win-fx-canvas" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;"></canvas>
            <div id="win-fx-card" style="
                position: relative;
                z-index: 2;
                text-align: center;
                padding: clamp(1.25rem, 4vw, 2.25rem) clamp(1rem, 3.5vw, 2rem);
                background: linear-gradient(180deg, rgba(22, 17, 13, 0.96) 0%, rgba(10, 8, 6, 0.98) 100%);
                border: 3px solid ${initialTheme.borderColor};
                border-radius: 24px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.95), 0 0 45px ${initialTheme.glow}66, inset 0 0 35px rgba(0,0,0,0.85);
                width: 90vw;
                max-width: 480px;
                box-sizing: border-box;
                transform: scale(0.6);
                opacity: 0;
                transition: border-color 0.3s ease, box-shadow 0.3s ease;
                overflow: hidden;
            ">
                <div id="win-fx-badge" style="
                    font-family: var(--font-display, 'Russo One', sans-serif);
                    font-size: clamp(1.35rem, 4.8vw, 2.5rem);
                    font-weight: 400;
                    line-height: 1.15;
                    letter-spacing: 0.05em;
                    background: ${initialTheme.gradient};
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 2px 0 rgba(0,0,0,0.95)) drop-shadow(0 4px 8px rgba(0,0,0,0.95)) drop-shadow(0 0 24px ${initialTheme.glow});
                    margin-bottom: 0.35rem;
                    text-transform: uppercase;
                    word-break: normal;
                    white-space: normal;
                    transition: all 0.3s ease;
                ">${initialTheme.title}</div>
                
                <div style="font-family: var(--font-heading, sans-serif); font-size: 0.75rem; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.15em; font-weight: 800; margin-bottom: 0.35rem;">
                    TOTAL KEMENANGAN
                </div>

                <div id="win-fx-counter-wrapper" style="margin-bottom: 1.25rem;">
                    <div id="win-fx-counter" style="
                        font-family: var(--font-num, 'Rajdhani', sans-serif);
                        font-size: clamp(1.6rem, 6.2vw, 3.6rem);
                        font-weight: 800;
                        line-height: 1.1;
                        letter-spacing: 0.03em;
                        color: #fff;
                        filter: drop-shadow(0 2px 0 rgba(0,0,0,0.95)) drop-shadow(0 4px 10px rgba(0,0,0,0.9)) drop-shadow(0 0 25px #fbbf24);
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        padding: 0 0.25rem;
                    ">0</div>
                    <div style="font-family: var(--font-heading, sans-serif); font-size: clamp(0.78rem, 2.8vw, 1.05rem); font-weight: 900; color: #fbbf24; letter-spacing: 0.12em; margin-top: 2px;">
                        TC (TRILIUN CHIP)
                    </div>
                </div>

                <button id="win-fx-collect-btn" style="
                    font-family: var(--font-display, 'Russo One', sans-serif);
                    font-size: clamp(0.95rem, 3.2vw, 1.15rem);
                    font-weight: 400;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    padding: 0.65rem 1.8rem;
                    border-radius: 999px;
                    border: 2px solid rgba(255, 255, 255, 0.85);
                    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);
                    color: #000;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), 0 0 24px rgba(251, 191, 36, 0.6), inset 0 2px 2px rgba(255,255,255,0.7);
                    cursor: pointer;
                    white-space: nowrap;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.4rem;
                    max-width: 90%;
                    box-sizing: border-box;
                    transition: transform 0.15s, box-shadow 0.15s;
                "><span>💰</span> <span>KLAIM TC</span></button>
            </div>
        `;

        // Start PixiJS WebGL particle shower with targetTier intensity
        let pixiCleanup = null;
        if (PIXI) {
            pixiCleanup = this._startPixiCoinShower('win-fx-canvas', activeTheme.coinCount, activeTheme.glow);
        }

        const card = document.getElementById('win-fx-card');
        const badgeEl = document.getElementById('win-fx-badge');
        const counterEl = document.getElementById('win-fx-counter');
        const collectBtn = document.getElementById('win-fx-collect-btn');

        AuraSound.playCasinoWin();

        const counterObj = { value: 0 };
        let dismissed = false;

        const dismiss = () => {
            if (dismissed) return;
            dismissed = true;
            if (gsap) {
                gsap.to(card, {
                    scale: 0.7,
                    opacity: 0,
                    duration: 0.25,
                    ease: 'power2.in',
                    onComplete: () => {
                        this.overlayContainer.style.opacity = '0';
                        this.overlayContainer.style.pointerEvents = 'none';
                        this.overlayContainer.innerHTML = '';
                        if (pixiCleanup) pixiCleanup();
                        this.flyChipsToHeader(card, 25);
                        onComplete?.();
                    }
                });
            } else {
                this.overlayContainer.style.opacity = '0';
                this.overlayContainer.style.pointerEvents = 'none';
                this.overlayContainer.innerHTML = '';
                if (pixiCleanup) pixiCleanup();
                onComplete?.();
            }
        };

        collectBtn?.addEventListener('click', dismiss);
        this.overlayContainer?.addEventListener('click', (e) => {
            if (e.target === this.overlayContainer || e.target?.id === 'win-fx-canvas') {
                dismiss();
            }
        });

        if (gsap) {
            gsap.to(card, {
                scale: 1,
                opacity: 1,
                duration: 0.6,
                ease: 'back.out(1.6)'
            });

            // Rolling number counter with dynamic progressive tier morphing
            gsap.to(counterObj, {
                value: amount,
                duration: duration,
                ease: 'power2.out',
                onUpdate: () => {
                    const formatted = financeManager.formatCurrency(Math.floor(counterObj.value));
                    if (counterEl) counterEl.textContent = formatted;

                    const currentRatio = counterObj.value / effectiveBet;

                    // Morph from BIG to MEGA WIN (>= 40x Bet)
                    if (currentRatio >= 40 && currentTier === 'big' && (targetTier === 'mega' || targetTier === 'sensational')) {
                        currentTier = 'mega';
                        const theme = THEMES.mega;
                        if (badgeEl) {
                            badgeEl.textContent = theme.title;
                            badgeEl.style.background = theme.gradient;
                            badgeEl.style.webkitBackgroundClip = 'text';
                            badgeEl.style.webkitTextFillColor = 'transparent';
                            badgeEl.style.filter = `drop-shadow(0 2px 0 rgba(0,0,0,0.95)) drop-shadow(0 4px 8px rgba(0,0,0,0.95)) drop-shadow(0 0 32px ${theme.glow})`;
                        }
                        if (card) {
                            card.style.borderColor = theme.borderColor;
                            card.style.boxShadow = `0 20px 60px rgba(0, 0, 0, 0.95), 0 0 55px ${theme.glow}88, inset 0 0 35px rgba(0,0,0,0.85)`;
                            gsap.fromTo(card, { scale: 1.1 }, { scale: 1, duration: 0.35, ease: 'back.out(2)' });
                        }
                        AuraSound.playWildTransform();
                    }

                    // Morph from MEGA to SENSATIONAL MAXWIN (>= 100x Bet)
                    if (currentRatio >= 100 && currentTier === 'mega' && targetTier === 'sensational') {
                        currentTier = 'sensational';
                        const theme = THEMES.sensational;
                        if (badgeEl) {
                            badgeEl.textContent = theme.title;
                            badgeEl.style.background = theme.gradient;
                            badgeEl.style.webkitBackgroundClip = 'text';
                            badgeEl.style.webkitTextFillColor = 'transparent';
                            badgeEl.style.filter = `drop-shadow(0 2px 0 rgba(0,0,0,0.95)) drop-shadow(0 4px 8px rgba(0,0,0,0.95)) drop-shadow(0 0 45px ${theme.glow})`;
                        }
                        if (card) {
                            card.style.borderColor = theme.borderColor;
                            card.style.boxShadow = `0 20px 60px rgba(0, 0, 0, 0.95), 0 0 70px rgba(244, 63, 94, 0.8), 0 0 110px rgba(251, 191, 36, 0.5), inset 0 0 35px rgba(0,0,0,0.85)`;
                            gsap.fromTo(card, { scale: 1.22, rotate: -2 }, { scale: 1, rotate: 0, duration: 0.45, ease: 'elastic.out(1, 0.4)' });
                        }
                        AuraSound.playZeusThunder();
                    }
                },
                onComplete: () => {
                    gsap.to(collectBtn, {
                        scale: 1.08,
                        yoyo: true,
                        repeat: -1,
                        duration: 0.6,
                        ease: 'sine.inOut'
                    });
                }
            });
        } else {
            if (card) {
                card.style.opacity = '1';
                card.style.transform = 'scale(1)';
            }
            if (counterEl) counterEl.textContent = financeManager.formatCurrency(amount);
        }
    }

    /**
     * PixiJS WebGL Particle Shower for Wins & Jackpots
     */
    _startPixiCoinShower(canvasId, coinCount, colorHex) {
        const PIXI = this._getPIXI();
        if (!PIXI) return null;

        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        const app = new PIXI.Application({
            view: canvas,
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundAlpha: 0,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true
        });

        const container = new PIXI.Container();
        app.stage.addChild(container);

        // Create coin graphics textures
        const coinGfx = new PIXI.Graphics();
        coinGfx.beginFill(0xfbbf24);
        coinGfx.drawCircle(0, 0, 16);
        coinGfx.endFill();
        coinGfx.beginFill(0xf59e0b);
        coinGfx.drawCircle(0, 0, 12);
        coinGfx.endFill();
        const coinTexture = app.renderer.generateTexture(coinGfx);

        const gemGfx = new PIXI.Graphics();
        gemGfx.beginFill(0x38bdf8);
        gemGfx.drawPolygon([-12, 0, 0, -14, 12, 0, 0, 14]);
        gemGfx.endFill();
        const gemTexture = app.renderer.generateTexture(gemGfx);

        // Spawn particles
        const particles = [];
        const w = window.innerWidth;
        const h = window.innerHeight;

        for (let i = 0; i < coinCount; i++) {
            const isGem = Math.random() > 0.75;
            const sprite = new PIXI.Sprite(isGem ? gemTexture : coinTexture);
            sprite.anchor.set(0.5);
            sprite.x = Math.random() * w;
            sprite.y = Math.random() * -h; // spawn above screen
            sprite.vx = (Math.random() - 0.5) * 6;
            sprite.vy = Math.random() * 8 + 5;
            sprite.rotSpeed = (Math.random() - 0.5) * 0.15;
            sprite.scale.set(Math.random() * 0.6 + 0.5);
            sprite.alpha = Math.random() * 0.4 + 0.6;
            container.addChild(sprite);
            particles.push(sprite);
        }

        // Animation ticker
        const ticker = (delta) => {
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.x += p.vx * delta;
                p.y += p.vy * delta;
                p.rotation += p.rotSpeed * delta;

                // Wrap around
                if (p.y > h + 30) {
                    p.y = -30;
                    p.x = Math.random() * w;
                }
            }
        };

        app.ticker.add(ticker);

        const onResize = () => {
            app.renderer.resize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', onResize);

        // Cleanup function
        return () => {
            window.removeEventListener('resize', onResize);
            app.ticker.remove(ticker);
            app.destroy(true, { children: true, texture: true, baseTexture: true });
        };
    }

    /**
     * Fly 3D-styled Chips to Header Balance Bar
     */
    flyChipsToHeader(fromElement, count = 12) {
        if (typeof document === 'undefined') return;
        const gsap = this._getGSAP();
        const target = document.getElementById('header-chip-balance');
        if (!target) return;

        const fromRect = fromElement?.getBoundingClientRect ? fromElement.getBoundingClientRect() : {
            left: window.innerWidth / 2,
            top: window.innerHeight / 2,
            width: 0,
            height: 0
        };
        const targetRect = target.getBoundingClientRect();

        const startX = fromRect.left + fromRect.width / 2;
        const startY = fromRect.top + fromRect.height / 2;
        const endX = targetRect.left + targetRect.width / 2;
        const endY = targetRect.top + targetRect.height / 2;

        for (let i = 0; i < count; i++) {
            const chip = document.createElement('div');
            chip.textContent = '🪙';
            chip.style.cssText = `
                position: fixed;
                left: ${startX}px;
                top: ${startY}px;
                font-size: 1.5rem;
                z-index: 100000;
                pointer-events: none;
                filter: drop-shadow(0 0 6px #fbbf24);
                transform: translate(-50%, -50%);
            `;
            document.body.appendChild(chip);

            const delay = i * 0.04;
            const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 200;
            const midY = Math.min(startY, endY) - Math.random() * 150 - 50;

            if (gsap) {
                gsap.to(chip, {
                    keyframes: [
                        { left: midX, top: midY, scale: 1.4, duration: 0.35, ease: 'power1.out' },
                        { left: endX, top: endY, scale: 0.8, duration: 0.35, ease: 'power2.in' }
                    ],
                    delay: delay,
                    onComplete: () => {
                        chip.remove();
                        if (i === count - 1) {
                            AuraSound.playClaimMoney();
                            this.pulseElement(target);
                        }
                    }
                });
            } else {
                setTimeout(() => chip.remove(), 700);
            }
        }
    }

    /**
     * Micro-interaction: Button click squash & bounce
     */
    buttonPress(btn) {
        const gsap = this._getGSAP();
        if (!gsap || !btn) return;
        gsap.timeline()
            .to(btn, { scale: 0.92, duration: 0.08, ease: 'power1.in' })
            .to(btn, { scale: 1, duration: 0.15, ease: 'back.out(2)' });
    }

    /**
     * Pulse target element with neon glow
     */
    pulseElement(el, color = '#fbbf24') {
        const gsap = this._getGSAP();
        if (!gsap || !el) return;
        gsap.timeline()
            .to(el, { scale: 1.1, textShadow: `0 0 20px ${color}`, duration: 0.15, ease: 'power1.out' })
            .to(el, { scale: 1, textShadow: 'none', duration: 0.2, ease: 'power1.in' });
    }
}

const pixiEffects = new PixiEffects();
if (typeof window !== 'undefined') {
    window.pixiEffects = pixiEffects;
}
export default pixiEffects;

