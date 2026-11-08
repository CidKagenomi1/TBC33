/**
 * PixiCrashStage.js - WebGL Hardware-Accelerated Space Flight Stage for Rocket-X Crash
 * Powered by PixiJS v7 & GSAP 3
 * Features:
 * - Parallax multi-layer cosmic starfields with dynamic drift velocity
 * - Real-time smooth curved flight trajectory with radiant neon trail
 * - Sleek procedural vector rocket with dynamic angle pitch & vibration
 * - Multi-stage animated thruster flame and particle exhaust system
 * - High-impact explosion shockwave & fireball debris on crash
 * - Responsive auto-resize and 2D canvas fallback
 */

export class PixiCrashStage {
    constructor(canvasElement, options = {}) {
        this.canvas = canvasElement;
        this.options = Object.assign({
            width: 800,
            height: 420
        }, options);

        this.app = null;
        this.isPixiReady = false;
        this.state = 'idle'; // 'idle' | 'countdown' | 'flying' | 'crashed'

        // Layers
        this.bgContainer = null;
        this.gridContainer = null;
        this.trailGraphics = null;
        this.rocketContainer = null;
        this.particleContainer = null;
        this.fxContainer = null;

        // Elements
        this.stars = [];
        this.flameCore = null;
        this.flameOuter = null;
        this.rocketBody = null;
        this.exhaustParticles = [];
        this.explosionParticles = [];

        // Flight coordinates & animation state
        this.flightProgress = 0; // 0.0 to 1.0 (normalized trajectory screen position)
        this.currentMultiplier = 1.0;
        this.rocketPos = { x: 80, y: 350 };
        this.flightAngle = -0.35; // radians
        this.shakeIntensity = 0;

        this._resizeHandler = this._handleResize.bind(this);
        this._initPixi();
    }

    _getPIXI() {
        return (typeof window !== 'undefined' && window.PIXI) ? window.PIXI : null;
    }

    _initPixi() {
        const PIXI = this._getPIXI();
        if (!this.canvas || !PIXI) return;

        try {
            const rect = this.canvas.getBoundingClientRect();
            const w = Math.max(260, Math.floor(rect.width || this.options.width));
            const h = Math.max(220, Math.floor(rect.height || this.options.height));

            this.app = new PIXI.Application({
                view: this.canvas,
                width: w,
                height: h,
                backgroundAlpha: 0,
                resolution: Math.min(2, window.devicePixelRatio || 1),
                autoDensity: true,
                antialias: true
            });

            this._setupLayers();
            this._createStarfield();
            this._createRocket();
            this._setupTicker();

            window.addEventListener('resize', this._resizeHandler);
            this.isPixiReady = true;
        } catch (e) {
            console.warn('[PixiCrashStage] WebGL init fallback:', e);
            this.isPixiReady = false;
        }
    }

    _setupLayers() {
        const PIXI = this._getPIXI();

        this.bgContainer = new PIXI.Container();
        this.gridContainer = new PIXI.Container();
        this.trailGraphics = new PIXI.Graphics();
        this.particleContainer = new PIXI.Container();
        this.rocketContainer = new PIXI.Container();
        this.fxContainer = new PIXI.Container();

        this.app.stage.addChild(this.bgContainer);
        this.app.stage.addChild(this.gridContainer);
        this.app.stage.addChild(this.trailGraphics);
        this.app.stage.addChild(this.particleContainer);
        this.app.stage.addChild(this.rocketContainer);
        this.app.stage.addChild(this.fxContainer);

        this._drawGrid();
    }

    _drawGrid() {
        const PIXI = this._getPIXI();
        const w = this.app.screen.width;
        const h = this.app.screen.height;

        this.gridContainer.removeChildren();
        const gridGfx = new PIXI.Graphics();

        // Subtle horizon & altitude lines
        gridGfx.lineStyle(1, 0x38bdf8, 0.08);
        const stepY = h / 6;
        for (let y = stepY; y < h; y += stepY) {
            gridGfx.moveTo(40, y);
            gridGfx.lineTo(w - 20, y);
        }

        const stepX = w / 8;
        for (let x = stepX; x < w; x += stepX) {
            gridGfx.moveTo(x, 20);
            gridGfx.lineTo(x, h - 30);
        }

        // Base launch pad indicator
        gridGfx.lineStyle(2, 0xfbbf24, 0.25);
        gridGfx.moveTo(40, h - 30);
        gridGfx.lineTo(w - 20, h - 30);

        this.gridContainer.addChild(gridGfx);
    }

