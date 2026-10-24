import { CURRICULUM } from '../../data/curriculum.js';
import { questionEngine } from '../core/QuestionEngine.js';
import { gameState } from '../core/GameState.js';
import { el, showToast, openModal, confirmDialog, formatDuration, escapeHtml } from '../ui/dom.js';

const DOMAIN_NAME = { bilangan: 'Bilangan', geometri: 'Geometri & Pengukuran', data: 'Data' };

export class TryoutScreen {
    constructor(host, { onExit }) {
        this.host = host;
        this.onExit = onExit;
        this.session = null;
    }

    render() {
        this.host.innerHTML = '';
        this.host.hidden = false;

        const history = gameState.getTryoutHistory();
        const latest = history[0];
        const wrapper = el('div', { class: 'screen-scroll' });
        const head = el('div', { class: 'screen-head' });
        head.innerHTML = `
            <h2>Sekolah · Tryout CBT</h2>
            <p class="screen-sub">Simulasi TKA: tanpa umpan balik di tengah ujian, ada timer dan tanda ragu. Format dapat diubah sesuai kisi-kisi resmi.</p>
        `;
        wrapper.appendChild(head);

        const options = el('div', { class: 'tryout-options' });
        const configs = [
            { key: 'mini', title: 'Tryout Mini', size: 10, minutes: 25, desc: '10 soal campuran, 25 menit. Cocok untuk latihan rutin.' },
            { key: 'full', title: 'Tryout Penuh', size: 30, minutes: 75, desc: '30 soal campuran sesuai bobot domain, 75 menit.' },
            { key: 'domain', title: 'Tryout per Domain', size: 10, minutes: 25, desc: 'Fokus pada satu domain untuk menutup celah.' }
        ];

        for (const cfg of configs) {
            const card = el('div', { class: 'tryout-card' });
            card.innerHTML = `
                <h3>${cfg.title}</h3>
                <p>${cfg.desc}</p>
            `;
            const btn = el('button', { class: 'btn btn-primary', type: 'button', text: 'Mulai' });
            btn.addEventListener('click', () => {
                if (cfg.key === 'domain') this._chooseDomain();
                else this._start({ size: cfg.size, minutes: cfg.minutes, kind: cfg.key });
            });
            card.appendChild(btn);
            options.appendChild(card);
        }
        wrapper.appendChild(options);

        if (latest) {
            const report = el('section', { class: 'tryout-history' });
            report.innerHTML = `<h3>Hasil terakhir</h3>`;
            const card = el('div', { class: 'tryout-history-card' });
            card.innerHTML = `
                <div class="tryout-history-score">${latest.score}<small>/100</small></div>
                <div class="tryout-history-meta">
                    <span>${latest.kind === 'full' ? 'Tryout Penuh' : latest.kind === 'mini' ? 'Tryout Mini' : 'Tryout Domain'}</span>
                    <span>${new Date(latest.date).toLocaleString('id-ID')}</span>
                    <span>Benar ${latest.correct}/${latest.total} · ${formatDuration(latest.duration)}</span>
                </div>
            `;
            const openBtn = el('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'Lihat laporan' });
            openBtn.addEventListener('click', () => this._showReport(latest, true));
            card.appendChild(openBtn);
            report.appendChild(card);

            if (history.length > 1) {
                const list = el('div', { class: 'history-list' });
                list.innerHTML = history.slice(1, 6).map(h => `
                    <button class="history-row" type="button" data-id="${h.id}">
                        <span>${new Date(h.date).toLocaleDateString('id-ID')}</span>
                        <span>${h.score}/100</span>
                    </button>
                `).join('');
                list.querySelectorAll('.history-row').forEach(row => {
                    row.addEventListener('click', () => {
                        const item = history.find(h => String(h.id) === row.dataset.id);
                        if (item) this._showReport(item, true);
                    });
                });
                report.appendChild(list);
            }
            wrapper.appendChild(report);
        }

        this.host.appendChild(wrapper);
    }

    _chooseDomain() {
        const body = el('div', { class: 'domain-picker' });
        const footer = el('div', { class: 'modal-footer-actions' });
        const cancel = el('button', { class: 'btn btn-secondary', type: 'button', text: 'Batal' });
        footer.appendChild(cancel);

        const modal = openModal({ title: 'Pilih domain', body, footer, size: 'sm' });

        for (const domain of CURRICULUM.domains) {
            const btn = el('button', { class: 'btn btn-secondary btn-block', type: 'button', text: domain.name });
            btn.addEventListener('click', () => {
                modal.close();
                this._start({ size: 10, minutes: 25, kind: 'domain', domains: [domain.id] });
            });
            body.appendChild(btn);
        }
        cancel.addEventListener('click', () => modal.close());
    }

    _start({ size, minutes, kind, domains = null }) {
        const questions = questionEngine.generateTryout({ size, domains });
        if (questions.length === 0) {
            showToast('Soal tryout belum tersedia.', 'error');
            return;
        }

        this.session = {
            kind,
            questions,
            answers: new Array(questions.length).fill(null),
            flagged: new Set(),
            index: 0,
            startedAt: Date.now(),
            endsAt: Date.now() + minutes * 60 * 1000,
            minutes,
            size
        };

        this.host.innerHTML = '';
        this.host.hidden = false;

        const wrap = el('div', { class: 'cbt' });
        wrap.innerHTML = `
            <header class="cbt-header">
                <div class="cbt-title">${kind === 'full' ? 'Tryout Penuh' : kind === 'mini' ? 'Tryout Mini' : 'Tryout Domain'}</div>
                <div class="cbt-timer" id="cbt-timer" role="timer" aria-live="off">--:--</div>
                <button class="btn btn-ghost btn-sm" id="cbt-exit" type="button">Keluar</button>
            </header>
            <div class="cbt-nav" id="cbt-nav" role="tablist" aria-label="Navigasi nomor soal"></div>
            <main class="cbt-main" id="cbt-main"></main>
            <footer class="cbt-footer">
                <button class="btn btn-secondary btn-sm" id="cbt-prev" type="button">← Sebelumnya</button>
                <button class="btn btn-secondary btn-sm" id="cbt-flag" type="button">Tandai ragu</button>
                <button class="btn btn-primary btn-sm" id="cbt-next" type="button">Berikutnya →</button>
                <button class="btn btn-accent btn-sm" id="cbt-submit" type="button">Kumpulkan</button>
            </footer>
        `;
        this.host.appendChild(wrap);

        this._renderNav();
        this._renderQuestion();

        wrap.querySelector('#cbt-prev').addEventListener('click', () => this._move(-1));
        wrap.querySelector('#cbt-next').addEventListener('click', () => this._move(1));
        wrap.querySelector('#cbt-flag').addEventListener('click', () => this._toggleFlag());
        wrap.querySelector('#cbt-submit').addEventListener('click', () => this._confirmSubmit());
        wrap.querySelector('#cbt-exit').addEventListener('click', () => this._exit());

        this._startTimer();
    }

    _renderNav() {
        const nav = this.host.querySelector('#cbt-nav');
        nav.innerHTML = '';
        this.session.questions.forEach((q, i) => {
            const btn = el('button', {
                class: `cbt-nav-btn${i === this.session.index ? ' current' : ''}${this.session.answers[i] !== null ? ' answered' : ''}${this.session.flagged.has(i) ? ' flagged' : ''}`,
                type: 'button',
                role: 'tab',
                'aria-label': `Soal ${i + 1}${this.session.answers[i] !== null ? ', sudah dijawab' : ', belum dijawab'}${this.session.flagged.has(i) ? ', ditandai ragu' : ''}`,
                'aria-selected': String(i === this.session.index)
            });
            btn.textContent = String(i + 1);
            btn.addEventListener('click', () => {
                this.session.index = i;
                this._renderNav();
                this._renderQuestion();
            });
            nav.appendChild(btn);
        });
    }

    _renderQuestion() {
        const s = this.session;
        const q = s.questions[s.index];
        const main = this.host.querySelector('#cbt-main');

        const mediaHtml = this._mediaHtml(q.media);

        main.innerHTML = `
            <div class="cbt-question">
                <div class="cbt-question-head">
                    <span class="cbt-number">Soal ${s.index + 1} dari ${s.questions.length}</span>
                    <span class="level-pill level-${q.level}">${q.level}</span>
                </div>
                <p class="cbt-stem">${escapeHtml(q.stem)}</p>
                ${mediaHtml}
                <div class="cbt-options" role="radiogroup" aria-label="Pilihan jawaban">
                    ${q.options.map((o, i) => `
                        <button class="cbt-option${s.answers[s.index] === i ? ' selected' : ''}" type="button" data-index="${i}" role="radio" aria-checked="${s.answers[s.index] === i}">
                            <span class="option-letter">${String.fromCharCode(65 + i)}</span>
                            <span class="option-text">${escapeHtml(o.text)}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        main.querySelectorAll('.cbt-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = Number(btn.dataset.index);
                s.answers[s.index] = idx;
                main.querySelectorAll('.cbt-option').forEach((b, i) => {
                    b.classList.toggle('selected', i === idx);
                    b.setAttribute('aria-checked', String(i === idx));
                });
                this._renderNav();
            });
        });

        const flagBtn = this.host.querySelector('#cbt-flag');
        flagBtn.classList.toggle('active', s.flagged.has(s.index));
        flagBtn.textContent = s.flagged.has(s.index) ? 'Hapus tanda ragu' : 'Tandai ragu';

        this._drawPendingCharts();

        const prev = this.host.querySelector('#cbt-prev');
        const next = this.host.querySelector('#cbt-next');
        prev.disabled = s.index === 0;
        next.disabled = s.index === s.questions.length - 1;
    }

    _mediaHtml(media) {
        if (!media) return '';
        if (media.type === 'table') {
            return `<div class="cbt-media"><table class="question-table">
                <thead><tr>${media.head.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
                <tbody>${media.rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody>
            </table></div>`;
        }
        if (media.type === 'bar') {
            return `<div class="cbt-media"><canvas class="cbt-chart" data-chart="${encodeURIComponent(JSON.stringify({ labels: media.labels, values: media.values }))}" width="420" height="230" role="img" aria-label="Diagram batang"></canvas></div>`;
        }
        return '';
    }

    _drawPendingCharts() {
        const canvases = this.host.querySelectorAll('canvas[data-chart]');
        canvases.forEach(canvas => {
            if (canvas.dataset.drawn === '1') return;
            const data = JSON.parse(decodeURIComponent(canvas.dataset.chart));
            const ctx = canvas.getContext('2d');
            const w = canvas.width;
            const h = canvas.height;
            const pad = { top: 22, right: 12, bottom: 34, left: 38 };
            const plotW = w - pad.left - pad.right;
            const plotH = h - pad.top - pad.bottom;
            const maxVal = Math.max(...data.values, 1);
            const niceMax = Math.ceil(maxVal / 5) * 5;

            ctx.clearRect(0, 0, w, h);
            ctx.strokeStyle = '#C8E6C9';
            ctx.fillStyle = '#5A7A63';
            ctx.font = '11px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            for (let i = 0; i <= 4; i++) {
                const val = (niceMax / 4) * i;
                const y = pad.top + plotH - (val / niceMax) * plotH;
                ctx.beginPath();
                ctx.moveTo(pad.left, y);
                ctx.lineTo(w - pad.right, y);
                ctx.stroke();
                ctx.fillText(String(val), pad.left - 6, y);
            }

            const slot = plotW / data.labels.length;
            const barW = Math.min(44, slot * 0.55);
            data.labels.forEach((label, i) => {
                const barH = (data.values[i] / niceMax) * plotH;
                const x = pad.left + slot * i + (slot - barW) / 2;
                const y = pad.top + plotH - barH;
                ctx.fillStyle = '#43A047';
                ctx.fillRect(x, y, barW, barH);
                ctx.fillStyle = '#1B5E20';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(String(data.values[i]), x + barW / 2, y - 3);
                ctx.fillStyle = '#5A7A63';
                ctx.textBaseline = 'top';
                ctx.fillText(label, x + barW / 2, pad.top + plotH + 6);
            });
            canvas.dataset.drawn = '1';
        });
    }

    _move(delta) {
        const next = this.session.index + delta;
        if (next < 0 || next >= this.session.questions.length) return;
        this.session.index = next;
        this._renderNav();
        this._renderQuestion();
    }

    _toggleFlag() {
        const idx = this.session.index;
        if (this.session.flagged.has(idx)) this.session.flagged.delete(idx);
        else this.session.flagged.add(idx);
        this._renderNav();
        this._renderQuestion();
    }

    _startTimer() {
        const timerEl = this.host.querySelector('#cbt-timer');
        const tick = () => {
            const remaining = Math.max(0, this.session.endsAt - Date.now());
            const m = Math.floor(remaining / 60000);
            const s = Math.floor((remaining % 60000) / 1000);
            timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            timerEl.classList.toggle('warning', remaining <= 5 * 60000 && remaining > 60000);
            timerEl.classList.toggle('danger', remaining <= 60000);

            if (remaining <= 0) {
                clearInterval(this.timerId);
                showToast('Waktu habis. Jawaban dikumpulkan otomatis.', 'warning');
                this._submit(true);
            }
        };
        tick();
        this.timerId = setInterval(tick, 1000);
    }

    _confirmSubmit() {
        const unanswered = this.session.answers.filter(a => a === null).length;
        const flagged = this.session.flagged.size;

        confirmDialog({
            title: 'Kumpulkan tryout?',
            message: `Belum dijawab: ${unanswered} soal. Ditandai ragu: ${flagged} soal. Setelah dikumpulkan, jawaban tidak bisa diubah.`,
            confirmText: 'Kumpulkan',
            cancelText: 'Periksa lagi'
        }).then(yes => {
            if (yes) this._submit(false);
        });
    }

    _submit(auto) {
        if (!this.session) return;
        if (this.timerId) clearInterval(this.timerId);

        const s = this.session;
        const duration = Date.now() - s.startedAt;

        const perDomain = {};
        const perLevel = {};
        let correct = 0;
        let answered = 0;

        const details = s.questions.map((q, i) => {
            const answer = s.answers[i];
            const isCorrect = answer !== null && answer === q.answer_spec;
            if (answer !== null) answered++;
            if (isCorrect) correct++;

            const domain = CURRICULUM.getSubtopic(q.subtopic)?.domain || 'bilangan';
            perDomain[domain] = perDomain[domain] || { total: 0, correct: 0 };
            perDomain[domain].total++;
            if (isCorrect) perDomain[domain].correct++;

            perLevel[q.level] = perLevel[q.level] || { total: 0, correct: 0 };
            perLevel[q.level].total++;
            if (isCorrect) perLevel[q.level].correct++;

            return {
                number: i + 1,
                subtopic: q.subtopic,
                level: q.level,
                domain,
                stem: q.stem,
                options: q.options.map(o => o.text),
                correctIndex: q.answer_spec,
                answer,
                correct: isCorrect,
                flagged: s.flagged.has(i),
                explanation: q.explanation
            };
        });

        const score = Math.round((correct / s.questions.length) * 100);

        const result = {
            id: `${Date.now()}`,
            kind: s.kind,
            date: Date.now(),
            total: s.questions.length,
            answered,
            correct,
            score,
            duration,
            auto,
            perDomain,
            perLevel,
            details
        };

        gameState.addTryoutResult(result);
        gameState.addTelemetry('tryout_submitted', { kind: s.kind, score, correct, total: s.questions.length, duration });
        gameState.incrementStat('sessions');
        gameState.touchStreak();

        gameState.update('progress.xp', xp => (xp || 0) + Math.round(score / 2));
        gameState.update('progress.coins', coins => (coins || 0) + Math.round(score / 5));

        this.session = null;
        this._showReport(result, false);
    }

    _showReport(result, fromHistory) {
        const body = el('div', { class: 'report-body' });

        const domainRows = Object.entries(result.perDomain).map(([domain, data]) => {
            const pct = Math.round((data.correct / data.total) * 100);
            return `
                <div class="report-row">
                    <span>${DOMAIN_NAME[domain] || domain}</span>
                    <div class="report-bar"><div class="report-bar-fill" style="width:${pct}%"></div></div>
                    <span class="report-value">${data.correct}/${data.total}</span>
                </div>
            `;
        }).join('');

        const levelRows = ['L1', 'L2', 'L3'].map(level => {
            const data = result.perLevel[level];
            if (!data) return '';
            return `<span class="level-score"><span class="level-pill level-${level}">${level}</span> ${data.correct}/${data.total}</span>`;
        }).join('');

        const missed = result.details.filter(d => !d.correct);
        const flagged = result.details.filter(d => d.flagged);
        const skipped = result.details.filter(d => d.answer === null);

        body.innerHTML = `
            <div class="report-score">
                <span class="report-score-value">${result.score}</span>
                <span class="report-score-label">perkiraan skor /100</span>
            </div>
            <div class="report-summary">
                <span>Benar ${result.correct}/${result.total}</span>
                <span>Terjawab ${result.answered}/${result.total}</span>
                <span>Durasi ${formatDuration(result.duration)}</span>
                <span>Terlewat ${skipped.length}</span>
                <span>Ragu ${flagged.length}</span>
            </div>
            <h4>Skor per domain</h4>
            <div class="report-rows">${domainRows}</div>
            <h4>Skor per level</h4>
            <div class="report-levels">${levelRows}</div>
            ${missed.length > 0 ? `
                <h4>Soal yang perlu dipelajari (${missed.length})</h4>
                <div class="report-missed">
                    ${missed.slice(0, 12).map(d => `
                        <div class="review-item">
                            <p class="review-stem">${d.number}. ${escapeHtml(d.stem || '')}</p>
                            <p class="review-answer">Jawabanmu: ${d.answer === null ? '<em>tidak dijawab</em>' : escapeHtml(d.options?.[d.answer] ?? '-')} · Kunci: ${escapeHtml(d.options?.[d.correctIndex] ?? '-')}</p>
                            <p class="review-explanation">${escapeHtml(d.explanation || '')}</p>
                        </div>
                    `).join('')}
                </div>` : '<p class="report-perfect">Tidak ada jawaban salah. Hebat!</p>'}
        `;

        const footer = el('div', { class: 'modal-footer-actions' });
        const close = el('button', { class: 'btn btn-primary', type: 'button', text: 'Tutup' });
        footer.appendChild(close);

        const modal = openModal({
            title: fromHistory ? 'Laporan Tryout' : 'Hasil Tryout',
            body,
            footer,
            size: 'lg',
            onClose: () => {
                if (!fromHistory) {
                    this.render();
                    this.onExit?.({ refresh: true });
                }
            }
        });

        close.addEventListener('click', () => modal.close());
    }

    _exit() {
        confirmDialog({
            title: 'Keluar dari tryout?',
            message: 'Jawaban tryout yang belum dikumpulkan akan hilang.',
            confirmText: 'Keluar',
            cancelText: 'Lanjut ujian'
        }).then(yes => {
            if (!yes) return;
            if (this.timerId) clearInterval(this.timerId);
            this.session = null;
            this.render();
            this.onExit?.({ refresh: true });
        });
    }

    destroy() {
        if (this.timerId) clearInterval(this.timerId);
        this.session = null;
    }
}
