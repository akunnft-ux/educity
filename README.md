# EduCity — Game Latihan TKA SD (Matematika)

Game kota 2D berbasis HTML5 untuk siswa kelas 5–6 SD/MI. Siswa membangun kota dengan cara
**menguasai materi**: setiap subtopik Matematika yang dikuasai membuka atau merenovasi satu
bangunan. Implementasi mengikuti `prd.md` di folder ini.

Tidak ada backend, tidak ada iklan, tidak ada pelacak pihak ketiga. Seluruh progres disimpan
di `localStorage` perangkat.

## Menjalankan

Game memakai ES modules, jadi harus dibuka lewat HTTP (bukan `file://`):

```bash
cd Games
python3 -m http.server 8080
# buka http://localhost:8080
```

Atau `npm start` (skrip yang sama).

## Struktur

```
index.html                  shell aplikasi (loading, login, HUD, nav)
manifest.json, sw.js        PWA: installable + cache offline
styles/main.css             design system + seluruh komponen UI
data/
  curriculum.js             21 subtopik, 3 domain, prasyarat, bobot domain
  lessons.js                pelajaran singkat per subtopik (konsep + worked example)
js/
  main.js                   app shell: boot, login, router layar, peta, HUD
  core/
    Storage.js              persistensi localStorage + migrasi + ekspor/impor
    GameState.js            state reaktif (subscribe/notify) + streak
    MasteryService.js       theta (Elo/1PL), kriteria penguasaan, retensi, estimasi skor
    QuestionEngine.js       generator soal parametrik 21 subtopik × L1/L2/L3 + validator
    AssetLoader.js          loader spritesheet/audio dengan penanganan kegagalan
  scenes/
    CityMapScene.js         renderer peta kota (canvas, NPC, kamera, animasi)
    QuestionScene.js        komponen soal: timer, petunjuk, umpan balik miskonsepsi
  screens/                  Perpustakaan, Arena, sesi latihan, Tryout CBT, dasbor,
                            buku kesalahan, toko, misi harian, pengaturan
  ui/dom.js                 helper DOM + modal + toast (aksesibel)
assets/                     spritesheet, audio, ikon (paket EduCity_Full_Assets)
tests/                      unit test mesin soal & state, plus E2E Playwright
```

## Mekanik belajar

| Konsep | Implementasi |
| --- | --- |
| Mastery gate | Boss 8 soal (≥2 L3), akurasi ≥85% + ≥1 L3 benar, **dua kali di hari berbeda** |
| Status bangunan | `locked` → `building` → `mastered` → `strong` (lolos retensi H+7) |
| Kemampuan (θ) | `P = 1/(1+e^-(θ-b))`, `θ += K(hasil-P)`, K 0,4 → 0,15 |
| Latihan adaptif | Soal dipilih yang paling dekat dengan peluang benar 0,7 |
| Pengulangan berjarak | Antrean H+1, H+3, H+7, H+21 dijadwalkan saat status Dikuasai |
| Buku kesalahan | Item keluar setelah benar di **2 hari berbeda** |
| Anti-akal-akalan | Jawaban <2 detik tidak dihitung ke penguasaan; opsi & angka diacak per percobaan |
| Mode Bantu | 3 salah beruntun → petunjuk otomatis; siswa tidak dikeluarkan |
| Tryout CBT | 30 soal/75 menit (penuh), 10/25 (mini), navigasi nomor, tanda ragu, tanpa umpan balik |
| Privasi | Data minimal, persetujuan orang tua saat login, ekspor & hapus data dari Pengaturan |

Estimasi skor TKA selalu ditampilkan sebagai **rentang** dan hanya muncul setelah minimal satu
tryout — sesuai PRD Bab 9 (tidak ada klaim jaminan nilai).

## Konten soal

Generator parametrik menghasilkan soal baru setiap percobaan (angka & urutan opsi diacak),
21 subtopik × 3 level kognitif:

