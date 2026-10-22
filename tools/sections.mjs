// node sections.mjs <browser> <url> <outdir> <selector...>  — element screenshots
import { chromium, webkit, firefox } from 'playwright';
const [, , which, url, outdir, ...sels] = process.argv;
const type = { chrome: chromium, chromium, webkit, firefox }[which];
const browser = await type.launch(which === 'chrome' ? { channel: 'chrome' } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1.5 });
page.on('pageerror', e => console.log('[pageerror]', e.message));
page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) console.log('[console]', m.text()); });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
for (const s of sels) {
  const el = page.locator(s).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const f = `${outdir}/${which}-${s.replace(/[^a-z0-9]/gi, '')}.png`;
  await el.screenshot({ path: f });
  console.log('saved', f);
}
await browser.close();
