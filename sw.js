const CACHE_NAME = 'educity-v2';
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

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
            .catch(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== location.origin) return;

    event.respondWith(
        caches.match(request).then(cached => {
            const network = fetch(request)
                .then(response => {
                    if (response && response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
                    }
                    return response;
                })
                .catch(() => cached);

            return cached || network;
        })
    );
});
