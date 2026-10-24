import { questionEngine } from '../core/QuestionEngine.js';
import { escapeHtml } from '../ui/dom.js';
import { audioService } from '../core/AudioService.js';

export class QuestionScene {
    constructor(container, gameState, onComplete) {
        this.container = container;
        this.gameState = gameState;
        this.onComplete = onComplete;
        this.question = null;
        this.selectedAnswer = null;
        this.hintsUsed = 0;
        this.startTime = 0;
        this.showFeedback = false;
        this.element = null;
        this.timerInterval = null;
        this.onTimeUp = null;
        this.allowHints = true;
        this.autoAdvance = true;
        this._keyHandler = null;
    }

    load(question, options = {}) {
        this.destroy();

        this.question = question;
        this.selectedAnswer = null;
        this.hintsUsed = 0;
        this.startTime = Date.now();
        this.showFeedback = false;
        this.allowHints = options.allowHints !== false;
        this.autoAdvance = options.autoAdvance !== false;
        this.helpMode = options.helpMode === true;
        this.onTimeUp = options.onTimeUp || null;
        this.onExit = options.onExit || null;
        this._render();
    }

    _render() {
        if (!this.question) return;
        const q = this.question;
        const isTryout = q.isTryout === true;

        this.element = document.createElement('div');
        this.element.className = 'question-panel';
        this.element.setAttribute('role', 'group');
        this.element.setAttribute('aria-label', 'Soal latihan');

        this.element.innerHTML = `
            <div class="question-card">
                <div class="question-header">
                    <span class="question-number">${q.questionNumber ? `Soal ${q.questionNumber}` : ''}${q.totalQuestions ? ` dari ${q.totalQuestions}` : ''}</span>
                    <div class="question-meta">
                        <span class="question-level level-${q.level}">${q.level}</span>
                        ${!isTryout ? `
                        <div class="question-timer" id="question-timer" aria-live="off">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            <span id="timer-text">${this._formatTime(q.est_seconds || 120)}</span>
                        </div>` : ''}
                        ${this.onExit ? '<button class="icon-btn question-exit" id="btn-exit-question" aria-label="Keluar dari latihan">&times;</button>' : ''}
                    </div>
                </div>
                <div class="question-stem" id="question-stem">${escapeHtml(q.stem)}</div>
                <div class="question-media" id="question-media" hidden></div>
                <div class="options-grid" id="options-grid" role="radiogroup" aria-label="Pilihan jawaban">
                    ${q.options.map((opt, i) => `
                        <button class="option-btn" data-index="${i}" role="radio" aria-checked="false" type="button">
                            <span class="option-letter">${String.fromCharCode(65 + i)}</span>
                            <span class="option-text">${escapeHtml(opt.text)}</span>
                        </button>
                    `).join('')}
                </div>
                ${!isTryout ? `
                <div class="feedback-panel" id="feedback-panel" hidden></div>
                <div class="question-actions" id="question-actions">
                    ${this.allowHints ? `<button class="btn btn-secondary" id="btn-hint" type="button">Petunjuk (${this._hintsLeft()} tersisa)</button>` : ''}
                    <button class="btn btn-primary" id="btn-submit" type="button" disabled>Kirim Jawaban</button>
                </div>` : ''}
            </div>
        `;

        this.container.appendChild(this.element);
        this._bindEvents();
        this._renderMedia();
        this._startTimer();

        if (this.helpMode && this.allowHints) {
            this._showScaffold();
        }
    }

    _showScaffold() {
        const hint = questionEngine.getHint(this.question, 0);
        const panel = this.element?.querySelector('#feedback-panel');
        if (!hint || !panel) return;
        panel.hidden = false;
        const box = document.createElement('div');
        box.className = 'hint-box';
        box.innerHTML = `<strong>Mode Bantu:</strong> ${escapeHtml(hint)}`;
        panel.appendChild(box);
    }

    _hintsLeft() {
        return Math.max(0, 3 - this.hintsUsed);
    }

