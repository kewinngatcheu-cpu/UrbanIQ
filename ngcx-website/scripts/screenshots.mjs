// Screenshots aller Seiten in mehreren Breiten + Klicktest des Pipeline-Checks + Prüfung auf Fremd-Requests.
// Aufruf: node scripts/screenshots.mjs [BASIS-URL]   (Standard: http://127.0.0.1:4321)
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://127.0.0.1:4321';
const WIDTHS = (process.env.WIDTHS || '375,1440').split(',').map(Number);
const PAGES = ['/', '/pipeline-check', '/impressum', '/datenschutz', '/agb', '/gibt-es-nicht'];
fs.mkdirSync('screenshots', { recursive: true });

const browser = await chromium.launch();
const foreign = new Set();
const errors = [];
for (const w of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: w, height: w < 500 ? 812 : 900 } });
  page.on('request', (r) => { const u = new URL(r.url()); if (!['127.0.0.1', 'localhost'].includes(u.hostname) && u.protocol.startsWith('http')) foreign.add(r.url()); });
  page.on('pageerror', (e) => errors.push(`${w}px: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${w}px console: ${m.text()}`); });
  for (const p of PAGES) {
    await page.goto(BASE + p, { waitUntil: 'networkidle' });
    // Alle Reveal-Elemente sichtbar machen, damit der Ganzseiten-Screenshot vollständig ist
    await page.evaluate(async () => {
      document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in'));
      document.querySelectorAll('img[loading="lazy"]').forEach((i) => (i.loading = 'eager'));
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); }
      window.scrollTo(0, 0);
    });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) errors.push(`${w}px ${p}: horizontaler Überlauf ${overflow}px`);
    await page.waitForTimeout(400);
    const name = (p === '/' ? 'start' : p.slice(1)).replace(/\//g, '_');
    await page.screenshot({ path: `screenshots/${name}-${w}.png`, fullPage: true });
  }

  // Pipeline-Check komplett durchklicken
  await page.goto(BASE + '/pipeline-check', { waitUntil: 'networkidle' });
  await page.click('[data-action="begin"]');
  for (let q = 0; q < 12; q++) {
    await page.locator('#qopts .opt').nth(q % 3).click();
    await page.waitForTimeout(320);
  }
  await page.waitForSelector('#calc:not(.hidden)');
  const loss = await page.textContent('#loss-m');
  await page.click('[data-action="result"]');
  await page.waitForTimeout(1600);
  const score = await page.textContent('#score');
  const level = await page.textContent('#lvl-title');
  const cta = await page.textContent('#cta-area');
  const href = await page.getAttribute('#book', 'href');
  const areas = await page.locator('#areas .area').count();
  console.log(`${w}px Check: Rechner ${loss} | Score ${score}/24 | ${level} | Hebel: ${cta} | Bereiche ${areas} | Buchung ${href}`);
  await page.screenshot({ path: `screenshots/check-ergebnis-${w}.png`, fullPage: true });
  await page.close();
}
await browser.close();
console.log('Fremd-Requests:', foreign.size ? [...foreign] : 'keine');
console.log('Fehler:', errors.length ? errors : 'keine');
