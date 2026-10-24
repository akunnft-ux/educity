import { assetLoader } from './core/AssetLoader.js';
import { gameState } from './core/GameState.js';
import { Storage } from './core/Storage.js';
import { audioService } from './core/AudioService.js';
import { masteryService } from './core/MasteryService.js';
import { CityMapRenderer } from './scenes/CityMapScene.js';
import { CURRICULUM } from '../data/curriculum.js';
import { showToast, el, confirmDialog, openModal, escapeHtml } from './ui/dom.js';
import { LessonScreen } from './screens/LessonScreen.js';
import { ArenaScreen } from './screens/ArenaScreen.js';
import { PracticeSession } from './screens/PracticeSession.js';
import { TryoutScreen } from './screens/TryoutScreen.js';
import { DashboardScreen } from './screens/DashboardScreen.js';
import { MistakeScreen } from './screens/MistakeScreen.js';
import { ShopScreen } from './screens/ShopScreen.js';
import { MissionScreen } from './screens/MissionScreen.js';
import { SettingsScreen } from './screens/SettingsScreen.js';

const loadingScreen = document.getElementById('loading-screen');
const loginScreen = document.getElementById('login-screen');
const gameContainer = document.getElementById('game-container');
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');
const loadingProgress = document.getElementById('loading-progress');
const loginForm = document.getElementById('login-form');
const canvas = document.getElementById('game-canvas');
const uiOverlay = document.getElementById('ui-overlay');
const screenHost = document.getElementById('screen-host');
const sideMenu = document.getElementById('side-menu');

const NAV_SCREENS = ['map', 'lessons', 'arena', 'tryout', 'mistakes', 'shop', 'profile', 'missions', 'settings'];

let mapRenderer = null;
let practiceSession = null;
let lessonScreen = null;
let arenaScreen = null;
let tryoutScreen = null;
let dashboardScreen = null;
let mistakeScreen = null;
let shopScreen = null;
let missionScreen = null;
let settingsScreen = null;

let currentScreen = 'map';
let animFrameId = null;
let lastFrameTime = 0;
let booted = false;

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

function setLoading(percent, message) {
    if (loadingBar) loadingBar.style.width = `${percent}%`;
    if (loadingProgress) loadingProgress.setAttribute('aria-valuenow', String(percent));
    if (loadingText && message) loadingText.textContent = message;
}

function showLogin() {
    loginScreen.hidden = false;
    loginScreen.classList.add('active');
    const classInput = document.getElementById('class-code');
    if (classInput) setTimeout(() => classInput.focus(), 200);
}

function hideLogin() {
    loginScreen.classList.remove('active');
    loginScreen.hidden = true;
}

async function boot() {
    setLoading(5, 'Memuat aset...');

    let manifest;
    try {
        manifest = await assetLoader.fetchManifest();
    } catch (err) {
        console.error(err);
        setLoading(100, 'Gagal memuat aset. Periksa koneksi lalu muat ulang.');
        showToast('Aset gagal dimuat. Jalankan game lewat server lokal (bukan file://).', 'error', 8000);
        return;
    }

    await assetLoader.load(manifest, (pct) => setLoading(5 + Math.round(pct * 0.9), 'Memuat aset...'));
    setLoading(100, 'Siap!');

    await new Promise(resolve => setTimeout(resolve, 250));

    loadingScreen.hidden = true;
    loadingScreen.classList.remove('active');

    if (gameState.hasProfile() && gameState.getFlags()?.parentalConsent) {
        startGame();
    } else {
        showLogin();
    }

    booted = true;
}

function validateLogin(classCode, studentName, pin) {
    const errors = {};
    if (!classCode) errors.classCode = 'Kode kelas wajib diisi.';
    else if (!/^[A-Za-z0-9-]{1,12}$/.test(classCode)) errors.classCode = 'Gunakan huruf, angka, atau tanda hubung (maks 12).';

    if (!studentName) errors.studentName = 'Nama panggilan wajib diisi.';
    else if (studentName.length < 2) errors.studentName = 'Minimal 2 karakter.';
    else if (studentName.length > 20) errors.studentName = 'Maksimal 20 karakter.';

    if (!pin) errors.pin = 'PIN wajib diisi.';
    else if (!/^\d{4}$/.test(pin)) errors.pin = 'PIN harus 4 angka.';

    return errors;
}

