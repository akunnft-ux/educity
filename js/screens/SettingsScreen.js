import { gameState } from '../core/GameState.js';
import { audioService } from '../core/AudioService.js';
import { Storage } from '../core/Storage.js';
import { el, showToast, confirmDialog, openModal, formatDate, escapeHtml } from '../ui/dom.js';

export class SettingsScreen {
    constructor(host, { onLogout, onReload }) {
        this.host = host;
        this.onLogout = onLogout;
        this.onReload = onReload;
    }

    render() {
        this.host.innerHTML = '';
        this.host.hidden = false;

        const settings = gameState.getSettings() || {};
        const wrapper = el('div', { class: 'screen-scroll' });
        const head = el('div', { class: 'screen-head' });
        head.innerHTML = `
            <h2>Pengaturan</h2>
            <p class="screen-sub">Preferensi tampilan, suara, dan kontrol data pribadi.</p>
        `;
        wrapper.appendChild(head);

        const form = el('div', { class: 'settings-form' });

        form.appendChild(this._toggle('Suara efek', 'soundEnabled', settings.soundEnabled !== false));
        form.appendChild(this._toggle('Musik latar', 'musicEnabled', settings.musicEnabled !== false));
        form.appendChild(this._toggle('Kontras tinggi', 'highContrast', settings.highContrast === true));
        form.appendChild(this._toggle('Kurangi gerakan', 'reducedMotion', settings.reducedMotion === true));

        const fontGroup = el('div', { class: 'setting-row' });
        fontGroup.innerHTML = `
            <label for="setting-font">Ukuran teks</label>
            <select id="setting-font">
                <option value="normal" ${settings.fontSize !== 'large' ? 'selected' : ''}>Normal</option>
                <option value="large" ${settings.fontSize === 'large' ? 'selected' : ''}>Besar</option>
            </select>
        `;
        fontGroup.querySelector('#setting-font').addEventListener('change', (e) => {
            gameState.setSetting('fontSize', e.target.value);
            document.body.classList.toggle('font-large', e.target.value === 'large');
        });
        form.appendChild(fontGroup);

        wrapper.appendChild(form);

        const dataSection = el('section', { class: 'panel' });
        dataSection.innerHTML = `<div class="panel-header"><h3>Data & privasi</h3></div>`;
        const dataBody = el('div', { class: 'panel-body data-actions' });

        const exportBtn = el('button', { class: 'btn btn-secondary btn-block', type: 'button', text: 'Ekspor data (JSON)' });
        exportBtn.addEventListener('click', () => {
            const ok = Storage.exportData();
            showToast(ok ? 'Data diekspor' : 'Belum ada data untuk diekspor', ok ? 'success' : 'warning');
        });

        const importBtn = el('button', { class: 'btn btn-secondary btn-block', type: 'button', text: 'Impor data (JSON)' });
        importBtn.addEventListener('click', () => this._import());

        const deleteBtn = el('button', { class: 'btn btn-danger btn-block', type: 'button', text: 'Hapus semua data' });
        deleteBtn.addEventListener('click', () => {
            confirmDialog({
                title: 'Hapus semua data?',
                message: 'Seluruh profil, progres belajar, dan riwayat tryout di perangkat ini akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.',
                confirmText: 'Hapus permanen',
                cancelText: 'Batal',
                danger: true
            }).then(yes => {
                if (!yes) return;
                gameState.reset();
                showToast('Data dihapus', 'success');
                this.onLogout?.();
            });
        });

        const privacyBtn = el('button', { class: 'btn btn-ghost btn-block', type: 'button', text: 'Tentang privasi' });
        privacyBtn.addEventListener('click', () => {
            const footer = el('div', { class: 'modal-footer-actions' });
            const ok = el('button', { class: 'btn btn-primary btn-block', type: 'button', text: 'Mengerti' });
            footer.appendChild(ok);

            const modal = openModal({
                title: 'Privasi data anak',
                size: 'md',
                body: `
                    <div class="privacy-text">
                        <p>EduCity menyimpan data belajar <strong>hanya di perangkat ini</strong> (localStorage). Tidak ada server, iklan, atau pelacak pihak ketiga.</p>
                        <p>Data yang disimpan: nama panggilan, kode kelas, hasil latihan, dan riwayat tryout. PIN tidak disimpan.</p>
                        <p>Hak Anda: mengekspor seluruh data (JSON), menghapus seluruh data kapan saja, dan memakai game tanpa persetujuan penyimpanan.</p>
                        <p>Untuk anak di bawah umur, gunakan dengan pendampingan orang tua/wali sesuai UU Pelindungan Data Pribadi.</p>
                    </div>
                `,
                footer
            });

            ok.addEventListener('click', () => modal.close());
        });

        dataBody.appendChild(exportBtn);
        dataBody.appendChild(importBtn);
        dataBody.appendChild(deleteBtn);
        dataBody.appendChild(privacyBtn);
        dataSection.appendChild(dataBody);
        wrapper.appendChild(dataSection);

        const profile = gameState.getProfile();
        if (profile) {
            const account = el('section', { class: 'panel' });
            account.innerHTML = `
                <div class="panel-header"><h3>Akun lokal</h3></div>
                <div class="panel-body">
                    <p class="parent-line">Nama: <strong>${escapeHtml(profile.studentName || '-')}</strong></p>
                    <p class="parent-line">Kelas: <strong>${escapeHtml(profile.classCode || '-')}</strong></p>
                    <p class="parent-line">Dibuat: ${formatDate(profile.createdAt)}</p>
                </div>
            `;
            wrapper.appendChild(account);
        }

        this.host.appendChild(wrapper);
    }

    _toggle(label, key, checked) {
        const row = el('div', { class: 'setting-row' });
        row.innerHTML = `
            <label for="setting-${key}">${label}</label>
            <input type="checkbox" id="setting-${key}" ${checked ? 'checked' : ''} role="switch">
        `;
        row.querySelector('input').addEventListener('change', (e) => {
            gameState.setSetting(key, e.target.checked);
            this._applyGlobalSettings();
        });
        return row;
    }

    _applyGlobalSettings() {
        const settings = gameState.getSettings() || {};
        audioService.syncWithSettings();
        document.body.classList.toggle('high-contrast', settings.highContrast === true);
        document.body.classList.toggle('reduced-motion', settings.reducedMotion === true);
        document.body.classList.toggle('font-large', settings.fontSize === 'large');
    }

    _import() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.addEventListener('change', () => {
            const file = input.files?.[0];
            if (!file) return;
            Storage.importData(file)
                .then(() => {
                    showToast('Data diimpor. Memuat ulang...', 'success');
                    setTimeout(() => this.onReload?.(), 700);
                })
                .catch((err) => showToast(`Gagal impor: ${err.message}`, 'error'));
        });
        input.click();
    }
}
