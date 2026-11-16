// Screenshots aller Seiten + Prüfung auf Laufzeitfehler. Nutzung: BASE_URL=… node scripts/shots.mjs [--mobile] [--light]
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? "screenshots";
const mobile = process.argv.includes("--mobile");
const light = process.argv.includes("--light");
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext(mobile ? { ...devices["iPhone 15"], colorScheme: light ? "light" : "dark" } : { viewport: { width: 1400, height: 950 }, colorScheme: light ? "light" : "dark" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
for (const p of ["/", "/ausgaben", "/ausgaben?ansicht=monat", "/sparziele", "/sparziele/immobilie", "/vermoegen", "/einstellungen"]) {
  await page.goto(BASE + p, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const name = (p === "/" ? "dashboard" : p.slice(1).replace(/[/?=]/g, "-")) + (mobile ? "-mobile" : "") + (light ? "-light" : "");
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log(p, "→", await page.locator("h1").first().textContent());
}
await browser.close();
if (errors.length) (console.error(errors.join("\n")), process.exit(1));
console.log("OK");