    _createStarfield() {
        const PIXI = this._getPIXI();
        const w = this.app.screen.width;
        const h = this.app.screen.height;

        this.bgContainer.removeChildren();
        this.stars = [];

        // 3 Parallax Star Layers (Distant, Mid, Near)
        const starCounts = [70, 45, 25];
        const starColors = [0x94a3b8, 0x38bdf8, 0xffffff];
        const baseSpeeds = [0.4, 0.9, 1.8];

        starCounts.forEach((count, layer) => {
            for (let i = 0; i < count; i++) {
                const gfx = new PIXI.Graphics();
                const radius = layer === 0 ? 0.9 : (layer === 1 ? 1.4 : 2.2);
                const color = starColors[layer];
                const alpha = layer === 0 ? 0.45 : (layer === 1 ? 0.75 : 0.95);

                gfx.beginFill(color, alpha);
                gfx.drawCircle(0, 0, radius);
                gfx.endFill();

                const x = Math.random() * w;
                const y = Math.random() * (h - 30);
                gfx.x = x;
                gfx.y = y;

                this.bgContainer.addChild(gfx);
                this.stars.push({
                    gfx,
                    layer,
                    baseX: x,
                    baseY: y,
                    speed: baseSpeeds[layer],
                    twinkleSpeed: 0.02 + Math.random() * 0.04,
                    twinklePhase: Math.random() * Math.PI * 2
                });
            }
        });
    }

    _createRocket() {
        const PIXI = this._getPIXI();
        this.rocketContainer.removeChildren();

        const root = new PIXI.Container();

        // 1. Thruster Exhaust Flame Group
        const flameGroup = new PIXI.Container();
        flameGroup.x = -26;
        flameGroup.y = 0;

        // Outer Flame (Fiery Orange/Red)
        const outerFlame = new PIXI.Graphics();
        outerFlame.beginFill(0xef4444, 0.85);
        outerFlame.drawPolygon([
            0, -7,
            -34, 0,
            0, 7
        ]);
        outerFlame.endFill();

        // Inner Flame (Hot Bright Yellow/Cyan)
        const innerFlame = new PIXI.Graphics();
        innerFlame.beginFill(0xfbbf24, 0.95);
        innerFlame.drawPolygon([
            0, -4,
            -22, 0,
            0, 4
        ]);
        innerFlame.endFill();

        const coreFlame = new PIXI.Graphics();
        coreFlame.beginFill(0xffffff, 1.0);
        coreFlame.drawPolygon([
            0, -2,
            -12, 0,
            0, 2
        ]);
        coreFlame.endFill();

        flameGroup.addChild(outerFlame);
        flameGroup.addChild(innerFlame);
        flameGroup.addChild(coreFlame);

        this.flameOuter = outerFlame;
        this.flameCore = innerFlame;
        this.flameGroup = flameGroup;
        root.addChild(flameGroup);

        // 2. Spaceship Body Graphics
        const body = new PIXI.Graphics();

        // Main Fuselage (Metallic Chrome & Gold accents)
        body.beginFill(0xf8fafc); // Bright titanium hull
        body.drawPolygon([
            28, 0,     // Nose cone tip
            16, -9,    // Upper hull
            -16, -9,   // Upper back
            -22, -6,   // Engine mount top
            -22, 6,    // Engine mount bottom
            -16, 9,    // Lower back
            16, 9      // Lower hull
        ]);
        body.endFill();

        // Cockpit Canopy (Neon Cyan Glass)
        body.beginFill(0x06b6d4, 0.95);
        body.drawPolygon([
            18, 0,
            8, -5,
            -2, -5,
            -2, 0
        ]);
        body.endFill();

        // Top & Bottom Aero Wings / Fins (Ruby Crimson & Gold Trim)
        body.beginFill(0xef4444);
        body.drawPolygon([
            -4, -9,
            -22, -18,
            -16, -9
        ]);
        body.drawPolygon([
            -4, 9,
            -22, 18,
            -16, 9
        ]);
        body.endFill();

        // Center Fin / Stabilizer
        body.beginFill(0xf59e0b);
        body.drawPolygon([
            -8, 0,
            -24, 0,
            -20, -5
        ]);
        body.endFill();

        // Gold Stripe Decal
        body.lineStyle(1.5, 0xfbbf24, 1.0);
        body.moveTo(0, -9);
        body.lineTo(0, 9);

        // Engine Nozzle Cone
        body.beginFill(0x334155);
        body.drawRect(-26, -5, 4, 10);
        body.endFill();

        this.rocketBody = body;
        root.addChild(body);

        this.rocketContainer.addChild(root);
        this.rocketEntity = root;

        // Initial resting position at launch pad
        const h = this.app.screen.height;
        this.rocketPos = { x: 80, y: h - 60 };
        this.rocketContainer.x = this.rocketPos.x;
        this.rocketContainer.y = this.rocketPos.y;
        this.flameGroup.visible = false;
    }

