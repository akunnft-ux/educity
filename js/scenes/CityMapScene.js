import { assetLoader } from '../core/AssetLoader.js';
import { CURRICULUM, BUILDING_STATUS } from '../../data/curriculum.js';
import { masteryService } from '../core/MasteryService.js';

export const WORLD_WIDTH = 1400;
export const WORLD_HEIGHT = 1250;
export const TILE = 32;

const BUILDING_SPRITES = {
    house: 'buildings/house',
    school: 'buildings/school',
    library: 'buildings/knowledge',
    arena: 'buildings/challenge',
    shop: 'buildings/shop'
};

const DOMAIN_SPRITE = {
    bilangan: 'buildings/knowledge',
    geometri: 'buildings/challenge',
    data: 'buildings/shop'
};

const STATUS_LABEL = {
    locked: 'Terkunci',
    building: 'Sedang Dibangun',
    mastered: 'Dikuasai',
    strong: 'Kuat'
};

export class CityMapRenderer {
    constructor(canvas, gameState) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gameState = gameState;
        this.dpr = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.targetOffsetX = 0;
        this.targetOffsetY = 0;
        this.viewportWidth = canvas.width || WORLD_WIDTH;
        this.viewportHeight = canvas.height || WORLD_HEIGHT;
        this.buildings = [];
        this.npcs = [];
        this.particles = [];
        this.selectedBuilding = null;
        this.hoveredBuilding = null;
        this.animationTime = 0;
        this.waterFrame = 0;
        this.reducedMotion = false;

        this._initBuildings();
        this._initNPCs();
    }

