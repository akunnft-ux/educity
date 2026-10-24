import { CURRICULUM } from '../../data/curriculum.js';
import { masteryService } from '../core/MasteryService.js';
import { gameState } from '../core/GameState.js';
import { el, escapeHtml, formatDate, showToast } from '../ui/dom.js';

const STATUS_TEXT = {
    locked: 'Terkunci',
    building: 'Sedang belajar',
    mastered: 'Dikuasai',
    strong: 'Kuat'
};

export class DashboardScreen {
    constructor(host, { onStart, onNavigate }) {
        this.host = host;
        this.onStart = onStart;
        this.onNavigate = onNavigate;
    }

    render(tab = 'student') {
        this.host.innerHTML = '';
        this.host.hidden = false;

        const wrapper = el('div', { class: 'screen-scroll' });
        const profile = gameState.getProfile() || {};
        const overall = masteryService.getOverallProgress();
        const estimate = masteryService.estimateScore();
        const stats = gameState.getStatistics();

        const head = el('div', { class: 'profile-hero' });
        head.innerHTML = `
            <div class="profile-avatar" aria-hidden="true">${escapeHtml((profile.studentName || '?').charAt(0).toUpperCase())}</div>
            <div class="profile-hero-info">
                <h2>${escapeHtml(profile.studentName || 'Siswa')}</h2>
                <p>Kelas ${escapeHtml(profile.classCode || '-')} · Level ${Math.floor((gameState.getProgress()?.xp || 0) / 100) + 1}</p>
                <p class="profile-streak">🔥 Streak ${gameState.getProgress()?.streak || 0} hari</p>
            </div>
        `;
        wrapper.appendChild(head);

        const tabs = el('div', { class: 'tab-row', role: 'tablist' });
        for (const [key, label] of [['student', 'Siswa'], ['parent', 'Orang Tua'], ['teacher', 'Guru']]) {
            const btn = el('button', {
                class: `tab-btn${tab === key ? ' active' : ''}`,
                type: 'button',
                role: 'tab',
                'aria-selected': String(tab === key),
                text: label
            });
            btn.addEventListener('click', () => this.render(key));
            tabs.appendChild(btn);
        }
        wrapper.appendChild(tabs);

        if (tab === 'student') wrapper.appendChild(this._studentTab(overall, estimate, stats));
        if (tab === 'parent') wrapper.appendChild(this._parentTab(overall, estimate, stats));
        if (tab === 'teacher') wrapper.appendChild(this._teacherTab());

        this.host.appendChild(wrapper);
    }

    _studentTab(overall, estimate, stats) {
        const frag = document.createDocumentFragment();

        const cards = el('div', { class: 'stat-grid' });
        cards.innerHTML = `
            <div class="stat-card"><span class="stat-value">${overall.mastered}/${overall.total}</span><span class="stat-label">Subtopik dikuasai</span></div>
            <div class="stat-card"><span class="stat-value">${Math.round(overall.percentage)}%</span><span class="stat-label">Progres kurikulum</span></div>
            <div class="stat-card"><span class="stat-value">${stats.totalQuestionsAnswered || 0}</span><span class="stat-label">Soal dikerjakan</span></div>
            <div class="stat-card"><span class="stat-value">${stats.totalQuestionsAnswered ? Math.round((stats.totalCorrect / stats.totalQuestionsAnswered) * 100) : 0}%</span><span class="stat-label">Akurasi total</span></div>
        `;
        frag.appendChild(cards);

        const estimateCard = el('section', { class: 'panel' });
        estimateCard.innerHTML = `
            <div class="panel-header"><h3>Estimasi skor TKA</h3></div>
            <div class="panel-body">
                ${estimate.available
                    ? `<p class="estimate-range">${estimate.min}–${estimate.max}</p>
                       <p class="estimate-note">Perkiraan (bukan jaminan). Keyakinan ${estimate.confidence}% berdasarkan ${overall.mastered} subtopik dikuasai dan tryout terakhir.</p>`
                    : `<p class="estimate-note">Estimasi muncul setelah kamu menyelesaikan minimal satu tryout penuh. Saat ini cakupan penguasaan ${estimate.confidence}%.</p>`}
            </div>
        `;
        frag.appendChild(estimateCard);

        const heat = el('section', { class: 'panel' });
        heat.innerHTML = `<div class="panel-header"><h3>Peta penguasaan</h3></div>`;
        const heatBody = el('div', { class: 'panel-body' });
        const grid = el('div', { class: 'heatmap' });
        for (const s of CURRICULUM.getAllSubtopics()) {
            const m = masteryService.getMasteryState(s.id);
            const cell = el('button', {
                class: `heatmap-cell ${m.status || 'locked'}`,
                type: 'button',
                title: `${s.id} ${s.name}: ${STATUS_TEXT[m.status || 'locked']}`,
                'aria-label': `${s.name}: ${STATUS_TEXT[m.status || 'locked']}`
            });
            cell.textContent = s.id;
            cell.addEventListener('click', () => {
                const readiness = masteryService.getSubtopicReadiness(s.id);
                if (!readiness.ready) {
                    showToast(`Terkunci. ${readiness.reason}`, 'warning');
                    return;
                }
                this.onStart({ mode: 'latih', subtopicId: s.id, count: 10 });
            });
            grid.appendChild(cell);
        }
        heatBody.appendChild(grid);
        heatBody.appendChild(el('div', { class: 'heatmap-legend', html: `
            <span><i class="legend-swatch locked"></i>Terkunci</span>
            <span><i class="legend-swatch building"></i>Sedang belajar</span>
            <span><i class="legend-swatch mastered"></i>Dikuasai</span>
            <span><i class="legend-swatch strong"></i>Kuat</span>
        ` }));
        heat.appendChild(heatBody);
        frag.appendChild(heat);

        const actions = el('section', { class: 'quick-actions' });
        const reviewBtn = el('button', { class: 'btn btn-primary', type: 'button', text: 'Mulai Misi Harian' });
        reviewBtn.addEventListener('click', () => this.onNavigate('missions'));
        const mistakeBtn = el('button', { class: 'btn btn-secondary', type: 'button', text: 'Buku Kesalahan' });
        mistakeBtn.addEventListener('click', () => this.onNavigate('mistakes'));
        const tryoutBtn = el('button', { class: 'btn btn-secondary', type: 'button', text: 'Tryout CBT' });
        tryoutBtn.addEventListener('click', () => this.onNavigate('tryout'));
        actions.appendChild(reviewBtn);
        actions.appendChild(mistakeBtn);
        actions.appendChild(tryoutBtn);
        frag.appendChild(actions);

        return frag;
    }