    _setupTicker() {
        let time = 0;

        this.app.ticker.add((delta) => {
            time += delta * 0.016;

            // 1. Starfield Twinkle & Drift
            const w = this.app.screen.width;
            const h = this.app.screen.height;
            const speedBoost = this.state === 'flying' 
                ? Math.min(6, 1.2 + Math.log(this.currentMultiplier + 0.5) * 1.5)
                : 0.3;

            this.stars.forEach(s => {
                s.twinklePhase += s.twinkleSpeed * delta;
                s.gfx.alpha = 0.3 + 0.6 * (0.5 + 0.5 * Math.sin(s.twinklePhase));

                if (this.state === 'flying') {
                    // Drift stars backward as rocket flies forward
                    s.gfx.x -= s.speed * speedBoost * delta;
                    s.gfx.y += (s.speed * 0.3) * speedBoost * delta;

                    if (s.gfx.x < 0) s.gfx.x += w;
                    if (s.gfx.y > h - 30) s.gfx.y = 10;
                }
            });

            // 2. Flight Dynamics
            if (this.state === 'flying') {
                // Thruster Flame Pulsing
                const flicker = 0.85 + Math.random() * 0.35;
                const flameScaleX = Math.min(2.5, 1.0 + Math.log(this.currentMultiplier + 0.5) * 0.4) * flicker;
                const flameScaleY = (0.8 + Math.random() * 0.4);

                this.flameOuter.scale.set(flameScaleX, flameScaleY);
                this.flameCore.scale.set(flameScaleX * 0.9, flameScaleY * 0.85);

                // Rocket vibration at higher multipliers
                const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
                const shakeY = (Math.random() - 0.5) * this.shakeIntensity;

                this.rocketContainer.x = this.rocketPos.x + shakeX;
                this.rocketContainer.y = this.rocketPos.y + shakeY;
                this.rocketEntity.rotation = this.flightAngle;

                // Spawn exhaust sparks
                this._spawnExhaustParticle();
                this._drawTrail();
            } else if (this.state === 'countdown') {
                // Gentle idle hover bounce
                const h = this.app.screen.height;
                this.rocketContainer.y = (h - 60) + Math.sin(time * 4) * 3;
                this.rocketContainer.x = 80;
                this.rocketEntity.rotation = -0.15;
            }

            // 3. Update active particles
            this._updateParticles(delta);
        });
    }

    _spawnExhaustParticle() {
        const PIXI = this._getPIXI();
        if (!PIXI || this.exhaustParticles.length > 80) return;

        const pGfx = new PIXI.Graphics();
        const colors = [0xfbbf24, 0xef4444, 0x38bdf8, 0xffffff];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = 1.5 + Math.random() * 2.5;

        pGfx.beginFill(color, 0.9);
        pGfx.drawCircle(0, 0, size);
        pGfx.endFill();

        // Spawn right at rocket thruster nozzle
        const nozzleX = this.rocketPos.x - Math.cos(this.flightAngle) * 28;
        const nozzleY = this.rocketPos.y - Math.sin(this.flightAngle) * 28;

        pGfx.x = nozzleX;
        pGfx.y = nozzleY;
        this.particleContainer.addChild(pGfx);

        // Velocity vector: shoot backwards with spread
        const spread = (Math.random() - 0.5) * 0.4;
        const speed = 2.5 + Math.random() * 3.5;
        const vx = -Math.cos(this.flightAngle + spread) * speed;
        const vy = -Math.sin(this.flightAngle + spread) * speed;

        this.exhaustParticles.push({
            gfx: pGfx,
            vx,
            vy,
            alpha: 0.9,
            decay: 0.03 + Math.random() * 0.03
        });
    }

