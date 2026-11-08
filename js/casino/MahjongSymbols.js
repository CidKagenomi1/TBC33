/**
 * MahjongSymbols.js - Dedicated Premium Asset Library for Mahjong Ways Slot Symbols
 * Provides high-definition vector SVGs, 3D ivory tiles, and 24K gold-plated variants.
 * 
 * Symbols included:
 * - 🐉 WILD: Naga Emas Imperial / Ingot 百搭 (Transformative Wild)
 * - 🀄 Red Dragon (Hong Zhong - 中)
 * - 🀅 Green Dragon (Fa Cai - 發)
 * - 🀆 White Dragon (Bai Ban - 白板)
 * - 🀇 Bamboo (Ba Tiao - 八條)
 * - 🀐 Dots / Circles (Wu Tong - 五筒)
 * - 🀫 Mahjong Ingot (Yuanbao - 金元宝)
 * - 🏮 SCATTER: Lampion Emas / Hu (胡)
 */

export const MAHJONG_SYMBOLS_CONFIG = [
    {
        id: 'wild',
        emoji: '🐉',
        name: 'Naga Emas (WILD)',
        chineseName: '百搭',
        isWild: true,
        baseWeight: 0,
        multiplier3x: 80,
        multiplier2x: 4,
        description: 'Simbol Liar Pengganti. Tercipta dari transformasi Simbol Emas saat meledak!'
    },
    {
        id: 'red_dragon',
        emoji: '🀄',
        name: 'Naga Merah (Chun)',
        chineseName: '中',
        isWild: false,
        baseWeight: 4,
        multiplier3x: 50,
        multiplier2x: 3,
        description: 'Simbol Premium Tertinggi. Kaligrafi Merah Tua Ukiran Pernis.'
    },
    {
        id: 'green_dragon',
        emoji: '🀅',
        name: 'Naga Hijau (Fa)',
        chineseName: '發',
        isWild: false,
        baseWeight: 8,
        multiplier3x: 25,
        multiplier2x: 2,
        description: 'Simbol Kemakmuran Fa Cai. Giok Hijau Zamrud Berkilau.'
    },
    {
        id: 'white_dragon',
        emoji: '🀆',
        name: 'Naga Putih (Bai)',
        chineseName: '白板',
        isWild: false,
        baseWeight: 12,
        multiplier3x: 10,
        multiplier2x: 0,
        description: 'Bingkai Celestial Biru Safir Kerajaan.'
    },
    {
        id: 'bamboo',
        emoji: '🀇',
        name: 'Bambu 8 (Ba Tiao)',
        chineseName: '八條',
        isWild: false,
        baseWeight: 18,
        multiplier3x: 5,
        multiplier2x: 0,
        description: 'Bambu Bersepuh Pernis Merah & Hijau.'
    },
    {
        id: 'dots',
        emoji: '🀐',
        name: 'Koin Titik 5 (Wu Tong)',
        chineseName: '五筒',
        isWild: false,
        baseWeight: 25,
        multiplier3x: 3,
        multiplier2x: 0,
        description: 'Bunga Koin Tembaga Lima Titik Keberuntungan.'
    },
    {
        id: 'ingot',
        emoji: '🀫',
        name: 'Batu Mahjong (Yuanbao)',
        chineseName: '元宝',
        isWild: false,
        baseWeight: 32,
        multiplier3x: 1,
        multiplier2x: 0,
        description: 'Ubin Mahjong Klasik Giok Bertatahkan Emas.'
    },
    {
        id: 'scatter',
        emoji: '🏮',
        name: 'Lampion Emas (SCATTER)',
        chineseName: '胡',
        isScatter: true,
        baseWeight: 2,
        multiplier3x: 100,
        multiplier2x: 5,
        description: 'Pemicu Putaran Gratis & Bonus Game.'
    }
];

