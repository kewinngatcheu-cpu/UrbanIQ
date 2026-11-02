/**
 * End-to-end test of the core ONE flows against a running server (local backend).
 *   BASE_URL=http://localhost:3000 OWNER_EMAIL=... OWNER_PASSWORD=... npm run test:e2e
 * Requires Playwright with Chromium.
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "owner@one.test";
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? "OwnerPass123";
const SHOTS = new URL("./screenshots/", import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const run = Date.now().toString(36);
const A = { email: `lena.${run}@one.test`, password: "LenaSecure2026" };
const B = { email: `max.${run}@one.test`, password: "MaxSecure2026" };

let passed = 0, failed = 0;
const results = [];
async function step(name, fn) {
  try {
    await fn();
    passed++; results.push(`✔ ${name}`); console.log(`✔ ${name}`);
  } catch (e) {
    for (const [i, pg] of [page, globalThis.pb, globalThis.po].filter(Boolean).entries()) {
      try { await pg.screenshot({ path: `${SHOTS}FAIL-${String(passed + failed + 1).padStart(2, "0")}-${i}.png`, fullPage: true }); } catch {}
    }
    failed++; results.push(`✘ ${name}: ${e.message.split("\n")[0]}`); console.log(`✘ ${name}\n   ${e.message.split("\n").slice(0, 3).join("\n   ")}`);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const shot = (page, name) => page.screenshot({ path: `${SHOTS}${name}.png`, fullPage: true });

// Each test context opens its own tab; disable Chromium background throttling so non-focused tabs keep rendering.
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chromium", args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"] });
const ctxA = await browser.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
const page = await ctxA.newPage();
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(e.message));
if (process.env.DEBUG_NET) {
  const t0 = Date.now();
  const ts = () => ((Date.now() - t0) / 1000).toFixed(1);
  page.on("request", (r) => { if (r.method() === "POST" || r.url().includes("_rsc")) console.log(ts(), "REQ", r.method(), r.url().slice(21, 100)); });
  page.on("requestfinished", (r) => { if (r.method() === "POST" || r.url().includes("_rsc")) console.log(ts(), "FIN", r.method(), r.url().slice(21, 100)); });
  page.on("requestfailed", (r) => console.log(ts(), "FAIL", r.url().slice(21, 100), r.failure()?.errorText));
  page.on("console", (m) => console.log(ts(), "console", m.type(), m.text().slice(0, 200)));
}
if (process.env.STOP_AFTER) setTimeout(() => process.exit(2), Number(process.env.STOP_AFTER) * 1000);

async function register(p, user, plan) {
  await p.goto(`${BASE}/register?plan=${plan}`); await p.waitForLoadState("networkidle");
  await p.fill("#email", user.email);
  await p.fill("#password", user.password);
  await p.check('input[name="terms"]');
  await p.click('button[type="submit"]:has-text("Create account")');
  await p.waitForURL("**/verify-email"); await p.waitForLoadState("networkidle");
}
async function login(p, user) {
  await p.goto(`${BASE}/login`); await p.waitForLoadState("networkidle");
  await p.fill("#email", user.email);
  await p.fill("#password", user.password);
  await p.click('button[type="submit"]:has-text("Sign in")');
}

await step("Landing page renders hero, modules, pricing, FAQ", async () => {
  await page.goto(BASE); await page.waitForLoadState("networkidle");
  for (const t of ["Remember everything.", "Four modules".toUpperCase(), "Start free. Grow with ONE.", "Questions & answers"]) {
    await page.getByText(t, { exact: false }).first().waitFor({ timeout: 15000 });
  }
  await shot(page, "01-landing");
});

await step("Protected routes redirect anonymous visitors to login", async () => {
  for (const path of ["/app", "/admin", "/app/memory", "/onboarding"]) {
    await page.goto(BASE + path); await page.waitForLoadState("networkidle");
    assert(page.url().includes("/login"), `${path} not protected: ${page.url()}`);
  }
  const r = await page.request.get(`${BASE}/api/export`);
  assert(r.status() === 401, `export without auth returned ${r.status()}`);
});

