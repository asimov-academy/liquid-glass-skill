// Renders tools/wallpapers.html scenes into examples/assets/*.jpg
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../examples/assets');
const names = process.argv.slice(2).length ? process.argv.slice(2) : ['dunes', 'aurora', 'bokeh', 'mist'];

const browser = await chromium.launch(process.env.CH ? { channel: process.env.CH } : {});
const page = await browser.newPage({ viewport: { width: 2400, height: 1600 } });
for (const n of names) {
  await page.goto('file://' + path.join(here, 'wallpapers.html') + '#' + n);
  await page.reload();
  await page.waitForFunction(() => document.title.startsWith('done:'));
  await page.locator('canvas').screenshot({ path: path.join(out, n + '.jpg'), type: 'jpeg', quality: 80 });
  console.log('wrote', n);
}
await browser.close();
