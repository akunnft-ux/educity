import { assetLoader } from './AssetLoader.js';
import { gameState } from './GameState.js';

class AudioService {
    constructor() {
        this.bgm = null;
        this.bgmName = null;
        this.unlocked = false;
    }

    _settings() {
        return gameState.getSettings() || {};
    }

    sfx(name, options = {}) {
        if (this._settings().soundEnabled === false) return null;
        if (!this.unlocked) return null;
        return assetLoader.playAudio(name, { volume: 0.5, ...options });
    }

    playBgm(name = 'bgm_town_loop') {
        if (this._settings().musicEnabled === false) {
            this.stopBgm();
            return;
        }
        if (this.bgmName === name && this.bgm) return;
        this.stopBgm();
        const instance = assetLoader.playAudio(name, { volume: 0.18, loop: true });
        if (instance) {
            this.bgm = instance;
            this.bgmName = name;
        }
    }

    stopBgm() {
        if (this.bgm) {
            try {
                this.bgm.pause();
                this.bgm.currentTime = 0;
            } catch {}
        }
        this.bgm = null;
        this.bgmName = null;
    }

    syncWithSettings() {
        const settings = this._settings();
        if (settings.musicEnabled === false) this.stopBgm();
        else if (this.unlocked) this.playBgm();
    }

    unlock() {
        this.unlocked = true;
        this.playBgm();
    }
}

export const audioService = new AudioService();
