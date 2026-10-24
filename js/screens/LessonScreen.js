import { CURRICULUM } from '../../data/curriculum.js';
import { LESSONS, getLesson } from '../../data/lessons.js';
import { masteryService } from '../core/MasteryService.js';
import { questionEngine } from '../core/QuestionEngine.js';
import { el, escapeHtml, showToast } from '../ui/dom.js';

const STATUS_TEXT = {
    locked: 'Terkunci',
    building: 'Sedang belajar',
    mastered: 'Dikuasai',
    strong: 'Kuat'
};

export class LessonScreen {
    constructor(host, { onPractice, onNavigate }) {
        this.host = host;
        this.onPractice = onPractice;
        this.onNavigate = onNavigate;
    }

    render(selectedId = null) {
        this.host.innerHTML = '';
        this.host.hidden = false;

        if (selectedId) {
            this._renderLesson(selectedId);
            return;
        }

        const wrapper = el('div', { class: 'screen-scroll' });
        wrapper.appendChild(el('div', { class: 'screen-head' }, [
            el('h2', { text: 'Perpustakaan' }),
            el('p', { class: 'screen-sub', text: 'Setiap subtopik punya pelajaran singkat (≤ 4 menit): konsep, contoh dikerjakan, lalu latihan.' })
        ]));

        for (const domain of CURRICULUM.domains) {
            const progress = masteryService.getDomainProgress(domain.id);
            const section = el('section', { class: 'lesson-domain' });

            section.appendChild(el('div', { class: 'domain-head' }, [
                el('span', { class: 'domain-icon', text: domain.icon }),
                el('div', {}, [
                    el('h3', { text: domain.name }),
                    el('span', { class: 'domain-progress-text', text: `${progress.mastered}/${progress.total} subtopik dikuasai` })
                ])
            ]));

            const grid = el('div', { class: 'lesson-grid' });
            for (const subtopic of domain.subtopics) {
                const mastery = masteryService.getMasteryState(subtopic.id);
                const readiness = masteryService.getSubtopicReadiness(subtopic.id);
                const lesson = getLesson(subtopic.id);

                const card = el('button', {
                    class: `lesson-card ${mastery.status || 'locked'}`,
                    type: 'button',
                    'aria-label': `${subtopic.name}. ${STATUS_TEXT[mastery.status || 'locked']}`
                });

                card.innerHTML = `
                    <span class="lesson-card-badge">${subtopic.id}</span>
                    <span class="lesson-card-title">${escapeHtml(subtopic.name)}</span>
                    <span class="lesson-card-meta">
                        ${lesson ? `${lesson.duration} · 3 level` : 'Materi segera hadir'}
                    </span>
                    <span class="status-badge status-${mastery.status || 'locked'}">${STATUS_TEXT[mastery.status || 'locked']}</span>
                `;

                if (!lesson) {
                    card.disabled = true;
                } else if (!readiness.ready) {
                    card.addEventListener('click', () => {
                        showToast(`Terkunci. ${readiness.reason}`, 'warning');
                    });
                } else {
                    card.addEventListener('click', () => this.render(subtopic.id));
                }

                grid.appendChild(card);
            }

            section.appendChild(grid);
            wrapper.appendChild(section);
        }

        this.host.appendChild(wrapper);
    }

    _renderLesson(subtopicId) {
        const lesson = LESSONS[subtopicId];
        const subtopic = CURRICULUM.getSubtopic(subtopicId);
        if (!lesson || !subtopic) {
            this.render();
            return;
        }

        const mastery = masteryService.getMasteryState(subtopicId);
        const wrapper = el('div', { class: 'screen-scroll' });

        const head = el('div', { class: 'screen-head' });
        const back = el('button', { class: 'btn btn-ghost', type: 'button', text: '← Kembali ke Perpustakaan' });
        back.addEventListener('click', () => this.render());
        head.appendChild(back);
        head.appendChild(el('h2', { text: lesson.title }));
        head.appendChild(el('p', { class: 'screen-sub', text: `${subtopic.id} · ${lesson.duration} · Status: ${STATUS_TEXT[mastery.status || 'locked']}` }));
        wrapper.appendChild(head);

        const concept = el('section', { class: 'lesson-block' });
        concept.innerHTML = `
            <h3>Konsep</h3>
            <p>${escapeHtml(lesson.concept)}</p>
        `;
        wrapper.appendChild(concept);

        const worked = el('section', { class: 'lesson-block worked' });
        worked.innerHTML = `
            <h3>Contoh dikerjakan</h3>
            <p class="worked-problem">${escapeHtml(lesson.worked.problem)}</p>
            <ol class="worked-steps">
                ${lesson.worked.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}
            </ol>
        `;
        wrapper.appendChild(worked);

        const tips = el('section', { class: 'lesson-block tips' });
        tips.innerHTML = `
            <h3>Ingat</h3>
            <ul>${lesson.tips.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
        `;
        wrapper.appendChild(tips);

        const actions = el('section', { class: 'lesson-actions' });
        const tryOne = el('button', { class: 'btn btn-secondary', type: 'button', text: 'Coba 2 soal contoh' });
        const practice = el('button', { class: 'btn btn-primary', type: 'button', text: 'Latihan 10 soal' });
        const boss = el('button', { class: 'btn btn-accent', type: 'button', text: 'Boss penguasaan (8 soal)' });

        tryOne.addEventListener('click', () => this.onPractice({ subtopicId, mode: 'faded', count: 2 }));
        practice.addEventListener('click', () => this.onPractice({ subtopicId, mode: 'latih', count: 10 }));
        boss.addEventListener('click', () => this.onPractice({ subtopicId, mode: 'boss' }));

        actions.appendChild(tryOne);
        actions.appendChild(practice);
        actions.appendChild(boss);
        wrapper.appendChild(actions);

        let previewHtml = '';
        try {
            const templates = ['L1', 'L2', 'L3'].map(level => {
                const sample = questionEngine.generateQuestion(subtopicId, level);
                return `<li><span class="level-pill level-${level}">${level}</span> ${escapeHtml(sample.stem)}</li>`;
            }).join('');
            previewHtml = `<h3>Contoh tipe soal</h3><ul class="preview-list">${templates}</ul>`;
        } catch {
            previewHtml = '<p class="screen-sub">Contoh soal tidak dapat dimuat saat ini.</p>';
        }
        const preview = el('section', { class: 'lesson-block' });
        preview.innerHTML = previewHtml;
        wrapper.appendChild(preview);

        this.host.appendChild(wrapper);
    }
}
