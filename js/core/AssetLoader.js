const MANIFEST_URL = 'assets/assets.json';
const IMAGE_ROOT = 'assets/png';
const SHEET_ROOT = 'assets/sheets';
const AUDIO_ROOT = 'assets/audio';

export class AssetLoader {
    constructor() {
        this.assets = new Map();
        this.sheets = new Map();
        this.audio = new Map();
        this.manifest = null;
        this.loadPromise = null;
        this.failed = [];
        this.failedDetails = [];
    }

    async load(manifest, onProgress = null) {
        if (this.loadPromise) return this.loadPromise;
        this.manifest = manifest;
        this.failed = [];
        this.failedDetails = [];
        this.loadPromise = this._loadAll(manifest, onProgress);
        return this.loadPromise;
    }

    async _loadAll(manifest, onProgress) {
        const tasks = [];

        const sheets = manifest.sheets || {};
        for (const [name, data] of Object.entries(sheets)) {
            tasks.push({ label: `spritesheet:${name}`, task: () => this._loadSpriteSheet(name, data) });
        }

        const assets = manifest.assets || {};
        for (const key of Object.keys(assets)) {
            if (!key.startsWith('buildings/') && !key.startsWith('environment/')) continue;
            tasks.push({ label: `image:${key}`, task: () => this._loadImage(key, `${IMAGE_ROOT}/${key}.png`) });
        }

        const audioList = manifest.audio || [];
        for (const name of audioList) {
            tasks.push({ label: `audio:${name}`, task: () => this._loadAudio(name, `${AUDIO_ROOT}/${name}.wav`) });
        }

        const total = tasks.length || 1;
        let done = 0;

        const results = await Promise.allSettled(tasks.map(async ({ label, task }) => {
            try {
                return await task();
            } catch (err) {
                throw new Error(`${label} failed: ${err.message}`);
            } finally {
                done++;
                if (onProgress) onProgress(Math.round((done / total) * 100));
            }
        }));

        results.forEach((r, i) => {
            if (r.status === 'rejected') {
                this.failed.push(i);
                this.failedDetails.push({ label: tasks[i].label, reason: r.reason?.message });
                console.warn(`Aset gagal dimuat: ${tasks[i].label} - ${r.reason?.message}`);
            }
        });

        return {
            images: this.assets.size,
            sheets: this.sheets.size,
            audio: this.audio.size,
            failed: this.failed.length,
            failedDetails: this.failedDetails
        };
    }

    async fetchManifest() {
        const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`Manifest tidak ditemukan (${res.status})`);
        return res.json();
    }

    _loadSpriteSheet(name, data) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.decoding = 'async';
            img.onload = () => {
                this.sheets.set(name, {
                    image: img,
                    cellWidth: data.cell[0],
                    cellHeight: data.cell[1],
                    cols: data.cols,
                    rows: Math.ceil(Object.keys(data.frames || {}).length / data.cols),
                    frames: data.frames || {}
                });
                resolve();
            };
            img.onerror = () => reject(new Error(`Gagal memuat spritesheet ${data.image}`));
            img.src = `${SHEET_ROOT}/${data.image.replace(/^sheets\//, '')}`;
        });
    }

    _loadImage(key, url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.decoding = 'async';
            img.onload = () => {
                this.assets.set(key, img);
                resolve();
            };
            img.onerror = () => reject(new Error(`Gagal memuat ${url}`));
            img.src = url;
        });
    }

    _loadAudio(name, url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.preload = 'auto';
            const done = () => {
                this.audio.set(name, audio);
                resolve();
            };
            audio.addEventListener('canplaythrough', done, { once: true });
            audio.addEventListener('error', () => reject(new Error(`Gagal memuat audio ${url}`)), { once: true });
            audio.src = url;
            audio.load();
            setTimeout(() => {
                if (!this.audio.has(name)) done();
            }, 4000);
        });
    }

    getImage(key) {
        return this.assets.get(key);
    }

    getSheet(name) {
        return this.sheets.get(name);
    }

    hasFrame(sheetName, frameName) {
        const sheet = this.sheets.get(sheetName);
        return Boolean(sheet && sheet.frames[frameName] !== undefined);
    }

    drawSprite(ctx, sheetName, frameName, x, y, width = null, height = null) {
        const sheet = this.sheets.get(sheetName);
        if (!sheet) return false;

        const frameIndex = sheet.frames[frameName];
        if (frameIndex === undefined) return false;

        const col = frameIndex % sheet.cols;
        const row = Math.floor(frameIndex / sheet.cols);
        const sw = sheet.cellWidth;
        const sh = sheet.cellHeight;

        ctx.drawImage(
            sheet.image,
            col * sw,
            row * sh,
            sw,
            sh,
            Math.round(x),
            Math.round(y),
            width ?? sw,
            height ?? sh
        );
        return true;
    }

    playAudio(name, options = {}) {
        const audio = this.audio.get(name);
        if (!audio) return null;
        try {
            const instance = audio.cloneNode();
            instance.volume = options.volume ?? 0.7;
            instance.loop = options.loop ?? false;
            instance.playbackRate = options.rate ?? 1;
            const p = instance.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
            return instance;
        } catch (e) {
            return null;
        }
    }
}

export const assetLoader = new AssetLoader();
