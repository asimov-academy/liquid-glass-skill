import { chromium, webkit } from 'playwright';
const [, , which = 'chrome', out] = process.argv;
const type = which === 'webkit' ? webkit : chromium;
const b = await type.launch(which === 'chrome' ? { channel: 'chrome' } : {});
const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
const logs = [];
p.on('pageerror', e => logs.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') logs.push(m.text()); });
await p.goto('http://127.0.0.1:5178/index.html', { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
const shot = async (sel, name) => { const c = p.locator(sel).first(); await c.scrollIntoViewIfNeeded(); await p.waitForTimeout(150); await c.screenshot({ path: `${out}/${which}-${name}.png` }); };
const cell = i => `.cell >> nth=${i}`;
// player
await p.locator('#play').scrollIntoViewIfNeeded(); await p.click('#play'); await p.click('#like'); await p.waitForTimeout(900);
await shot(cell(0), 'c-player');
// customize: dark + clear on player stage
await p.locator('.cell').nth(0).locator('.custom button').first().click(); await p.waitForTimeout(400);
await shot(cell(0), 'c-custom-open');
await p.locator('.cell').nth(0).locator('[data-k="dark"]').click(); await p.waitForTimeout(600);
await shot(cell(0), 'c-custom-dark');
// buttons
await p.click('#go'); await p.click('#count'); await p.click('#count'); await p.waitForTimeout(250);
await shot(cell(1), 'c-buttons');
// toolbar
await p.click('#tb-play'); await p.click('[data-fmt="bold"]'); await p.click('[data-fmt="italic"]'); await p.waitForTimeout(300);
await shot(cell(2), 'c-toolbar');
// segmented
await p.locator('#seg [role=tab]').nth(1).click(); await p.waitForTimeout(800);
await shot(cell(3), 'c-seg');
// menu
await p.locator('#menu1 > button').click(); await p.waitForTimeout(700);
await shot(cell(4), 'c-menu');
await p.locator('#menu1 [data-value="fav"]').click(); await p.waitForTimeout(300);
// switches
await p.locator('#sw-stage .lg-switch').nth(0).click(); await p.locator('#sw-stage .lg-switch').nth(2).click(); await p.waitForTimeout(800);
await shot(cell(6), 'c-switch');
// notifications
await p.click('#notify'); await p.click('#notify'); await p.waitForTimeout(900);
await shot(cell(7), 'c-notes');
await p.locator('.note').last().click(); await p.waitForTimeout(900);
await shot(cell(7), 'c-notes-expanded');
// control center volume
const v = await p.locator('#cc-vol').boundingBox(); await p.locator('#cc-vol').scrollIntoViewIfNeeded();
const vb = await p.locator('#cc-vol').boundingBox();
await p.mouse.move(vb.x + vb.width / 2, vb.y + vb.height * 0.6); await p.mouse.down(); await p.mouse.move(vb.x + vb.width / 2, vb.y + vb.height * 0.2, { steps: 6 }); await p.mouse.up();
await p.waitForTimeout(400);
await shot(cell(8), 'c-cc');
// dock
await p.locator('#dock .app-icon').nth(2).scrollIntoViewIfNeeded();
const di = await p.locator('#dock .app-icon').nth(2).boundingBox(); await p.mouse.move(di.x + 20, di.y + 20); await p.waitForTimeout(300);
await p.locator('#dock .app-icon').nth(2).click(); await p.waitForTimeout(900);
await shot(cell(9), 'c-dock');
// sheet
await p.click('#open-sheet'); await p.waitForTimeout(900);
await shot(cell(10), 'c-sheet');
// search
await p.click('#search'); await p.waitForTimeout(700); await p.keyboard.type('ma'); await p.waitForTimeout(500);
await shot(cell(11), 'c-search');
// app tabs
await p.locator('#app-tabs [role=tab]').nth(2).click(); await p.waitForTimeout(800);
await shot(cell(12), 'c-app');
// morph
await p.locator('#morph-add').scrollIntoViewIfNeeded(); await p.click('#morph-add'); await p.waitForTimeout(900);
await shot(cell(13), 'c-morph');
// install
await p.locator('#install-tabs [role=tab]').nth(2).click(); await p.waitForTimeout(500);
await shot(cell(15), 'c-install');
console.log(logs.join('\n') || 'no errors');
await b.close();