// ── SVG Shared Gradients and Definitions ──
const SVG_DEFS = `
<defs>
    <!-- 3D Bone Ivory Gradient (Realistic Mahjong Surface) -->
    <linearGradient id="mjIvoryGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="35%" stop-color="#faf8f2" />
        <stop offset="75%" stop-color="#f0ece1" />
        <stop offset="100%" stop-color="#e2dcce" />
    </linearGradient>

    <!-- Emerald Jade Tile Backing -->
    <linearGradient id="mjJadeBack" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#059669" />
        <stop offset="50%" stop-color="#047857" />
        <stop offset="100%" stop-color="#064e3b" />
    </linearGradient>

    <!-- 24K Gold Plated Tile Gradient -->
    <linearGradient id="mjGoldTileFace" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fffbeb" />
        <stop offset="25%" stop-color="#fde047" />
        <stop offset="55%" stop-color="#eab308" />
        <stop offset="85%" stop-color="#ca8a04" />
        <stop offset="100%" stop-color="#854d0e" />
    </linearGradient>

    <!-- Gold Border Shimmer -->
    <linearGradient id="mjGoldBorder" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#fef08a" />
        <stop offset="50%" stop-color="#f59e0b" />
        <stop offset="100%" stop-color="#78350f" />
    </linearGradient>

    <!-- Crimson Lacquer Gradient (Red Dragon) -->
    <linearGradient id="mjRedLacquer" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#f87171" />
        <stop offset="35%" stop-color="#dc2626" />
        <stop offset="100%" stop-color="#991b1b" />
    </linearGradient>

    <!-- Emerald Lacquer Gradient (Green Dragon) -->
    <linearGradient id="mjGreenLacquer" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#34d399" />
        <stop offset="40%" stop-color="#059669" />
        <stop offset="100%" stop-color="#064e3b" />
    </linearGradient>

    <!-- Sapphire Blue Gradient (White Dragon) -->
    <linearGradient id="mjBlueLacquer" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#60a5fa" />
        <stop offset="50%" stop-color="#2563eb" />
        <stop offset="100%" stop-color="#1e3a8a" />
    </linearGradient>

    <!-- Dragon Flame Aura Filter -->
    <filter id="mjGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
</defs>
`;

/**
 * Creates the authentic 3D Mahjong Tile Chassis
 */
const createTileChassis = (isGold = false) => {
    if (isGold) {
        return `
            <!-- 3D Gold Plated Base Chassis -->
            <rect x="8" y="10" width="84" height="96" rx="12" fill="#78350f" stroke="#451a03" stroke-width="2.5"/>
            <!-- Front Face: Molten 24K Gold -->
            <rect x="8" y="6" width="84" height="92" rx="12" fill="url(#mjGoldTileFace)" stroke="url(#mjGoldBorder)" stroke-width="3"/>
            <!-- Beveled Inner Highlight -->
            <rect x="12" y="10" width="76" height="84" rx="9" fill="none" stroke="#fef9c3" stroke-width="1.8" opacity="0.9"/>
            <!-- Gold Corner Filigree Accents -->
            <circle cx="15" cy="13" r="2.5" fill="#78350f" opacity="0.8"/>
            <circle cx="85" cy="13" r="2.5" fill="#78350f" opacity="0.8"/>
            <circle cx="15" cy="91" r="2.5" fill="#78350f" opacity="0.8"/>
            <circle cx="85" cy="91" r="2.5" fill="#78350f" opacity="0.8"/>
        `;
    }

    return `
        <!-- Authentic Jade Backing Bevel -->
        <rect x="8" y="10" width="84" height="96" rx="12" fill="url(#mjJadeBack)" stroke="#064e3b" stroke-width="2"/>
        <!-- Front Face: 3D Bone Ivory Surface -->
        <rect x="8" y="6" width="84" height="92" rx="12" fill="url(#mjIvoryGrad)" stroke="#dcd6c7" stroke-width="2"/>
        <!-- Inner Specular Reflection Rim -->
        <rect x="12" y="9" width="76" height="85" rx="9" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.95"/>
    `;
};

