# 🪙 Trilliun-Bet33 — VIP Casino Suite (Powered by PixiJS & GSAP)

**Trilliun-Bet33** adalah platform mini-game kasino VIP modular dan mandiri (*standalone*) berbasis ES Modules, ditenagai oleh **PixiJS v7** (akselerasi grafis WebGL hardware 60 FPS) dan **GSAP 3** (animasi reels elastis, spring bounces, rolling number counters, dan visual FX Vegas-grade). Dilengkapi dengan **Dynamic Volatility & Pity Engine**, sistem efek suara **Web Audio API Synthesizer** offline (tanpa file MP3 eksternal), **VIP Rewards & Quest Center**, dukungan penuh ergonomi layar sentuh mobile (*Swipe-to-Spin*, *WakeLock*, *Haptics*), penyimpanan *state* reaktif (`localStorage`), serta antarmuka bertema neon emas mewah (*luxury dark casino*).

---

## 🎨 Teknologi Grafis, Audio & Sistem Inti

- **PixiJS v7 (WebGL 2D Renderer) & 2D Canvas Particle Engine**:
  - Rendering WebGL 60 FPS untuk mesin slot (*cascading reels*), simulasi fisika Plinko (pantai tropis & *vending machine*), *deep sea fishing crash*, serta roda keberuntungan 12 segmen dengan *outer LED chasing lights*.
  - **PixiEffects & CanvasParticleSystem**: Hujan 350+ koin emas/berlian 3D pada *Big Win & Jackpot*, koin terbang (*flying 3D chips*) ke bar saldo, serta partikel kabinet bertema khusus (Emas, Berlian, Api, dan Petir Olympus).
- **GSAP 3 (GreenSock Animation Platform)**:
  - Sekuens putaran reel dengan *anticipation pull-up* (`power1.in`), *staggered landing* berurutan, dan *mechanical spring bounce* (`Back.easeOut(1.8)`).
  - *Rolling number counters* (angka kemenangan bergulir naik secara dramatis) dan *squash & stretch micro-interactions* pada tombol aksi.
- **Casino Volatility & Pity Rate Engine (`CasinoVolatilityEngine.js`)**:
  - Pengarah matematika sesi dinamis yang mengatur *Hit Frequency*, *Near-Miss Teasers*, *Loss Disguised as Win (LDW)*, serta **Eruption Cycles** (ledakan runtuhan beruntun setelah rentetan kekalahan).
  - **Sistem Pity & Rate ON (`250 Spins`)**: Mengakumulasi progres keberuntungan lintas permainan dari *Normal (1.0×)*, *Menghangat (1.25×)*, *Tinggi (1.5×)*, *Sangat Tinggi (2.0×)*, hingga **🔥 RATE ON (3.5× GACOR)**.
- **Mobile & Touch Ergonomics (`MobileHandler.js`)**:
  - Deteksi perangkat & orientasi *real-time* (*Portrait/Landscape*) dengan sinkronisasi kanvas PixiJS otomatis dan kalkulasi `--vh` dinamis.
  - Gestur fisik **Pull-Down Swipe-to-Spin** langsung pada gulungan slot, *One-Thumb Quick Bet Bottom Sheet*, *Hardware Haptic Feedback* (`Vibration API`), dan **Screen WakeLock API** agar layar tidak redup saat *Auto-Spin*.
- **Offline Web Audio Synthesizer (`AuraSound.js`)**:
  - Menghasilkan seluruh efek suara kasino secara prosedural menggunakan osilator dan filter Web Audio API (denting koin, putaran mekanis, ledakan TNT, sambaran petir, desis soda, hingga fanfare kemenangan) tanpa ketergantungan aset audio eksternal.

---

## 🎰 Daftar Permainan & Engine (9 VIP Mini-Games)

### 1. Goldy Crush Slot — 6x3 Cascading & TNT Blast (`js/casino/SlotEngine.js`)
- Grid WebGL 6 kolom × 3 baris dengan sistem runtuhan (*cascading/tumble*) di atas fondasi `BaseSlotEngine`.
- **Signature Mechanic — TNT 3x3 Area Blast**: Simbol Dinamit (`🧨`) meledakkan area 3×3 di sekitarnya dan mengubah batuan tambang menjadi *bounty* instan.
- **Gold Rush Fever**: Pengali runtuhan bertingkat hingga **×10** (`x1 → x2 → x3 → x5 → x10`).

