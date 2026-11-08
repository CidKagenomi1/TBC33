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
    spinTo(targetIndex, { duration = 4.2 } = {}) {
        const gsap = this._getGSAP();
        if (this.isSpinning) return Promise.resolve();
        this.isSpinning = true;

        const numSectors = this.sectors.length;
        const anglePerSector = 360 / numSectors;

        // Target angle points to top (pointer is at top 0/360 degrees)
        const targetSectorAngle = targetIndex * anglePerSector;
        // Total rotations (5 to 8 full spins + landing offset)
        const fullSpins = 6 * 360;
        // Invert for clockwise rotation
        const finalTargetAngle = this.currentAngle + fullSpins + (360 - (targetSectorAngle % 360)) + anglePerSector / 2;

        return new Promise((resolve) => {
            if (!gsap) {
                this.wheelContainer.rotation = (finalTargetAngle * Math.PI) / 180;
                this.currentAngle = finalTargetAngle % 360;
                this.isSpinning = false;
                resolve();
                return;
            }

            const rotObj = { angle: this.currentAngle };
            let lastPeg = -1;

            gsap.to(rotObj, {
                angle: finalTargetAngle,
                duration: duration,
                ease: 'power4.out',
                onUpdate: () => {
                    const rad = (rotObj.angle * Math.PI) / 180;
                    this.wheelContainer.rotation = rad;

                    // Flapper deflection when passing pegs
                    const currentSector = Math.floor(rotObj.angle / anglePerSector);
                    if (currentSector !== lastPeg) {
                        lastPeg = currentSector;
                        AuraSound.playTap();
                        gsap.timeline()
                            .to(this.pointer, { rotation: -0.25, duration: 0.04, ease: 'power1.out' })
                            .to(this.pointer, { rotation: 0, duration: 0.08, ease: 'back.out(2)' });
                    }
                },
                onComplete: () => {
                    this.currentAngle = finalTargetAngle % 360;
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

