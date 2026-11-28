import pw from '/opt/node-tools/node_modules/playwright/index.js';
const { chromium } = pw;
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, 'index.html');
const outDir = path.join(__dirname, 'slide_images');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
await page.goto('file://' + htmlPath);

const count = await page.evaluate(() => document.querySelectorAll('.slide').length);
for (let i = 0; i < count; i++) {
  await page.evaluate((idx) => {
    document.querySelectorAll('.slide').forEach((s, j) => s.classList.toggle('active', j === idx));
  }, i);
  const file = path.join(outDir, `slide_${String(i + 1).padStart(2, '0')}.png`);
  await page.screenshot({ path: file });
}

await browser.close();
console.log('Slide-Bilder geschrieben nach', outDir);
