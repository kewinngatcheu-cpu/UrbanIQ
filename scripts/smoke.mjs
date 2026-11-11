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