    _drawTrail() {
        const PIXI = this._getPIXI();
        const w = this.app.screen.width;
        const h = this.app.screen.height;

        this.trailGraphics.clear();

        const startX = 80;
        const startY = h - 60;
        const currentX = this.rocketPos.x;
        const currentY = this.rocketPos.y;

        // Curved flight path using quadratic bezier
        const ctrlX = startX + (currentX - startX) * 0.65;
        const ctrlY = startY;

        // Outer glow
        this.trailGraphics.lineStyle(6, 0xef4444, 0.25);
        this.trailGraphics.moveTo(startX, startY);
        this.trailGraphics.quadraticCurveTo(ctrlX, ctrlY, currentX - 10, currentY);

        // Mid trail (Cyan-Gold)
        this.trailGraphics.lineStyle(3, 0xfbbf24, 0.7);
        this.trailGraphics.moveTo(startX, startY);
        this.trailGraphics.quadraticCurveTo(ctrlX, ctrlY, currentX - 10, currentY);

        // Core bright laser line
        this.trailGraphics.lineStyle(1.5, 0xffffff, 0.95);
        this.trailGraphics.moveTo(startX, startY);
        this.trailGraphics.quadraticCurveTo(ctrlX, ctrlY, currentX - 10, currentY);

        // Semi-transparent under-trail gradient polygon
        this.trailGraphics.beginFill(0xef4444, 0.08);
        this.trailGraphics.moveTo(startX, startY);
        this.trailGraphics.quadraticCurveTo(ctrlX, ctrlY, currentX - 10, currentY);
        this.trailGraphics.lineTo(currentX - 10, h - 30);
        this.trailGraphics.lineTo(startX, h - 30);
        this.trailGraphics.closePath();
        this.trailGraphics.endFill();
    }