    _bindEvents() {
        const optionsGrid = this.element.querySelector('#options-grid');
        const submitBtn = this.element.querySelector('#btn-submit');
        const hintBtn = this.element.querySelector('#btn-hint');
        const exitBtn = this.element.querySelector('#btn-exit-question');

        optionsGrid.addEventListener('click', (e) => {
            const btn = e.target.closest('.option-btn');
            if (!btn || this.showFeedback) return;
            this._selectAnswer(Number(btn.dataset.index));
        });

        submitBtn?.addEventListener('click', () => this._submitAnswer());
        hintBtn?.addEventListener('click', () => this._useHint());
        exitBtn?.addEventListener('click', () => {
            if (typeof this.onExit === 'function') this.onExit();
        });

        this._keyHandler = (e) => {
            if (!this.element || !document.body.contains(this.element)) return;
            if (this.showFeedback) return;

            if (['1', '2', '3', '4'].includes(e.key)) {
                const idx = Number(e.key) - 1;
                if (idx < this.question.options.length) this._selectAnswer(idx);
            }
            if (e.key === 'Enter' && this.selectedAnswer !== null) {
                this._submitAnswer();
            }
        };
        document.addEventListener('keydown', this._keyHandler);
    }

    _selectAnswer(index) {
        if (this.showFeedback) return;
        this.selectedAnswer = index;
        this.element.querySelectorAll('.option-btn').forEach((btn, i) => {
            btn.classList.toggle('selected', i === index);
            btn.setAttribute('aria-checked', String(i === index));
        });
        this.element.querySelector('#btn-submit')?.removeAttribute('disabled');
    }

    _submitAnswer() {
        if (this.selectedAnswer === null || this.showFeedback) return;

        const q = this.question;
        const correct = q.answer_spec === this.selectedAnswer;
        const timeSpentMs = Date.now() - this.startTime;

        this.showFeedback = true;
        this._stopTimer();
        this._disableOptions();

        if (q.isTryout) {
            this.onComplete?.({
                question: q,
                answer: this.selectedAnswer,
                correct,
                timeSpent: timeSpentMs,
                hintsUsed: this.hintsUsed
            });
            return;
        }

        this._showFeedback(correct, timeSpentMs);

        setTimeout(() => {
            this.onComplete?.({
                question: q,
                answer: this.selectedAnswer,
                correct,
                timeSpent: timeSpentMs,
                hintsUsed: this.hintsUsed
            });
        }, this.autoAdvance ? 2200 : 0);
    }

    _showFeedback(correct, timeSpentMs) {
        const q = this.question;
        const panel = this.element.querySelector('#feedback-panel');
        const actions = this.element.querySelector('#question-actions');
        if (!panel) return;

        const misconception = q.options[this.selectedAnswer]?.misconception_tag;
        const misconceptionText = questionEngine.getMisconceptionText(misconception);
        const fast = timeSpentMs < 2000;

        panel.hidden = false;
        if (actions) actions.hidden = true;

        const icon = correct
            ? '<svg class="feedback-icon correct" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
            : '<svg class="feedback-icon incorrect" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';

        panel.innerHTML = `
            <div class="feedback-header">
                ${icon}
                <span class="feedback-title ${correct ? 'correct' : 'incorrect'}">${correct ? 'Benar!' : 'Belum tepat'}</span>
            </div>
            <p class="feedback-explanation">${escapeHtml(q.explanation)}</p>
            ${!correct && misconceptionText ? `
                <div class="feedback-misconception">
                    <svg class="misconception-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <span class="misconception-text">${escapeHtml(misconceptionText)}</span>
                </div>` : ''}
            ${fast ? '<p class="feedback-note">Jawaban terlalu cepat, tidak dihitung ke penguasaan.</p>' : ''}
        `;

        this.element.querySelectorAll('.option-btn').forEach((btn, i) => {
            btn.classList.remove('selected');
            if (i === q.answer_spec) btn.classList.add('correct');
            else if (i === this.selectedAnswer) btn.classList.add('incorrect');
        });

        audioService.sfx(correct ? 'sfx_correct' : 'sfx_wrong', { volume: 0.45 });
    }

    _useHint() {
        if (!this.allowHints || this.hintsUsed >= 3) return;
        const hint = questionEngine.getHint(this.question, this.hintsUsed);
        if (!hint) return;

        this.hintsUsed++;
        const panel = this.element.querySelector('#feedback-panel');
        if (panel) {
            panel.hidden = false;
            const existing = panel.querySelector('.hint-box');
            const hintEl = document.createElement('div');
            hintEl.className = 'hint-box';
            hintEl.innerHTML = `<strong>Petunjuk ${this.hintsUsed}:</strong> ${escapeHtml(hint)}`;
            if (existing) existing.replaceWith(hintEl);
            else panel.appendChild(hintEl);
        }

        const hintBtn = this.element.querySelector('#btn-hint');
        if (hintBtn) {
            hintBtn.textContent = `Petunjuk (${this._hintsLeft()} tersisa)`;
            hintBtn.disabled = this.hintsUsed >= 3;
        }
    }

