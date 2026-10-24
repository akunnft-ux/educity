# PRD EduCity TKA — Game Latihan Persiapan TKA SD

Versi 1.0 (draft) · 21 Oktober 2026 · Pemilik produk: Rudi Hartono · Pembaca: pengembang dan AI agent (OpenCode)

## 0. Catatan penting: soal 'jaminan nilai tinggi'

Tidak ada game yang bisa menjamin nilai ujian seorang anak. Yang bisa dirancang dan diukur adalah **mekanisme penguasaan (mastery)**: anak tidak bisa maju sebelum terbukti menguasai suatu materi berulang kali, dalam kondisi yang menyerupai TKA. PRD ini dibuat agar peluang nilai tinggi sebesar mungkin, dan **klaim hasil hanya boleh dipublikasikan setelah lolos validasi pilot (Bab 16)**. Jika klaim 'pasti naik' dipakai tanpa bukti, itu menyesatkan orang tua.

Catatan cakupan: TKA SD menguji **dua mapel, Matematika dan Bahasa Indonesia**. Versi 1.0 mengerjakan Matematika penuh lebih dulu. Bahasa Indonesia masuk Fase 2 (Bab 6B). Siswa yang hanya berlatih Matematika tidak otomatis siap untuk keseluruhan TKA.

## 1. Ringkasan produk

EduCity adalah game kota 2D (HTML5, bisa dimainkan di HP dan laptop) untuk siswa kelas 5–6 SD/MI. Siswa membangun kota dengan cara **menguasai materi**: setiap subtopik Matematika yang dikuasai membuka atau merenovasi sebuah bangunan. Game ini bukan kumpulan kuis. Di dalamnya ada tes diagnostik, pelajaran singkat, latihan adaptif, ujian penguasaan (boss), pengulangan berjarak, buku kesalahan, dan **tryout berformat CBT** yang menyerupai TKA sungguhan.

## 2. Konteks TKA SD (fakta yang dipakai, harus diverifikasi ulang)

- TKA untuk kelas 6 SD/MI, mapel **Matematika dan Bahasa Indonesia**, berbasis komputer (CBT). Tidak wajib dan bukan penentu kelulusan.
- Pelaksanaan 2026: 20–30 April 2026, hasil nasional diumumkan 24 Mei 2026. **Jadwal TKA SD 2027 belum terkonfirmasi** (Tugas T-001).
- Matematika dilaporkan **30 soal dalam 75 menit** (sumber media). Rencana awal pemerintah sempat menyebut 60 menit per mapel, sehingga durasi dan jumlah soal dibuat **konfigurabel** dan dikonfirmasi ke dokumen resmi Pusmendik.
- Matriks materi Matematika: **Bilangan, Geometri dan Pengukuran, Data**. Rujukan: Kurikulum 2013 dan Kurikulum Merdeka.
- Kompetensi yang diukur: pengetahuan matematika (fakta, konsep, prinsip, prosedur), representasi matematika, dan penyelesaian masalah (soal cerita/konteks nyata).
- Soal memuat unsur **HOTS** (penalaran) dan **multimodal** (tabel, infografis, diagram sebagai sumber informasi).
- Sebagian soal dibuat pusat, sebagian oleh pemerintah daerah. Ini berarti variasi gaya soal nyata ada. Latihan harus melatih konsep, bukan menghafal pola soal.

## 3. Tujuan, bukan-tujuan, dan metrik

**Tujuan**

- G1. Siswa menguasai seluruh subtopik Matematika TKA SD sampai level penalaran (HOTS).
- G2. Siswa terbiasa dengan antarmuka dan tekanan waktu CBT sehingga tidak kehilangan nilai karena teknis.
- G3. Kesalahan dan miskonsepsi terdeteksi dan diperbaiki, bukan hanya diberi skor.
- G4. Belajar rutin (15–25 menit per hari) bertahan sampai hari ujian.
- G5. Orang tua dan guru melihat kemajuan nyata dan tahu apa yang perlu dilakukan.

