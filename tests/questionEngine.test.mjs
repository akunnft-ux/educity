import './setup.mjs';
import { test, assert, run } from './harness.mjs';
import { CURRICULUM } from '../data/curriculum.js';
import { LESSONS, getLesson } from '../data/lessons.js';
import { QuestionEngine, MISCONCEPTIONS } from '../js/core/QuestionEngine.js';

const engine = new QuestionEngine();
const LEVELS = ['L1', 'L2', 'L3'];
const SUBTOPICS = CURRICULUM.getAllSubtopics();

test('curriculum covers 21 subtopics across 3 domains', () => {
    assert.equal(SUBTOPICS.length, 21);
    assert.equal(CURRICULUM.domains.length, 3);
    assert.deepEqual(CURRICULUM.domains.map(d => d.id), ['bilangan', 'geometri', 'data']);
});

test('every subtopic has a lesson with concept, worked example, and tips', () => {
    for (const s of SUBTOPICS) {
        const lesson = getLesson(s.id);
        assert.ok(lesson, `missing lesson for ${s.id}`);
        assert.ok(lesson.concept.length > 30, `short concept ${s.id}`);
        assert.ok(lesson.worked.problem.length > 5, `missing worked problem ${s.id}`);
        assert.ok(lesson.worked.steps.length >= 2, `too few steps ${s.id}`);
        assert.ok(lesson.tips.length >= 2, `too few tips ${s.id}`);
    }
    assert.equal(Object.keys(LESSONS).length, 21);
});

test('prerequisites reference existing subtopics', () => {
    const ids = new Set(SUBTOPICS.map(s => s.id));
    for (const s of SUBTOPICS) {
        for (const p of s.prerequisites) {
            assert.ok(ids.has(p), `${s.id} has unknown prerequisite ${p}`);
        }
    }
});

test('domain weights sum to 1', () => {
    const weights = CURRICULUM.getDomainWeights();
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `weights sum ${sum}`);
});

test('every subtopic/level generates valid items (400 samples each)', () => {
    for (const s of SUBTOPICS) {
        for (const level of LEVELS) {
            for (let seed = 1; seed <= 400; seed++) {
                const q = engine.generateQuestion(s.id, level, seed);
                const check = engine.validateItem(q);
                assert.ok(check.ok, `${s.id}/${level} seed ${seed}: ${check.errors.join('; ')} :: ${q.stem}`);
                assert.equal(q.level, level, `level mismatch ${s.id}/${level}`);
                assert.equal(q.subtopic, s.id);
            }
        }
    }
});

test('solver value always matches the marked correct option', () => {
    for (const s of SUBTOPICS) {
        for (const level of LEVELS) {
            for (let seed = 1; seed <= 150; seed++) {
                const q = engine.generateQuestion(s.id, level, seed);
                assert.equal(q.options[q.answer_spec].text, q.solver_value, `${s.id}/${level} seed ${seed}`);
                assert.equal(q.options.filter(o => o.correct).length, 1);
            }
        }
    }
});

