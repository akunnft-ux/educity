import { gameState } from './GameState.js';
import { CURRICULUM, MASTERY_THRESHOLDS } from '../../data/curriculum.js';
import { todayKey } from './Storage.js';

const DAY = 86400000;

export class MasteryService {
    constructor(state = gameState) {
        this.state = state;
        this.K_INITIAL = 0.4;
        this.K_MIN = 0.15;
        this.K_DECAY = 0.95;
        this.MASTERY_THRESHOLD = MASTERY_THRESHOLDS.BOSS_ACCURACY;
        this.RETENTION_INTERVALS = MASTERY_THRESHOLDS.RETENTION_INTERVALS;
        this.MIN_RESPONSE_MS = 2000;
    }

    probability(theta, difficulty) {
        return 1 / (1 + Math.exp(-(theta - difficulty)));
    }

    updateTheta(theta, difficulty, correct, attempts) {
        const p = this.probability(theta, difficulty);
        const k = Math.max(this.K_INITIAL * Math.pow(this.K_DECAY, attempts), this.K_MIN);
        return theta + k * ((correct ? 1 : 0) - p);
    }

    getMasteryState(subtopicId) {
        return this.state.getMastery(subtopicId);
    }

    isSuspiciouslyFast(question, timeSpentMs) {
        if (!question?.est_seconds) return false;
        return timeSpentMs < this.MIN_RESPONSE_MS;
    }

    recordAttempt(subtopicId, question, correct, timeSpentMs = 0, hintsUsed = 0) {
        const mastery = this.getMasteryState(subtopicId);
        const counted = !this.isSuspiciouslyFast(question, timeSpentMs);

        const attempts = (mastery.attempts || 0) + 1;
        const theta = counted
            ? this.updateTheta(mastery.theta || 0, question.difficulty_b || 0, correct, attempts)
            : (mastery.theta || 0);

        const updated = {
            ...mastery,
            theta,
            attempts,
            l3Correct: (mastery.l3Correct || 0) + (correct && question.level === 'L3' ? 1 : 0),
            lastAttempt: {
                date: Date.now(),
                correct,
                counted,
                difficulty: question.difficulty_b,
                timeSpentMs,
                hintsUsed,
                level: question.level
            }
        };

        if (!updated.status || updated.status === 'locked') {
            updated.status = 'building';
        }

        this.state.setMastery(subtopicId, updated);

        if (!correct) {
            this.state.addMistake({
                itemId: question.id,
                subtopic: subtopicId,
                subtopicName: CURRICULUM.getSubtopic(subtopicId)?.name || subtopicId,
                stem: question.stem,
                explanation: question.explanation,
                selectedText: question.options?.[question.answer_spec]?.text,
                misconceptionTag: question.misconception_tag || null
            });
        } else {
            this.state.resolveMistake(question.id);
        }

        this.state.addTelemetry('item_answered', {
            subtopic: subtopicId,
            level: question.level,
            correct,
            counted,
            timeSpentMs,
            hintsUsed
        });

        return updated;
    }

    recordBossAttempt(subtopicId, results) {
        const mastery = this.getMasteryState(subtopicId);
        const total = results.length;
        const correct = results.filter(r => r.correct).length;
        const accuracy = total > 0 ? correct / total : 0;
        const l3Total = results.filter(r => r.level === 'L3').length;
        const l3Correct = results.filter(r => r.correct && r.level === 'L3').length;

        const passed = accuracy >= this.MASTERY_THRESHOLD
            && l3Correct >= MASTERY_THRESHOLDS.BOSS_MIN_L3_CORRECT;

        const today = todayKey();
        const passDates = [...(mastery.bossPassDates || [])];

        if (passed && !passDates.includes(today)) {
            passDates.push(today);
        }

        const distinctDays = new Set(passDates).size;
        const mastered = distinctDays >= MASTERY_THRESHOLDS.BOSS_REQUIRED_ATTEMPTS;

        const updated = {
            ...mastery,
            status: mastered ? 'mastered' : (mastery.status === 'locked' ? 'building' : mastery.status),
            bossAttempts: (mastery.bossAttempts || 0) + 1,
            lastBossDate: Date.now(),
            lastBossAccuracy: accuracy,
            lastBossL3Correct: l3Correct,
            bossPassDates: passDates,
            bossPassed: distinctDays,
            masteredDate: mastered ? (mastery.masteredDate || Date.now()) : mastery.masteredDate
        };

        this.state.setMastery(subtopicId, updated);

        const wasMastered = mastery.status === 'mastered' || mastery.status === 'strong';
        if (mastered && !wasMastered) {
            this._awardMasteryRewards(subtopicId);
            this._scheduleRetention(subtopicId, updated);
            this.state.addTelemetry('boss_result', { subtopic: subtopicId, passed: true, accuracy, l3Correct, mastered: true });
        } else {
            this.state.addTelemetry('boss_result', { subtopic: subtopicId, passed, accuracy, l3Correct, mastered: false });
        }

        if (!passed) {
            const counts = {};
            for (const r of results.filter(x => !x.correct)) {
                const tag = r.misconceptionTag || 'computation_error';
                counts[tag] = (counts[tag] || 0) + 1;
            }
            const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
            updated.dominantMisconception = top ? top[0] : null;
        }

        return {
            passed,
            accuracy,
            correct,
            total,
            l3Total,
            l3Correct,
            mastered,
            passesNeeded: Math.max(0, MASTERY_THRESHOLDS.BOSS_REQUIRED_ATTEMPTS - distinctDays),
            status: updated.status,
            dominantMisconception: updated.dominantMisconception || null
        };
    }