**Bukan-tujuan**: menyalin atau membocorkan soal asli TKA; iklan; konten berbayar yang memengaruhi pembelajaran; chat publik antaranak; menggantikan guru.

| Metrik | Target (setelah pilot) |
| --- | --- |
| Kenaikan skor tryout (pra ke pasca, skala 100) | rata-rata ≥ +10 poin; ≥ 70% siswa naik |
| Siswa yang menyelesaikan ≥ 90% kurikulum dan ≥ 3 tryout lalu mendapat tryout ≥ 80 | ≥ 70% (target keras, divalidasi pilot) |
| Akurasi estimasi skor vs hasil tryout (korelasi) | ≥ 0,7 |
| Retensi: siswa aktif ≥ 4 hari per minggu pada minggu ke-4 | ≥ 50% |
| Subtopik berstatus Kuat setelah ulang H+7 | ≥ 75% dari yang Dikuasai |

## 4. Pengguna

- **Siswa** (10–12 tahun): butuh tampilan sederhana, instruksi pendek, hadiah yang cepat tetapi tidak menghambat belajar, dan tidak boleh merasa dihukum karena salah.
- **Orang tua**: butuh laporan mingguan yang mudah dibaca dan 3 saran tindakan konkret.
- **Guru**: butuh peta miskonsepsi kelas dan ekspor data.
- **Admin konten** (pemilik produk): butuh CMS bank soal, validator otomatis, dan statistik kualitas soal.

## 5. Prinsip pedagogis dan keputusan desain

| Prinsip | Implementasi di game |
| --- | --- |
| Mastery learning | Bangunan terbuka hanya jika kriteria penguasaan terpenuhi (Bab 7) |
| Diagnostik dahulu | Tes awal menghasilkan peta penguasaan; siswa tidak mengulang yang sudah bisa |
| Retrieval practice | Latihan berupa pengerjaan soal, bukan membaca; pelajaran ≤ 4 menit |
| Spaced repetition | Antrean ulang H+1, H+3, H+7, H+21 dengan soal varian |
| Interleaving | Misi harian mencampur subtopik; tryout mencampur semua |
| Worked example lalu faded | Contoh dikerjakan penuh, lalu langkah dikurangi bertahap |
| Umpan balik pada kesalahan | Setiap opsi salah diberi tag miskonsepsi dan penjelasan singkat |
| Scaffolding HOTS | Soal penalaran diberi petunjuk bertingkat; petunjuk menurunkan XP, bukan akurasi |
| Latihan sesuai kondisi ujian | Tryout CBT, timer, tanda ragu, tanpa umpan balik di tengah ujian |
| Motivasi sehat | Hadiah untuk proses dan peningkatan; kehilangan hati tidak menghentikan belajar |

## 6. Cakupan kurikulum (draft, difinalkan terhadap kisi-kisi resmi lewat T-001)

Setiap subtopik punya 3 level kognitif: **L1** pengetahuan/pemahaman, **L2** penerapan, **L3** penalaran/HOTS. Sebagian soal wajib multimodal (tabel, grafik, diagram).

