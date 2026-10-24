import { CURRICULUM } from '../../data/curriculum.js';
import { QuestionScene } from '../scenes/QuestionScene.js';
import { questionEngine } from '../core/QuestionEngine.js';
import { masteryService } from '../core/MasteryService.js';
import { gameState } from '../core/GameState.js';
import { el, showToast, openModal, confirmDialog, formatDuration, escapeHtml } from '../ui/dom.js';

const MODE_TITLE = {
    pracek: 'Pra-cek',
    faded: 'Contoh Soal',
    latih: 'Latihan',
    boss: 'Boss Penguasaan',
    review: 'Pengulangan',
    mistakes: 'Buku Kesalahan',
    mixed: 'Latihan Campuran'
};

export class PracticeSession {
    constructor(host, { onExit }) {
        this.host = host;
        this.onExit = onExit;
        this.state = null;
        this.scene = null;
    }

    start(config) {
        this.destroy();

        const mode = config.mode || 'latih';
        const subtopicId = config.subtopicId || null;
        const count = config.count || 10;

        let questions;
        try {
            questions = this._buildQuestions({ mode, subtopicId, count, interval: config.interval, hots: config.hots === true });
        } catch (err) {
            console.error('Question build error:', err);
            showToast('Gagal memuat soal. Coba lagi.', 'error');
            this.onExit?.();
            return;
        }
        if (!questions.length) {
            showToast('Soal untuk sesi ini belum tersedia.', 'warning');
            this.onExit?.();
            return;
        }

        this.state = {
            mode,
            subtopicId,
            interval: config.interval || null,
            questions,
            index: 0,
            results: [],
            startedAt: Date.now(),
            xpEarned: 0,
            coinsEarned: 0,
            hintsUsed: 0,
            wrongStreak: 0,
            helpMode: false
        };

        this.host.hidden = false;
        this.host.innerHTML = '';

        const bar = el('div', { class: 'session-bar' });
        const title = MODE_TITLE[mode] || 'Latihan';
        const subtopicName = subtopicId ? CURRICULUM.getSubtopic(subtopicId)?.name : '';
        bar.innerHTML = `
            <button class="btn btn-ghost btn-sm" id="session-exit" type="button">← Keluar</button>
            <span class="session-title">${title}${subtopicName ? ` · ${subtopicName}` : ''}</span>
            <span class="session-progress" id="session-progress">0 / ${questions.length}</span>
        `;
        this.host.appendChild(bar);
        bar.querySelector('#session-exit').addEventListener('click', () => this._confirmExit());

        this.questionHost = el('div', { class: 'session-question' });
        this.host.appendChild(this.questionHost);

        this.scene = new QuestionScene(this.questionHost, gameState, (result) => this._onAnswer(result));

        this._renderCurrent();
    }

    _buildQuestions({ mode, subtopicId, count, interval, hots = false }) {
        if (mode === 'boss') {
            return questionEngine.generateBossSet(subtopicId, 8);
        }

        if (mode === 'mistakes') {
            const book = gameState.getMistakeBook();
            return book.slice(0, count).map(entry => {
                const q = questionEngine.generateQuestion(entry.subtopic, 'L2');
                q.fromMistake = true;
                return q;
            });
        }

        if (hots && subtopicId) {
            return Array.from({ length: count }, () => questionEngine.generateQuestion(subtopicId, 'L3'));
        }

        if (mode === 'mixed' || hots) {
            const all = CURRICULUM.getAllSubtopics();
            const active = all.filter(s => {
                const st = masteryService.getMasteryState(s.id).status;
                return st === 'building' || st === 'mastered' || st === 'strong';
            });
            const pool = active.length ? active : all.filter(s => s.prerequisites.length === 0);
            const out = [];
            for (let i = 0; i < count; i++) {
                const s = pool[Math.floor(Math.random() * pool.length)];
                const level = hots ? 'L3' : ['L1', 'L2', 'L3'][Math.floor(Math.random() * 3)];
                out.push(questionEngine.generateQuestion(s.id, level));
            }
            return out;
        }

        if (mode === 'review') {
            return questionEngine.generateQuestionSet(subtopicId, Math.min(count, 5));
        }

        const mastery = masteryService.getMasteryState(subtopicId);
        if (mode === 'pracek' || mode === 'faded') {
            const out = [];
            for (let i = 0; i < count; i++) {
                out.push(questionEngine.generateQuestion(subtopicId, i === 0 ? 'L1' : 'L2'));
            }
            return out;
        }

        return questionEngine.selectAdaptive(subtopicId, mastery.theta || 0, count);
    }

