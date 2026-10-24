import { gameState } from '../core/GameState.js';
import { el, escapeHtml, confirmDialog } from '../ui/dom.js';

export class MistakeScreen {
    constructor(host, { onPractice }) {
        this.host = host;
        this.onPractice = onPractice;
    }

    render() {
        this.host.innerHTML = '';
        this.host.hidden = false;

        const book = gameState.getMistakeBook();
        const wrapper = el('div', { class: 'screen-scroll' });

        const head = el('div', { class: 'screen-head' });
        head.innerHTML = `
            <h2>Buku Kesalahan</h2>
            <p class="screen-sub">Soal yang salah beserta miskonsepsinya. Sebuah soal keluar dari buku ini setelah kamu menjawabnya benar dua kali di hari berbeda.</p>
        `;
        wrapper.appendChild(head);

        if (book.length === 0) {
            const empty = el('div', { class: 'empty-state' });
            empty.innerHTML = `
                <div class="empty-icon" aria-hidden="true">📕</div>
                <p>Belum ada kesalahan tercatat. Terus latihan supaya buku ini tetap kosong.</p>
            `;
            wrapper.appendChild(empty);
            this.host.appendChild(wrapper);
            return;
        }

        const actions = el('div', { class: 'quick-actions' });
        const practiceAll = el('button', { class: 'btn btn-primary', type: 'button', text: `Latih ${Math.min(book.length, 10)} soal dari buku` });
        practiceAll.addEventListener('click', () => this.onPractice({ mode: 'mistakes', count: Math.min(book.length, 10) }));
        actions.appendChild(practiceAll);
        wrapper.appendChild(actions);

        const list = el('div', { class: 'mistake-list' });
        book.forEach((entry, index) => {
            const resolved = (entry.resolvedDates || []).length;
            const item = el('article', { class: 'mistake-card' });
            item.innerHTML = `
                <div class="mistake-head">
                    <span class="mistake-topic">${escapeHtml(entry.subtopicName || entry.subtopic || 'Soal')}</span>
                    <span class="mistake-meta">Salah ${entry.timesWrong || 1}× · Benar ${resolved}/2</span>
                </div>
                <p class="mistake-stem">${escapeHtml(entry.stem || '')}</p>
                <p class="mistake-explanation">${escapeHtml(entry.explanation || '')}</p>
                ${entry.misconceptionTag ? `<p class="mistake-tag">Miskonsepsi: ${escapeHtml((entry.misconceptionTag || '').replace(/_/g, ' '))}</p>` : ''}
                <div class="mistake-actions">
                    <button class="btn btn-secondary btn-sm" type="button" data-action="practice">Latih subtopik</button>
                    <button class="btn btn-ghost btn-sm" type="button" data-action="remove">Hapus</button>
                </div>
            `;

            item.querySelector('[data-action="practice"]').addEventListener('click', () => {
                this.onPractice({ mode: 'latih', subtopicId: entry.subtopic, count: 10 });
            });

            item.querySelector('[data-action="remove"]').addEventListener('click', () => {
                confirmDialog({
                    title: 'Hapus dari buku?',
                    message: 'Catatan kesalahan ini akan dihapus dari buku kesalahan.',
                    confirmText: 'Hapus',
                    danger: true
                }).then(yes => {
                    if (!yes) return;
                    gameState.removeMistake(index);
                    this.render();
                });
            });

            list.appendChild(item);
        });

        wrapper.appendChild(list);
        this.host.appendChild(wrapper);
    }
}