| Domain | Kode | Subtopik |
| --- | --- | --- |
| Bilangan | B1 | Bilangan cacah besar dan nilai tempat |
|  | B2 | Operasi hitung campuran dan urutan operasi |
|  | B3 | FPB, KPK, dan soal cerita |
|  | B4 | Pecahan: senilai, urutan, operasi (biasa, campuran) |
|  | B5 | Desimal dan persen; konversi antarbentuk |
|  | B6 | Perbandingan, skala, kecepatan-jarak-waktu, debit |
|  | B7 | Bilangan bulat (negatif) dan garis bilangan |
|  | B8 | Pangkat dua/tiga dan akar |
|  | B9 | Pola bilangan |
| Geometri dan Pengukuran | G1 | Bangun datar: sifat, keliling, luas (termasuk gabungan) |
|  | G2 | Sudut: jenis, pengukuran, sudut jam |
|  | G3 | Bangun ruang: sifat dan jaring-jaring |
|  | G4 | Volume dan luas permukaan |
|  | G5 | Satuan panjang, berat, waktu, volume; konversi |
|  | G6 | Simetri dan transformasi sederhana |
|  | G7 | Koordinat kartesius dan posisi |
|  | G8 | Lingkaran: keliling dan luas |
| Data | D1 | Membaca tabel dan diagram (batang, garis, lingkaran, piktogram) |
|  | D2 | Mean, median, modus |
|  | D3 | Menyajikan data |
|  | D4 | Peluang sederhana (hanya jika ada di kisi-kisi resmi) |

Bobot tiap domain pada skor estimasi mengikuti proporsi di kisi-kisi resmi (nilai bobot diisi setelah T-001).

**6B. Bahasa Indonesia (Fase 2, PRD tambahan).** Fokus literasi membaca: teks informasi dan sastra, kompetensi menemukan informasi, menafsirkan dan mengintegrasikan, serta mengevaluasi. Teks harus multimodal (infografis, tabel). Di kota: 'Koran Kota' dan 'Perpustakaan' menjadi arena latihan. Mesin soal, mastery, dan tryout dipakai ulang dari Matematika.

## 7. Konsep game dan alur belajar

**Peta kota (EduCity).** Kota terbagi tiga distrik: Bilangan, Geometri dan Pengukuran, Data. Setiap subtopik adalah satu bangunan dengan status: Terkunci, Dibangun (sedang belajar), Dikuasai, Kuat (lolos ulang H+7). Kota yang ramai berarti penguasaan yang luas.

| Bangunan | Fungsi |
| --- | --- |
| Rumah | Profil, target harian, jadwal, ganti avatar, ringkasan mingguan |
| Sekolah | Tes diagnostik awal dan Tryout CBT |
| Perpustakaan (knowledge) | Pelajaran singkat per subtopik: visual interaktif, worked example |
| Arena (challenge) | Latihan adaptif dan Boss penguasaan |
| Toko (shop) | Tukar koin dengan kosmetik (avatar, dekorasi). Tidak memengaruhi soal |

**Siklus 5 langkah per subtopik**

1. **Pra-cek** (3 soal). Jika sudah lancar, langsung ke Boss.
2. **Pelajari** (Perpustakaan): konsep, worked example, 2 soal faded.
3. **Latih** (Arena): 8–12 soal adaptif, L1 ke L3, target peluang benar sekitar 70%.
4. **Boss** (mastery gate): 8 soal tanpa petunjuk, berisi minimal 2 soal L3.
5. **Retensi**: soal varian muncul lagi di H+1, H+3, H+7, H+21 lewat Misi Harian.

**Kriteria penguasaan.** Subtopik berstatus *Dikuasai* jika akurasi Boss ≥ 85% pada **dua Boss berbeda di hari berbeda** dan minimal satu soal L3 benar. Status *Kuat* jika lolos retensi H+7. Distrik dinyatakan tuntas jika semua subtopiknya Dikuasai. Jika Boss gagal, game menunjukkan miskonsepsi yang paling sering muncul dan mengarahkan ke pelajaran remedial pendek, bukan sekadar mengulang.

**Loop harian (15–25 menit), Misi Harian 3 slot:** (a) Lanjutkan materi baru, (b) Ulang dari antrean retensi dan Buku Kesalahan, (c) Tantangan HOTS atau multimodal. Selesai tiga slot memberi bonus streak.

**Gamifikasi yang sehat.** XP, level, koin, streak (dengan 1 pembeku streak per minggu), kosmetik. Hati hanya sebagai indikator: setelah 3 salah beruntun masuk *Mode Bantu* (petunjuk bertahap), siswa tidak dikeluarkan. Leaderboard hanya opt-in per kelas dan menilai **peningkatan**, bukan skor mutlak. Tidak ada pembelian uang nyata.

