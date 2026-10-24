export const CURRICULUM = {
    domains: [
        {
            id: 'bilangan',
            name: 'Bilangan',
            color: '#2E7D32',
            icon: '🔢',
            subtopics: [
                { id: 'B1', name: 'Bilangan Cacah Besar & Nilai Tempat', level: 1, prerequisites: [] },
                { id: 'B2', name: 'Operasi Campuran & Urutan Operasi', level: 1, prerequisites: ['B1'] },
                { id: 'B3', name: 'FPB, KPK & Soal Cerita', level: 2, prerequisites: ['B2'] },
                { id: 'B4', name: 'Pecahan: Senilai, Urutan, Operasi', level: 2, prerequisites: ['B2'] },
                { id: 'B5', name: 'Desimal & Persen; Konversi', level: 2, prerequisites: ['B4'] },
                { id: 'B6', name: 'Perbandingan, Skala, Kecepatan-Jarak-Waktu', level: 3, prerequisites: ['B5'] },
                { id: 'B7', name: 'Bilangan Bulat (Negatif) & Garis Bilangan', level: 3, prerequisites: ['B1'] },
                { id: 'B8', name: 'Pangkat 2/3 & Akar', level: 3, prerequisites: ['B2'] },
                { id: 'B9', name: 'Pola Bilangan', level: 3, prerequisites: ['B1', 'B2'] }
            ]
        },
        {
            id: 'geometri',
            name: 'Geometri & Pengukuran',
            color: '#1565C0',
            icon: '📐',
            subtopics: [
                { id: 'G1', name: 'Bangun Datar: Sifat, Keliling, Luas', level: 1, prerequisites: [] },
                { id: 'G2', name: 'Sudut: Jenis, Pengukuran, Sudut Jam', level: 1, prerequisites: [] },
                { id: 'G3', name: 'Bangun Ruang: Sifat & Jaring-jaring', level: 2, prerequisites: ['G1'] },
                { id: 'G4', name: 'Volume & Luas Permukaan', level: 2, prerequisites: ['G3'] },
                { id: 'G5', name: 'Satuan Panjang, Berat, Waktu, Volume; Konversi', level: 2, prerequisites: ['G1'] },
                { id: 'G6', name: 'Simetri & Transformasi Sederhana', level: 3, prerequisites: ['G1'] },
                { id: 'G7', name: 'Koordinat Kartesius & Posisi', level: 3, prerequisites: ['G1'] },
                { id: 'G8', name: 'Lingkaran: Keliling & Luas', level: 3, prerequisites: ['G1'] }
            ]
        },
        {
            id: 'data',
            name: 'Data',
            color: '#E65100',
            icon: '📊',
            subtopics: [
                { id: 'D1', name: 'Membaca Tabel & Diagram (Batang, Garis, Lingkaran, Piktogram)', level: 1, prerequisites: [] },
                { id: 'D2', name: 'Mean, Median, Modus', level: 2, prerequisites: ['D1'] },
                { id: 'D3', name: 'Menyajikan Data', level: 2, prerequisites: ['D1'] },
                { id: 'D4', name: 'Peluang Sederhana', level: 3, prerequisites: ['D2'] }
            ]
        }
    ],

    getAllSubtopics() {
        return this.domains.flatMap(d => d.subtopics.map(s => ({ ...s, domain: d.id, domainName: d.name, domainColor: d.color })));
    },

    getSubtopic(id) {
        return this.getAllSubtopics().find(s => s.id === id);
    },

    getSubtopicsByDomain(domainId) {
        const domain = this.domains.find(d => d.id === domainId);
        return domain ? domain.subtopics : [];
    },

    getPrerequisites(subtopicId) {
        const subtopic = this.getSubtopic(subtopicId);
        return subtopic?.prerequisites || [];
    },

    isUnlocked(subtopicId, masteredSubtopics) {
        const prereqs = this.getPrerequisites(subtopicId);
        return prereqs.every(p => masteredSubtopics.includes(p));
    },

    getDomainWeights() {
        return {
            bilangan: 0.45,
            geometri: 0.35,
            data: 0.20
        };
    }
};

export const BUILDING_TYPES = {
    house: { name: 'Rumah', icon: '🏠', description: 'Profil, target harian, jadwal' },
    school: { name: 'Sekolah', icon: '🏫', description: 'Tes diagnostik & Tryout CBT' },
    library: { name: 'Perpustakaan', icon: '📚', description: 'Pelajaran singkat per subtopik' },
    arena: { name: 'Arena', icon: '⚔️', description: 'Latihan adaptif & Boss penguasaan' },
    shop: { name: 'Toko', icon: '🏪', description: 'Tukar koin dengan kosmetik' }
};

export const BUILDING_STATUS = {
    LOCKED: 'locked',
    BUILDING: 'building',
    MASTERED: 'mastered',
    STRONG: 'strong'
};

export const MASTERY_THRESHOLDS = {
    BOSS_ACCURACY: 0.85,
    BOSS_REQUIRED_ATTEMPTS: 2,
    BOSS_MIN_L3_CORRECT: 1,
    RETENTION_INTERVALS: [1, 3, 7, 21]
};