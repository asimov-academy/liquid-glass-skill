// node fullpage.mjs <browser> <outdir> — hero + every cell
import { chromium, webkit } from 'playwright';
const [, , which = 'chrome', out] = process.argv;
const type = which === 'webkit' ? webkit : chromium;
const browser = await type.launch(which === 'chrome' ? { channel: 'chrome' } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => logs.push('pageerror: ' + e.message));
await page.goto('http://127.0.0.1:5178/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/${which}-00-hero.png` });
const n = await page.locator('.cell').count();
for (let i = 0; i < n; i++) {
  const c = page.locator('.cell').nth(i);
  await c.scrollIntoViewIfNeeded(); await page.waitForTimeout(700);
  await c.screenshot({ path: `${out}/${which}-${String(i + 1).padStart(2, '0')}.png` });
}
console.log(logs.join('\n') || 'no console errors');
await browser.close();