**Anti-akal-akalan.** Jawaban terlalu cepat berulang (< 2 detik) ditandai dan tidak dihitung ke penguasaan; angka dan opsi soal diacak per percobaan; opsi salah dibuat dari miskonsepsi nyata, bukan acak.

## 8. Mesin soal (question engine)

**Tipe soal** (disesuaikan dengan format resmi, verifikasi di T-001): pilihan ganda, pilihan ganda kompleks (lebih dari satu jawaban), menjodohkan atau benar-salah dalam tabel, isian numerik singkat, drag and drop (urut/kelompok), dan interaktif diagram (membaca grafik, menandai titik koordinat).

**Bank soal target**

- Per subtopik ≥ 60 item: 20 L1, 25 L2, 15 L3.
- Sekitar 70% dari **templat parametrik** (angka dan konteks diacak), 30% disusun manual, terutama HOTS.
- Bank tryout terpisah: 12 paket × 30 soal (360 soal) yang **tidak pernah muncul** di latihan.

**Atribut tiap item (lihat Lampiran A):** subtopik, level kognitif, tipe, kesulitan awal, konteks, tag miskonsepsi per opsi, pembahasan, petunjuk 3 tingkat, perkiraan waktu.

**Gerbang kualitas (wajib sebelum soal aktif)**

1. Kunci jawaban diverifikasi **solver kode deterministik**, bukan hanya oleh AI.
2. Review guru: 100% soal HOTS dan minimal 20% sampel soal templat.
3. Bahasa setara kelas 5–6; satu ide per kalimat; konteks netral dan ramah budaya Indonesia (pasar, sawah, sekolah, olahraga).
4. Kalibrasi dari data pilot: tingkat kesulitan (p-value 0,2–0,9) dan daya beda; soal buruk dinonaktifkan otomatis.
5. AI boleh membuat draf soal. AI tidak boleh menjadi satu-satunya penjamin kebenaran. Soal asli atau bocoran TKA tidak boleh disalin.

**Renderer diagram.** Komponen untuk menggambar diagram batang, garis, lingkaran, tabel, bangun datar/ruang, dan bidang koordinat dari data item, sehingga soal multimodal bisa dibuat massal.

## 9. Mesin adaptif dan pengukuran

- **Kemampuan per subtopik (θ)** dengan model gaya Elo/IRT satu parameter: peluang benar P = 1 / (1 + e^-(θ − b)); pembaruan θ += K × (hasil − P), K=0,4 di awal lalu turun ke 0,15.
- **Pemilihan soal:** 70% di zona target (P ≈ 0,7), 20% ulang, 10% tantangan.
- **Waktu:** dicatat per soal. Target rata-rata sekitar 2,5 menit per soal (75 menit ÷ 30). Game melatih strategi *lewati dan tandai*.
- **Estimasi Skor TKA:** hanya muncul setelah ≥ 1 tryout penuh, selalu sebagai **rentang** (misalnya 70–78) dan berlabel *perkiraan*. Dikalibrasi ulang dari data pilot.
- **Peringatan dini:** siswa dengan kemajuan lambat atau tidak aktif 3 hari memicu saran ke orang tua dan guru.

## 10. Tryout CBT

- **Penuh:** 30 soal, 75 menit (konfigurabel), campuran semua domain sesuai bobot.
- **Mini:** 10 soal, 25 menit. **Per domain:** untuk menutup celah tertentu.
- Antarmuka: navigasi nomor soal, tanda ragu, timer, ringkasan sebelum kirim, tanpa umpan balik dan tanpa animasi hadiah selama ujian.
- Laporan: skor, skor per domain dan level kognitif, waktu per soal, soal terlewat, tanda ragu, daftar kesalahan dengan pembahasan.
- Jadwal: tryout penuh sekitar tiap 2 minggu; *Ujian Akhir Kota* (tryout penuh) menjadi gerbang akhir distrik.

