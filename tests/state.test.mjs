import './setup.mjs';
import { test, assert, run } from './harness.mjs';
import { CURRICULUM } from '../data/curriculum.js';
import { GameState } from '../js/core/GameState.js';
import { MasteryService } from '../js/core/MasteryService.js';
import { Storage, todayKey } from '../js/core/Storage.js';
import { QuestionEngine } from '../js/core/QuestionEngine.js';

const engine = new QuestionEngine();

function fresh() {
    globalThis.__clearStore();
    const state = new GameState();
    return { state, mastery: new MasteryService(state) };
}

const q = (level = 'L2', difficulty = 0.5) => ({
    id: `t_${Math.random().toString(36).slice(2)}`,
    subtopic: 'B1',
    level,
    difficulty_b: difficulty,
    options: [{ text: 'a', correct: true }, { text: 'b', correct: false, misconception_tag: 'place_value_confusion' }],
    answer_spec: 0,
    explanation: 'pembahasan',
    stem: 'soal',
    est_seconds: 30
});

test('default state has all required collections', () => {
    const defaults = Storage.getDefaultState();
    for (const key of ['profile', 'progress', 'mastery', 'reviewQueue', 'mistakeBook', 'tryoutHistory', 'inventory', 'settings', 'dailyMissions', 'statistics', 'flags']) {
        assert.ok(key in defaults, `missing ${key}`);
    }
});

test('get/set/update use dotted paths and notify subscribers', () => {
    const { state } = fresh();
    let seen = null;
    state.subscribe('progress.xp', v => { seen = v; });
    state.set('progress.xp', 42);
    assert.equal(state.get('progress.xp'), 42);
    assert.equal(seen, 42);

    state.update('progress.xp', v => v + 8);
    assert.equal(state.get('progress.xp'), 50);

    let parent = null;
    state.subscribe('progress', v => { parent = v; });
    state.set('progress.coins', 5);
    assert.equal(parent.coins, 5);
});

test('state persists to storage and reloads', () => {
    const { state } = fresh();
    state.set('progress.xp', 123);
    state.setProfile({ studentName: 'Ani', classCode: '6B' });
    state.forceSave();

    const reloaded = new GameState();
    assert.equal(reloaded.get('progress.xp'), 123);
    assert.equal(reloaded.getProfile().studentName, 'Ani');
});

test('migrating v1 data drops the plaintext PIN', () => {
    globalThis.__clearStore();
    localStorage.setItem('educity_game_data', JSON.stringify({
        version: 1,
        profile: { studentName: 'Old', classCode: '5A', pin: '1234' },
        progress: { xp: 55 },
        mastery: { B1: { status: 'mastered' } }
    }));
    const state = new GameState();
    assert.equal(state.getProfile().studentName, 'Old');
    assert.equal(state.getProfile().pin, undefined, 'PIN must not survive migration');
    assert.equal(state.get('progress.xp'), 55);
    assert.equal(state.get('mastery.B1').status, 'mastered');
    assert.equal(state.get('version'), 2);
});

test('corrupt storage falls back to defaults instead of crashing', () => {
    globalThis.__clearStore();
    localStorage.setItem('educity_game_data', '{not valid json');
    const state = new GameState();
    assert.equal(state.get('progress.xp'), 0);
    assert.equal(state.get('profile'), null);
});

test('partial stored data is merged with defaults', () => {
    globalThis.__clearStore();
    localStorage.setItem('educity_game_data', JSON.stringify({
        version: 2,
        progress: { xp: 30 }
    }));
    const state = new GameState();
    assert.equal(state.get('progress.xp'), 30);
    assert.equal(state.get('progress.hearts'), 3);
    assert.deepEqual(state.get('inventory.avatars'), ['default']);
});

test('mistake book records, increments and resolves after 2 distinct days', () => {
    const { state } = fresh();
    state.addMistake({ itemId: 'i1', subtopic: 'B1', stem: 'soal 1', explanation: 'x' });
    state.addMistake({ itemId: 'i1', subtopic: 'B1', stem: 'soal 1', explanation: 'x' });
    assert.equal(state.getMistakeBook().length, 1);
    assert.equal(state.getMistakeBook()[0].timesWrong, 2);

    state.resolveMistake('i1');
    assert.equal(state.getMistakeBook().length, 1, 'one correct day is not enough');
    assert.equal(state.getMistakeBook()[0].resolvedDates.length, 1);

    state.update('mistakeBook', book => book.map(m => ({ ...m, resolvedDates: [todayKey(new Date(Date.now() - 86400000))] })));
    state.resolveMistake('i1');
    assert.equal(state.getMistakeBook().length, 0, 'two distinct days removes the item');
});