    _renderMedia() {
        const media = this.question?.media;
        const container = this.element?.querySelector('#question-media');
        if (!media || !container) return;

        container.hidden = false;

        if (media.type === 'bar') {
            const canvas = document.createElement('canvas');
            const w = 420;
            const h = 240;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = '100%';
            canvas.style.maxWidth = `${w}px`;
            canvas.style.height = 'auto';
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('aria-label', `Diagram batang: ${media.labels.map((l, i) => `${l} ${media.values[i]}`).join(', ')}`);
            container.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);
            this._drawBarChart(ctx, w, h, media.labels, media.values);
            return;
        }

        if (media.type === 'table') {
            const table = document.createElement('table');
            table.className = 'question-table';
            const thead = document.createElement('thead');
            const headRow = document.createElement('tr');
            for (const cell of media.head) {
                const th = document.createElement('th');
                th.textContent = String(cell);
                headRow.appendChild(th);
            }
            thead.appendChild(headRow);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            for (const row of media.rows) {
                const tr = document.createElement('tr');
                for (const cell of row) {
                    const td = document.createElement('td');
                    td.textContent = String(cell);
                    tr.appendChild(td);
                }
                tbody.appendChild(tr);
            }
            table.appendChild(tbody);
            container.appendChild(table);
        }
    }

    _drawBarChart(ctx, w, h, labels, values) {
        const padding = { top: 24, right: 16, bottom: 40, left: 44 };
        const plotW = w - padding.left - padding.right;
        const plotH = h - padding.top - padding.bottom;
        const maxVal = Math.max(...values, 1);
        const niceMax = Math.ceil(maxVal / 5) * 5;

        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = '#C8E6C9';
        ctx.fillStyle = '#5A7A63';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        const steps = 4;
        for (let i = 0; i <= steps; i++) {
            const value = (niceMax / steps) * i;
            const y = padding.top + plotH - (value / niceMax) * plotH;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(w - padding.right, y);
            ctx.stroke();
            ctx.fillText(String(value), padding.left - 8, y);
        }

        const slot = plotW / labels.length;
        const barW = Math.min(48, slot * 0.55);

        labels.forEach((label, i) => {
            const value = values[i];
            const barH = (value / niceMax) * plotH;
            const x = padding.left + slot * i + (slot - barW) / 2;
            const y = padding.top + plotH - barH;

            const gradient = ctx.createLinearGradient(0, y, 0, y + barH);
            gradient.addColorStop(0, '#66BB6A');
            gradient.addColorStop(1, '#2E7D32');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            const r = Math.min(6, barW / 2, barH / 2);
            ctx.moveTo(x, y + barH);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.lineTo(x + barW - r, y);
            ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
            ctx.lineTo(x + barW, y + barH);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#1B5E20';
            ctx.font = '600 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(String(value), x + barW / 2, y - 4);

            ctx.fillStyle = '#5A7A63';
            ctx.font = '11px Inter, sans-serif';
            ctx.textBaseline = 'top';
            ctx.fillText(label, x + barW / 2, padding.top + plotH + 8);
        });
    }

    _startTimer() {
        const timerEl = this.element.querySelector('#timer-text');
        if (!timerEl) return;

        const duration = this.question.est_seconds || 120;
        let remaining = duration;
        const wrapper = timerEl.parentElement;

        this.timerInterval = setInterval(() => {
            remaining--;
            timerEl.textContent = this._formatTime(Math.max(0, remaining));
            wrapper.classList.toggle('warning', remaining <= 30 && remaining > 10);
            wrapper.classList.toggle('danger', remaining <= 10);

            if (remaining <= 0) {
                this._stopTimer();
                if (this.selectedAnswer === null) {
                    if (typeof this.onTimeUp === 'function') {
                        this.onTimeUp();
                    } else {
                        this.selectedAnswer = -1;
                        this.showFeedback = true;
                        this._disableOptions();
                        this.onComplete?.({
                            question: this.question,
                            answer: -1,
                            correct: false,
                            timeSpent: Date.now() - this.startTime,
                            hintsUsed: this.hintsUsed,
                            timedOut: true
                        });
                    }
                }
            }
        }, 1000);
    }

    _stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    _formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    _disableOptions() {
        this.element?.querySelectorAll('.option-btn').forEach(btn => {
            btn.disabled = true;
        });
    }

    destroy() {
        this._stopTimer();
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }
}