## 11. Dasbor

- **Siswa:** peta penguasaan (heatmap), Buku Kesalahan, target dan streak.
- **Orang tua:** ringkasan mingguan, durasi belajar, estimasi skor (rentang), 3 saran tindakan.
- **Guru:** heatmap miskonsepsi kelas, daftar siswa berisiko, ekspor CSV.
- **Admin:** statistik kualitas soal, antrean review, versi soal.

## 12. Persyaratan fungsional

| ID | P | Persyaratan | Kriteria penerimaan |
| --- | --- | --- | --- |
| A1 | P0 | Masuk siswa dengan kode kelas, nama panggilan, PIN 4 digit; orang tua/guru dengan email | Masuk < 30 detik; tidak menyimpan data pribadi lain |
| A2 | P0 | Persetujuan orang tua sebelum data belajar disimpan di server | Tanpa persetujuan, data hanya lokal |
| B1 | P0 | Diagnostik awal adaptif lintas subtopik, bisa dijeda | Peta penguasaan awal ≥ 90% subtopik; total ≤ 45 menit (boleh 2 sesi) |
| C1 | P0 | Peta kota dengan status bangunan | Status sama persis dengan data penguasaan |
| C2 | P0 | Graf prasyarat antar subtopik | Subtopik terkunci hanya bisa dibuka via tes loncat |
| D1 | P0 | Pelajaran ≤ 4 menit per konsep (visual, worked example, 2 soal faded) | Tiap subtopik ≥ 1 pelajaran |
| E1 | P0 | Latihan adaptif 8–12 soal | Distribusi level mengikuti θ |
| E2 | P0 | Umpan balik per soal: benar/salah, pembahasan ≤ 2 kalimat + visual | 100% opsi salah punya tag miskonsepsi |
| E3 | P0 | Boss penguasaan 8 soal tanpa petunjuk | Sesuai kriteria penguasaan Bab 7 |
| E4 | P1 | Petunjuk 3 tingkat | Petunjuk menurunkan XP, bukan akurasi |
| F1 | P0 | Mesin adaptif θ per subtopik | Simulasi 1000 siswa sintetis: galat rata-rata θ < 0,3 logit setelah 30 soal |
| G1 | P0 | Antrean ulang H+1/3/7/21 | Soal ulang berupa varian, bukan identik |
| G2 | P0 | Buku Kesalahan | Item keluar setelah benar 2 kali di hari berbeda |
| H1 | P0 | Tryout penuh CBT | 30 soal, 75 menit (konfigurabel), tanpa umpan balik di tengah |
| H2 | P0 | Laporan tryout | Memuat semua elemen Bab 10 |
| H3 | P1 | Tryout mini dan per domain |  |
| I1 | P0 | XP, level, koin, streak, kosmetik Toko | Tidak ada pembelian uang nyata; kosmetik tidak memengaruhi soal |
| I2 | P1 | Misi Harian 3 slot |  |
| I3 | P2 | Leaderboard kelas opt-in berbasis peningkatan |  |
| J1 | P0 | Dasbor siswa dan orang tua | Sesuai Bab 11 |
| J2 | P1 | Dasbor guru | Heatmap miskonsepsi, ekspor CSV |
| K1 | P0 | CMS bank soal: impor JSON/CSV, validasi skema, versi | Item invalid ditolak dengan pesan jelas |
| K2 | P0 | Verifikasi kunci jawaban otomatis | 100% item aktif lolos solver |
| K3 | P1 | Statistik item (p-value, daya beda) | Item buruk dinonaktifkan otomatis |
| L1 | P0 | Telemetri event belajar (anonim) | Event Bab 14 terkirim |
| M1 | P1 | Narasi audio soal (TTS) dan mode font mudah dibaca |  |
| M2 | P1 | Mode offline untuk latihan, sinkron saat online | Tryout tetap butuh koneksi |

