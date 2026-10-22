// Drives real pointer interactions and captures mid-gesture frames.
import { chromium, webkit } from 'playwright';
const which = process.argv[2] || 'chrome', base = process.argv[3], out = process.argv[4];
const type = which === 'webkit' ? webkit : chromium;
const browser = await type.launch(which === 'chrome' ? { channel: 'chrome' } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1.5 });
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
async function shot(sel, name) { await page.locator(sel).first().screenshot({ path: `${out}/${which}-${name}.png` }); console.log('saved', name); }

// 1) tab bar: press on first tab and drag toward the third
const tabs = page.locator('#tabbar .phone-bottom [role=tab]');
await tabs.first().scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
const a = await tabs.nth(0).boundingBox(), b = await tabs.nth(2).boundingBox();
await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
await page.mouse.down();
for (let i = 1; i <= 10; i++) { await page.mouse.move(a.x + a.width / 2 + (b.x - a.x) * i / 14, a.y + a.height / 2); await page.waitForTimeout(16); }
await page.waitForTimeout(120);
await shot('#tabbar .phone', 'tab-drag');
await page.mouse.up();
await page.waitForTimeout(700);
await shot('#tabbar .phone-bottom', 'tab-after');

// 2) switch: press and hold
const sw = page.locator('#controles .lg-switch').nth(2);
await sw.scrollIntoViewIfNeeded();
const s = await sw.boundingBox();
await page.mouse.move(s.x + 15, s.y + s.height / 2);
await page.mouse.down();
await page.waitForTimeout(350);
await shot('#controles .cc', 'switch-press');
await page.mouse.move(s.x + s.width - 6, s.y + s.height / 2, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(600);
await shot('#controles .cc', 'switch-after');

// 3) slider drag
const sl = page.locator('#controles .lg-slider').first();
const l = await sl.boundingBox();
await page.mouse.move(l.x + l.width * 0.6, l.y + l.height / 2);
await page.mouse.down();
await page.mouse.move(l.x + l.width * 0.35, l.y + l.height / 2, { steps: 5 });
await page.waitForTimeout(250);
await shot('#controles .cc', 'slider-drag');
await page.mouse.up();

// 4) menu
const trig = page.locator('#toolbar .lg-menu > button');
await trig.scrollIntoViewIfNeeded();
await trig.click();
await page.waitForTimeout(700);
await shot('#toolbar .stage', 'menu-open');

// 5) button press glow
const btn = page.locator('#botoes .lg-button').nth(1);
await btn.scrollIntoViewIfNeeded();
const bb = await btn.boundingBox();
await page.mouse.move(bb.x + bb.width * 0.3, bb.y + bb.height / 2);
await page.mouse.down();
await page.mouse.move(bb.x + bb.width * 0.3 + 30, bb.y + bb.height / 2 + 10, { steps: 6 });
await page.waitForTimeout(250);
await shot('#botoes .btn-grid', 'button-press');
await page.mouse.up();
await browser.close();
