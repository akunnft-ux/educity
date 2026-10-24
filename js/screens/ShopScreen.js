import { gameState } from '../core/GameState.js';
import { el, escapeHtml, showToast } from '../ui/dom.js';
import { audioService } from '../core/AudioService.js';

const SHOP_ITEMS = [
    { id: 'knight', type: 'avatars', name: 'Avatar Ksatria', price: 100, icon: '🛡️' },
    { id: 'rider', type: 'avatars', name: 'Avatar Penjelajah', price: 150, icon: '🧭' },
    { id: 'scholar', type: 'avatars', name: 'Avatar Cendekia', price: 200, icon: '🎓' },
    { id: 'tree', type: 'decorations', name: 'Hiasan Pohon', price: 80, icon: '🌳' },
    { id: 'bench', type: 'decorations', name: 'Hiasan Bangku', price: 60, icon: '🪑' },
    { id: 'fountain', type: 'decorations', name: 'Air Mancur', price: 250, icon: '⛲' }
];

export class ShopScreen {
    constructor(host) {
        this.host = host;
    }

    render() {
        this.host.innerHTML = '';
        this.host.hidden = false;

        const wrapper = el('div', { class: 'screen-scroll' });
        const head = el('div', { class: 'screen-head' });
        head.innerHTML = `
            <h2>Toko</h2>
            <p class="screen-sub">Tukar koin dengan kosmetik. Kosmetik tidak memengaruhi soal atau penguasaan. Tidak ada pembelian uang nyata.</p>
        `;
        wrapper.appendChild(head);

        const coins = gameState.getProgress()?.coins || 0;
        const balance = el('div', { class: 'coin-balance' });
        balance.innerHTML = `<span aria-hidden="true">🪙</span> <strong>${coins}</strong> koin`;
        wrapper.appendChild(balance);

        const grid = el('div', { class: 'shop-grid' });
        const inventory = gameState.getInventory();

        for (const item of SHOP_ITEMS) {
            const owned = (inventory[item.type] || []).includes(item.id);
            const card = el('div', { class: `shop-item${owned ? ' owned' : ''}` });
            card.innerHTML = `
                <div class="shop-item-icon" aria-hidden="true">${item.icon}</div>
                <div class="shop-item-name">${escapeHtml(item.name)}</div>
                <div class="shop-item-price">🪙 ${item.price}</div>
            `;

            const btn = el('button', {
                class: `btn ${owned ? 'btn-secondary' : 'btn-primary'} btn-sm btn-block`,
                type: 'button',
                text: owned ? 'Sudah dimiliki' : 'Beli'
            });
            btn.disabled = owned || coins < item.price;

            btn.addEventListener('click', () => {
                const current = gameState.getProgress()?.coins || 0;
                if (current < item.price) {
                    showToast('Koin belum cukup. Latihan lagi untuk mendapat koin.', 'warning');
                    return;
                }
                gameState.update('progress.coins', c => c - item.price);
                gameState.addToInventory(item.type, item.id);
                audioService.sfx('sfx_coin', { volume: 0.5 });
                showToast(`${item.name} berhasil dibeli!`, 'success');
                this.render();
            });

            card.appendChild(btn);
            grid.appendChild(card);
        }

        wrapper.appendChild(grid);

        const avatars = inventory.avatars || [];
        if (avatars.length > 1) {
            const equip = el('section', { class: 'panel' });
            equip.innerHTML = `<div class="panel-header"><h3>Gunakan avatar</h3></div>`;
            const body = el('div', { class: 'panel-body avatar-row' });
            for (const avatar of avatars) {
                const btn = el('button', {
                    class: `btn ${inventory.currentAvatar === avatar ? 'btn-primary' : 'btn-secondary'} btn-sm`,
                    type: 'button',
                    text: avatar
                });
                btn.addEventListener('click', () => {
                    gameState.setCurrentAvatar(avatar);
                    showToast('Avatar diperbarui', 'success');
                    this.render();
                });
                body.appendChild(btn);
            }
            equip.appendChild(body);
            wrapper.appendChild(equip);
        }

        this.host.appendChild(wrapper);
    }
}