### 2. Mahjong Ways Macau — 6x8 Cascading & Transforming WILD (`js/casino/MahjongSlotEngine.js`)
- Grid megah 6 kolom × 8 baris dengan pustaka vektor ubin mahjong 3D berukir dan berlapis emas 24K (`MahjongSymbols.js`).
- **Signature Mechanic — Golden Plated Tiles & Transforming WILD**: Ubin berlapis emas di reel tengah yang ikut pecah dalam kombinasi menang akan bertransformasi menjadi **Naga Emas WILD (`🐉`)** untuk runtuhan berikutnya.
- **Mahjong Multiplier Bar**: Bar pengali interaktif di atas kabinet (`x1 → x2 → x3 → x5`).

### 3. Zeus: Gates of Olympus — 6x5 Pay Anywhere & Multiplier Orbs (`js/casino/ZeusSlotEngine.js`)
- Grid 6 kolom × 5 baris bertema kuil Olympus dengan partikel langit biru elektrik (`OLYMPUS_PARTICLE_PALETTE`).
- **Signature Mechanic 1 — Pay Anywhere (Scatter Pays)**: Simbol membayar di posisi mana saja jika muncul minimal **8 simbol** identik di layar tanpa terikat garis *payline*.
- **Signature Mechanic 2 — Multiplier Orbs (x2 – x100)**: Sambaran petir Zeus menurunkan bola pengali yang diakumulasikan ke **Olympus Multiplier Meter** untuk melipatgandakan total kemenangan runtuhan.

### 4. VIP 4D Togel — Singapore & Macau 4D Pools (`js/casino/LotteryEngine.js` & `LotteryView.js`)
- Terminal togel 4 angka mewah dengan ruang pengundian **4-Reel Mechanical Drum Tumbler** (`AS`, `KOP`, `KEPALA`, `EKOR`) dan dukungan pemakaian **Tiket Lotre Gratis (`🎟️`)**.
- **Multi-Market Betting**:
  - **4D / 3D / 2D Package**: Pilih kombinasi 4 digit manual atau acak (*Quick Pick*) dengan opsi centang paket 4D, 3D, dan 2D sekaligus.
  - **Pasar Cepat (Colok Bebas & 50:50)**: Taruhan instan 1 digit angka bebas atau tebakan 50:50 (*Besar/Kecil* & *Genap/Ganjil* pada digit Ekor).
- **4D Grand Jackpot Pool**: Jackpot progresif kumulatif yang terus bertambah dari setiap putaran.

### 5. Mega Fortune Wheel — Roda Keberuntungan & Kripto (`js/casino/WheelEngine.js`)
- Roda 12 segmen berbasis `PixiWheelStage.js` dengan animasi perlambatan gesekan fisik realistis (`power4.out`) dan pantulan jarum penunjuk (*flapper bounce*).
- Hadiah langsung berupa multiplier chip hingga **50×**, *Free Spins*, *Bonus Spins (3×)*, serta aset mata uang kripto (**ETH** & **SOL**) yang terhubung ke `CryptoMarket.js`.

### 6. European Football Parlay Sportsbook (`js/casino/ParlayEngine.js` & `ParlayView.js`)
- Terminal taruhan olahraga sepak bola Eropa dengan filter liga top dunia (**Champions League, Premier League, La Liga, Serie A, Bundesliga**).
- **Multi-Market Selection**: Pasang tiket kombo (*Mix Parlay*) lintas pertandingan dengan pasar **1X2 (Home/Draw/Away)**, **Over/Under 2.5 Goals**, dan **BTTS (Both Teams To Score)** serta kalkulasi total odds perkalian otomatis.
- **Live Matchday Simulation Broadcast**: Simulasi pertandingan *real-time* menit demi menit (`0'` hingga `90'`) lengkap dengan papan skor langsung, *commentary ticker*, dan status tiap leg tiket (*Tembus / Gagal*).

