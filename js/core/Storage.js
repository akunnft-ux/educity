const STORAGE_KEY = 'educity_game_data';
const STORAGE_VERSION = 2;

export const DEFAULT_STATE = {
    version: STORAGE_VERSION,
    profile: null,
    progress: {
        xp: 0,
        level: 1,
        coins: 0,
        hearts: 3,
        streak: 0,
        bestStreak: 0,
        lastActiveDate: null,
        streakFreeze: 1,
        streakFreezeWeek: null
    },
    mastery: {},
    reviewQueue: [],
    mistakeBook: [],
    tryoutHistory: [],
    inventory: {
        avatars: ['default'],
        decorations: [],
        currentAvatar: 'default',
        currentDecoration: null
    },
    settings: {
        soundEnabled: true,
        musicEnabled: true,
        fontSize: 'normal',
        highContrast: false,
        reducedMotion: false
    },
    dailyMissions: {
        date: null,
        slots: [],
        completed: 0,
        claimed: false
    },
    statistics: {
        totalQuestionsAnswered: 0,
        totalCorrect: 0,
        totalTimeSpent: 0,
        sessions: 0,
        subtopicStats: {}
    },
    telemetry: [],
    flags: {
        parentalConsent: false,
        diagnosticDone: false,
        tryoutCount: 0
    }
};

function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
        const value = source[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            result[key] = deepMerge(target[key] && typeof target[key] === 'object' ? target[key] : {}, value);
        } else if (value !== undefined) {
            result[key] = value;
        }
    }
    return result;
}

function todayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export class Storage {
    static getDefaultState() {
        return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }

    static load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return this.getDefaultState();
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return this.getDefaultState();
            if (parsed.version !== STORAGE_VERSION) return this.migrate(parsed);
            return deepMerge(this.getDefaultState(), parsed);
        } catch (e) {
            console.error('Failed to load game data:', e);
            return this.getDefaultState();
        }
    }

    static save(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            return true;
        } catch (e) {
            console.error('Failed to save game data:', e);
            return false;
        }
    }

    static clear() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            return true;
        } catch (e) {
            console.error('Failed to clear game data:', e);
            return false;
        }
    }

    static migrate(oldData) {
        const migrated = this.getDefaultState();
        if (oldData && oldData.profile) {
            migrated.profile = oldData.profile;
            if (migrated.profile.pin) {
                delete migrated.profile.pin;
            }
        }
        if (oldData && oldData.progress) migrated.progress = { ...migrated.progress, ...oldData.progress };
        if (oldData && oldData.mastery) migrated.mastery = oldData.mastery;
        if (oldData && Array.isArray(oldData.mistakeBook)) migrated.mistakeBook = oldData.mistakeBook;
        if (oldData && Array.isArray(oldData.tryoutHistory)) migrated.tryoutHistory = oldData.tryoutHistory;
        if (oldData && oldData.inventory) migrated.inventory = { ...migrated.inventory, ...oldData.inventory };
        if (oldData && oldData.settings) migrated.settings = { ...migrated.settings, ...oldData.settings };
        if (oldData && oldData.statistics) migrated.statistics = { ...migrated.statistics, ...oldData.statistics };
        migrated.version = STORAGE_VERSION;
        return migrated;
    }

    static exportData() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const blob = new Blob([raw], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `educity-backup-${todayKey()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return true;
    }

    static importData(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('Tidak ada file'));
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                reject(new Error('File terlalu besar'));
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!data || typeof data !== 'object') throw new Error('Format data tidak valid');
                    const normalized = deepMerge(this.getDefaultState(), data);
                    normalized.version = STORAGE_VERSION;
                    if (this.save(normalized)) resolve(true);
                    else reject(new Error('Gagal menyimpan data'));
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('Gagal membaca file'));
            reader.readAsText(file);
        });
    }
}

export { todayKey };
