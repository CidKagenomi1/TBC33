/**
 * PixiSlotStage.js - WebGL Hardware-Accelerated 6x3 Slot Machine Engine
 * Powered by PixiJS v7 & GSAP 3
 * Features:
 * - 6-Column × 3-Row WebGL grid with masking
 * - GSAP-driven reel spinning: anticipation pull-up, high-speed spin, staggered landing
 * - Dynamic Motion Blur during spins
 * - Mechanical spring bounce on reel stop (Back.easeOut)
 * - Winning payline laser overlay & symbol pulse animations
 */

import AuraSound from '../ui/AuraSound.js';

export class PixiSlotStage {
    constructor(canvasElement, options = {}) {
        this.canvas = canvasElement;
        this.options = Object.assign({
            cols: 6,
            rows: 3,
            symbols: [],
            themeColor: 0xfbbf24,
            symbolHeight: 65,
            symbolWidth: 95
        }, options);

        this.app = null;
        this.reelContainers = [];
        this.reelBlurFilters = [];
        this.reelsSymbols = []; // symbols currently displayed
        this.paylineGfx = null;
        this.winPulseTweens = [];
        this.isSpinning = false;

        this._initPixi();
    }

    _getGSAP() {
        return (typeof window !== 'undefined' && window.gsap) ? window.gsap : null;
    }

    _initPixi() {
        if (!this.canvas || typeof window === 'undefined' || !window.PIXI) return;
        const PIXI = window.PIXI;

        const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : { width: 720, height: 520 };
        const stageWidth = Math.max(rect.width, 320);
        const stageHeight = this.canvas.clientHeight || rect.height || 520;

        // Create Pixi Application
        this.app = new PIXI.Application({
            view: this.canvas,
            width: stageWidth,
            height: stageHeight,
            backgroundAlpha: 0,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            antialias: true
        });

        const marginX = 8;
        const marginY = 8;
        const totalW = stageWidth - marginX * 2;
        const totalH = stageHeight - marginY * 2;

        this.colWidth = totalW / this.options.cols;
        this.rowHeight = totalH / this.options.rows;

        // Container for all reels
        this.mainContainer = new PIXI.Container();
        this.mainContainer.x = marginX;
        this.mainContainer.y = marginY;
        this.app.stage.addChild(this.mainContainer);

        // Mask so symbols outside the 3 visible rows are clipped
        this.maskGfx = new PIXI.Graphics();
        this.maskGfx.beginFill(0xffffff);
        this.maskGfx.drawRoundedRect(marginX, marginY, totalW, totalH, 14);
        this.maskGfx.endFill();
        this.app.stage.addChild(this.maskGfx);
        this.mainContainer.mask = this.maskGfx;

        // Create individual reels
        for (let col = 0; col < this.options.cols; col++) {
            const reelCont = new PIXI.Container();
            reelCont.x = col * this.colWidth;
            reelCont.y = 0;

            // Reel blur filter for motion blur during high-speed spin
            const blur = new PIXI.BlurFilter();
            blur.blurX = 0;
            blur.blurY = 0;
            reelCont.filters = [blur];
            this.reelBlurFilters.push(blur);

            this.mainContainer.addChild(reelCont);
            this.reelContainers.push(reelCont);
            this.reelsSymbols.push([]);

            // Default visible symbols (3 rows + 1 buffer above & below)
            for (let row = -1; row <= this.options.rows; row++) {
                const symSprite = this._createSymbolSprite('🪨', this.colWidth, this.rowHeight);
                symSprite.y = row * this.rowHeight;
                reelCont.addChild(symSprite);
                this.reelsSymbols[col].push(symSprite);
            }
        }

        // Dedicated physical column dividers (shadow groove + subtle light highlight)
        this.dividerGfx = new PIXI.Graphics();
        this._drawDividers(totalW, totalH);
        this.mainContainer.addChild(this.dividerGfx);

        // Overlay for payline lasers and highlights
        this.paylineGfx = new PIXI.Graphics();
        this.app.stage.addChild(this.paylineGfx);

        // Handle resize
        this._resizeHandler = () => this.resize();
        window.addEventListener('resize', this._resizeHandler);
    }

