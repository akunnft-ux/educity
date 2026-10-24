import { CURRICULUM } from '../../data/curriculum.js';
import { masteryService } from '../core/MasteryService.js';
import { gameState } from '../core/GameState.js';
import { el, escapeHtml, showToast } from '../ui/dom.js';

const STATUS_TEXT = {
    locked: 'Terkunci',
    building: 'Sedang belajar',
    mastered: 'Dikuasai',
    strong: 'Kuat'
};

export class ArenaScreen {
    constructor(host, { onStart }) {
        this.host = host;
        this.onStart = onStart;
    }

    render() {
        this.host.innerHTML = '';
        this.host.hidden = false;

        const overall = masteryService.getOverallProgress();
        const due = masteryService.getDueReviews();

        const wrapper = el('div', { class: 'screen-scroll' });
        const head = el('div', { class: 'screen-head' });
        head.innerHTML = `
            <h2>Arena Latihan</h2>
            <p class="screen-sub">Latihan adaptif memilih soal pada peluang benar sekitar 70%. Boss penguasaan butuh akurasi ≥ 85% dengan minimal 1 soal L3 benar, dua kali di hari berbeda.</p>
        `;
        wrapper.appendChild(head);

        const summary = el('div', { class: 'arena-summary' });
        summary.innerHTML = `
            <div class="mini-stat"><span class="mini-stat-value">${overall.mastered}</span><span class="mini-stat-label">Subtopik dikuasai</span></div>
            <div class="mini-stat"><span class="mini-stat-value">${overall.building}</span><span class="mini-stat-label">Sedang belajar</span></div>
            <div class="mini-stat"><span class="mini-stat-value">${due.length}</span><span class="mini-stat-label">Ulang jatuh tempo</span></div>
        `;
        wrapper.appendChild(summary);

        if (due.length > 0) {
            const reviewCard = el('section', { class: 'arena-card review' });
            reviewCard.innerHTML = `
                <h3>Pengulangan berjarak</h3>
                <p>${due.length} subtopik sudah jatuh tempo untuk diulang (H+1/3/7/21).</p>
            `;
            const btn = el('button', { class: 'btn btn-primary', type: 'button', text: 'Mulai pengulangan' });
            btn.addEventListener('click', () => {
                const first = due[0];
                this.onStart({ mode: 'review', subtopicId: first.subtopic, interval: first.interval });
            });
            reviewCard.appendChild(btn);
            wrapper.appendChild(reviewCard);
        }

        const quick = el('section', { class: 'arena-card' });
        quick.innerHTML = `<h3>Latihan cepat campuran</h3><p>10 soal dari beberapa subtopik yang sedang dipelajari.</p>`;
        const quickBtn = el('button', { class: 'btn btn-primary', type: 'button', text: 'Mulai 10 soal campuran' });
        quickBtn.addEventListener('click', () => this.onStart({ mode: 'mixed', count: 10 }));
        quick.appendChild(quickBtn);
        wrapper.appendChild(quick);

        const mistakes = gameState.getMistakeBook();
        if (mistakes.length > 0) {
            const mistakeCard = el('section', { class: 'arena-card' });
            mistakeCard.innerHTML = `<h3>Buku Kesalahan</h3><p>${mistakes.length} soal perlu diperbaiki. Latih ulang dari kesalahanmu.</p>`;
            const btn = el('button', { class: 'btn btn-secondary', type: 'button', text: 'Latih dari kesalahan' });
            btn.addEventListener('click', () => this.onStart({ mode: 'mistakes', count: Math.min(10, mistakes.length) }));
            mistakeCard.appendChild(btn);
            wrapper.appendChild(mistakeCard);
        }

        for (const domain of CURRICULUM.domains) {
            const section = el('section', { class: 'arena-domain' });
            const progress = masteryService.getDomainProgress(domain.id);
            section.appendChild(el('div', { class: 'domain-head' }, [
                el('span', { class: 'domain-icon', text: domain.icon }),
                el('div', {}, [
                    el('h3', { text: domain.name }),
                    el('span', { class: 'domain-progress-text', text: `${progress.mastered}/${progress.total} dikuasai` })
                ])
            ]));

            const grid = el('div', { class: 'arena-grid' });
            for (const subtopic of domain.subtopics) {
                const mastery = masteryService.getMasteryState(subtopic.id);
                const readiness = masteryService.getSubtopicReadiness(subtopic.id);
                const card = el('div', { class: `arena-item ${mastery.status || 'locked'}` });
                card.innerHTML = `
                    <div class="arena-item-head">
                        <span class="arena-code">${subtopic.id}</span>
                        <span class="status-badge status-${mastery.status || 'locked'}">${STATUS_TEXT[mastery.status || 'locked']}</span>
                    </div>
                    <h4>${escapeHtml(subtopic.name)}</h4>
                    <p class="arena-meta">${mastery.lastBossAccuracy !== null && mastery.lastBossAccuracy !== undefined
                        ? `Boss terakhir: ${Math.round(mastery.lastBossAccuracy * 100)}% · L3 benar: ${mastery.lastBossL3Correct || 0}`
                        : 'Belum ada percobaan Boss'}</p>
                `;

                const actions = el('div', { class: 'arena-actions' });
                const practiceBtn = el('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'Latih' });
                const bossBtn = el('button', { class: 'btn btn-accent btn-sm', type: 'button', text: 'Boss' });

                practiceBtn.addEventListener('click', () => {
                    if (!readiness.ready) {
                        showToast(`Terkunci. ${readiness.reason}`, 'warning');
                        return;
                    }
                    this.onStart({ mode: 'latih', subtopicId: subtopic.id, count: 10 });
                });

                bossBtn.addEventListener('click', () => {
                    if (!readiness.ready) {
                        showToast(`Terkunci. ${readiness.reason}`, 'warning');
                        return;
                    }
                    this.onStart({ mode: 'boss', subtopicId: subtopic.id });
                });

                actions.appendChild(practiceBtn);
                actions.appendChild(bossBtn);
                card.appendChild(actions);
                grid.appendChild(card);
            }

            section.appendChild(grid);
            wrapper.appendChild(section);
        }

        this.host.appendChild(wrapper);
    }
}