test('no item leaks undefined/NaN into stem or options', () => {
    for (const s of SUBTOPICS) {
        for (const level of LEVELS) {
            for (let seed = 1; seed <= 200; seed++) {
                const q = engine.generateQuestion(s.id, level, seed);
                const text = [q.stem, q.explanation, ...q.options.map(o => o.text)].join(' ');
                assert.ok(!/undefined|NaN|\[object/.test(text), `${s.id}/${level}: ${text.slice(0, 120)}`);
            }
        }
    }
});

test('no item uses placeholder filler options', () => {
    for (const s of SUBTOPICS) {
        for (const level of LEVELS) {
            for (let seed = 1; seed <= 200; seed++) {
                const q = engine.generateQuestion(s.id, level, seed);
                for (const o of q.options) {
                    assert.ok(!/Pilihan \d|varian/i.test(o.text), `${s.id}/${level}: filler option "${o.text}" in "${q.stem}"`);
                }
            }
        }
    }
});

test('options are unique within an item', () => {
    for (const s of SUBTOPICS) {
        for (const level of LEVELS) {
            for (let seed = 1; seed <= 200; seed++) {
                const q = engine.generateQuestion(s.id, level, seed);
                const texts = q.options.map(o => o.text);
                assert.equal(new Set(texts).size, texts.length, `${s.id}/${level} duplicate options: ${texts.join(' | ')}`);
            }
        }
    }
});

test('every distractor has a known misconception tag', () => {
    for (const s of SUBTOPICS) {
        for (const level of LEVELS) {
            for (let seed = 1; seed <= 100; seed++) {
                const q = engine.generateQuestion(s.id, level, seed);
                for (const o of q.options) {
                    if (o.correct) continue;
                    assert.ok(o.misconception_tag, `${s.id}/${level} missing tag`);
                    assert.ok(MISCONCEPTIONS[o.misconception_tag], `${s.id}/${level} unknown tag ${o.misconception_tag}`);
                }
            }
        }
    }
});

test('every item has 2-3 hints and an explanation', () => {
    for (const s of SUBTOPICS) {
        for (const level of LEVELS) {
            for (let seed = 1; seed <= 60; seed++) {
                const q = engine.generateQuestion(s.id, level, seed);
                assert.ok(q.hints.length >= 2, `${s.id}/${level} hints=${q.hints.length}`);
                assert.ok(q.hints.length <= 3, `${s.id}/${level} hints=${q.hints.length}`);
                assert.ok(q.explanation.length > 15, `${s.id}/${level} explanation too short`);
                assert.ok(q.est_seconds > 0);
            }
        }
    }
});

test('correct answer position is evenly distributed', () => {
    const counts = [0, 0, 0, 0];
    const N = 2000;
    for (let seed = 1; seed <= N; seed++) {
        const q = engine.generateQuestion('B4', 'L2', seed);
        counts[q.answer_spec]++;
    }
    for (const c of counts) {
        assert.ok(c > N * 0.15 && c < N * 0.35, `uneven distribution: ${counts.join(',')}`);
    }
});

test('seeded generation is deterministic', () => {
    const a = engine.generateQuestion('G4', 'L3', 12345);
    const b = engine.generateQuestion('G4', 'L3', 12345);
    assert.equal(a.stem, b.stem);
    assert.deepEqual(a.options.map(o => o.text), b.options.map(o => o.text));
    assert.equal(a.solver_value, b.solver_value);
});

test('question set honours requested size and includes all levels', () => {
    for (const size of [2, 3, 5, 8, 10, 12]) {
        const set = engine.generateQuestionSet('B4', size);
        assert.equal(set.length, size, `size ${size}`);
        const levels = new Set(set.map(q => q.level));
        assert.ok(levels.size >= 2, `size ${size} only levels ${[...levels]}`);
    }
});

test('boss set is 8 items with at least 2 L3 items', () => {
    for (const s of SUBTOPICS) {
        const boss = engine.generateBossSet(s.id, 8);
        assert.equal(boss.length, 8);
        const l3 = boss.filter(q => q.level === 'L3').length;
        assert.ok(l3 >= 2, `${s.id} boss has only ${l3} L3 items`);
    }
});

test('tryout respects size and domain weights', () => {
    for (const size of [10, 30]) {
        const set = engine.generateTryout({ size });
        assert.equal(set.length, size);
        const domains = set.map(q => CURRICULUM.getSubtopic(q.subtopic).domain);
        const counts = domains.reduce((acc, d) => ({ ...acc, [d]: (acc[d] || 0) + 1 }), {});
        assert.ok(counts.bilangan >= counts.data, `bilangan ${counts.bilangan} < data ${counts.data}`);
        assert.ok(counts.geometri >= counts.data, `geometri ${counts.geometri} < data ${counts.data}`);
        assert.ok(set.every(q => q.isTryout === true));
    }
});

test('domain-scoped tryout only uses that domain', () => {
    const set = engine.generateTryout({ size: 10, domains: ['geometri'] });
    assert.equal(set.length, 10);
    for (const q of set) {
        assert.equal(CURRICULUM.getSubtopic(q.subtopic).domain, 'geometri');
    }
});

test('adaptive selection favours items near p=0.7 for given theta', () => {
    const theta = 1.0;
    const set = engine.selectAdaptive('B5', theta, 10);
    assert.equal(set.length, 10);
    const avgDist = set.reduce((sum, q) => {
        const p = 1 / (1 + Math.exp(-(theta - q.difficulty_b)));
        return sum + Math.abs(p - 0.7);
    }, 0) / set.length;
    assert.ok(avgDist < 0.45, `avg |p-0.7| = ${avgDist}`);
});

test('validateItem rejects broken items', () => {
    const bad1 = { stem: '', options: [], hints: [], answer_spec: -1 };
    assert.equal(engine.validateItem(bad1).ok, false);

    const q = engine.generateQuestion('B1', 'L1', 1);
    const duplicated = { ...q, options: q.options.map(o => ({ ...o, text: 'sama' })) };
    assert.equal(engine.validateItem(duplicated).ok, false);

    const twoCorrect = { ...q, options: q.options.map((o, i) => ({ ...o, correct: i < 2 })) };
    assert.equal(engine.validateItem(twoCorrect).ok, false);

    const good = engine.generateQuestion('D2', 'L2', 7);
    assert.equal(engine.validateItem(good).ok, true);
});

test('selfTest reports zero invalid generated items', () => {
    const issues = engine.selfTest(10);
    assert.deepEqual(issues, []);
});

test('misconception texts exist for every referenced tag', () => {
    const seen = new Set();
    for (const s of SUBTOPICS) {
        for (const level of LEVELS) {
            for (let seed = 1; seed <= 40; seed++) {
                const q = engine.generateQuestion(s.id, level, seed);
                for (const o of q.options) if (o.misconception_tag) seen.add(o.misconception_tag);
            }
        }
    }
    for (const tag of seen) {
        assert.ok(engine.getMisconceptionText(tag), `no text for ${tag}`);
    }
});

test('math correctness spot checks', () => {
    for (let seed = 1; seed <= 200; seed++) {
        const b4 = engine.generateQuestion('B4', 'L2', seed);
        const m = b4.stem.match(/(\d+)\/(\d+) \+ (\d+)\/(\d+)/);
        if (!m) continue;
        const [n1, d1, n2, d2] = m.slice(1).map(Number);
        const num = n1 * d2 + n2 * d1;
        const den = d1 * d2;
        const g = (function gcd(a, b) { return b ? gcd(b, a % b) : a; })(num, den);
        const expected = den / g === 1 ? String(num / g) : `${num / g}/${den / g}`;
        assert.equal(b4.solver_value, expected, `fraction math wrong: ${b4.stem} => ${b4.solver_value} (expected ${expected})`);
    }

    for (let seed = 1; seed <= 100; seed++) {
        const g1 = engine.generateQuestion('G1', 'L1', seed);
        const m = g1.stem.match(/panjang (\d+) cm dan lebar (\d+) cm/);
        if (!m) continue;
        assert.equal(g1.solver_value, `${Number(m[1]) * Number(m[2])} cm²`);
    }

    for (let seed = 1; seed <= 100; seed++) {
        const g4 = engine.generateQuestion('G4', 'L1', seed);
        const m = g4.stem.match(/panjang (\d+) cm, lebar (\d+) cm, dan tinggi (\d+) cm/);
        if (!m) continue;
        assert.equal(g4.solver_value, `${Number(m[1]) * Number(m[2]) * Number(m[3])} cm³`);
    }

    for (let seed = 1; seed <= 100; seed++) {
        const g8 = engine.generateQuestion('G8', 'L1', seed);
        const m = g8.stem.match(/jari-jari (\d+) cm/);
        if (!m) continue;
        assert.equal(g8.solver_value, `${2 * (22 / 7) * Number(m[1])} cm`);
    }

    for (let seed = 1; seed <= 100; seed++) {
        const b6 = engine.generateQuestion('B6', 'L1', seed);
        const m = b6.stem.match(/(\d+) km\/jam selama (\d+) jam/);
        if (!m) continue;
        assert.equal(b6.solver_value, `${Number(m[1]) * Number(m[2])} km`);
    }
});

const ok = await run();
process.exit(ok ? 0 : 1);
