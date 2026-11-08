/**
 * PixiVendingStage.js - WebGL Hardware-Accelerated Vending Machine Plinko Stage
 * Powered by PixiJS v7 & GSAP 3
 * Theme: "Pop Drink!" Vending Machine Refrigerator
 * Features:
 * - Vending machine interior with neon LED tubes, beverage shelves, and front glass glare
 * - Realistic bouncing drink cans (Cola, Lime, Grape, Blue Energy, Orange Fizz & Golden Sultan Can)
 * - Chrome spiral pegs that ping with metallic clinks and emit fizzy soda carbonation bubbles
 * - Vending delivery retrieval trays with digital LED multiplier readouts
 * - Dynamic row switching (8 to 16 rows) with automatic layout recalculation
 * - Multi-can drop capability (Party Pack / Vending Rush 5x, 10x, Auto-vend)
 */

import AuraSound from '../ui/AuraSound.js';

// Drink Can Flavor Palettes
const CAN_FLAVORS = [
    { name: 'Cola Burst',  color: 0xdc2626, accent: 0xffffff, tag: 'COLA' },
    { name: 'Lime Spritz', color: 0x059669, accent: 0xa7f3d0, tag: 'LIME' },
    { name: 'Grape Fizz',  color: 0x7c3aed, accent: 0xc4b5fd, tag: 'GRAPE' },
    { name: 'Blue Spark',  color: 0x0284c7, accent: 0x38bdf8, tag: 'ENERGY' },
    { name: 'Orange Pop',  color: 0xea580c, accent: 0xfed7aa, tag: 'ORANGE' }
];

