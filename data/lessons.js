export const LESSONS = {
    B1: {
        title: 'Bilangan Cacah Besar & Nilai Tempat',
        duration: '3 menit',
        concept: 'Setiap angka pada bilangan punya nilai tempat. Posisi paling kanan adalah satuan, lalu puluhan, ratusan, ribuan, puluh ribuan, dan ratusan ribu.',
        worked: {
            problem: 'Berapa nilai tempat angka 7 pada bilangan 472.815?',
            steps: [
                'Urutkan nilai tempat dari kanan: satuan, puluhan, ratusan, ribuan, puluh ribuan, ratusan ribu.',
                'Angka 7 berada di posisi puluh ribuan.',
                'Nilai tempatnya = 7 × 10.000 = 70.000.'
            ]
        },
        tips: ['Hitung posisi dari kanan, bukan dari kiri.', 'Nilai tempat = angka × 10 pangkat posisi.']
    },
    B2: {
        title: 'Operasi Campuran & Urutan Operasi',
        duration: '3 menit',
        concept: 'Saat ada beberapa operasi, kerjakan berurutan: kurung, pangkat/akar, kali/bagi (dari kiri), lalu tambah/kurang (dari kiri).',
        worked: {
            problem: 'Hitung 12 + 4 × 5.',
            steps: ['Kerjakan perkalian dulu: 4 × 5 = 20.', 'Lalu penjumlahan: 12 + 20 = 32.']
        },
        tips: ['Kali dan bagi sama kuat, kerjakan dari kiri.', 'Kurung selalu dikerjakan paling awal.']
    },
    B3: {
        title: 'FPB, KPK & Soal Cerita',
        duration: '4 menit',
        concept: 'FPB adalah faktor terbesar yang membagi habis dua bilangan. KPK adalah kelipatan terkecil yang sama dari dua bilangan.',
        worked: {
            problem: 'Tentukan FPB dan KPK dari 12 dan 18.',
            steps: [
                'Faktor persekutuan 12 dan 18: 1, 2, 3, 6. FPB = 6.',
                'Kelipatan 12: 12, 24, 36, ... Kelipatan 18: 18, 36, ... KPK = 36.'
            ]
        },
        tips: ['Soal "dibagi rata terbanyak" memakai FPB.', 'Soal "bertemu/berbunyi bersama lagi" memakai KPK.']
    },
    B4: {
        title: 'Pecahan: Senilai, Urutan, Operasi',
        duration: '4 menit',
        concept: 'Pecahan senilai didapat dengan mengalikan atau membagi pembilang dan penyebut dengan angka yang sama. Untuk menjumlah, samakan penyebut lebih dulu.',
        worked: {
            problem: 'Hitung 1/4 + 2/3.',
            steps: [
                'KPK penyebut 4 dan 3 adalah 12.',
                '1/4 = 3/12 dan 2/3 = 8/12.',
                'Jumlahkan pembilang: 3 + 8 = 11, jadi hasilnya 11/12.'
            ]
        },
        tips: ['Penyebut tidak boleh dijumlahkan.', 'Sederhanakan hasil dengan membagi FPB pembilang dan penyebut.']
    },
    B5: {
        title: 'Desimal & Persen; Konversi',
        duration: '3 menit',
        concept: 'Persen berarti "per seratus". Persen ke desimal: bagi 100. Desimal ke persen: kali 100.',
        worked: {
            problem: 'Ubah 35% menjadi desimal dan 0,6 menjadi persen.',
            steps: ['35% = 35 ÷ 100 = 0,35.', '0,6 = 0,6 × 100% = 60%.']
        },
        tips: ['Geser titik desimal dua langkah.', 'Diskon 25% berarti membayar 75% dari harga.']
    },
    B6: {
        title: 'Perbandingan, Skala, Kecepatan, Debit',
        duration: '4 menit',
        concept: 'Jarak = kecepatan × waktu. Skala 1 : n berarti 1 cm pada gambar sama dengan n cm sebenarnya. Debit = volume ÷ waktu.',
        worked: {
            problem: 'Mobil berjalan 60 km/jam selama 3 jam. Berapa jaraknya?',
            steps: ['Gunakan rumus Jarak = Kecepatan × Waktu.', 'Jarak = 60 × 3 = 180 km.']
        },
        tips: ['Samakan satuan sebelum menghitung.', 'Pada perbandingan a : b, jumlah bagian = a + b.']
    },
    B7: {
        title: 'Bilangan Bulat & Garis Bilangan',
        duration: '3 menit',
        concept: 'Bilangan bulat terdiri dari bilangan negatif, nol, dan positif. Pada garis bilangan, semakin ke kanan nilainya semakin besar.',
        worked: {
            problem: 'Hitung -5 + 12.',
            steps: ['Mulai dari -5 pada garis bilangan.', 'Bergeser 12 langkah ke kanan.', 'Hasilnya 7.']
        },
        tips: ['Mengurangi bilangan negatif sama dengan menambah.', '-7 lebih kecil daripada -2.']
    },
    B8: {
        title: 'Pangkat Dua/Tiga & Akar',
        duration: '3 menit',
        concept: 'Pangkat dua berarti bilangan dikalikan dirinya sendiri. Akar kuadrat adalah kebalikannya.',
        worked: {
            problem: 'Hitung 13² dan √144.',
            steps: ['13² = 13 × 13 = 169.', '√144 = 12 karena 12 × 12 = 144.']
        },
        tips: ['Hafalkan kuadrat 1–20.', 'Akar pangkat tiga: cari bilangan yang jika dipangkatkan tiga menghasilkan angka itu.']
    },
    B9: {
        title: 'Pola Bilangan',
        duration: '3 menit',
        concept: 'Pola bilangan ditemukan dengan melihat selisih antarsuku. Jika selisih tetap, itu pola aritmetika.',
        worked: {
            problem: 'Lanjutkan pola 3, 7, 11, 15, ...',
            steps: ['Selisih antarsuku: 7 − 3 = 4, 11 − 7 = 4, 15 − 11 = 4.', 'Suku berikutnya = 15 + 4 = 19.']
        },
        tips: ['Cek selisih dulu, lalu cek selisih dari selisih.', 'Tulis pola dengan rapi agar tidak salah hitung.']
    },
    G1: {
        title: 'Bangun Datar: Keliling & Luas',
        duration: '4 menit',
        concept: 'Keliling adalah jumlah semua sisi. Luas persegi panjang = panjang × lebar, luas segitiga = ½ × alas × tinggi.',
        worked: {
            problem: 'Persegi panjang 12 cm × 5 cm. Hitung luas dan kelilingnya.',
            steps: ['Luas = 12 × 5 = 60 cm².', 'Keliling = 2 × (12 + 5) = 34 cm.']
        },
        tips: ['Satuan luas selalu kuadrat (cm²).', 'Satuan keliling sama dengan satuan panjang (cm).']
    },
    G2: {
        title: 'Sudut: Jenis, Pengukuran, Sudut Jam',
        duration: '4 menit',
        concept: 'Sudut lancip < 90°, siku-siku = 90°, tumpul antara 90° dan 180°, lurus = 180°. Jarum jam bergerak 30° per jam dan 0,5° per menit.',
        worked: {
            problem: 'Berapa sudut antara jarum jam dan menit pada pukul 03.00?',
            steps: ['Jarum jam di angka 3 → 3 × 30° = 90°.', 'Jarum menit di angka 12 → 0°.', 'Selisih = 90°.']
        },
        tips: ['Dua sudut berpelurus berjumlah 180°.', 'Dua sudut berpenyiku berjumlah 90°.']
    },
    G3: {
        title: 'Bangun Ruang: Sifat & Jaring-jaring',
        duration: '3 menit',
        concept: 'Kubus punya 6 sisi, 12 rusuk, dan 8 titik sudut. Balok juga punya 6 sisi, 12 rusuk, dan 8 titik sudut, tetapi sisinya persegi panjang.',
        worked: {
            problem: 'Berapa banyak rusuk pada balok?',
            steps: ['Balok memiliki 4 rusuk panjang, 4 rusuk lebar, dan 4 rusuk tinggi.', 'Total rusuk = 4 + 4 + 4 = 12.']
        },
        tips: ['Jaring-jaring kubus terdiri dari 6 persegi.', 'Prisma segitiga punya 5 sisi dan 9 rusuk.']
    },
    G4: {
        title: 'Volume & Luas Permukaan',
        duration: '4 menit',
        concept: 'Volume balok = panjang × lebar × tinggi. Luas permukaan balok = 2 × (p×l + p×t + l×t).',
        worked: {
            problem: 'Balok 8 cm × 5 cm × 4 cm. Hitung volumenya.',
            steps: ['Volume = p × l × t.', 'Volume = 8 × 5 × 4 = 160 cm³.']
        },
        tips: ['Satuan volume adalah cm³.', 'Untuk mencari tinggi: t = volume ÷ (p × l).']
    },
    G5: {
        title: 'Konversi Satuan',
        duration: '3 menit',
        concept: 'Panjang: km → m turun 3 tangga (×1000). Berat: kg → g (×1000). Waktu: jam → menit (×60).',
        worked: {
            problem: 'Ubah 2 km 500 m menjadi meter.',
            steps: ['2 km = 2 × 1000 = 2000 m.', '2000 m + 500 m = 2500 m.']
        },
        tips: ['Tulis tangga satuan agar tidak salah kali/bagi.', '1 jam = 60 menit = 3600 detik.']
    },
    G6: {
        title: 'Simetri & Transformasi',
        duration: '3 menit',
        concept: 'Simetri lipat membagi bangun menjadi dua bagian yang sama. Pencerminan terhadap sumbu X mengubah tanda ordinat (y).',
        worked: {
            problem: 'Titik (3, 4) dicerminkan terhadap sumbu X. Hasilnya?',
            steps: ['Pencerminan terhadap sumbu X: (x, y) → (x, −y).', 'Hasilnya (3, −4).']
        },
        tips: ['Persegi punya 4 simetri lipat.', 'Segitiga sama sisi punya 3 simetri lipat.']
    },
    G7: {
        title: 'Koordinat Kartesius',
        duration: '3 menit',
        concept: 'Koordinat ditulis (x, y). x dibaca pada sumbu mendatar, y pada sumbu tegak. Kuadran I (+,+), II (−,+), III (−,−), IV (+,−).',
        worked: {
            problem: 'Titik P berada 3 satuan ke kanan dan 4 satuan ke atas. Koordinatnya?',
            steps: ['Ke kanan berarti x positif = 3.', 'Ke atas berarti y positif = 4.', 'Koordinat P = (3, 4).']
        },
        tips: ['Selalu tulis x dulu, baru y.', 'Titik pada sumbu X memiliki y = 0.']
    },
    G8: {
        title: 'Lingkaran: Keliling & Luas',
        duration: '4 menit',
        concept: 'Keliling lingkaran = 2 × π × r atau π × d. Luas lingkaran = π × r². Gunakan π = 22/7 jika jari-jari kelipatan 7.',
        worked: {
            problem: 'Lingkaran dengan jari-jari 14 cm. Hitung keliling dan luasnya.',
            steps: ['Keliling = 2 × 22/7 × 14 = 88 cm.', 'Luas = 22/7 × 14 × 14 = 616 cm².']
        },
        tips: ['d = 2 × r.', 'Jangan tertukar antara keliling (cm) dan luas (cm²).']
    },
    D1: {
        title: 'Membaca Tabel & Diagram',
        duration: '3 menit',
        concept: 'Diagram batang membandingkan nilai antarkategori. Batang tertinggi berarti nilai terbesar. Tabel membantu membaca data dengan rapi.',
        worked: {
            problem: 'Diagram batang menunjukkan buku dibaca: Senin 5, Selasa 8, Rabu 6. Hari apa yang paling banyak?',
            steps: ['Bandingkan tinggi batang.', 'Nilai terbesar adalah 8.', 'Jadi hari Selasa.']
        },
        tips: ['Baca judul dan satuan pada sumbu.', 'Periksa angka pada sumbu, jangan hanya melihat tinggi batang.']
    },
    D2: {
        title: 'Mean, Median, Modus',
        duration: '4 menit',
        concept: 'Mean = jumlah data ÷ banyak data. Median = nilai tengah setelah data diurutkan. Modus = nilai yang paling sering muncul.',
        worked: {
            problem: 'Data: 6, 7, 8, 8, 9. Hitung mean, median, dan modus.',
            steps: ['Mean = (6+7+8+8+9) ÷ 5 = 38 ÷ 5 = 7,6.', 'Median = data ke-3 = 8.', 'Modus = 8 karena muncul dua kali.']
        },
        tips: ['Urutkan data sebelum mencari median.', 'Bisa ada lebih dari satu modus.']
    },
    D3: {
        title: 'Menyajikan Data',
        duration: '3 menit',
        concept: 'Pilih penyajian sesuai tujuan: diagram batang untuk membandingkan, diagram garis untuk perubahan, diagram lingkaran untuk bagian dari keseluruhan.',
        worked: {
            problem: 'Data 4, 5, 5, 6, 7. Berapa frekuensi nilai 5?',
            steps: ['Hitung kemunculan nilai 5.', 'Nilai 5 muncul dua kali.', 'Frekuensinya 2.']
        },
        tips: ['Jumlah frekuensi = banyak data.', 'Diagram lingkaran memakai persen atau derajat.']
    },
    D4: {
        title: 'Peluang Sederhana',
        duration: '3 menit',
        concept: 'Peluang = banyak kejadian yang diharapkan ÷ banyak semua kemungkinan. Nilainya antara 0 dan 1.',
        worked: {
            problem: 'Sebuah dadu dilempar. Peluang muncul angka genap?',
            steps: ['Angka genap: 2, 4, 6 → 3 kemungkinan.', 'Semua kemungkinan: 6.', 'Peluang = 3/6 = 1/2.']
        },
        tips: ['Sederhanakan pecahan peluang.', 'Peluang komplemen = 1 − peluang kejadian.']
    }
};

export function getLesson(subtopicId) {
    return LESSONS[subtopicId] || null;
}
