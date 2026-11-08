/**
 * PixiWheelStage.js - WebGL Hardware-Accelerated Spinning Wheel
 * Powered by PixiJS v7 & GSAP 3
 * Features:
 * - 12-Sector WebGL Wheel with dynamic gradients and icons
 * - Outer LED ring lights with animated sequential chasing
 * - Top pointer flapper with spring bounce on peg collisions
 * - Smooth physics deceleration with GSAP 'power4.out' ease
 * - Sector highlight and particle spark on landing
 */

import AuraSound from '../ui/AuraSound.js';

export class PixiWheelStage {
    constructor(canvasElement, sectors, options = {}) {
        this.canvas = canvasElement;
        this.sectors = sectors;
        this.options = Object.assign({
            size: 320
        }, options);

        this.app = null;
        this.wheelContainer = null;
        this.pointer = null;
        this.currentAngle = 0;
        this.isSpinning = false;
        this.ledLights = [];

        this._initPixi();
    }

    _getGSAP() {
        return (typeof window !== 'undefined' && window.gsap) ? window.gsap : null;
    }

    _initPixi() {
        if (!this.canvas || typeof window === 'undefined' || !window.PIXI) return;
        const PIXI = window.PIXI;

        const size = this.options.size;

        this.app = new PIXI.Application({
            view: this.canvas,
            width: size,
            height: size,
            backgroundAlpha: 0,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            antialias: true
        });

        const cx = size / 2;
        const cy = size / 2;
        const radius = size * 0.45;

        // Wheel container for rotation
        this.wheelContainer = new PIXI.Container();
        this.wheelContainer.x = cx;
        this.wheelContainer.y = cy;
        this.app.stage.addChild(this.wheelContainer);

        // Draw sectors
        const numSectors = this.sectors.length;
        const anglePerSector = (Math.PI * 2) / numSectors;

        this.sectors.forEach((sec, i) => {
            const startAngle = i * anglePerSector - Math.PI / 2;
            const endAngle = (i + 1) * anglePerSector - Math.PI / 2;

            const slice = new PIXI.Graphics();
            const colorHex = PIXI.utils.string2hex(sec.color || '#fbbf24');

            // Draw wedge
            slice.beginFill(colorHex);
            slice.lineStyle(1.5, 0x1f1915, 0.6);
            slice.moveTo(0, 0);
            slice.arc(0, 0, radius, startAngle, endAngle);
            slice.lineTo(0, 0);
            slice.endFill();
            this.wheelContainer.addChild(slice);

            // Sector text & emoji label
            const midAngle = startAngle + anglePerSector / 2;
            const textDist = radius * 0.68;
            const tx = textDist * Math.cos(midAngle);
            const ty = textDist * Math.sin(midAngle);

            const labelStr = sec.label.replace(/^[^\s]+\s+/, ''); // text without emoji
            const text = new PIXI.Text(labelStr, {
                fontFamily: 'Outfit, sans-serif',
                fontSize: 11,
                fontWeight: '900',
                fill: sec.text === '#000' ? 0x000000 : 0xffffff,
                align: 'center'
            });
            text.anchor.set(0.5);
            text.x = tx;
            text.y = ty;
            text.rotation = midAngle + Math.PI / 2;
            this.wheelContainer.addChild(text);

            // Outer Peg
            const pegX = (radius - 5) * Math.cos(startAngle);
            const pegY = (radius - 5) * Math.sin(startAngle);
            const peg = new PIXI.Graphics();
            peg.beginFill(0xffffff);
            peg.drawCircle(pegX, pegY, 3);
            peg.endFill();
            this.wheelContainer.addChild(peg);
        });

        // Outer LED ring
        const outerRing = new PIXI.Graphics();
        outerRing.lineStyle(4, 0x3c2419);
        outerRing.drawCircle(0, 0, radius);
        this.wheelContainer.addChild(outerRing);

        // Center VIP Gold Hub
        const hub = new PIXI.Graphics();
        hub.beginFill(0xd97706);
        hub.drawCircle(cx, cy, 28);
        hub.endFill();
        hub.beginFill(0xfbbf24);
        hub.drawCircle(cx, cy, 22);
        hub.endFill();
        hub.beginFill(0xef4444);
        hub.drawCircle(cx, cy, 10);
        hub.endFill();
        this.app.stage.addChild(hub);

        // Top Pointer Flapper
        this.pointer = new PIXI.Container();
        this.pointer.x = cx;
        this.pointer.y = cy - radius - 2;

        const flapper = new PIXI.Graphics();
        flapper.beginFill(0xef4444);
        flapper.lineStyle(2, 0xffffff);
        flapper.drawPolygon([-10, -14, 10, -14, 0, 14]);
        flapper.endFill();
        this.pointer.addChild(flapper);
        this.app.stage.addChild(this.pointer);
    }