### 7. Golden Marlin: Deep Sea Strike — Fishing Crash (`js/casino/CrashEngine.js`)
- Ditenagai `PixiFishingStage.js` (WebGL 60 FPS) dengan visual siluet ikan kedalaman samudera, ketegangan tali pancing dinamis, dan tarikan ikan marlin raksasa.
- **Real-Time Multiplier Fight & Strike Cash Out**: Pengali melesat dari `1.00x` hingga **10.000× Monster Catch**—tarik pancing (*STRIKE*) sebelum tali putus (*snap*).
- **Dual Independent Rod Slips (Joran 1 & Joran 2)**: Pasang dua joran pancing secara bersamaan dengan konfigurasi taruhan dan target **Auto-Strike** terpisah per joran.

### 8. Tiki Coco Drop Plinko — Tropical Beach Physics (`js/casino/PlinkoEngine.js`)
- Ditenagai `PixiPlinkoStage.js` (WebGL 60 FPS) dengan simulasi gravitasi buah kelapa organik, pantulan pasak bambu, dan partikel percikan air kelapa.
- **Multi-Risk & Row Selectors (8–16 Baris)**: Pilihan tingkat risiko (*Rendah, Sedang, Sultan*) dan kerapatan pasak dengan payout hingga **1.000× Maxwin**.
- **Golden Coconut & Coconut Rain**: Peluang munculnya Kelapa Emas (**2× lipat payout**) serta mode semburan hujan kelapa (*5x, 10x, dan Auto-Drop*).

### 9. Pop Drink! Vending Machine Plinko (`js/casino/PopDrinkEngine.js`)
- Ditenagai `PixiVendingStage.js` (WebGL 60 FPS) dengan visual lemari *vending machine* neon, rak kawat berembun, dan efek suara kaleng soda berdentang.
- **Vending Can Physics & Sultan 24K Golden Can**: Kaleng minuman aneka rasa memantul melintasi pasak spiral menuju baki pengambilan di bawah, dilengkapi peluang kaleng emas 24K (**2× lipat payout**) serta mode *Vending Rush (5x)*, *Party Pack (10x)*, dan *Auto-Vend*.

---

## 🏗️ Struktur Arsitektur & Penjelasan Modul

Proyek ini dirancang dengan arsitektur modular tanpa *bundler* wajib (murni ES Modules native) yang memisahkan **State & Ekonomi**, **Engine Logika Game**, **View/Template HTML**, **Stage Grafis WebGL**, dan **Layanan UI/Mobile**:

```text
Trilliun-Bet33/
├── index.html                           # Shell utama aplikasi (memuat font, CSS, PixiJS, GSAP, & main.js)
├── package.json                         # Konfigurasi dependensi npm (pixi.js, gsap)
├── PARLAY_GAMEPLAY_DESIGN.md            # Dokumen spesifikasi desain mekanisme Parlay Sportsbook
├── README.md                            # Dokumentasi utama proyek
├── css/
│   └── style.css                        # Desain tema mewah neon emas, layout responsif, & animasi CSS
└── js/
    ├── main.js                          # Entrypoint aplikasi: inisialisasi modul, top-bar, & event global
    ├── GamblingPanel.js                 # Controller utama VIP Grand Lobby, navigasi drawer, & switcher 9 game
    │
    ├── core/                            # 🧠 Lapisan State & Penyimpanan
    │   └── GameState.js                 # State management reaktif (event emitter) dengan persistensi localStorage
    │
    ├── finance/                         # 💰 Lapisan Ekonomi & Transaksi
    │   └── FinanceManager.js            # Manajemen saldo Trilliun Chip (TC), validasi taruhan, & pemformatan mata uang
    │
    ├── rewards/                         # 🎁 Lapisan Gamifikasi & Retensi
    │   └── RewardManager.js             # Mesin Faucet 15 menit, VIP Bailout, Daily Login Streak 7 hari, Misi Harian, & Prestasi
    │
    ├── trading/                         # 📈 Lapisan Dompet Aset Digital
    │   └── CryptoMarket.js              # Simulasi portofolio & konversi hadiah kripto (BTC, ETH, SOL) dari Wheel
    │
    ├── graphics/                        # 🎨 Lapisan Rendering WebGL (PixiJS) & Partikel 2D
    │   ├── PixiSlotStage.js             # Renderer WebGL gulungan mesin slot (masking, blur, tumble/cascade)
    │   ├── PixiWheelStage.js            # Renderer WebGL roda keberuntungan 12 segmen & lampu LED
    │   ├── PixiFishingStage.js          # Renderer WebGL memancing laut dalam untuk Golden Marlin Crash
    │   ├── PixiCrashStage.js            # Renderer WebGL alternatif bertema roket luar angkasa (Legacy/Alternate)
    │   ├── PixiPlinkoStage.js           # Renderer WebGL fisika pantai tropis untuk Tiki Coco Drop Plinko
    │   ├── PixiVendingStage.js          # Renderer WebGL mesin penjual minuman untuk Pop Drink! Plinko
    │   ├── PixiEffects.js               # Efek visual global: modal Big Win, hujan koin WebGL, & flying 3D chips
    │   └── CanvasParticleSystem.js      # Sistem partikel Canvas 2D ringan (emas, berlian, percikan api, & debu)
    │
    ├── ui/                              # 🔊 Lapisan Antarmuka, Audio Prosedural & Ergonomi Mobile
    │   ├── AuraSound.js                 # Web Audio API Synthesizer offline (seluruh SFX game & musik kemenangan)
    │   ├── MobileHandler.js             # Handler mobile: Swipe-to-Spin, Quick Bet Sheet, Haptics, & Screen WakeLock
    │   ├── MobileExperience.js          # Wrapper kompatibilitas mundur yang mengekspor MobileHandler
    │   ├── UIManager.js                 # Komponen UI umum: notifikasi toast, modal, & pemformat input angka ribuan
    │   ├── ViewManager.js               # Pengelola mounting tampilan dinamis ke dalam kontainer DOM
    │   └── Icons.js                     # Kumpulan ikon vektor SVG antarmuka pengguna
    │
    └── casino/                          # 🎰 Lapisan Engine & View Permainan Kasino
        ├── BaseSlotEngine.js            # Kelas induk bersama untuk seluruh mesin slot (kabinet, taruhan, auto-spin, cascade)
        ├── CasinoVolatilityEngine.js    # Pengarah matematika sesi, volatilitas, near-miss, eruption, & Pity Rate ON
        ├── SlotEngine.js                # Engine Goldy Crush Slot 6x3 (mewarisi BaseSlotEngine + mekanik TNT Blast)
        ├── MahjongSlotEngine.js         # Engine Mahjong Ways 6x8 (mewarisi BaseSlotEngine + ubin emas jadi WILD)
        ├── ZeusSlotEngine.js            # Engine Gates of Olympus 6x5 (mewarisi BaseSlotEngine + Scatter Pays & Orbs)
        ├── SlotIcons.js                 # Koleksi aset SVG simbol mesin slot (Goldy Crush & Zeus Olympus)
        ├── MahjongSymbols.js            # Pustaka simbol ubin Mahjong 3D & varian lapis emas 24K
        ├── mahjong_symbols.csv          # Tabel referensi bobot dan pengali simbol Mahjong
        ├── LotteryEngine.js             # Logika inti VIP 4D Togel (paket 4D/3D/2D, Colok Bebas, 50:50, & pengundian)
        ├── LotteryView.js               # Renderer template HTML & CSS terpisah untuk terminal VIP 4D Togel
        ├── ParlayEngine.js              # Logika inti Parlay Sepak Bola Eropa, generator jadwal, & simulasi skor 90 menit
        ├── ParlayView.js                # Renderer template HTML & CSS terpisah untuk kartu jadwal, slip, & arena live
        ├── WheelEngine.js               # Engine logika Mega Fortune Wheel & distribusi hadiah kripto/chip
        ├── CrashEngine.js               # Engine logika Golden Marlin Fishing Crash (Dual Rod & Auto-Strike)
        ├── PlinkoEngine.js              # Engine logika Tiki Coco Drop Plinko (multi-risiko, 8-16 baris, kelapa emas)
        └── PopDrinkEngine.js            # Engine logika Pop Drink! Vending Machine Plinko (kaleng emas 24K & multi-vend)
```

### 🔄 Alur Kerja Arsitektur Utama

1. **Inisialisasi (`js/main.js`)**:
   Saat halaman dimuat, `main.js` menginisialisasi `mobileHandler`, `ui`, dan `rewardManager`, menyinkronkan tampilan saldo di header dari `gameState`, lalu memanggil `gamblingPanel.show()`.