await step("Registration validates weak passwords", async () => {
  await page.goto(`${BASE}/register`); await page.waitForLoadState("networkidle");
  await page.fill("#email", A.email);
  await page.fill("#password", "short");
  await page.check('input[name="terms"]');
  await page.click('button[type="submit"]:has-text("Create account")');
  await page.waitForSelector('[role="alert"]');
  assert(page.url().includes("/register"), "should stay on register");
});

await step("Register (Premium chosen) → verify email via demo outbox", async () => {
  await register(page, A, "premium");
  await shot(page, "02-verify-email");
  // Unverified user cannot open the app
  await page.goto(`${BASE}/app`); await page.waitForLoadState("networkidle");
  assert(page.url().includes("/verify-email"), "unverified user reached app");
  await page.click("text=Open verification link");
  await page.waitForURL("**/onboarding"); await page.waitForLoadState("networkidle");
});

await step("Onboarding → checkout (demo) → Premium activated only after confirmation", async () => {
  await page.fill('input[aria-label="Your name"]', "Lena");
  await shot(page, "03-onboarding");
  await page.click("text=Continue");
  assert(await page.locator('[role="radio"][aria-checked="true"]:has-text("Premium")').isVisible(), "premium not preselected");
  await page.click("text=Continue");
  await page.click("text=Paperwork & contracts");
  await page.click("text=Money & bills");
  await page.click("text=Continue");
  await page.click("text=Continue to checkout");
  await page.waitForURL("**/checkout/**"); await page.waitForLoadState("networkidle");
  await page.getByText("Demo payment mode").first().waitFor({ timeout: 15000 });
  await shot(page, "04-checkout");
  // Before confirming, plan is still Free
  const p2 = await ctxA.newPage();
  await p2.goto(`${BASE}/app/settings/billing`); await p2.waitForLoadState("networkidle");
  await p2.getByText("Your plan: Free").first().waitFor({ timeout: 15000 });
  await p2.close();
  await page.bringToFront(); // a background tab is throttled by Chromium
  await page.click("text=Confirm demo payment");
  await page.waitForURL("**/app?upgraded=1"); await page.waitForLoadState("networkidle");
  await page.getByText("Premium plan is active").first().waitFor({ timeout: 15000 });
});

await step("Dashboard shows greeting, composer and starter content", async () => {
  await page.getByText("Lena.", { exact: false }).first().waitFor({ timeout: 15000 });
  await shot(page, "05-dashboard");
});

await step("Composer: Remember saves a memory with #tags", async () => {
  await page.click('[role="tab"]:has-text("Remember")');
  await page.fill("#one-input", "My home insurance with Allianz renews on 1 December. Notice period is one month. Policy number 4711-2209. #insurance #home");
  await page.click('button[aria-label="Send"]');
  await page.getByText("Saved to Memory.").waitFor();
});

await step("Composer: Task adds a task", async () => {
  await page.click('[role="tab"]:has-text("Task")');
  await page.fill("#one-input", "Call the landlord about the heating");
  await page.click('button[aria-label="Send"]');
  await page.getByText("Task added to Life.").waitFor();
});

await step("Composer: Ask answers from stored data with sources (demo mode, labelled)", async () => {
  await page.click('[role="tab"]:has-text("Ask")');
  await page.fill("#one-input", "When does my insurance renew?");
  await page.click('button[aria-label="Send"]');
  await page.getByText("You asked:").waitFor({ timeout: 20000 });
  await page.getByText("Demo mode", { exact: false }).first().waitFor({ timeout: 15000 });
  assert(await page.locator('a:has-text("My home insurance")').first().isVisible(), "source chip missing");
  await shot(page, "06-ask");
});

await step("Ask: unknown topic → ONE says it has no information (no hallucination)", async () => {
  await page.fill("#one-input", "What is my dentist's phone number?");
  await page.click('button[aria-label="Send"]');
  await page.getByText("found nothing matching", { exact: false }).waitFor({ timeout: 20000 });
});

