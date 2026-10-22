import { chromium } from 'playwright';
const out = process.argv[2];
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1100, height: 560 }, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:5178/tools/morph.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const r = await page.evaluate(() => new Promise(res => {
  const b = document.querySelector('.b'); const t0 = performance.now(); let last = t0; const times = [];
  function f(now) {
    const p = (now - t0) / 2000;
    b.style.setProperty('--bx', (440 + Math.sin(p * Math.PI * 2) * 110) + 'px');
    times.push(now - last); last = now;
    if (now - t0 < 2000) requestAnimationFrame(f);
    else { const s = times.slice(2).sort((a, b) => a - b); res({ frames: times.length, median: s[s.length >> 1].toFixed(1), p95: s[Math.floor(s.length * .95)].toFixed(1) }); }
  }
  requestAnimationFrame(f);
}));
console.log(JSON.stringify(r));
// mid-animation frames
await page.evaluate(() => {
  const b = document.querySelector('.b'); const t0 = performance.now();
  (function f(now) { b.style.setProperty('--bx', (440 + Math.sin((now - t0) / 2000 * Math.PI * 2) * 110) + 'px'); requestAnimationFrame(f); })(t0);
});
for (let i = 0; i < 4; i++) { await page.waitForTimeout(170); await page.screenshot({ path: `${out}-${i}.png`, clip: { x: 120, y: 120, width: 880, height: 300 } }); }
await browser.close();
