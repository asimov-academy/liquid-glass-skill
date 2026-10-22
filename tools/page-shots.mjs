// Captures the hero + each demo section of index.html
import { chromium, webkit } from 'playwright';
const [, , which = 'chrome', out = 'shots', w = 1280, h = 820] = process.argv;
const type = which === 'webkit' ? webkit : chromium;
const browser = await type.launch(which === 'chrome' ? { channel: 'chrome' } : {});
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1.5 });
const logs = [];
page.on('console', m => { if (['error', 'warning'].includes(m.type()) && !/404/.test(m.text())) logs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => logs.push('pageerror: ' + e.message));
await page.goto('http://127.0.0.1:5178/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}-hero.png` });
const ids = ['superficie', 'botoes', 'toolbar', 'tabbar', 'controles', 'progressive', 'lupa', 'morph', 'playground', 'como-funciona', 'skill'];
for (const id of ids) {
  await page.evaluate(i => { const e = document.getElementById(i); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 70); }, id);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}-${id}.png` });
}
console.log(logs.join('\n') || 'no console errors');
await browser.close();