let memoryUrl = "";
await step("Memory: create note via dialog, search, open detail", async () => {
  await page.goto(`${BASE}/app/memory`); await page.waitForLoadState("networkidle");
  await page.click('button:has-text("New memory")');
  await page.fill("#m-title", "Gym contract FitLife");
  await page.fill("#m-content", "FitLife gym membership, member number 88213. Contract can be cancelled until 15.11.2026. Monthly fee 39.90 EUR.\n- Cancel the gym contract before the deadline\n- Pay the last invoice by 30.11.2026");
  await page.fill("#m-tags", "finance, contracts");
  await page.click('button[type="submit"]:has-text("Save")');
  await page.waitForURL(/\/app\/memory\/[0-9a-f-]{36}$/); await page.waitForLoadState("networkidle");
  memoryUrl = page.url();
  await page.goto(`${BASE}/app/memory?q=fitlife`); await page.waitForLoadState("networkidle");
  await page.getByText("Gym contract FitLife").first().waitFor({ timeout: 15000 });
  await shot(page, "07-memory-list");
});

await step("Memory: quick summary + task detection (Premium) → add to Life", async () => {
  await page.goto(memoryUrl); await page.waitForLoadState("networkidle");
  await page.click('button:has-text("Create quick summary")');
  await page.getByText("Quick summary created").waitFor();
  await page.click('button:has-text("Find tasks & deadlines")');
  await page.getByText("ONE found", { exact: false }).waitFor();
  await page.click('button:has-text("to Life")');
  await page.getByText("added to Life", { exact: false }).waitFor();
  await shot(page, "08-memory-detail");
});

await step("Memory: upload a text document → extracted text is searchable", async () => {
  await page.goto(`${BASE}/app/memory`); await page.waitForLoadState("networkidle");
  await page.click('button:has-text("Upload")');
  await page.setInputFiles('input[type="file"]', { name: "electricity-invoice.txt", mimeType: "text/plain", buffer: Buffer.from("Stadtwerke electricity invoice no. 55-1029. Amount due: 84.20 EUR. Please pay by 20.11.2026.") });
  await page.fill("#up-title", "Electricity invoice");
  await page.click('form button[type="submit"]:has-text("Upload")');
  await page.waitForURL(/\/app\/memory\/[0-9a-f-]{36}$/); await page.waitForLoadState("networkidle");
  await page.getByText("Extracted text").first().waitFor({ timeout: 15000 });
  await page.goto(`${BASE}/app/memory?q=stadtwerke`); await page.waitForLoadState("networkidle");
  await page.getByText("Electricity invoice").first().waitFor({ timeout: 15000 });
});

await step("Life: create appointment with date, see it in week view, complete a task", async () => {
  await page.goto(`${BASE}/app/life`); await page.waitForLoadState("networkidle");
  await page.click('button:has-text("New item")');
  await page.selectOption("#t-kind", "appointment");
  await page.fill("#t-title", "Dentist check-up");
  const d = new Date(Date.now() + 86400000);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  await page.fill("#t-date", iso);
  await page.fill("#t-time", "10:30");
  await page.click('form button[type="submit"]:has-text("Add")');
  await page.waitForTimeout(800);
  await page.goto(`${BASE}/app/life?view=week`); await page.waitForLoadState("networkidle");
  await page.getByText("Dentist check-up").first().waitFor({ timeout: 15000 });
  await page.getByText("10:30").first().waitFor({ timeout: 15000 });
  await shot(page, "09-life-week");
  await page.goto(`${BASE}/app/life?view=all`); await page.waitForLoadState("networkidle");
  await page.click('button[aria-label^="Complete \\"Call the landlord"]');
  await page.goto(`${BASE}/app/life?view=all&filter=done`); await page.waitForLoadState("networkidle");
  await page.getByText("Call the landlord about the heating").first().waitFor({ timeout: 15000 });
});