    _drawDividers(totalW, totalH) {
        if (!this.dividerGfx) return;
        this.dividerGfx.clear();
        for (let col = 1; col < this.options.cols; col++) {
            const x = Math.round(col * this.colWidth);
            // Shadow groove line
            this.dividerGfx.lineStyle(1.5, 0x000000, 0.65);
            this.dividerGfx.moveTo(x - 0.5, 0);
            this.dividerGfx.lineTo(x - 0.5, totalH);
            // Highlight line directly next to groove
            this.dividerGfx.lineStyle(1, 0xffffff, 0.08);
            this.dividerGfx.moveTo(x + 0.5, 0);
            this.dividerGfx.lineTo(x + 0.5, totalH);
        }
    }

    _createSymbolSprite(symbolText, width, height) {
        const PIXI = window.PIXI;
        const cont = new PIXI.Container();

        const fontSize = Math.min(width * 0.58, height * 0.58, 68);
        const text = new PIXI.Text(symbolText, {
            fontFamily: 'Outfit, Segoe UI Emoji, Apple Color Emoji, sans-serif',
            fontSize: fontSize,
            align: 'center',
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 8,
            dropShadowDistance: 3
        });
        text.anchor.set(0.5);
        text.x = width / 2;
        text.y = height / 2;

        cont.addChild(text);
        cont._label = symbolText;
        cont._textNode = text;
        return cont;
    }

    /**
     * Set symbols directly into visible grid
     */
    setGrid(matrix) {
        for (let col = 0; col < this.options.cols; col++) {
            for (let row = 0; row < this.options.rows; row++) {
                const item = matrix[col]?.[row] || '🪨';
                const emoji = typeof item === 'object' ? item.emoji : item;
                const isGold = typeof item === 'object' ? item.isGold : false;
                const isWild = typeof item === 'object' ? item.isWild : (emoji === '🐉');
                // Row index in internal reel is row + 1 (because index 0 is buffer row -1)
                const sprite = this.reelsSymbols[col][row + 1];
                if (sprite && sprite._textNode) {
                    sprite._textNode.text = emoji;
                    sprite._label = emoji;
                    if (isWild) {
                        sprite._textNode.style.dropShadowColor = '#fbbf24';
                        sprite._textNode.style.dropShadowBlur = 14;
                    } else if (isGold) {
                        sprite._textNode.style.dropShadowColor = '#f59e0b';
                        sprite._textNode.style.dropShadowBlur = 10;
                    } else {
                        sprite._textNode.style.dropShadowColor = '#000000';
                        sprite._textNode.style.dropShadowBlur = 8;
                    }
                }
            }
        }
    }

