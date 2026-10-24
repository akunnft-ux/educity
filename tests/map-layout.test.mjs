import { WORLD_WIDTH, WORLD_HEIGHT } from '../js/scenes/CityMapScene.js';
import { CURRICULUM } from '../data/curriculum.js';
import { CityMapRenderer } from '../js/scenes/CityMapScene.js';

globalThis.window = { devicePixelRatio: 1 };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };

function checkOverlaps() {
    const canvas = { getContext: () => ({}), width: 390, height: 600, style: {} };
    const gameState = { getMastery: () => ({ status: 'locked' }) };
    const renderer = new CityMapRenderer(canvas, gameState);

    const buildings = renderer.buildings;
    const errors = [];

    // Check building overlaps
    for (let i = 0; i < buildings.length; i++) {
        for (let j = i + 1; j < buildings.length; j++) {
            const a = buildings[i];
            const b = buildings[j];
            const ax1 = a.x, ay1 = a.y, ax2 = a.x + a.w, ay2 = a.y + a.h;
            const bx1 = b.x, by1 = b.y, bx2 = b.x + b.w, by2 = b.y + b.h;

            if (ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1) {
                errors.push(`Overlap: ${a.id} (${ax1},${ay1},${ax2},${ay2}) vs ${b.id} (${bx1},${by1},${bx2},${by2})`);
            }
        }
    }

    // Check label overlaps (label is 24px below building, with 4px gap)
    const LABEL_GAP = 4;
    const LABEL_HEIGHT = 24;
    for (let i = 0; i < buildings.length; i++) {
        for (let j = 0; j < buildings.length; j++) {
            if (i === j) continue;
            const a = buildings[i];
            const b = buildings[j];
            const aLabelY = a.y + a.h + LABEL_GAP;
            const aLabelY2 = aLabelY + LABEL_HEIGHT;
            const ax1 = a.x, ax2 = a.x + a.w;
            const bx1 = b.x, by1 = b.y, bx2 = b.x + b.w, by2 = b.y + b.h;

            // Check if label of A overlaps building B
            if (aLabelY < by2 && aLabelY2 > by1 && ax1 < bx2 && ax2 > bx1) {
                errors.push(`Label overlap: ${a.id} label overlaps ${b.id}`);
            }
        }
    }

    // Check bounds (WORLD_WIDTH x WORLD_HEIGHT, plus label space below)
    for (const b of buildings) {
        if (b.x < 0 || b.y < 0 || b.x + b.w > WORLD_WIDTH || b.y + b.h + 4 + 24 > WORLD_HEIGHT) {
            errors.push(`Out of bounds: ${b.id} at (${b.x},${b.y}) size ${b.w}x${b.h} (world: ${WORLD_WIDTH}x${WORLD_HEIGHT})`);
        }
    }

    // Check pond overlaps
    const ponds = [
        { x: 40, y: 160, cols: 5, rows: 4 },
        { x: 1200, y: 340, cols: 4, rows: 4 },
        { x: 600, y: 80, cols: 6, rows: 2 },
        { x: 600, y: 1000, cols: 4, rows: 2 }
    ];
    const TILE = 32;
    for (const pond of ponds) {
        const px1 = pond.x, py1 = pond.y;
        const px2 = pond.x + pond.cols * 32;
        const py2 = pond.y + pond.rows * 32;
        for (const b of buildings) {
            const bx1 = b.x, by1 = b.y, bx2 = b.x + b.w, by2 = b.y + b.h;
            if (bx1 < px2 && bx2 > px1 && by1 < py2 && by2 > py1) {
                errors.push(`Pond overlap: building ${b.id} overlaps pond at (${pond.x},${pond.y})`);
            }
        }
    }

    return errors;
}

const errors = checkOverlaps();
if (errors.length > 0) {
    console.error('MAP LAYOUT ERRORS:');
    errors.forEach(e => console.error('  - ' + e));
    process.exit(1);
} else {
    console.log('Map layout OK: no overlaps, all buildings in bounds, no pond overlaps');
    process.exit(0);
}