function setupLogin() {
    const fields = {
        classCode: document.getElementById('class-code'),
        studentName: document.getElementById('student-name'),
        pin: document.getElementById('pin')
    };

    Object.entries(fields).forEach(([key, input]) => {
        input.addEventListener('input', () => {
            const errorEl = document.getElementById(`${key === 'classCode' ? 'class-code' : key === 'studentName' ? 'student-name' : 'pin'}-error`);
            if (errorEl) errorEl.textContent = '';
            input.removeAttribute('aria-invalid');
        });
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const classCode = fields.classCode.value.trim().toUpperCase();
        const studentName = fields.studentName.value.trim();
        const pin = fields.pin.value.trim();
        const consent = document.getElementById('parental-consent').checked;

        const errors = validateLogin(classCode, studentName, pin);

        const map = {
            classCode: 'class-code-error',
            studentName: 'student-name-error',
            pin: 'pin-error'
        };

        for (const [key, message] of Object.entries(errors)) {
            const elRef = document.getElementById(map[key]);
            if (elRef) elRef.textContent = message;
            fields[key].setAttribute('aria-invalid', 'true');
        }

        const consentError = document.getElementById('consent-error');
        if (!consent) {
            consentError.textContent = 'Persetujuan orang tua/wali diperlukan untuk menyimpan data.';
        } else {
            consentError.textContent = '';
        }

        if (Object.keys(errors).length > 0 || !consent) {
            const firstInvalid = loginForm.querySelector('[aria-invalid="true"]');
            if (firstInvalid) firstInvalid.focus();
            return;
        }

        const btn = document.getElementById('login-btn');
        btn.classList.add('loading');
        btn.disabled = true;

        setTimeout(() => {
            btn.classList.remove('loading');
            btn.disabled = false;

            gameState.setProfile({
                classCode,
                studentName,
                createdAt: Date.now(),
                avatar: 'default'
            });
            gameState.setFlag('parentalConsent', true);
            gameState.forceSave();

            hideLogin();
            startGame();
            showToast(`Selamat datang, ${studentName}!`, 'success');
        }, 500);
    });
}

function startGame() {
    gameContainer.hidden = false;
    audioService.unlock();
    gameContainer.classList.add('active');

    initScreens();
    setupHud();
    setupNavigation();
    setupSideMenu();
    setupKeyboard();

    applySettings();
    updateHud();

    showScreen('map');

    requestAnimationFrame(() => {
        initMap();
        if (!gameState.getFlags()?.diagnosticDone) {
            setTimeout(() => showWelcome(), 500);
        }
    });
}

function initScreens() {
    lessonScreen = new LessonScreen(screenHost, {
        onPractice: (config) => startPractice(config),
        onNavigate: (screen) => showScreen(screen)
    });

    arenaScreen = new ArenaScreen(screenHost, {
        onStart: (config) => startPractice(config)
    });

    tryoutScreen = new TryoutScreen(screenHost, {
        onExit: ({ refresh } = {}) => {
            if (refresh) updateHud();
        }
    });

    dashboardScreen = new DashboardScreen(screenHost, {
        onStart: (config) => startPractice(config),
        onNavigate: (screen) => showScreen(screen)
    });

    mistakeScreen = new MistakeScreen(screenHost, {
        onPractice: (config) => startPractice(config)
    });

    shopScreen = new ShopScreen(screenHost);
    missionScreen = new MissionScreen(screenHost, {
        onPractice: (config) => startPractice(config),
        onNavigate: (screen) => showScreen(screen)
    });
    settingsScreen = new SettingsScreen(screenHost, {
        onLogout: () => logout(),
        onReload: () => window.location.reload()
    });
}

