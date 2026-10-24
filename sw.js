const CACHE_NAME = 'educity-v3';
const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './styles/main.css',
    './data/curriculum.js',
    './data/lessons.js',
    './js/main.js',
    './js/core/AssetLoader.js',
    './js/core/GameState.js',
    './js/core/Storage.js',
    './js/core/MasteryService.js',
    './js/core/QuestionEngine.js',
    './js/core/AudioService.js',
    './js/scenes/CityMapScene.js',
    './js/scenes/QuestionScene.js',
    './js/screens/LessonScreen.js',
    './js/screens/ArenaScreen.js',
    './js/screens/PracticeSession.js',
    './js/screens/TryoutScreen.js',
    './js/screens/DashboardScreen.js',
    './js/screens/MistakeScreen.js',
    './js/screens/ShopScreen.js',
    './js/screens/MissionScreen.js',
    './js/screens/SettingsScreen.js',
    './js/ui/dom.js',
    './assets/assets.json'
];

function isAppShellRequest(request) {
    const url = new URL(request.url);
    return url.pathname === '/' ||
        url.pathname === '/index.html' ||
        url.pathname.startsWith('/js/') ||
        url.pathname.startsWith('/styles/') ||
        url.pathname.startsWith('/data/') ||
        url.pathname === '/manifest.json' ||
        url.pathname === '/assets/assets.json';
}

function isAssetRequest(request) {
    const url = new URL(request.url);
    return url.pathname.startsWith('/assets/') &&
        (url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.wav') ||
         url.pathname.endsWith('.json'));
}

async function notifyClients(message) {
    const clients = await self.clients.matchAll();
    clients.forEach(client => client.postMessage(message));
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
            .then(() => self.clients.claim())
            .then(() => notifyClients({ type: 'SW_UPDATED', version: CACHE_NAME }))
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== location.origin) return;

    if (isAppShellRequest(request)) {
        // Network-first for app shell (HTML, JS, CSS, JSON)
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response && response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
                    }
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    if (isAssetRequest(request)) {
        // Cache-first for assets
        event.respondWith(
            caches.match(request).then(cached => {
                if (cached) return cached;
                return fetch(request)
                    .then(response => {
                        if (response && response.ok) {
                            const copy = response.clone();
                            caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
                        }
                        return response;
                    })
                    .catch(() => cached);
            })
        );
        return;
    }

    // Default: network-first
    event.respondWith(
        fetch(request)
            .then(response => {
                if (response && response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
                }
                return response;
            })
            .catch(() => caches.match(request))
    );
});
