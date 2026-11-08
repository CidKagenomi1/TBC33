# 🪙 Trilliun-Bet33 — VIP Casino Suite (Powered by PixiJS & GSAP)

**Trilliun-Bet33** adalah platform mini-game kasino VIP modular dan mandiri (*standalone*), ditenagai oleh **PixiJS v7** (akselerasi grafis WebGL hardware 60 FPS) dan **GSAP 3** (animasi reels elastis, spring bounces, rolling number counters, dan visual FX Vegas-grade), dilengkapi dengan sistem efek suara Web Audio synthesizer offline, manajemen saldo chip lokal (*localStorage persistence*), dan antarmuka bertema neon emas mewah (*luxury dark casino*).

---

## 🎨 Teknologi Grafis & Animasi

- **PixiJS v7 (WebGL 2D Renderer)**:
  - Rendering WebGL 60 FPS untuk reels slot mesin, clipping mask presisi, dan motion blur filter dinamis saat putaran kecepatan tinggi.
  - WebGL Wheel of Fortune 12 segmen dengan outer LED ring chasing lights dan center 3D gold hub.
  - WebGL Particle Container untuk shower 350+ koin emas dan berlian 3D pada kemenangan Big Win & Jackpot.
- **GSAP 3 (GreenSock Animation Platform)**:
  - Reel spin sequencing dengan *anticipation pull-up* (`power1.in`), *staggered landing* antar reel, dan *mechanical spring bounce* (`Back.easeOut(1.8)`).
  - Wheel spin dengan perlambatan gesekan fisik realistis (`power4.out`) dan pointer flapper bounce + tick audio.
  - *Rolling number counters* (angka saldo kemenangan bergulir naik secara dramatis) pada modal Big Win.
  - *Flying 3D chips*: koin chip melengkung terbang dari slot ke bar saldo atas saat menang.
  - Micro-interactions (squash & stretch bounce) pada semua tombol aksi.

---

## 🎰 Daftar Permainan & Engine

1. **Goldy Crush Slot (6x3 Cascading & TNT Blast)** (`js/casino/SlotEngine.js`)
   - WebGL 6 kolom × 3 baris ditenagai PixiJS & GSAP dengan sistem runtuhan (*cascading*).
   - **Signature Mechanic: TNT 3x3 Area Blast**: Simbol Dinamit (🧨) meledakkan area 3x3 di sekitarnya dan mengubah batuan tambang menjadi bounty instan!
   - **Gold Rush Fever**: Pengali runtuhan bertingkat hingga **x10** (`x1 -> x2 -> x3 -> x5 -> x10`).
2. **Mahjong Ways Slot (6x8 Cascading & Transforming WILD)** (`js/casino/MahjongSlotEngine.js`)
   - Nuansa ubin mahjong oriental otentik dengan ubin naga merah/hijau/putih via PixiJS.
   - **Signature Mechanic: Golden Plated Tiles & Transforming WILD**: Ubin berlapis emas di reel tengah yang berpartisipasi dalam kemenangan akan bertransformasi menjadi **Naga Emas WILD (🐉)** untuk ronde runtuhan berikutnya!
   - **Mahjong Multiplier Bar**: Bar pengali interaktif real-time di atas kabinet (`x1 -> x2 -> x3 -> x5`).
3. **Zeus Gates of Olympus Slot (6x5 Pay Anywhere & Multiplier Orbs)** (`js/casino/ZeusSlotEngine.js`)
   - Grid megah 6 kolom × 5 baris di kuil Olympus para dewa.
   - **Signature Mechanic 1: Pay Anywhere (Scatter Pays)**: Simbol bayar di mana saja jika muncul $\ge 8$ buah tanpa terikat garis payline konvensional!
   - **Signature Mechanic 2: Multiplier Orbs (x2 - x100)**: Petir Zeus menyambar secara acak menurunkan bola pengali yang diakumulasikan ke **Olympus Multiplier Meter**, melipatgandakan seluruh total kemenangan putaran!
4. **Mega Lottery (Togel Progresif 4-Angka)** (`js/casino/LotteryEngine.js`)
   - Pemilihan 4 angka keberuntungan manual atau acak (*Quick Pick*).
   - Animasi bola undian memantul (*bouncing ball physics*), riwayat kemenangan, dan jackpot progresif kumulatif.
5. **Spinning Wheel (Roda Keberuntungan & Kripto)** (`js/casino/WheelEngine.js`)
   - Roda 12 segmen PixiJS WebGL dengan hadiah chip hingga 50x lipat, Free Spins, Bonus Spins (3x), dan payout mata uang kripto (ETH & SOL) langsung ke dompet digital pemain.
6. **Parlay Sports Betting** (`js/casino/ParlayEngine.js`)
   - Taruhan kombo multi-pertandingan sepak bola dengan 100 klub Eropa nyata (Premier League, La Liga, Serie A, Bundesliga, Ligue 1) dengan kalkulator odds otomatis.

---

## 🏗️ Struktur Arsitektur Mandiri

