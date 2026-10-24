import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const require = createRequire(import.meta.url);

function loadPlaywright() {
    const candidates = [
        process.env.PLAYWRIGHT_PATH,
        'playwright-core',
        '/home/master/.npm/_npx/705bc6b22212b352/node_modules/playwright-core'
    ].filter(Boolean);
    for (const candidate of candidates) {
        try {
            return require(candidate);
        } catch {
            // try next
        }
    }
    console.error('playwright-core not found. Install it or set PLAYWRIGHT_PATH.');
    process.exit(1);
}

const { chromium } = loadPlaywright();

const PORT = Number(process.env.E2E_PORT || (20000 + Math.floor(Math.random() * 20000)));
const BASE = `http://localhost:${PORT}/index.html`;
const CHROME = process.env.CHROME_PATH || '/home/master/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const results = [];
const errors = [];

function ok(name, cond, extra = '') {
  results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' :: ' + extra : ''}`);
}

async function newPage(browser, viewport) {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 600 });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(1800);
  return page;
}

async function login(page, name = 'Budi') {
  await page.fill('#class-code', '6A');
  await page.fill('#student-name', name);
  await page.fill('#pin', '1234');
  await page.check('#parental-consent');
  await page.click('#login-btn');
  await page.waitForTimeout(1600);
}

async function answerCurrent(page, correctBias = true) {
  const opts = page.locator('.option-btn:not([disabled])');
  const n = await opts.count();
  if (!n) return false;
  // pick the correct option when possible by inspecting state via DOM classes is not available pre-submit,
  // so we click index 0 for determinism in flow tests.
  await opts.nth(0).click();
  await page.click('#btn-submit');
  return true;
}

async function completePractice(page, max = 12) {
  for (let i = 0; i < max; i++) {
    if (await page.locator('#modal-container .modal').isVisible()) return true;
    const card = page.locator('.question-card');
    if (!(await card.count())) return true;
    const done = await answerCurrent(page);
    if (!done) return false;
    await page.waitForTimeout(500);
    for (let w = 0; w < 20; w++) {
      if (await page.locator('#modal-container .modal').isVisible()) return true;
      const stillFeedback = await page.locator('#feedback-panel:not([hidden])').count();
      if (!stillFeedback && (await page.locator('.question-card').count()) > 0) break;
      await page.waitForTimeout(200);
    }
  }
  return await page.locator('#modal-container .modal').isVisible();
}

async function closeModal(page, label = null) {
  const btn = label
    ? page.locator(`#modal-container .btn:has-text("${label}")`).first()
    : page.locator('#modal-container .modal-footer-actions .btn-primary').first();
  if (await btn.count()) await btn.click();
  else await page.locator('#modal-container .modal-close').first().click().catch(()=>{});
  await page.waitForTimeout(700);
}

async function ensureNoModal(page) {
  const open = await page.evaluate(() => !document.getElementById('modal-container').hidden);
  if (open) {
    await page.evaluate(() => {
      const c = document.getElementById('modal-container');
      c.hidden = true;
      c.innerHTML = '';
    });
    await page.waitForTimeout(250);
  }
}

async function openMenu(page) {
  await ensureNoModal(page);
  await page.click('#btn-menu');
  await page.waitForTimeout(450);
}

async function goto(page, screen) {
  await openMenu(page);
  await page.click(`#side-menu .menu-item[data-screen="${screen}"]`);
  await page.waitForTimeout(700);
}