_initBuildings() {
        this.buildings = [
            { id: 'house', type: 'house', label: 'Rumah', x: 40, y: 1100, w: 96, h: 96 },
            { id: 'school', type: 'school', label: 'Sekolah', x: 1260, y: 60, w: 96, h: 96 },
            { id: 'library', type: 'library', label: 'Perpustakaan', x: 40, y: 60, w: 96, h: 96 },
            { id: 'arena', type: 'arena', label: 'Arena', x: 1220, y: 1100, w: 96, h: 96 },
            { id: 'shop', type: 'shop', label: 'Toko', x: 700, y: 1120, w: 96, h: 96 }
        ];

        const domains = CURRICULUM.domains;
        const districtCenters = {
            bilangan: { x: 380, y: 300 },
            geometri: { x: 1050, y: 300 },
            data: { x: 700, y: 800 }
        };

        domains.forEach(domain => {
            const center = districtCenters[domain.id] || { x: 700, y: 650 };
            const cols = Math.ceil(Math.sqrt(domain.subtopics.length));
            const spacingX = 155;
            const spacingY = 155;

            domain.subtopics.forEach((subtopic, index) => {
                const row = Math.floor(index / cols);
                const col = index % cols;
                const rows = Math.ceil(domain.subtopics.length / cols);
                const inRow = Math.min(cols, domain.subtopics.length - row * cols);

                const x = center.x + (col - (inRow - 1) / 2) * spacingX - 48;
                const y = center.y + (row - (rows - 1) / 2) * spacingY - 48;

                this.buildings.push({
                    id: `b_${subtopic.id}`,
                    type: 'subtopic',
                    label: subtopic.name,
                    shortLabel: subtopic.id,
                    subtopic: subtopic.id,
                    domain: domain.id,
                    x,
                    y,
                    w: 96,
                    h: 96
                });
            });
        });
    }

    _initNPCs() {
        this.npcs = [
            { type: 'teacher', x: 550, y: 550, targetX: 550, targetY: 550, frame: 0, dir: 'down', wait: 0 },
            { type: 'student', x: 750, y: 350, targetX: 750, targetY: 350, frame: 0, dir: 'down', wait: 0 },
            { type: 'merchant', x: 850, y: 850, targetX: 850, targetY: 850, frame: 0, dir: 'down', wait: 0 }
        ];
    }

    resize(width, height) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.dpr = dpr;
        this.canvas.width = Math.round(width * dpr);
        this.canvas.height = Math.round(height * dpr);
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.viewportWidth = width;
        this.viewportHeight = height;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this._clampCamera();
    }

    setViewport(width, height) {
        this.viewportWidth = width;
        this.viewportHeight = height;
        this._clampCamera();
    }

    setReducedMotion(value) {
        this.reducedMotion = Boolean(value);
    }

    update(deltaTime) {
        const dt = Math.min(deltaTime, 100);
        this.animationTime += dt;

        if (!this.reducedMotion) {
            this._updateNPCs(dt);
            this._updateParticles(dt);
            this._updateWater(dt);
        }
        this._updateCamera();
    }

    _updateNPCs(dt) {
        for (const npc of this.npcs) {
            if (npc.wait > 0) {
                npc.wait -= dt;
                continue;
            }

            const dx = npc.targetX - npc.x;
            const dy = npc.targetY - npc.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 4) {
                npc.wait = 1800 + Math.random() * 2600;
                const angle = Math.random() * Math.PI * 2;
                npc.targetX = Math.max(80, Math.min(WORLD_WIDTH - 80, npc.x + Math.cos(angle) * 70));
                npc.targetY = Math.max(80, Math.min(WORLD_HEIGHT - 80, npc.y + Math.sin(angle) * 70));
                continue;
            }

            const speed = 0.028;
            npc.x += dx * speed * (dt / 16.67);
            npc.y += dy * speed * (dt / 16.67);

            if (Math.abs(dx) > Math.abs(dy)) npc.dir = dx > 0 ? 'right' : 'left';
            else npc.dir = dy > 0 ? 'down' : 'up';

            npc.frame = (npc.frame + dt * 0.006) % 4;
        }
    }

    _updateParticles(dt) {
        this.particles = this.particles.filter(p => {
            p.life -= dt;
            p.x += p.vx * (dt / 1000);
            p.y += p.vy * (dt / 1000);
            p.vy += p.gravity * (dt / 1000);
            return p.life > 0;
        });
    }

    _updateWater(dt) {
        this.waterTimer = (this.waterTimer || 0) + dt;
        if (this.waterTimer > 400) {
            this.waterFrame = (this.waterFrame + 1) % 4;
            this.waterTimer = 0;
        }
    }

    _updateCamera() {
        const lerp = this.reducedMotion ? 1 : 0.12;
        this.offsetX += (this.targetOffsetX - this.offsetX) * lerp;
        this.offsetY += (this.targetOffsetY - this.offsetY) * lerp;
    }

    _clampCamera() {
        const maxX = Math.max(0, WORLD_WIDTH - this.viewportWidth);
        const maxY = Math.max(0, WORLD_HEIGHT - this.viewportHeight);
        this.offsetX = Math.max(0, Math.min(maxX, this.offsetX));
        this.offsetY = Math.max(0, Math.min(maxY, this.offsetY));
        this.targetOffsetX = Math.max(0, Math.min(maxX, this.targetOffsetX));
        this.targetOffsetY = Math.max(0, Math.min(maxY, this.targetOffsetY));
    }

    _getCenteringOffset() {
        const centerX = this.viewportWidth > WORLD_WIDTH ? (this.viewportWidth - WORLD_WIDTH) / 2 : 0;
        const centerY = this.viewportHeight > WORLD_HEIGHT ? (this.viewportHeight - WORLD_HEIGHT) / 2 : 0;
        return { x: centerX, y: centerY };
    }

    panTo(x, y) {
        this.targetOffsetX = x;
        this.targetOffsetY = y;
        this._clampCamera();
        if (this.reducedMotion) {
            this.offsetX = this.targetOffsetX;
            this.offsetY = this.targetOffsetY;
        }
    }

    render() {
        const ctx = this.ctx;
        const width = this.viewportWidth;
        const height = this.viewportHeight;

        const centerOffset = this._getCenteringOffset();

        ctx.save();
        ctx.translate(centerOffset.x - Math.round(this.offsetX), centerOffset.y - Math.round(this.offsetY));

        this._drawGround();
        this._drawWater();
        this._drawPaths();
        this._drawDistrictLabels();
        this._drawBuildings();
        this._drawNPCs();
        this._drawParticles();

        ctx.restore();

        this._drawVignette(width, height);
    }

    _drawGround() {
        const ctx = this.ctx;
        const startX = Math.floor(this.offsetX / TILE) * TILE - TILE;
        const startY = Math.floor(this.offsetY / TILE) * TILE - TILE;
        const endX = this.offsetX + this.viewportWidth + TILE;
        const endY = this.offsetY + this.viewportHeight + TILE;

        const hasSheet = assetLoader.hasFrame('tileset_terrain', 'grass_a');

        for (let y = startY; y < endY; y += TILE) {
            for (let x = startX; x < endX; x += TILE) {
                const noise = Math.sin(x * 0.05) + Math.cos(y * 0.07);
                const frame = noise > 0.2 ? 'grass_a' : 'grass_b';
                if (hasSheet) {
                    assetLoader.drawSprite(ctx, 'tileset_terrain', frame, x, y, TILE, TILE);
                } else {
                    ctx.fillStyle = noise > 0.2 ? '#8BC34A' : '#7CB342';
                    ctx.fillRect(x, y, TILE, TILE);
                }
            }
        }
    }

    _drawWater() {
        const ctx = this.ctx;
        const hasSheet = assetLoader.hasFrame('tileset_terrain', 'water_0');
const ponds = [
            { x: 40, y: 160, cols: 5, rows: 4 },
            { x: 1200, y: 340, cols: 4, rows: 4 },
            { x: 600, y: 80, cols: 6, rows: 2 },
            { x: 600, y: 1020, cols: 4, rows: 2 }
        ];

        for (const pond of ponds) {
            for (let i = 0; i < pond.cols; i++) {
                for (let j = 0; j < pond.rows; j++) {
                    const px = pond.x + i * TILE;
                    const py = pond.y + j * TILE;
                    if (hasSheet) {
                        const frame = `water_${(this.waterFrame + i + j) % 4}`;
                        assetLoader.drawSprite(ctx, 'tileset_terrain', frame, px, py, TILE, TILE);
                    } else {
                        ctx.fillStyle = '#4FC3F7';
                        ctx.fillRect(px, py, TILE, TILE);
                    }
                }
            }
        }
    }

    _drawPaths() {
        const ctx = this.ctx;
        const hasSheet = assetLoader.hasFrame('tileset_terrain', 'path');
const paths = [
            { x: 200, y: 600, cols: 28, rows: 1 },
            { x: 700, y: 200, cols: 1, rows: 18 },
            { x: 240, y: 450, cols: 24, rows: 1 },
            { x: 700, y: 750, cols: 1, rows: 3 },
            { x: 700, y: 1050, cols: 1, rows: 3 }
        ];

        for (const path of paths) {
            for (let i = 0; i < path.cols; i++) {
                for (let j = 0; j < path.rows; j++) {
                    const px = path.x + i * TILE;
                    const py = path.y + j * TILE;
                    if (hasSheet) {
                        assetLoader.drawSprite(ctx, 'tileset_terrain', 'path', px, py, TILE, TILE);
                    } else {
                        ctx.fillStyle = '#D7CCC8';
                        ctx.fillRect(px, py, TILE, TILE);
                    }
                }
            }
        }
    }

    _drawDistrictLabels() {
        const ctx = this.ctx;
        const labels = [
            { text: 'Distrik Bilangan', x: 350, y: 175, color: '#2E7D32' },
            { text: 'Distrik Geometri', x: 1050, y: 175, color: '#1565C0' },
            { text: 'Distrik Data', x: 700, y: 700, color: '#E65100' }
        ];

        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '700 18px Nunito, sans-serif';
        for (const label of labels) {
            ctx.fillStyle = 'rgba(255,255,255,0.88)';
            const w = ctx.measureText(label.text).width + 28;
            const h = 32;
            const r = 16;
            ctx.beginPath();
            ctx.moveTo(label.x - w / 2 + r, label.y - h / 2);
            ctx.arcTo(label.x + w / 2, label.y - h / 2, label.x + w / 2, label.y + h / 2, r);
            ctx.arcTo(label.x + w / 2, label.y + h / 2, label.x - w / 2, label.y + h / 2, r);
            ctx.arcTo(label.x - w / 2, label.y + h / 2, label.x - w / 2, label.y - h / 2, r);
            ctx.arcTo(label.x - w / 2, label.y - h / 2, label.x + w / 2, label.y - h / 2, r);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = label.color;
            ctx.fillText(label.text, label.x, label.y + 6);
        }
        ctx.restore();
    }

    _statusOf(building) {
        if (building.type !== 'subtopic') return 'mastered';
        const state = masteryService.getMasteryState(building.subtopic);
        return state.status || BUILDING_STATUS.LOCKED;
    }

    _drawBuildings() {
        const ctx = this.ctx;

        for (const building of this.buildings) {
            const status = this._statusOf(building);
            const spriteKey = building.type === 'subtopic'
                ? DOMAIN_SPRITE[building.domain]
                : BUILDING_SPRITES[building.type];

            const isHovered = this.hoveredBuilding?.id === building.id;
            const isSelected = this.selectedBuilding?.id === building.id;

            ctx.save();

            if (status === BUILDING_STATUS.LOCKED) ctx.globalAlpha = 0.45;

            if (isHovered && !this.reducedMotion) {
                ctx.shadowColor = 'rgba(0,0,0,0.25)';
                ctx.shadowBlur = 12;
                ctx.shadowOffsetY = 6;
            }

            const img = assetLoader.getImage(spriteKey);
            if (img) {
                ctx.drawImage(img, building.x, building.y, building.w, building.h);
            } else {
                ctx.fillStyle = building.type === 'subtopic' ? '#A5D6A7' : '#FFCC80';
                ctx.fillRect(building.x, building.y, building.w, building.h);
            }

            ctx.restore();

            if (status === BUILDING_STATUS.LOCKED) {
                ctx.save();
                ctx.fillStyle = 'rgba(33,33,33,0.45)';
                this._roundRect(building.x, building.y, building.w, building.h, 12);
                ctx.fill();
                ctx.restore();
            }

            this._drawStatusBadge(building, status);
            this._drawBuildingLabel(building, status);

            if (isHovered || isSelected) {
                ctx.save();
                ctx.strokeStyle = isSelected ? '#FFD54F' : '#FFFFFF';
                ctx.lineWidth = 3;
                this._roundRect(building.x - 3, building.y - 3, building.w + 6, building.h + 6, 14);
                ctx.stroke();
                ctx.restore();
            }

            if (status === BUILDING_STATUS.MASTERED) {
                assetLoader.drawSprite(ctx, 'items', 'star', building.x + building.w - 26, building.y - 10, 26, 26);
            } else if (status === BUILDING_STATUS.STRONG) {
                assetLoader.drawSprite(ctx, 'items', 'gem', building.x + building.w - 26, building.y - 10, 26, 26);
            }
        }
    }

    _drawStatusBadge(building, status) {
        if (building.type !== 'subtopic') return;
        const ctx = this.ctx;
        const colors = {
            locked: '#9E9E9E',
            building: '#F57C00',
            mastered: '#2E7D32',
            strong: '#F9A825'
        };
        const symbols = { locked: '🔒', building: '🔨', mastered: '✓', strong: '★' };
        const size = 24;
        const bx = building.x + 4;
        const by = building.y + 4;

        ctx.save();
        ctx.beginPath();
        ctx.arc(bx + size / 2, by + size / 2, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = colors[status] || '#9E9E9E';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '600 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbols[status] || '?', bx + size / 2, by + size / 2 + 1);
        ctx.restore();
    }

    _drawBuildingLabel(building, status) {
        const ctx = this.ctx;
        const label = building.type === 'subtopic'
            ? `${building.shortLabel} · ${STATUS_LABEL[status] || ''}`
            : building.label;

        ctx.save();
        ctx.font = '600 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        const textWidth = ctx.measureText(label).width;
        const boxW = textWidth + 16;
        const boxH = 20;
        const bx = building.x + building.w / 2 - boxW / 2;
        const by = building.y + building.h + 4;

        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        this._roundRect(bx, by, boxW, boxH, 10);
        ctx.fill();

        ctx.fillStyle = status === BUILDING_STATUS.LOCKED ? '#757575' : '#1B5E20';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, building.x + building.w / 2, by + boxH / 2 + 1);
        ctx.restore();
    }

    _roundRect(x, y, w, h, r) {
        const ctx = this.ctx;
        const radius = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + w, y, x + w, y + h, radius);
        ctx.arcTo(x + w, y + h, x, y + h, radius);
        ctx.arcTo(x, y + h, x, y, radius);
        ctx.arcTo(x, y, x + w, y, radius);
        ctx.closePath();
    }

    _drawNPCs() {
        const ctx = this.ctx;
        for (const npc of this.npcs) {
            const frame = Math.floor(npc.frame);
            const frameName = `npc_${npc.type}_${npc.dir}_${frame}`;
            const sheet = `npc_${npc.type}`;

            const drawn = assetLoader.drawSprite(ctx, sheet, frameName, npc.x, npc.y, 48, 48);
            if (!drawn) {
                ctx.save();
                ctx.fillStyle = '#7E57C2';
                ctx.beginPath();
                ctx.arc(npc.x + 24, npc.y + 24, 16, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }

    _drawParticles() {
        const ctx = this.ctx;
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    _drawVignette(width, height) {
        const ctx = this.ctx;
        const gradient = ctx.createRadialGradient(
            width / 2, height / 2, Math.min(width, height) * 0.35,
            width / 2, height / 2, Math.max(width, height) * 0.75
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.12)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    getBuildingAt(clientX, clientY) {
        const centerOffset = this._getCenteringOffset();
        const worldX = clientX + this.offsetX - centerOffset.x;
        const worldY = clientY + this.offsetY - centerOffset.y;

        for (const building of this.buildings) {
            if (worldX >= building.x - 8 && worldX <= building.x + building.w + 8 &&
                worldY >= building.y - 8 && worldY <= building.y + building.h + 24) {
                return building;
            }
        }
        return null;
    }

    setHoveredBuilding(building) {
        this.hoveredBuilding = building;
        this.canvas.style.cursor = building ? 'pointer' : 'default';
    }

    setSelectedBuilding(building) {
        this.selectedBuilding = building;
    }

    centerOnBuilding(building) {
        if (!building) return;
        this.targetOffsetX = building.x + building.w / 2 - this.viewportWidth / 2;
        this.targetOffsetY = building.y + building.h / 2 - this.viewportHeight / 2;
        this._clampCamera();
    }

    centerOnDistrict(domainId) {
        const district = this.buildings.find(b => b.domain === domainId && b.type === 'subtopic');
        if (district) this.centerOnBuilding(district);
    }

    addParticle(x, y, color, size = 4, life = 1000) {
        if (this.reducedMotion) return;
        this.particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 120,
            vy: -Math.random() * 120 - 40,
            gravity: 220,
            color,
            size,
            life,
            maxLife: life
        });
    }

    triggerMasteryEffect(building) {
        if (!building) return;
        for (let i = 0; i < 24; i++) {
            this.addParticle(
                building.x + building.w / 2,
                building.y + building.h / 2,
                ['#4CAF50', '#8BC34A', '#CDDC39', '#FFD54F'][i % 4],
                2 + Math.random() * 5,
                1200 + Math.random() * 600
            );
        }
    }
}