    /**
     * Spin all 6 reels with GSAP timelines, anticipation, blur, and staggered stops
     */
    spin(finalMatrix, { isSpeedUp = false, skipRequested = false } = {}) {
        const gsap = this._getGSAP();
        this.clearHighlights();
        this.isSpinning = true;

        const duration = isSpeedUp ? 0.45 : 0.85;
        const staggerDelay = isSpeedUp ? 0.05 : 0.12;

        return new Promise((resolve) => {
            if (!gsap || skipRequested) {
                this.setGrid(finalMatrix);
                this.isSpinning = false;
                resolve();
                return;
            }

            let completedReels = 0;

            for (let col = 0; col < this.options.cols; col++) {
                const reel = this.reelContainers[col];
                const blur = this.reelBlurFilters[col];
                const finalColSymbols = finalMatrix[col];

                const tl = gsap.timeline({
                    delay: col * 0.04, // slight stagger start
                    onComplete: () => {
                        completedReels++;
                        AuraSound.playTap();
                        if (completedReels === this.options.cols) {
                            this.isSpinning = false;
                            resolve();
                        }
                    }
                });

                // 1. Anticipation pull-up
                tl.to(reel, {
                    y: -18,
                    duration: isSpeedUp ? 0.08 : 0.15,
                    ease: 'power1.in'
                });

                // 2. High-speed spin down with blur
                tl.to(blur, {
                    blurY: isSpeedUp ? 8 : 12,
                    duration: 0.1
                }, '<');

                // Shuffle symbols during spin
                tl.to(reel, {
                    y: this.rowHeight * 4,
                    duration: duration + col * staggerDelay,
                    ease: 'linear',
                    onUpdate: () => {
                        // Rapidly randomize buffer symbols during spin
                        for (let r = 0; r < this.reelsSymbols[col].length; r++) {
                            const spr = this.reelsSymbols[col][r];
                            if (spr._textNode && Math.random() > 0.6) {
                                const randomSymbol = this.options.symbols[Math.floor(Math.random() * this.options.symbols.length)]?.emoji || '💎';
                                spr._textNode.text = randomSymbol;
                            }
                        }
                    }
                });

                // 3. Staggered snap & Spring bounce landing
                tl.call(() => {
                    // Set final symbols right before bounce
                    for (let row = 0; row < this.options.rows; row++) {
                        const spr = this.reelsSymbols[col][row + 1];
                        if (spr && spr._textNode) {
                            const raw = finalColSymbols[row];
                            const sym = typeof raw === 'object' ? raw.emoji : raw;
                            spr._textNode.text = sym;
                            spr._label = sym;
                        }
                    }
                    reel.y = -this.rowHeight * 0.8;
                });

                tl.to(blur, {
                    blurY: 0,
                    duration: 0.15
                });

                tl.to(reel, {
                    y: 0,
                    duration: isSpeedUp ? 0.2 : 0.35,
                    ease: 'back.out(1.8)'
                });
            }
        });
    }

    /**
     * Highlight winning paylines with glowing laser and symbol pulse
     */
    highlightWins(winningLines, symbolCoordinates) {
        this.clearHighlights();
        const gsap = this._getGSAP();
        if (!this.paylineGfx) return;

        // Draw animated laser lines across winning coordinates
        this.paylineGfx.clear();
        winningLines.forEach((line) => {
            const lineColor = PIXI.utils.string2hex(line.color || '#fbbf24');
            this.paylineGfx.lineStyle(4, lineColor, 0.85);

            for (let col = 0; col < line.coordinates.length; col++) {
                const row = line.coordinates[col];
                const x = col * this.colWidth + this.colWidth / 2 + 8;
                const y = row * this.rowHeight + this.rowHeight / 2 + 8;

                if (col === 0) this.paylineGfx.moveTo(x, y);
                else this.paylineGfx.lineTo(x, y);
            }
        });

        // Laser glow effect
        if (gsap) {
            gsap.to(this.paylineGfx, {
                alpha: 0.4,
                yoyo: true,
                repeat: 5,
                duration: 0.25,
                ease: 'sine.inOut'
            });
        }

        // Pulse winning symbol sprites
        symbolCoordinates.forEach(({ col, row }) => {
            const sprite = this.reelsSymbols[col]?.[row + 1];
            if (sprite && gsap) {
                const tw = gsap.to(sprite.scale, {
                    x: 1.25,
                    y: 1.25,
                    yoyo: true,
                    repeat: 5,
                    duration: 0.22,
                    ease: 'sine.inOut'
                });
                this.winPulseTweens.push(tw);
            }
        });
    }

    clearHighlights() {
        if (this.paylineGfx) {
            this.paylineGfx.clear();
            this.paylineGfx.alpha = 1;
        }
        this.winPulseTweens.forEach(tw => tw.kill());
        this.winPulseTweens = [];

        // Reset scales and alpha
        for (let col = 0; col < this.options.cols; col++) {
            for (let r = 0; r < this.reelsSymbols[col].length; r++) {
                const spr = this.reelsSymbols[col][r];
                if (spr) {
                    if (spr.scale) spr.scale.set(1);
                    spr.alpha = 1;
                }
            }
        }
    }