const server = spawn('python3', ['-m', 'http.server', String(PORT)], { stdio: 'ignore' });
server.on('error', (err) => {
    console.error('Failed to start static server:', err.message);
    process.exit(1);
});
await new Promise(r => setTimeout(r, 1000));

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  // ---------- MOBILE ----------
  let page = await newPage(browser, { width: 390, height: 844 });
  ok('boot shows login', await page.locator('#login-screen').isVisible());

  // validation
  await page.click('#login-btn');
  await page.waitForTimeout(200);
  ok('login validation shows errors', (await page.locator('.form-error').filter({ hasText: /wajib|diperlukan/ }).count()) >= 3);

  await login(page);
  ok('login enters game', await page.locator('#game-container').isVisible());
  ok('welcome modal shown', await page.locator('#modal-container .modal').isVisible());

  await page.click('text=Mulai dari B1');
  await page.waitForTimeout(800);
  ok('practice opens question', await page.locator('.question-card').isVisible());

  const stem1 = await page.locator('#question-stem').innerText();
  ok('question stem non-empty', stem1.length > 10, stem1.slice(0, 40));

  // hint + feedback
  const hintBtn = page.locator('#btn-hint');
  if (await hintBtn.count()) {
    await hintBtn.click();
    await page.waitForTimeout(250);
    ok('hint appears', (await page.locator('.hint-box').count()) > 0);
  }

  await page.locator('.option-btn').nth(0).click();
  await page.click('#btn-submit');
  await page.waitForTimeout(400);
  ok('feedback panel shown', await page.locator('#feedback-panel').isVisible());
  ok('feedback has explanation', (await page.locator('.feedback-explanation').innerText()).length > 5);
  await page.waitForTimeout(2200);

  const completed = await completePractice(page);
  ok('pra-cek completes with result modal', completed);
  const resultTitle = await page.locator('#modal-container .modal-header h3').innerText().catch(()=>'');
  ok('result modal titled', /Hasil|Boss/.test(resultTitle), resultTitle);
  await closeModal(page, 'Selesai');
  ok('returns to map', await page.locator('#game-canvas').isVisible());

  // click a building on the map (center-ish where a subtopic sits)
  const box = await page.locator('#game-canvas').boundingBox();
  let clickedBuilding = false;
  for (const [dx, dy] of [[0.3,0.3],[0.5,0.5],[0.7,0.35],[0.35,0.6],[0.6,0.65],[0.2,0.5],[0.8,0.5]]) {
    await page.mouse.click(box.x + box.width*dx, box.y + box.height*dy);
    await page.waitForTimeout(350);
    if (await page.locator('#modal-container .modal').isVisible()) { clickedBuilding = true; break; }
  }
  ok('map building click opens modal', clickedBuilding);
  if (clickedBuilding) {
    const modalTitle = await page.locator('#modal-container .modal-header h3').innerText();
    ok('subtopic modal has title', modalTitle.length > 3, modalTitle);
    const hasActions = await page.locator('#modal-container .modal-footer-actions .btn').count();
    ok('subtopic modal has 3 actions', hasActions === 3, String(hasActions));
    await page.locator('#modal-container .modal-close').click();
    await page.waitForTimeout(300);
  }

  // lessons
  await goto(page, 'lessons');
  const lessonCards = await page.locator('.lesson-card').count();
  ok('21 subtopic lesson cards', lessonCards === 21, String(lessonCards));
  await page.locator('.lesson-card').first().click();
  await page.waitForTimeout(600);
  ok('lesson detail has concept block', (await page.locator('.lesson-block').count()) >= 3);
  const lessonActions = await page.locator('.lesson-actions .btn').count();
  ok('lesson has 3 actions', lessonActions === 3, String(lessonActions));

  await page.locator('.lesson-actions .btn').nth(1).click();
  await page.waitForTimeout(800);
  ok('practice from lesson opens', await page.locator('.question-card').isVisible());
  await page.locator('#btn-exit-question').click();
  await page.waitForTimeout(400);
  if (await page.locator('#modal-container .modal').isVisible()) await closeModal(page, 'Keluar');
  await page.waitForTimeout(500);

  // arena
  await goto(page, 'arena');
  ok('arena lists 21 subtopics', (await page.locator('.arena-item').count()) === 21, String(await page.locator('.arena-item').count()));
  // start boss on B1
  const bossBtn = page.locator('.arena-item').first().locator('button:has-text("Boss")');
  await bossBtn.click();
  await page.waitForTimeout(800);
  ok('boss starts', await page.locator('.question-card').isVisible());
  const bossHints = await page.locator('#btn-hint').count();
  ok('boss has no hints', bossHints === 0);
  const bossDone = await completePractice(page, 10);
  ok('boss completes', bossDone);
  const bossText = await page.locator('#modal-container .modal-body').innerText().catch(()=> '');
  ok('boss result mentions L3', /L3/.test(bossText), bossText.slice(0, 80).replace(/\n/g,' '));
  await closeModal(page, 'Selesai');

  // tryout mini
  await goto(page, 'tryout');
  ok('tryout has 3 options', (await page.locator('.tryout-card').count()) === 3);
  await page.locator('.tryout-card').first().locator('button').click();
  await page.waitForTimeout(800);
  ok('CBT opens', await page.locator('.cbt').isVisible());
  ok('CBT has 10 nav buttons', (await page.locator('.cbt-nav-btn').count()) === 10);
  const timerText = await page.locator('#cbt-timer').innerText();
  ok('CBT timer runs', /\d{2}:\d{2}/.test(timerText), timerText);
  // answer 3, flag 1
  for (let i = 0; i < 3; i++) {
    await page.locator('.cbt-option').nth(i % 4).click();
    if (i === 0) await page.click('#cbt-flag');
    await page.click('#cbt-next');
    await page.waitForTimeout(150);
  }
  ok('CBT flag state visible', (await page.locator('.cbt-nav-btn.flagged').count()) === 1);
  ok('CBT answered state visible', (await page.locator('.cbt-nav-btn.answered').count()) >= 3);
  await page.click('#cbt-submit');
  await page.waitForTimeout(400);
  ok('submit asks confirmation', await page.locator('#modal-container .modal').isVisible());
  await closeModal(page, 'Kumpulkan');
  ok('report shows score', await page.locator('.report-score-value').isVisible());
  const reportScore = await page.locator('.report-score-value').innerText();
  ok('report score numeric', /^\d+$/.test(reportScore), reportScore);
  ok('report has domain rows', (await page.locator('.report-row').count()) === 3);
  ok('report lists missed questions', (await page.locator('.report-missed .review-item').count()) > 0);
  await closeModal(page, 'Tutup');
  ok('tryout history recorded', (await page.locator('.tryout-history-card').count()) === 1);

  // dashboard tabs
  await goto(page, 'profile');
  ok('dashboard hero', (await page.locator('.profile-hero').count()) === 1);
  ok('heatmap 21 cells', (await page.locator('.heatmap-cell').count()) === 21);
  await page.locator('.tab-btn').nth(1).click();
  await page.waitForTimeout(300);
  ok('parent tab has 3 suggestions', (await page.locator('.suggestion-list li').count()) === 3);
  await page.locator('.tab-btn').nth(2).click();
  await page.waitForTimeout(300);
  ok('teacher tab exists', (await page.locator('.misconception-bars, .panel-body').count()) > 0);

  // missions
  await goto(page, 'missions');
  ok('missions has 3 slots', (await page.locator('.mission-card').count()) === 3);
  ok('mission progress ring', (await page.locator('.mission-ring').count()) === 1);

  // mistakes
  await goto(page, 'mistakes');
  const mistakeCount = await page.locator('.mistake-card').count();
  ok('mistake book lists entries', mistakeCount > 0, String(mistakeCount));

  // shop
  await goto(page, 'shop');
  ok('shop has 6 items', (await page.locator('.shop-item').count()) === 6);
  const coinBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('educity_game_data')).progress.coins);
  const affordable = page.locator('.shop-item button:not([disabled])').first();
  if (await affordable.count()) {
    await affordable.click();
    await page.waitForTimeout(500);
    const coinAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('educity_game_data')).progress.coins);
    ok('shop purchase deducts coins', coinAfter < coinBefore, `${coinBefore} -> ${coinAfter}`);
    ok('shop item marked owned', (await page.locator('.shop-item.owned').count()) >= 1);
  } else {
    ok('shop purchase (insufficient coins path)', true, 'no affordable item');
  }

  // settings toggles
  await goto(page, 'settings');
  ok('settings has toggles', (await page.locator('.setting-row input[type=checkbox]').count()) === 4);
  await page.locator('#setting-reducedMotion').check();
  await page.waitForTimeout(300);
  ok('reduced motion class applied', await page.evaluate(() => document.body.classList.contains('reduced-motion')));
  await page.selectOption('#setting-font', 'large');
  await page.waitForTimeout(200);
  ok('font large applied', await page.evaluate(() => document.body.classList.contains('font-large')));

  // persistence
  const before = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('educity_game_data'));
    return { xp: d.progress.xp, mastery: Object.keys(d.mastery).length, mistakes: d.mistakeBook.length, tryouts: d.tryoutHistory.length, settings: d.settings.reducedMotion };
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(2200);
  ok('session persists across reload', await page.locator('#game-container').isVisible());
  const after = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('educity_game_data'));
    return { xp: d.progress.xp, mastery: Object.keys(d.mastery).length, mistakes: d.mistakeBook.length, tryouts: d.tryoutHistory.length, settings: d.settings.reducedMotion };
  });
  ok('progress persisted', JSON.stringify(before) === JSON.stringify(after), JSON.stringify(after));
  ok('reduced motion persisted', after.settings === true);

  // logout
  await openMenu(page);
  await page.click('#btn-logout');
  await page.waitForTimeout(400);
  await closeModal(page, 'Keluar');
  ok('logout returns to login', await page.locator('#login-screen').isVisible());

  // ---------- DESKTOP ----------
  page = await newPage(browser, { width: 1440, height: 900 });
  await login(page, 'Sari');
  ok('desktop login works', await page.locator('#game-container').isVisible());
  const bottomNavVisible = await page.locator('.bottom-nav').isVisible();
  ok('desktop hides bottom nav', bottomNavVisible === false);
  const canvasBox = await page.locator('#game-canvas').boundingBox();
  ok('desktop canvas sized', canvasBox.width > 800 && canvasBox.height > 400, `${canvasBox.width}x${canvasBox.height}`);
  await goto(page, 'lessons');
  ok('desktop lessons render', (await page.locator('.lesson-card').count()) === 21);

  await browser.close();

  console.log(results.join('\n'));
  const failures = results.filter(r => r.startsWith('FAIL'));
  console.log('\nFAILURES:', failures.length);
  console.log('ERRORS:', errors.length ? [...new Set(errors)].join('\n') : 'none');
  server.kill();
  process.exit(failures.length === 0 && errors.length === 0 ? 0 : 1);
})().catch((err) => {
  console.error('E2E crashed:', err.message);
  server.kill();
  process.exit(1);
});
