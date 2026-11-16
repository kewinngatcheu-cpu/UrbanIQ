// End-to-End-Test der wichtigsten Abläufe im echten Browser.
// Nutzung: BASE_URL=http://localhost:3000 node scripts/e2e.mjs
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wealth-e2e-"));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on("dialog", (d) => d.accept());
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
let passed = 0;
async function step(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}\n  ${e.message.split("\n")[0]}`);
    await page.screenshot({ path: path.join(tmp, `fail-${passed}.png`), fullPage: true });
    process.exitCode = 1;
  }
}
const expectText = async (text) => page.getByText(text, { exact: false }).first().waitFor({ timeout: 8000 });
const go = (p) => page.goto(BASE + p, { waitUntil: "networkidle" });

await step("Start mit Demo-Daten (gekennzeichnet)", async () => {
  await go("/");
  await expectText("DEMO-DATEN");
});

await step("Mit echten Planwerten starten → kein Demo-Banner, Ist-Werte fehlen", async () => {
  await go("/settings");
  await page.getByRole("button", { name: "Mit echten Daten starten" }).click();
  await expectText("Gestartet mit deinen echten Planwerten");
  await go("/");
  if (await page.getByText("DEMO-DATEN").count()) throw new Error("Demo-Banner noch sichtbar");
  await expectText("keine Buchungen");
});

await step("Budgetplan aus Briefing: 432 € Fixkosten, 418 € frei", async () => {
  await go("/budget");
  await expectText("432 €");
  await expectText("418 €");
});

await step("Transaktion manuell erfassen (Auto-Kategorie)", async () => {
  await go("/transactions");
  await page.getByRole("button", { name: "Neu" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.locator('input[type="number"]').fill("23.45");
  await dlg.getByPlaceholder("z. B. REWE").fill("REWE Markt");
  if ((await dlg.locator("select").first().inputValue()) !== "Lebensmittel") throw new Error("Kategorie nicht vorgeschlagen");
  await dlg.getByRole("button", { name: "Speichern" }).click();
  await expectText("REWE Markt");
});

await step("Soll-Ist: Lebensmittel Ist 23 € im Budget", async () => {
  await go("/budget");
  const row = page.locator("tr", { hasText: "Lebensmittel" });
  await row.getByText("23 €").waitFor({ timeout: 5000 });
});

await step("CSV-Import mit Vorspann, Duplikaterkennung", async () => {
  const csv = path.join(tmp, "konto.csv");
  const m = new Date().toISOString().slice(0, 7).split("-");
  fs.writeFileSync(csv, `Umsätze Girokonto\n\nBuchungstag;Verwendungszweck;Betrag\n02.${m[1]}.${m[0]};Gehalt;1.400,00\n05.${m[1]}.${m[0]};Spotify AB;-10,00\n06.${m[1]}.${m[0]};Kino Babylon;-9,50\n`);
  await go("/transactions");
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles(csv);
  await page.getByRole("button", { name: /3 Buchungen importieren/ }).click();
  await expectText("3 Buchungen importiert");
  await page.getByRole("button", { name: "Fertig" }).click();
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles(csv);
  await expectText("3 Duplikate");
  await page.keyboard.press("Escape");
});

await step("Immobilie: Kaufpreis 150.000 € Berlin → Gesamtkosten 167.355 €", async () => {
  await go("/property");
  const price = page.locator("label", { hasText: "Kaufpreis" }).locator("input");
  await price.fill("150000");
  await expectText("167.355 €");
});

await step("Brandenburg: Grunderwerbsteuer 6,5 % übernommen", async () => {
  await page.locator("label", { hasText: "Region" }).locator("select").selectOption("brandenburg");
  await page.waitForTimeout(300);
  const v = await page.locator("label", { hasText: "Grunderwerbsteuer" }).locator("input").inputValue();
  if (v !== "6.5") throw new Error(`GrESt = ${v}`);
});

await step("Fixkosten: Kredit endet März 2027, Timeline zeigt +161 € ab April 2027", async () => {
  await go("/recurring");
  await page.getByRole("tab", { name: "Zukünftige Änderungen" }).click();
  await expectText("April 2027");
  await expectText("+161 €");
});

await step("Monats-Check: offene Fixkosten buchen", async () => {
  await go("/monthly");
  await page.getByRole("button", { name: "Alle buchen" }).click();
  await expectText("Alle fälligen Zahlungen sind gebucht");
});

await step("Einzahlung ins Immobilien-Eigenkapital", async () => {
  await go("/wealth");
  await page.getByRole("button", { name: "Einzahlung" }).first().click();
  const dlg = page.getByRole("dialog");
  await dlg.locator("select").selectOption({ label: "Immobilien-Eigenkapital (Tagesgeld)" });
  await dlg.locator('input[type="number"]').fill("500");
  await dlg.getByRole("button", { name: "Speichern" }).click();
  await page.locator("section", { hasText: "B · Immobilien-Eigenkapital" }).getByText("500 €").first().waitFor({ timeout: 5000 });
});

let backupFile;
await step("Backup exportieren", async () => {
  await go("/settings");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Komplett-Backup/ }).click()]);
  backupFile = path.join(tmp, "backup.json");
  await dl.saveAs(backupFile);
  const j = JSON.parse(fs.readFileSync(backupFile, "utf8"));
  if (!j.data.transactions.some((t) => t.description === "REWE Markt")) throw new Error("Transaktion fehlt im Backup");
});

await step("Excel-Export erzeugt .xlsx", async () => {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Excel" }).click()]);
  if (!dl.suggestedFilename().endsWith(".xlsx")) throw new Error(dl.suggestedFilename());
});

await step("Demo laden, dann Backup wiederherstellen", async () => {
  await page.getByRole("button", { name: "Demo-Daten laden" }).click();
  await expectText("Demo-Daten geladen");
  await page.locator('input[type="file"]').setInputFiles(backupFile);
  await expectText("Backup erfolgreich wiederhergestellt");
  await go("/transactions");
  await expectText("REWE Markt");
});

await step("Intelligence: Frage lokal beantworten, PDF-Bericht", async () => {
  await go("/intelligence");
  await page.getByRole("button", { name: "Wie hoch ist meine aktuelle Sparquote?" }).click();
  await expectText("Plan:");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Bericht als PDF" }).click()]);
  if (!dl.suggestedFilename().endsWith(".pdf")) throw new Error(dl.suggestedFilename());
});

await step("Prognose-Simulator reagiert auf Einkommen", async () => {
  await go("/forecast");
  const before = await page.locator("text=Nettovermögen").first().locator("..").innerText();
  await page.getByLabel("Netto-Einkommen heute").fill("2000");
  await page.waitForTimeout(300);
  const after = await page.locator("text=Nettovermögen").first().locator("..").innerText();
  if (before === after) throw new Error("Prognose unverändert");
});

await browser.close();
if (errors.length) {
  console.error("Laufzeitfehler:", errors);
  process.exitCode = 1;
}
console.log(`\n${passed} Schritte bestanden${process.exitCode ? " – FEHLER (Screenshots in " + tmp + ")" : ""}`);
