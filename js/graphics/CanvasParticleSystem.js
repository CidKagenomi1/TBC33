/**
 * CanvasParticleSystem.js - Reusable 2D Canvas Particle Engine for Casino Cabinets
 * Handles Gold, Diamond, Spark (5-point star), and Dust particles with automatic
 * requestAnimationFrame lifecycle management and themeable color palettes.
 */

export const DEFAULT_PARTICLE_PALETTE = {
    gold: '#fbbf24',
    diamond: '#a5f3fc',
    spark: '#f97316',
    dust: '#78716c'
};

export const OLYMPUS_PARTICLE_PALETTE = {
    gold: '#bae6fd',
    diamond: '#e0f2fe',
    spark: '#38bdf8',
    dust: '#1e3a8a'
};

export class GoldParticle {
    constructor(x, y, type = 'gold', palette = DEFAULT_PARTICLE_PALETTE) {
        this.x = x;
        this.y = y;
        this.type = type; // 'gold', 'diamond', 'spark', 'dust'
        this.vx = (Math.random() - 0.5) * 12;
        this.vy = (Math.random() - 0.5) * 12 - 6; // upward bias
        this.alpha = 1;
        this.size = Math.random() * 8 + 4;
        this.gravity = 0.35;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = (Math.random() - 0.5) * 15;

        const colors = { ...DEFAULT_PARTICLE_PALETTE, ...palette };
        this.color = colors[type] || colors.dust;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.alpha -= 0.025;
        this.rotation += this.rotationSpeed;
    }
}

export class CanvasParticleSystem {
    constructor(canvasId = 'slot-particle-canvas', palette = DEFAULT_PARTICLE_PALETTE) {
        this.canvasId = canvasId;
        this.palette = { ...DEFAULT_PARTICLE_PALETTE, ...palette };
        this.particles = [];
        this.particleLoopActive = false;
        this._rafId = null;
    }

    spawn(count, type = 'gold') {
        const canvas = document.getElementById(this.canvasId);
        if (!canvas) return;
        const x = (canvas.width || canvas.parentElement?.clientWidth || 400) / 2;
        const y = (canvas.height || canvas.parentElement?.clientHeight || 300) / 2;
        for (let i = 0; i < count; i++) {
            this.particles.push(new GoldParticle(x, y, type, this.palette));
        }
        this.startLoop();
    }

    startLoop() {
        if (this.particleLoopActive) return;
        const canvas = document.getElementById(this.canvasId);
        if (!canvas) {
            this.particleLoopActive = false;
            return;
        }
        this.particleLoopActive = true;
        const ctx = canvas.getContext('2d');
        if (canvas.parentElement) {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
        }

        const loop = () => {
            if (this.particles.length === 0) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                this.particleLoopActive = false;
                this._rafId = null;
                return;
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.update();
                if (p.alpha <= 0) {
                    this.particles.splice(i, 1);
                    continue;
                }
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;

                if (p.type === 'diamond') {
                    ctx.beginPath();
                    ctx.moveTo(0, -p.size);
                    ctx.lineTo(p.size, 0);
                    ctx.lineTo(0, p.size);
                    ctx.lineTo(-p.size, 0);
                    ctx.closePath();
                    ctx.fill();
                } else if (p.type === 'gold') {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                    ctx.fill();
                } else if (p.type === 'spark') {
                    ctx.beginPath();
                    for (let j = 0; j < 5; j++) {
                        ctx.lineTo(
                            Math.cos(((18 + j * 72) * Math.PI) / 180) * p.size,
                            Math.sin(((18 + j * 72) * Math.PI) / 180) * p.size
                        );
                        ctx.lineTo(
                            Math.cos(((54 + j * 72) * Math.PI) / 180) * (p.size / 2),
                            Math.sin(((54 + j * 72) * Math.PI) / 180) * (p.size / 2)
                        );
                    }
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                }
                ctx.restore();
            }
            this._rafId = requestAnimationFrame(loop);
        };
        this._rafId = requestAnimationFrame(loop);
    }

    stop() {
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
        this.particles = [];
        this.particleLoopActive = false;
    }
}

export default CanvasParticleSystem;