2. **Manajemen Lobby & Permainan (`js/GamblingPanel.js`)**:
   Menampilkan **VIP Casino Grand Lobby** sebagai halaman utama yang memamerkan kartu klaim cepat, progres misi harian, indikator *Pity Luck Rate*, dan katalog 9 permainan. Saat pengguna memilih salah satu permainan, `GamblingPanel` me-*mount* HTML permainan tersebut dan mengikat event interaktifnya (`bindEvents`).
3. **Pola Pewarisan Mesin Slot (`js/casino/BaseSlotEngine.js`)**:
   Ketiga mesin slot (`SlotEngine`, `MahjongSlotEngine`, `ZeusSlotEngine`) mewarisi `BaseSlotEngine` sehingga berbagi kode kabinet, kontrol taruhan, *Auto-Spin*, *Turbo Mode*, integrasi `PixiSlotStage`, dan siklus *cascade*, sambil mengimplementasikan mekanik unik masing-masing melalui *hook methods*.
4. **Pemisahan Engine & View (`LotteryView.js` & `ParlayView.js`)**:
   Untuk menjaga kebersihan kode pada game berbasis antarmuka kompleks (Togel 4D dan Sportsbook Parlay), seluruh logika kalkulasi dan *state* disimpan di `*Engine.js`, sedangkan pembuatan markup HTML dan gaya CSS terisolasi di dalam `*View.js`.
5. **Reaktivitas Saldo & Volatilitas (`GameState.js`, `FinanceManager.js`, `CasinoVolatilityEngine.js`)**:
   Setiap taruhan dan kemenangan diproses melalui `financeManager` yang memperbarui `gameState` (`localStorage`) dan memancarkan event `balanceChanged`. Kekalahan beruntun dicatat ke `casino.ratePlays` yang secara reaktif meningkatkan *multiplier* keberuntungan di `CasinoVolatilityEngine` hingga memicu mode **RATE ON (3.5× GACOR)**.

---

## 🚀 Cara Menjalankan

Karena proyek ini menggunakan **ES Modules (ESM)** modern (`import`/`export`), jalankan melalui web server HTTP lokal:

### Cara 1: Menggunakan `npx serve` / `live-server`
```bash
npx serve .
# atau
npx live-server
```
Buka alamat yang muncul di terminal (contoh: `http://localhost:3000`).

### Cara 2: Menggunakan Python HTTP Server
```bash
python -m http.server 8000
```
Buka browser di `http://localhost:8000`.

### Cara 3: Menggunakan Ekstensi VS Code Live Server
Klik kanan pada file `index.html` dan pilih **Open with Live Server**.

---

## 🎁 Fitur Bar Navigasi Atas & VIP Rewards Center

- **🪙 Saldo Real-time**: Menampilkan total saldo Trilliun Chip (`TC`) beserta format ringkasnya yang tersimpan otomatis di `localStorage` browser.
- **🎁 Klaim & Misi (`RewardManager.js`)**: Membuka modal pusat hadiah terpadu yang mencakup:
  - **Klaim Berjangka (15-Minute Faucet)**: Klaim **5.000.000 TC** gratis setiap 15 menit.
  - **Dana Talangan Darurat (VIP Bailout)**: Bantuan instan **5.000.000 TC** yang otomatis terbuka saat saldo di bawah `100.000 TC`.
  - **Absensi 7 Hari (Daily Login Streak)**: Hadiah beruntun mulai dari `5M TC` di Hari 1 hingga **100M TC + 5 Tiket Lotre Gratis** di Hari 7.
  - **Misi Harian (Daily Quests) & Prestasi VIP (Achievements)**: Tantangan interaktif lintas permainan (Slot, Wheel, Togel, Parlay, Fishing Crash, Plinko, Pop Drink) dengan hadiah puluhan juta chip.
- **🔥 Indikator Rate & Pity Meter**: Menampilkan status keberuntungan sesi saat ini (`Normal` hingga `RATE ON 250/250`).
- **🔊 Sound Toggle**: Mengaktifkan atau membisukan seluruh efek suara Web Audio Synthesizer secara instan.
- **🔄 Reset**: Mengembalikan saldo ke nilai awal (**10.000.000 TC**) dan mengatur ulang progres sesi.