// ── Vector Graphics Dictionary for Mahjong Faces ──
const MAHJONG_GLYPHS = {
    // 🐉 WILD Naga Emas Imperial / Ingot 百搭
    '🐉': (isGold) => `
        <g id="glyph-wild" filter="url(#mjGlow)">
            <!-- Golden Dragon Flames Halo -->
            <circle cx="50" cy="50" r="32" fill="#f59e0b" opacity="0.25"/>
            
            <!-- Imperial Ingot Base / Dragon Horns -->
            <path d="M22,64 C20,44 32,32 50,30 C68,32 80,44 78,64 C70,74 30,74 22,64 Z" fill="url(#mjGoldBorder)" stroke="#78350f" stroke-width="2"/>
            <ellipse cx="50" cy="46" rx="22" ry="12" fill="#fef08a" stroke="#ca8a04" stroke-width="1.5"/>
            <circle cx="50" cy="45" r="7" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.5"/>

            <!-- Chinese Characters: 百搭 (WILD) -->
            <text x="50" y="76" font-family="'Microsoft YaHei', 'PingFang SC', 'SimSun', 'Russo One', sans-serif" font-weight="900" font-size="19" fill="#7f1d1d" stroke="#fef08a" stroke-width="0.8" text-anchor="middle" letter-spacing="1">百搭</text>
            
            <!-- Shimmer Star -->
            <polygon points="50,22 53,28 60,30 53,32 50,38 47,32 40,30 47,28" fill="#fff" opacity="0.95"/>
        </g>
    `,

    // 🀄 Red Dragon (Hong Zhong - 中)
    '🀄': (isGold) => `
        <g id="glyph-hong-zhong">
            <!-- Deep Carved Crimson Red Calligraphy '中' -->
            <path d="M30,34 L70,34 L70,58 L30,58 Z" fill="url(#mjRedLacquer)" stroke="${isGold ? '#78350f' : '#7f1d1d'}" stroke-width="2.5"/>
            <rect x="39" y="41" width="22" height="10" rx="2" fill="${isGold ? '#fef08a' : '#faf8f2'}"/>
            <!-- Center Vertical Pillar -->
            <rect x="45" y="20" width="10" height="64" rx="3" fill="url(#mjRedLacquer)" stroke="${isGold ? '#78350f' : '#7f1d1d'}" stroke-width="2"/>
            <!-- Engraved Shadow Line -->
            <line x1="47" y1="22" x2="47" y2="82" stroke="#fca5a5" stroke-width="1.8" opacity="0.7"/>
        </g>
    `,

    // 🀅 Green Dragon (Fa Cai - 發)
    '🀅': (isGold) => `
        <g id="glyph-fa-cai">
            <!-- Deep Carved Emerald Green Calligraphy '發' -->
            <text x="50" y="66" font-family="'Microsoft YaHei', 'PingFang SC', 'Noto Serif SC', 'SimSun', serif" font-weight="900" font-size="48" fill="url(#mjGreenLacquer)" stroke="${isGold ? '#78350f' : '#064e3b'}" stroke-width="1.8" text-anchor="middle">發</text>
            <!-- Jade Glisten Overlay -->
            <text x="49" y="65" font-family="'Microsoft YaHei', 'PingFang SC', 'Noto Serif SC', 'SimSun', serif" font-weight="900" font-size="48" fill="none" stroke="#a7f3d0" stroke-width="0.8" text-anchor="middle" opacity="0.8">發</text>
        </g>
    `,

    // 🀆 White Dragon (Bai Ban - 白板)
    '🀆': (isGold) => `
        <g id="glyph-bai-ban">
            <!-- Royal Sapphire Filigree Double-Frame -->
            <rect x="24" y="20" width="52" height="64" rx="6" fill="none" stroke="url(#mjBlueLacquer)" stroke-width="7"/>
            <rect x="29" y="25" width="42" height="54" rx="4" fill="none" stroke="${isGold ? '#fef08a' : '#ffffff'}" stroke-width="1.8"/>
            <rect x="34" y="30" width="32" height="44" rx="3" fill="none" stroke="url(#mjBlueLacquer)" stroke-width="2"/>
            <!-- Corner Pins -->
            <circle cx="28" cy="24" r="2" fill="#1e3a8a"/>
            <circle cx="72" cy="24" r="2" fill="#1e3a8a"/>
            <circle cx="28" cy="80" r="2" fill="#1e3a8a"/>
            <circle cx="72" cy="80" r="2" fill="#1e3a8a"/>
        </g>
    `,

    // 🀇 Bamboo 8 (Ba Tiao - 八條)
    '🀇': (isGold) => `
        <g id="glyph-bamboo">
            <!-- 8 Segmented Bamboo Stems -->
            <!-- Top Row (4 green shoots) -->
            <g fill="url(#mjGreenLacquer)" stroke="#064e3b" stroke-width="1">
                <rect x="23" y="22" width="7" height="26" rx="3"/>
                <rect x="37" y="22" width="7" height="26" rx="3"/>
                <rect x="56" y="22" width="7" height="26" rx="3"/>
                <rect x="70" y="22" width="7" height="26" rx="3"/>
            </g>
            <!-- Bottom Row (4 crimson & green shoots) -->
            <g fill="url(#mjRedLacquer)" stroke="#7f1d1d" stroke-width="1">
                <rect x="23" y="56" width="7" height="26" rx="3"/>
                <rect x="37" y="56" width="7" height="26" rx="3"/>
                <rect x="56" y="56" width="7" height="26" rx="3"/>
                <rect x="70" y="56" width="7" height="26" rx="3"/>
            </g>
            <!-- Bamboo Nodes (Segment Rings) -->
            <line x1="21" y1="35" x2="32" y2="35" stroke="#fef08a" stroke-width="2"/>
            <line x1="35" y1="35" x2="46" y2="35" stroke="#fef08a" stroke-width="2"/>
            <line x1="54" y1="35" x2="65" y2="35" stroke="#fef08a" stroke-width="2"/>
            <line x1="68" y1="35" x2="79" y2="35" stroke="#fef08a" stroke-width="2"/>
            <line x1="21" y1="69" x2="32" y2="69" stroke="#fef08a" stroke-width="2"/>
            <line x1="35" y1="69" x2="46" y2="69" stroke="#fef08a" stroke-width="2"/>
            <line x1="54" y1="69" x2="65" y2="69" stroke="#fef08a" stroke-width="2"/>
            <line x1="68" y1="69" x2="79" y2="69" stroke="#fef08a" stroke-width="2"/>
        </g>
    `,

    // 🀐 Dots / Circles 5 (Wu Tong - 五筒)
    '🀐': (isGold) => `
        <g id="glyph-dots">
            <!-- 4 Corner Dots (Navy Sapphire) -->
            <circle cx="32" cy="28" r="9" fill="url(#mjBlueLacquer)" stroke="#1e3a8a" stroke-width="1.5"/>
            <circle cx="32" cy="28" r="4" fill="#93c5fd"/>
            <circle cx="68" cy="28" r="9" fill="url(#mjBlueLacquer)" stroke="#1e3a8a" stroke-width="1.5"/>
            <circle cx="68" cy="28" r="4" fill="#93c5fd"/>
            <circle cx="32" cy="76" r="9" fill="url(#mjBlueLacquer)" stroke="#1e3a8a" stroke-width="1.5"/>
            <circle cx="32" cy="76" r="4" fill="#93c5fd"/>
            <circle cx="68" cy="76" r="9" fill="url(#mjBlueLacquer)" stroke="#1e3a8a" stroke-width="1.5"/>
            <circle cx="68" cy="76" r="4" fill="#93c5fd"/>

            <!-- Center Plum Blossom Coin (Crimson Red) -->
            <circle cx="50" cy="52" r="13" fill="url(#mjRedLacquer)" stroke="#7f1d1d" stroke-width="2"/>
            <circle cx="50" cy="52" r="6" fill="#fef08a" stroke="#ca8a04" stroke-width="1"/>
            <circle cx="50" cy="52" r="2.5" fill="#7f1d1d"/>
        </g>
    `,

    // 🀫 Ingot Tile (Yuanbao - 元宝)
    '🀫': (isGold) => `
        <g id="glyph-ingot">
            <!-- Traditional Imperial Chinese Gold Sycee / Yuanbao -->
            <path d="M26,62 C22,46 32,38 50,38 C68,38 78,46 74,62 C68,72 32,72 26,62 Z" fill="url(#mjGoldBorder)" stroke="#78350f" stroke-width="2"/>
            <ellipse cx="50" cy="48" rx="18" ry="10" fill="#fef08a" stroke="#ca8a04" stroke-width="1.5"/>
            <!-- Ingot Center Dimple -->
            <ellipse cx="50" cy="47" rx="8" ry="4" fill="#eab308"/>
            <text x="50" y="78" font-family="serif" font-weight="900" font-size="14" fill="#78350f" text-anchor="middle">吉</text>
        </g>
    `,

    // 🏮 SCATTER Lampion Emas / Hu (胡)
    '🏮': (isGold) => `
        <g id="glyph-scatter">
            <!-- Red & Gold Lantern Body -->
            <ellipse cx="50" cy="50" rx="26" ry="24" fill="url(#mjRedLacquer)" stroke="#78350f" stroke-width="2"/>
            <rect x="36" y="24" width="28" height="6" rx="2" fill="#f59e0b" stroke="#78350f" stroke-width="1"/>
            <rect x="36" y="70" width="28" height="6" rx="2" fill="#f59e0b" stroke="#78350f" stroke-width="1"/>
            <!-- Center Gold Calligraphy '胡' (HU / WIN) -->
            <text x="50" y="56" font-family="'Microsoft YaHei', 'PingFang SC', 'SimSun', 'Russo One', sans-serif" font-weight="900" font-size="20" fill="#fef08a" text-anchor="middle">胡</text>
            <!-- Hanging Golden Tassels -->
            <line x1="50" y1="76" x2="50" y2="88" stroke="#f59e0b" stroke-width="3"/>
            <circle cx="50" cy="89" r="3" fill="#f59e0b"/>
        </g>
    `
};

