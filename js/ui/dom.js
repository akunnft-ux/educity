export function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (value === null || value === undefined || value === false) continue;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key === 'html') node.innerHTML = value;
        else if (key.startsWith('on') && typeof value === 'function') {
            node.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (key === 'dataset') {
            Object.assign(node.dataset, value);
        } else {
            node.setAttribute(key, String(value));
        }
    }
    const list = Array.isArray(children) ? children : [children];
    for (const child of list) {
        if (child === null || child === undefined) continue;
        node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
}

export function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function showToast(message, type = 'info', timeout = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = el('div', { class: `toast toast-${type}`, role: 'status' });
    const icons = { success: '✓', error: '✕', warning: '!', info: 'i' };
    toast.innerHTML = `
        <span class="toast-icon" aria-hidden="true">${icons[type] || 'i'}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
        <button class="toast-close" aria-label="Tutup notifikasi" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;
    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
    container.appendChild(toast);

    while (container.children.length > 3) container.firstElementChild.remove();

    setTimeout(() => toast.remove(), timeout);
    return toast;
}

let lastFocused = null;

export function openModal({ title, body, footer, size = 'md', onClose = null, dismissible = true }) {
    const container = document.getElementById('modal-container');
    if (!container) return null;

    lastFocused = document.activeElement;
    container.hidden = false;
    container.innerHTML = '';

    const backdrop = el('div', { class: 'modal-backdrop' });
    const modal = el('div', { class: `modal modal-${size}`, role: 'document' });

    const header = el('div', { class: 'modal-header' });
    header.appendChild(el('h3', { text: title }));
    const closeBtn = el('button', { class: 'modal-close', 'aria-label': 'Tutup', type: 'button', html: '&times;' });
    header.appendChild(closeBtn);

    const bodyEl = el('div', { class: 'modal-body' });
    if (typeof body === 'string') bodyEl.innerHTML = body;
    else if (body) bodyEl.appendChild(body);

    modal.appendChild(header);
    modal.appendChild(bodyEl);

    let footerEl = null;
    if (footer) {
        footerEl = el('div', { class: 'modal-footer' });
        if (typeof footer === 'string') footerEl.innerHTML = footer;
        else footerEl.appendChild(footer);
        modal.appendChild(footerEl);
    }

    container.appendChild(backdrop);
    container.appendChild(modal);

    const close = () => {
        container.hidden = true;
        container.innerHTML = '';
        document.removeEventListener('keydown', onKey);
        if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
        if (typeof onClose === 'function') onClose();
    };

    const onKey = (e) => {
        if (e.key === 'Escape' && dismissible) close();
        if (e.key === 'Tab') trapFocus(e, modal);
    };

    closeBtn.addEventListener('click', close);
    if (dismissible) backdrop.addEventListener('click', close);
    document.addEventListener('keydown', onKey);

    const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) focusable.focus();

    return { close, modal, body: bodyEl, footer: footerEl };
}

function trapFocus(e, modal) {
    const focusables = [...modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter(node => !node.disabled && node.offsetParent !== null);
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
}

export function confirmDialog({ title, message, confirmText = 'Ya', cancelText = 'Batal' }) {
    return new Promise((resolve) => {
        const footer = el('div', { class: 'modal-footer-actions' });
        const cancel = el('button', { class: 'btn btn-secondary', type: 'button', text: cancelText });
        const ok = el('button', { class: 'btn btn-primary', type: 'button', text: confirmText });
        footer.appendChild(cancel);
        footer.appendChild(ok);

        const modal = openModal({
            title,
            body: `<p class="modal-text">${escapeHtml(message)}</p>`,
            footer,
            size: 'sm',
            onClose: () => resolve(false)
        });

        ok.addEventListener('click', () => {
            resolve(true);
            modal.close();
        });
        cancel.addEventListener('click', () => {
            resolve(false);
            modal.close();
        });
    });
}

export function formatDuration(ms) {
    const totalSeconds = Math.round(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    if (m === 0) return `${s} detik`;
    return `${m} menit${s > 0 ? ` ${s} detik` : ''}`;
}

export function formatDate(ts) {
    try {
        return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return '-';
    }
}