## 13. Persyaratan non-fungsional

- **Platform:** HTML5/PWA, Chrome Android dan desktop. Target HP Android 2 GB RAM, layar minimal 360×640, ≥ 30 FPS. Ukuran awal ≤ 20 MB, konten lain dimuat bertahap.
- **Aksesibilitas:** font ≥ 16 px, kontras AA, tombol sentuh ≥ 44 px, semua informasi penting tidak bergantung pada warna saja.
- **Privasi anak:** patuh UU Pelindungan Data Pribadi (UU 27/2022): data minimal (nama panggilan, kelas), persetujuan orang tua, tanpa iklan, tanpa chat publik, tanpa pelacak pihak ketiga, hak hapus data.
- **Keamanan:** autentikasi dan RLS di backend; soal tryout dan kuncinya hanya disajikan dari server saat ujian; pembatasan percobaan untuk mencegah tebak-tebakan berulang.
- **Kinerja:** respons soal berikutnya < 300 ms; penyimpanan progres otomatis tiap soal.
- **Bahasa:** seluruh teks dalam file i18n (awal Bahasa Indonesia), tidak ditanam di kode.

## 14. Arsitektur dan model data (usulan awal, dapat diganti)

- **Klien:** Godot 4.x, GDScript, ekspor HTML5/WebAssembly, aset dari paket EduCity\_Full\_Assets.
- **Backend:** Supabase (Auth, Postgres, RPC, RLS). Bank soal sebagai file JSON di repositori, divalidasi skrip, lalu diimpor ke database.
- **Tabel inti:** `profiles`, `classes`, `subtopics` (+ prasyarat), `items` (+ versi), `attempts`, `mastery_states`, `review_queue`, `mistake_book`, `sessions`, `tryouts`, `tryout_results`, `inventory`, `events`.
- **Event telemetri:** `item_answered` (waktu, hint, hasil), `lesson_completed`, `boss_result`, `tryout_submitted`, `session_start/end`, `mastery_changed`.
- **Modul klien:** MapScene, LessonScene, ArenaScene, BossScene, TryoutScene, DashboardScene, ShopScene, serta layanan `QuestionService`, `MasteryService`, `SyncService`.

## 15. Aset dan UI

Gunakan paket EduCity\_Full\_Assets (karakter, tile, bangunan, item, UI, VFX, audio). Tambahan yang diperlukan: potret NPC untuk dialog, ikon per domain, renderer diagram (Bab 8), animasi Boss, font yang jelas, pengisi suara/TTS opsional, dan tema UI khusus mode Tryout yang tenang.

## 16. Validasi efektivitas (syarat sebelum membuat klaim)

1. **Alfa:** 5–10 anak, observasi langsung; perbaiki kebingungan UI dan soal ambigu.
2. **Pilot 1:** 30–60 siswa, 4–6 minggu. Pra-tes = Tryout A, pasca-tes = Tryout B yang ekuivalen. Go jika rata-rata naik ≥ 10 poin, ≥ 70% siswa naik, dan korelasi estimasi skor ≥ 0,7.
3. **Pilot 2:** bila memungkinkan, ada kelas pembanding yang tidak memakai game.
4. **Hasil nasional:** bandingkan hasil TKA sungguhan pengguna dengan rata-rata sekolah (jika datanya tersedia).
5. Klaim publik hanya memakai angka yang terbukti, dan menyebut jumlah serta kondisi sampel.

## 17. Peta jalan (TKA SD berikutnya diperkirakan sekitar April 2027, belum terkonfirmasi; ±26 minggu dari sekarang)