await step("Life: projects, goals, reminders, categories", async () => {
  await page.goto(`${BASE}/app/life?view=projects`); await page.waitForLoadState("networkidle");
  await page.click('button:has-text("New goal")');
  await page.fill("#p-name", "Run a half marathon");
  await page.click('form button[type="submit"]:has-text("Create")');
  await page.getByText("Run a half marathon").first().waitFor();
  await page.goto(`${BASE}/app/life?view=reminders`); await page.waitForLoadState("networkidle");
  await page.fill("#r-title", "Water the plants");
  await page.click('button:has-text("Add reminder")');
  await page.getByText("Reminder set.").waitFor();
  await page.goto(`${BASE}/app/life?view=categories`); await page.waitForLoadState("networkidle");
  await page.fill("#c-name", "Health");
  await page.click('button:has-text("Create category")');
  await page.getByText("Category created.").waitFor();
});

let actionUrl = "";
await step("Action: prepare a cancellation → template steps, draft, missing info", async () => {
  await page.goto(`${BASE}/app/action/new?type=cancellation`); await page.waitForLoadState("networkidle");
  await page.fill("#a-title", "Cancel FitLife gym membership");
  await page.fill("#a-desc", "FitLife GmbH, member number 88213");
  await page.click('button:has-text("Prepare action")');
  await page.waitForURL(/\/app\/action\/[0-9a-f-]{36}$/); await page.waitForLoadState("networkidle");
  actionUrl = page.url();
  await page.getByText("Next steps").first().waitFor({ timeout: 15000 });
  assert((await page.locator('textarea[aria-label="Draft"]').inputValue()).includes("88213"), "draft missing member number");
  await page.locator("ol li button").first().click();
  await page.waitForTimeout(500);
  await shot(page, "10-action-detail");
});

await step("Action: external completion requires explicit confirmation", async () => {
  await page.goto(actionUrl); await page.waitForLoadState("networkidle");
  await page.click('button:has-text("I\'ve sent / completed this")');
  await page.click('[role="dialog"] button[type="submit"]:has-text("Confirm")');
  // checkbox is required — dialog stays open
  assert(await page.locator('[role="dialog"]').isVisible(), "confirmed without checkbox");
  await page.check('[role="dialog"] input[name="confirm"]');
  await page.click('[role="dialog"] button[type="submit"]:has-text("Confirm")');
  await page.getByText("You confirmed completion").waitFor();
});

await step("Intelligence: insights with sources + chat conversation", async () => {
  await page.goto(`${BASE}/app/intelligence`); await page.waitForLoadState("networkidle");
  await page.getByText("Insights").first().waitFor({ timeout: 15000 });
  await page.fill('textarea[aria-label="Ask ONE"]', "What do I know about electricity?");
  await page.click('form button[aria-label="Send"]');
  await page.waitForURL(/c=/, { timeout: 20000 }); await page.waitForLoadState("networkidle");
  await page.locator('a:has-text("Electricity invoice")').first().waitFor();
  await shot(page, "11-intelligence");
});

await step("Settings: export contains own data; feedback is sent", async () => {
  const r = await page.request.get(`${BASE}/api/export`);
  assert(r.status() === 200, `export ${r.status()}`);
  const data = await r.json();
  assert(data.memories.length >= 3 && data.profile.email === A.email, "export incomplete");
  assert(!JSON.stringify(data).includes("password_hash"), "export leaks credentials");
  await page.goto(`${BASE}/app/settings`); await page.waitForLoadState("networkidle");
  await page.fill("#f-msg", "Love the calm design! Would like a dark mode some day.");
  await page.click('button:has-text("Send feedback")');
  await page.getByText("your feedback reached", { exact: false }).waitFor();
  await page.goto(`${BASE}/app/settings/billing`); await page.waitForLoadState("networkidle");
  await shot(page, "12-billing");
});

await step("Mobile layout renders bottom navigation", async () => {
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctxA.storageState() });
  const mp = await m.newPage();
  await mp.goto(`${BASE}/app`); await mp.waitForLoadState("networkidle");
  assert(await mp.locator('nav[aria-label="Main mobile"]').isVisible(), "no mobile nav");
  await mp.screenshot({ path: `${SHOTS}13-mobile.png`, fullPage: false });
  await m.close();
});