    _scheduleRetention(subtopicId, mastery) {
        const now = Date.now();
        const base = mastery.masteredDate || now;
        for (const days of this.RETENTION_INTERVALS) {
            const dueDate = base + days * DAY;
            this._addToReviewQueue(subtopicId, days, dueDate);
        }
    }

    _addToReviewQueue(subtopicId, intervalDays, dueDate) {
        const queue = this.state.getReviewQueue();
        const exists = queue.some(item => item.subtopic === subtopicId && item.interval === intervalDays);
        if (exists) return;
        this.state.addToReviewQueue({
            subtopic: subtopicId,
            interval: intervalDays,
            dueDate,
            addedDate: Date.now(),
            type: 'retention'
        });
    }

    getDueReviews() {
        const now = Date.now();
        return this.state.getReviewQueue().filter(item => item.dueDate <= now);
    }

    getUpcomingReviews() {
        const now = Date.now();
        return this.state.getReviewQueue().filter(item => item.dueDate > now)
            .sort((a, b) => a.dueDate - b.dueDate);
    }

    completeReview(subtopicId, intervalDays, correct) {
        const mastery = this.getMasteryState(subtopicId);
        const updated = { ...mastery, retentionDates: [...(mastery.retentionDates || [])] };

        if (correct) {
            const stamp = Date.now();
            if (!updated.retentionDates.includes(stamp)) updated.retentionDates.push(stamp);
            if (intervalDays >= 7) updated.status = 'strong';
        } else {
            updated.status = 'mastered';
            updated.needsRemedial = true;
        }

        this.state.setMastery(subtopicId, updated);

        const index = this.state.getReviewQueue()
            .findIndex(item => item.subtopic === subtopicId && item.interval === intervalDays);
        this.state.removeFromReviewQueue(index);

        this.state.addTelemetry('review_completed', { subtopic: subtopicId, intervalDays, correct });
        return updated;
    }

    _awardMasteryRewards(subtopicId) {
        const baseXP = 120;
        const baseCoins = 60;
        this.state.update('progress.xp', xp => (xp || 0) + baseXP);
        this.state.update('progress.coins', coins => (coins || 0) + baseCoins);
        this.state.addTelemetry('mastery_changed', { subtopic: subtopicId, status: 'mastered', xp: baseXP, coins: baseCoins });
    }

    getSubtopicReadiness(subtopicId) {
        const subtopic = CURRICULUM.getSubtopic(subtopicId);
        if (!subtopic) return { ready: false, reason: 'Subtopik tidak ditemukan' };

        const prereqs = CURRICULUM.getPrerequisites(subtopicId);
        const unmet = prereqs.filter(p => {
            const m = this.getMasteryState(p);
            return m.status !== 'mastered' && m.status !== 'strong';
        });

        if (unmet.length > 0) {
            const names = unmet.map(p => CURRICULUM.getSubtopic(p)?.name || p).join(', ');
            return { ready: false, reason: `Selesaikan dulu: ${names}`, unmet };
        }

        return { ready: true, mastery: this.getMasteryState(subtopicId) };
    }

