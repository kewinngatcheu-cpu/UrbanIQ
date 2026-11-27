/**
 * End-to-end flow in an emulated iPhone (Playwright).
 *
 *   BASE_URL=http://localhost:3100 ADMIN_PASSWORD=… SHOTS=1 node scripts/e2e.mjs
 *
 * Requires a running server (npm run build && npm start) with a FRESH data store
 * (it regenerates links, starts the survey and resets the answers at the end).
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const PW = process.env.ADMIN_PASSWORD ?? "test-admin-pass-123";
const SHOTS = process.env.SHOTS === "1";
const OUT = process.env.SHOT_DIR ?? "screenshots";
if (SHOTS) mkdirSync(OUT, { recursive: true });

let failures = 0;
const seen = (loc) => loc.first().waitFor({ timeout: 8000 }).then(() => true, () => false);
const ok = (cond, msg) => {
  console.log(`${cond ? "✓" : "✗"} ${msg}`);
  if (!cond) failures++;
};
const shot = async (page, name, fullPage = false) => SHOTS && page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(page, path, body) {
  return page.evaluate(
    async ([p, b]) => {
      const r = await fetch(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
      return { status: r.status, json: await r.json().catch(() => ({})) };
    },
    [path, body],
  );
}

/** Answers every question generically; `v` varies the chosen options per person. */
async function fillSurvey(page, v, avoidText) {
  await page.getByRole("button", { name: /^(Start|Weiter)$/ }).click();
  for (let step = 1; step <= 15; step++) {
    await sleep(550);
    const section = page.locator("main section").first();
    // radio groups (single choice, quotes, either-or pairs)
    const groups = section.locator('[role="radiogroup"]');
    for (let g = 0; g < (await groups.count()); g++) {
      const radios = groups.nth(g).locator('[role="radio"]');
      const n = await radios.count();
      await radios.nth((v + g) % n).click();
    }
    // multi-choice blocks: the counter paragraph is followed by the options container
    const counters = section.locator("p", { hasText: /auswählen\s*\d+\/\d+$/ });
    for (let c = 0; c < (await counters.count()); c++) {
      const text = await counters.nth(c).innerText();
      const exact = text.match(/Genau (\d+)/);
      const range = text.match(/(\d+)–(\d+)/);
      const need = exact ? Number(exact[1]) : range ? Number(range[1]) : 1;
      const boxes = counters.nth(c).locator("xpath=following-sibling::div[1]").locator('[role="checkbox"]');
      const n = await boxes.count();
      for (let i = 0; i < need; i++) await boxes.nth((v * 2 + i) % n).click();
    }
    if (avoidText && (await section.locator("textarea").count())) await section.locator("textarea").fill(avoidText);
    if (step === 7 && v === 1) await section.locator('input[type="range"]').fill("9");
    await shot(page, `survey-${v}-q${String(step).padStart(2, "0")}`);
    await page.getByRole("button", { name: step === 15 ? "Prüfen" : "Weiter" }).click();
    await sleep(150);
    if (await page.locator('p[role="alert"]').count()) throw new Error(`Frage ${step} unvollständig`);
  }
  await sleep(600);
  await shot(page, `survey-${v}-review`, true);
  await page.getByRole("button", { name: "Abschicken" }).click();
  await page.getByRole("button", { name: "Endgültig abschicken" }).click();
  await page.waitForURL(/\/p\/[A-Za-z0-9_-]{43}\?sent=1/);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 14"] });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

try {
  // 1. Landing
  await page.goto(BASE);
  ok((await page.getByRole("heading", { level: 1 }).innerText()).includes("Our Summer"), "Landing: Hero sichtbar");
  ok(await seen(page.getByText("15 Questions · 2 Perspectives · 3 Destinations")), "Landing: Untertitel sichtbar");
  await sleep(1500);
  await shot(page, "01-landing");
  await shot(page, "01-landing-full", true);

  // 2. Admin
  await page.goto(`${BASE}/admin`);
  await page.getByLabel("Admin-Passwort").fill("wrong-password");
  await page.getByRole("button", { name: "Anmelden" }).click();
  ok(await page.getByText("Passwort falsch.").waitFor({ timeout: 5000 }).then(() => true, () => false), "Admin: falsches Passwort abgelehnt");
  await page.getByLabel("Admin-Passwort").fill(PW);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.getByText("Control").waitFor();
  const reset = await api(page, "/api/admin/action", { action: "resetAnswers", confirm: "RESET" });
  ok(reset.status === 200, "Admin: Antworten zurückgesetzt");
  await api(page, "/api/admin/action", { action: "pause" });
  const gen = await api(page, "/api/admin/action", { action: "regenerate", participant: "all" });
  ok(gen.status === 200 && gen.json.links?.length === 2, "Admin: zwei neue Zugangslinks erstellt");
  const joanna = gen.json.links.find((l) => l.id === "joanna").url.replace(/^https?:\/\/[^/]+/, BASE);
  const kewin = gen.json.links.find((l) => l.id === "kewin").url.replace(/^https?:\/\/[^/]+/, BASE);
  const tJ = joanna.split("/p/")[1];
  const tK = kewin.split("/p/")[1];
  await page.reload();
  await shot(page, "02-admin", true);

  // 3. Before start
  const ctxJ = await browser.newContext({ ...devices["iPhone 14"] });
  const pJ = await ctxJ.newPage();
  pJ.on("pageerror", (e) => errors.push(String(e)));
  await pJ.goto(joanna);
  ok(await seen(pJ.getByText("Your escape opens soon.")), "Vor dem Start: Link zeigt „opens soon“");
  const early = await pJ.evaluate(async (t) => (await fetch(`/api/p/${t}/answers`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: { beach: "coves" } }) })).status, tJ);
  ok(early === 409, "Vor dem Start: Speichern blockiert");

  // 4. Start
  const start = await api(page, "/api/admin/action", { action: "start" });
  ok(start.status === 200 && start.json.overview.phase === "live", "Admin: Umfrage gestartet");

  // 5. Joanna answers
  await pJ.goto(joanna);
  await shot(pJ, "03-hub-start");
  await pJ.getByRole("link", { name: "Start the survey" }).click();
  await pJ.waitForURL(/\/survey$/);
  await shot(pJ, "04-survey-intro");
  await fillSurvey(pJ, 0, "Keine Partyhochburg, keine extreme Hitze");
  ok(await seen(pJ.getByText("One more perspective")), "Szenario 1: Joanna fertig, Kewin nicht → „One more perspective is missing.“");
  await shot(pJ, "05-hub-waiting", true);
  const st1 = await pJ.evaluate(async (t) => (await fetch(`/api/p/${t}/status`)).json(), tJ);
  ok(st1.sharedReady === false && Object.keys(st1).sort().join() === "phase,sharedReady,status", "Status-API: nur phase/status/sharedReady");
  await pJ.goto(`${joanna}/reveal`);
  ok(!pJ.url().includes("/reveal"), "Reveal gesperrt, solange eine Perspektive fehlt");
  const locked = await pJ.evaluate(async (t) => (await fetch(`/api/p/${t}/answers`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: {} }) })).status, tJ);
  ok(locked === 409, "Nach dem Abschicken: Antworten gesperrt");
  await pJ.goto(`${joanna}/profile`);
  ok(await seen(pJ.getByText("Your private travel profile")), "Privates Profil erreichbar");
  await sleep(800);
  await shot(pJ, "06-profile");
  await shot(pJ, "06-profile-full", true);

  // 6. Kewin – draft first (scenario 2 inverse check), then submit
  const ctxK = await browser.newContext({ ...devices["iPhone 14"] });
  const pK = await ctxK.newPage();
  pK.on("pageerror", (e) => errors.push(String(e)));
  await pK.goto(kewin);
  ok(await seen(pK.getByRole("link", { name: "Start the survey" })), "Kewin: Start sichtbar (keine Info über Joannas Antworten)");
  await pK.goto(`${kewin}/profile`);
  ok(!pK.url().includes("/profile"), "Kewin: Profil vor dem Abschicken nicht verfügbar");
  await pK.goto(`${kewin}/survey`);
  await fillSurvey(pK, 1, "");
  ok(await seen(pK.getByText("Your summer destination")), "Szenario 3: beide fertig → „Your summer destination is waiting.“");
  await shot(pK, "07-hub-ready");

  // 7. Reveal
  await pK.getByRole("link", { name: "Open the reveal" }).click();
  await pK.waitForURL(/\/reveal$/);
  await shot(pK, "08-reveal-gate");
  const html = await pK.content();
  ok(!html.includes("Partyhochburg"), "Reveal enthält keine individuellen Freitext-Antworten");
  await pK.getByRole("button", { name: "Reveal our summer" }).click();
  await sleep(1400);
  await shot(pK, "09-reveal-part1");
  for (const [i, sel] of ["Part 2", "Part 3", "Part 4", "Part 5", "Destination map"].entries()) {
    const el = pK.getByText(sel, { exact: false }).first();
    await el.scrollIntoViewIfNeeded();
    await sleep(1600);
    await shot(pK, `10-reveal-${i + 2}`);
  }
  ok((await pK.locator("article").count()) >= 4, "Reveal: Top 3 + Wildcard Karten");
  await shot(pK, "11-reveal-full", true);

  // 8. Old link invalid after regeneration
  await api(page, "/api/admin/action", { action: "regenerate", participant: "joanna" });
  const res = await pJ.goto(joanna);
  ok(res.status() === 404, "Neu erstellter Link macht alten Link ungültig");

  // 9. Demo + atlas
  await page.goto(`${BASE}/demo/balanced`);
  await page.getByRole("button", { name: "Reveal our summer" }).click();
  ok(await seen(page.getByText("Beispieldaten")), "Demo: als Beispieldaten gekennzeichnet");
  await page.goto(`${BASE}/explore`);
  await sleep(1500);
  ok((await page.locator(".leaflet-container").count()) === 1, "Atlas: Karte geladen");
  await shot(page, "12-explore");
} catch (e) {
  failures++;
  console.error(e);
  await shot(page, "zz-error");
} finally {
  ok(errors.length === 0, `Keine JavaScript-Fehler${errors.length ? ": " + errors.join(" | ") : ""}`);
  await browser.close();
  console.log(failures ? `\n${failures} Fehler` : "\nAlle E2E-Prüfungen bestanden.");
  process.exit(failures ? 1 : 0);
}