// ─── Second user: isolation & permissions ───
const ctxB = await browser.newContext({ viewport: { width: 1280, height: 860 } });
const pb = await ctxB.newPage();
globalThis.pb = pb;
await step("User B (Free) is isolated from user A's data", async () => {
  await register(pb, B, "free");
  await pb.click("text=Open verification link");
  await pb.waitForURL("**/onboarding"); await pb.waitForLoadState("networkidle");
  for (let i = 0; i < 3; i++) await pb.click("text=Continue");
  await pb.click("text=Go to my dashboard");
  await pb.waitForURL("**/app?welcome=1"); await pb.waitForLoadState("networkidle");
  const memId = memoryUrl.split("/").pop();
  await pb.goto(memoryUrl); await pb.waitForLoadState("networkidle");
  await pb.getByText("This page doesn't exist").first().waitFor({ timeout: 15000 });
  await pb.goto(actionUrl); await pb.waitForLoadState("networkidle");
  await pb.getByText("This page doesn't exist").first().waitFor({ timeout: 15000 });
  const exp = await (await pb.request.get(`${BASE}/api/export`)).json();
  assert(!JSON.stringify(exp).includes("FitLife") && !exp.memories.some((m) => m.id === memId), "export leaks A's data");
  await pb.goto(`${BASE}/app/memory?q=insurance`); await pb.waitForLoadState("networkidle");
  assert(!(await pb.getByText("My home insurance").count()), "search leaks A's data");
});

await step("User B: Premium features show upgrade prompts", async () => {
  await pb.goto(`${BASE}/app/memory`); await pb.waitForLoadState("networkidle");
  await pb.click('button:has-text("New memory")');
  await pb.fill("#m-content", "Pay rent by 01.12.2026");
  await pb.click('button[type="submit"]:has-text("Save")');
  await pb.waitForURL(/\/app\/memory\/[0-9a-f-]{36}$/); await pb.waitForLoadState("networkidle");
  await pb.getByText("Automatic task & deadline detection").first().waitFor({ timeout: 15000 });
  await shot(pb, "14-free-upgrade");
});

await step("Normal user cannot access /admin", async () => {
  await pb.goto(`${BASE}/admin`); await pb.waitForLoadState("networkidle");
  assert(!pb.url().includes("/admin"), `non-owner reached admin: ${pb.url()}`);
  await pb.goto(`${BASE}/admin/users`); await pb.waitForLoadState("networkidle");
  assert(!pb.url().includes("/admin"), "non-owner reached admin users");
});

// ─── Owner ───
const ctxO = await browser.newContext({ viewport: { width: 1360, height: 900 } });
const po = await ctxO.newPage();
globalThis.po = po;
await step("Owner can open admin dashboard and sees metadata only", async () => {
  await login(po, { email: OWNER_EMAIL, password: OWNER_PASSWORD });
  await po.waitForURL("**/app"); await po.waitForLoadState("networkidle");
  await po.goto(`${BASE}/admin`); await po.waitForLoadState("networkidle");
  await po.getByText("Registered users").first().waitFor({ timeout: 15000 });
  await shot(po, "15-admin");
  await po.goto(`${BASE}/admin/users?q=${encodeURIComponent(A.email)}`); await po.waitForLoadState("networkidle");
  await po.click(`a:has-text("Lena")`);
  await po.getByText("Private content is not accessible").first().waitFor({ timeout: 15000 });
  assert(!(await po.getByText("My home insurance").count()), "admin sees private content!");
  await shot(po, "16-admin-user");
});