| Tahap | Minggu | Keluaran |
| --- | --- | --- |
| M0 Fondasi | 1–2 | Verifikasi kisi-kisi dan format (T-001), skema item, graf prasyarat, bobot domain |
| M1 Irisan vertikal | 3–8 | Distrik Bilangan (B4 pecahan lengkap), siklus 5 langkah, mesin soal + validator, mesin adaptif, tryout mini |
| M2 Konten dan CBT | 9–14 | Tiga domain, bank soal ≥ 60%, tryout penuh 4 paket, dasbor siswa dan orang tua |
| M3 Pilot | 15–20 | Pilot 1, kalibrasi soal, dasbor guru, 12 paket tryout |
| M4 Penajaman | 21–26 | Perbaikan dari data, Bahasa Indonesia Fase 2 dimulai (PRD tambahan), persiapan peluncuran |

## 18. Risiko dan mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Kisi-kisi atau format TKA berubah | Format dan bobot konfigurabel; T-001 diulang tiap rilis kisi-kisi |
| Kualitas soal buruk atau kunci salah | Solver deterministik, review guru, statistik item, nonaktif otomatis |
| Anak bosan atau hanya mengejar hadiah | Hadiah berbasis proses, misi pendek, mastery tidak bisa dibeli |
| Tidak ada bukti efektivitas | Bab 16 wajib sebelum klaim |
| Perangkat siswa lemah | Target 2 GB RAM, aset ringan, mode offline |
| Privasi data anak | Data minimal, persetujuan orang tua, tanpa pihak ketiga |
| Siswa hanya latihan Matematika | Fase 2 Bahasa Indonesia; komunikasi jelas ke orang tua |
| Beban pembuatan soal besar | Templat parametrik, draf AI dengan verifikasi kode, prioritas subtopik berbobot tinggi |

## Lampiran A. Atribut item soal

`id`, `subtopic`, `level` (L1/L2/L3), `type`, `stem` (teks), `media` (data diagram), `options` (setiap opsi: teks, benar/salah, `misconception_tag`), `answer_spec`, `solver` (fungsi verifikasi), `difficulty_b` (awal), `est_seconds`, `hints[3]`, `explanation`, `context`, `template_params` (bila parametrik), `status`, `version`.

## Lampiran B. Definition of Done untuk setiap tugas (untuk pengembang dan AI agent)

- Kode, uji otomatis, dan skenario penerimaan lolos; tidak ada soal atau teks ditanam di kode.
- Perubahan skema lewat migrasi dan RLS diperbarui.
- Mastery dan adaptif punya uji simulasi, bukan hanya uji unit.
- Setiap fitur kecil yang mengubah perilaku belajar dicatat di telemetri.
- Dokumentasi singkat ditulis dan Bab terkait di PRD diperbarui.

## Lampiran C. Backlog awal

- T-001 Verifikasi kisi-kisi, bobot, durasi, bentuk soal, dan jadwal TKA SD berikutnya dari sumber resmi Pusmendik.
- T-002 Skema database dan RLS. T-003 Skema item dan validator impor.
- T-004 Mesin templat parametrik (10 templat pecahan lebih dulu). T-005 Renderer diagram.
- T-006 Mesin mastery dan adaptif beserta simulasi 1000 siswa sintetis.
- T-007 Scene peta kota. T-008 Siklus 5 langkah. T-009 Tryout CBT. T-010 Dasbor. T-011 Telemetri. T-012 Alat pilot (pra/pasca-tes dan laporan).

## Lampiran D. Pertanyaan terbuka

1. Engine final: Godot 4 (HTML5) sesuai asumsi, atau Phaser?
2. Kurikulum rujukan siswa target: K13 atau Merdeka (memengaruhi urutan materi)?
3. Model bisnis (gratis untuk sekolah, langganan orang tua, atau lisensi sekolah)?
4. Perangkat utama siswa (HP, laptop sekolah, atau campuran)?
5. Kapan jadwal resmi TKA SD berikutnya dan apakah format 30 soal / 75 menit tetap?