test('tryout history keeps the newest 30 results', () => {
    const { state } = fresh();
    for (let i = 0; i < 35; i++) {
        state.addTryoutResult({ id: String(i), score: i, date: i });
    }
    const history = state.getTryoutHistory();
    assert.equal(history.length, 30);
    assert.equal(history[0].score, 34);
    assert.equal(state.getFlags().tryoutCount, 35);
});

test('inventory prevents duplicate purchases', () => {
    const { state } = fresh();
    state.addToInventory('avatars', 'knight');
    state.addToInventory('avatars', 'knight');
    assert.deepEqual(state.getInventory().avatars, ['default', 'knight']);
});

test('reset clears profile and progress', () => {
    const { state } = fresh();
    state.setProfile({ studentName: 'X' });
    state.set('progress.xp', 999);
    state.reset();
    assert.equal(state.getProfile(), null);
    assert.equal(state.get('progress.xp'), 0);
});

test('telemetry is capped at 200 entries', () => {
    const { state } = fresh();
    for (let i = 0; i < 250; i++) state.addTelemetry('evt', { i });
    assert.equal(state.state.telemetry.length, 200);
    assert.equal(state.state.telemetry[199].payload.i, 249);
});

test('theta rises on correct answers and falls on wrong ones', () => {
    const { state, mastery } = fresh();
    const question = q('L2', 0.5);
    const before = state.getMastery('B1').theta;

    for (let i = 0; i < 10; i++) {
        mastery.recordAttempt('B1', { ...question, id: `c${i}` }, true, 20000, 0);
    }
    const afterCorrect = state.getMastery('B1').theta;
    assert.ok(afterCorrect > before, `theta should rise: ${before} -> ${afterCorrect}`);

    for (let i = 0; i < 20; i++) {
        mastery.recordAttempt('B1', { ...question, id: `w${i}` }, false, 20000, 0);
    }
    assert.ok(state.getMastery('B1').theta < afterCorrect, 'theta should fall after wrong answers');
});

test('first attempt flips status from locked to building', () => {
    const { state, mastery } = fresh();
    assert.equal(state.getMastery('B1').status, 'locked');
    mastery.recordAttempt('B1', q(), true, 20000, 0);
    assert.equal(state.getMastery('B1').status, 'building');
});

test('answers under 2 seconds are not counted toward mastery', () => {
    const { state, mastery } = fresh();
    mastery.recordAttempt('B1', q('L2', 0.5), true, 800, 0);
    const masteryState = state.getMastery('B1');
    assert.equal(masteryState.theta, 0, 'fast answer must not move theta');
    assert.equal(masteryState.lastAttempt.counted, false);
    assert.equal(masteryState.attempts, 1);
});

test('L3 correct answers are tracked separately', () => {
    const { state, mastery } = fresh();
    mastery.recordAttempt('B1', q('L3', 0.9), true, 30000, 0);
    mastery.recordAttempt('B1', q('L3', 0.9), true, 30000, 0);
    mastery.recordAttempt('B1', q('L2', 0.5), true, 30000, 0);
    assert.equal(state.getMastery('B1').l3Correct, 2);
});

test('wrong answers land in the mistake book, correct ones resolve them', () => {
    const { state, mastery } = fresh();
    const question = { ...q(), id: 'fixed-id' };
    mastery.recordAttempt('B1', question, false, 20000, 0);
    assert.equal(state.getMistakeBook().length, 1);

    mastery.recordAttempt('B1', question, true, 20000, 0);
    assert.equal(state.getMistakeBook()[0].resolvedDates.length, 1);
});

test('boss fails below 85% accuracy', () => {
    const { state, mastery } = fresh();
    const results = [
        { correct: true, level: 'L3' },
        { correct: true, level: 'L2' },
        { correct: true, level: 'L2' },
        { correct: true, level: 'L1' },
        { correct: true, level: 'L1' },
        { correct: true, level: 'L1' },
        { correct: false, level: 'L2' },
        { correct: false, level: 'L2' }
    ];
    const outcome = mastery.recordBossAttempt('B1', results);
    assert.equal(outcome.passed, false, '75% must not pass');
    assert.equal(state.getMastery('B1').status, 'building');
});

test('boss fails at 100% accuracy without an L3 correct', () => {
    const { mastery } = fresh();
    const results = Array.from({ length: 8 }, () => ({ correct: true, level: 'L1' }));
    const outcome = mastery.recordBossAttempt('B1', results);
    assert.equal(outcome.passed, false, 'needs at least one L3 correct');
    assert.equal(outcome.l3Correct, 0);
});