- **Bilangan** B1–B9 (nilai tempat, operasi campuran, FPB/KPK, pecahan, desimal/persen,
  perbandingan/kecepatan, bilangan bulat, pangkat/akar, pola)
- **Geometri & Pengukuran** G1–G8 (bangun datar, sudut, bangun ruang, volume, satuan,
  simetri/transformasi, koordinat, lingkaran)
- **Data** D1–D4 (tabel/diagram, mean/median/modus, penyajian data, peluang)

Setiap item punya 1 kunci jawaban, 3 pengecoh ber-tag miskonsepsi, 2–3 petunjuk bertingkat,
pembahasan, perkiraan waktu, dan `difficulty_b`. Setiap opsi salah dipetakan ke penjelasan
miskonsepsi di UI.

## Pengujian

```bash
npm test              # unit test mesin soal + state (60 test)
npm run test:e2e      # E2E Playwright, butuh playwright-core + Chromium
```

`npm test` memverifikasi antara lain: 21×3 kombinasi subtopik/level menghasilkan item valid
(25.200 sampel), kunci jawaban konsisten dengan solver, tidak ada opsi duplikat/placeholder,
distribusi posisi jawaban merata, matematika jawaban benar (pecahan, luas, volume,
keliling lingkaran, kecepatan), kriteria boss (termasuk kasus 100% tanpa L3 dan dua hari
berbeda), penjadwalan retensi, serta migrasi storage.

E2E menjalankan alur nyata di Chromium (mobile 390×844 dan desktop 1440×900): login +
validasi, pra-cek, peta, pelajaran, boss, tryout CBT (flag/answered/report), dasbor 3 tab,
misi, buku kesalahan, toko, pengaturan, persistensi setelah reload, dan logout.

## Deployment

Situs statis. Unggah folder `Games/` ke hosting statis apa pun (GitHub Pages, Netlify,
Vercel, Nginx). Tidak ada variabel lingkungan atau rahasia. Untuk PWA, sajikan lewat HTTPS
agar service worker aktif.

### GitHub Pages (rekomendasi)

1. Buat repo baru (mis. `educity`).
2. Salin **isi folder `Games/`** ke **root repo** (bukan folder `Games/`). Atau salin ke folder `docs/` lalu pilih source `docs/` di Settings → Pages.
3. Pastikan ada file `.nojekyll` di root (sudah termasuk) agar Jekyll tidak memproses file yang diawali `_`.
4. Push ke branch `main`.
5. Settings → Pages → **Deploy from a branch** → `main` / `(root)` (atau `/docs` jika pakai folder `docs`).
6. Tunggu 1–2 menit. Buka `https://<user>.github.io/<repo>/`.
7. HTTPS otomatis → service worker aktif; load pertama meng-cache untuk offline.

Semua path relatif (`./js/...`, `assets/...`) sudah kompatibel di subpath.

### Verifikasi cepat

```bash
# Lokal
cd Games
python3 -m http.server 8080
# buka http://localhost:8080
```

### Catatan

- Font Google butuh internet saat load pertama; offline PWA pakai fallback font sistem.
- Double-click `index.html` (file://) **tidak akan jalan** — ES Modules + `fetch` diblokir browser. Lihat pesan di layar loading untuk petunjuk server lokal.

## Batasan yang disengaja

- Belum ada backend/Supabase, akun guru, atau sinkronisasi lintas perangkat — PRD Bab 14
  mengusulkan Supabase; versi ini adalah klien offline-first yang berfungsi penuh sendiri.
- Konten soal adalah templat parametrik, belum melalui review guru (PRD Bab 8 gerbang
  kualitas). Jangan pakai sebagai pengganti kisi-kisi resmi sebelum validasi pilot.
- Klaim efektivitas belum diuji; PRD Bab 16 mensyaratkan pilot sebelum klaim publik apa pun.