    /**
     * Animate cascading / tumble reaction:
     * 1. Winning symbols shatter and disappear (scale up + fade out)
     * 2. Remaining symbols drop down with gravity
     * 3. New symbols drop in from top with spring bounce
     */
    animateCascade(winningCoordinates, newGrid, { isSpeedUp = false } = {}) {
        const gsap = this._getGSAP();
        this.clearHighlights();

        return new Promise((resolve) => {
            if (!gsap) {
                this.setGrid(newGrid);
                resolve();
                return;
            }

            const popDuration = isSpeedUp ? 0.18 : 0.26;
            const dropDuration = isSpeedUp ? 0.22 : 0.36;

            // Collect winning sprites
            const winningSprites = [];
            winningCoordinates.forEach(({ col, row }) => {
                const sprite = this.reelsSymbols[col]?.[row + 1];
                if (sprite) winningSprites.push(sprite);
            });

            AuraSound.playCascadePop();

            // Step 1: Explode winning symbols (scale up and fade out)
            const tl = gsap.timeline({
                onComplete: () => {
                    // Reset sprite transforms
                    winningSprites.forEach(spr => {
                        spr.alpha = 1;
                        spr.scale.set(1);
                    });

                    // Step 2: Set new grid labels and animate tumble drop
                    this.setGrid(newGrid);
                    AuraSound.playTumbleDrop();

                    const dropTl = gsap.timeline({
                        onComplete: () => {
                            resolve();
                        }
                    });

                    for (let col = 0; col < this.options.cols; col++) {
                        const reel = this.reelContainers[col];
                        dropTl.fromTo(reel,
                            { y: -this.rowHeight * 0.9 },
                            { y: 0, duration: dropDuration, ease: 'back.out(1.6)' },
                            col * 0.03
                        );
                    }
                }
            });

            winningSprites.forEach(spr => {
                tl.to(spr.scale, { x: 1.45, y: 1.45, duration: popDuration, ease: 'power2.out' }, 0);
                tl.to(spr, { alpha: 0, duration: popDuration, ease: 'power2.out' }, 0);
            });
        });
    }

    resize() {
        if (!this.app || !this.canvas || !this.canvas.parentElement) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const stageWidth = Math.max(rect.width, 320);
        const stageHeight = this.canvas.clientHeight || rect.height || 520;

        this.app.renderer.resize(stageWidth, stageHeight);
        const marginX = 8;
        const marginY = 8;
        const totalW = stageWidth - marginX * 2;
        const totalH = stageHeight - marginY * 2;

        this.colWidth = totalW / this.options.cols;
        this.rowHeight = totalH / this.options.rows;

        if (this.maskGfx) {
            this.maskGfx.clear();
            this.maskGfx.beginFill(0xffffff);
            this.maskGfx.drawRoundedRect(marginX, marginY, totalW, totalH, 14);
            this.maskGfx.endFill();
        }

        const fontSize = Math.min(this.colWidth * 0.58, this.rowHeight * 0.58, 68);

        for (let col = 0; col < this.options.cols; col++) {
            this.reelContainers[col].x = col * this.colWidth;
            for (let r = 0; r < this.reelsSymbols[col].length; r++) {
                const row = r - 1;
                const spr = this.reelsSymbols[col][r];
                spr.y = row * this.rowHeight;
                if (spr._textNode) {
                    spr._textNode.x = this.colWidth / 2;
                    spr._textNode.y = this.rowHeight / 2;
                    spr._textNode.style.fontSize = fontSize;
                }
            }
        }

        this._drawDividers(totalW, totalH);
    }

    destroy() {
        window.removeEventListener('resize', this._resizeHandler);
        this.clearHighlights();
        if (this.app) {
            this.app.destroy(true, { children: true, texture: true, baseTexture: true });
            this.app = null;
        }
    }
}

export default PixiSlotStage;

