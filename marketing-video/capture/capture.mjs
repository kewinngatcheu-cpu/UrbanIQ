/**
 * Captures crisp (2x) screenshots of the REAL ONE app for the film.
 * Run after seed.mjs. Output: marketing-video/assets/screens/*.png
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = new URL("../assets/screens/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const [INSURANCE, ACTION] = [process.env.INSURANCE_URL, process.env.ACTION_URL];

// Purely cosmetic for the film: hide the local "AI demo mode" developer hint, the Next dev badge and scrollbars.
const CLEAN = `nextjs-portal{display:none!important} ::-webkit-scrollbar{display:none} .border-dashed.bg-lavender\\/60{display:none!important}`;

const browser = await chromium.launch();
async function session(viewport, scale) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale, timezoneId: "Europe/Berlin", locale: "en-GB" });
  const p = await ctx.newPage();
  await p.goto(BASE + "/login"); await p.waitForLoadState("networkidle");
  await p.fill("#email", process.env.EMAIL ?? "demo@one.app");
  await p.fill("#password", process.env.PASSWORD ?? "DemoPassw0rd2026");
  await p.click('button[type="submit"]:has-text("Sign in")');
  await p.waitForURL(/\/app/);
  return p;
}
async function shot(p, path, name, opts = {}) {
  await p.goto(path.startsWith("http") ? path : BASE + path); await p.waitForLoadState("networkidle");
  await p.addStyleTag({ content: CLEAN });
  await p.evaluate(() => {
    // Hide local-demo developer hints (they disappear anyway once an AI key is configured).
    const pats = [/running without an AI model/, /^AI demo mode/, /^Demo mode: no AI/, /\(no AI\)/, /^Rule-based$/];
    const hit = (el) => pats.some((r) => r.test((el.textContent || "").trim()));
    for (const el of [...document.querySelectorAll("p, span, div")]) {
      if (!hit(el) || [...el.children].some(hit)) continue; // innermost match only
      let box = el;
      // climb to the notice box as long as it contains nothing but this hint
      while (box.parentElement && box.parentElement.textContent.trim() === box.textContent.trim() && box.parentElement.tagName !== "MAIN") box = box.parentElement;
      box.style.display = "none";
    }
  });
  await p.waitForTimeout(700);
  await p.screenshot({ path: OUT + name + ".png", fullPage: !!opts.full });
  console.log("✓", name);
}

const d = await session({ width: 1440, height: 900 }, 2);
await shot(d, "/app", "dashboard");
await shot(d, "/app", "dashboard-full", { full: true });
await shot(d, "/app/memory", "memory");
await shot(d, "/app/memory?q=insurance", "memory-search");
await shot(d, INSURANCE, "document");
await shot(d, INSURANCE, "document-full", { full: true });
await shot(d, "/app/action", "action");
await shot(d, ACTION, "action-detail");
await shot(d, ACTION, "action-detail-full", { full: true });
await shot(d, "/app/life", "life");
await shot(d, "/app/life?view=week", "life-week");
await shot(d, "/app/intelligence", "intelligence");
await shot(d, "/app/intelligence", "intelligence-full", { full: true });
await shot(d, "/", "landing");

const m = await session({ width: 390, height: 844 }, 3);
await shot(m, "/app", "m-dashboard");
await shot(m, "/app/memory", "m-memory");
await shot(m, INSURANCE, "m-document");
await shot(m, "/app/life", "m-life");
await shot(m, ACTION, "m-action");
await shot(m, "/app/intelligence", "m-intelligence");
await browser.close();
