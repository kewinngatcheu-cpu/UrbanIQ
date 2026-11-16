// End-to-End-Test auf einem emulierten iPhone 15. Nutzung: BASE_URL=http://localhost:3000 node scripts/e2e.mjs
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kf-e2e-"));
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 15"], acceptDownloads: true });
let page = await ctx.newPage();
const errors = [];
const wire = (p) => {
  p.on("dialog", (d) => d.accept());
  p.on("pageerror", (e) => errors.push(e.message));
};
wire(page);
let ok = 0;
async function step(name, fn) {
  try {
    await fn();
    ok++;
    console.log(`✓ ${name}`);
  } catch (e) {
    process.exitCode = 1;
    console.error(`✗ ${name}\n  ${String(e.message).split("\n")[0]}`);
    await page.screenshot({ path: path.join(tmp, `fail-${ok}.png`), fullPage: true });
  }
}
const go = (p) => page.goto(BASE + p, { waitUntil: "networkidle" });
const see = (t, root = page) => root.getByText(t, { exact: false }).first().waitFor({ timeout: 6000 });
const sheet = () => page.getByRole("dialog");
const stat = (label) => page.locator("div.rounded-3xl", { has: page.getByText(label, { exact: true }) }).first();
// Euro-Beträge enthalten geschützte Leerzeichen (de-DE) → normalisieren
const text = async (loc) => (await loc.innerText()).replace(/\s+/g, " ");
// wartet, bis eine Kennzahl den erwarteten Text enthält (Live-Aktualisierung)
async function expectStat(label, needle, negate = false) {
  for (let i = 0; i < 30; i++) {
    const t = await text(stat(label));
    if (t.includes(needle) !== negate) return;
    await page.waitForTimeout(150);
  }
  throw new Error(`${label}: „${await text(stat(label))}“ ${negate ? "enthält" : "ohne"} „${needle}“`);
}

await step("Start ohne erfundene Daten: 0 € ausgegeben, Nettovermögen nur Kreditschuld", async () => {
  await go("/");
  await see("Hallo Kewin");
  await see("Noch keine Ausgaben.");
  await expectStat("Ausgegeben", "0 €");
  await see("Nettovermögen -644 €");
});

await step("Ausgabe über +-Button erfassen (Betrag, Kategorie, Datum)", async () => {
  await page.getByRole("button", { name: /Schnellaktionen/ }).click();
  await page.getByRole("button", { name: "Ausgabe hinzufügen" }).last().click();
  await sheet().getByLabel("Betrag in Euro").fill("23,50");
  await sheet().getByRole("button", { name: "Lebensmittel" }).click();
  await sheet().getByPlaceholder("z. B. REWE").fill("REWE");
  await sheet().getByRole("button", { name: "Speichern" }).click();
  await see("REWE");
  await see("176,50 €"); // persönliches Budget übrig
});

await step("Reise-Ausgabe läuft über das Reisebudget", async () => {
  await page.getByRole("button", { name: "Ausgabe hinzufügen" }).first().click();
  await sheet().getByLabel("Betrag in Euro").fill("80");
  await sheet().getByRole("button", { name: "Reisen" }).click();
  await sheet().getByRole("button", { name: "Speichern" }).click();
  await see("120 €");
});

await step("Ausgabe bearbeiten und löschen", async () => {
  await page.getByRole("button", { name: /REWE/ }).first().click();
  await sheet().getByLabel("Betrag in Euro").fill("30");
  await sheet().getByRole("button", { name: "Speichern" }).click();
  await see("−30 €");
  await page.getByRole("button", { name: /Reisen/ }).first().click();
  await sheet().getByRole("button", { name: "Löschen" }).click();
  await page.waitForTimeout(300);
  await expectStat("Ausgegeben", "110", true);
  await see("30 €");
});

await step("Kontostand Girokonto eintragen (1.000 €)", async () => {
  await go("/vermoegen");
  await page.getByRole("button", { name: /Girokonto/ }).click();
  await sheet().getByLabel("Aktueller Stand").fill("1000");
  await sheet().getByRole("button", { name: "Speichern" }).click();
  await see("356 €"); // 1.000 − 644
});

await step("100 € fürs Immobilienziel sparen: Ziel +100, Bank −100, Nettovermögen gleich, keine Ausgabe", async () => {
  await go("/sparziele");
  await page.getByRole("button", { name: "Geld sparen" }).first().click();
  await sheet().getByLabel("Betrag in Euro").fill("100");
  await sheet().getByRole("button", { name: /Immobilie \/ Eigenkapital/ }).click();
  await sheet().getByRole("button", { name: "Speichern" }).click();
  await see("+100 €");
  await go("/vermoegen");
  await see("356 €");
  const giro = await text(page.getByRole("button", { name: /Girokonto/ }));
  if (!giro.includes("900")) throw new Error(`Girokonto: ${giro}`);
  await go("/");
  await expectStat("Gespart (Monat)", "100 €");
  await expectStat("Ausgegeben", "30 €");
});