    _updateParticles(delta) {
        // Exhaust Particles
        for (let i = this.exhaustParticles.length - 1; i >= 0; i--) {
            const p = this.exhaustParticles[i];
            p.gfx.x += p.vx * delta;
            p.gfx.y += p.vy * delta;
            p.alpha -= p.decay * delta;
            p.gfx.alpha = Math.max(0, p.alpha);

            if (p.alpha <= 0) {
                this.particleContainer.removeChild(p.gfx);
                p.gfx.destroy();
                this.exhaustParticles.splice(i, 1);
            }
        }

        // Explosion Particles
        for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
            const ep = this.explosionParticles[i];
            ep.gfx.x += ep.vx * delta;
            ep.gfx.y += ep.vy * delta;
            ep.vy += 0.08 * delta; // slight gravity pull
            ep.alpha -= ep.decay * delta;
            ep.gfx.alpha = Math.max(0, ep.alpha);
            ep.gfx.rotation += ep.rotSpeed * delta;

            if (ep.alpha <= 0) {
                this.fxContainer.removeChild(ep.gfx);
                ep.gfx.destroy();
                this.explosionParticles.splice(i, 1);
            }
        }
    }

    /**
     * Set stage into Countdown mode (waiting for flight)
     */
    setCountdown() {
        this.state = 'countdown';
        this.currentMultiplier = 1.0;
        this.flightProgress = 0;
        this.shakeIntensity = 0;

        if (this.flameGroup) this.flameGroup.visible = false;
        if (this.trailGraphics) this.trailGraphics.clear();
        this._clearParticles();

        if (this.rocketEntity) {
            this.rocketEntity.visible = true;
            this.rocketEntity.rotation = -0.15;
        }

        const h = this.app ? this.app.screen.height : 360;
        this.rocketPos = { x: 80, y: h - 60 };
        if (this.rocketContainer) {
            this.rocketContainer.x = this.rocketPos.x;
            this.rocketContainer.y = this.rocketPos.y;
        }
    }

    /**
     * Start the flight sequence
     */
    startFlight() {
        this.state = 'flying';
        this.currentMultiplier = 1.0;
        this.flightProgress = 0;
        this.shakeIntensity = 0;

        if (this.flameGroup) this.flameGroup.visible = true;
        if (this.rocketEntity) this.rocketEntity.visible = true;
    }

    /**
     * Updates the rocket position based on current multiplier & normalized flight progress
     * @param {number} multiplier Current flight multiplier (e.g. 1.45x, 8.20x)
     * @param {number} progress Normalized flight visual progress (0.0 to 1.0)
     */
    updateFlight(multiplier, progress) {
        if (this.state !== 'flying' || !this.app) return;

        this.currentMultiplier = multiplier;
        this.flightProgress = Math.min(1.0, Math.max(0, progress));

        const w = this.app.screen.width;
        const h = this.app.screen.height;

        const startX = 80;
        const startY = h - 60;
        const targetX = w * 0.82;
        const targetY = h * 0.18;

        // Smooth non-linear visual curve
        // Progress curves up smoothly and levels near cruise altitude
        const t = this.flightProgress;
        const curvedT = Math.pow(t, 0.82);

        this.rocketPos.x = startX + (targetX - startX) * curvedT;
        this.rocketPos.y = startY - (startY - targetY) * Math.sin(curvedT * Math.PI * 0.5);

        // Dynamic pitch angle (derivative of curve)
        const dx = (targetX - startX);
        const dy = -(startY - targetY) * Math.cos(curvedT * Math.PI * 0.5) * (Math.PI * 0.5);
        this.flightAngle = Math.atan2(dy, dx);

        // Vibration increases as multiplier grows
        if (multiplier > 50) {
            this.shakeIntensity = 4.2;
        } else if (multiplier > 15) {
            this.shakeIntensity = 2.8;
        } else if (multiplier > 5) {
            this.shakeIntensity = 1.4;
        } else if (multiplier > 2) {
            this.shakeIntensity = 0.6;
        } else {
            this.shakeIntensity = 0.2;
        }
    }

    /**
     * Trigger crash explosion animation
     */
    triggerCrash(finalMultiplier) {
        this.state = 'crashed';
        if (this.flameGroup) this.flameGroup.visible = false;
        if (this.rocketEntity) this.rocketEntity.visible = false;

        const PIXI = this._getPIXI();
        if (!PIXI || !this.app) return;

        const cx = this.rocketPos.x;
        const cy = this.rocketPos.y;

        // 1. Shockwave Expanding Ring
        const shockwave = new PIXI.Graphics();
        shockwave.lineStyle(4, 0xef4444, 1.0);
        shockwave.drawCircle(0, 0, 10);
        shockwave.x = cx;
        shockwave.y = cy;
        this.fxContainer.addChild(shockwave);

        if (window.gsap) {
            window.gsap.to(shockwave.scale, {
                x: 6.5,
                y: 6.5,
                duration: 0.6,
                ease: 'power2.out'
            });
            window.gsap.to(shockwave, {
                alpha: 0,
                duration: 0.6,
                ease: 'power2.out',
                onComplete: () => {
                    this.fxContainer.removeChild(shockwave);
                    shockwave.destroy();
                }
            });
        }

        // 2. Fireball & Metal Shrapnel Particles (45 particles)
        const debrisColors = [0xef4444, 0xf59e0b, 0xfbbf24, 0xffffff, 0x475569];
        for (let i = 0; i < 45; i++) {
            const debris = new PIXI.Graphics();
            const color = debrisColors[Math.floor(Math.random() * debrisColors.length)];
            const isSpike = Math.random() > 0.5;

            debris.beginFill(color, 1.0);
            if (isSpike) {
                debris.drawPolygon([-3, -2, 4, 0, -3, 2]);
            } else {
                debris.drawCircle(0, 0, 2 + Math.random() * 3.5);
            }
            debris.endFill();

            debris.x = cx;
            debris.y = cy;
            this.fxContainer.addChild(debris);

            const angle = Math.random() * Math.PI * 2;
            const speed = 2.5 + Math.random() * 7.5;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            this.explosionParticles.push({
                gfx: debris,
                vx,
                vy,
                alpha: 1.0,
                decay: 0.02 + Math.random() * 0.03,
                rotSpeed: (Math.random() - 0.5) * 0.3
            });
        }
    }

    _clearParticles() {
        this.exhaustParticles.forEach(p => {
            if (p.gfx && p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
            p.gfx.destroy();
        });
        this.exhaustParticles = [];

        this.explosionParticles.forEach(ep => {
            if (ep.gfx && ep.gfx.parent) ep.gfx.parent.removeChild(ep.gfx);
            ep.gfx.destroy();
        });
        this.explosionParticles = [];
    }

    _handleResize() {
        if (!this.app || !this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const w = Math.max(260, Math.floor(rect.width || this.options.width));
        const h = Math.max(220, Math.floor(rect.height || this.options.height));

        this.app.renderer.resize(w, h);
        this._drawGrid();
        this._createStarfield();

        if (this.state === 'countdown' || this.state === 'idle') {
            this.rocketPos = { x: 80, y: h - 60 };
            if (this.rocketContainer) {
                this.rocketContainer.x = this.rocketPos.x;
                this.rocketContainer.y = this.rocketPos.y;
            }
        }
    }

    destroy() {
        window.removeEventListener('resize', this._resizeHandler);
        this._clearParticles();

        if (this.app) {
            this.app.destroy(true, { children: true, texture: false, baseTexture: false });
            this.app = null;
        }
    }
}

export default PixiCrashStage;
