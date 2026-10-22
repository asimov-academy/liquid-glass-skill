// Screenshot helper: node shots.mjs <browser> <url> <out.png> [w h] [clipX clipY clipW clipH] [--eval "js"]
import { chromium, webkit, firefox } from 'playwright';
const [, , which = 'chrome', url, out = 'shot.png', w = 1200, h = 800, ...rest] = process.argv;
const evalIdx = rest.indexOf('--eval');
const js = evalIdx >= 0 ? rest.splice(evalIdx, 2)[1] : null;
const clip = rest.length >= 4 ? { x: +rest[0], y: +rest[1], width: +rest[2], height: +rest[3] } : undefined;
const type = { chrome: chromium, chromium, webkit, firefox }[which];
const browser = await type.launch(which === 'chrome' ? { channel: 'chrome' } : {});
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(process.env.DPR || 2) });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.type(), m.text()); });
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
if (js) { const r = await page.evaluate(js); if (r !== undefined) console.log(JSON.stringify(r)); await page.waitForTimeout(700); }
await page.screenshot({ path: out, clip });
await browser.close();
console.log('saved', out);
