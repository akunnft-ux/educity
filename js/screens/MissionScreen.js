import { CURRICULUM } from '../../data/curriculum.js';
import { masteryService } from '../core/MasteryService.js';
import { gameState } from '../core/GameState.js';
import { todayKey } from '../core/Storage.js';
import { el, showToast } from '../ui/dom.js';

const SLOT_DEFS = [
    { key: 'new', title: 'Lanjutkan materi baru', desc: 'Selesaikan satu sesi latihan pada subtopik yang sedang dipelajari.' },
    { key: 'review', title: 'Ulang dari antrean retensi', desc: 'Kerjakan soal yang sudah jatuh tempo (H+1/3/7/21) atau Buku Kesalahan.' },
    { key: 'hots', title: 'Tantangan HOTS', desc: 'Kerjakan soal penalaran (L3) minimal 3 soal.' }
];

export class MissionScreen {
    constructor(host, { onPractice, onNavigate }) {
        this.host = host;
        this.onPractice = onPractice;
        this.onNavigate = onNavigate;
    }

    _ensureToday() {
        const missions = gameState.getDailyMissions() || {};
        const today = todayKey();
        if (missions.date === today && Array.isArray(missions.slots) && missions.slots.length === 3) {
            return missions;
        }
        const fresh = {
            date: today,
            slots: SLOT_DEFS.map(def => ({ key: def.key, done: false })),
            completed: 0,
            claimed: false
        };
        gameState.setDailyMissions(fresh);
        return fresh;
    }

    render() {
        this.host.innerHTML = '';
        this.host.hidden = false;

        const missions = this._ensureToday();
        const progress = gameState.getProgress();
        const due = masteryService.getDueReviews();
        const mistakes = gameState.getMistakeBook();

        const wrapper = el('div', { class: 'screen-scroll' });
        const head = el('div', { class: 'screen-head' });
        head.innerHTML = `
            <h2>Misi Harian</h2>
            <p class="screen-sub">Tiga slot singkat, total 15–25 menit. Selesaikan ketiganya untuk bonus streak.</p>
        `;
        wrapper.appendChild(head);

        const summary = el('div', { class: 'mission-summary' });
        const doneCount = missions.slots.filter(s => s.done).length;
        summary.innerHTML = `
            <div class="mission-ring" role="img" aria-label="${doneCount} dari 3 misi selesai">
                <svg viewBox="0 0 44 44" width="72" height="72" aria-hidden="true">
                    <circle cx="22" cy="22" r="18" fill="none" stroke="#E0EBD8" stroke-width="6"></circle>
                    <circle cx="22" cy="22" r="18" fill="none" stroke="#2E7D32" stroke-width="6"
                        stroke-dasharray="${(doneCount / 3) * 113} 113" stroke-linecap="round"
                        transform="rotate(-90 22 22)"></circle>
                </svg>
                <span>${doneCount}/3</span>
            </div>
            <div class="mission-summary-text">
                <strong>Streak ${progress?.streak || 0} hari</strong>
                <span>Level ${Math.floor((progress?.xp || 0) / 100) + 1} · ${progress?.coins || 0} koin</span>
            </div>
        `;
        wrapper.appendChild(summary);

        const list = el('div', { class: 'mission-list' });

        for (const def of SLOT_DEFS) {
            const slot = missions.slots.find(s => s.key === def.key);
            const card = el('div', { class: `mission-card${slot?.done ? ' done' : ''}` });
            card.innerHTML = `
                <div class="mission-check" aria-hidden="true">${slot?.done ? '✓' : ''}</div>
                <div class="mission-info">
                    <h3>${def.title}</h3>
                    <p>${def.desc}</p>
                </div>
            `;

            const btn = el('button', { class: 'btn btn-primary btn-sm', type: 'button', text: slot?.done ? 'Selesai' : 'Mulai' });
            btn.disabled = Boolean(slot?.done);

            btn.addEventListener('click', () => {
                if (def.key === 'new') this._startNew();
                else if (def.key === 'review') this._startReview(due, mistakes);
                else this._startHots();
            });

            card.appendChild(btn);
            list.appendChild(card);
        }

        wrapper.appendChild(list);

        if (doneCount === 3 && !missions.claimed) {
            const claim = el('button', { class: 'btn btn-accent btn-block', type: 'button', text: 'Klaim bonus misi (50 koin)' });
            claim.addEventListener('click', () => {
                gameState.update('progress.coins', c => (c || 0) + 50);
                gameState.set('dailyMissions.claimed', true);
                showToast('Bonus 50 koin diterima!', 'success');
                this.render();
            });
            wrapper.appendChild(claim);
        }

        const goMap = el('button', { class: 'btn btn-secondary btn-block', type: 'button', text: 'Kembali ke peta kota' });
        goMap.addEventListener('click', () => this.onNavigate('map'));
        wrapper.appendChild(goMap);

        this.host.appendChild(wrapper);
    }

    completeSlot(key) {
        const missions = this._ensureToday();
        const slot = missions.slots.find(s => s.key === key);
        if (!slot || slot.done) return;

        slot.done = true;
        const completed = missions.slots.filter(s => s.done).length;
        gameState.set('dailyMissions.slots', missions.slots);
        gameState.set('dailyMissions.completed', completed);
        gameState.touchStreak();
    }

    _startNew() {
        const next = CURRICULUM.getAllSubtopics().find(s => {
            const status = masteryService.getMasteryState(s.id).status;
            return masteryService.getSubtopicReadiness(s.id).ready && (status === 'locked' || status === 'building');
        });

        if (!next) {
            showToast('Semua subtopik sudah dikuasai. Coba tryout atau pengulangan.', 'info');
            this.onNavigate('tryout');
            return;
        }

        this.onPractice({ mode: 'latih', subtopicId: next.id, count: 10, mission: 'new' });
    }

    _startReview(due, mistakes) {
        if (due.length > 0) {
            this.onPractice({ mode: 'review', subtopicId: due[0].subtopic, interval: due[0].interval, count: 5, mission: 'review' });
            return;
        }
        if (mistakes.length > 0) {
            this.onPractice({ mode: 'mistakes', count: Math.min(10, mistakes.length), mission: 'review' });
            return;
        }
        showToast('Belum ada antrean ulang. Kerjakan latihan baru dulu.', 'info');
    }

    _startHots() {
        const all = CURRICULUM.getAllSubtopics();
        const active = all.filter(s => {
            const st = masteryService.getMasteryState(s.id).status;
            return st === 'building' || st === 'mastered' || st === 'strong';
        });
        const pool = active.length ? active : all.filter(s => s.prerequisites.length === 0);
        const subtopic = pool[Math.floor(Math.random() * pool.length)];
        this.onPractice({ mode: 'latih', subtopicId: subtopic.id, count: 5, hots: true, mission: 'hots' });
    }
}