function initMap() {
    const gameMain = document.querySelector('.game-main');
    const rect = gameMain?.getBoundingClientRect() ?? gameContainer.getBoundingClientRect();
    const width = Math.max(320, Math.round(rect.width));
    const height = Math.max(320, Math.round(rect.height));

    mapRenderer = new CityMapRenderer(canvas, gameState);
    mapRenderer.resize(width, height);
    mapRenderer.setViewport(width, height);
    mapRenderer.setReducedMotion(reducedMotionQuery.matches || gameState.getSettings()?.reducedMotion === true);

    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('mousemove', onCanvasMove);
    canvas.addEventListener('mouseleave', () => mapRenderer?.setHoveredBuilding(null));
    canvas.addEventListener('touchstart', onCanvasTouch, { passive: true });

    window.addEventListener('resize', onResize);
    reducedMotionQuery.addEventListener?.('change', (e) => {
        mapRenderer?.setReducedMotion(e.matches || gameState.getSettings()?.reducedMotion === true);
    });

    startMapLoop();
}

function onResize() {
    if (!mapRenderer) return;
    const gameMain = document.querySelector('.game-main');
    const rect = gameMain?.getBoundingClientRect() ?? gameContainer.getBoundingClientRect();
    mapRenderer.resize(Math.max(320, Math.round(rect.width)), Math.max(320, Math.round(rect.height)));
    updateHud();
}

function toCanvasPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
}

function onCanvasClick(e) {
    if (currentScreen !== 'map' || !mapRenderer) return;
    const { x, y } = toCanvasPoint(e.clientX, e.clientY);
    const building = mapRenderer.getBuildingAt(x, y);
    if (!building) return;
    handleBuilding(building);
}

function onCanvasMove(e) {
    if (currentScreen !== 'map' || !mapRenderer) return;
    const { x, y } = toCanvasPoint(e.clientX, e.clientY);
    mapRenderer.setHoveredBuilding(mapRenderer.getBuildingAt(x, y));
}

let touchStart = null;
function onCanvasTouch(e) {
    const touch = e.touches?.[0];
    if (!touch) return;
    touchStart = { x: touch.clientX, y: touch.clientY };
}

function handleBuilding(building) {
    mapRenderer.setSelectedBuilding(building);
    audioService.sfx('sfx_click', { volume: 0.3 });

    if (building.type === 'subtopic') {
        openSubtopic(building);
        return;
    }

    const routes = {
        school: 'tryout',
        library: 'lessons',
        arena: 'arena',
        shop: 'shop',
        house: 'profile'
    };

    if (routes[building.type]) showScreen(routes[building.type]);
}

function openSubtopic(building) {
    const subtopic = CURRICULUM.getSubtopic(building.subtopic);
    if (!subtopic) return;

    const readiness = masteryService.getSubtopicReadiness(building.subtopic);
    const mastery = masteryService.getMasteryState(building.subtopic);

    const body = el('div', { class: 'subtopic-modal' });
    const statusText = {
        locked: 'Terkunci',
        building: 'Sedang belajar',
        mastered: 'Dikuasai',
        strong: 'Kuat'
    }[mastery.status || 'locked'];

    body.innerHTML = `
        <div class="subtopic-modal-head">
            <span class="level-pill">${subtopic.id}</span>
            <span class="status-badge status-${mastery.status || 'locked'}">${statusText}</span>
        </div>
        <h4>${escapeHtml(subtopic.name)}</h4>
        <p class="subtopic-modal-desc">Domain ${subtopic.domainName} · Level ${subtopic.level} · Kemampuan (θ) ${(mastery.theta || 0).toFixed(2)}</p>
        ${!readiness.ready ? `<p class="subtopic-lock-note">${readiness.reason}</p>` : ''}
        ${mastery.lastBossAccuracy !== null && mastery.lastBossAccuracy !== undefined
            ? `<p class="subtopic-modal-desc">Boss terakhir: akurasi ${Math.round(mastery.lastBossAccuracy * 100)}%, L3 benar ${mastery.lastBossL3Correct || 0}, lolos di ${mastery.bossPassed || 0} hari berbeda.</p>`
            : ''}
    `;

    const footer = el('div', { class: 'modal-footer-actions' });
    const lessonBtn = el('button', { class: 'btn btn-secondary', type: 'button', text: 'Pelajaran' });
    const practiceBtn = el('button', { class: 'btn btn-primary', type: 'button', text: 'Latihan' });
    const bossBtn = el('button', { class: 'btn btn-accent', type: 'button', text: 'Boss' });

    const modal = openModal({
        title: subtopic.name,
        body,
        footer,
        size: 'sm'
    });

    if (!readiness.ready) {
        lessonBtn.disabled = true;
        practiceBtn.disabled = true;
        bossBtn.disabled = true;
    }

    lessonBtn.addEventListener('click', () => {
        modal.close();
        showScreen('lessons', { lessonId: building.subtopic });
    });
    practiceBtn.addEventListener('click', () => {
        modal.close();
        startPractice({ mode: 'latih', subtopicId: building.subtopic, count: 10 });
    });
    bossBtn.addEventListener('click', () => {
        modal.close();
        startPractice({ mode: 'boss', subtopicId: building.subtopic });
    });

    footer.appendChild(lessonBtn);
    footer.appendChild(practiceBtn);
    footer.appendChild(bossBtn);
}

