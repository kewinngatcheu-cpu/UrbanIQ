// Erzeugt die PDFs aus ./html/*.html mit Playwright/Chromium.
// Aufruf: node build_pdfs.js   (aus dem Ordner ngcx-dustin)
const path = require('path');
const { chromium } = require('playwright');

const docs = [
  ['01_Kooperationsvorschlag_Roland-AI', 'Kooperationsvorschlag · Roland AI'],
  ['02_Gespraechsleitfaden_2.Gespraech', 'Gesprächsleitfaden · nur intern'],
  ['03_NGCX_Pipeline-System_Playbook', 'Pipeline-System Playbook · nur intern'],
];

const font = 'font-family:Inter,sans-serif;-webkit-print-color-adjust:exact;';
const header = (label) => `
  <div style="${font}width:100%;font-size:7px;padding:0 16mm;display:flex;justify-content:space-between;align-items:center;color:#5E6675;letter-spacing:.18em;text-transform:uppercase;">
    <span style="font-weight:700;color:#08090B;letter-spacing:.2em;">NGCX <span style="color:#2F6BFF">Intelligence</span></span>
    <span>${label}</span>
  </div>`;
const footer = `
  <div style="${font}width:100%;font-size:7px;padding:0 16mm;display:flex;justify-content:space-between;color:#5E6675;letter-spacing:.18em;text-transform:uppercase;">
    <span style="color:#2F6BFF;font-weight:600;">Know. Decide. Grow.</span>
    <span>Seite <span class="pageNumber"></span> / <span class="totalPages"></span></span>
  </div>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // Optional: nur bestimmte Dokumente bauen, z. B. `node build_pdfs.js 02`
  const only = process.argv.slice(2);
  for (const [name, label] of docs.filter(([n]) => !only.length || only.some((o) => n.startsWith(o)))) {
    await page.goto('file://' + path.join(__dirname, 'html', name + '.html'), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({
      path: path.join(__dirname, name + '.pdf'),
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: header(label),
      footerTemplate: footer,
      margin: { top: '18mm', bottom: '16mm', left: '16mm', right: '16mm' },
    });
    console.log('PDF erstellt:', name + '.pdf');
  }
  await browser.close();
})();
