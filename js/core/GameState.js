import { Storage, todayKey } from './Storage.js';

export class GameState {
    constructor() {
        this.state = Storage.load();
        this.listeners = new Map();
        this._saveTimeout = null;
    }

    get(path) {
        const keys = path.split('.');
        let value = this.state;
        for (const key of keys) {
            if (value === null || value === undefined) return undefined;
            value = value[key];
        }
        return value;
    }

    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let target = this.state;

        for (const key of keys) {
            if (!target[key] || typeof target[key] !== 'object') {
                target[key] = {};
            }
            target = target[key];
        }

        const oldValue = target[lastKey];
        target[lastKey] = value;

        this._notify(path, value, oldValue);
        this._saveDebounced();
        return value;
    }

    update(path, updater) {
        const current = this.get(path);
        const newValue = updater(current);
        this.set(path, newValue);
        return newValue;
    }

    subscribe(path, callback) {
        if (!this.listeners.has(path)) {
            this.listeners.set(path, new Set());
        }
        this.listeners.get(path).add(callback);
        return () => this.listeners.get(path)?.delete(callback);
    }

    _notify(path, newValue, oldValue) {
        this.listeners.get(path)?.forEach(cb => cb(newValue, oldValue, path));

        const parts = path.split('.');
        for (let i = parts.length - 1; i > 0; i--) {
            const parentPath = parts.slice(0, i).join('.');
            const callbacks = this.listeners.get(parentPath);
            if (callbacks) {
                const parentValue = this.get(parentPath);
                callbacks.forEach(cb => cb(parentValue, undefined, parentPath));
            }
        }
    }

    _saveDebounced() {
        if (this._saveTimeout) clearTimeout(this._saveTimeout);
        this._saveTimeout = setTimeout(() => Storage.save(this.state), 100);
    }

    forceSave() {
        if (this._saveTimeout) clearTimeout(this._saveTimeout);
        Storage.save(this.state);
    }

    reset() {
        Storage.clear();
        this.state = Storage.getDefaultState();
        this.listeners.clear();
        this.forceSave();
    }

    getProfile() {
        return this.state.profile;
    }

    setProfile(profile) {
        this.set('profile', profile);
    }

    hasProfile() {
        return Boolean(this.state.profile && this.state.profile.studentName);
    }

    getProgress() {
        return this.state.progress;
    }

    getMastery(subtopicId) {
        return this.state.mastery[subtopicId] || {
            status: 'locked',
            theta: 0,
            attempts: 0,
            bossAttempts: 0,
            bossPassed: 0,
            bossPassDates: [],
            l3Correct: 0,
            lastBossDate: null,
            lastBossAccuracy: null,
            retentionDates: [],
            masteredDate: null,
            currentStreak: 0
        };
    }

    setMastery(subtopicId, mastery) {
        this.set(`mastery.${subtopicId}`, mastery);
    }

    getReviewQueue() {
        return this.state.reviewQueue;
    }

    addToReviewQueue(item) {
        this.update('reviewQueue', queue => [...(queue || []), item]);
    }

    removeFromReviewQueue(index) {
        if (index < 0) return;
        this.update('reviewQueue', queue => queue.filter((_, i) => i !== index));
    }

    getMistakeBook() {
        return this.state.mistakeBook;
    }

    addMistake(mistake) {
        this.update('mistakeBook', book => {
            const list = book || [];
            const existing = list.find(m => m.itemId === mistake.itemId);
            if (existing) {
                return list.map(m => m.itemId === mistake.itemId
                    ? { ...m, timesWrong: (m.timesWrong || 1) + 1, lastWrong: Date.now(), resolvedDates: m.resolvedDates || [] }
                    : m);
            }
            return [...list, { ...mistake, timesWrong: 1, resolvedDates: [], addedDate: Date.now() }];
        });
    }

    resolveMistake(itemId) {
        this.update('mistakeBook', book => {
            const today = todayKey();
            return (book || []).map(m => {
                if (m.itemId !== itemId) return m;
                const dates = m.resolvedDates || [];
                if (!dates.includes(today)) dates.push(today);
                return { ...m, resolvedDates: dates };
            }).filter(m => (m.resolvedDates || []).length < 2);
        });
    }

    removeMistake(index) {
        this.update('mistakeBook', book => book.filter((_, i) => i !== index));
    }

    getTryoutHistory() {
        return this.state.tryoutHistory;
    }

    addTryoutResult(result) {
        this.update('tryoutHistory', history => [result, ...(history || [])].slice(0, 30));
        this.update('flags.tryoutCount', c => (c || 0) + 1);
    }

    getInventory() {
        return this.state.inventory;
    }

    addToInventory(type, item) {
        this.update(`inventory.${type}`, arr => {
            const list = arr || [];
            if (list.includes(item)) return list;
            return [...list, item];
        });
    }

    setCurrentAvatar(avatar) {
        this.set('inventory.currentAvatar', avatar);
    }

    setCurrentDecoration(decoration) {
        this.set('inventory.currentDecoration', decoration);
    }

    getSettings() {
        return this.state.settings;
    }

    setSetting(key, value) {
        this.set(`settings.${key}`, value);
    }

    getDailyMissions() {
        return this.state.dailyMissions;
    }

    setDailyMissions(missions) {
        this.set('dailyMissions', missions);
    }

    getStatistics() {
        return this.state.statistics;
    }

    incrementStat(key, value = 1) {
        this.update(`statistics.${key}`, (current = 0) => current + value);
    }

    updateSubtopicStat(subtopicId, statKey, value) {
        this.update(`statistics.subtopicStats.${subtopicId}.${statKey}`, (current = 0) => current + value);
    }

    getSubtopicStats(subtopicId) {
        return (this.state.statistics.subtopicStats || {})[subtopicId] || {
            answered: 0,
            correct: 0,
            timeSpent: 0
        };
    }

    addTelemetry(event, payload = {}) {
        this.update('telemetry', list => {
            const entry = { event, payload, at: Date.now() };
            return [...(list || []), entry].slice(-200);
        });
    }

    getFlags() {
        return this.state.flags;
    }

    setFlag(key, value) {
        this.set(`flags.${key}`, value);
    }

    touchStreak() {
        const today = todayKey();
        const last = this.state.progress.lastActiveDate;
        if (last === today) return this.state.progress.streak;

        const yesterday = todayKey(new Date(Date.now() - 86400000));
        let streak = this.state.progress.streak || 0;
        let usedFreeze = false;

        if (last === yesterday) {
            streak += 1;
        } else if (last) {
            const gapDays = Math.round((new Date(`${today}T00:00:00`) - new Date(`${last}T00:00:00`)) / 86400000);
            const weekKey = today.slice(0, 8) + Math.ceil(new Date().getDate() / 7);
            const freezeAvailable = this.state.progress.streakFreeze > 0
                && this.state.progress.streakFreezeWeek !== weekKey;

            if (gapDays === 2 && freezeAvailable) {
                this.set('progress.streakFreeze', this.state.progress.streakFreeze - 1);
                this.set('progress.streakFreezeWeek', weekKey);
                streak += 1;
                usedFreeze = true;
            } else {
                streak = 1;
            }
        } else {
            streak = 1;
        }

        this.set('progress.streak', streak);
        this.set('progress.bestStreak', Math.max(streak, this.state.progress.bestStreak || 0));
        this.set('progress.lastActiveDate', today);

        if (usedFreeze) {
            this.addTelemetry('streak_freeze_used', { streak });
        }

        return streak;
    }
}

export const gameState = new GameState();
