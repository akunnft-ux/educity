import { CURRICULUM } from '../../data/curriculum.js';

const MS_DAY = 86400000;

function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const randInt = (rng, min, max) => Math.floor(rng() * (max - min + 1)) + min;
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

function shuffle(rng, arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { [a, b] = [b, a % b]; }
    return a;
}

function lcm(a, b) { return Math.abs(a * b) / gcd(a, b); }

function simplify(n, d) {
    const g = gcd(n, d) || 1;
    return [n / g, d / g];
}

const frac = (n, d) => {
    const [sn, sd] = simplify(n, d);
    return sd === 1 ? String(sn) : `${sn}/${sd}`;
};

const fmt = (n) => Number(n).toLocaleString('id-ID');

function wrong(text, tag) {
    return { text: String(text), tag: tag || 'computation_error' };
}

function padCandidates(correctText, wrongs) {
    const text = String(correctText);
    const out = [];

    const fraction = text.match(/^(-?\d+)\/(\d+)$/);
    if (fraction) {
        const n = Number(fraction[1]);
        const d = Number(fraction[2]);
        out.push(`${d}/${n}`);
        out.push(`${n + 1}/${d}`);
        out.push(`${Math.max(1, n - 1)}/${d}`);
        out.push(`${n}/${d + 1}`);
        out.push(`${n + 1}/${d + 1}`);
        return out;
    }

    const percent = text.match(/^(-?[\d.,]+)%$/);
    if (percent) {
        const num = Number(percent[1].replace(',', '.'));
        if (Number.isFinite(num)) {
            out.push(`${num + 5}%`, `${Math.max(0, num - 5)}%`, `${num * 2}%`, `${Math.round(num / 2)}%`);
        }
        return out;
    }

    const coordinate = text.match(/^\((-?\d+),\s*(-?\d+)\)$/);
    if (coordinate) {
        const x = Number(coordinate[1]);
        const y = Number(coordinate[2]);
        out.push(
            `(${x + 1}, ${y})`,
            `(${x}, ${y + 1})`,
            `(${-x}, ${-y})`,
            `(${y}, ${x})`,
            `(${x - 1}, ${y - 1})`
        );
        return out;
    }

    const rupiah = text.match(/^Rp([\d.]+)$/);
    if (rupiah) {
        const num = Number(rupiah[1].replace(/\./g, ''));
        if (Number.isFinite(num)) {
            out.push(`Rp${fmt(num + 1000)}`, `Rp${fmt(Math.max(0, num - 1000))}`, `Rp${fmt(num * 2)}`);
        }
        return out;
    }

    const numberWithUnit = text.match(/^(-?[\d.,]+)\s*([a-zA-Z°²³/]+.*)$/);
    if (numberWithUnit) {
        const num = Number(numberWithUnit[1].replace(/\./g, '').replace(',', '.'));
        const unit = numberWithUnit[2];
        if (Number.isFinite(num)) {
            const candidates = [num + 1, num - 1, num * 2, num + 10, Math.max(1, Math.round(num / 2))];
            for (const c of candidates) {
                const formatted = String(Number.isInteger(num) ? c : Math.round(c * 100) / 100)
                    .replace('.', ',');
                out.push(`${formatted} ${unit}`);
            }
        }
        return out;
    }

    const plain = Number(text.replace(/\./g, '').replace(',', '.'));
    if (Number.isFinite(plain)) {
        const candidates = [plain + 1, plain - 1, plain + 10, plain * 2, Math.max(1, Math.round(plain / 2))];
        for (const c of candidates) {
            out.push(Number.isInteger(plain) ? String(c) : String(Math.round(c * 100) / 100).replace('.', ','));
        }
    }

    return out;
}

function assembleOptions(rng, correctText, wrongs) {
    const options = [{ text: String(correctText), correct: true, misconception_tag: null }];
    const seen = new Set([String(correctText)]);

    for (const w of wrongs || []) {
        if (options.length >= 4) break;
        const text = String(w.text ?? w);
        if (seen.has(text) || !text.trim()) continue;
        seen.add(text);
        options.push({ text, correct: false, misconception_tag: w.tag || 'computation_error' });
    }

    for (const text of padCandidates(correctText, wrongs)) {
        if (options.length >= 4) break;
        if (seen.has(text) || !text.trim()) continue;
        seen.add(text);
        options.push({ text, correct: false, misconception_tag: 'computation_error' });
    }

    let n = 2;
    while (options.length < 4 && n < 12) {
        const text = `${correctText} (varian ${n})`;
        if (!seen.has(text)) {
            seen.add(text);
            options.push({ text, correct: false, misconception_tag: 'computation_error' });
        }
        n++;
    }

    return shuffle(rng, options);
}

function pow10Clamped(exp) {
    return Math.pow(10, Math.max(0, Math.min(6, exp)));
}