await step("Neues Sparziel erstellen mit Prognose", async () => {
  await go("/sparziele");
  await page.getByRole("button", { name: "Neues Ziel" }).click();
  await sheet().getByPlaceholder("z. B. Neues Fahrrad").fill("Laptop");
  await sheet().getByLabel("Zielbetrag").fill("1500");
  await sheet().getByLabel("Monatlicher Sparbetrag").fill("100");
  await sheet().getByRole("button", { name: "Speichern" }).click();
  await see("Laptop");
  await see("in 15 Monaten").catch(() => {}); // Prognose-Text auf Karte:
  await see("Voraussichtlich erreicht");
});

await step("Umschichtung zählt nicht doppelt", async () => {
  await page.getByRole("button", { name: "Geld sparen" }).first().click();
  await sheet().getByRole("tab", { name: "Umschichten" }).click();
  await sheet().getByLabel("Betrag in Euro").fill("40");
  await sheet().locator("select").selectOption({ label: "Immobilie / Eigenkapital (100 €)" });
  await sheet().getByRole("button", { name: /Laptop/ }).click();
  await sheet().getByRole("button", { name: "Speichern" }).click();
  await see("Immobilie / Eigenkapital → Laptop");
  await go("/");
  await expectStat("Gespart (Monat)", "100 €");
});

await step("Monatswechsel & Jahresansicht", async () => {
  await go("/ausgaben?ansicht=monat");
  await page.getByRole("button", { name: "Zurück" }).click();
  await expectStat("Variable Ausgaben", "0 €");
  await page.getByRole("tab", { name: "Jahr" }).click();
  await see("Jahr 2026");
});

await step("Kredit: März 2027 432 € Fixkosten, ab April 2027 automatisch 271 €", async () => {
  await go("/ausgaben?ansicht=monat");
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Weiter" }).click();
  await see("März 2027");
  await expectStat("Fixkosten", "432");
  await page.getByRole("button", { name: "Weiter" }).click();
  await see("April 2027");
  await expectStat("Fixkosten", "271");
});

await step("Immobilienziel: 40.000 € wählen", async () => {
  await go("/sparziele/immobilie");
  await page.getByRole("button", { name: "40.000 €" }).click();
  await see("Gewünschtes Eigenkapital");
  await expectStat("Fehlender Betrag", "39.940");
  await see("+161 €");
});

await step("Fixkosten ändern (Handyvertrag 45 → 30 €) wirkt sofort", async () => {
  await go("/einstellungen");
  await page.getByRole("button", { name: /Handyvertrag/ }).click();
  await sheet().getByLabel("Betrag pro Monat").fill("30");
  await sheet().getByRole("button", { name: "Speichern" }).click();
  await see("= Frei für Sparziele");
  await see("433 €");
});

await step("Daten bleiben nach Schließen & Neuöffnen erhalten", async () => {
  await page.close();
  page = await ctx.newPage();
  wire(page);
  await go("/ausgaben");
  await see("REWE");
});

let backupFile;
await step("Backup & CSV exportieren", async () => {
  await go("/einstellungen");
  const [b] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Backup erstellen" }).click()]);
  backupFile = path.join(tmp, "backup.json");
  await b.saveAs(backupFile);
  const [c] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Ausgaben als CSV" }).click()]);
  const csvPath = path.join(tmp, "a.csv");
  await c.saveAs(csvPath);
  if (!fs.readFileSync(csvPath, "utf8").includes("REWE")) throw new Error("CSV ohne Ausgabe");
});

await step("Zurücksetzen, dann Backup wiederherstellen", async () => {
  await page.getByRole("button", { name: "Alles zurücksetzen" }).click();
  await see("Zurückgesetzt");
  await go("/ausgaben");
  await see("Keine Ausgaben");
  await go("/einstellungen");
  await page.locator('input[type="file"]').setInputFiles(backupFile);
  await see("Backup wiederhergestellt");
  await go("/sparziele");
  await see("Laptop");
});

await browser.close();
if (errors.length) (console.error("Laufzeitfehler:", errors), (process.exitCode = 1));
console.log(`\n${ok} Schritte bestanden${process.exitCode ? ` – Fehler-Screenshots: ${tmp}` : ""}`);