await step("Owner suspends user B → B is locked out; reactivation restores access", async () => {
  await po.goto(`${BASE}/admin/users?q=${encodeURIComponent(B.email)}`); await po.waitForLoadState("networkidle");
  await po.click(`a:has-text("${B.email}")`);
  await po.fill("#as-reason", "E2E test suspension");
  await po.click('button:has-text("Suspend")');
  await po.getByText("User suspended.").waitFor();
  await pb.goto(`${BASE}/app`); await pb.waitForLoadState("networkidle");
  assert(pb.url().includes("/login?error=suspended"), `suspended user not locked out: ${pb.url()}`);
  await login(pb, B);
  await pb.getByText("suspended", { exact: false }).first().waitFor();
  await po.fill("#as-reason", "E2E reactivate");
  await po.click('button:has-text("Reactivate")');
  await po.getByText("User reactivated.").waitFor();
  await login(pb, B);
  await pb.waitForURL("**/app"); await pb.waitForLoadState("networkidle");
});

await step("Owner grants Exclusive to B (audited); audit log + feedback visible", async () => {
  await po.selectOption("#ap-plan", "exclusive");
  await po.fill("#ap-reason", "Beta tester");
  await po.click('button:has-text("Update membership")');
  await po.getByText("Membership updated.").waitFor();
  await po.goto(`${BASE}/admin/audit`); await po.waitForLoadState("networkidle");
  await po.getByText("admin.plan_granted").first().waitFor({ timeout: 15000 });
  await po.getByText("admin.user_suspended").first().waitFor({ timeout: 15000 });
  await po.goto(`${BASE}/admin/feedback`); await po.waitForLoadState("networkidle");
  await po.getByText("Love the calm design").first().waitFor({ timeout: 15000 });
  await po.goto(`${BASE}/admin/features`); await po.waitForLoadState("networkidle");
  await shot(po, "17-admin-features");
});

await step("Support access: only after user grant, and every view is logged", async () => {
  await page.goto(`${BASE}/app/settings/privacy`); await page.waitForLoadState("networkidle");
  await page.fill("#g-reason", "My PDF does not show up");
  await page.click('button:has-text("Grant temporary access")');
  await page.getByText("Support access is active").waitFor();
  await po.goto(`${BASE}/admin/users?q=${encodeURIComponent(A.email)}`); await po.waitForLoadState("networkidle");
  await po.click('a:has-text("Lena")');
  await po.click("text=Open support view (logged)");
  await po.getByText("My home insurance").first().waitFor();
  await po.goto(`${BASE}/admin/audit?action=admin.`); await po.waitForLoadState("networkidle");
  await po.getByText("admin.support_access_used").first().waitFor({ timeout: 15000 });
});

await step("Feature flag: pausing registrations blocks sign-up", async () => {
  await po.goto(`${BASE}/admin/features`); await po.waitForLoadState("networkidle");
  await po.click('button[aria-label="Toggle registrations_open"]');
  await po.waitForTimeout(600);
  const anon = await browser.newContext();
  const ap = await anon.newPage();
  await ap.goto(`${BASE}/register`); await ap.waitForLoadState("networkidle");
  await ap.getByText("registrations are paused", { exact: false }).first().waitFor({ timeout: 15000 });
  await po.click('button[aria-label="Toggle registrations_open"]');
  await po.waitForTimeout(600);
  await anon.close();
});

await step("Account deletion requires DELETE + password and removes all data", async () => {
  await pb.goto(`${BASE}/app/settings/privacy`); await pb.waitForLoadState("networkidle");
  await pb.fill("#d-confirm", "DELETE");
  await pb.fill("#d-pw", "wrong-password-1");
  await pb.click('button:has-text("Permanently delete my account")');
  await pb.getByText("Password is incorrect.").waitFor();
  await pb.fill("#d-confirm", "DELETE");
  await pb.fill("#d-pw", B.password);
  await pb.click('button:has-text("Permanently delete my account")');
  await pb.waitForURL(`${BASE}/?deleted=1`); await pb.waitForLoadState("networkidle");
  await login(pb, B);
  await pb.getByText("Email or password is incorrect.").waitFor();
});

await step("No uncaught client-side errors", async () => {
  assert(consoleErrors.length === 0, consoleErrors.join(" | "));
});

await browser.close();
writeFileSync(`${SHOTS}results.txt`, results.join("\n") + `\n\n${passed} passed, ${failed} failed\n`);
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