function startPractice(config) {
    if (!practiceSession) {
        practiceSession = new PracticeSession(screenHost, {
            onExit: ({ refresh } = {}) => {
                currentScreen = 'map';
                screenHost.hidden = true;
                screenHost.innerHTML = '';
                uiOverlay.innerHTML = '';
                canvas.hidden = false;
                updateHud();
                showScreen('map');
                if (refresh) refreshMapState();
            }
        });
    }

    canvas.hidden = true;
    uiOverlay.innerHTML = '';
    screenHost.hidden = false;

    if (config.mission && missionScreen) {
        const originalExit = practiceSession.onExit;
        practiceSession.onExit = (opts = {}) => {
            missionScreen.completeSlot(config.mission);
            practiceSession.onExit = originalExit;
            originalExit(opts);
        };
    }

    practiceSession.start(config);
}

function refreshMapState() {
    updateHud();
}

function showWelcome() {
    const body = el('div', { class: 'welcome-body' });
    body.innerHTML = `
        <p>EduCity adalah kota yang dibangun dari penguasaanmu. Setiap subtopik Matematika yang kamu kuasai akan membangun satu bangunan.</p>
        <ol class="welcome-list">
            <li><strong>Pra-cek</strong> 3 soal untuk melihat yang sudah kamu bisa.</li>
            <li><strong>Pelajari</strong> konsep singkat di Perpustakaan.</li>
            <li><strong>Latih</strong> 10 soal adaptif di Arena.</li>
            <li><strong>Boss</strong> 8 soal tanpa petunjuk, akurasi ≥ 85% dua kali di hari berbeda.</li>
        </ol>
        <p class="welcome-note">Mulai dari Distrik Bilangan. Kamu bisa berhenti kapan saja; progres tersimpan otomatis.</p>
    `;

    const footer = el('div', { class: 'modal-footer-actions' });
    const start = el('button', { class: 'btn btn-primary btn-block', type: 'button', text: 'Mulai dari B1' });
    footer.appendChild(start);

    const modal = openModal({
        title: 'Selamat datang di EduCity',
        body,
        footer,
        size: 'md',
        dismissible: false,
        onClose: () => gameState.setFlag('diagnosticDone', true)
    });

    start.addEventListener('click', () => {
        modal.close();
        startPractice({ mode: 'pracek', subtopicId: 'B1', count: 3 });
    });
}

function showScreen(screen, options = {}) {
    if (!NAV_SCREENS.includes(screen)) screen = 'map';
    currentScreen = screen;

    document.querySelectorAll('.nav-item').forEach(item => {
        const isActive = item.dataset.screen === screen || (screen === 'missions' && item.dataset.screen === 'home');
        item.classList.toggle('active', isActive);
        if (isActive) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
    });

    document.querySelectorAll('#side-menu .menu-item').forEach(item => {
        item.classList.toggle('active', item.dataset.screen === screen);
    });

    if (screen !== 'map') {
        stopMapLoop();
        canvas.hidden = true;
        screenHost.hidden = false;
    } else {
        screenHost.hidden = true;
        screenHost.innerHTML = '';
        canvas.hidden = false;
        uiOverlay.innerHTML = '';
        startMapLoop();
    }

    try {
        switch (screen) {
            case 'map':
                updateDistrictLabel(null);
                break;
            case 'lessons':
                lessonScreen.render(options.lessonId || null);
                break;
            case 'arena':
                arenaScreen.render();
                break;
            case 'tryout':
                tryoutScreen.render();
                break;
            case 'mistakes':
                mistakeScreen.render();
                break;
            case 'shop':
                shopScreen.render();
                break;
            case 'profile':
                dashboardScreen.render();
                break;
            case 'missions':
                missionScreen.render();
                break;
            case 'settings':
                settingsScreen.render();
                break;
        }
    } catch (err) {
        console.error('Render error:', err);
        screenHost.innerHTML = '';
        screenHost.appendChild(el('div', { class: 'screen-scroll', style: 'padding:24px; text-align:center;' }, [
            el('h2', { text: 'Gagal memuat layar' }),
            el('p', { text: 'Terjadi kesalahan saat memuat tampilan. Silakan coba lagi.', class: 'screen-sub' }),
            el('button', { class: 'btn btn-primary', type: 'button', text: 'Kembali ke Peta', onClick: () => showScreen('map') })
        ]));
        return;
    }

    updateHud();
}

