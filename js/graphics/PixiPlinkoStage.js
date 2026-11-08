/**
 * PixiPlinkoStage.js - WebGL Hardware-Accelerated Tropical Beach Plinko Stage
 * Powered by PixiJS v7 & GSAP 3
 * Features:
 * - Lush tropical beach setting with swaying palm fronds, turquoise ocean, & sunset glow
 * - Left & right Tiki totem pillars with flickering warm torch flame particles
 * - Bamboo tiki pegs with musical pitch progression, shockwave rings & droplet splashes
 * - Realistic 2D organic ball physics: fibrous brown coconuts & glowing Golden Coconuts
 * - Continuous golden star sparkle trails & motion blur streaks
 * - Multi-ball capability (Coconut Rain / simultaneous multi-drop up to 25 coconuts)
 * - Carved tiki multiplier baskets at bottom with spring bounce, vertical light beacons, & score popups
 * - Speed multiplier support (1x Normal, 1.8x Cepat, 2.6x Turbo) with 2-step anti-tunneling physics
 * - Dynamic row switching (8 to 16 rows) with automatic layout recalculation
 * - Responsive auto-resize and WebGL fallback
 */

import AuraSound from '../ui/AuraSound.js';

export class PixiPlinkoStage {
    constructor(canvasElement, options = {}) {
        this.canvas = canvasElement;
        this.options = Object.assign({
            rows: 12,
            risk: 'medium', // 'low' | 'medium' | 'high'
            width: 760,
            height: 580,
            onCoconutLand: null
        }, options);

        this.app = null;
        this.isPixiReady = false;
        this.speedMultiplier = 1.0;

        // Container layers
        this.bgContainer = null;
        this.boardContainer = null;
        this.beaconContainer = null;
        this.pegsContainer = null;
        this.basketsContainer = null;
        this.trailsGfx = null;
        this.ballsContainer = null;
        this.particlesContainer = null;
        this.overlayContainer = null;

        // Grid & Entities
        this.rows = this.options.rows;
        this.risk = this.options.risk;
        this.multipliers = this.options.multipliers || [];
        this.pegs = [];
        this.baskets = [];
        this.balls = [];
        this.particles = [];
        this.torchEmbers = [];
        this.shockwaves = [];
        this.basketHitCounts = {};
        this.wavePhase = 0;
        this.ambientTime = 0;

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
            const h = Math.max(360, Math.floor(rect.height || this.options.height));

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
            this._drawTropicalBackground();
            this.rebuildBoard(this.rows, this.options.multipliers || []);
            this._setupTicker();

            window.addEventListener('resize', this._resizeHandler);
            this.isPixiReady = true;
        } catch (e) {
            console.warn('[PixiPlinkoStage] WebGL init fallback:', e);
            this.isPixiReady = false;
        }
    }

    _setupLayers() {
        const PIXI = this._getPIXI();

        this.bgContainer = new PIXI.Container();
        this.boardContainer = new PIXI.Container();
        this.beaconContainer = new PIXI.Container();
        this.pegsContainer = new PIXI.Container();
        this.basketsContainer = new PIXI.Container();
        this.trailsGfx = new PIXI.Graphics();
        this.ballsContainer = new PIXI.Container();
        this.particlesContainer = new PIXI.Container();
        this.overlayContainer = new PIXI.Container();

        this.app.stage.addChild(this.bgContainer);
        this.app.stage.addChild(this.boardContainer);

        // Board internal layers
        this.boardContainer.addChild(this.beaconContainer);
        this.boardContainer.addChild(this.pegsContainer);
        this.boardContainer.addChild(this.basketsContainer);
        this.boardContainer.addChild(this.trailsGfx);
        this.boardContainer.addChild(this.ballsContainer);
        this.boardContainer.addChild(this.particlesContainer);
        this.boardContainer.addChild(this.overlayContainer);
    }

    setSpeedMultiplier(speed = 1.0) {
        this.speedMultiplier = Math.max(0.5, Math.min(3.0, speed));
    }

    _drawTropicalBackground() {
        const PIXI = this._getPIXI();
        if (!PIXI || !this.app) return;

        const w = this.app.screen.width;
        const h = this.app.screen.height;

        this.bgContainer.removeChildren();
        const bg = new PIXI.Graphics();

        // 1. Tropical Twilight Gradient Bands (Deep Indigo to Sunset Coral & Sand)
        // Band 1: Twilight Sky Top
        bg.beginFill(0x0c1322);
        bg.drawRect(0, 0, w, h * 0.22);
        // Band 2: Deep Violet Horizon
        bg.beginFill(0x271333);
        bg.drawRect(0, h * 0.22, w, h * 0.18);
        // Band 3: Sunset Flame Amber
        bg.beginFill(0x5a2327);
        bg.drawRect(0, h * 0.40, w, h * 0.15);
        // Band 4: Golden Ocean Lagoon
        bg.beginFill(0x0d3b4c);
        bg.drawRect(0, h * 0.55, w, h * 0.25);
        // Band 5: Warm Sand Beach Shore
        bg.beginFill(0x1a120b);
        bg.drawRect(0, h * 0.80, w, h * 0.20);
        bg.endFill();

        this.bgContainer.addChild(bg);

        // 2. Stars & Firefly Motes in Twilight Sky
        const starsGfx = new PIXI.Graphics();
        const starCount = Math.floor(w / 35);
        for (let s = 0; s < starCount; s++) {
            const sx = (s * 37 + 19) % w;
            const sy = (s * 23 + 11) % (h * 0.35);
            const sr = 0.8 + ((s * 7) % 3) * 0.5;
            starsGfx.beginFill(0xfde68a, 0.4 + ((s % 5) * 0.12));
            starsGfx.drawCircle(sx, sy, sr);
            starsGfx.endFill();
        }
        this.bgContainer.addChild(starsGfx);

        // 3. Glowing Setting Sun with Pulsing Corona Rings
        const sun = new PIXI.Graphics();
        const sunRadius = Math.min(w, h) * 0.13;
        // Outer Corona Glow
        sun.beginFill(0xfbbf24, 0.18);
        sun.drawCircle(w * 0.5, h * 0.34, sunRadius * 1.6);
        // Mid Corona
        sun.beginFill(0xf59e0b, 0.35);
        sun.drawCircle(w * 0.5, h * 0.34, sunRadius * 1.25);
        // Core Sun
        sun.beginFill(0xfde68a, 0.85);
        sun.drawCircle(w * 0.5, h * 0.34, sunRadius);
        sun.endFill();
        this.bgContainer.addChild(sun);

        // 4. Distant Island & Coconut Palm Silhouette
        const island = new PIXI.Graphics();
        island.beginFill(0x09141c, 0.88);
        // Island hill left
        island.drawEllipse(w * 0.22, h * 0.55, w * 0.26, h * 0.045);
        // Island hill right
        island.drawEllipse(w * 0.78, h * 0.55, w * 0.26, h * 0.045);
        island.endFill();
        this.bgContainer.addChild(island);

        // 5. Dynamic Ocean Wave Container
        this.waveGfx = new PIXI.Graphics();
        this.bgContainer.addChild(this.waveGfx);
        this._renderOceanWaves(w, h, 0);

        // 6. Left & Right Tiki Totem Pillars with Torches
        this._drawTikiTorches(w, h);

        // 7. Top Tropical Palm Canopy & Drop Chute
        this._drawPalmCanopy(w, h);
    }

    _renderOceanWaves(w, h, phase) {
        if (!this.waveGfx) return;
        this.waveGfx.clear();

        const baseY = h * 0.58;
        // Layer 1: Distant soft waves
        this.waveGfx.lineStyle(1.8, 0x38bdf8, 0.28);
        this.waveGfx.moveTo(0, baseY);
        for (let x = 0; x <= w; x += 24) {
            const y = baseY + Math.sin((x * 0.02) + phase) * 4;
            this.waveGfx.lineTo(x, y);
        }

        // Layer 2: Foreground lagoon shimmer
        const foreY = h * 0.68;
        this.waveGfx.lineStyle(2.2, 0x06b6d4, 0.38);
        this.waveGfx.moveTo(0, foreY);
        for (let x = 0; x <= w; x += 20) {
            const y = foreY + Math.sin((x * 0.025) - phase * 1.2) * 5;
            this.waveGfx.lineTo(x, y);
        }
    }

    _drawTikiTorches(w, h) {
        const PIXI = this._getPIXI();
        const torches = new PIXI.Graphics();

        const pillarWidth = Math.max(14, w * 0.032);
        const torchY = h * 0.42;

        // Left Bamboo Pillar
        torches.beginFill(0x2a170d, 0.95);
        torches.drawRoundedRect(6, h * 0.24, pillarWidth, h * 0.58, 6);
        // Rings & binding
        torches.lineStyle(2, 0xd97706, 0.6);
        torches.drawRoundedRect(4, h * 0.32, pillarWidth + 4, 6, 2);
        torches.drawRoundedRect(4, h * 0.52, pillarWidth + 4, 6, 2);
        torches.drawRoundedRect(4, h * 0.72, pillarWidth + 4, 6, 2);
        // Torch Brazier cup
        torches.beginFill(0x451a03);
        torches.drawPolygon([
            3, torchY,
            pillarWidth + 9, torchY,
            pillarWidth + 4, torchY + 16,
            8, torchY + 16
        ]);
        torches.endFill();

        // Right Bamboo Pillar
        const rx = w - pillarWidth - 6;
        torches.beginFill(0x2a170d, 0.95);
        torches.drawRoundedRect(rx, h * 0.24, pillarWidth, h * 0.58, 6);
        torches.drawRoundedRect(rx - 2, h * 0.32, pillarWidth + 4, 6, 2);
        torches.drawRoundedRect(rx - 2, h * 0.52, pillarWidth + 4, 6, 2);
        torches.drawRoundedRect(rx - 2, h * 0.72, pillarWidth + 4, 6, 2);
        torches.beginFill(0x451a03);
        torches.drawPolygon([
            rx - 3, torchY,
            w - 3, torchY,
            w - 8, torchY + 16,
            rx + 2, torchY + 16
        ]);
        torches.endFill();

        this.bgContainer.addChild(torches);

        // Store torch coordinates for flame particles
        this.leftTorchX = 6 + pillarWidth * 0.5;
        this.leftTorchY = torchY - 2;
        this.rightTorchX = rx + pillarWidth * 0.5;
        this.rightTorchY = torchY - 2;
    }

    _drawPalmCanopy(w, h) {
        const PIXI = this._getPIXI();
        const canopy = new PIXI.Graphics();

        // Left palm fronds drooping into center
        canopy.lineStyle(2.5, 0x14532d, 0.85);
        canopy.beginFill(0x166534, 0.88);
        canopy.drawPolygon([
            0, 0,
            w * 0.32, 0,
            w * 0.36, h * 0.08,
            w * 0.22, h * 0.13,
            w * 0.06, h * 0.15,
            0, h * 0.11
        ]);
        canopy.endFill();

        // Lime palm frond sub-layer (highlights)
        canopy.beginFill(0x22c55e, 0.55);
        canopy.drawPolygon([
            0, 0,
            w * 0.26, 0,
            w * 0.28, h * 0.06,
            w * 0.16, h * 0.09,
            0, h * 0.07
        ]);
        canopy.endFill();

        // Right palm fronds
        canopy.beginFill(0x166534, 0.88);
        canopy.drawPolygon([
            w, 0,
            w * 0.68, 0,
            w * 0.64, h * 0.08,
            w * 0.78, h * 0.13,
            w * 0.94, h * 0.15,
            w, h * 0.11
        ]);
        canopy.endFill();

        canopy.beginFill(0x22c55e, 0.55);
        canopy.drawPolygon([
            w, 0,
            w * 0.74, 0,
            w * 0.72, h * 0.06,
            w * 0.84, h * 0.09,
            w, h * 0.07
        ]);
        canopy.endFill();

        // Carved Bamboo Drop Hopper at Center Top
        const hopper = new PIXI.Graphics();
        // Bamboo Funnel Ring
        hopper.beginFill(0x382212);
        hopper.drawRoundedRect(w * 0.5 - 24, h * 0.03, 48, 14, 6);
        hopper.beginFill(0xf59e0b);
        hopper.drawRoundedRect(w * 0.5 - 20, h * 0.035, 40, 10, 4);
        hopper.endFill();

        // Decorative Hanging Coconuts at Hopper Mouth
        hopper.beginFill(0x451a03);
        hopper.drawCircle(w * 0.5 - 16, h * 0.045, 11);
        hopper.drawCircle(w * 0.5 + 16, h * 0.045, 11);
        hopper.beginFill(0x713f12);
        hopper.drawCircle(w * 0.5 - 16, h * 0.045, 9);
        hopper.drawCircle(w * 0.5 + 16, h * 0.045, 9);
        hopper.endFill();

        // Drop Indicator Ring (Pulsing nozzle)
        this.dropNozzleGfx = new PIXI.Graphics();
        this.dropNozzleGfx.lineStyle(2.2, 0xfbbf24, 0.9);
        this.dropNozzleGfx.drawCircle(w * 0.5, h * 0.068, 16);
        this.dropNozzleGfx.beginFill(0xfbbf24, 0.2);
        this.dropNozzleGfx.drawCircle(w * 0.5, h * 0.068, 14);
        this.dropNozzleGfx.endFill();

        this.bgContainer.addChild(canopy);
        this.bgContainer.addChild(hopper);
        this.bgContainer.addChild(this.dropNozzleGfx);
    }

    /**
     * Rebuilds the peg triangle grid and bottom multiplier bins
     * @param {number} rowCount Number of rows (8 - 16)
     * @param {Array<number>} multipliers Array of multiplier values for bottom buckets
     */
    rebuildBoard(rowCount, multipliers = []) {
        this.rows = Math.max(8, Math.min(16, rowCount || 12));
        this.multipliers = multipliers;

        const PIXI = this._getPIXI();
        if (!PIXI || !this.app) return;

        this.pegsContainer.removeChildren();
        this.basketsContainer.removeChildren();
        this.beaconContainer.removeChildren();
        this.pegs = [];
        this.baskets = [];

        const w = this.app.screen.width;
        const h = this.app.screen.height;

        const startY = h * 0.125;
        const bottomY = h * 0.815;
        const totalHeight = bottomY - startY;
        const rowSpacing = totalHeight / (this.rows + 1);

        // Maximum width of triangle at bottom row
        const bottomSpan = Math.min(w * 0.94, (this.rows + 1) * (w < 420 ? 32 : 44));
        const pegRadius = Math.max(2.6, Math.min(5.5, (w < 420 ? 34 : 44) / this.rows));

        // 1. Generate Peg Triangle
        for (let r = 0; r < this.rows; r++) {
            const pegsInRow = r + 3;
            const y = startY + (r + 1) * rowSpacing;
            const rowWidth = (bottomSpan / (this.rows + 2)) * (pegsInRow - 1);
            const startX = (w - rowWidth) / 2;
            const colSpacing = rowWidth / (pegsInRow - 1);

            for (let c = 0; c < pegsInRow; c++) {
                const x = startX + c * colSpacing;

                const pegEntity = new PIXI.Container();
                pegEntity.x = x;
                pegEntity.y = y;

                // Bamboo / Golden Tiki Peg Graphic
                const gfx = new PIXI.Graphics();
                // Ambient soft glow ring
                gfx.beginFill(0xfbbf24, 0.22);
                gfx.drawCircle(0, 0, pegRadius + 3.2);
                // Outer dark wooden shadow
                gfx.beginFill(0x27170c, 0.95);
                gfx.drawCircle(0, 1.2, pegRadius + 0.9);
                // Bamboo Golden Core
                gfx.beginFill(0xf59e0b);
                gfx.drawCircle(0, 0, pegRadius);
                // Coconut Pearl Gloss Highlight
                gfx.beginFill(0xffffff, 0.9);
                gfx.drawCircle(-pegRadius * 0.28, -pegRadius * 0.28, pegRadius * 0.38);
                gfx.endFill();

                pegEntity.addChild(gfx);
                this.pegsContainer.addChild(pegEntity);

                this.pegs.push({
                    x,
                    y,
                    radius: pegRadius,
                    container: pegEntity,
                    gfx,
                    row: r,
                    col: c
                });
            }
        }

        // 2. Generate Bottom Multiplier Baskets
        const basketCount = this.rows + 1;
        const colSpacing = bottomSpan / (this.rows + 2);
        const lastPegRowWidth = colSpacing * (this.rows + 1);
        const lastRowStartX = (w - lastPegRowWidth) / 2;
        const basketStartY = bottomY + 14;
        const basketWidth = Math.max(12, colSpacing * 0.92);
        const basketHeight = Math.max(22, Math.min(34, h * 0.075));

        // Dynamic board walls framing the triangle
        this.wallLeft = Math.max(6, lastRowStartX - colSpacing * 0.7);
        this.wallRight = Math.min(w - 6, lastRowStartX + lastPegRowWidth + colSpacing * 0.7);

        for (let b = 0; b < basketCount; b++) {
            // Gap b is centered between Peg b and Peg b + 1 of the last row
            const bx = lastRowStartX + (b + 0.5) * colSpacing;
            const by = basketStartY;
            const multVal = multipliers[b] || 1.0;

            const basketEntity = new PIXI.Container();
            basketEntity.x = bx;
            basketEntity.y = by;

            // Chromatic heat-map based on multiplier value
            const style = this._getBasketColorStyle(multVal, b, basketCount);

            const bgGfx = new PIXI.Graphics();
            // Carved Tiki coconut shell bowl
            bgGfx.beginFill(style.fillColor, 0.92);
            bgGfx.lineStyle(1.8, style.strokeColor, 0.95);
            bgGfx.drawRoundedRect(-basketWidth / 2, -basketHeight / 2, basketWidth, basketHeight, 8);
            // Inner rim highlight line
            bgGfx.lineStyle(1.0, 0xffffff, 0.35);
            bgGfx.moveTo(-basketWidth / 2 + 3, -basketHeight / 2 + 3);
            bgGfx.lineTo(basketWidth / 2 - 3, -basketHeight / 2 + 3);
            bgGfx.endFill();

            // Ambient Glow Underline
            const glowGfx = new PIXI.Graphics();
            glowGfx.beginFill(style.strokeColor, 0.25);
            glowGfx.drawRoundedRect(-basketWidth / 2 + 2, basketHeight / 2 + 2, basketWidth - 4, 3, 2);
            glowGfx.endFill();
            basketEntity.addChild(glowGfx);

            // Label text (Multiplier)
            const fontSize = Math.max(7, Math.min(13, basketWidth * 0.38));
            const labelText = multVal >= 100 ? `${Math.round(multVal)}×` : `${multVal.toFixed(multVal < 10 && multVal % 1 !== 0 ? 1 : 0)}×`;
            const textNode = new PIXI.Text(labelText, {
                fontFamily: 'Rajdhani, sans-serif',
                fontSize,
                fontWeight: '900',
                fill: style.textColor,
                align: 'center'
            });
            textNode.anchor.set(0.5);

            basketEntity.addChild(bgGfx);
            basketEntity.addChild(textNode);
            this.basketsContainer.addChild(basketEntity);

            this.baskets.push({
                x: bx,
                y: by,
                width: basketWidth,
                height: basketHeight,
                index: b,
                multiplier: multVal,
                container: basketEntity,
                bgGfx,
                textNode,
                style
            });
        }
    }

    _getBasketColorStyle(multVal, b, basketCount) {
        // Multiplier tiered color spectrum
        if (multVal >= 400) {
            // Ultra Sultan Maxwin 1000x: Royal 24K Gold & Crimson
            return { fillColor: 0xd97706, strokeColor: 0xfef08a, textColor: '#ffffff' };
        } else if (multVal >= 70) {
            // High Maxwin 76x - 170x: Radiant Neon Magenta
            return { fillColor: 0xc026d3, strokeColor: 0xf0abfc, textColor: '#ffffff' };
        } else if (multVal >= 20) {
            // Crimson Flame 20x - 58x
            return { fillColor: 0xef4444, strokeColor: 0xfca5a5, textColor: '#ffffff' };
        } else if (multVal >= 7) {
            // Vibrant Tangerine 7x - 18x
            return { fillColor: 0xea580c, strokeColor: 0xfdba74, textColor: '#ffffff' };
        } else if (multVal >= 3) {
            // Warm Amber Gold 3x - 5x
            return { fillColor: 0xf59e0b, strokeColor: 0xfef08a, textColor: '#ffffff' };
        } else if (multVal >= 1.2) {
            // Ocean Cyan Lagoon 1.2x - 2.5x
            return { fillColor: 0x06b6d4, strokeColor: 0x67e8f9, textColor: '#ffffff' };
        } else {
            // Safe Center Emerald 0.2x - 1.1x
            return { fillColor: 0x059669, strokeColor: 0x34d399, textColor: '#ffffff' };
        }
    }

    _setupTicker() {
        this.app.ticker.add((delta) => {
            const rawDt = Math.min(0.033, delta * 0.016);
            const dt = rawDt * this.speedMultiplier;

            this.wavePhase += delta * 0.025;
            this.ambientTime += delta;

            // 1. Update dynamic ocean waves every 2 frames
            if (Math.floor(this.ambientTime) % 2 === 0) {
                const w = this.app ? this.app.screen.width : 760;
                const h = this.app ? this.app.screen.height : 580;
                this._renderOceanWaves(w, h, this.wavePhase);
            }

            // 2. Torch flames & ambient embers
            this._updateTorchFlames(delta);

            // 3. Multi-step physics (2 sub-steps prevents any tunneling)
            const subSteps = 2;
            const subDt = dt / subSteps;
            for (let step = 0; step < subSteps; step++) {
                this._updatePhysics(subDt);
            }

            // 4. Motion trails & particles
            this._renderMotionTrails();
            this._updateParticles(delta);
            this._updateShockwaves(delta);
        });
    }

    _updateTorchFlames(delta) {
        const PIXI = this._getPIXI();
        if (!PIXI || !this.leftTorchX) return;

        // Spawn new fire embers occasionally
        if (Math.random() < 0.45 && this.torchEmbers.length < 24) {
            const isLeft = Math.random() > 0.5;
            const tx = isLeft ? this.leftTorchX : this.rightTorchX;
            const ty = isLeft ? this.leftTorchY : this.rightTorchY;

            const ember = new PIXI.Graphics();
            const color = Math.random() > 0.35 ? 0xf59e0b : 0xef4444;
            ember.beginFill(color, 0.85);
            ember.drawCircle(0, 0, 1.2 + Math.random() * 1.5);
            ember.endFill();

            ember.x = tx + (Math.random() - 0.5) * 8;
            ember.y = ty;
            this.bgContainer.addChild(ember);

            this.torchEmbers.push({
                gfx: ember,
                vx: (Math.random() - 0.5) * 0.8,
                vy: -1.2 - Math.random() * 1.8,
                alpha: 1.0,
                decay: 0.03 + Math.random() * 0.03
            });
        }

        // Update embers
        for (let i = this.torchEmbers.length - 1; i >= 0; i--) {
            const e = this.torchEmbers[i];
            e.gfx.x += e.vx * delta;
            e.gfx.y += e.vy * delta;
            e.alpha -= e.decay * delta;
            e.gfx.alpha = Math.max(0, e.alpha);

            if (e.alpha <= 0) {
                this.bgContainer.removeChild(e.gfx);
                e.gfx.destroy();
                this.torchEmbers.splice(i, 1);
            }
        }
    }

    /**
     * Spawns a new bouncing Coconut from the top palm spout
     */
    dropCoconut({ bet = 100000, isGolden = false, onLand = null } = {}) {
        const PIXI = this._getPIXI();
        if (!PIXI || !this.app) return;

        const w = this.app.screen.width;
        const h = this.app.screen.height;

        // Slight randomized jitter at launch nozzle (-5 to +5 px)
        const jitter = (Math.random() - 0.5) * 10;
        const startX = w * 0.5 + jitter;
        const startY = h * 0.068;

        const ballRadius = Math.max(4.5, Math.min(11, (w < 420 ? 70 : 102) / this.rows));

        const ballContainer = new PIXI.Container();
        ballContainer.x = startX;
        ballContainer.y = startY;

        const ballGfx = new PIXI.Graphics();

        if (isGolden) {
            // Golden Coconut (Kelapa Emas Sultan)
            // Outer golden aura ring
            ballGfx.beginFill(0xfbbf24, 0.35);
            ballGfx.drawCircle(0, 0, ballRadius + 4);
            // Solid 24K Gold Body
            ballGfx.beginFill(0xf59e0b);
            ballGfx.drawCircle(0, 0, ballRadius);
            // High Gloss Glare
            ballGfx.beginFill(0xffffff, 0.95);
            ballGfx.drawCircle(-ballRadius * 0.32, -ballRadius * 0.32, ballRadius * 0.38);
            // 3 Coconut Eyes (in dark amber)
            ballGfx.beginFill(0x78350f);
            ballGfx.drawCircle(-ballRadius * 0.22, ballRadius * 0.15, 1.4);
            ballGfx.drawCircle(ballRadius * 0.22, ballRadius * 0.15, 1.4);
            ballGfx.drawCircle(0, ballRadius * 0.36, 1.6);
            ballGfx.endFill();
        } else {
            // Ripe Organic Tropical Brown Coconut
            ballGfx.beginFill(0x382212); // Shell dark outer shadow
            ballGfx.drawCircle(0, 0, ballRadius);
            ballGfx.beginFill(0x603813); // Warm fiber texture
            ballGfx.drawCircle(-0.5, -0.5, ballRadius * 0.88);
            // Sunlight Glare
            ballGfx.beginFill(0xfde68a, 0.45);
            ballGfx.drawCircle(-ballRadius * 0.35, -ballRadius * 0.35, ballRadius * 0.32);
            // 3 Dark Coconut "Eyes"
            ballGfx.beginFill(0x1a0d05);
            ballGfx.drawCircle(-ballRadius * 0.22, ballRadius * 0.12, 1.4);
            ballGfx.drawCircle(ballRadius * 0.22, ballRadius * 0.12, 1.4);
            ballGfx.drawCircle(0, ballRadius * 0.34, 1.6);
            ballGfx.endFill();
        }

        ballContainer.addChild(ballGfx);
        this.ballsContainer.addChild(ballContainer);

        // Nozzle recoil effect
        if (this.dropNozzleGfx && window.gsap) {
            window.gsap.fromTo(this.dropNozzleGfx.scale,
                { x: 1.35, y: 1.35 },
                { x: 1.0, y: 1.0, duration: 0.22, ease: 'back.out(2)' }
            );
        }

        const ballData = {
            id: 'coco_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            container: ballContainer,
            gfx: ballGfx,
            x: startX,
            y: startY,
            vx: (Math.random() - 0.5) * 55, // Initial slight sideways drift
            vy: 24 + Math.random() * 30,
            radius: ballRadius,
            angularVelocity: (Math.random() - 0.5) * 9,
            rotation: 0,
            trailPoints: [],
            bet,
            isGolden,
            onLand,
            active: true
        };

        this.balls.push(ballData);
        if (typeof AuraSound.playCoconutLaunch === 'function') {
            AuraSound.playCoconutLaunch();
        } else {
            AuraSound.playTap?.();
        }
        return ballData;
    }

    _updatePhysics(dt) {
        const gravity = 640; // Base gravity (px/s^2)
        const restitution = 0.54; // Elasticity of bounce
        const w = this.app ? this.app.screen.width : 760;
        const bottomThreshold = this.baskets.length > 0 ? this.baskets[0].y : 500;

        for (let i = this.balls.length - 1; i >= 0; i--) {
            const ball = this.balls[i];
            if (!ball.active) continue;

            // 1. Apply gravity & velocity
            ball.vy += gravity * dt;
            ball.x += ball.vx * dt;
            ball.y += ball.vy * dt;

            // Rotate coconut naturally
            ball.rotation += ball.angularVelocity * dt;
            ball.container.rotation = ball.rotation;

            // Track recent trail positions
            ball.trailPoints.push({ x: ball.x, y: ball.y });
            if (ball.trailPoints.length > 6) {
                ball.trailPoints.shift();
            }

            // Continuous golden sparkle particles for Golden Coconuts
            if (ball.isGolden && Math.random() < 0.45) {
                this._spawnGoldenSparkle(ball.x, ball.y);
            }

            // 2. Lateral wall bounce (Boundary walls keep coconuts on the board)
            const wallLeft = this.wallLeft || (w * 0.045);
            const wallRight = this.wallRight || (w * 0.955);
            if (ball.x - ball.radius < wallLeft) {
                ball.x = wallLeft + ball.radius;
                ball.vx = Math.abs(ball.vx) * 0.55 + 15;
            } else if (ball.x + ball.radius > wallRight) {
                ball.x = wallRight - ball.radius;
                ball.vx = -Math.abs(ball.vx) * 0.55 - 15;
            }

            // Cap extreme lateral speeds
            ball.vx = Math.max(-260, Math.min(260, ball.vx * 0.99));

            // 3. Peg Collision Check
            for (let p = 0; p < this.pegs.length; p++) {
                const peg = this.pegs[p];
                const dx = ball.x - peg.x;
                const dy = ball.y - peg.y;
                const minDist = ball.radius + peg.radius;
                const distSq = dx * dx + dy * dy;

                if (distSq < minDist * minDist) {
                    const dist = Math.sqrt(distSq) || 0.001;
                    const nx = dx / dist;
                    const ny = dy / dist;

                    // Push ball outside peg to resolve penetration
                    ball.x = peg.x + nx * (minDist + 0.6);
                    ball.y = peg.y + ny * (minDist + 0.6);

                    // Normal & tangential velocity components
                    const normalVel = ball.vx * nx + ball.vy * ny;

                    if (normalVel < 0) {
                        // Reflect with restitution
                        const impulse = -(1 + restitution) * normalVel;
                        // Add slight random organic tangential deflection (mimics coconut texture)
                        const tangentialJitter = (Math.random() - 0.5) * 36;

                        ball.vx += nx * impulse + (-ny) * tangentialJitter;
                        ball.vy += ny * impulse + (nx) * tangentialJitter;

                        // Spin spin spin!
                        ball.angularVelocity = (Math.random() - 0.5) * 16;

                        // Visual & Audio Peg Trigger
                        this._triggerPegBounce(peg, ball);
                    }
                }
            }

            // 4. Update container position
            ball.container.x = ball.x;
            ball.container.y = ball.y;

            // 5. Land in Multiplier Basket Check
            if (ball.y >= bottomThreshold - 8) {
                this._handleBasketLanding(ball, i);
                continue;
            }

            // 6. Failsafe Timeout: If ball is stuck on pegs or falls below threshold, force land
            ball.age = (ball.age || 0) + dt;
            if (ball.y > bottomThreshold + 20 || ball.age > 7.0) {
                this._handleBasketLanding(ball, i);
            }
        }
    }

    _renderMotionTrails() {
        if (!this.trailsGfx) return;
        this.trailsGfx.clear();

        for (let i = 0; i < this.balls.length; i++) {
            const ball = this.balls[i];
            if (!ball.active || ball.trailPoints.length < 2) continue;

            const pts = ball.trailPoints;
            const strokeColor = ball.isGolden ? 0xfbbf24 : 0x78350f;

            for (let k = 0; k < pts.length - 1; k++) {
                const alpha = (k / pts.length) * (ball.isGolden ? 0.45 : 0.25);
                const width = ball.radius * (0.3 + (k / pts.length) * 0.7);

                this.trailsGfx.lineStyle(width, strokeColor, alpha);
                this.trailsGfx.moveTo(pts[k].x, pts[k].y);
                this.trailsGfx.lineTo(pts[k + 1].x, pts[k + 1].y);
            }
        }
    }

    _triggerPegBounce(peg, ball) {
        // Musical diatonic / pentatonic pitch progression by row
        const pitchRatio = 0.72 + (peg.row / this.rows) * 0.95;
        AuraSound.playCoconutBounce?.(pitchRatio, ball.isGolden);

        // Flash peg highlight
        if (peg.gfx) {
            peg.gfx.tint = ball.isGolden ? 0xfef08a : 0xffffff;
            setTimeout(() => {
                if (peg.gfx) peg.gfx.tint = 0xffffff;
            }, 90);
        }

        // Spring animation on the peg
        if (window.gsap) {
            window.gsap.fromTo(peg.container.scale,
                { x: 1.6, y: 1.6 },
                { x: 1.0, y: 1.0, duration: 0.24, ease: 'back.out(2.5)' }
            );
        }

        // Spawn Expanding Shockwave Ripple
        this._spawnPegShockwave(peg.x, peg.y, peg.radius, ball.isGolden);

        // Spawn 3-5 coconut water splashes & palm leaf flakes
        this._spawnDropletParticles(peg.x, peg.y, ball.isGolden);
    }

    _spawnPegShockwave(x, y, radius, isGolden) {
        const PIXI = this._getPIXI();
        if (!PIXI || this.shockwaves.length > 20) return;

        const wave = new PIXI.Graphics();
        const color = isGolden ? 0xfbbf24 : 0x38bdf8;
        wave.lineStyle(1.8, color, 0.9);
        wave.drawCircle(0, 0, radius);
        wave.x = x;
        wave.y = y;

        this.overlayContainer.addChild(wave);

        this.shockwaves.push({
            gfx: wave,
            scale: 1.0,
            maxScale: 3.2,
            alpha: 1.0,
            growth: 0.16,
            decay: 0.08
        });
    }

    _updateShockwaves(delta) {
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.scale += sw.growth * delta;
            sw.alpha -= sw.decay * delta;

            sw.gfx.scale.set(sw.scale);
            sw.gfx.alpha = Math.max(0, sw.alpha);

            if (sw.alpha <= 0 || sw.scale >= sw.maxScale) {
                this.overlayContainer.removeChild(sw.gfx);
                sw.gfx.destroy();
                this.shockwaves.splice(i, 1);
            }
        }
    }

    _spawnDropletParticles(x, y, isGolden = false) {
        const PIXI = this._getPIXI();
        if (!PIXI || this.particles.length > 90) return;

        const count = 3 + Math.floor(Math.random() * 3);
        for (let k = 0; k < count; k++) {
            const p = new PIXI.Graphics();
            const r = Math.random();

            if (isGolden) {
                // Golden Stardust Particle
                p.beginFill(0xfde047, 0.95);
                p.drawPolygon([-1.5, -3, 1.5, -3, 3, 0, 1.5, 3, -1.5, 3, -3, 0]);
            } else if (r > 0.65) {
                // Tiny green palm leaf flake
                p.beginFill(0x22c55e, 0.9);
                p.drawPolygon([-2.5, -1, 3.5, 0, -2.5, 1]);
            } else {
                // Coconut water droplet (Cyan / white splash)
                p.beginFill(0x38bdf8, 0.95);
                p.drawCircle(0, 0, 1.2 + Math.random() * 1.6);
            }
            p.endFill();

            p.x = x;
            p.y = y;
            this.particlesContainer.addChild(p);

            const angle = Math.random() * Math.PI * 2;
            const speed = 1.4 + Math.random() * 3.2;

            this.particles.push({
                gfx: p,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.4,
                alpha: 1.0,
                decay: 0.038 + Math.random() * 0.03
            });
        }
    }

    _spawnGoldenSparkle(x, y) {
        const PIXI = this._getPIXI();
        if (!PIXI || this.particles.length > 90) return;

        const p = new PIXI.Graphics();
        p.beginFill(0xfde047, 0.9);
        p.drawCircle(0, 0, 1.5 + Math.random() * 1.5);
        p.endFill();

        p.x = x + (Math.random() - 0.5) * 12;
        p.y = y + (Math.random() - 0.5) * 12;
        this.particlesContainer.addChild(p);

        this.particles.push({
            gfx: p,
            vx: (Math.random() - 0.5) * 1.0,
            vy: -1.0 - Math.random() * 1.5,
            alpha: 1.0,
            decay: 0.05 + Math.random() * 0.04
        });
    }

    _updateParticles(delta) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.gfx.x += p.vx * delta;
            p.gfx.y += p.vy * delta;
            p.vy += 0.09 * delta; // slight gravity
            p.alpha -= p.decay * delta;
            p.gfx.alpha = Math.max(0, p.alpha);

            if (p.alpha <= 0) {
                this.particlesContainer.removeChild(p.gfx);
                p.gfx.destroy();
                this.particles.splice(i, 1);
            }
        }
    }

    _handleBasketLanding(ball, ballIndex) {
        ball.active = false;

        // Find closest basket horizontally
        let closestBasket = this.baskets[0];
        let minDist = 99999;

        for (let b = 0; b < this.baskets.length; b++) {
            const basket = this.baskets[b];
            const dist = Math.abs(ball.x - basket.x);
            if (dist < minDist) {
                minDist = dist;
                closestBasket = basket;
            }
        }

        // Remove ball smoothly with squash into basket
        if (window.gsap) {
            window.gsap.to(ball.container.scale, {
                x: 0.2,
                y: 0.2,
                duration: 0.16,
                ease: 'power2.in',
                onComplete: () => {
                    if (ball.container.parent) {
                        ball.container.parent.removeChild(ball.container);
                    }
                    ball.container.destroy();
                }
            });
        } else {
            if (ball.container.parent) ball.container.parent.removeChild(ball.container);
            ball.container.destroy();
        }

        this.balls.splice(ballIndex, 1);

        // Basket punch spring reaction
        if (closestBasket && window.gsap) {
            window.gsap.fromTo(closestBasket.container,
                { y: closestBasket.y + 8, scaleY: 0.78 },
                { y: closestBasket.y, scaleY: 1.0, duration: 0.34, ease: 'elastic.out(1.2, 0.4)' }
            );

            // Vertical Light Beacon Beam Shooting Upward from Basket!
            this._triggerBasketBeacon(closestBasket);
        }

        const mult = closestBasket ? closestBasket.multiplier : 1.0;
        const winAmount = Math.round(ball.bet * mult * (ball.isGolden ? 2 : 1));

        // Track session basket hit count
        if (closestBasket) {
            this.basketHitCounts[closestBasket.index] = (this.basketHitCounts[closestBasket.index] || 0) + 1;
        }

        // Audio & Visual celebratory fanfare
        if (typeof AuraSound.playCoconutLanding === 'function') {
            AuraSound.playCoconutLanding(mult, ball.isGolden);
        } else {
            AuraSound.playWin?.();
        }

        // Confetti / Water fountain for >= 10x
        if (mult >= 10.0) {
            this._spawnJackpotFountain(closestBasket.x, closestBasket.y - 12);
        }

        // Screen shake juice on >= 25x
        if (mult >= 25.0 && window.gsap) {
            window.gsap.fromTo(this.boardContainer,
                { x: -5 + Math.random() * 10, y: -4 + Math.random() * 8 },
                { x: 0, y: 0, duration: 0.38, ease: 'elastic.out(1.2, 0.3)' }
            );
        }

        // Spawn floating score pill
        this._spawnScorePopup(closestBasket.x, closestBasket.y - 20, mult, winAmount, ball.isGolden);

        // Invoke callback to Engine (support both per-ball callback and stage options)
        const landCallback = ball.onLand || this.options.onCoconutLand;
        if (landCallback) {
            landCallback({
                basketIndex: closestBasket ? closestBasket.index : 0,
                multiplier: mult,
                isGolden: ball.isGolden,
                bet: ball.bet,
                winAmount
            });
        }
    }

    _triggerBasketBeacon(basket) {
        const PIXI = this._getPIXI();
        if (!PIXI || !this.app) return;

        const beacon = new PIXI.Graphics();
        const beamColor = basket.style ? basket.style.strokeColor : 0xfbbf24;
        const beamWidth = basket.width * 0.75;
        const beamHeight = this.app.screen.height * 0.7;

        beacon.beginFill(beamColor, 0.42);
        beacon.drawRect(-beamWidth / 2, -beamHeight, beamWidth, beamHeight);
        beacon.endFill();

        beacon.x = basket.x;
        beacon.y = basket.y;
        this.beaconContainer.addChild(beacon);

        if (window.gsap) {
            window.gsap.to(beacon, {
                alpha: 0,
                duration: 0.38,
                ease: 'power2.out',
                onComplete: () => {
                    if (beacon.parent) beacon.parent.removeChild(beacon);
                    beacon.destroy();
                }
            });
        } else {
            setTimeout(() => {
                if (beacon.parent) beacon.parent.removeChild(beacon);
                beacon.destroy();
            }, 380);
        }
    }

    _spawnJackpotFountain(x, y) {
        const PIXI = this._getPIXI();
        if (!PIXI) return;

        const count = 18;
        for (let i = 0; i < count; i++) {
            const p = new PIXI.Graphics();
            const colors = [0xfbbf24, 0xef4444, 0x38bdf8, 0x34d399, 0xf43f5e];
            const col = colors[Math.floor(Math.random() * colors.length)];

            p.beginFill(col, 0.95);
            p.drawCircle(0, 0, 2 + Math.random() * 2.5);
            p.endFill();

            p.x = x;
            p.y = y;
            this.particlesContainer.addChild(p);

            const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.2;
            const speed = 4.5 + Math.random() * 5.5;

            this.particles.push({
                gfx: p,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1.0,
                decay: 0.025 + Math.random() * 0.025
            });
        }
    }

    _spawnScorePopup(x, y, multiplier, winAmount, isGolden) {
        const PIXI = this._getPIXI();
        if (!PIXI || !this.app) return;

        const popup = new PIXI.Container();
        popup.x = x;
        popup.y = y;

        const text = isGolden ? `GOLD 2X! ${multiplier}×` : `${multiplier}×`;
        const color = multiplier >= 25 ? '#fbbf24' : (multiplier >= 2 ? '#34d399' : '#ffffff');

        // Score Pill Background
        const pillBg = new PIXI.Graphics();
        pillBg.beginFill(0x0a0a0a, 0.85);
        pillBg.lineStyle(1.4, multiplier >= 25 ? 0xfbbf24 : 0x10b981, 0.9);
        pillBg.drawRoundedRect(-28, -12, 56, 24, 6);
        pillBg.endFill();
        popup.addChild(pillBg);

        const scoreText = new PIXI.Text(text, {
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 13,
            fontWeight: '900',
            fill: color,
            align: 'center',
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 4
        });
        scoreText.anchor.set(0.5);
        popup.addChild(scoreText);

        this.overlayContainer.addChild(popup);

        if (window.gsap) {
            window.gsap.fromTo(popup.scale,
                { x: 0.5, y: 0.5 },
                { x: 1.15, y: 1.15, duration: 0.18, ease: 'back.out(2)' }
            );

            window.gsap.to(popup, {
                y: y - 36,
                alpha: 0,
                duration: 0.85,
                delay: 0.15,
                ease: 'power2.out',
                onComplete: () => {
                    if (popup.parent) popup.parent.removeChild(popup);
                    popup.destroy();
                }
            });
        } else {
            setTimeout(() => {
                if (popup.parent) popup.parent.removeChild(popup);
                popup.destroy();
            }, 1000);
        }
    }

    _handleResize() {
        if (!this.app || !this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const w = Math.max(260, Math.floor(rect.width || this.options.width));
        const h = Math.max(360, Math.floor(rect.height || this.options.height));

        this.app.renderer.resize(w, h);
        this._drawTropicalBackground();
        this.rebuildBoard(this.rows, this.multipliers);
    }

    destroy() {
        window.removeEventListener('resize', this._resizeHandler);
        this.balls.forEach(b => {
            if (b.container && b.container.parent) b.container.parent.removeChild(b.container);
            b.container.destroy();
        });
        this.balls = [];

        if (this.app) {
            this.app.destroy(true, { children: true, texture: false, baseTexture: false });
            this.app = null;
        }
    }
}

export default PixiPlinkoStage;