/**
 * Helper to extract emoji character and gold state from a tile data structure.
 */
export const getTileEmoji = (tile) => {
    if (!tile) return '🀫';
    if (typeof tile === 'string') return tile;
    return tile.emoji || '🀫';
};

export const isTileGold = (tile) => {
    if (!tile || typeof tile !== 'object') return false;
    return Boolean(tile.isGold);
};

export const isTileWild = (tile) => {
    if (!tile) return false;
    if (typeof tile === 'string') return tile === '🐉';
    return Boolean(tile.isWild || tile.emoji === '🐉');
};

/**
 * Main Asset Function: getMahjongSVG
 * Returns high-resolution SVG markup for the given mahjong tile.
 * 
 * @param {string|object} tile - Emoji or object { emoji, isGold, isWild }
 * @param {object} [options] - Configuration options
 * @param {boolean} [options.isGold] - Override gold status
 * @param {string} [options.className] - Optional custom CSS class
 * @returns {string} SVG HTML string
 */
export const getMahjongSVG = (tile, options = {}) => {
    const emoji = getTileEmoji(tile);
    const isGold = options.isGold !== undefined ? options.isGold : isTileGold(tile);
    const isWild = isTileWild(tile);

    const glyphFn = MAHJONG_GLYPHS[emoji] || MAHJONG_GLYPHS['🀫'];
    const glyphContent = glyphFn(isGold);

    const classes = [
        'mahjong-tile-svg',
        isGold ? 'mahjong-tile-gold' : 'mahjong-tile-normal',
        isWild ? 'mahjong-tile-wild' : '',
        options.className || ''
    ].filter(Boolean).join(' ');

    return `
<svg width="100" height="112" class="${classes}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 112" style="width: 1em; height: 1.12em; display: inline-block; vertical-align: middle; filter: drop-shadow(0 5px 8px rgba(0,0,0,0.55)); user-select: none;">
    ${SVG_DEFS}
    ${createTileChassis(isGold)}
    ${glyphContent}
</svg>
    `.trim();
};

/**
 * Returns HTML for Paytable / Summary dialogs
 */
export const renderMahjongPaytableRow = (spec) => {
    return `
        <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); padding:0.45rem 0.6rem; border-radius:10px; display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
            <div style="display:flex; align-items:center; gap:0.55rem;">
                <span style="font-size:1.8rem; line-height:1;">${getMahjongSVG(spec.emoji)}</span>
                <div>
                    <div style="font-size:0.82rem; font-weight:800; color:#fff;">${spec.name}</div>
                    <div style="font-size:0.65rem; color:rgba(255,255,255,0.45);">${spec.description}</div>
                </div>
            </div>
            <div style="text-align:right;">
                <div style="color:#fbbf24; font-weight:900; font-size:0.85rem;">${spec.multiplier3x}×</div>
                <div style="font-size:0.65rem; color:rgba(255,255,255,0.4);">3 Sambung</div>
            </div>
        </div>
    `;
};

export default {
    MAHJONG_SYMBOLS_CONFIG,
    getMahjongSVG,
    getTileEmoji,
    isTileGold,
    isTileWild,
    renderMahjongPaytableRow
};