function updateDistrictLabel(text) {
    const district = document.getElementById('district-name');
    const subtopic = document.getElementById('subtopic-name');
    if (district) {
        const streak = gameState.getProgress()?.streak || 0;
        district.textContent = text || (streak > 0 ? `Kota EduCity · 🔥 ${streak} hari` : 'Kota EduCity');
    }
    if (subtopic) {
        subtopic.hidden = true;
        subtopic.textContent = '';
    }
}

function updateStreakDisplay() {
    const progress = gameState.getProgress() || {};
    const streak = progress.streak || 0;
    const district = document.getElementById('district-name');
    if (district && currentScreen === 'map') {
        district.textContent = streak > 0 ? `Kota EduCity · 🔥 ${streak} hari` : 'Kota EduCity';
    }
}

function updateHud() {
    const progress = gameState.getProgress() || {};
    const xp = progress.xp || 0;
    const level = Math.floor(xp / 100) + 1;
    const inLevel = xp % 100;

    const xpBar = document.getElementById('xp-bar');
    const xpText = document.getElementById('xp-text');
    const xpProgress = document.getElementById('xp-progress');
    if (xpBar) xpBar.style.width = `${inLevel}%`;
    if (xpText) xpText.textContent = `Level ${level} · ${inLevel}/100 XP`;
    if (xpProgress) xpProgress.setAttribute('aria-valuenow', String(inLevel));

    const coins = document.getElementById('coin-count');
    if (coins) coins.textContent = String(progress.coins || 0);

    const hearts = Math.max(0, progress.hearts ?? 3);
    const heartsEl = document.getElementById('hearts-display');
    if (heartsEl) {
        heartsEl.textContent = '♥'.repeat(hearts) + '♡'.repeat(Math.max(0, 3 - hearts));
        heartsEl.setAttribute('aria-label', `Nyawa ${hearts} dari 3`);
    }

    updateStreakDisplay();

    const profile = gameState.getProfile();
    if (profile) {
        const nameEl = document.getElementById('menu-name');
        const classEl = document.getElementById('menu-class');
        const avatarEl = document.getElementById('menu-avatar');
        if (nameEl) nameEl.textContent = profile.studentName;
        if (classEl) classEl.textContent = `Kelas ${profile.classCode}`;
        if (avatarEl) avatarEl.textContent = (profile.studentName || '?').charAt(0).toUpperCase();
    }
}

function setupHud() {
    gameState.subscribe('progress.xp', () => updateHud());
    gameState.subscribe('progress.coins', () => updateHud());
    gameState.subscribe('progress.hearts', () => updateHud());
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const screen = item.dataset.screen;
            if (screen === 'home') showScreen('map');
            else showScreen(screen);
        });
    });

    document.getElementById('btn-menu')?.addEventListener('click', () => {
        sideMenu.hidden = false;
        document.getElementById('btn-menu').setAttribute('aria-expanded', 'true');
        const firstItem = sideMenu.querySelector('.menu-item');
        if (firstItem) firstItem.focus();
    });

    document.getElementById('btn-close-menu')?.addEventListener('click', closeMenu);
    sideMenu?.querySelector('.side-menu-backdrop')?.addEventListener('click', closeMenu);

    document.getElementById('btn-settings')?.addEventListener('click', () => showScreen('settings'));

    document.getElementById('btn-logout')?.addEventListener('click', () => {
        confirmDialog({
            title: 'Keluar?',
            message: 'Progres belajar tetap tersimpan di perangkat ini.',
            confirmText: 'Keluar',
            cancelText: 'Batal'
        }).then(yes => {
            if (yes) logout();
        });
    });
}