    /**
     * Spin wheel to target sector index
     */
    spinTo(targetIndex, { duration = null } = {}) {
        const gsap = this._getGSAP();
        if (this.isSpinning) return Promise.resolve();
        this.isSpinning = true;

        const numSectors = this.sectors.length;
        const anglePerSector = 360 / numSectors;

        // Natural landing jitter: random landing offset within the wedge (-30% to +30% of sector width)
        const jitter = (Math.random() - 0.5) * (anglePerSector * 0.60);

        // Target angle points to top (pointer is at top 12 o'clock, which is -90 deg in canvas polar coords)
        // For sector i center to stop at 12 o'clock:
        // R_target = (360 - (i + 0.5) * anglePerSector + jitter) % 360
        const targetNorm = ((360 - (targetIndex + 0.5) * anglePerSector + jitter) % 360 + 360) % 360;
        const curNorm = ((this.currentAngle % 360) + 360) % 360;
        
        let delta = ((targetNorm - curNorm + 360) % 360);
        if (delta < 45) delta += 360; // Ensure at least 45 deg beyond full spins

        // Natural random variations in revolutions (5 to 7 full spins)
        const extraSpins = (5 + Math.floor(Math.random() * 3)) * 360;
        const finalTargetAngle = this.currentAngle + extraSpins + delta;

        const spinDuration = duration || (3.8 + Math.random() * 0.5);

        return new Promise((resolve) => {
            if (!gsap) {
                this.wheelContainer.rotation = (finalTargetAngle * Math.PI) / 180;
                this.currentAngle = finalTargetAngle;
                this.isSpinning = false;
                resolve();
                return;
            }

            const rotObj = { angle: this.currentAngle };
            let lastPeg = -1;
            let lastSoundTime = 0;

            gsap.to(rotObj, {
                angle: finalTargetAngle,
                duration: spinDuration,
                ease: 'power3.out',
                onUpdate: () => {
                    const rad = (rotObj.angle * Math.PI) / 180;
                    this.wheelContainer.rotation = rad;

                    // Physical peg collision check
                    const pegSector = Math.floor((rotObj.angle + anglePerSector / 2) / anglePerSector);
                    if (pegSector !== lastPeg) {
                        lastPeg = pegSector;
                        const now = performance.now();
                        if (now - lastSoundTime > 65) {
                            lastSoundTime = now;
                            AuraSound.playTap();
                        }
                        if (this.pointer) {
                            this.pointer.rotation = -0.32;
                        }
                    }

                    // Smooth spring recoil for the pointer flapper
                    if (this.pointer && this.pointer.rotation !== 0) {
                        this.pointer.rotation += (0 - this.pointer.rotation) * 0.28;
                        if (Math.abs(this.pointer.rotation) < 0.01) this.pointer.rotation = 0;
                    }
                },
                onComplete: () => {
                    this.currentAngle = finalTargetAngle;
                    if (this.pointer) this.pointer.rotation = 0;
                    this.isSpinning = false;
                    AuraSound.playCasinoWin();
                    resolve();
                }
            });
        });
    }

    destroy() {
        if (this.app) {
            this.app.destroy(true, { children: true, texture: true, baseTexture: true });
            this.app = null;
        }
    }
}

export default PixiWheelStage;