    _renderCurrent() {
        const s = this.state;
        if (!s) return;

        if (s.index >= s.questions.length) {
            this._finish();
            return;
        }

        const q = s.questions[s.index];
        q.questionNumber = s.index + 1;
        q.totalQuestions = s.questions.length;

        const progress = this.host.querySelector('#session-progress');
        if (progress) progress.textContent = `${s.index + 1} / ${s.questions.length}`;

        this.scene.load(q, {
            allowHints: s.mode !== 'boss',
            autoAdvance: s.mode !== 'faded',
            helpMode: s.helpMode,
            onExit: () => this._confirmExit(),
            onTimeUp: () => {
                this._onAnswer({
                    question: q,
                    answer: -1,
                    correct: false,
                    timeSpent: (q.est_seconds || 60) * 1000,
                    hintsUsed: this.scene.hintsUsed,
                    timedOut: true
                });
            }
        });
    }

    _onAnswer(result) {
        const s = this.state;
        if (!s) return;

        const { question, correct, timeSpent, hintsUsed } = result;

        s.results.push({
            question,
            correct,
            timeSpent,
            hintsUsed,
            timedOut: Boolean(result.timedOut),
            answer: result.answer
        });
        s.hintsUsed += hintsUsed || 0;

        if (s.mode === 'boss') {
            s.index++;
            setTimeout(() => this._renderCurrent(), 0);
            return;
        }

        masteryService.recordAttempt(question.subtopic, question, correct, timeSpent, hintsUsed);
        gameState.incrementStat('totalQuestionsAnswered');
        gameState.incrementStat('totalTimeSpent', timeSpent);
        if (correct) gameState.incrementStat('totalCorrect');

        if (correct) {
            s.wrongStreak = 0;
            const base = question.level === 'L3' ? 15 : question.level === 'L2' ? 12 : 10;
            const penalty = hintsUsed > 0 ? 0.6 : 1;
            const xp = Math.round(base * penalty);
            const coins = question.level === 'L3' ? 4 : 2;
            s.xpEarned += xp;
            s.coinsEarned += coins;
            gameState.update('progress.xp', v => (v || 0) + xp);
            gameState.update('progress.coins', v => (v || 0) + coins);
        } else if (s.mode !== 'review') {
            s.wrongStreak += 1;
            gameState.update('progress.hearts', v => Math.max(0, (v ?? 3) - 1));

            if (s.wrongStreak >= 3 && s.mode !== 'boss') {
                s.helpMode = true;
                s.wrongStreak = 0;
                showToast('Mode Bantu aktif: petunjuk akan ditampilkan lebih dulu. Kamu tidak dikeluarkan.', 'info', 5000);
            }
        }

        if (s.mode === 'mistakes' && correct) {
            const entry = gameState.getMistakeBook().find(m => m.stem === question.stem);
            if (entry) gameState.resolveMistake(entry.itemId);
        }

        s.index++;
        setTimeout(() => this._renderCurrent(), 0);
    }

    _finish() {
        const s = this.state;
        if (!s) return;

        const total = s.results.length;
        const correct = s.results.filter(r => r.correct).length;
        const accuracy = total ? correct / total : 0;
        const duration = Date.now() - s.startedAt;

        gameState.set('progress.hearts', 3);
        gameState.touchStreak();
        gameState.incrementStat('sessions');
        gameState.addTelemetry('session_end', { mode: s.mode, accuracy, duration, total });

        if (s.mode === 'boss') {
            const outcome = masteryService.recordBossAttempt(s.subtopicId, s.results.map(r => ({
                correct: r.correct,
                level: r.question.level,
                misconceptionTag: r.question.options?.[r.answer]?.misconception_tag || null
            })));
            this._showBossResult(outcome);
            return;
        }

        if (s.mode === 'review' && s.interval) {
            masteryService.completeReview(s.subtopicId, s.interval, accuracy >= 0.6);
        }

        this._showResult({ total, correct, accuracy, duration });
    }