function closeMenu() {
    sideMenu.hidden = true;
    document.getElementById('btn-menu')?.setAttribute('aria-expanded', 'false');
}

function setupSideMenu() {
    document.querySelectorAll('#side-menu .menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const screen = item.dataset.screen;
            closeMenu();
            showScreen(screen);
        });
    });
}

function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !sideMenu.hidden) closeMenu();

        if (currentScreen === 'map' && (e.key === 'Enter' || e.key === ' ') && document.activeElement === canvas) {
            e.preventDefault();
            const target = mapRenderer?.selectedBuilding
                || mapRenderer?.buildings.find(b => b.type === 'subtopic');
            if (target) handleBuilding(target);
        }

        if (currentScreen === 'map' && ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
            if (document.activeElement !== canvas) return;
            e.preventDefault();
            cycleMapBuilding(e.key);
        }
    });

    canvas.setAttribute('tabindex', '0');
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', 'Peta kota EduCity. Gunakan tombol panah untuk memilih bangunan dan Enter untuk membuka.');
    canvas.addEventListener('focus', () => {
        if (!mapRenderer) return;
        if (!mapRenderer.selectedBuilding) {
            const first = mapRenderer.buildings.find(b => b.type === 'subtopic');
            if (first) mapRenderer.setSelectedBuilding(first);
        }
    });
}

function cycleMapBuilding(key) {
    if (!mapRenderer) return;
    const list = mapRenderer.buildings;
    const current = mapRenderer.selectedBuilding || list[0];
    let index = list.indexOf(current);
    if (index < 0) index = 0;

    if (key === 'ArrowRight' || key === 'ArrowDown') index = (index + 1) % list.length;
    else index = (index - 1 + list.length) % list.length;

    const next = list[index];
    mapRenderer.setSelectedBuilding(next);
    mapRenderer.centerOnBuilding(next);
    announce(`Dipilih: ${next.label}`);
}

function announce(message) {
    let live = document.getElementById('sr-announcer');
    if (!live) {
        live = document.createElement('div');
        live.id = 'sr-announcer';
        live.className = 'sr-only';
        live.setAttribute('aria-live', 'polite');
        document.body.appendChild(live);
    }
    live.textContent = message;
}

function applySettings() {
    const settings = gameState.getSettings() || {};
    document.body.classList.toggle('font-large', settings.fontSize === 'large');
    document.body.classList.toggle('high-contrast', settings.highContrast === true);
    document.body.classList.toggle('reduced-motion', settings.reducedMotion === true);
    mapRenderer?.setReducedMotion(reducedMotionQuery.matches || settings.reducedMotion === true);
    audioService.syncWithSettings();
}

function startMapLoop() {
    if (animFrameId) return;
    lastFrameTime = performance.now();
    animFrameId = requestAnimationFrame(mapLoop);
}

function stopMapLoop() {
    if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
    }
}

function mapLoop(now) {
    const dt = now - lastFrameTime;
    lastFrameTime = now;

    if (currentScreen === 'map' && mapRenderer) {
        mapRenderer.update(dt);
        mapRenderer.render();
    }

    animFrameId = requestAnimationFrame(mapLoop);
}

function logout() {
    audioService.stopBgm();
    gameState.setProfile(null);
    gameState.setFlag('parentalConsent', false);
    gameState.forceSave();

    stopMapLoop();
    screenHost.hidden = true;
    screenHost.innerHTML = '';
    uiOverlay.innerHTML = '';
    gameContainer.hidden = true;
    gameContainer.classList.remove('active');

    showLogin();
}

window.addEventListener('beforeunload', () => gameState.forceSave());
document.addEventListener('visibilitychange', () => {
    if (document.hidden) gameState.forceSave();
});

setupLogin();
boot();

window.addEventListener('error', (e) => {
    console.error('Unhandled error:', e.error?.message || e.message);
    if (!gameContainer.hidden && !gameContainer.classList.contains('active')) return;
    showToast('Terjadi kesalahan. Silakan muat ulang halaman.', 'error', 8000);
});

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}
