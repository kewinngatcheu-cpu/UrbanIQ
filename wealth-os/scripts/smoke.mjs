// Smoke-Test: lädt alle Seiten im Browser, prüft auf Laufzeitfehler und macht Screenshots.
// Nutzung: BASE_URL=http://localhost:3000 node scripts/smoke.mjs [--mobile] [pfad,pfad]
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? "screenshots";
const mobile = process.argv.includes("--mobile");
const only = process.argv.slice(2).find((a) => a.startsWith("/"));
const PAGES = only ? only.split(",") : ["/", "/budget", "/transactions", "/recurring", "/wealth", "/property", "/forecast", "/intelligence", "/monthly", "/debts", "/goals", "/integrations", "/settings"];

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext(mobile ? { ...devices["iPhone 15"] } : { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`${page.url()} pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`${page.url()} console: ${m.text()}`));
for (const p of PAGES) {
  await page.goto(BASE + p, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800); // Diagramm-Animationen abwarten
  const name = (p === "/" ? "dashboard" : p.slice(1)) + (mobile ? "-mobile" : "");
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  const h1 = await page.locator("h1").first().textContent().catch(() => null);
  console.log(`${p} → h1: ${h1}`);
}
await browser.close();
if (errors.length) {
  console.error("FEHLER:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("OK – keine Laufzeitfehler");