    _showResult({ total, correct, accuracy, duration }) {
        const s = this.state;
        const subtopic = s.subtopicId ? CURRICULUM.getSubtopic(s.subtopicId) : null;

        const emoji = accuracy >= 0.9 ? '🎉' : accuracy >= 0.7 ? '👍' : '📚';
        const message = accuracy >= 0.9
            ? 'Hebat! Kamu siap mencoba Boss penguasaan.'
            : accuracy >= 0.7
                ? 'Bagus. Ulangi sekali lagi supaya makin mantap.'
                : 'Terus latihan. Baca pembahasan lalu coba lagi.';

        const wrong = s.results.filter(r => !r.correct).slice(0, 6);
        const body = el('div', { class: 'result-body' });
        body.innerHTML = `
            <div class="result-emoji" aria-hidden="true">${emoji}</div>
            <p class="result-score">${correct} dari ${total} benar</p>
            <p class="result-accuracy">Akurasi ${Math.round(accuracy * 100)}%</p>
            <p class="result-message">${message}</p>
            <div class="result-stats">
                <div class="result-stat"><span>+${s.xpEarned}</span><small>XP</small></div>
                <div class="result-stat"><span>+${s.coinsEarned}</span><small>Koin</small></div>
                <div class="result-stat"><span>${formatDuration(duration)}</span><small>Durasi</small></div>
            </div>
            ${subtopic ? `<p class="result-sub">Subtopik: ${escapeHtml(subtopic.name)}</p>` : ''}
        `;

        if (wrong.length) {
            const list = el('div', { class: 'result-review' });
            list.innerHTML = '<h4>Perbaiki ini</h4>' + wrong.map(w => `
                <div class="review-item">
                    <p class="review-stem">${escapeHtml(w.question.stem)}</p>
                    <p class="review-explanation">${escapeHtml(w.question.explanation)}</p>
                </div>
            `).join('');
            body.appendChild(list);
        }

        const footer = el('div', { class: 'modal-footer-actions' });
        const again = el('button', { class: 'btn btn-secondary', type: 'button', text: 'Ulangi' });
        const done = el('button', { class: 'btn btn-primary', type: 'button', text: 'Selesai' });
        footer.appendChild(again);
        footer.appendChild(done);

        const config = {
            mode: s.mode,
            subtopicId: s.subtopicId,
            count: total,
            interval: s.interval
        };

        const modal = openModal({ title: 'Hasil Latihan', body, footer, size: 'md', onClose: () => {
            this.destroy();
            this.onExit?.({ refresh: true });
        } });

        again.addEventListener('click', () => {
            modal.close();
            this.start(config);
        });
        done.addEventListener('click', () => modal.close());
    }

    _showBossResult(outcome) {
        const s = this.state;
        const subtopic = CURRICULUM.getSubtopic(s.subtopicId);
        const body = el('div', { class: 'result-body' });

        body.innerHTML = `
            <div class="result-emoji" aria-hidden="true">${outcome.mastered ? '🏆' : outcome.passed ? '⭐' : '💪'}</div>
            <p class="result-score">${outcome.correct} dari ${outcome.total} benar</p>
            <p class="result-accuracy">Akurasi ${Math.round(outcome.accuracy * 100)}% · L3 benar ${outcome.l3Correct}/${outcome.l3Total}</p>
            <p class="result-message">${
                outcome.mastered
                    ? `${escapeHtml(subtopic?.name || 'Subtopik')} resmi DIKUASAI. Bangunan di kota sudah dibangun!`
                    : outcome.passed
                        ? `Boss lolos! Butuh ${outcome.passesNeeded} kali lagi di hari berbeda untuk status Dikuasai.`
                        : 'Boss belum lolos. Pelajari miskonsepsi di bawah lalu coba lagi.'
            }</p>
            ${outcome.dominantMisconception
                ? `<p class="result-sub">Miskonsepsi dominan: ${escapeHtml(questionEngine.getMisconceptionText(outcome.dominantMisconception) || outcome.dominantMisconception)}</p>`
                : ''}
        `;

        const footer = el('div', { class: 'modal-footer-actions' });
        const close = el('button', { class: 'btn btn-primary', type: 'button', text: 'Selesai' });
        footer.appendChild(close);

        const modal = openModal({
            title: 'Boss Penguasaan',
            body,
            footer,
            size: 'md',
            onClose: () => {
                this.destroy();
                this.onExit?.({ refresh: true });
            }
        });

        close.addEventListener('click', () => modal.close());
    }

    _confirmExit() {
        if (!this.state) return;
        if (this.state.results.length === 0) {
            this.destroy();
            this.onExit?.();
            return;
        }

        confirmDialog({
            title: 'Keluar dari latihan?',
            message: 'Progres soal yang sudah dijawab tetap tersimpan, tetapi sesi ini tidak diselesaikan.',
            confirmText: 'Keluar',
            cancelText: 'Lanjut belajar'
        }).then(yes => {
            if (!yes) return;
            this.destroy();
            this.onExit?.({ refresh: true });
        });
    }

    destroy() {
        this.scene?.destroy();
        this.scene = null;
        this.state = null;
        this.host.innerHTML = '';
        this.host.hidden = true;
    }
}