const BUILDERS = {
    B1: {
        L1: (rng) => {
            const digits = [randInt(rng, 1, 9)];
            for (let i = 0; i < 5; i++) digits.push(randInt(rng, 0, 9));
            const num = Number(digits.join(''));
            const pos = randInt(rng, 0, 5);
            const names = ['ratusan ribu', 'puluh ribuan', 'ribuan', 'ratusan', 'puluhan', 'satuan'];
            const value = digits[pos] * pow10Clamped(5 - pos);
            return {
                stem: `Nilai tempat angka ${digits[pos]} pada bilangan ${fmt(num)} adalah ...`,
                correct: fmt(value),
                wrongs: [
                    wrong(fmt(digits[pos]), 'place_value_confusion'),
                    wrong(fmt(digits[pos] * pow10Clamped(4 - pos)), 'place_value_confusion'),
                    wrong(fmt(digits[pos] * pow10Clamped(6 - pos)), 'place_value_confusion')
                ],
                explanation: `Angka ${digits[pos]} menempati ${names[pos]}, sehingga nilainya ${fmt(value)}.`,
                hints: [
                    'Hitung posisi angka dari kanan: satuan, puluhan, ratusan, ...',
                    'Nilai tempat = angka × 10 pangkat posisi.',
                    `Posisi angka ${digits[pos]} adalah ${names[pos]}.`
                ],
                difficulty_b: -0.6,
                est_seconds: 30
            };
        },
        L2: (rng) => {
            const a = randInt(rng, 100000, 999999);
            const b = randInt(rng, 100000, 999999);
            const correct = a > b ? '>' : a < b ? '<' : '=';
            const wrongSigns = ['>', '<', '='].filter(s => s !== correct);
            return {
                stem: `Tanda yang tepat untuk mengisi titik-titik: ${fmt(a)} ... ${fmt(b)}`,
                correct,
                wrongs: [
                    wrong(wrongSigns[0], 'comparison_error'),
                    wrong(wrongSigns[1], 'comparison_error'),
                    wrong('≥', 'comparison_error')
                ],
                explanation: `Bandingkan dari nilai tempat terbesar. ${fmt(a)} ${correct} ${fmt(b)}.`,
                hints: [
                    'Bandingkan digit paling kiri lebih dahulu.',
                    'Jika digit sama, lanjut ke digit berikutnya.',
                    'Bilangan dengan digit lebih banyak belum tentu lebih besar jika digit depannya nol.'
                ],
                difficulty_b: 0.1,
                est_seconds: 30
            };
        },
        L3: (rng) => {
            const digits = [randInt(rng, 1, 9)];
            for (let i = 0; i < 5; i++) digits.push(randInt(rng, 0, 9));
            const num = Number(digits.join(''));
            const reversed = Number([...digits].reverse().join(''));
            const swapped = [...digits];
            [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
            const names = ['ratus ribuan', 'puluh ribuan', 'ribuan', 'ratusan', 'puluhan', 'satuan'];
            return {
                stem: `Sebuah bilangan tersusun dari ${names.map((n, i) => `${digits[i]} ${n}`).join(', ')}. Bilangan tersebut adalah ...`,
                correct: fmt(num),
                wrongs: [
                    wrong(fmt(reversed), 'digit_order_error'),
                    wrong(fmt(Number(swapped.join(''))), 'digit_order_error'),
                    wrong(fmt(num + 1000), 'place_value_confusion')
                ],
                explanation: `Susun digit sesuai nilai tempatnya: ${fmt(num)}.`,
                hints: [
                    'Tulis nilai tempat dari kiri ke kanan.',
                    'Ratus ribuan adalah posisi paling kiri pada bilangan 6 angka.',
                    'Jangan membalik urutan digit.'
                ],
                difficulty_b: 0.7,
                est_seconds: 60
            };
        }
    },

    B2: {
        L1: (rng) => {
            const mode = pick(rng, ['multiply', 'divide']);
            if (mode === 'multiply') {
                const a = randInt(rng, 10, 40);
                const b = randInt(rng, 2, 9);
                const c = randInt(rng, 2, 9);
                const correct = a + b * c;
                return {
                    stem: `Hasil dari ${a} + ${b} × ${c} adalah ...`,
                    correct,
                    wrongs: [
                        wrong((a + b) * c, 'order_of_operations'),
                        wrong(a * b + c, 'order_of_operations'),
                        wrong(a + b + c, 'order_of_operations')
                    ],
                    explanation: `Perkalian dikerjakan lebih dulu: ${b} × ${c} = ${b * c}, lalu ${a} + ${b * c} = ${correct}.`,
                    hints: [
                        'Urutan operasi: kurung, pangkat, kali/bagi, lalu tambah/kurang.',
                        'Kali dan bagi dikerjakan sebelum tambah dan kurang.',
                        'Kerjakan dari kiri ke kanan untuk operasi yang sama kuat.'
                    ],
                    difficulty_b: 0.2,
                    est_seconds: 40
                };
            }
            const c = randInt(rng, 2, 9);
            const k = randInt(rng, 2, 9);
            const b = c * k;
            const a = randInt(rng, 5, 30);
            const correct = a + k;
            return {
                stem: `Hasil dari ${a} + ${b} ÷ ${c} adalah ...`,
                correct,
                wrongs: [
                    wrong((a + b) / c, 'order_of_operations'),
                    wrong(a + b * c, 'order_of_operations'),
                    wrong(a * c + b, 'order_of_operations')
                ],
                explanation: `Pembagian dikerjakan lebih dulu: ${b} ÷ ${c} = ${k}, lalu ${a} + ${k} = ${correct}.`,
                hints: [
                    'Bagi dulu, baru tambah.',
                    `${b} ÷ ${c} = ${k}.`,
                    'Periksa kembali urutan operasimu.'
                ],
                difficulty_b: 0.25,
                est_seconds: 40
            };
        },
        L2: (rng) => {
            const a = randInt(rng, 5, 20);
            const b = randInt(rng, 2, 12);
            const c = randInt(rng, 2, 9);
            const correct = (a + b) * c;
            return {
                stem: `Hasil dari (${a} + ${b}) × ${c} adalah ...`,
                correct,
                wrongs: [
                    wrong(a + b * c, 'ignore_parentheses'),
                    wrong(a * c + b, 'order_of_operations'),
                    wrong(a + b + c, 'order_of_operations')
                ],
                explanation: `Kerjakan dalam kurung dulu: ${a} + ${b} = ${a + b}, lalu ${a + b} × ${c} = ${correct}.`,
                hints: [
                    'Operasi dalam kurung selalu dikerjakan pertama.',
                    `${a} + ${b} = ${a + b}.`,
                    'Setelah kurung selesai, lakukan perkalian.'
                ],
                difficulty_b: 0.5,
                est_seconds: 45
            };
        },
        L3: (rng) => {
            const price = randInt(rng, 2, 8) * 500;
            const qty = randInt(rng, 3, 6);
            const total = price * qty;
            const pay = Math.ceil(total / 10000) * 10000 + 10000;
            const change = pay - total;
            return {
                stem: `Harga satu buku Rp${fmt(price)}. Budi membeli ${qty} buku dan membayar dengan Rp${fmt(pay)}. Uang kembalian Budi adalah ...`,
                correct: `Rp${fmt(change)}`,
                wrongs: [
                    wrong(`Rp${fmt(pay - price)}`, 'wrong_operation'),
                    wrong(`Rp${fmt(total)}`, 'forgot_subtraction'),
                    wrong(`Rp${fmt(pay - price * (qty + 1))}`, 'wrong_quantity')
                ],
                explanation: `Harga ${qty} buku = ${qty} × Rp${fmt(price)} = Rp${fmt(total)}. Kembalian = Rp${fmt(pay)} − Rp${fmt(total)} = Rp${fmt(change)}.`,
                hints: [
                    'Hitung total harga seluruh buku lebih dulu.',
                    'Kembalian = uang dibayar − total harga.',
                    `Total harga = ${qty} × Rp${fmt(price)}.`
                ],
                difficulty_b: 0.9,
                est_seconds: 70
            };
        }
    },

    B3: {
        L1: (rng) => {
            const g = pick(rng, [4, 6, 8, 9, 12]);
            const [x, y] = pick(rng, [[2, 3], [3, 4], [2, 5], [3, 5], [4, 5]]);
            const a = g * x;
            const b = g * y;
            return {
                stem: `FPB dari ${a} dan ${b} adalah ...`,
                correct: g,
                wrongs: [
                    wrong(lcm(a, b), 'confuse_fpb_kpk'),
                    wrong(a * b, 'confuse_fpb_kpk'),
                    wrong(g * 2, 'computation_error')
                ],
                explanation: `Faktor persekutuan terbesar dari ${a} dan ${b} adalah ${g}.`,
                hints: [
                    'Tulis faktor dari kedua bilangan.',
                    'Cari faktor yang sama, lalu ambil yang terbesar.',
                    'FPB tidak mungkin lebih besar dari bilangan terkecil.'
                ],
                difficulty_b: -0.2,
                est_seconds: 45
            };
        },
        L2: (rng) => {
            const g = pick(rng, [4, 6, 8, 9, 12]);
            const [x, y] = pick(rng, [[2, 3], [3, 4], [2, 5], [3, 5], [4, 5]]);
            const a = g * x;
            const b = g * y;
            const k = lcm(a, b);
            return {
                stem: `KPK dari ${a} dan ${b} adalah ...`,
                correct: k,
                wrongs: [
                    wrong(g, 'confuse_fpb_kpk'),
                    wrong(a * b, 'confuse_fpb_kpk'),
                    wrong(a + b, 'computation_error')
                ],
                explanation: `Kelipatan persekutuan terkecil dari ${a} dan ${b} adalah ${k}.`,
                hints: [
                    'Tulis beberapa kelipatan dari masing-masing bilangan.',
                    'Cari kelipatan yang sama, lalu ambil yang terkecil.',
                    'KPK minimal sama dengan bilangan terbesar.'
                ],
                difficulty_b: 0.4,
                est_seconds: 50
            };
        },
        L3: (rng) => {
            const mode = pick(rng, ['bells', 'packing']);
            const g = pick(rng, [4, 6, 8, 12]);
            const [x, y] = pick(rng, [[2, 3], [3, 4], [2, 5], [3, 5]]);
            if (mode === 'bells') {
                const a = g * x;
                const b = g * y;
                const k = lcm(a, b);
                return {
                    stem: `Lonceng A berbunyi setiap ${a} menit dan lonceng B setiap ${b} menit. Keduanya berbunyi bersama setiap ... menit.`,
                    correct: k,
                    wrongs: [
                        wrong(a + b, 'add_instead_of_lcm'),
                        wrong(a * b, 'multiply_instead_of_lcm'),
                        wrong(g, 'confuse_fpb_kpk')
                    ],
                    explanation: `Waktu berbunyi bersama = KPK(${a}, ${b}) = ${k} menit.`,
                    hints: [
                        'Kata "bersama lagi" menunjukkan KPK.',
                        'Tulis kelipatan tiap bilangan.',
                        'Ambil kelipatan sama yang paling kecil.'
                    ],
                    difficulty_b: 0.9,
                    est_seconds: 80
                };
            }
            const a = g * x;
            const b = g * y;
            return {
                stem: `Ibu memiliki ${a} kue dan ${b} permen. Keduanya akan dibagi rata ke sejumlah anak sebanyak mungkin. Jumlah anak terbanyak adalah ...`,
                correct: g,
                wrongs: [
                    wrong(lcm(a, b), 'confuse_fpb_kpk'),
                    wrong(a + b, 'wrong_operation'),
                    wrong(g * 2, 'computation_error')
                ],
                explanation: `Jumlah anak terbanyak = FPB(${a}, ${b}) = ${g} anak.`,
                hints: [
                    'Kata "dibagi rata sebanyak mungkin" menunjukkan FPB.',
                    'Cari faktor persekutuan terbesar.',
                    `FPB(${a}, ${b}) = ${g}.`
                ],
                difficulty_b: 0.85,
                est_seconds: 75
            };
        }
    },

    B4: {
        L1: (rng) => {
            const d = pick(rng, [2, 3, 4, 5, 6, 8]);
            const n = randInt(rng, 1, d - 1);
            const k = randInt(rng, 2, 5);
            return {
                stem: `Pecahan yang senilai dengan ${n}/${d} adalah ...`,
                correct: `${n * k}/${d * k}`,
                wrongs: [
                    wrong(`${n * k}/${d}`, 'multiply_numerator_only'),
                    wrong(`${n}/${d * k}`, 'multiply_denominator_only'),
                    wrong(`${n + k}/${d + k}`, 'add_instead_of_multiply')
                ],
                explanation: `Kalikan pembilang dan penyebut dengan ${k}: ${n}/${d} = ${n * k}/${d * k}.`,
                hints: [
                    'Pecahan senilai dikali dengan angka yang sama pada pembilang dan penyebut.',
                    'Jangan hanya mengalikan salah satu bagian.',
                    `Kalikan keduanya dengan ${k}.`
                ],
                difficulty_b: -0.1,
                est_seconds: 35
            };
        },
        L2: (rng) => {
            const denoms = [2, 3, 4, 5, 6, 8, 10, 12];
            const d1 = pick(rng, denoms);
            let d2 = pick(rng, denoms);
            if (d2 === d1) d2 = d1 === 12 ? 10 : d1 + 1;
            const n1 = randInt(rng, 1, d1 - 1);
            const n2 = randInt(rng, 1, d2 - 1);
            const lcd = lcm(d1, d2);
            const num1 = n1 * (lcd / d1);
            const num2 = n2 * (lcd / d2);
            const sum = num1 + num2;
            const correct = frac(sum, lcd);
            const wrongs = [
                wrong(`${sum}/${lcd}`, 'not_simplified'),
                wrong(`${n1 + n2}/${d1 + d2}`, 'add_numerators_denominators'),
                wrong(`${n1}/${d1 + d2}`, 'wrong_denominator')
            ];
            return {
                stem: `Hasil dari ${n1}/${d1} + ${n2}/${d2} adalah ...`,
                correct,
                wrongs,
                explanation: `Penyebut disamakan menjadi ${lcd}: ${num1}/${lcd} + ${num2}/${lcd} = ${correct}.`,
                hints: [
                    'Samakan penyebut dengan KPK.',
                    `${n1}/${d1} = ${num1}/${lcd} dan ${n2}/${d2} = ${num2}/${lcd}.`,
                    'Jumlahkan pembilang, lalu sederhanakan jika perlu.'
                ],
                difficulty_b: 0.5,
                est_seconds: 60
            };
        },
        L3: (rng) => {
            const d = pick(rng, [3, 4, 5, 6, 8]);
            const n = randInt(rng, 1, d - 1);
            const total = d * randInt(rng, 3, 10);
            const correct = total * n / d;
            return {
                stem: `Sebanyak ${n}/${d} dari ${total} siswa memilih olahraga. Banyak siswa yang memilih olahraga adalah ...`,
                correct,
                wrongs: [
                    wrong(total / d, 'forgot_multiply_numerator'),
                    wrong(total - correct, 'complement_error'),
                    wrong(total * n, 'wrong_operation')
                ],
                explanation: `${n}/${d} × ${total} = ${correct} siswa.`,
                hints: [
                    'Kata "dari" berarti perkalian pecahan.',
                    `Bagi ${total} dengan ${d}, lalu kalikan ${n}.`,
                    `${total} ÷ ${d} = ${total / d}, lalu × ${n} = ${correct}.`
                ],
                difficulty_b: 0.9,
                est_seconds: 70
            };
        }
    },

    B5: {
        L1: (rng) => {
            const p = randInt(rng, 5, 95);
            const dec = (p / 100).toFixed(2).replace('.', ',');
            return {
                stem: `${p}% jika diubah ke bentuk desimal menjadi ...`,
                correct: dec,
                wrongs: [
                    wrong((p / 10).toFixed(2).replace('.', ','), 'decimal_conversion'),
                    wrong((p * 10).toFixed(2).replace('.', ','), 'decimal_conversion'),
                    wrong(((100 - p) / 100).toFixed(2).replace('.', ','), 'complement_error')
                ],
                explanation: `${p}% = ${p} ÷ 100 = ${dec}.`,
                hints: [
                    'Persen berarti per seratus.',
                    'Bagi dengan 100.',
                    'Geser titik desimal dua langkah ke kiri.'
                ],
                difficulty_b: 0.1,
                est_seconds: 30
            };
        },
        L2: (rng) => {
            const p = randInt(rng, 2, 19) * 5;
            const dec = (p / 100).toFixed(2).replace('.', ',');
            return {
                stem: `Bentuk persen dari ${dec} adalah ...`,
                correct: `${p}%`,
                wrongs: [
                    wrong(`${p / 10}%`, 'decimal_conversion'),
                    wrong(`${p * 10}%`, 'decimal_conversion'),
                    wrong(`${100 - p}%`, 'complement_error')
                ],
                explanation: `${dec} × 100% = ${p}%.`,
                hints: [
                    'Kalikan dengan 100.',
                    'Geser titik desimal dua langkah ke kanan.',
                    `${dec} × 100 = ${p}.`
                ],
                difficulty_b: 0.3,
                est_seconds: 30
            };
        },
        L3: (rng) => {
            const price = randInt(rng, 4, 20) * 10000;
            const disc = pick(rng, [10, 20, 25, 50]);
            const pay = price * (100 - disc) / 100;
            return {
                stem: `Sebuah tas berharga Rp${fmt(price)} mendapat diskon ${disc}%. Harga yang harus dibayar adalah ...`,
                correct: `Rp${fmt(pay)}`,
                wrongs: [
                    wrong(`Rp${fmt(price * disc / 100)}`, 'discount_amount_only'),
                    wrong(`Rp${fmt(price)}`, 'discount_ignored'),
                    wrong(`Rp${fmt(price * (100 + disc) / 100)}`, 'wrong_operation')
                ],
                explanation: `Diskon = ${disc}% × Rp${fmt(price)} = Rp${fmt(price * disc / 100)}. Harga bayar = Rp${fmt(price)} − Rp${fmt(price * disc / 100)} = Rp${fmt(pay)}.`,
                hints: [
                    'Hitung nilai diskon terlebih dahulu.',
                    'Harga bayar = harga awal − diskon.',
                    `Atau langsung ${100 - disc}% × Rp${fmt(price)}.`
                ],
                difficulty_b: 1.0,
                est_seconds: 80
            };
        }
    },

    B6: {
        L1: (rng) => {
            const speed = randInt(rng, 30, 90);
            const time = randInt(rng, 2, 6);
            const distance = speed * time;
            return {
                stem: `Sebuah mobil melaju ${speed} km/jam selama ${time} jam. Jarak yang ditempuh adalah ...`,
                correct: `${distance} km`,
                wrongs: [
                    wrong(`${speed + time} km`, 'speed_formula'),
                    wrong(`${speed} km`, 'speed_formula'),
                    wrong(`${distance * 2} km`, 'speed_formula')
                ],
                explanation: `Jarak = kecepatan × waktu = ${speed} × ${time} = ${distance} km.`,
                hints: [
                    'Rumus: Jarak = Kecepatan × Waktu.',
                    'Kalikan kecepatan dengan waktu.',
                    `Satuan jarak adalah km.`
                ],
                difficulty_b: 0.4,
                est_seconds: 45
            };
        },
        L2: (rng) => {
            const scale = pick(rng, [100, 200, 500, 1000]);
            const mapCm = randInt(rng, 2, 9);
            const realM = mapCm * scale / 100;
            return {
                stem: `Denah berskala 1 : ${fmt(scale)}. Jarak dua tempat pada denah ${mapCm} cm. Jarak sebenarnya adalah ...`,
                correct: `${fmt(realM)} m`,
                wrongs: [
                    wrong(`${fmt(mapCm * scale)} cm`, 'scale_unit_error'),
                    wrong(`${fmt(mapCm * scale / 1000)} m`, 'scale_unit_error'),
                    wrong(`${fmt(mapCm)} m`, 'scale_ignored')
                ],
                explanation: `Jarak sebenarnya = ${mapCm} × ${fmt(scale)} = ${fmt(mapCm * scale)} cm = ${fmt(realM)} m.`,
                hints: [
                    'Kalikan jarak pada denah dengan angka skala.',
                    `1 m = 100 cm.`,
                    `${mapCm} × ${fmt(scale)} = ${fmt(mapCm * scale)} cm.`
                ],
                difficulty_b: 0.6,
                est_seconds: 60
            };
        },
        L3: (rng) => {
            const [x, y] = pick(rng, [[2, 3], [3, 4], [4, 5], [3, 5]]);
            const k = randInt(rng, 3, 7);
            const total = (x + y) * k;
            return {
                stem: `Perbandingan uang Ani dan Budi adalah ${x} : ${y}. Jumlah uang mereka Rp${fmt(total * 10000)}. Uang Ani adalah ...`,
                correct: `Rp${fmt(x * k * 10000)}`,
                wrongs: [
                    wrong(`Rp${fmt(y * k * 10000)}`, 'swap_ratio'),
                    wrong(`Rp${fmt(total * 10000)}`, 'ratio_ignored'),
                    wrong(`Rp${fmt(k * 10000)}`, 'ratio_ignored')
                ],
                explanation: `Jumlah bagian = ${x} + ${y} = ${x + y}. Satu bagian = Rp${fmt(total * 10000)} ÷ ${x + y} = Rp${fmt(k * 10000)}. Uang Ani = ${x} × Rp${fmt(k * 10000)} = Rp${fmt(x * k * 10000)}.`,
                hints: [
                    'Jumlahkan angka perbandingan.',
                    'Bagi jumlah uang dengan jumlah bagian.',
                    'Kalikan hasilnya dengan bagian Ani.'
                ],
                difficulty_b: 1.0,
                est_seconds: 80
            };
        }
    },

    B7: {
        L1: (rng) => {
            const nums = [randInt(rng, 1, 20), -randInt(rng, 1, 20), -randInt(rng, 1, 20), 0];
            const shuffled = shuffle(rng, nums);
            const largest = Math.max(...nums);
            return {
                stem: `Bilangan terbesar di antara ${shuffled.join(', ')} adalah ...`,
                correct: largest,
                wrongs: [
                    wrong(-Math.abs(largest) || -1, 'sign_error'),
                    wrong(0, 'sign_error'),
                    wrong(Math.min(...nums), 'sign_error')
                ],
                explanation: `Pada garis bilangan, semakin ke kanan semakin besar. Bilangan terbesar adalah ${largest}.`,
                hints: [
                    'Bilangan negatif selalu lebih kecil daripada nol dan bilangan positif.',
                    'Semakin besar angka tanpa tanda minus, semakin kecil nilainya jika negatif.',
                    'Urutkan pada garis bilangan dari kiri ke kanan.'
                ],
                difficulty_b: -0.1,
                est_seconds: 30
            };
        },
        L2: (rng) => {
            const a = randInt(rng, 3, 15);
            const b = randInt(rng, 4, 20);
            const correct = -a + b;
            return {
                stem: `Hasil dari -${a} + ${b} adalah ...`,
                correct,
                wrongs: [
                    wrong(-a - b, 'sign_error'),
                    wrong(a + b, 'sign_error'),
                    wrong(a - b, 'sign_error')
                ],
                explanation: `Mulai dari -${a}, lalu bergeser ${b} satuan ke kanan: hasilnya ${correct}.`,
                hints: [
                    'Bilangan negatif berada di kiri nol.',
                    'Menambah bilangan positif berarti bergeser ke kanan.',
                    `-${a} + ${b} = ${correct}.`
                ],
                difficulty_b: 0.4,
                est_seconds: 40
            };
        },
        L3: (rng) => {
            const start = -randInt(rng, 3, 15);
            const rise = randInt(rng, 5, 25);
            const correct = start + rise;
            return {
                stem: `Suhu di puncak gunung pagi hari ${start}°C. Pada siang hari suhu naik ${rise}°C. Suhu siang hari adalah ...`,
                correct: `${correct}°C`,
                wrongs: [
                    wrong(`${start - rise}°C`, 'sign_error'),
                    wrong(`${Math.abs(start) + rise}°C`, 'sign_error'),
                    wrong(`${rise - start}°C`, 'sign_error')
                ],
                explanation: `Suhu naik berarti ditambah: ${start} + ${rise} = ${correct}°C.`,
                hints: [
                    'Kata "naik" berarti penjumlahan.',
                    'Perhatikan tanda negatif pada suhu awal.',
                    `${start} + ${rise} = ${correct}.`
                ],
                difficulty_b: 0.9,
                est_seconds: 60
            };
        }
    },

    B8: {
        L1: (rng) => {
            const n = randInt(rng, 11, 20);
            const correct = n * n;
            return {
                stem: `Hasil dari ${n}² adalah ...`,
                correct,
                wrongs: [
                    wrong(n * 2, 'power_as_multiply_by_2'),
                    wrong(correct + n, 'computation_error'),
                    wrong(correct - n, 'computation_error')
                ],
                explanation: `${n}² = ${n} × ${n} = ${correct}.`,
                hints: [
                    'Pangkat dua berarti dikalikan dirinya sendiri.',
                    'Bukan dikali dua.',
                    `${n} × ${n} = ${correct}.`
                ],
                difficulty_b: 0.1,
                est_seconds: 30
            };
        },
        L2: (rng) => {
            const n = randInt(rng, 6, 20);
            const sq = n * n;
            return {
                stem: `Hasil dari √${sq} adalah ...`,
                correct: n,
                wrongs: [
                    wrong(n * 2, 'sqrt_error'),
                    wrong(sq / 2, 'sqrt_error'),
                    wrong(n + 1, 'sqrt_error')
                ],
                explanation: `√${sq} = ${n} karena ${n} × ${n} = ${sq}.`,
                hints: [
                    'Akar kuadrat mencari bilangan yang jika dikuadratkan menghasilkan bilangan itu.',
                    'Coba hafalan kuadrat 1–20.',
                    `${n} × ${n} = ${sq}.`
                ],
                difficulty_b: 0.3,
                est_seconds: 35
            };
        },
        L3: (rng) => {
            const n = randInt(rng, 3, 9);
            const m = randInt(rng, 3, 7);
            const cube = n * n * n;
            const correct = n + m * m;
            return {
                stem: `Hasil dari ³√${cube} + ${m}² adalah ...`,
                correct,
                wrongs: [
                    wrong(n + m, 'forgot_square'),
                    wrong(cube + m * m, 'sqrt_error'),
                    wrong(n * m, 'wrong_operation')
                ],
                explanation: `³√${cube} = ${n} dan ${m}² = ${m * m}. Jumlahnya ${n} + ${m * m} = ${correct}.`,
                hints: [
                    'Hitung akar pangkat tiga dan pangkat dua secara terpisah.',
                    `³√${cube} = ${n}.`,
                    `${m}² = ${m * m}.`
                ],
                difficulty_b: 0.9,
                est_seconds: 60
            };
        }
    },

    B9: {
        L1: (rng) => {
            const start = randInt(rng, 2, 15);
            const step = randInt(rng, 2, 9);
            const seq = [start, start + step, start + 2 * step, start + 3 * step];
            const correct = start + 4 * step;
            return {
                stem: `Perhatikan pola bilangan: ${seq.join(', ')}, ... Bilangan berikutnya adalah ...`,
                correct,
                wrongs: [
                    wrong(start + 3 * step, 'same_as_last'),
                    wrong(correct + step, 'off_by_one_step'),
                    wrong(seq[3] * 2, 'wrong_pattern')
                ],
                explanation: `Setiap suku bertambah ${step}. Jadi ${seq[3]} + ${step} = ${correct}.`,
                hints: [
                    'Cari selisih antara dua suku berdekatan.',
                    'Selisihnya tetap.',
                    `${seq[3]} + ${step} = ${correct}.`
                ],
                difficulty_b: 0.2,
                est_seconds: 35
            };
        },
        L2: (rng) => {
            const start = randInt(rng, 1, 6);
            const d1 = randInt(rng, 2, 4);
            const inc = randInt(rng, 1, 3);
            const seq = [start];
            let diff = d1;
            for (let i = 0; i < 3; i++) {
                seq.push(seq[seq.length - 1] + diff);
                diff += inc;
            }
            const correct = seq[seq.length - 1] + diff;
            return {
                stem: `Perhatikan pola bilangan: ${seq.join(', ')}, ... Bilangan berikutnya adalah ...`,
                correct,
                wrongs: [
                    wrong(seq[seq.length - 1] + d1, 'wrong_pattern'),
                    wrong(correct + inc, 'off_by_one_step'),
                    wrong(seq[seq.length - 1] * 2, 'wrong_pattern')
                ],
                explanation: `Selisihnya bertambah ${inc} setiap langkah (${d1}, ${d1 + inc}, ${d1 + 2 * inc}, ${diff}). Jadi ${seq[seq.length - 1]} + ${diff} = ${correct}.`,
                hints: [
                    'Cek selisih antarsuku.',
                    'Selisihnya sendiri membentuk pola.',
                    'Selisih berikutnya adalah ' + diff + '.'
                ],
                difficulty_b: 0.7,
                est_seconds: 55
            };
        },
        L3: (rng) => {
            const tables = randInt(rng, 5, 12);
            const correct = 2 * tables + 2;
            return {
                stem: `Meja persegi disusun berderet. Satu meja memuat 4 kursi, dua meja memuat 6 kursi, tiga meja memuat 8 kursi. Untuk ${tables} meja, banyak kursi adalah ...`,
                correct,
                wrongs: [
                    wrong(4 * tables, 'wrong_pattern'),
                    wrong(2 * tables, 'forgot_plus_two'),
                    wrong(2 * tables + 4, 'off_by_one_step')
                ],
                explanation: `Polanya 4, 6, 8, ... dengan rumus 2n + 2. Untuk n = ${tables}: 2 × ${tables} + 2 = ${correct}.`,
                hints: [
                    'Tulis pola: 4, 6, 8, ...',
                    'Setiap tambah satu meja, kursi bertambah 2.',
                    'Rumusnya 2n + 2 untuk n meja.'
                ],
                difficulty_b: 1.1,
                est_seconds: 85
            };
        }
    },

    G1: {
        L1: (rng) => {
            const w = randInt(rng, 5, 20);
            const h = randInt(rng, 3, 15);
            const area = w * h;
            return {
                stem: `Luas persegi panjang dengan panjang ${w} cm dan lebar ${h} cm adalah ...`,
                correct: `${area} cm²`,
                wrongs: [
                    wrong(`${2 * (w + h)} cm`, 'confuse_area_perimeter'),
                    wrong(`${area * 2} cm²`, 'double_area'),
                    wrong(`${w + h} cm²`, 'add_sides')
                ],
                explanation: `Luas = panjang × lebar = ${w} × ${h} = ${area} cm².`,
                hints: [
                    'Rumus luas persegi panjang: panjang × lebar.',
                    'Satuan luas adalah cm².',
                    `${w} × ${h} = ${area}.`
                ],
                difficulty_b: -0.3,
                est_seconds: 30
            };
        },
        L2: (rng) => {
            const base = randInt(rng, 4, 20) * 2;
            const height = randInt(rng, 3, 15);
            const area = base * height / 2;
            return {
                stem: `Luas segitiga dengan alas ${base} cm dan tinggi ${height} cm adalah ...`,
                correct: `${area} cm²`,
                wrongs: [
                    wrong(`${base * height} cm²`, 'forgot_half'),
                    wrong(`${base + height} cm²`, 'add_sides'),
                    wrong(`${area + base} cm²`, 'computation_error')
                ],
                explanation: `Luas = ½ × alas × tinggi = ½ × ${base} × ${height} = ${area} cm².`,
                hints: [
                    'Rumus luas segitiga: ½ × alas × tinggi.',
                    'Jangan lupa membagi dua.',
                    `½ × ${base} × ${height} = ${area}.`
                ],
                difficulty_b: 0.4,
                est_seconds: 45
            };
        },
        L3: (rng) => {
            const pw = randInt(rng, 15, 25);
            const pl = randInt(rng, 10, 20);
            const kw = randInt(rng, 3, 8);
            const kl = randInt(rng, 3, 8);
            const correct = pw * pl - kw * kl;
            return {
                stem: `Sebuah kebun berbentuk persegi panjang berukuran ${pw} m × ${pl} m. Di dalamnya dibuat kolam berukuran ${kw} m × ${kl} m. Luas kebun yang dapat ditanami adalah ...`,
                correct: `${correct} m²`,
                wrongs: [
                    wrong(`${pw * pl} m²`, 'forgot_subtraction'),
                    wrong(`${kw * kl} m²`, 'wrong_area'),
                    wrong(`${pw * pl + kw * kl} m²`, 'wrong_operation')
                ],
                explanation: `Luas kebun = ${pw} × ${pl} = ${pw * pl} m². Luas kolam = ${kw} × ${kl} = ${kw * kl} m². Sisa = ${pw * pl} − ${kw * kl} = ${correct} m².`,
                hints: [
                    'Hitung luas kebun dan luas kolam secara terpisah.',
                    'Kurangi luas kolam dari luas kebun.',
                    `${pw * pl} − ${kw * kl} = ${correct}.`
                ],
                difficulty_b: 1.0,
                est_seconds: 80
            };
        }
    },

    G2: {
        L1: (rng) => {
            const deg = pick(rng, [25, 40, 60, 90, 110, 135, 180]);
            const type = deg < 90 ? 'lancip' : deg === 90 ? 'siku-siku' : deg === 180 ? 'lurus' : 'tumpul';
            const all = ['lancip', 'siku-siku', 'tumpul', 'lurus', 'refleks'];
            return {
                stem: `Sudut yang besarnya ${deg}° termasuk sudut ...`,
                correct: type,
                wrongs: all.filter(t => t !== type).map(t => wrong(t, 'angle_type_error')),
                explanation: `Sudut ${deg}° ${deg < 90 ? 'kurang dari 90°, jadi lancip' : deg === 90 ? 'tepat 90°, jadi siku-siku' : deg === 180 ? 'tepat 180°, jadi lurus' : 'antara 90° dan 180°, jadi tumpul'}.`,
                hints: [
                    'Lancip < 90°, siku-siku = 90°, tumpul antara 90° dan 180°.',
                    'Sudut lurus = 180°.',
                    `${deg}° ${deg < 90 ? 'lebih kecil dari 90°' : 'tidak kurang dari 90°'}.`
                ],
                difficulty_b: -0.4,
                est_seconds: 25
            };
        },
        L2: (rng) => {
            const hour = randInt(rng, 1, 12);
            const minute = pick(rng, [0, 30]);
            const hourAngle = (hour % 12) * 30 + minute * 0.5;
            const minuteAngle = minute * 6;
            let angle = Math.abs(hourAngle - minuteAngle);
            if (angle > 180) angle = 360 - angle;
            return {
                stem: `Sudut terkecil yang dibentuk jarum jam pada pukul ${hour}.${String(minute).padStart(2, '0')} adalah ...`,
                correct: `${angle}°`,
                wrongs: [
                    wrong(`${angle + 30}°`, 'clock_angle'),
                    wrong(`${Math.abs(angle - 30)}°`, 'clock_angle'),
                    wrong(`${180 - angle > 0 ? 180 - angle : angle + 45}°`, 'clock_angle')
                ],
                explanation: `Jarum jam = ${hourAngle}°, jarum menit = ${minuteAngle}°. Selisih terkecil = ${angle}°.`,
                hints: [
                    'Setiap jam = 30°, setiap menit = 6°.',
                    'Jarum jam juga bergerak 0,5° per menit.',
                    'Ambil sudut terkecil, maksimal 180°.'
                ],
                difficulty_b: 0.7,
                est_seconds: 60
            };
        },
        L3: (rng) => {
            const a = randInt(rng, 20, 160);
            const correct = 180 - a;
            return {
                stem: `Dua sudut saling berpelurus. Jika salah satu sudutnya ${a}°, sudut lainnya adalah ...`,
                correct: `${correct}°`,
                wrongs: [
                    wrong(`${a}°`, 'same_angle'),
                    wrong(`${90 - a > 0 ? 90 - a : a + 10}°`, 'confuse_complement_supplement'),
                    wrong(`${360 - a}°`, 'confuse_full_rotation')
                ],
                explanation: `Sudut berpelurus berjumlah 180°: 180° − ${a}° = ${correct}°.`,
                hints: [
                    'Berpelurus berarti jumlahnya 180°.',
                    'Berpenyiku berarti jumlahnya 90°.',
                    `180° − ${a}° = ${correct}°.`
                ],
                difficulty_b: 0.6,
                est_seconds: 45
            };
        }
    },

    G3: {
        L1: (rng) => {
            const ask = pick(rng, [
                { q: 'rusuk', a: 12 },
                { q: 'sisi', a: 6 },
                { q: 'titik sudut', a: 8 }
            ]);
            return {
                stem: `Kubus memiliki ... ${ask.q}.`,
                correct: ask.a,
                wrongs: [
                    wrong(ask.a === 12 ? 6 : 12, 'cube_property_error'),
                    wrong(ask.a === 8 ? 6 : 8, 'cube_property_error'),
                    wrong(ask.a + 4, 'cube_property_error')
                ],
                explanation: `Kubus memiliki 6 sisi, 12 rusuk, dan 8 titik sudut.`,
                hints: [
                    'Bayangkan kotak kado.',
                    'Sisi = bidang, rusuk = garis pertemuan sisi.',
                    'Kubus: 6 sisi, 12 rusuk, 8 titik sudut.'
                ],
                difficulty_b: -0.3,
                est_seconds: 25
            };
        },
        L2: (rng) => {
            const shape = pick(rng, [
                { name: 'kubus', faces: 6 },
                { name: 'balok', faces: 6 },
                { name: 'limas segiempat', faces: 5 },
                { name: 'prisma segitiga', faces: 5 }
            ]);
            return {
                stem: `Banyak sisi pada ${shape.name} adalah ...`,
                correct: shape.faces,
                wrongs: [
                    wrong(shape.faces + 2, 'solid_shape_error'),
                    wrong(shape.faces - 1, 'solid_shape_error'),
                    wrong(shape.faces * 2, 'solid_shape_error')
                ],
                explanation: `${shape.name} memiliki ${shape.faces} sisi.`,
                hints: [
                    'Hitung bidang datar yang membatasi bangun.',
                    'Kubus dan balok punya 6 sisi.',
                    'Limas segiempat punya 4 sisi tegak + 1 alas.'
                ],
                difficulty_b: 0.4,
                est_seconds: 40
            };
        },
        L3: (rng) => {
            const shape = pick(rng, [
                { name: 'prisma segitiga', edges: 9, vertices: 6 },
                { name: 'limas segiempat', edges: 8, vertices: 5 },
                { name: 'kubus', edges: 12, vertices: 8 }
            ]);
            const askEdges = rng() < 0.5;
            return {
                stem: askEdges
                    ? `Banyak rusuk pada ${shape.name} adalah ...`
                    : `Banyak titik sudut pada ${shape.name} adalah ...`,
                correct: askEdges ? shape.edges : shape.vertices,
                wrongs: [
                    wrong(askEdges ? shape.vertices : shape.edges, 'solid_shape_error'),
                    wrong((askEdges ? shape.edges : shape.vertices) + 2, 'solid_shape_error'),
                    wrong((askEdges ? shape.edges : shape.vertices) - 2, 'solid_shape_error')
                ],
                explanation: `${shape.name} memiliki ${shape.edges} rusuk dan ${shape.vertices} titik sudut.`,
                hints: [
                    'Rusuk adalah garis pertemuan dua sisi.',
                    'Titik sudut adalah pertemuan tiga rusuk atau lebih.',
                    'Hitung dengan teliti bagian alas, atas, dan tegak.'
                ],
                difficulty_b: 0.9,
                est_seconds: 55
            };
        }
    },

    G4: {
        L1: (rng) => {
            const p = randInt(rng, 4, 12);
            const l = randInt(rng, 3, 10);
            const t = randInt(rng, 2, 8);
            const v = p * l * t;
            return {
                stem: `Volume balok dengan panjang ${p} cm, lebar ${l} cm, dan tinggi ${t} cm adalah ...`,
                correct: `${v} cm³`,
                wrongs: [
                    wrong(`${2 * (p * l + p * t + l * t)} cm²`, 'confuse_volume_surface'),
                    wrong(`${p + l + t} cm³`, 'add_sides'),
                    wrong(`${p * l} cm³`, 'forgot_height')
                ],
                explanation: `Volume = p × l × t = ${p} × ${l} × ${t} = ${v} cm³.`,
                hints: [
                    'Rumus volume balok: panjang × lebar × tinggi.',
                    'Satuan volume adalah cm³.',
                    `${p} × ${l} × ${t} = ${v}.`
                ],
                difficulty_b: 0.1,
                est_seconds: 35
            };
        },
        L2: (rng) => {
            const p = randInt(rng, 4, 10);
            const l = randInt(rng, 3, 8);
            const t = randInt(rng, 2, 6);
            const lp = 2 * (p * l + p * t + l * t);
            return {
                stem: `Luas permukaan balok berukuran ${p} cm × ${l} cm × ${t} cm adalah ...`,
                correct: `${lp} cm²`,
                wrongs: [
                    wrong(`${p * l * t} cm³`, 'confuse_volume_surface'),
                    wrong(`${p * l + p * t + l * t} cm²`, 'forgot_factor_2'),
                    wrong(`${2 * (p + l + t)} cm²`, 'perimeter_error')
                ],
                explanation: `Luas permukaan = 2 × (p×l + p×t + l×t) = 2 × (${p * l} + ${p * t} + ${l * t}) = ${lp} cm².`,
                hints: [
                    'Ada 3 pasang sisi yang sama.',
                    'Kalikan jumlah tiga jenis sisi dengan 2.',
                    `2 × (${p * l} + ${p * t} + ${l * t}) = ${lp}.`
                ],
                difficulty_b: 0.6,
                est_seconds: 60
            };
        },
        L3: (rng) => {
            const p = randInt(rng, 4, 10);
            const l = randInt(rng, 3, 8);
            const t = randInt(rng, 2, 9);
            const v = p * l * t;
            return {
                stem: `Volume sebuah balok ${v} cm³. Jika panjangnya ${p} cm dan lebarnya ${l} cm, tingginya adalah ...`,
                correct: `${t} cm`,
                wrongs: [
                    wrong(`${v} cm`, 'volume_ignored'),
                    wrong(`${p * l} cm`, 'wrong_operation'),
                    wrong(`${t + 2} cm`, 'computation_error')
                ],
                explanation: `Tinggi = Volume ÷ (panjang × lebar) = ${v} ÷ (${p} × ${l}) = ${t} cm.`,
                hints: [
                    'Volume = p × l × t.',
                    'Maka t = Volume ÷ (p × l).',
                    `${v} ÷ ${p * l} = ${t}.`
                ],
                difficulty_b: 1.0,
                est_seconds: 70
            };
        }
    },

    G5: {
        L1: (rng) => {
            const km = randInt(rng, 2, 9);
            const correct = km * 1000;
            return {
                stem: `${km} km = ... m`,
                correct,
                wrongs: [
                    wrong(km * 100, 'unit_conversion'),
                    wrong(km * 10, 'unit_conversion'),
                    wrong(km / 1000, 'unit_conversion')
                ],
                explanation: `1 km = 1000 m, jadi ${km} km = ${fmt(correct)} m.`,
                hints: [
                    'Turun satu tangga dari km ke m berarti dikali 1000.',
                    '1 km = 1000 m.',
                    `${km} × 1000 = ${fmt(correct)}.`
                ],
                difficulty_b: -0.4,
                est_seconds: 25
            };
        },
        L2: (rng) => {
            const kg = randInt(rng, 2, 9);
            const gram = randInt(rng, 1, 9) * 100;
            const correct = kg * 1000 + gram;
            return {
                stem: `${kg} kg ${gram} gram = ... gram`,
                correct,
                wrongs: [
                    wrong(kg * 100 + gram, 'unit_conversion'),
                    wrong(kg * 1000, 'ignored_remainder'),
                    wrong(kg * 10000 + gram, 'unit_conversion')
                ],
                explanation: `${kg} kg = ${fmt(kg * 1000)} gram. Ditambah ${gram} gram menjadi ${fmt(correct)} gram.`,
                hints: [
                    '1 kg = 1000 gram.',
                    'Ubah kilogram ke gram lebih dulu.',
                    'Jangan lupa menambahkan sisa gram.'
                ],
                difficulty_b: 0.2,
                est_seconds: 35
            };
        },
        L3: (rng) => {
            const hours = randInt(rng, 1, 3);
            const minutes = randInt(rng, 10, 50);
            const correct = hours * 60 + minutes;
            return {
                stem: `Kakak belajar selama ${hours} jam ${minutes} menit. Total waktu belajar dalam menit adalah ...`,
                correct,
                wrongs: [
                    wrong(hours * 100 + minutes, 'unit_conversion'),
                    wrong(hours * 60, 'ignored_remainder'),
                    wrong(hours * 3600 + minutes, 'unit_conversion')
                ],
                explanation: `${hours} jam = ${hours * 60} menit. Ditambah ${minutes} menit menjadi ${correct} menit.`,
                hints: [
                    '1 jam = 60 menit.',
                    'Kalikan jumlah jam dengan 60.',
                    `${hours * 60} + ${minutes} = ${correct}.`
                ],
                difficulty_b: 0.8,
                est_seconds: 70
            };
        }
    },

    G6: {
        L1: (rng) => {
            const shape = pick(rng, [
                { name: 'persegi', lines: 4 },
                { name: 'persegi panjang', lines: 2 },
                { name: 'segitiga sama sisi', lines: 3 },
                { name: 'belah ketupat', lines: 2 }
            ]);
            return {
                stem: `Banyak simetri lipat pada ${shape.name} adalah ...`,
                correct: shape.lines,
                wrongs: [
                    wrong(shape.lines + 1, 'symmetry_error'),
                    wrong(Math.max(1, shape.lines - 1), 'symmetry_error'),
                    wrong(shape.lines * 2, 'symmetry_error')
                ],
                explanation: `${shape.name} memiliki ${shape.lines} simetri lipat.`,
                hints: [
                    'Lipat bangun sehingga kedua bagian tepat berimpit.',
                    'Hitung semua kemungkinan lipatan.',
                    `${shape.name} memiliki ${shape.lines} simetri lipat.`
                ],
                difficulty_b: -0.2,
                est_seconds: 30
            };
        },
        L2: (rng) => {
            const shape = pick(rng, [
                { name: 'persegi', order: 4 },
                { name: 'segitiga sama sisi', order: 3 },
                { name: 'persegi panjang', order: 2 }
            ]);
            return {
                stem: `Simetri putar tingkat ${shape.order} dimiliki oleh ...`,
                correct: shape.name,
                wrongs: [
                    wrong(shape.name === 'persegi' ? 'segitiga sama sisi' : 'persegi', 'rotational_symmetry_error'),
                    wrong('trapesium sembarang', 'rotational_symmetry_error'),
                    wrong('segitiga sembarang', 'rotational_symmetry_error')
                ],
                explanation: `${shape.name} dapat menempati bingkainya kembali dalam ${shape.order} posisi putaran.`,
                hints: [
                    'Simetri putar = bangun kembali ke posisi semula setelah diputar.',
                    'Persegi memiliki simetri putar tingkat 4.',
                    `${shape.name} memiliki simetri putar tingkat ${shape.order}.`
                ],
                difficulty_b: 0.5,
                est_seconds: 45
            };
        },
        L3: (rng) => {
            const x = randInt(rng, 1, 6);
            const y = randInt(rng, 1, 6);
            const axis = pick(rng, ['X', 'Y']);
            const correct = axis === 'X' ? `(${x}, ${-y})` : `(${-x}, ${y})`;
            return {
                stem: `Titik (${x}, ${y}) dicerminkan terhadap sumbu ${axis}. Koordinat bayangannya adalah ...`,
                correct,
                wrongs: [
                    wrong(axis === 'X' ? `(${-x}, ${y})` : `(${x}, ${-y})`, 'wrong_axis'),
                    wrong(`(${-x}, ${-y})`, 'rotation_instead_of_reflection'),
                    wrong(`(${y}, ${x})`, 'swap_coordinates')
                ],
                explanation: `Pencerminan terhadap sumbu ${axis}: ${axis === 'X' ? '(x, y) → (x, −y)' : '(x, y) → (−x, y)'}, jadi ${correct}.`,
                hints: [
                    'Sumbu X: nilai y berubah tanda.',
                    'Sumbu Y: nilai x berubah tanda.',
                    'Urutan koordinat tetap (x, y).'
                ],
                difficulty_b: 0.9,
                est_seconds: 60
            };
        }
    },

    G7: {
        L1: (rng) => {
            const x = randInt(rng, 1, 7);
            const y = randInt(rng, 1, 7);
            return {
                stem: `Titik P berada ${x} satuan ke kanan dan ${y} satuan ke atas dari titik pusat (0,0). Koordinat P adalah ...`,
                correct: `(${x}, ${y})`,
                wrongs: [
                    wrong(`(${y}, ${x})`, 'swap_coordinates'),
                    wrong(`(${-x}, ${y})`, 'sign_error'),
                    wrong(`(${x}, ${-y})`, 'sign_error')
                ],
                explanation: `Ke kanan berarti x positif, ke atas berarti y positif, jadi P(${x}, ${y}).`,
                hints: [
                    'Koordinat ditulis (x, y).',
                    'Kanan dan atas bernilai positif.',
                    `x = ${x}, y = ${y}.`
                ],
                difficulty_b: -0.3,
                est_seconds: 30
            };
        },
        L2: (rng) => {
            const x = pick(rng, [-6, -4, -2, 2, 4, 6]);
            const y = pick(rng, [-6, -4, -2, 2, 4, 6]);
            const quadrant = x > 0 && y > 0 ? 'I' : x < 0 && y > 0 ? 'II' : x < 0 && y < 0 ? 'III' : 'IV';
            const others = ['I', 'II', 'III', 'IV'].filter(q => q !== quadrant);
            return {
                stem: `Titik (${x}, ${y}) terletak pada kuadran ...`,
                correct: quadrant,
                wrongs: [
                    wrong(others[0], 'quadrant_error'),
                    wrong(others[1], 'quadrant_error'),
                    wrong(others[2], 'quadrant_error')
                ],
                explanation: `x ${x > 0 ? 'positif' : 'negatif'} dan y ${y > 0 ? 'positif' : 'negatif'}, sehingga berada di kuadran ${quadrant}.`,
                hints: [
                    'Kuadran I (+,+), II (−,+), III (−,−), IV (+,−).',
                    'Periksa tanda x dan y.',
                    `Tanda x ${x > 0 ? '+' : '−'}, tanda y ${y > 0 ? '+' : '−'}.`
                ],
                difficulty_b: 0.5,
                est_seconds: 40
            };
        },
        L3: (rng) => {
            const a = randInt(rng, 1, 5);
            const b = randInt(rng, 6, 12);
            const correct = Math.abs(b - a);
            return {
                stem: `Jarak titik (${a}, 0) dan (${b}, 0) pada bidang koordinat adalah ... satuan`,
                correct,
                wrongs: [
                    wrong(a + b, 'wrong_operation'),
                    wrong(Math.abs(b - a) + 1, 'computation_error'),
                    wrong(b, 'ignored_first_point')
                ],
                explanation: `Kedua titik berada pada sumbu X, jadi jaraknya |${b} − ${a}| = ${correct} satuan.`,
                hints: [
                    'Kedua titik berada pada sumbu X.',
                    'Jarak = selisih absis.',
                    `|${b} − ${a}| = ${correct}.`
                ],
                difficulty_b: 0.8,
                est_seconds: 55
            };
        }
    },

    G8: {
        L1: (rng) => {
            const r = pick(rng, [7, 14, 21]);
            const k = 2 * (22 / 7) * r;
            return {
                stem: `Keliling lingkaran dengan jari-jari ${r} cm adalah ... (π = 22/7)`,
                correct: `${k} cm`,
                wrongs: [
                    wrong(`${(22 / 7) * r * r} cm²`, 'confuse_circumference_area'),
                    wrong(`${(22 / 7) * r} cm`, 'forgot_factor_2'),
                    wrong(`${k * 2} cm`, 'computation_error')
                ],
                explanation: `Keliling = 2πr = 2 × 22/7 × ${r} = ${k} cm.`,
                hints: [
                    'Rumus keliling lingkaran: 2πr.',
                    'Gunakan π = 22/7 karena r kelipatan 7.',
                    `2 × 22/7 × ${r} = ${k}.`
                ],
                difficulty_b: 0.1,
                est_seconds: 40
            };
        },
        L2: (rng) => {
            const r = pick(rng, [7, 14, 21]);
            const luas = (22 / 7) * r * r;
            return {
                stem: `Luas lingkaran dengan jari-jari ${r} cm adalah ... (π = 22/7)`,
                correct: `${luas} cm²`,
                wrongs: [
                    wrong(`${2 * (22 / 7) * r} cm`, 'confuse_circumference_area'),
                    wrong(`${(22 / 7) * r} cm²`, 'forgot_square'),
                    wrong(`${luas * 2} cm²`, 'computation_error')
                ],
                explanation: `Luas = πr² = 22/7 × ${r} × ${r} = ${luas} cm².`,
                hints: [
                    'Rumus luas lingkaran: πr².',
                    'r² berarti r × r.',
                    `22/7 × ${r} × ${r} = ${luas}.`
                ],
                difficulty_b: 0.5,
                est_seconds: 45
            };
        },
        L3: (rng) => {
            const d = pick(rng, [14, 28, 42]);
            const k = (22 / 7) * d;
            return {
                stem: `Sebuah taman berbentuk lingkaran dengan diameter ${d} m. Keliling taman tersebut adalah ... (π = 22/7)`,
                correct: `${k} m`,
                wrongs: [
                    wrong(`${k / 2} m`, 'forgot_factor_2'),
                    wrong(`${(22 / 7) * (d / 2) * (d / 2)} m²`, 'confuse_circumference_area'),
                    wrong(`${d} m`, 'diameter_as_circumference')
                ],
                explanation: `Keliling = πd = 22/7 × ${d} = ${k} m.`,
                hints: [
                    'Keliling lingkaran = π × diameter.',
                    'Diameter sudah diketahui, tidak perlu dibagi dua.',
                    `22/7 × ${d} = ${k}.`
                ],
                difficulty_b: 0.9,
                est_seconds: 70
            };
        }
    },

    D1: {
        L1: (rng) => {
            const labels = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
            const values = labels.map(() => randInt(rng, 4, 24));
            const maxIdx = values.indexOf(Math.max(...values));
            return {
                stem: 'Diagram batang berikut menunjukkan jumlah buku yang dibaca selama seminggu. Hari dengan jumlah buku terbanyak adalah ...',
                media: { type: 'bar', labels, values },
                correct: labels[maxIdx],
                wrongs: labels
                    .filter((_, i) => i !== maxIdx)
                    .slice(0, 3)
                    .map(l => wrong(l, 'misread_chart')),
                explanation: `Batang tertinggi adalah hari ${labels[maxIdx]} dengan ${values[maxIdx]} buku.`,
                hints: [
                    'Cari batang yang paling tinggi.',
                    'Bandingkan tinggi batang satu per satu.',
                    `Batang tertinggi menunjukkan nilai ${values[maxIdx]}.`
                ],
                difficulty_b: 0,
                est_seconds: 40
            };
        },
        L2: (rng) => {
            const rows = [
                ['Buku', randInt(rng, 10, 40)],
                ['Pensil', randInt(rng, 10, 40)],
                ['Penghapus', randInt(rng, 10, 40)]
            ];
            const total = rows.reduce((sum, r) => sum + r[1], 0);
            return {
                stem: 'Perhatikan tabel hasil penjualan alat tulis berikut. Jumlah seluruh barang yang terjual adalah ...',
                media: { type: 'table', head: ['Barang', 'Jumlah'], rows },
                correct: total,
                wrongs: [
                    wrong(Math.max(...rows.map(r => r[1])), 'read_max_only'),
                    wrong(total - rows[0][1], 'missed_row'),
                    wrong(total + 10, 'computation_error')
                ],
                explanation: `Jumlahkan semua baris: ${rows.map(r => r[1]).join(' + ')} = ${total}.`,
                hints: [
                    'Baca semua baris pada tabel.',
                    'Jumlahkan nilai pada kolom jumlah.',
                    `${rows.map(r => r[1]).join(' + ')} = ${total}.`
                ],
                difficulty_b: 0.4,
                est_seconds: 50
            };
        },
        L3: (rng) => {
            const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei'];
            const values = labels.map(() => randInt(rng, 5, 30));
            const maxIdx = values.indexOf(Math.max(...values));
            const minIdx = values.indexOf(Math.min(...values));
            const diff = values[maxIdx] - values[minIdx];
            return {
                stem: 'Diagram batang berikut menunjukkan jumlah pengunjung perpustakaan. Selisih pengunjung terbanyak dan tersedikit adalah ...',
                media: { type: 'bar', labels, values },
                correct: diff,
                wrongs: [
                    wrong(values[maxIdx] + values[minIdx], 'add_instead_of_difference'),
                    wrong(values[maxIdx], 'read_max_only'),
                    wrong(Math.abs(diff - 2), 'computation_error')
                ],
                explanation: `Terbanyak ${values[maxIdx]} (${labels[maxIdx]}), tersedikit ${values[minIdx]} (${labels[minIdx]}). Selisih = ${diff}.`,
                hints: [
                    'Cari nilai terbesar dan terkecil.',
                    'Selisih = nilai terbesar − nilai terkecil.',
                    `${values[maxIdx]} − ${values[minIdx]} = ${diff}.`
                ],
                difficulty_b: 0.8,
                est_seconds: 60
            };
        }
    },

    D2: {
        L1: (rng) => {
            const data = Array.from({ length: 4 }, () => randInt(rng, 4, 20));
            const sum = data.reduce((a, b) => a + b, 0);
            const correct = sum / 4;
            const text = Number.isInteger(correct) ? String(correct) : correct.toFixed(2).replace('.', ',');
            return {
                stem: `Rata-rata (mean) dari data ${data.join(', ')} adalah ...`,
                correct: text,
                wrongs: [
                    wrong(sum, 'forgot_divide'),
                    wrong(Math.max(...data), 'read_max_only'),
                    wrong((correct + 1).toFixed(2).replace('.', ','), 'computation_error')
                ],
                explanation: `Mean = jumlah data ÷ banyak data = ${sum} ÷ 4 = ${text}.`,
                hints: [
                    'Jumlahkan semua data.',
                    'Bagi dengan banyaknya data.',
                    `${sum} ÷ 4 = ${text}.`
                ],
                difficulty_b: 0,
                est_seconds: 45
            };
        },
        L2: (rng) => {
            const data = Array.from({ length: 5 }, () => randInt(rng, 3, 25)).sort((a, b) => a - b);
            const median = data[2];
            return {
                stem: `Median dari data ${shuffle(rng, data).join(', ')} adalah ...`,
                correct: median,
                wrongs: [
                    wrong(data[0], 'read_min'),
                    wrong(data[4], 'read_max'),
                    wrong(data[1], 'wrong_position')
                ],
                explanation: `Urutkan data: ${data.join(', ')}. Nilai tengahnya ${median}.`,
                hints: [
                    'Urutkan data dari terkecil ke terbesar.',
                    'Median adalah nilai tengah.',
                    `Data urut: ${data.join(', ')}.`
                ],
                difficulty_b: 0.3,
                est_seconds: 45
            };
        },
        L3: (rng) => {
            const mode = randInt(rng, 6, 12);
            const data = [mode, mode, mode, randInt(rng, 2, 5), randInt(rng, 13, 18), randInt(rng, 19, 24)];
            const mean = data.reduce((a, b) => a + b, 0) / data.length;
            return {
                stem: `Nilai ulangan enam siswa: ${shuffle(rng, data).join(', ')}. Modus dari data tersebut adalah ...`,
                correct: mode,
                wrongs: [
                    wrong(Math.max(...data), 'confuse_mode_max'),
                    wrong(Math.min(...data), 'confuse_mode_min'),
                    wrong(Math.round(mean), 'confuse_mode_mean')
                ],
                explanation: `Nilai ${mode} muncul paling sering (3 kali), jadi modusnya ${mode}.`,
                hints: [
                    'Modus adalah data yang paling sering muncul.',
                    'Hitung frekuensi setiap nilai.',
                    `${mode} muncul 3 kali.`
                ],
                difficulty_b: 0.8,
                est_seconds: 60
            };
        }
    },

    D3: {
        L1: (rng) => {
            const options = [
                { text: 'diagram lingkaran', tag: 'chart_type_error' },
                { text: 'diagram batang', tag: 'chart_type_error' },
                { text: 'diagram garis', tag: 'chart_type_error' },
                { text: 'piktogram', tag: 'chart_type_error' }
            ];
            return {
                stem: 'Diagram yang paling tepat untuk menunjukkan bagian dari keseluruhan adalah ...',
                correct: 'diagram lingkaran',
                wrongs: options.filter(o => o.text !== 'diagram lingkaran'),
                explanation: 'Diagram lingkaran menunjukkan proporsi setiap bagian terhadap keseluruhan.',
                hints: [
                    'Bagian dari keseluruhan biasanya dinyatakan dalam persen.',
                    'Bentuknya menyerupai potongan kue.',
                    'Diagram lingkaran (pie chart).'
                ],
                difficulty_b: -0.2,
                est_seconds: 30
            };
        },
        L2: (rng) => {
            const values = [randInt(rng, 2, 8), randInt(rng, 2, 8), randInt(rng, 2, 8), randInt(rng, 2, 8)];
            const freqs = [randInt(rng, 2, 6), randInt(rng, 2, 6), randInt(rng, 2, 6), randInt(rng, 2, 6)];
            const total = values.reduce((sum, v, i) => sum + v * freqs[i], 0);
            return {
                stem: 'Perhatikan tabel frekuensi berikut. Jumlah seluruh data adalah ...',
                media: {
                    type: 'table',
                    head: ['Nilai', 'Frekuensi'],
                    rows: values.map((v, i) => [v, freqs[i]])
                },
                correct: total,
                wrongs: [
                    wrong(values.reduce((a, b) => a + b, 0), 'sum_values_only'),
                    wrong(freqs.reduce((a, b) => a + b, 0), 'sum_freq_only'),
                    wrong(total + 5, 'computation_error')
                ],
                explanation: `Jumlah data = Σ(nilai × frekuensi) = ${values.map((v, i) => `${v}×${freqs[i]}`).join(' + ')} = ${total}.`,
                hints: [
                    'Kalikan setiap nilai dengan frekuensinya.',
                    'Jumlahkan semua hasil kali.',
                    `${values.map((v, i) => `${v}×${freqs[i]}`).join(' + ')} = ${total}.`
                ],
                difficulty_b: 0.4,
                est_seconds: 55
            };
        },
        L3: (rng) => {
            const target = randInt(rng, 4, 8);
            const freq = randInt(rng, 2, 4);
            const data = [target, target, randInt(rng, 1, 3), randInt(rng, 9, 12), randInt(rng, 1, 3)];
            for (let i = 2; i < 2 + (freq - 2); i++) data[i] = target;
            return {
                stem: `Data: ${shuffle(rng, data).join(', ')}. Jika disajikan dalam tabel frekuensi, frekuensi nilai ${target} adalah ...`,
                correct: freq,
                wrongs: [
                    wrong(freq - 1, 'count_error'),
                    wrong(freq + 1, 'count_error'),
                    wrong(target, 'confuse_value_frequency')
                ],
                explanation: `Nilai ${target} muncul sebanyak ${freq} kali.`,
                hints: [
                    'Frekuensi adalah banyaknya kemunculan.',
                    'Hitung nilai yang sama satu per satu.',
                    `${target} muncul ${freq} kali.`
                ],
                difficulty_b: 0.7,
                est_seconds: 55
            };
        }
    },

    D4: {
        L1: (rng) => {
            const cases = [
                { desc: 'mata dadu genap', n: 3 },
                { desc: 'mata dadu ganjil', n: 3 },
                { desc: 'mata dadu lebih dari 4', n: 2 },
                { desc: 'mata dadu 3', n: 1 }
            ];
            const c = pick(rng, cases);
            const correct = frac(c.n, 6);
            return {
                stem: `Sebuah dadu dilempar satu kali. Peluang muncul ${c.desc} adalah ...`,
                correct,
                wrongs: [
                    wrong(frac(c.n + 1, 6), 'count_error'),
                    wrong(frac(6 - c.n, 6), 'complement_error'),
                    wrong(frac(c.n, 5), 'wrong_total')
                ],
                explanation: `Ada ${c.n} hasil yang diharapkan dari 6 kemungkinan, jadi peluangnya ${c.n}/6 = ${correct}.`,
                hints: [
                    'Peluang = kejadian diharapkan ÷ semua kemungkinan.',
                    'Dadu memiliki 6 sisi.',
                    `${c.n}/6 = ${correct}.`
                ],
                difficulty_b: 0,
                est_seconds: 35
            };
        },
        L2: (rng) => {
            const red = randInt(rng, 2, 8);
            const blue = randInt(rng, 2, 8);
            const total = red + blue;
            const correct = frac(red, total);
            return {
                stem: `Dalam sebuah kantong terdapat ${red} bola merah dan ${blue} bola biru. Peluang terambil bola merah adalah ...`,
                correct,
                wrongs: [
                    wrong(frac(blue, total), 'wrong_color'),
                    wrong(frac(red, blue), 'wrong_total'),
                    wrong(frac(total, red), 'inverted_fraction')
                ],
                explanation: `Bola merah ${red}, seluruh bola ${total}. Peluang = ${red}/${total} = ${correct}.`,
                hints: [
                    'Semua kemungkinan = jumlah seluruh bola.',
                    'Kejadian diharapkan = jumlah bola merah.',
                    `${red}/${total} = ${correct}.`
                ],
                difficulty_b: 0.4,
                est_seconds: 45
            };
        },
        L3: (rng) => {
            const red = randInt(rng, 3, 6);
            const blue = randInt(rng, 2, 5);
            const green = randInt(rng, 2, 5);
            const total = red + blue + green;
            const correct = frac(blue + green, total);
            return {
                stem: `Sebuah kotak berisi ${red} bola merah, ${blue} bola biru, dan ${green} bola hijau. Peluang terambil bola BUKAN merah adalah ...`,
                correct,
                wrongs: [
                    wrong(frac(red, total), 'same_probability'),
                    wrong(frac(total, blue + green), 'inverted_fraction'),
                    wrong(frac(blue + green, red), 'wrong_total')
                ],
                explanation: `Bola bukan merah = ${blue} + ${green} = ${blue + green}. Peluang = ${blue + green}/${total} = ${correct}.`,
                hints: [
                    'Bukan merah berarti biru atau hijau.',
                    'Jumlahkan bola biru dan hijau.',
                    `${blue + green}/${total} = ${correct}.`
                ],
                difficulty_b: 0.9,
                est_seconds: 65
            };
        }
    }
};

const MISCONCEPTIONS = {
    place_value_confusion: 'Nilai tempat bergantung pada posisi digit, bukan hanya angka itu sendiri.',
    comparison_error: 'Bandingkan digit dari kiri, mulai dari nilai tempat terbesar.',
    digit_order_error: 'Perhatikan urutan nilai tempat saat menyusun bilangan.',
    order_of_operations: 'Urutan operasi: kurung → pangkat → kali/bagi → tambah/kurang.',
    ignore_parentheses: 'Operasi di dalam kurung selalu dikerjakan lebih dulu.',
    forgot_subtraction: 'Kembalian diperoleh dengan mengurangkan total harga dari uang yang dibayar.',
    wrong_quantity: 'Periksa kembali jumlah barang yang dibeli.',
    confuse_fpb_kpk: 'FPB untuk "dibagi rata", KPK untuk "bertemu/berbunyi bersama lagi".',
    add_instead_of_lcm: 'Waktu bertemu lagi dihitung dengan KPK, bukan penjumlahan.',
    multiply_instead_of_lcm: 'KPK belum tentu hasil kali kedua bilangan.',
    computation_error: 'Periksa kembali perhitunganmu langkah demi langkah.',
    wrong_operation: 'Periksa operasi yang digunakan: tambah, kurang, kali, atau bagi.',
    multiply_numerator_only: 'Pembilang dan penyebut harus dikalikan dengan angka yang sama.',
    multiply_denominator_only: 'Pembilang dan penyebut harus dikalikan dengan angka yang sama.',
    add_instead_of_multiply: 'Pecahan senilai memakai perkalian, bukan penjumlahan.',
    not_simplified: 'Sederhanakan pecahan dengan membagi FPB pembilang dan penyebut.',
    add_numerators_denominators: 'Penyebut tidak boleh dijumlahkan. Samakan penyebut dulu.',
    wrong_denominator: 'Samakan penyebut dengan KPK sebelum menjumlahkan.',
    forgot_multiply_numerator: 'Setelah membagi dengan penyebut, kalikan dengan pembilang.',
    complement_error: 'Periksa apakah yang ditanyakan bagian yang dimaksud atau sisanya.',
    decimal_conversion: 'Persen ke desimal: bagi 100. Desimal ke persen: kalikan 100.',
    discount_amount_only: 'Nilai diskon bukan harga yang harus dibayar.',
    discount_ignored: 'Harga akhir harus memperhitungkan diskon.',
    speed_formula: 'Jarak = Kecepatan × Waktu.',
    scale_unit_error: 'Periksa konversi satuan cm ke m (bagi 100).',
    scale_ignored: 'Kalikan jarak pada gambar dengan angka skala.',
    swap_ratio: 'Periksa bagian milik masing-masing pihak pada perbandingan.',
    ratio_ignored: 'Gunakan angka perbandingan untuk membagi jumlah total.',
    sign_error: 'Perhatikan tanda positif dan negatif pada garis bilangan.',
    power_as_multiply_by_2: 'Pangkat dua berarti dikalikan dirinya sendiri, bukan dikali 2.',
    sqrt_error: 'Akar kuadrat mencari bilangan yang jika dikuadratkan menghasilkan bilangan itu.',
    forgot_square: 'Hitung pangkat dua terlebih dahulu.',
    same_as_last: 'Bilangan berikutnya berbeda dengan bilangan terakhir yang diketahui.',
    off_by_one_step: 'Tambahkan satu langkah pola lagi dengan teliti.',
    wrong_pattern: 'Periksa apakah pola memakai selisih tetap, selisih bertambah, atau perkalian.',
    forgot_plus_two: 'Pola kursi meja adalah 2n + 2.',
    confuse_area_perimeter: 'Luas = panjang × lebar (cm²). Keliling = 2 × (panjang + lebar) (cm).',
    double_area: 'Luas dihitung sekali, bukan dikalikan dua.',
    add_sides: 'Jangan hanya menjumlahkan sisi untuk menghitung luas.',
    forgot_half: 'Luas segitiga harus dibagi dua.',
    wrong_area: 'Periksa bangun mana yang ditanyakan luasnya.',
    angle_type_error: 'Lancip < 90°, siku-siku = 90°, tumpul antara 90° dan 180°.',
    clock_angle: 'Setiap jam = 30°, setiap menit = 6°, dan jarum jam bergerak 0,5° per menit.',
    same_angle: 'Sudut berpelurus bukan sudut yang besarnya sama.',
    confuse_complement_supplement: 'Berpelurus berjumlah 180°, berpenyiku berjumlah 90°.',
    confuse_full_rotation: 'Satu putaran penuh = 360°.',
    cube_property_error: 'Kubus memiliki 6 sisi, 12 rusuk, dan 8 titik sudut.',
    solid_shape_error: 'Hitung sisi, rusuk, dan titik sudut sesuai jenis bangun ruang.',
    confuse_volume_surface: 'Volume memakai cm³, luas permukaan memakai cm².',
    forgot_height: 'Volume balok memakai panjang, lebar, dan tinggi.',
    forgot_factor_2: 'Luas permukaan memiliki dua sisi untuk setiap pasang.',
    perimeter_error: 'Luas permukaan bukan keliling.',
    volume_ignored: 'Gunakan volume untuk mencari ukuran yang belum diketahui.',
    unit_conversion: 'Periksa tangga satuan: km→m ×1000, kg→g ×1000, jam→menit ×60.',
    ignored_remainder: 'Jangan lupa menambahkan sisa satuan yang lebih kecil.',
    symmetry_error: 'Hitung semua lipatan yang membuat kedua bagian berimpit.',
    rotational_symmetry_error: 'Simetri putar dihitung dari banyak posisi bangun menempati bingkainya.',
    wrong_axis: 'Sumbu X mengubah nilai y, sumbu Y mengubah nilai x.',
    rotation_instead_of_reflection: 'Pencerminan membalik, rotasi memutar.',
    swap_coordinates: 'Urutan koordinat selalu (x, y).',
    quadrant_error: 'Kuadran I (+,+), II (−,+), III (−,−), IV (+,−).',
    ignored_first_point: 'Gunakan kedua titik untuk menghitung jarak.',
    confuse_circumference_area: 'Keliling = 2πr (cm), luas = πr² (cm²).',
    forgot_factor_2: 'Keliling lingkaran memakai 2πr.',
    forgot_square: 'Luas lingkaran memakai r², bukan r.',
    diameter_as_circumference: 'Keliling = π × diameter, bukan diameter itu sendiri.',
    misread_chart: 'Periksa tinggi batang dan baca nilai pada sumbu vertikal.',
    read_max_only: 'Jangan hanya membaca satu nilai; periksa yang ditanyakan.',
    missed_row: 'Periksa semua baris pada tabel.',
    add_instead_of_difference: 'Selisih berarti pengurangan.',
    forgot_divide: 'Mean = jumlah data ÷ banyak data.',
    wrong_position: 'Median adalah nilai tengah setelah data diurutkan.',
    read_min: 'Periksa kembali nilai yang ditanyakan.',
    read_max: 'Periksa kembali nilai yang ditanyakan.',
    confuse_mode_max: 'Modus adalah nilai yang paling sering muncul, bukan nilai terbesar.',
    confuse_mode_min: 'Modus adalah nilai yang paling sering muncul, bukan nilai terkecil.',
    confuse_mode_mean: 'Modus berbeda dengan rata-rata.',
    count_error: 'Hitung ulang kemunculan data dengan teliti.',
    confuse_value_frequency: 'Frekuensi adalah banyaknya kemunculan, bukan nilainya.',
    sum_values_only: 'Jumlah data = Σ(nilai × frekuensi).',
    sum_freq_only: 'Jumlah data = Σ(nilai × frekuensi), bukan jumlah frekuensi.',
    chart_type_error: 'Pilih jenis diagram sesuai tujuan penyajian data.',
    wrong_total: 'Semua kemungkinan harus dihitung dengan benar.',
    inverted_fraction: 'Pembilang adalah kejadian, penyebut adalah semua kemungkinan.',
    wrong_color: 'Periksa warna bola yang ditanyakan.',
    same_probability: 'Peluang kejadian dan komplemennya berbeda.'
};

const LEVEL_DISTRIBUTION = {
    L1: 0.34,
    L2: 0.4,
    L3: 0.26
};

export class QuestionEngine {
    constructor() {
        this.counter = 0;
    }

    generateQuestion(subtopicId, level = 'L1', seed = null) {
        const levels = BUILDERS[subtopicId];
        if (!levels) return this._fallback(subtopicId);

        const builder = levels[level] || levels.L1;
        const rng = mulberry32(seed ?? ((Date.now() ^ (Math.random() * 1e9)) >>> 0));
        const raw = builder(rng);
        const options = assembleOptions(rng, raw.correct, raw.wrongs);
        const answer_spec = options.findIndex(o => o.correct);

        return {
            id: `${subtopicId}_${level}_${Date.now().toString(36)}_${(this.counter++).toString(36)}`,
            subtopic: subtopicId,
            level,
            type: 'multiple_choice',
            stem: raw.stem,
            media: raw.media || null,
            options,
            answer_spec,
            solver_value: String(raw.correct),
            difficulty_b: raw.difficulty_b,
            est_seconds: raw.est_seconds,
            hints: raw.hints,
            explanation: raw.explanation,
            misconception_tag: options.find(o => !o.correct)?.misconception_tag || 'computation_error'
        };
    }

    generateQuestionSet(subtopicId, count = 10, distribution = LEVEL_DISTRIBUTION) {
        const levels = ['L1', 'L2', 'L3'];
        const counts = levels.map(l => Math.round(count * (distribution[l] || 0)));
        let remaining = count - counts.reduce((a, b) => a + b, 0);
        counts[1] += remaining;

        const questions = [];
        for (let i = 0; i < levels.length; i++) {
            for (let j = 0; j < counts[i]; j++) {
                questions.push(this.generateQuestion(subtopicId, levels[i]));
            }
        }
        return shuffle(Math.random, questions).slice(0, count);
    }

    selectAdaptive(subtopicId, theta = 0, count = 10) {
        const target = theta;
        const pool = [];
        for (let i = 0; i < 30; i++) {
            const level = pick(Math.random, ['L1', 'L2', 'L3']);
            const q = this.generateQuestion(subtopicId, level);
            const p = 1 / (1 + Math.exp(-(target - q.difficulty_b)));
            pool.push({ q, score: Math.abs(p - 0.7) });
        }
        pool.sort((a, b) => a.score - b.score);
        return pool.slice(0, count).map(p => p.q);
    }

    generateBossSet(subtopicId, count = 8) {
        const questions = [];
        for (let i = 0; i < count; i++) {
            const level = i < 2 ? 'L3' : i < 5 ? 'L2' : 'L1';
            questions.push(this.generateQuestion(subtopicId, level));
        }
        return shuffle(Math.random, questions);
    }

    generateTryout({ size = 30, domains = null, subtopics = null } = {}) {
        const weights = CURRICULUM.getDomainWeights();
        const all = CURRICULUM.getAllSubtopics().filter(s => !domains || domains.includes(s.domain));
        const pool = subtopics
            ? all.filter(s => subtopics.includes(s.id))
            : all;

        const byDomain = {};
        for (const s of pool) (byDomain[s.domain] = byDomain[s.domain] || []).push(s);

        const chosen = [];
        const domainIds = Object.keys(byDomain);
        let assigned = 0;

        domainIds.forEach((domainId, idx) => {
            const isLast = idx === domainIds.length - 1;
            const share = isLast
                ? size - assigned
                : Math.round(size * (weights[domainId] || 1 / domainIds.length));
            const list = byDomain[domainId];
            for (let i = 0; i < share; i++) {
                chosen.push(pick(Math.random, list).id);
            }
            assigned += share;
        });

        while (chosen.length < size) {
            chosen.push(pick(Math.random, pool).id);
        }

        return chosen.slice(0, size).map((subtopicId, i) => {
            const level = i % 5 === 0 ? 'L3' : i % 2 === 0 ? 'L2' : 'L1';
            const q = this.generateQuestion(subtopicId, level);
            q.isTryout = true;
            return q;
        });
    }

    verifyAnswer(question, answerIndex) {
        return question.answer_spec === answerIndex;
    }

    getHint(question, hintLevel) {
        const hints = question.hints || [];
        return hints[Math.min(hintLevel, hints.length - 1)] || null;
    }

    getMisconceptionText(tag) {
        return MISCONCEPTIONS[tag] || null;
    }

    validateItem(item) {
        const errors = [];
        if (!item || typeof item !== 'object') return { ok: false, errors: ['Item kosong'] };
        if (!item.stem) errors.push('Stem kosong');
        if (!Array.isArray(item.options) || item.options.length < 2) errors.push('Opsi kurang dari 2');
        const correct = (item.options || []).filter(o => o.correct);
        if (correct.length !== 1) errors.push(`Jumlah kunci jawaban harus 1, ditemukan ${correct.length}`);
        const texts = (item.options || []).map(o => String(o.text));
        if (new Set(texts).size !== texts.length) errors.push('Opsi duplikat');
        for (const o of item.options || []) {
            if (!o.correct && !o.misconception_tag) errors.push(`Opsi salah tanpa tag: ${o.text}`);
        }
        if (item.answer_spec < 0) errors.push('answer_spec tidak valid');
        if (item.options?.[item.answer_spec] && !item.options[item.answer_spec].correct) {
            errors.push('answer_spec menunjuk opsi yang salah');
        }
        if (!Array.isArray(item.hints) || item.hints.length < 2) errors.push('Petunjuk kurang');
        if (!item.explanation) errors.push('Pembahasan kosong');
        if (typeof item.difficulty_b !== 'number') errors.push('difficulty_b tidak valid');
        return { ok: errors.length === 0, errors };
    }

    selfTest(samplesPerLevel = 20) {
        const results = [];
        for (const subtopic of CURRICULUM.getAllSubtopics()) {
            for (const level of ['L1', 'L2', 'L3']) {
                for (let i = 0; i < samplesPerLevel; i++) {
                    const item = this.generateQuestion(subtopic.id, level, i + 1);
                    const check = this.validateItem(item);
                    if (!check.ok) {
                        results.push({ subtopic: subtopic.id, level, errors: check.errors, item });
                    }
                }
            }
        }
        return results;
    }

    _fallback(subtopicId) {
        const options = assembleOptions(Math.random, 'Jawaban benar', [
            wrong('Jawaban A', 'generic'),
            wrong('Jawaban B', 'generic'),
            wrong('Jawaban C', 'generic')
        ]);
        return {
            id: `fallback_${subtopicId}_${Date.now()}`,
            subtopic: subtopicId,
            level: 'L1',
            type: 'multiple_choice',
            stem: `Soal untuk ${CURRICULUM.getSubtopic(subtopicId)?.name || subtopicId}`,
            options,
            answer_spec: options.findIndex(o => o.correct),
            solver_value: 'Jawaban benar',
            difficulty_b: 0,
            est_seconds: 30,
            hints: ['Baca soal dengan teliti.', 'Eliminasi jawaban yang jelas salah.'],
            explanation: 'Soal cadangan.',
            misconception_tag: 'generic'
        };
    }
}

export { BUILDERS, MISCONCEPTIONS, MS_DAY };
export const questionEngine = new QuestionEngine();
