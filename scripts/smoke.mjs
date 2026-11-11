/**
 * End-to-end smoke test against a running JARVIS instance (fresh database).
 *   BASE_URL=http://localhost:3000 SETUP_TOKEN=... [SHOTS=dir] npm run smoke
 * Exercises: setup → dashboard → chat commands → memory center → tasks → API auth/CSRF checks.
 */
import { createRequire } from "node:module";
// Playwright is not a project dependency (uses a globally installed copy or `npm i -D playwright`).
const { chromium, devices } = createRequire(import.meta.url)("playwright");
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const TOKEN = process.env.SETUP_TOKEN;
const SHOTS = process.env.SHOTS;
const PASSWORD = "Smoke-Test-Passwort-2026";
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, ok, info = "") => { results.push({ name, ok }); console.log(`${ok ? "✓" : "✗"} ${name}${info ? " – " + info : ""}`); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const consoleErrors = [];
// 400/403 resource errors are triggered on purpose below (wrong setup token, validation probe).
page.on("console", (m) => { if (m.type() === "error" && !/status of 40[03]/.test(m.text())) consoleErrors.push(m.text()); });

// Unauthenticated API access is rejected
const unauth = await fetch(`${BASE}/api/memories`);
check("API rejects unauthenticated requests", unauth.status === 401);

// Setup
await page.goto(`${BASE}/`);
check("fresh instance redirects to /setup", page.url().endsWith("/setup"));
if (TOKEN) {
  await page.getByLabel("Setup-Token").fill("falsch");
  await page.getByLabel("Passwort", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Passwort wiederholen").fill(PASSWORD);
  await page.getByRole("button", { name: "JARVIS einrichten" }).click();
  await page.getByText("Setup-Token ist falsch").waitFor();
  check("wrong setup token is rejected", true);
  await page.getByLabel("Setup-Token").fill(TOKEN);
  await page.getByRole("button", { name: "JARVIS einrichten" }).click();
  await page.waitForURL(`${BASE}/`);
}
await page.getByText("Drei wichtigste Prioritäten").waitFor();
check("command center renders after setup", true);
if (SHOTS) await page.screenshot({ path: `${SHOTS}/01-command-center-empty.png`, fullPage: true });

// CSRF: cross-origin mutation is blocked even with a valid session cookie
const csrf = await page.evaluate(async () => (await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status);
check("same-origin POST passes origin check (400 = validation)", csrf === 400, `status ${csrf}`);
const cookies = await ctx.cookies();
const sess = cookies.find((c) => c.name === "jarvis_session");
const forged = await fetch(`${BASE}/api/tasks`, { method: "POST", headers: { Cookie: `jarvis_session=${sess.value}`, Origin: "https://evil.example", "Content-Type": "application/json" }, body: JSON.stringify({ title: "x" }) });
check("cross-origin POST with session cookie is blocked (CSRF)", forged.status === 403);

// Chat commands
await page.goto(`${BASE}/chat?ws=ngcx`);
const box = page.getByLabel("Nachricht");
await box.fill("/aufgabe 10 Interviews mit IT-Dienstleistern führen !kritisch @2026-11-20");
await box.press("Enter");
await page.getByText("Aufgabe angelegt in").waitFor();
check("chat: /aufgabe creates a task", true);
await box.fill("/merke Erste Pilotkunden-Hypothese: IT-Beratungen mit 20–100 Mitarbeitenden haben das größte Pipeline-Kapazitäts-Problem.");
await box.press("Enter");
await page.getByText("Gespeichert im Workspace").waitFor();
check("chat: /merke stores a memory", true);
await box.fill("Was sollte ich heute priorisieren?");
await box.press("Enter");
const noProvider = page.getByText("Kein KI-Anbieter konfiguriert");
const aiAnswer = page.locator(".prose-jarvis").nth(2);
await Promise.race([noProvider.waitFor({ timeout: 90000 }), aiAnswer.waitFor({ timeout: 90000 })]);
check("chat: free-form question is answered or reports missing provider honestly", true, (await noProvider.count()) ? "no provider" : "AI answered");
if (SHOTS) await page.screenshot({ path: `${SHOTS}/02-chat.png` });

// Memory Center
await page.goto(`${BASE}/memory`);
await page.getByText("NGCX Positionierung").first().waitFor();
await page.getByLabel("Suche").fill("Pilotkunden Hypothese");
await page.getByText("Erste Pilotkunden-Hypothese").first().waitFor();
check("memory center: seeded + chat memories searchable", true);
await page.getByText("Erste Pilotkunden-Hypothese").first().click();
await page.getByRole("button", { name: "Verlauf" }).click();
await page.getByText(/v1 ·/).first().waitFor();
check("memory center: version history visible", true);
if (SHOTS) await page.screenshot({ path: `${SHOTS}/03-memory.png` });

// Tasks + Business
await page.goto(`${BASE}/tasks`);
await page.getByText("10 Interviews mit IT-Dienstleistern führen").waitFor();
check("tasks page lists the chat-created task", true);
await page.goto(`${BASE}/business/ngcx`);
await page.getByText("Decision Intelligence").first().waitFor();
check("NGCX workspace shows profile and knowledge base", true);
if (SHOTS) await page.screenshot({ path: `${SHOTS}/04-ngcx.png`, fullPage: true });
await page.goto(`${BASE}/`);
await page.getByText("10 Interviews mit IT-Dienstleistern führen").waitFor();
check("command center shows the task as top priority", true);
if (SHOTS) await page.screenshot({ path: `${SHOTS}/05-command-center.png`, fullPage: true });
for (const path of ["/agents", "/integrations", "/settings", "/modules/studio", "/business"]) {
  const r = await page.goto(`${BASE}${path}`);
  check(`page ${path} renders`, r.status() === 200);
}

// ── Phase 2: Personal OS ──
// Goals
await page.goto(`${BASE}/goals`);
await page.getByRole("button", { name: "Neues Ziel" }).click();
await page.getByLabel("Titel").fill("Notgroschen 3.000 €");
await page.getByLabel("Kategorie").selectOption("finance");
await page.getByLabel("Einheit").fill("€");
await page.getByLabel("Startwert").fill("0");
await page.getByLabel("Zielwert").fill("3000");
await page.getByLabel("Meilensteine").fill("1.000 € erreicht\n2.000 € erreicht");
await page.getByRole("button", { name: "Ziel anlegen" }).click();
await page.getByText("Notgroschen 3.000 €").waitFor();
await page.getByLabel("Aktueller Wert").fill("750");
await page.getByRole("button", { name: "Speichern" }).click();
await page.getByText("25 %").waitFor();
check("goals: create goal with metric + milestones, progress 25 %", true);

// Discipline: habit + focus session
await page.goto(`${BASE}/discipline`);
await page.getByLabel("Neue Gewohnheit").fill("20 Min. lesen");
await page.getByRole("button", { name: "Anlegen" }).click();
await page.getByText("20 Min. lesen").waitFor();
const todayISO = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
await page.getByLabel(`20 Min. lesen ${todayISO}`).click();
await page.getByText("1/7 diese Woche").waitFor();
check("discipline: habit check-in for today", true);
await page.getByLabel("Aufgabe").selectOption({ label: "10 Interviews mit IT-Dienstleistern führen" });
await page.getByRole("button", { name: "Fokus starten" }).click();
await page.getByText("von 50 Min.").waitFor();
check("discipline: focus session running (server-side)", true);
if (SHOTS) await page.screenshot({ path: `${SHOTS}/08-discipline.png`, fullPage: true });
await page.getByRole("button", { name: "Abschließen", exact: true }).click();
await page.getByRole("button", { name: "Fokus starten" }).waitFor();
check("discipline: focus session stopped and logged", true);

// Finance: CSV import + manual booking → "how much can I spend"
await page.goto(`${BASE}/finance`);
const d = new Date();
const ym = (off) => { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + off, 1)); return [x.getUTCFullYear(), String(x.getUTCMonth() + 1).padStart(2, "0")]; };
const [py, pm] = ym(-1);
const csv = `Buchungstag;Auftraggeber/Empfänger;Verwendungszweck;Betrag (EUR)\n01.${pm}.${py};Arbeitgeber GmbH;Gehalt;1.400,00\n02.${pm}.${py};Hausverwaltung;Miete;-560,00\n05.${pm}.${py};REWE;Einkauf;-84,30\n06.${pm}.${py};Spotify AB;Abo;-10,99\n09.${pm}.${py};BVG;Monatsticket;-58,00`;
await page.locator('input[type="file"]').setInputFiles({ name: "umsaetze.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "latin1") });
await page.getByText("5 neue Buchungen erkannt").waitFor();
await page.getByRole("button", { name: "5 Buchungen importieren" }).click();
await page.getByText("✓ 5 Buchungen importiert.").waitFor();
check("finance: CSV preview + import (latin1, German format)", true);
await page.getByLabel("Betrag", { exact: true }).fill("23,50");
await page.getByRole("button", { name: "Buchen" }).click();
await page.getByText("variabel bisher 23,50 €").waitFor();
const avail = await page.locator(".card", { hasText: "Noch verfügbar (Monat)" }).first().innerText();
// 1.400 income (baseline) − 570,99 fixed (rent + Spotify, baseline) − 23,50 spent = 805,51 €
check("finance: 'noch verfügbar' = baseline income − fixed − spent", avail.includes("805,51"), avail.split("\n").slice(0, 2).join(" "));
if (SHOTS) await page.screenshot({ path: `${SHOTS}/09-finance.png`, fullPage: true });

// University + fitness
await page.goto(`${BASE}/university`);
await page.getByLabel("Modulname").fill("Finanzmathematik");
await page.getByLabel("ECTS").fill("5");
const exam = new Date(Date.now() + 10 * 864e5).toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
await page.getByLabel("Prüfungsdatum").fill(exam);
await page.getByRole("button", { name: "Anlegen" }).first().click();
await page.getByText("Finanzmathematik").first().waitFor();
check("university: course with exam date", true);
await page.goto(`${BASE}/fitness`);
await page.getByRole("button", { name: "Speichern" }).first().click();
await page.getByText("Training gespeichert.").waitFor();
check("fitness: workout logged", true);

// My Day: briefing from real data + planner
await page.goto(`${BASE}/my-day`);
await page.getByText("Kewin – Daily Briefing").waitFor();
await page.getByText(/Prüfung Finanzmathematik|Finanzmathematik/).first().waitFor();
check("my day: briefing shows exam risk + real data", (await page.getByText("Kalender nicht verbunden").count()) > 0);
await page.getByRole("button", { name: "2 h" }).click();
await page.getByRole("button", { name: "Plan erstellen" }).click();
await page.getByText("regelbasiert").first().waitFor();
check("my day: time-block plan created", (await page.getByText("10 Interviews mit IT-Dienstleistern führen").count()) > 0);
await page.getByLabel("Was habe ich erreicht?").fill("Smoke-Test bestanden");
await page.getByRole("button", { name: "Review speichern" }).click();
await page.getByText(/Gespeichert\./).waitFor();
check("my day: evening review saved (no fake AI feedback)", true);
if (SHOTS) await page.screenshot({ path: `${SHOTS}/10-my-day.png`, fullPage: true });

// ── Voice (Phase 4) ──
// Headless Chromium has no audio device: capture what JARVIS would say by intercepting speechSynthesis.
await page.addInitScript(() => {
  window.__spoken = [];
  const synth = window.speechSynthesis;
  synth.speak = (u) => { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(new Event("end")), 30); };
  synth.cancel = () => {};
});
const vcfg = await page.evaluate(async () => (await fetch("/api/voice/config")).json());
check("voice: config reports honest provider (browser without keys)", vcfg.tts.provider === "browser" && vcfg.stt.provider === "browser");
await page.goto(`${BASE}/voice`);
await page.getByText("Tippe auf JARVIS").waitFor();
await page.getByRole("button", { name: "Briefing anhören" }).click();
await page.waitForFunction(() => window.__spoken.join(" ").includes("Mein Vorschlag"), null, { timeout: 30000 });
const spoken = (await page.evaluate(() => window.__spoken)).join(" ");
check("voice: 'Guten Morgen' → JARVIS speaks the briefing from real data", /Guten (Morgen|Tag|Abend), Kewin/.test(spoken) && spoken.includes("10 Interviews"), spoken.slice(0, 120) + "…");
check("voice: spoken text contains no markdown", !/[*#`]/.test(spoken));
await page.getByRole("button", { name: "Tastatur" }).click();
await page.getByLabel("Nachricht an JARVIS (Sprachmodus)").fill("Neue Aufgabe: Sprachsteuerung testen, wichtig");
await page.getByRole("button", { name: "Senden" }).click();
await page.getByText("✓ task.create").waitFor();
await page.waitForFunction(() => window.__spoken.some((t) => t.includes("Sprachsteuerung testen")));
check("voice: spoken command creates a real task and confirms by voice", true);
if (SHOTS) await page.screenshot({ path: `${SHOTS}/11-voice.png` });
await page.goto(`${BASE}/settings`);
await page.evaluate(() => { window.__spoken = []; });
await page.getByRole("button", { name: "Stimme testen" }).click();
await page.waitForFunction(() => window.__spoken.some((t) => t.includes("Alle Systeme sind bereit")));
check("voice: settings voice test speaks", true);

// Mobile (iPhone)
const mctx = await browser.newContext({ ...devices["iPhone 15 Pro"] });
await mctx.addCookies([{ ...sess }]);
const m = await mctx.newPage();
await m.goto(`${BASE}/`);
await m.getByText("Drei wichtigste Prioritäten").waitFor();
const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
check("iPhone: no horizontal overflow on command center", !overflow);
if (SHOTS) await m.screenshot({ path: `${SHOTS}/06-iphone-command-center.png` });
await m.goto(`${BASE}/chat`);
if (SHOTS) await m.screenshot({ path: `${SHOTS}/07-iphone-chat.png` });

// Logout
await page.goto(`${BASE}/`);
await page.getByRole("button", { name: "Abmelden" }).click();
await page.waitForURL(`${BASE}/login`);
check("logout invalidates session", (await fetch(`${BASE}/api/tasks`, { headers: { Cookie: `jarvis_session=${sess.value}` } })).status === 401);

check("no browser console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