export class PixiVendingStage {
    constructor(canvasElement, options = {}) {
        this.canvas = canvasElement;
        this.options = Object.assign({
            rows: 12,
            risk: 'medium', // 'low' | 'medium' | 'high'
            width: 760,
            height: 580,
            onCanLand: null
        }, options);

        this.app = null;
        this.isPixiReady = false;

        // Container layers
        this.bgContainer = null;
        this.shelvesContainer = null;
        this.boardContainer = null;
        this.pegsContainer = null;
        this.basketsContainer = null;
        this.ballsContainer = null;
        this.particlesContainer = null;
        this.overlayContainer = null;

        // Grid & Entities
        this.rows = this.options.rows;
        this.risk = this.options.risk;
        this.pegs = [];
        this.baskets = [];
        this.balls = [];
        this.particles = [];
        this.popups = [];
        this.ambientCans = [];

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
            this._drawVendingBackground();
            this.rebuildBoard(this.rows, this.options.multipliers || []);
            this._setupTicker();

            if (typeof window !== 'undefined') {
                window.addEventListener('resize', this._resizeHandler);
            }

            this.isPixiReady = true;
        } catch (err) {
            console.error('[PixiVendingStage] Init error:', err);
        }
    }

    _setupLayers() {
        const PIXI = this._getPIXI();
        this.bgContainer = new PIXI.Container();
        this.shelvesContainer = new PIXI.Container();
        this.boardContainer = new PIXI.Container();
        this.pegsContainer = new PIXI.Container();
        this.basketsContainer = new PIXI.Container();
        this.ballsContainer = new PIXI.Container();
        this.particlesContainer = new PIXI.Container();
        this.overlayContainer = new PIXI.Container();

        this.app.stage.addChild(this.bgContainer);
        this.app.stage.addChild(this.shelvesContainer);
        this.app.stage.addChild(this.boardContainer);
        this.app.stage.addChild(this.pegsContainer);
        this.app.stage.addChild(this.basketsContainer);
        this.app.stage.addChild(this.ballsContainer);
        this.app.stage.addChild(this.particlesContainer);
        this.app.stage.addChild(this.overlayContainer);
    }

    _drawVendingBackground() {
        const PIXI = this._getPIXI();
        const w = this.app.screen.width;
        const h = this.app.screen.height;

        this.bgContainer.removeChildren();
        this.shelvesContainer.removeChildren();

        const bg = new PIXI.Graphics();

        // 1. Vending Cabinet Interior (Cool dark midnight blue with brushed metal borders)
        bg.beginFill(0x0a0e17);
        bg.drawRect(0, 0, w, h);

        // Side refrigerator wall depth gradients
        bg.beginFill(0x111827);
        bg.drawPolygon([0, 0, w * 0.06, h * 0.08, w * 0.06, h * 0.92, 0, h]);
        bg.drawPolygon([w, 0, w * 0.94, h * 0.08, w * 0.94, h * 0.92, w, h]);

        // Metallic back panel ribs
        bg.lineStyle(1, 0x1e293b, 0.4);
        for (let y = h * 0.12; y < h * 0.85; y += 40) {
            bg.moveTo(w * 0.06, y);
            bg.lineTo(w * 0.94, y);
        }

        // Side Neon LED Tubes (Electric Cyan & Neon Magenta)
        bg.lineStyle(4, 0x06b6d4, 0.8);
        bg.moveTo(w * 0.05, h * 0.06);
        bg.lineTo(w * 0.05, h * 0.88);

        bg.lineStyle(4, 0xec4899, 0.8);
        bg.moveTo(w * 0.95, h * 0.06);
        bg.lineTo(w * 0.95, h * 0.88);
        bg.endFill();

        this.bgContainer.addChild(bg);

        // 2. Background Beverage Racks (Stocked Drink Cans inside the fridge)
        this._drawVendingShelves(w, h);

        // 3. Top Dispenser Chute / Coil Frame
        this._drawDispenserCoil(w, h);
    }

    _drawVendingShelves(w, h) {
        const PIXI = this._getPIXI();
        const shelvesGfx = new PIXI.Graphics();
        const shelfLevels = [h * 0.22, h * 0.44, h * 0.66];

        shelfLevels.forEach((sy) => {
            // Chrome wire shelf bar
            shelvesGfx.lineStyle(3, 0x334155, 0.7);
            shelvesGfx.moveTo(w * 0.08, sy);
            shelvesGfx.lineTo(w * 0.92, sy);

            // Cold LED light under the shelf
            shelvesGfx.lineStyle(1.5, 0x38bdf8, 0.35);
            shelvesGfx.moveTo(w * 0.09, sy + 3);
            shelvesGfx.lineTo(w * 0.91, sy + 3);

            // Miniature background beverage cans sitting on the shelf
            const canCount = 7;
            const step = (w * 0.80) / canCount;
            for (let c = 0; c < canCount; c++) {
                const cx = w * 0.12 + c * step;
                const flavor = CAN_FLAVORS[c % CAN_FLAVORS.length];

                // Can body
                shelvesGfx.beginFill(flavor.color, 0.28);
                shelvesGfx.lineStyle(1, 0x0f172a, 0.4);
                shelvesGfx.drawRoundedRect(cx - 9, sy - 28, 18, 28, 4);
                shelvesGfx.endFill();

                // Silver lid
                shelvesGfx.beginFill(0x94a3b8, 0.35);
                shelvesGfx.drawEllipse(cx, sy - 28, 7, 2.5);
                shelvesGfx.endFill();

                // Brand stripe
                shelvesGfx.lineStyle(1, flavor.accent, 0.3);
                shelvesGfx.moveTo(cx - 7, sy - 14);
                shelvesGfx.lineTo(cx + 7, sy - 14);
            }
        });

        this.shelvesContainer.addChild(shelvesGfx);
    }

    _drawDispenserCoil(w, h) {
        const PIXI = this._getPIXI();
        const coilGfx = new PIXI.Graphics();

        // Top Vending Mechanism Chute
        coilGfx.beginFill(0x0f172a, 0.95);
        coilGfx.lineStyle(2, 0x06b6d4, 0.7);
        coilGfx.drawRoundedRect(w * 0.5 - 46, h * 0.015, 92, 36, 8);
        coilGfx.endFill();

        // Vending Coil Spirals (Chrome wire)
        coilGfx.lineStyle(2.5, 0xe2e8f0, 0.9);
        const coilCenterX = w * 0.5;
        const coilY = h * 0.038;
        for (let i = -3; i <= 3; i++) {
            coilGfx.drawEllipse(coilCenterX + i * 8, coilY, 4, 9);
        }

        // Ready LED Indicator (Green pulse)
        coilGfx.beginFill(0x10b981, 0.95);
        coilGfx.lineStyle(1, 0x34d399, 1);
        coilGfx.drawCircle(w * 0.5 - 34, coilY, 3.5);
        coilGfx.endFill();

        // Dispense Arrow pointing DOWN
        coilGfx.beginFill(0x38bdf8, 0.85);
        coilGfx.drawPolygon([
            w * 0.5 - 6, h * 0.055,
            w * 0.5 + 6, h * 0.055,
            w * 0.5,     h * 0.072
        ]);
        coilGfx.endFill();

        this.bgContainer.addChild(coilGfx);
    }

    /**
     * Rebuilds the peg triangle grid and bottom vending multiplier bins
     */
    rebuildBoard(rowCount, multipliers = []) {
        this.rows = Math.max(8, Math.min(16, rowCount || 12));
        this.multipliers = multipliers;

        const PIXI = this._getPIXI();
        if (!PIXI || !this.app) return;

        this.pegsContainer.removeChildren();
        this.basketsContainer.removeChildren();
        this.pegs = [];
        this.baskets = [];

        const w = this.app.screen.width;
        const h = this.app.screen.height;

        // Triangular Peg Layout
        const topMargin = h * 0.11;
        const bottomMargin = h * 0.84;
        const boardHeight = bottomMargin - topMargin;
        const rowSpacing = boardHeight / this.rows;

        // Peg size scales with row density
        const pegRadius = Math.max(2.6, Math.min(5.5, (w < 420 ? 44 : 60) / this.rows));

        for (let r = 0; r < this.rows; r++) {
            const pegsInRow = r + 3; // Row 0 has 3 pegs, row 1 has 4, etc.
            const rowY = topMargin + r * rowSpacing;

            // Horizontal span expands as we go down
            const maxSpan = w * (0.28 + (r / this.rows) * 0.60);
            const colSpacing = maxSpan / (pegsInRow - 1);
            const startX = (w - maxSpan) * 0.5;

            for (let c = 0; c < pegsInRow; c++) {
                const px = startX + c * colSpacing;
                const py = rowY;

                const pegEntity = new PIXI.Container();
                pegEntity.x = px;
                pegEntity.y = py;

                // Chrome Vending Peg Pin
                const pegGfx = new PIXI.Graphics();

                // Outer neon aura
                pegGfx.beginFill(0x06b6d4, 0.22);
                pegGfx.drawCircle(0, 0, pegRadius * 1.8);

                // Polished metallic chrome body
                pegGfx.beginFill(0xe2e8f0);
                pegGfx.lineStyle(1.2, 0x38bdf8, 0.85);
                pegGfx.drawCircle(0, 0, pegRadius);

                // Chrome specular highlight
                pegGfx.beginFill(0xffffff, 0.95);
                pegGfx.drawCircle(-pegRadius * 0.3, -pegRadius * 0.3, pegRadius * 0.35);
                pegGfx.endFill();

                pegEntity.addChild(pegGfx);
                this.pegsContainer.addChild(pegEntity);

                this.pegs.push({
                    x: px,
                    y: py,
                    radius: pegRadius,
                    container: pegEntity,
                    gfx: pegGfx,
                    baseScale: 1.0,
                    activeBounce: 0
                });
            }
        }

        // Bottom Vending Retrieval Trays
        const basketCount = this.rows + 1;
        const basketY = h * 0.91;
        const basketHeight = Math.max(22, Math.min(42, h * 0.082));

        const lastRowIndex = this.rows - 1;
        const lastPegsInRow = lastRowIndex + 3; // rows + 2 pegs
        const lastRowSpan = w * (0.28 + (lastRowIndex / this.rows) * 0.60);
        const lastColSpacing = lastRowSpan / (lastPegsInRow - 1);
        const lastRowStartX = (w - lastRowSpan) * 0.5;

        this.lastRowStartX = lastRowStartX;
        this.lastColSpacing = lastColSpacing;
        this.lastRowSpan = lastRowSpan;

        const basketWidth = Math.max(12, lastColSpacing - 3);

        for (let b = 0; b < basketCount; b++) {
            const bx = lastRowStartX + (b + 0.5) * lastColSpacing;
            const by = basketY;
            const multVal = multipliers[b] || 1.0;

            const basketEntity = new PIXI.Container();
            basketEntity.x = bx;
            basketEntity.y = by;

            // Color scheme based on multiplier tier
            let fillColor = 0x0f172a;
            let strokeColor = 0x38bdf8;
            let textColor = '#38bdf8';

            if (multVal >= 100) {
                fillColor = 0x831843; // Sultan pink/magenta
                strokeColor = 0xf43f5e;
                textColor = '#fda4af';
            } else if (multVal >= 20) {
                fillColor = 0x713f12; // Gold/orange
                strokeColor = 0xf59e0b;
                textColor = '#fde047';
            } else if (multVal >= 2.0) {
                fillColor = 0x064e3b; // Emerald green
                strokeColor = 0x10b981;
                textColor = '#6ee7b7';
            } else {
                fillColor = 0x1e293b; // Cold slate
                strokeColor = 0x475569;
                textColor = '#94a3b8';
            }

            const bgGfx = new PIXI.Graphics();
            // Modern vending machine retrieval flap
            bgGfx.beginFill(fillColor, 0.9);
            bgGfx.lineStyle(1.8, strokeColor, 0.95);
            bgGfx.drawRoundedRect(-basketWidth / 2, -basketHeight / 2, basketWidth, basketHeight, 6);
            bgGfx.endFill();

            // Inner tray flap line (gives 3D depth of push door)
            bgGfx.lineStyle(1.2, 0xffffff, 0.25);
            bgGfx.moveTo(-basketWidth * 0.42, -basketHeight * 0.15);
            bgGfx.lineTo(basketWidth * 0.42, -basketHeight * 0.15);

            // Multiplier LED Text Label
            const fontSize = Math.max(7, Math.min(13, basketWidth * 0.38));
            const labelText = multVal >= 100 ? `${Math.round(multVal)}×` : `${multVal.toFixed(multVal < 10 && multVal % 1 !== 0 ? 1 : 0)}×`;
            const textNode = new PIXI.Text(labelText, {
                fontFamily: 'Rajdhani, sans-serif',
                fontSize,
                fontWeight: '900',
                fill: textColor,
                align: 'center'
            });
            textNode.anchor.set(0.5);
            textNode.y = 2;

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
                fillColor,
                strokeColor
            });
        }
    }

    _setupTicker() {
        this.app.ticker.add((delta) => {
            const dt = Math.min(0.033, delta * 0.016);
            this._updatePhysics(dt);
            this._updateParticles(delta);
            this._updatePopups(delta);
        });
    }

    /**
     * Spawns a new bouncing Drink Can from the top vending dispenser
     */
    dropCan({ bet = 100000, isGolden = false, onLand = null } = {}) {
        const PIXI = this._getPIXI();
        if (!PIXI || !this.app) return;

        const w = this.app.screen.width;
        const h = this.app.screen.height;

        // Slight randomized jitter at launch nozzle (-4 to +4 px)
        const jitter = (Math.random() - 0.5) * 8;
        const startX = w * 0.5 + jitter;
        const startY = h * 0.06;

        const canRadius = Math.max(4.5, Math.min(11, (w < 420 ? 68 : 100) / this.rows));

        const canContainer = new PIXI.Container();
        canContainer.x = startX;
        canContainer.y = startY;

        const canGfx = new PIXI.Graphics();
        const flavor = isGolden
            ? { name: 'Sultan Gold 24K', color: 0xf59e0b, accent: 0xfef08a, tag: 'GOLD' }
            : CAN_FLAVORS[Math.floor(Math.random() * CAN_FLAVORS.length)];

        if (isGolden) {
            // ⭐ Sultan Golden Energy Drink Can (24K Gold)
            canGfx.beginFill(0xfbbf24); // Shimmering Gold body
            canGfx.lineStyle(1.2, 0xd97706, 1);
            canGfx.drawRoundedRect(-canRadius * 0.85, -canRadius * 1.15, canRadius * 1.7, canRadius * 2.3, 4);

            // Silver Top Rim / Lid
            canGfx.beginFill(0xffffff, 0.95);
            canGfx.drawEllipse(0, -canRadius * 1.15, canRadius * 0.8, canRadius * 0.35);

            // Gold Pull Tab
            canGfx.beginFill(0xb45309);
            canGfx.drawCircle(0, -canRadius * 1.15, canRadius * 0.2);

            // Sultan 2x Crown Emblem on body
            canGfx.beginFill(0x78350f);
            canGfx.drawPolygon([
                -canRadius * 0.45, -canRadius * 0.2,
                -canRadius * 0.45,  canRadius * 0.3,
                 canRadius * 0.45,  canRadius * 0.3,
                 canRadius * 0.45, -canRadius * 0.2,
                 canRadius * 0.2,   0,
                 0,                -canRadius * 0.3,
                -canRadius * 0.2,   0
            ]);
            canGfx.endFill();
        } else {
            // Standard Beverage Can (Soda / Sparkling Juice)
            canGfx.beginFill(flavor.color);
            canGfx.lineStyle(1.2, 0x0f172a, 0.6);
            canGfx.drawRoundedRect(-canRadius * 0.85, -canRadius * 1.15, canRadius * 1.7, canRadius * 2.3, 4);

            // Silver Top Lid
            canGfx.beginFill(0xe2e8f0);
            canGfx.drawEllipse(0, -canRadius * 1.15, canRadius * 0.8, canRadius * 0.32);

            // Silver Pull Tab
            canGfx.beginFill(0x94a3b8);
            canGfx.drawCircle(0, -canRadius * 1.15, canRadius * 0.18);

            // White Brand Wave Ribbon on can
            canGfx.lineStyle(2, flavor.accent, 0.85);
            canGfx.moveTo(-canRadius * 0.75, 0);
            canGfx.bezierCurveTo(-canRadius * 0.2, -canRadius * 0.4, canRadius * 0.2, canRadius * 0.4, canRadius * 0.75, 0);
            canGfx.endFill();
        }

        canContainer.addChild(canGfx);
        this.ballsContainer.addChild(canContainer);

        const canData = {
            id: 'can_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            container: canContainer,
            gfx: canGfx,
            x: startX,
            y: startY,
            vx: (Math.random() - 0.5) * 45, // Initial slight sideways drift
            vy: 25 + Math.random() * 25,
            radius: canRadius,
            angularVelocity: (Math.random() - 0.5) * 8,
            rotation: 0,
            bet,
            isGolden,
            flavor,
            onLand,
            active: true
        };

        this.balls.push(canData);
        if (typeof AuraSound.playVendingDispense === 'function') {
            AuraSound.playVendingDispense();
        } else {
            AuraSound.playTap?.();
        }
        return canData;
    }

    _updatePhysics(dt) {
        const gravity = 640; // Heavy beverage can gravity (px/s^2)
        const restitution = 0.50; // Elastic metallic bounce
        const w = this.app ? this.app.screen.width : 760;
        const h = this.app ? this.app.screen.height : 580;
        const bottomThreshold = this.baskets.length > 0 ? this.baskets[0].y : 500;

        for (let i = this.balls.length - 1; i >= 0; i--) {
            const can = this.balls[i];
            if (!can.active) continue;

            can.age = (can.age || 0) + dt;

            // 1. Gravity & Velocity integration
            can.vy += gravity * dt;
            can.x += can.vx * dt;
            can.y += can.vy * dt;

            // Rotate can naturally as it tumbles
            can.rotation += can.angularVelocity * dt;
            can.container.rotation = can.rotation;

            // Prevent cans from getting stuck on pegs
            if (can.age > 0.8 && Math.abs(can.vy) < 15 && can.y < bottomThreshold - 30) {
                can.vy += 60;
                can.vx += (Math.random() - 0.5) * 50;
            }

            // Velocity damping
            can.vx = Math.max(-420, Math.min(420, can.vx));
            can.vy = Math.max(-180, Math.min(650, can.vy));

            // 2. Lateral wall bounce (Keep inside vending machine walls framing outer trays)
            const wallLeft = (this.lastRowStartX !== undefined && this.lastColSpacing !== undefined)
                ? Math.max(w * 0.02, this.lastRowStartX - this.lastColSpacing * 0.6)
                : w * 0.05;
            const wallRight = (this.lastRowStartX !== undefined && this.lastRowSpan !== undefined && this.lastColSpacing !== undefined)
                ? Math.min(w * 0.98, this.lastRowStartX + this.lastRowSpan + this.lastColSpacing * 0.6)
                : w * 0.95;

            if (can.x - can.radius < wallLeft) {
                can.x = wallLeft + can.radius;
                can.vx = Math.abs(can.vx) * 0.6;
            } else if (can.x + can.radius > wallRight) {
                can.x = wallRight - can.radius;
                can.vx = -Math.abs(can.vx) * 0.6;
            }

            // 3. Peg Collision Check
            for (let p = 0; p < this.pegs.length; p++) {
                const peg = this.pegs[p];
                const dx = can.x - peg.x;
                const dy = can.y - peg.y;
                const minDist = can.radius + peg.radius;
                const distSq = dx * dx + dy * dy;

                if (distSq < minDist * minDist) {
                    const dist = Math.sqrt(distSq) || 0.001;
                    const nx = dx / dist;
                    const ny = dy / dist;

                    // Push can outside peg to resolve penetration
                    can.x = peg.x + nx * (minDist + 0.5);
                    can.y = peg.y + ny * (minDist + 0.5);

                    const normalVel = can.vx * nx + can.vy * ny;

                    if (normalVel < 0) {
                        const impulse = -(1 + restitution) * normalVel;
                        const tangentialJitter = (Math.random() - 0.5) * 35;

                        can.vx += nx * impulse + (-ny) * tangentialJitter;
                        can.vy += ny * impulse + (nx) * tangentialJitter;

                        // Tumbling torque
                        can.angularVelocity = (Math.random() - 0.5) * 14;

                        // Visual & Audio Peg Trigger
                        this._triggerPegBounce(peg, can);
                    }
                }
            }

            // 4. Update container position
            can.container.x = can.x;
            can.container.y = can.y;

            // 5. Land in Multiplier Basket Check or Failsafe timeout
            if (can.y >= bottomThreshold - 10 || can.age >= 7.0 || can.y > h + 20) {
                this._handleBasketLanding(can, i);
            }
        }
    }

    _triggerPegBounce(peg, can) {
        // Metallic ping sound with random pitch
        const pitchOffset = 0.85 + (peg.y / (this.app ? this.app.screen.height : 580)) * 0.45;
        AuraSound.playCanClink?.(pitchOffset);

        // Flash peg with bright electric cyan
        if (window.gsap) {
            window.gsap.killTweensOf(peg.container.scale);
            peg.container.scale.set(1.45);
            window.gsap.to(peg.container.scale, {
                x: 1.0,
                y: 1.0,
                duration: 0.18,
                ease: 'back.out(2)'
            });
        }

        // Spawn fizzy soda carbonation bubbles
        this._spawnSodaBubbles(peg.x, peg.y, can.flavor ? can.flavor.color : 0x06b6d4, can.isGolden);
    }

    _spawnSodaBubbles(x, y, tintColor, isGolden) {
        const PIXI = this._getPIXI();
        if (!PIXI) return;

        const count = isGolden ? 8 : 4;
        for (let i = 0; i < count; i++) {
            const p = new PIXI.Graphics();
            const bubbleRadius = 1.2 + Math.random() * 2.4;

            if (isGolden) {
                p.beginFill(0xfbbf24, 0.9);
            } else {
                p.beginFill(Math.random() > 0.4 ? 0xffffff : tintColor, 0.85);
            }
            p.drawCircle(0, 0, bubbleRadius);
            p.endFill();

            p.x = x + (Math.random() - 0.5) * 10;
            p.y = y + (Math.random() - 0.5) * 10;

            this.particlesContainer.addChild(p);

            this.particles.push({
                gfx: p,
                vx: (Math.random() - 0.5) * 45,
                vy: -35 - Math.random() * 60, // Bubbles float upwards!
                alpha: 1.0,
                decay: 0.04 + Math.random() * 0.03
            });
        }
    }

    _handleBasketLanding(can, canIndex) {
        can.active = false;

        // Find closest basket
        let closestBasket = this.baskets[0];
        let minDist = 999999;
        for (let b = 0; b < this.baskets.length; b++) {
            const basket = this.baskets[b];
            const dist = Math.abs(can.x - basket.x);
            if (dist < minDist) {
                minDist = dist;
                closestBasket = basket;
            }
        }

        const multiplier = closestBasket ? closestBasket.multiplier : 1.0;

        // Sound effect for retrieval chute landing
        if (typeof AuraSound.playCanVendLand === 'function') {
            AuraSound.playCanVendLand(multiplier);
        } else {
            AuraSound.playWin?.();
        }
        if (multiplier >= 20) {
            AuraSound.playVendingJackpot?.();
        }

        // Animate Basket Flap
        if (closestBasket && window.gsap) {
            window.gsap.killTweensOf(closestBasket.container.scale);
            closestBasket.container.scale.set(1.18);
            window.gsap.to(closestBasket.container.scale, {
                x: 1.0,
                y: 1.0,
                duration: 0.28,
                ease: 'elastic.out(1.2, 0.4)'
            });
        }

        // Floating score indicator popup
        this._spawnScorePopup(
            closestBasket ? closestBasket.x : can.x,
            closestBasket ? closestBasket.y - 18 : can.y,
            multiplier,
            can.isGolden,
            can.flavor
        );

        // Notify engine callback
        if (can.onLand) {
            can.onLand({
                multiplier,
                basketIndex: closestBasket ? closestBasket.index : 0,
                bet: can.bet,
                isGolden: can.isGolden
            });
        } else if (this.options.onCanLand) {
            this.options.onCanLand({
                multiplier,
                basketIndex: closestBasket ? closestBasket.index : 0,
                bet: can.bet,
                isGolden: can.isGolden
            });
        }

        // Shrink and remove can from board
        if (window.gsap) {
            window.gsap.to(can.container.scale, {
                x: 0,
                y: 0,
                duration: 0.2,
                ease: 'power2.in',
                onComplete: () => {
                    this.ballsContainer.removeChild(can.container);
                    can.container.destroy({ children: true });
                }
            });
        } else {
            this.ballsContainer.removeChild(can.container);
            can.container.destroy({ children: true });
        }

        this.balls.splice(canIndex, 1);
    }

    _spawnScorePopup(x, y, mult, isGolden, flavor) {
        const PIXI = this._getPIXI();
        if (!PIXI) return;

        const effectiveMult = isGolden ? mult * 2 : mult;
        const textStr = isGolden
            ? `⭐ 2× SULTAN CAN: ${effectiveMult}×!`
            : `🥤 ${flavor ? flavor.name : 'VEND'}: ${effectiveMult}×`;

        const textColor = effectiveMult >= 50 ? '#f43f5e' : (effectiveMult >= 5 ? '#fbbf24' : '#38bdf8');

        const txt = new PIXI.Text(textStr, {
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: effectiveMult >= 50 ? 16 : 13,
            fontWeight: '900',
            fill: textColor,
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 4,
            dropShadowDistance: 2
        });
        txt.anchor.set(0.5);
        txt.x = x;
        txt.y = y;

        this.overlayContainer.addChild(txt);

        this.popups.push({
            node: txt,
            vy: -42,
            alpha: 1.0,
            life: 0.8
        });
    }

    _updateParticles(delta) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.gfx.x += p.vx * 0.016;
            p.gfx.y += p.vy * 0.016;
            p.alpha -= p.decay;
            p.gfx.alpha = Math.max(0, p.alpha);

            if (p.alpha <= 0) {
                this.particlesContainer.removeChild(p.gfx);
                p.gfx.destroy();
                this.particles.splice(i, 1);
            }
        }
    }

    _updatePopups(delta) {
        for (let i = this.popups.length - 1; i >= 0; i--) {
            const pop = this.popups[i];
            pop.node.y += pop.vy * 0.016;
            pop.life -= 0.018;
            pop.node.alpha = Math.max(0, pop.life);

            if (pop.life <= 0) {
                this.overlayContainer.removeChild(pop.node);
                pop.node.destroy();
                this.popups.splice(i, 1);
            }
        }
    }

    _handleResize() {
        if (!this.canvas || !this.app) return;
        const rect = this.canvas.getBoundingClientRect();
        const w = Math.max(260, Math.floor(rect.width || this.options.width));
        const h = Math.max(360, Math.floor(rect.height || this.options.height));

        this.app.renderer.resize(w, h);
        this._drawVendingBackground();
        this.rebuildBoard(this.rows, this.multipliers);
    }

    destroy() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('resize', this._resizeHandler);
        }
        if (this.app) {
            this.app.destroy(true, { children: true, texture: true, baseTexture: true });
            this.app = null;
        }
        this.isPixiReady = false;
    }
}

export default PixiVendingStage;