    getDomainProgress(domainId) {
        const subtopics = CURRICULUM.getSubtopicsByDomain(domainId);
        const total = subtopics.length;
        let mastered = 0;
        let building = 0;
        for (const s of subtopics) {
            const status = this.getMasteryState(s.id).status;
            if (status === 'mastered' || status === 'strong') mastered++;
            if (status === 'building') building++;
        }
        return {
            total,
            mastered,
            building,
            percentage: total > 0 ? Math.round((mastered / total) * 100) : 0
        };
    }

    getOverallProgress() {
        const all = CURRICULUM.getAllSubtopics();
        let mastered = 0, building = 0, strong = 0;
        for (const s of all) {
            const status = this.getMasteryState(s.id).status;
            if (status === 'mastered') mastered++;
            else if (status === 'strong') { mastered++; strong++; }
            else if (status === 'building') building++;
        }
        return {
            total: all.length,
            mastered,
            building,
            strong,
            percentage: all.length > 0 ? Math.round((mastered / all.length) * 100) : 0
        };
    }

    estimateScore() {
        const all = CURRICULUM.getAllSubtopics();
        const weights = CURRICULUM.getDomainWeights();
        let weighted = 0;
        let totalWeight = 0;
        let covered = 0;

        for (const s of all) {
            const m = this.getMasteryState(s.id);
            const w = weights[s.domain] || 0.2;
            totalWeight += w;
            if (m.status === 'mastered' || m.status === 'strong') {
                covered++;
                const thetaBonus = Math.max(-1, Math.min(2, m.theta || 0)) * 6;
                weighted += w * Math.min(100, 78 + thetaBonus);
            } else if (m.status === 'building') {
                weighted += w * Math.min(70, 45 + (m.theta || 0) * 8);
            }
        }

        if (covered === 0) {
            return { available: false, min: 0, max: 0, confidence: 0 };
        }

        const tryouts = this.state.getTryoutHistory();
        const latest = tryouts[0];

        let base = totalWeight > 0 ? weighted / totalWeight : 0;
        if (latest && typeof latest.score === 'number') {
            base = base * 0.6 + latest.score * 0.4;
        }

        const coverage = covered / all.length;
        const spread = Math.round(10 - coverage * 5);

        return {
            available: tryouts.length > 0,
            min: Math.max(0, Math.round(base - spread)),
            max: Math.min(100, Math.round(base + spread)),
            confidence: Math.round(coverage * 100),
            coverage
        };
    }

    getStudyPlan() {
        const suggestions = [];
        const all = CURRICULUM.getAllSubtopics();

        const weak = all
            .map(s => ({ s, m: this.getMasteryState(s.id) }))
            .filter(x => x.m.status === 'building' && x.m.lastBossAccuracy !== null && x.m.lastBossAccuracy < 0.85)
            .sort((a, b) => (a.m.lastBossAccuracy ?? 1) - (b.m.lastBossAccuracy ?? 1));

        if (weak.length > 0) {
            suggestions.push(`Ulangi ${weak[0].s.name} dengan pelajaran singkat lalu latihan 10 soal.`);
        }

        const due = this.getDueReviews();
        if (due.length > 0) {
            const names = due.slice(0, 2).map(d => CURRICULUM.getSubtopic(d.subtopic)?.name || d.subtopic);
            suggestions.push(`Kerjakan pengulangan: ${names.join(', ')}.`);
        }

        const mistakes = this.state.getMistakeBook();
        if (mistakes.length > 0) {
            suggestions.push(`Buka Buku Kesalahan (${mistakes.length} soal) dan perbaiki miskonsepsi.`);
        }

        const next = all.find(s => this.getSubtopicReadiness(s.id).ready
            && ['locked', undefined].includes(this.getMasteryState(s.id).status));

        if (next) {
            suggestions.push(`Mulai materi baru: ${next.name}.`);
        }

        const defaults = [
            'Latihan 15 menit setiap hari agar kebiasaan belajar terbentuk.',
            'Kerjakan satu Tryout Mini untuk mengukur kesiapan.',
            'Baca kembali pembahasan soal yang salah di Buku Kesalahan.'
        ];

        for (const d of defaults) {
            if (suggestions.length >= 3) break;
            suggestions.push(d);
        }

        return suggestions.slice(0, 3);
    }
}

export const masteryService = new MasteryService();
