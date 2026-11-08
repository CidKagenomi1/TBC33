/**
 * SlotIcons.js - Provides custom SVG representations for slot machine symbols
 * Replaces text-based emojis with responsive vector graphics.
 */

import { getMahjongSVG } from './MahjongSymbols.js';

const createSVG = (content) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width: 1em; height: 1em; display: inline-block; vertical-align: middle; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));">
    ${content}
</svg>
`;

const SVG_DICTIONARY = {
    // ==========================================
    // GOLDY CRUSH
    // ==========================================
    '💎': createSVG(`
        <defs>
            <linearGradient id="diaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#67e8f9" />
                <stop offset="100%" stop-color="#06b6d4" />
            </linearGradient>
            <linearGradient id="diaHigh" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#cffafe" />
                <stop offset="100%" stop-color="#22d3ee" />
            </linearGradient>
        </defs>
        <polygon points="50,95 10,40 30,10 70,10 90,40" fill="url(#diaGrad)" stroke="#0891b2" stroke-width="2"/>
        <polygon points="50,95 30,40 70,40" fill="url(#diaHigh)"/>
        <polygon points="10,40 30,10 50,40" fill="#a5f3fc" opacity="0.8"/>
        <polygon points="90,40 70,10 50,40" fill="#22d3ee" opacity="0.6"/>
        <polygon points="30,10 70,10 50,40" fill="#cffafe" opacity="0.9"/>
    `),
    '💰': createSVG(`
        <defs>
            <linearGradient id="bagGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#d97706" />
                <stop offset="100%" stop-color="#92400e" />
            </linearGradient>
        </defs>
        <path d="M40,20 C40,10 60,10 60,20 C65,30 85,50 85,75 C85,95 65,95 50,95 C35,95 15,95 15,75 C15,50 35,30 40,20 Z" fill="url(#bagGrad)" stroke="#78350f" stroke-width="3"/>
        <path d="M30,30 Q50,45 70,30" stroke="#fef3c7" stroke-width="4" fill="none" opacity="0.5"/>
        <text x="50" y="70" font-family="sans-serif" font-weight="900" font-size="40" fill="#fbbf24" text-anchor="middle" stroke="#b45309" stroke-width="2">$</text>
    `),
    '🪙': createSVG(`
        <defs>
            <radialGradient id="coinGrad" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stop-color="#fef08a" />
                <stop offset="50%" stop-color="#eab308" />
                <stop offset="100%" stop-color="#a16207" />
            </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#coinGrad)" stroke="#854d0e" stroke-width="3"/>
        <circle cx="50" cy="50" r="35" fill="none" stroke="#ca8a04" stroke-width="2" stroke-dasharray="4,4"/>
        <rect x="42" y="30" width="16" height="40" rx="3" fill="#ca8a04" transform="rotate(45 50 50)"/>
    `),
    '⛏️': createSVG(`
        <path d="M20,80 L40,60" stroke="#78350f" stroke-width="8" stroke-linecap="round"/>
        <path d="M40,60 C30,30 70,10 90,20 C80,35 60,60 40,60 Z" fill="#9ca3af" stroke="#4b5563" stroke-width="2"/>
        <path d="M40,60 C30,30 50,20 60,30" fill="#f3f4f6" opacity="0.6"/>
    `),
    '🧨': createSVG(`
        <defs>
            <linearGradient id="tntGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#ef4444" />
                <stop offset="50%" stop-color="#dc2626" />
                <stop offset="100%" stop-color="#991b1b" />
            </linearGradient>
        </defs>
        <rect x="30" y="20" width="40" height="70" rx="5" fill="url(#tntGrad)" stroke="#7f1d1d" stroke-width="2"/>
        <rect x="30" y="35" width="40" height="15" fill="#1c1917" opacity="0.8"/>
        <text x="50" y="47" font-family="sans-serif" font-weight="900" font-size="12" fill="#fff" text-anchor="middle">TNT</text>
        <path d="M50,20 Q60,10 70,10" stroke="#a8a29e" stroke-width="3" fill="none"/>
        <circle cx="70" cy="10" r="4" fill="#fbbf24"/>
    `),
    '🪨': createSVG(`
        <polygon points="50,15 20,40 25,80 60,90 85,60 70,25" fill="#44403c" stroke="#292524" stroke-width="3"/>
        <polygon points="50,15 20,40 55,50" fill="#78716c"/>
        <polygon points="25,80 55,50 60,90" fill="#57534e"/>
    `),

    // ==========================================
    // MAHJONG WAYS
    // ==========================================
    '🀄': createSVG(`
        <rect x="15" y="10" width="70" height="80" rx="10" fill="#fdfbf7" stroke="#e5e5e5" stroke-width="3"/>
        <rect x="15" y="15" width="70" height="75" rx="10" fill="#ffffff"/>
        <text x="50" y="65" font-family="serif" font-weight="900" font-size="45" fill="#ef4444" text-anchor="middle">中</text>
    `),
    '🀅': createSVG(`
        <rect x="15" y="10" width="70" height="80" rx="10" fill="#fdfbf7" stroke="#e5e5e5" stroke-width="3"/>
        <rect x="15" y="15" width="70" height="75" rx="10" fill="#ffffff"/>
        <text x="50" y="65" font-family="serif" font-weight="900" font-size="45" fill="#10b981" text-anchor="middle">發</text>
    `),
    '🀆': createSVG(`
        <rect x="15" y="10" width="70" height="80" rx="10" fill="#fdfbf7" stroke="#e5e5e5" stroke-width="3"/>
        <rect x="15" y="15" width="70" height="75" rx="10" fill="#ffffff"/>
        <rect x="25" y="25" width="50" height="55" rx="4" fill="none" stroke="#3b82f6" stroke-width="6"/>
    `),
    '🀇': createSVG(`
        <rect x="15" y="10" width="70" height="80" rx="10" fill="#fdfbf7" stroke="#e5e5e5" stroke-width="3"/>
        <rect x="15" y="15" width="70" height="75" rx="10" fill="#ffffff"/>
        <rect x="35" y="25" width="8" height="50" rx="4" fill="#22c55e"/>
        <rect x="55" y="25" width="8" height="50" rx="4" fill="#22c55e"/>
    `),
    '🀐': createSVG(`
        <rect x="15" y="10" width="70" height="80" rx="10" fill="#fdfbf7" stroke="#e5e5e5" stroke-width="3"/>
        <rect x="15" y="15" width="70" height="75" rx="10" fill="#ffffff"/>
        <circle cx="50" cy="50" r="22" fill="#ef4444"/>
        <circle cx="50" cy="50" r="10" fill="#fca5a5"/>
    `),
    '🀫': createSVG(`
        <rect x="15" y="10" width="70" height="80" rx="10" fill="#fdfbf7" stroke="#e5e5e5" stroke-width="3"/>
        <rect x="15" y="15" width="70" height="75" rx="10" fill="#ffffff"/>
    `),

    // ==========================================
    // ZEUS SLOT
    // ==========================================
    '👑': createSVG(`
        <defs>
            <linearGradient id="crownGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#fef08a" />
                <stop offset="50%" stop-color="#fbbf24" />
                <stop offset="100%" stop-color="#b45309" />
            </linearGradient>
        </defs>
        <path d="M10,80 L20,30 L35,50 L50,20 L65,50 L80,30 L90,80 Z" fill="url(#crownGrad)" stroke="#78350f" stroke-width="2"/>
        <circle cx="20" cy="30" r="5" fill="#ef4444"/>
        <circle cx="50" cy="20" r="5" fill="#3b82f6"/>
        <circle cx="80" cy="30" r="5" fill="#ef4444"/>
    `),
    '⚡': createSVG(`
        <defs>
            <linearGradient id="zapGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#fef08a" />
                <stop offset="100%" stop-color="#f59e0b" />
            </linearGradient>
        </defs>
        <polygon points="60,10 20,60 45,60 35,95 80,40 50,40" fill="url(#zapGrad)" stroke="#b45309" stroke-width="3"/>
    `),
    '🏛️': createSVG(`
        <polygon points="50,15 15,40 85,40" fill="#e5e7eb" stroke="#9ca3af" stroke-width="2"/>
        <rect x="25" y="40" width="8" height="40" fill="#f3f4f6" stroke="#9ca3af" stroke-width="1"/>
        <rect x="45" y="40" width="8" height="40" fill="#f3f4f6" stroke="#9ca3af" stroke-width="1"/>
        <rect x="65" y="40" width="8" height="40" fill="#f3f4f6" stroke="#9ca3af" stroke-width="1"/>
        <rect x="15" y="80" width="70" height="10" fill="#d1d5db"/>
    `),
    '🏺': createSVG(`
        <defs>
            <linearGradient id="vaseGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#ea580c" />
                <stop offset="100%" stop-color="#9a3412" />
            </linearGradient>
        </defs>
        <path d="M40,20 C30,40 10,50 30,80 L70,80 C90,50 70,40 60,20 Z" fill="url(#vaseGrad)" stroke="#431407" stroke-width="2"/>
        <rect x="40" y="10" width="20" height="10" fill="#c2410c"/>
    `),
    '🧿': createSVG(`
        <circle cx="50" cy="50" r="40" fill="#1e3a8a"/>
        <circle cx="50" cy="50" r="28" fill="#ffffff"/>
        <circle cx="50" cy="50" r="16" fill="#38bdf8"/>
        <circle cx="50" cy="50" r="8" fill="#000000"/>
    `),
    '💠': createSVG(`
        <polygon points="50,10 90,50 50,90 10,50" fill="#2dd4bf" stroke="#0f766e" stroke-width="4"/>
        <polygon points="50,20 80,50 50,80 20,50" fill="#99f6e4"/>
        <circle cx="50" cy="50" r="10" fill="#ccfbf1"/>
    `)
};

export const getSlotSVG = (key) => {
    // Check if it's a Mahjong symbol (object or emoji)
    const rawKey = typeof key === 'object' ? key?.emoji : key;
    if (['🀄', '🀅', '🀆', '🀇', '🀐', '🀫', '🐉', '🏮'].includes(rawKey) || (typeof key === 'object' && key?.isGold !== undefined)) {
        return getMahjongSVG(key);
    }
    // Return SVG if found, otherwise return the key (emoji text) itself wrapped in a styled span
    if (SVG_DICTIONARY[key]) {
        return SVG_DICTIONARY[key];
    }
    return `<span style="display:inline-block; transform: scale(1.0); filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));">${key}</span>`;
};