```
Trilliun-Bet33/
├── index.html                   # Halaman utama game (memuat PixiJS & GSAP)
├── package.json                 # Konfigurasi npm package & scripts (pixi.js & gsap)
├── README.md                    # Dokumentasi lengkap
├── css/
│   └── style.css                # Desain tema mewah neon emas, responsif & animasi
└── js/
    ├── main.js                  # Entrypoint: inisialisasi modul, faucet, & kontrol bar
    ├── GamblingPanel.js         # Hub utama VIP Casino Terminal & switcher tab game
    ├── graphics/
    │   ├── PixiSlotStage.js     # WebGL 6x3 Slot Machine Stage (PixiJS + GSAP)
    │   ├── PixiWheelStage.js    # WebGL Spinning Wheel Stage (PixiJS + GSAP)
    │   └── PixiEffects.js       # Big Win celebration, particle showers, flying chips
    ├── core/
    │   └── GameState.js         # State management reaktif dengan penyimpanan localStorage
    ├── finance/
    │   └── FinanceManager.js    # Pengelolaan chip (TC), format angka, kalkulasi menang/kalah
    ├── trading/
    │   └── CryptoMarket.js      # Mock wallet pasar kripto (ETH, SOL, BTC) untuk hadiah roda
    ├── ui/
    │   ├── AuraSound.js         # Web Audio API Synthesizer (suara offline tanpa file MP3)
    │   ├── Icons.js             # Vektor SVG modern dan tajam
    │   ├── UIManager.js         # Notifikasi toast elegan dan input angka otomatis
    │   └── ViewManager.js       # Dynamic view mounting engine
    └── casino/
        ├── SlotEngine.js        # Engine Goldy Crush Slot (PixiJS + GSAP)
        ├── MahjongSlotEngine.js # Engine Mahjong Ways (PixiJS + GSAP)
        ├── ZeusSlotEngine.js    # Engine Zeus Gates (PixiJS + GSAP)
        ├── LotteryEngine.js     # Engine Mega Lottery
        ├── WheelEngine.js       # Engine Spinning Wheel (PixiJS + GSAP)
        ├── ParlayEngine.js      # Engine Parlay Bet
        └── SlotIcons.js         # Render vektor simbol slot
```
    ├── finance/
    │   └── FinanceManager.js    # Pengelolaan chip (TC), format angka, kalkulasi menang/kalah
    ├── trading/
    │   └── CryptoMarket.js      # Mock wallet pasar kripto (ETH, SOL, BTC) untuk hadiah roda
    ├── ui/
    │   ├── AuraSound.js         # Web Audio API Synthesizer (suara offline tanpa file MP3)
    │   ├── Icons.js             # Vektor SVG modern dan tajam
    │   ├── UIManager.js         # Notifikasi toast elegan dan input angka otomatis
    │   └── ViewManager.js       # Dynamic view mounting engine
    └── casino/
        ├── SlotEngine.js        # Engine Goldy Crush Slot
        ├── MahjongSlotEngine.js # Engine Mahjong Ways
        ├── ZeusSlotEngine.js    # Engine Zeus Gates
        ├── LotteryEngine.js     # Engine Mega Lottery
        ├── WheelEngine.js       # Engine Spinning Wheel
        ├── ParlayEngine.js      # Engine Parlay Bet
        └── SlotIcons.js         # Render vektor SVG & emoji simbol slot
```

---

## 🚀 Cara Menjalankan

Karena proyek ini menggunakan **ES Modules (ESM)** modern (`import`/`export`), jalankan file melalui web server lokal:

### Cara 1: Menggunakan npx serve / live-server
```bash
npx serve .
# atau
npx live-server
```
Lalu buka alamat browser yang muncul (contoh: `http://localhost:3000`).

### Cara 2: Menggunakan Python
```bash
python -m http.server 8000
```
Buka browser di `http://localhost:8000`.

### Cara 3: Menggunakan VS Code Live Server
Klik kanan pada `index.html` dan pilih **Open with Live Server**.

---

## 🎁 Fitur Spesial Bar Navigasi Atas

- **🪙 Saldo Real-time**: Menampilkan total koin Trilliun-Bet33 (TC) yang tersimpan secara lokal di browser Anda.
- **🎁 VIP Rewards & Quest Center**: Pusat klaim chip pintar yang menggantikan tombol instan lama:
  - **Klaim Berjangka (15-Minute Faucet)** dengan countdown timer anti-spam.
  - **Dana Talangan Darurat (VIP Bailout)** otomatis aktif jika saldo bangkrut (< 100K TC).
  - **Absensi 7 Hari (Daily Login Streak)** berhadiah kumulatif hingga 100M TC + Tiket Lotre gratis.
  - **Misi Harian (Daily Quests)** dan **Prestasi VIP (Achievements)** untuk mendapatkan jutaan chip dengan bermain aktif.
- **✨ Boost Luck**: Mode eksperimental untuk menguji peningkatan odds kemenangan (2.5× Multiplier).
- **🔊 Sound Toggle**: Kontrol aktif/nonaktif efek suara permainan secara instan.
- **🔄 Reset**: Mengembalikan saldo dan seluruh riwayat game ke pengaturan awal (10.000.000 TC).
