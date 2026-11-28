import pw from '/opt/node-tools/node_modules/playwright/index.js';
const { chromium } = pw;
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, 'index.html');
const outPath = path.join(__dirname, 'Roland-AI-x-NGCX.pdf');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + htmlPath);

// Alle Folien untereinander sichtbar machen, je eine Druckseite
await page.addStyleTag({
  content: `
    @page { size: 1280px 720px; margin: 0; }
    html, body { background: #0b1320; }
    .deck { position: static; width: 1280px; height: auto; overflow: visible; display: block; }
    .slide { position: static; display: flex !important; width: 1280px; height: 720px; page-break-after: always; break-after: page; }
    .progress-rail { display: none; }
  `
});

await page.pdf({
  path: outPath,
  width: '1280px',
  height: '720px',
  printBackground: true,
  margin: { top: '0', bottom: '0', left: '0', right: '0' }
});

await browser.close();
console.log('PDF geschrieben:', outPath);