    _parentTab(overall, estimate, stats) {
        const frag = document.createDocumentFragment();
        const suggestions = masteryService.getStudyPlan();
        const minutes = Math.round((stats.totalTimeSpent || 0) / 60000);

        const summary = el('section', { class: 'panel' });
        summary.innerHTML = `
            <div class="panel-header"><h3>Ringkasan untuk orang tua</h3></div>
            <div class="panel-body">
                <p class="parent-line">Waktu belajar total: <strong>${minutes} menit</strong> dalam ${stats.sessions || 0} sesi.</p>
                <p class="parent-line">Soal dikerjakan: <strong>${stats.totalQuestionsAnswered || 0}</strong>, benar <strong>${stats.totalCorrect || 0}</strong>.</p>
                <p class="parent-line">Subtopik dikuasai: <strong>${overall.mastered} dari ${overall.total}</strong> (${Math.round(overall.percentage)}%).</p>
                <p class="parent-line">Estimasi skor TKA: <strong>${estimate.available ? `${estimate.min}–${estimate.max}` : 'belum tersedia'}</strong> ${estimate.available ? '(perkiraan, bukan jaminan)' : ''}.</p>
            </div>
        `;
        frag.appendChild(summary);

        const plan = el('section', { class: 'panel' });
        plan.innerHTML = `<div class="panel-header"><h3>3 saran tindakan</h3></div>`;
        const list = el('ol', { class: 'suggestion-list' });
        suggestions.forEach(s => list.appendChild(el('li', { text: s })));
        const body = el('div', { class: 'panel-body' });
        body.appendChild(list);
        plan.appendChild(body);
        frag.appendChild(plan);

        const privacy = el('section', { class: 'panel privacy-panel' });
        privacy.innerHTML = `
            <div class="panel-header"><h3>Privasi data anak</h3></div>
            <div class="panel-body">
                <p class="parent-line">Data hanya tersimpan di perangkat ini, tanpa iklan dan tanpa pelacak pihak ketiga. Anda dapat mengekspor atau menghapus seluruh data kapan saja dari menu Pengaturan.</p>
            </div>
        `;
        frag.appendChild(privacy);

        return frag;
    }

    _teacherTab() {
        const frag = document.createDocumentFragment();
        const mistakes = gameState.getMistakeBook();

        const counts = {};
        for (const m of mistakes) {
            const tag = m.misconceptionTag || 'computation_error';
            counts[tag] = (counts[tag] || 0) + 1;
        }
        const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);

        const panel = el('section', { class: 'panel' });
        panel.innerHTML = `<div class="panel-header"><h3>Peta miskonsepsi</h3></div>`;

        const body = el('div', { class: 'panel-body' });
        if (rows.length === 0) {
            body.innerHTML = '<p class="parent-line">Belum ada data miskonsepsi. Data muncul setelah siswa mengerjakan latihan.</p>';
        } else {
            const max = rows[0][1];
            const bars = el('div', { class: 'misconception-bars' });
            for (const [tag, count] of rows.slice(0, 10)) {
                const label = (tag || '').replace(/_/g, ' ');
                const row = el('div', { class: 'misconception-row' });
                row.innerHTML = `
                    <span class="misconception-label">${escapeHtml(label)}</span>
                    <div class="misconception-track"><div class="misconception-fill" style="width:${Math.round((count / max) * 100)}%"></div></div>
                    <span class="misconception-count">${count}</span>
                `;
                bars.appendChild(row);
            }
            body.appendChild(bars);
        }

        const exportBtn = el('button', { class: 'btn btn-secondary', type: 'button', text: 'Ekspor CSV miskonsepsi' });
        exportBtn.addEventListener('click', () => this._exportCsv(mistakes));
        body.appendChild(exportBtn);

        panel.appendChild(body);
        frag.appendChild(panel);
        return frag;
    }

    _exportCsv(mistakes) {
        const header = ['subtopik', 'miskonsepsi', 'jumlah_salah', 'terakhir_salah'];
        const lines = [header.join(',')];
        for (const m of mistakes) {
            lines.push([
                `"${(m.subtopicName || m.subtopic || '').replace(/"/g, '""')}"`,
                `"${(m.misconceptionTag || '').replace(/"/g, '""')}"`,
                m.timesWrong || 1,
                formatDate(m.lastWrong || m.addedDate)
            ].join(','));
        }
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `educity-miskonsepsi-${Date.now()}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast('CSV diunduh', 'success');
    }
}