test('mastery requires two passing bosses on different days', () => {
    const { state, mastery } = fresh();
    const results = [
        { correct: true, level: 'L3' },
        ...Array.from({ length: 7 }, () => ({ correct: true, level: 'L2' }))
    ];

    const first = mastery.recordBossAttempt('B1', results);
    assert.equal(first.passed, true);
    assert.equal(first.mastered, false, 'one pass is not enough');
    assert.equal(first.passesNeeded, 1);
    assert.equal(state.getMastery('B1').status, 'building');

    const yesterday = todayKey(new Date(Date.now() - 86400000));
    state.update('mastery.B1.bossPassDates', () => [yesterday]);

    const second = mastery.recordBossAttempt('B1', results);
    assert.equal(second.mastered, true);
    assert.equal(state.getMastery('B1').status, 'mastered');
    assert.ok(state.getMastery('B1').masteredDate);
});

test('two passes on the same day do not grant mastery', () => {
    const { state, mastery } = fresh();
    const results = [
        { correct: true, level: 'L3' },
        ...Array.from({ length: 7 }, () => ({ correct: true, level: 'L2' }))
    ];
    mastery.recordBossAttempt('B1', results);
    const second = mastery.recordBossAttempt('B1', results);
    assert.equal(second.mastered, false, 'same-day repeat must not count');
    assert.equal(state.getMastery('B1').status, 'building');
});

test('mastery awards XP and coins exactly once', () => {
    const { state, mastery } = fresh();
    state.set('progress.xp', 0);
    state.set('progress.coins', 0);
    state.update('mastery.B1', () => ({
        status: 'building', theta: 0, attempts: 0, bossAttempts: 0, bossPassed: 1,
        bossPassDates: [todayKey(new Date(Date.now() - 86400000))], l3Correct: 1,
        retentionDates: [], lastBossDate: null, lastBossAccuracy: 0.9
    }));

    const results = [
        { correct: true, level: 'L3' },
        ...Array.from({ length: 7 }, () => ({ correct: true, level: 'L2' }))
    ];
    mastery.recordBossAttempt('B1', results);
    assert.equal(state.get('progress.xp'), 120);
    assert.equal(state.get('progress.coins'), 60);

    mastery.recordBossAttempt('B1', results);
    assert.equal(state.get('progress.xp'), 120, 'no double reward');
});

test('mastery schedules retention reviews at H+1/3/7/21', () => {
    const { state, mastery } = fresh();
    state.update('mastery.B1', () => ({
        status: 'building', theta: 0, attempts: 0, bossAttempts: 0, bossPassed: 1,
        bossPassDates: [todayKey(new Date(Date.now() - 86400000))], l3Correct: 1,
        retentionDates: [], lastBossDate: null, lastBossAccuracy: 0.9
    }));

    mastery.recordBossAttempt('B1', [
        { correct: true, level: 'L3' },
        ...Array.from({ length: 7 }, () => ({ correct: true, level: 'L2' }))
    ]);

    const queue = state.getReviewQueue();
    assert.equal(queue.length, 4);
    assert.deepEqual(queue.map(i => i.interval).sort((a, b) => a - b), [1, 3, 7, 21]);
    assert.ok(queue.every(i => i.dueDate > Date.now()));
});

test('retention success at H+7 upgrades mastered to strong', () => {
    const { state, mastery } = fresh();
    state.update('mastery.B1', () => ({
        status: 'mastered', theta: 1, attempts: 5, bossAttempts: 2, bossPassed: 2,
        bossPassDates: [], l3Correct: 1, retentionDates: [], masteredDate: Date.now()
    }));
    state.addToReviewQueue({ subtopic: 'B1', interval: 7, dueDate: Date.now() - 1000 });

    mastery.completeReview('B1', 7, true);
    assert.equal(state.getMastery('B1').status, 'strong');
    assert.equal(state.getReviewQueue().length, 0);
});

test('retention failure returns status to mastered and flags remedial', () => {
    const { state, mastery } = fresh();
    state.update('mastery.B1', () => ({
        status: 'strong', theta: 1, attempts: 5, bossAttempts: 2, bossPassed: 2,
        bossPassDates: [], l3Correct: 1, retentionDates: [], masteredDate: Date.now()
    }));
    state.addToReviewQueue({ subtopic: 'B1', interval: 7, dueDate: Date.now() - 1000 });

    mastery.completeReview('B1', 7, false);
    assert.equal(state.getMastery('B1').status, 'mastered');
    assert.equal(state.getMastery('B1').needsRemedial, true);
});

test('getDueReviews returns only items whose due date has passed', () => {
    const { state, mastery } = fresh();
    state.addToReviewQueue({ subtopic: 'B1', interval: 1, dueDate: Date.now() - 5000 });
    state.addToReviewQueue({ subtopic: 'B2', interval: 3, dueDate: Date.now() + 500000 });
    assert.equal(mastery.getDueReviews().length, 1);
    assert.equal(mastery.getUpcomingReviews().length, 1);
});

