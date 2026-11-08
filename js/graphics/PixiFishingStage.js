/**
 * PixiFishingStage.js - Authentic Fishing Crash Game WebGL Stage (Big Bass Crash / Aviator Style)
 * Powered by PixiJS v7 & GSAP 3
 * Features:
 * - Authentic Crash Game Coordinate Grid (Dynamic Y-Axis Multipliers & X-Axis Time markers)
 * - Rising Exponential Crash Curve with glowing trajectory line & shaded area fill underneath
 * - Cashout Marker Pins dropped directly onto the Crash Curve when player cashes out
 * - Deep ocean background with swimming marine life of various sizes (small fish, tuna, marlin, shark)
 * - Fisherman boat on the top water surface casting line to the curve tip
 * - Evolving hooked fish riding the leading tip of the Crash Curve (scales & changes color by multiplier tier)
 * - Red curve flash & line snap burst on Crash
 */

export class PixiFishingStage {
    constructor(canvasElement, options = {}) {
        this.canvas = canvasElement;
        this.options = Object.assign({
            width: 820,
            height: 400
        }, options);

        this.app = null;
        this.isPixiReady = false;
        // 'countdown' | 'hooked' (flying) | 'snapped' (crashed) | 'idle'
        this.state = 'countdown';

        // Display layers
        this.bgContainer = null;
        this.ambientFishContainer = null;
        this.gridContainer = null;
        this.axisLabelsContainer = null;
        this.curveContainer = null;
        this.pinsContainer = null;
        this.boatLineContainer = null;
        this.tipContainer = null;
        this.bubblesContainer = null;
        this.fxContainer = null;

        // Entities & State
        this.ambientFishes = [];
        this.bubbles = [];
        this.axisLabels = [];
        this.cashoutPins = [];
        this.currentMultiplier = 1.0;
        this.flightProgress = 0;
        this.elapsedSec = 0;
        this.time = 0;

        // Curve coordinates
        this.graphOrigin = { x: 58, y: 348 };
        this.tipPos = { x: 58, y: 348 };
        this.boatPos = { x: 110, y: 28 };
        this.targetFish = null;
        this.targetFishBody = null;
        this.lastFishTier = -1;

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
            const w = Math.max(320, rect.width || this.options.width);
            const h = Math.max(260, rect.height || this.options.height);

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
            this._drawOceanBackground();
            this._createAmbientFish();
            this._createCurveTipFish();
            this._drawCoordinateGrid();
            this._setupTicker();

            window.addEventListener('resize', this._resizeHandler);
            this.isPixiReady = true;
        } catch (e) {
            console.warn('[PixiFishingStage] WebGL init fallback:', e);
            this.isPixiReady = false;
        }
    }

    _setupLayers() {
        const PIXI = this._getPIXI();

        this.bgContainer = new PIXI.Container();
        this.ambientFishContainer = new PIXI.Container();
        this.gridContainer = new PIXI.Graphics();
        this.axisLabelsContainer = new PIXI.Container();
        this.curveContainer = new PIXI.Graphics();
        this.pinsContainer = new PIXI.Container();
        this.boatLineContainer = new PIXI.Graphics();
        this.tipContainer = new PIXI.Container();
        this.bubblesContainer = new PIXI.Container();
        this.fxContainer = new PIXI.Container();

        this.app.stage.addChild(this.bgContainer);
        this.app.stage.addChild(this.ambientFishContainer);
        this.app.stage.addChild(this.gridContainer);
        this.app.stage.addChild(this.axisLabelsContainer);
        this.app.stage.addChild(this.curveContainer);
        this.app.stage.addChild(this.pinsContainer);
        this.app.stage.addChild(this.boatLineContainer);
        this.app.stage.addChild(this.tipContainer);
        this.app.stage.addChild(this.bubblesContainer);
        this.app.stage.addChild(this.fxContainer);
    }

    _drawOceanBackground() {
        const PIXI = this._getPIXI();
        if (!PIXI || !this.app) return;

        const w = this.app.screen.width;
        const h = this.app.screen.height;

        this.graphOrigin = { x: 56, y: h - 36 };
        this.bgContainer.removeChildren();

        // 1. Deep Sea Crash Stage Backdrop
        const oceanBg = new PIXI.Graphics();
        oceanBg.beginFill(0x07192b);
        oceanBg.drawRect(0, 0, w, h * 0.25);
        oceanBg.beginFill(0x051322);
        oceanBg.drawRect(0, h * 0.25, w, h * 0.40);
        oceanBg.beginFill(0x030b14);
        oceanBg.drawRect(0, h * 0.65, w, h * 0.35);
        oceanBg.endFill();
        this.bgContainer.addChild(oceanBg);

        // 2. Subtle Underwater Light Rays
        const raysGfx = new PIXI.Graphics();
        for (let i = 0; i < 5; i++) {
            const rx = w * 0.12 + i * (w * 0.18);
            raysGfx.beginFill(0x38bdf8, 0.035);
            raysGfx.drawPolygon([
                rx, 0,
                rx + 28, 0,
                rx + 95, h,
                rx - 30, h
            ]);
            raysGfx.endFill();
        }
        this.bgContainer.addChild(raysGfx);

        // 3. Top Water Surface Line & Fisherman Boat Silhouette
        const surfaceGfx = new PIXI.Graphics();
        surfaceGfx.lineStyle(2, 0x38bdf8, 0.35);
        surfaceGfx.moveTo(0, 26);
        surfaceGfx.lineTo(w, 26);

        // Fishing Boat at top-left surface
        surfaceGfx.beginFill(0x1e293b);
        surfaceGfx.lineStyle(1.5, 0x38bdf8, 0.7);
        surfaceGfx.drawPolygon([
            64, 14,
            136, 14,
            124, 28,
            72, 28
        ]);
        surfaceGfx.endFill();

        // Cabin & Fishing Rod
        surfaceGfx.beginFill(0x0f172a);
        surfaceGfx.drawRect(82, 6, 22, 8);
        surfaceGfx.endFill();

        surfaceGfx.lineStyle(2.5, 0xfbbf24, 0.95);
        surfaceGfx.moveTo(122, 16);
        surfaceGfx.lineTo(152, 6);
        surfaceGfx.beginFill(0xffffff);
        surfaceGfx.drawCircle(152, 6, 2.5);
        surfaceGfx.endFill();

        this.boatPos = { x: 152, y: 6 };
        this.bgContainer.addChild(surfaceGfx);
    }

    /**
     * Creates diverse ambient fish swimming in background depths (Small, Medium, Large)
     */
    _createAmbientFish() {
        const PIXI = this._getPIXI();
        if (!PIXI || !this.app) return;

        const w = this.app.screen.width;
        const h = this.app.screen.height;

        this.ambientFishContainer.removeChildren();
        this.ambientFishes = [];

        const fishSpecs = [
            { size: 9,  speed: 0.65, yRatio: 0.24, color: 0x38bdf8, alpha: 0.22 },
            { size: 12, speed: 0.85, yRatio: 0.35, color: 0x06b6d4, alpha: 0.28 },
            { size: 8,  speed: 0.55, yRatio: 0.44, color: 0x38bdf8, alpha: 0.20 },
            { size: 18, speed: 1.05, yRatio: 0.56, color: 0x0284c7, alpha: 0.32 },
            { size: 24, speed: 0.90, yRatio: 0.68, color: 0x0369a1, alpha: 0.35 },
            { size: 15, speed: 0.75, yRatio: 0.76, color: 0x0ea5e9, alpha: 0.25 },
            { size: 34, speed: 0.80, yRatio: 0.86, color: 0x1e293b, alpha: 0.48 }
        ];

        fishSpecs.forEach((spec, idx) => {
            const fishGfx = new PIXI.Graphics();
            const s = spec.size;
            const dir = idx % 2 === 0 ? 1 : -1;

            fishGfx.beginFill(spec.color, spec.alpha);
            fishGfx.drawPolygon([
                s * 1.2, 0,
                s * 0.4, -s * 0.35,
                -s * 0.6, -s * 0.18,
                -s * 1.1, -s * 0.48,
                -s * 0.8, 0,
                -s * 1.1, s * 0.48,
                -s * 0.6, s * 0.18,
                s * 0.4, s * 0.35
            ]);
            fishGfx.endFill();

            fishGfx.scale.x = dir;
            fishGfx.x = Math.random() * w;
            fishGfx.y = h * spec.yRatio;

            this.ambientFishContainer.addChild(fishGfx);
            this.ambientFishes.push({
                gfx: fishGfx,
                dir,
                speed: spec.speed * (0.85 + Math.random() * 0.3),
                baseY: h * spec.yRatio,
                swimPhase: Math.random() * Math.PI * 2
            });
        });
    }

    /**
     * Draws the standard Crash Game X/Y Coordinate Grid & Dynamic Axis Labels
     */
    _drawCoordinateGrid() {
        const PIXI = this._getPIXI();
        if (!PIXI || !this.app) return;

        const w = this.app.screen.width;
        const h = this.app.screen.height;
        const ox = this.graphOrigin.x;
        const oy = this.graphOrigin.y;
        const topY = 38;
        const rightX = w - 24;
        const graphW = Math.max(100, rightX - ox);
        const graphH = Math.max(100, oy - topY);

        this.gridContainer.clear();
        this.axisLabelsContainer.removeChildren();

        // 1. Horizontal Multiplier Grid Lines (4 rows)
        const hSteps = 4;
        const maxScaleMult = Math.max(2.0, this.currentMultiplier * 1.25);

        for (let i = 0; i <= hSteps; i++) {
            const ratio = i / hSteps;
            const y = oy - ratio * graphH;

            this.gridContainer.lineStyle(1, 0x1e293b, i === 0 ? 0.9 : 0.55);
            this.gridContainer.moveTo(ox, y);
            this.gridContainer.lineTo(rightX, y);

            // Y-Axis Multiplier Label
            const val = 1.0 + ratio * (maxScaleMult - 1.0);
            const labelStr = val >= 10 ? `${val.toFixed(0)}x` : `${val.toFixed(1)}x`;
            const lbl = new PIXI.Text(labelStr, {
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                fontWeight: '700',
                fill: 0x64748b
            });
            lbl.anchor.set(1, 0.5);
            lbl.x = ox - 8;
            lbl.y = y;
            this.axisLabelsContainer.addChild(lbl);
        }

        // 2. Vertical Time Grid Columns (5 columns)
        const vSteps = 5;
        const maxTimeSec = Math.max(10, Math.ceil(this.elapsedSec / 5) * 5 + 2);

        for (let j = 0; j <= vSteps; j++) {
            const ratio = j / vSteps;
            const x = ox + ratio * graphW;

            this.gridContainer.lineStyle(1, 0x1e293b, j === 0 ? 0.9 : 0.45);
            this.gridContainer.moveTo(x, topY);
            this.gridContainer.lineTo(x, oy);

            if (j > 0) {
                const secVal = Math.round(ratio * maxTimeSec);
                const tLbl = new PIXI.Text(`${secVal}s`, {
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 10,
                    fontWeight: '700',
                    fill: 0x64748b
                });
                tLbl.anchor.set(0.5, 0);
                tLbl.x = x;
                tLbl.y = oy + 8;
                this.axisLabelsContainer.addChild(tLbl);
            }
        }
    }

    /**
     * Creates the hooked fish icon riding the leading tip of the Crash Curve
     */
    _createCurveTipFish() {
        const PIXI = this._getPIXI();
        if (!PIXI) return;

        this.tipContainer.removeChildren();
        const root = new PIXI.Container();

        // Pulsing Target Reticle Ring at Curve Tip
        const ring = new PIXI.Graphics();
        ring.lineStyle(2, 0x38bdf8, 0.85);
        ring.beginFill(0x38bdf8, 0.18);
        ring.drawCircle(0, 0, 18);
        ring.endFill();
        root.addChild(ring);
        this.tipRing = ring;

        // Fish Graphic container
        const fishBody = new PIXI.Graphics();
        root.addChild(fishBody);
        this.targetFishBody = fishBody;

        this.tipContainer.addChild(root);
        this.targetFish = root;
        this._updateFishAppearanceByTier(0);

        this.tipPos = { x: this.graphOrigin.x, y: this.graphOrigin.y };
        this.targetFish.x = this.tipPos.x;
        this.targetFish.y = this.tipPos.y;
    }

    /**
     * Evolves the fish at the curve tip as multiplier climbs higher
     */
    _updateFishAppearanceByTier(tier) {
        if (!this.targetFishBody || this.lastFishTier === tier) return;
        this.lastFishTier = tier;

        const g = this.targetFishBody;
        g.clear();

        // Tier palettes:
        // 0 (<2x): Tropical Snapper (Cyan/Emerald)
        // 1 (2x-5x): Silver Barracuda (Sky Blue/Silver)
        // 2 (5x-10x): Giant Bluefin Tuna (Cobalt/Gold)
        // 3 (10x+): Sultan Golden Marlin (24K Gold/Crimson)
        const palettes = [
            { body: 0x06b6d4, fin: 0x34d399, belly: 0xe0f2fe, scale: 0.9 },
            { body: 0x0284c7, fin: 0x38bdf8, belly: 0xf8fafc, scale: 1.05 },
            { body: 0x2563eb, fin: 0xfbbf24, belly: 0xfef08a, scale: 1.2 },
            { body: 0xf59e0b, fin: 0xef4444, belly: 0xfef9c3, scale: 1.38 }
        ];
        const pal = palettes[Math.min(palettes.length - 1, tier)];

        // Torpedo Marlin / Fish Silhouette
        g.beginFill(pal.body);
        g.drawPolygon([
            28, 0,
            16, -3,
            8, -9,
            -14, -7,
            -22, -3,
            -30, -13,
            -25, 0,
            -30, 13,
            -22, 3,
            -10, 8,
            12, 5,
            18, 2
        ]);
        g.endFill();

        // Dorsal Sailfin
        g.beginFill(pal.fin, 0.95);
        g.drawPolygon([
            8, -9,
            2, -17,
            -8, -15,
            -13, -7
        ]);
        g.endFill();

        // Shimmering Belly
        g.beginFill(pal.belly, 0.9);
        g.drawPolygon([
            14, 1,
            -10, 2,
            -8, 7,
            10, 4
        ]);
        g.endFill();

        // Eye
        g.beginFill(0xfbbf24);
        g.drawCircle(12, -2, 2.8);
        g.beginFill(0x020617);
        g.drawCircle(12.5, -2, 1.4);
        g.endFill();

        this.targetFishBody.scale.set(pal.scale);
    }

    /**
     * Draws the iconic Crash Exponential Curve + Shaded Area + Fishing Line
     */
    _drawCrashCurve(isCrashed = false) {
        if (!this.curveContainer || !this.boatLineContainer) return;

        this.curveContainer.clear();
        this.boatLineContainer.clear();

        const ox = this.graphOrigin.x;
        const oy = this.graphOrigin.y;
        const tx = this.tipPos.x;
        const ty = this.tipPos.y;

        if (tx <= ox + 2 && ty >= oy - 2) return;

        // Color theme based on multiplier or crashed state
        let mainColor = 0x10b981; // Emerald Green (1x - 2x)
        let glowColor = 0x34d399;
        if (isCrashed) {
            mainColor = 0xef4444; // Crimson Crash Red
            glowColor = 0xf87171;
        } else if (this.currentMultiplier >= 10.0) {
            mainColor = 0xf59e0b; // Sultan Gold (10x+)
            glowColor = 0xfbbf24;
        } else if (this.currentMultiplier >= 2.0) {
            mainColor = 0x06b6d4; // Electric Cyan (2x - 10x)
            glowColor = 0x38bdf8;
        }

        // Control point for smooth exponential-looking quadratic curve
        const cpX = ox + (tx - ox) * 0.58;
        const cpY = oy - (oy - ty) * 0.18;

        // 1. Shaded Fill Under the Curve (Classic Crash Graph Fill)
        const steps = 28;
        const polyPoints = [ox, oy];
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const invT = 1 - t;
            const px = invT * invT * ox + 2 * invT * t * cpX + t * t * tx;
            const py = invT * invT * oy + 2 * invT * t * cpY + t * t * ty;
            polyPoints.push(px, py);
        }
        polyPoints.push(tx, oy);

        this.curveContainer.beginFill(mainColor, isCrashed ? 0.16 : 0.22);
        this.curveContainer.drawPolygon(polyPoints);
        this.curveContainer.endFill();

        // 2. Outer Glowing Curve Line
        this.curveContainer.lineStyle(8, glowColor, 0.28);
        this.curveContainer.moveTo(ox, oy);
        this.curveContainer.quadraticCurveTo(cpX, cpY, tx, ty);

        // 3. Crisp Core Crash Curve Line
        this.curveContainer.lineStyle(3.5, mainColor, 1.0);
        this.curveContainer.moveTo(ox, oy);
        this.curveContainer.quadraticCurveTo(cpX, cpY, tx, ty);

        // 4. Taut Fishing Line from Top Boat Rod to Curve Tip (only while hooked)
        if (!isCrashed) {
            this.boatLineContainer.lineStyle(1.5, 0xfbbf24, 0.65);
            this.boatLineContainer.moveTo(this.boatPos.x, this.boatPos.y);
            this.boatLineContainer.lineTo(tx + 12, ty - 2);
        }
    }

    _setupTicker() {
        this.app.ticker.add((delta) => {
            this.time += delta * 0.016;
            const w = this.app.screen.width;
            const h = this.app.screen.height;

            // 1. Swim Ambient Background Fishes
            this.ambientFishes.forEach(f => {
                f.gfx.x += f.speed * f.dir * delta;
                f.swimPhase += 0.04 * delta;
                f.gfx.y = f.baseY + Math.sin(f.swimPhase) * 3.5;

                if (f.dir === 1 && f.gfx.x > w + 50) f.gfx.x = -50;
                if (f.dir === -1 && f.gfx.x < -50) f.gfx.x = w + 50;
            });

            // 2. Active Crash Curve Tip Animation
            if (this.state === 'hooked' && this.targetFish) {
                this.targetFish.visible = true;
                if (this.tipRing) {
                    const pulse = 1.0 + Math.sin(this.time * 10) * 0.15;
                    this.tipRing.scale.set(pulse);
                }
                if (Math.random() < 0.45) {
                    this._spawnBubble(this.tipPos.x - 16, this.tipPos.y);
                }
            } else if (this.state === 'countdown' || this.state === 'idle') {
                // Waiting at origin (bottom-left of graph)
                if (this.targetFish) {
                    this.targetFish.visible = true;
                    this.targetFish.x = this.graphOrigin.x + 18;
                    this.targetFish.y = this.graphOrigin.y - 12 + Math.sin(this.time * 4) * 3;
                    this.targetFish.rotation = -0.15;
                }
            }

            // 3. Update Bubbles
            this._updateBubbles(delta);
        });
    }

    _spawnBubble(x, y) {
        const PIXI = this._getPIXI();
        if (!PIXI || this.bubbles.length > 50) return;

        const bGfx = new PIXI.Graphics();
        const size = 1.5 + Math.random() * 2.5;
        bGfx.beginFill(0x38bdf8, 0.55);
        bGfx.drawCircle(0, 0, size);
        bGfx.endFill();

        bGfx.x = x + (Math.random() - 0.5) * 8;
        bGfx.y = y + (Math.random() - 0.5) * 8;
        this.bubblesContainer.addChild(bGfx);

        this.bubbles.push({
            gfx: bGfx,
            vx: -1.2 - Math.random() * 1.8,
            vy: -1.0 - Math.random() * 2.0,
            alpha: 0.85,
            decay: 0.025 + Math.random() * 0.02
        });
    }

    _updateBubbles(delta) {
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const b = this.bubbles[i];
            b.gfx.x += b.vx * delta;
            b.gfx.y += b.vy * delta;
            b.alpha -= b.decay * delta;
            b.gfx.alpha = Math.max(0, b.alpha);

            if (b.alpha <= 0) {
                this.bubblesContainer.removeChild(b.gfx);
                b.gfx.destroy();
                this.bubbles.splice(i, 1);
            }
        }
    }

    /**
     * Reset stage for countdown / ready state
     */
    setReady() {
        this.setCountdown();
    }

    setCountdown() {
        this.state = 'countdown';
        this.currentMultiplier = 1.0;
        this.flightProgress = 0;
        this.elapsedSec = 0;

        if (this.curveContainer) this.curveContainer.clear();
        if (this.boatLineContainer) this.boatLineContainer.clear();
        if (this.pinsContainer) this.pinsContainer.removeChildren();
        this.cashoutPins = [];

        this._updateFishAppearanceByTier(0);
        this.tipPos = { x: this.graphOrigin.x, y: this.graphOrigin.y };
        this._drawCoordinateGrid();
    }

    /**
     * Start the Crash curve ascent
     */
    startReel() {
        this.state = 'hooked';
        this.currentMultiplier = 1.0;
        this.flightProgress = 0;
        this.elapsedSec = 0;

        if (this.curveContainer) this.curveContainer.clear();
        if (this.pinsContainer) this.pinsContainer.removeChildren();
        this.cashoutPins = [];

        this._updateFishAppearanceByTier(0);
        this.tipPos = { x: this.graphOrigin.x, y: this.graphOrigin.y };
        if (this.targetFish) {
            this.targetFish.visible = true;
            this.targetFish.x = this.tipPos.x;
            this.targetFish.y = this.tipPos.y;
        }
    }

    /**
     * Updates Crash Curve & Hooked Fish position in real time
     * @param {number} multiplier Current crash multiplier (1.00x - 10000x)
     * @param {number} progress Normalized time progress (0.0 to 1.0)
     * @param {number} elapsedSec Elapsed flight seconds
     */
    updateReel(multiplier, progress, elapsedSec = 0) {
        if (this.state !== 'hooked' || !this.app) return;

        this.currentMultiplier = multiplier;
        this.flightProgress = Math.min(1.0, Math.max(0, progress));
        this.elapsedSec = elapsedSec || (progress * 18);

        const w = this.app.screen.width;
        const h = this.app.screen.height;
        const ox = this.graphOrigin.x;
        const oy = this.graphOrigin.y;
        const maxW = (w - 48) - ox;
        const maxH = oy - 54;

        // Horizontal progress eases toward right edge
        const xRatio = Math.min(0.95, Math.pow(this.flightProgress, 0.78));
        // Vertical progress scales smoothly with log of multiplier
        const yRatio = Math.min(0.92, Math.log10(Math.max(1.0, multiplier)) / 2.2 + this.flightProgress * 0.35);

        this.tipPos.x = ox + maxW * xRatio;
        this.tipPos.y = oy - maxH * Math.min(0.92, yRatio);

        // Update fish tier evolution
        const tier = multiplier >= 10 ? 3 : (multiplier >= 5 ? 2 : (multiplier >= 2 ? 1 : 0));
        this._updateFishAppearanceByTier(tier);

        if (this.targetFish) {
            this.targetFish.x = this.tipPos.x;
            this.targetFish.y = this.tipPos.y;
            // Angle fish along upward curve slope
            this.targetFish.rotation = -0.25 - Math.min(0.45, yRatio * 0.4);
        }

        this._drawCoordinateGrid();
        this._drawCrashCurve(false);
    }

    /**
     * Drops a Cashout Marker Pin onto the Crash Curve when a panel cashes out
     */
    triggerCatch(finalMultiplier, label = '') {
        const PIXI = this._getPIXI();
        if (!PIXI || !this.app) return;

        const cx = this.tipPos.x;
        const cy = this.tipPos.y;

        // Pin Marker on the Curve (Authentic Crash Game feature)
        const pin = new PIXI.Container();
        pin.x = cx;
        pin.y = cy;

        const dot = new PIXI.Graphics();
        dot.lineStyle(2, 0xffffff, 1);
        dot.beginFill(0x10b981, 1);
        dot.drawCircle(0, 0, 6);
        dot.endFill();

        const badge = new PIXI.Graphics();
        badge.beginFill(0x064e3b, 0.92);
        badge.lineStyle(1.5, 0x34d399, 1);
        badge.drawRoundedRect(-30, -28, 60, 18, 5);
        badge.endFill();

        const txt = new PIXI.Text(`${finalMultiplier.toFixed(2)}×`, {
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            fontWeight: '800',
            fill: '#ecfdf5'
        });
        txt.anchor.set(0.5);
        txt.y = -19;

        pin.addChild(dot);
        pin.addChild(badge);
        pin.addChild(txt);
        this.pinsContainer.addChild(pin);

        // Golden Splash Burst
        for (let i = 0; i < 16; i++) {
            const p = new PIXI.Graphics();
            p.beginFill(0xfbbf24, 0.95);
            p.drawCircle(0, 0, 2 + Math.random() * 2.5);
            p.endFill();
            p.x = cx;
            p.y = cy;
            this.bubblesContainer.addChild(p);

            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            this.bubbles.push({
                gfx: p,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1.0,
                decay: 0.035
            });
        }
    }

    /**
     * Trigger Crash (Line Snap / Curve turns Crimson Red)
     */
    triggerEscape(finalMultiplier) {
        this.state = 'snapped';
        this._drawCrashCurve(true);

        const PIXI = this._getPIXI();
        if (!PIXI || !this.app) return;

        const cx = this.tipPos.x;
        const cy = this.tipPos.y;

        // Red Crash Ring Shockwave at tip
        const ripple = new PIXI.Graphics();
        ripple.lineStyle(3.5, 0xef4444, 1.0);
        ripple.drawCircle(0, 0, 12);
        ripple.x = cx;
        ripple.y = cy;
        this.fxContainer.addChild(ripple);

        if (window.gsap) {
            if (this.targetFish) {
                window.gsap.to(this.targetFish, {
                    x: cx + 140,
                    y: cy + 80,
                    rotation: 0.6,
                    duration: 0.4,
                    ease: 'power2.in',
                    onComplete: () => {
                        if (this.targetFish) this.targetFish.visible = false;
                    }
                });
            }

            window.gsap.to(ripple.scale, { x: 4.5, y: 4.5, duration: 0.5, ease: 'power2.out' });
            window.gsap.to(ripple, {
                alpha: 0,
                duration: 0.5,
                onComplete: () => {
                    this.fxContainer.removeChild(ripple);
                    ripple.destroy();
                }
            });
        }
    }

    _handleResize() {
        if (!this.app || !this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const w = Math.max(320, rect.width || this.options.width);
        const h = Math.max(260, rect.height || this.options.height);

        this.app.renderer.resize(w, h);
        this._drawOceanBackground();
        this._createAmbientFish();
        this._drawCoordinateGrid();
        if (this.state === 'hooked') {
            this._drawCrashCurve(false);
        } else if (this.state === 'snapped') {
            this._drawCrashCurve(true);
        }
    }

    destroy() {
        window.removeEventListener('resize', this._resizeHandler);
        this.bubbles.forEach(b => {
            if (b.gfx && b.gfx.parent) b.gfx.parent.removeChild(b.gfx);
            b.gfx.destroy();
        });
        this.bubbles = [];

        if (this.app) {
            this.app.destroy(true, { children: true, texture: false, baseTexture: false });
            this.app = null;
        }
    }
}

export default PixiFishingStage;