test('readiness blocks subtopics with unmet prerequisites', () => {
    const { mastery } = fresh();
    const b2 = mastery.getSubtopicReadiness('B2');
    assert.equal(b2.ready, false);
    assert.match(b2.reason, /Bilangan Cacah/);

    const b1 = mastery.getSubtopicReadiness('B1');
    assert.equal(b1.ready, true);
});

test('readiness unlocks after prerequisites are mastered', () => {
    const { state, mastery } = fresh();
    state.update('mastery.B1', () => ({ status: 'mastered', theta: 1 }));
    assert.equal(mastery.getSubtopicReadiness('B2').ready, true);
});

test('strong status also satisfies prerequisites', () => {
    const { state, mastery } = fresh();
    state.update('mastery.B1', () => ({ status: 'strong', theta: 1 }));
    assert.equal(mastery.getSubtopicReadiness('B2').ready, true);
});

test('overall progress counts mastered and strong', () => {
    const { state, mastery } = fresh();
    state.update('mastery.B1', () => ({ status: 'mastered' }));
    state.update('mastery.B2', () => ({ status: 'strong' }));
    state.update('mastery.B3', () => ({ status: 'building' }));

    const overall = mastery.getOverallProgress();
    assert.equal(overall.total, 21);
    assert.equal(overall.mastered, 2);
    assert.equal(overall.strong, 1);
    assert.equal(overall.building, 1);
    assert.equal(overall.percentage, Math.round((2 / 21) * 100));
});

test('score estimate is unavailable before the first tryout', () => {
    const { state, mastery } = fresh();
    state.update('mastery.B1', () => ({ status: 'mastered', theta: 1 }));
    const estimate = mastery.estimateScore();
    assert.equal(estimate.available, false);
    assert.ok(estimate.min < estimate.max);
});

test('score estimate becomes a labelled range after a tryout', () => {
    const { state, mastery } = fresh();
    for (const s of CURRICULUM.getAllSubtopics()) {
        state.update(`mastery.${s.id}`, () => ({ status: 'mastered', theta: 1.2 }));
    }
    state.addTryoutResult({ id: '1', score: 80, date: Date.now() });

    const estimate = mastery.estimateScore();
    assert.equal(estimate.available, true);
    assert.ok(estimate.min <= estimate.max);
    assert.ok(estimate.max <= 100);
    assert.equal(estimate.confidence, 100);
});

test('study plan always returns exactly 3 actionable suggestions', () => {
    const { mastery } = fresh();
    const plan = mastery.getStudyPlan();
    assert.equal(plan.length, 3);
    assert.ok(plan.every(s => typeof s === 'string' && s.length > 10));
});

test('streak increments on consecutive days', () => {
    const { state } = fresh();
    state.set('progress.lastActiveDate', todayKey(new Date(Date.now() - 86400000)));
    state.set('progress.streak', 4);
    assert.equal(state.touchStreak(), 5);
    assert.equal(state.touchStreak(), 5, 'same day does not double count');
});

test('streak resets after a missed day', () => {
    const { state } = fresh();
    state.set('progress.lastActiveDate', todayKey(new Date(Date.now() - 5 * 86400000)));
    state.set('progress.streak', 9);
    assert.equal(state.touchStreak(), 1);
});

test('streak freeze covers a single skipped day once per week', () => {
    const { state } = fresh();
    state.set('progress.lastActiveDate', todayKey(new Date(Date.now() - 2 * 86400000)));
    state.set('progress.streak', 6);
    state.set('progress.streakFreeze', 1);
    state.set('progress.streakFreezeWeek', null);

    assert.equal(state.touchStreak(), 7);
    assert.equal(state.get('progress.streakFreeze'), 0);
});

test('daily missions reset when the date changes', () => {
    const { state } = fresh();
    state.setDailyMissions({ date: '2000-01-01', slots: [{ key: 'new', done: true }], completed: 1, claimed: false });
    const missions = state.getDailyMissions();
    assert.equal(missions.date, '2000-01-01');
    state.setDailyMissions({ date: todayKey(), slots: [], completed: 0, claimed: false });
    assert.equal(state.getDailyMissions().date, todayKey());
});

test('subtopic statistics accumulate', () => {
    const { state } = fresh();
    state.updateSubtopicStat('B1', 'answered', 1);
    state.updateSubtopicStat('B1', 'answered', 1);
    state.updateSubtopicStat('B1', 'correct', 1);
    const stats = state.getSubtopicStats('B1');
    assert.equal(stats.answered, 2);
    assert.equal(stats.correct, 1);
});

test('unknown subtopic returns a safe default mastery state', () => {
    const { state } = fresh();
    const m = state.getMastery('NOPE');
    assert.equal(m.status, 'locked');
    assert.equal(m.theta, 0);
    assert.deepEqual(m.retentionDates, []);
});

const ok = await run();
process.exit(ok ? 0 : 1);
