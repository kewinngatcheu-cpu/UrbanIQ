/**
 * End-to-end tests for ONE 2.0: ONE Business, world separation, roles, invitations,
 * tenant isolation, admin plan management, owner MFA and responsive layouts.
 *   BASE_URL=http://localhost:3000 OWNER_EMAIL=... OWNER_PASSWORD=... node tests/e2e/business.mjs
 * Runs against the local backend (demo mail outbox, demo billing, AI demo mode).
 */
import { createRequire } from "node:module";
import { createHmac } from "node:crypto";
import { mkdirSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OWNER = { email: process.env.OWNER_EMAIL ?? "owner@one.test", password: process.env.OWNER_PASSWORD ?? "OwnerPass123" };
const SHOTS = new URL("./screenshots/business/", import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const run = Date.now().toString(36);
const BOSS = { email: `kim.${run}@acme.test`, password: "KimSecure2026", name: "Kim Boss", company: `Acme ${run}` };
const EMP = { email: `ben.${run}@acme.test`, password: "BenSecure2026", name: "Ben Worker" };
const RIVAL = { email: `eve.${run}@globex.test`, password: "EveSecure2026", name: "Eve Rival", company: `Globex ${run}` };
const PRIV = { email: `pia.${run}@one.test`, password: "PiaSecure2026", name: "Pia Private" };

let passed = 0, failed = 0;
const pages = [];
async function step(name, fn) {
  try {
    await fn();
    passed++; console.log(`✔ ${name}`);
  } catch (e) {
    failed++;
    for (const [i, pg] of pages.entries()) { try { await pg.screenshot({ path: `${SHOTS}FAIL-${passed + failed}-${i}.png`, fullPage: true }); } catch {} }
    console.log(`✘ ${name}\n   ${e.message.split("\n").slice(0, 4).join("\n   ")}`);
  }
}
function assert(c, m) { if (!c) throw new Error(m); }
const idle = (p) => p.waitForLoadState("networkidle");
const shot = (p, n) => p.screenshot({ path: `${SHOTS}${n}.png`, fullPage: true });

// RFC 6238 (same algorithm as src/lib/auth/totp.ts, implemented independently here)
function totp(secret) {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, value = 0; const out = [];
  for (const c of secret.replace(/\s+/g, "")) { value = (value << 5) | A.indexOf(c); bits += 5; if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; } }
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac("sha1", Buffer.from(out)).update(msg).digest();
  const o = h[h.length - 1] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chromium", args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"] });
async function newPage(viewport = { width: 1360, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log("   [pageerror]", e.message.slice(0, 200)));
  pages.push(p);
  return p;
}
async function login(p, u) {
  await p.goto(`${BASE}/login`); await idle(p);
  await p.fill("#email", u.email); await p.fill("#password", u.password);
  await p.click('button[type="submit"]:has-text("Sign in")');
}
async function verifyFromOutbox(p) {
  await p.waitForURL("**/verify-email"); await idle(p);
  await p.click("text=Open verification link");
  await p.waitForURL("**/onboarding"); await idle(p);
}
async function registerBusiness(p, u) {
  await p.goto(`${BASE}/register?world=business`); await idle(p);
  await p.fill("#company", u.company);
  await p.fill("#email", u.email); await p.fill("#password", u.password);
  await p.check('input[name="terms"]');
  await p.click('button[type="submit"]:has-text("Create account")');
  await verifyFromOutbox(p);
  await p.getByText("Set up your company workspace").waitFor();
  assert((await p.inputValue("#company")) === u.company, "company name not prefilled from registration");
  await p.fill("#name", u.name);
  await p.click('button:has-text("Create workspace")');
  await p.waitForURL("**/business?welcome=1"); await idle(p);
}
async function dialogSubmit(p, text) {
  await p.locator('[role="dialog"] button[type="submit"]', { hasText: text }).click();
  await p.locator('[role="dialog"]').waitFor({ state: "detached", timeout: 15000 });
}

const boss = await newPage();
let projectUrl = "", inviteLink = "", docMemoryUrl = "";

await step("Register chooser offers ONE Personal and ONE Business", async () => {
  await boss.goto(`${BASE}/register`); await idle(boss);
  await boss.getByText("Your personal life, organized.").waitFor();
  await boss.getByText("Your business, under control.").waitFor();
  await shot(boss, "01-register-chooser");
});

await step("Business registration → email verification → company setup → business dashboard", async () => {
  await registerBusiness(boss, BOSS);
  await boss.getByText("Your company workspace is ready").waitFor();
  await boss.getByText("BUSINESS", { exact: true }).first().waitFor();
  await shot(boss, "02-business-dashboard");
});

await step("A business account cannot open the personal world", async () => {
  await boss.goto(`${BASE}/app/memory`); await idle(boss);
  assert(new URL(boss.url()).pathname.startsWith("/business"), `business user reached ${boss.url()}`);
});

await step("Business prices are not invented: plans show “Price coming soon” and cannot be booked", async () => {
  await boss.goto(`${BASE}/business/settings/billing`); await idle(boss);
  await boss.getByText("Company plan:").waitFor();
  await boss.getByText("Trial", { exact: true }).first().waitFor();
  assert((await boss.getByText("Price coming soon").count()) >= 3, "business plans should have no price yet");
  await boss.goto(`${BASE}/business/settings/billing?plan=growth`); await idle(boss);
  assert(!(await boss.getByText("Go to checkout").count()), "a plan without price offered a checkout");
});

await step("Projects: create project, task, sub-task; history is recorded", async () => {
  await boss.goto(`${BASE}/business/projects`); await idle(boss);
  await boss.click('button:has-text("New project")');
  await boss.fill("#pj-name", "Website relaunch");
  await boss.fill("#pj-desc", "New company website until summer.");
  await boss.selectOption("#pj-stage", "active");
  await boss.locator('[role="dialog"] button[type="submit"]', { hasText: "Create project" }).click();
  await boss.waitForURL("**/business/projects/**"); await idle(boss);
  projectUrl = boss.url();
  await boss.getByRole("heading", { name: "Website relaunch" }).waitFor();
  await boss.click('button:has-text("Task")');
  await boss.fill("#bt-title", "Draft sitemap");
  await boss.selectOption("#bt-prio", "high");
  await dialogSubmit(boss, "Add");
  await boss.getByText("Draft sitemap").first().waitFor();
  // sub-task via the "+" next to the task
  await boss.locator("#task-" + (await boss.locator('[id^="task-"]').first().getAttribute("id")).slice(5)).locator("..").locator("button").filter({ has: boss.locator("svg.lucide-plus") }).first().click();
  await boss.getByText("New sub-task").waitFor();
  await boss.fill("#bt-title", "Collect page list");
  await dialogSubmit(boss, "Add");
  await boss.getByText("Collect page list").first().waitFor();
  await boss.getByText("was created", { exact: false }).first().waitFor();
  await shot(boss, "03-project-detail");
});

await step("Company memory: client + entry linked to client and project", async () => {
  await boss.goto(`${BASE}/business/memory?view=clients`); await idle(boss);
  await boss.click('button:has-text("Client")');
  await boss.fill("#c-name", "Stadtwerke Nord");
  await dialogSubmit(boss, "Add client");
  await boss.getByText("Stadtwerke Nord").first().waitFor();
  await boss.goto(`${BASE}/business/memory`); await idle(boss);
  await boss.click('button:has-text("New entry")');
  await boss.selectOption("#l-client", { label: "Stadtwerke Nord" });
  await boss.selectOption("#l-project", { label: "Website relaunch" });
  await boss.fill("#m-title", "Framework contract Stadtwerke");
  await boss.fill("#m-content", "Framework contract signed. Notice period 3 months. Renewal on 31 December.");
  await boss.locator('[role="dialog"] button[type="submit"]', { hasText: "Save" }).click();
  await boss.waitForURL("**/business/memory/**"); await idle(boss);
  docMemoryUrl = boss.url();
  await boss.getByText("Stadtwerke Nord").first().waitFor();
  await boss.goto(projectUrl); await idle(boss);
  await boss.getByText("Framework contract Stadtwerke").first().waitFor();
});

await step("Business action: offer with statuses incl. “Waiting for a reply”", async () => {
  await boss.goto(`${BASE}/business/action/new?type=offer`); await idle(boss);
  await boss.fill("#a-title", "Offer website maintenance for Stadtwerke");
  await boss.click('button:has-text("Prepare action")');
  await boss.waitForURL("**/business/action/**"); await idle(boss);
  await boss.click('button[aria-pressed]:has-text("Waiting for a reply")');
  await boss.locator('button[aria-pressed="true"]:has-text("Waiting for a reply")').waitFor();
  await boss.goto(`${BASE}/business/action`); await idle(boss);
  await boss.locator('section[aria-label="Waiting for a reply"]').getByText("Offer website maintenance").waitFor();
});

await step("Business intelligence: analysis with Confirmed/Conclusion labels + grounded answer", async () => {
  await boss.goto(`${BASE}/business/intelligence`); await idle(boss);
  await boss.getByText("Business intelligence").first().waitFor();
  await boss.fill("textarea, input[name=question]", "notice period Stadtwerke contract");
  await boss.keyboard.press("Enter");
  await boss.getByText("Framework contract Stadtwerke").first().waitFor({ timeout: 20000 });
  await shot(boss, "04-intelligence");
});

await step("Team: invite an employee (link shown because no mail service is configured)", async () => {
  await boss.goto(`${BASE}/business/team`); await idle(boss);
  await boss.fill("#inv-email", EMP.email);
  await boss.selectOption("#inv-role", "employee");
  await boss.click('button:has-text("Send invitation")');
  const link = boss.getByTestId("invite-link");
  await link.waitFor();
  inviteLink = (await link.textContent()).trim();
  assert(inviteLink.includes("/invite/"), "no invite link");
  await boss.getByText("Open invitations", { exact: true }).waitFor();
});

const emp = await newPage();
await step("Invited employee registers via the link, joins the company and sees shared work", async () => {
  await emp.goto(inviteLink.replace(/^https?:\/\/[^/]+/, BASE)); await idle(emp);
  await emp.getByText(`Join ${BOSS.company}`).waitFor();
  await emp.click("text=Create a ONE Business account");
  await idle(emp);
  assert((await emp.inputValue("#email")) === EMP.email, "invite email not prefilled");
  assert(await emp.locator("#email").getAttribute("readonly") !== null, "invite email should be read-only");
  await emp.fill("#password", EMP.password);
  await emp.check('input[name="terms"]');
  await emp.click('button[type="submit"]:has-text("Create account")');
  await verifyFromOutbox(emp);
  await emp.getByText(`Join ${BOSS.company}`).waitFor();
  await emp.fill("#name", EMP.name);
  await emp.click('button:has-text("Join the team")');
  await emp.waitForURL("**/business**"); await idle(emp);
  await emp.goto(projectUrl); await idle(emp);
  await emp.getByText("Draft sitemap").first().waitFor();
});

await step("Employee permissions: no project creation, no invitations, no billing changes", async () => {
  await emp.goto(`${BASE}/business/projects`); await idle(emp);
  assert(!(await emp.locator('button:has-text("New project")').count()), "employee can create projects");
  await emp.goto(`${BASE}/business/team`); await idle(emp);
  assert(!(await emp.locator("#inv-email").count()), "employee can invite");
  await emp.goto(`${BASE}/business/settings/billing`); await idle(emp);
  await emp.getByText("Only the Business Owner can change the company plan.").waitFor();
  await emp.goto(`${BASE}/business/tasks`); await idle(emp);
  assert(await emp.locator('button:has-text("New task")').count(), "employee should be able to create tasks");
});

await step("Owner changes the employee to Viewer → read-only", async () => {
  await boss.goto(`${BASE}/business/team`); await idle(boss);
  const row = boss.locator("li", { hasText: EMP.email });
  await row.locator("select").selectOption("viewer");
  await boss.waitForTimeout(1200);
  await emp.goto(`${BASE}/business/tasks?filter=open`); await idle(emp);
  assert(!(await emp.locator('button:has-text("New task")').count()), "viewer can create tasks");
  await emp.getByText("Draft sitemap").first().waitFor();
});

const rival = await newPage();
await step("Tenant isolation: another company cannot see or open Acme's data", async () => {
  await registerBusiness(rival, RIVAL);
  await rival.goto(`${BASE}/business/projects`); await idle(rival);
  assert(!(await rival.getByText("Website relaunch").count()), "rival sees Acme project in list");
  const r = await rival.goto(projectUrl); await idle(rival);
  assert(r.status() === 404, `rival opened Acme project: ${r.status()}`);
  const r2 = await rival.goto(docMemoryUrl); await idle(rival);
  assert(r2.status() === 404, `rival opened Acme memory: ${r2.status()}`);
  await rival.goto(`${BASE}/business/memory?q=Stadtwerke`); await idle(rival);
  assert(!(await rival.getByText("Framework contract").count()), "rival search finds Acme content");
});

const priv = await newPage();
await step("World isolation: a personal account cannot reach ONE Business", async () => {
  await priv.goto(`${BASE}/register?world=personal`); await idle(priv);
  await priv.fill("#email", PRIV.email); await priv.fill("#password", PRIV.password);
  await priv.check('input[name="terms"]');
  await priv.click('button[type="submit"]:has-text("Create account")');
  await verifyFromOutbox(priv);
  await priv.goto(`${BASE}/business`); await idle(priv);
  assert(new URL(priv.url()).pathname.startsWith("/app") || new URL(priv.url()).pathname.startsWith("/onboarding"), `personal user reached ${priv.url()}`);
  const r = await priv.goto(projectUrl); await idle(priv);
  assert(!new URL(priv.url()).pathname.startsWith("/business") || r.status() === 404, "personal user opened a company project");
});

await step("Account type switch only via request; owner approves in admin", async () => {
  await priv.goto(`${BASE}/onboarding`); await idle(priv);
  await priv.fill('input[aria-label="Your name"]', "Pia");
  await priv.click("text=Continue"); await priv.click("text=Continue"); await priv.click("text=Continue");
  await priv.click('button:has-text("Go to my dashboard")');
  await priv.waitForURL("**/app**"); await idle(priv);
  await priv.goto(`${BASE}/app/settings`); await idle(priv);
  await priv.fill("#sw-company", "Pia Design Studio");
  await priv.fill("#sw-reason", "I am starting my own studio and want to use ONE for it.");
  await priv.click('button:has-text("Request ONE Business")');
  await priv.getByText("Your request is being reviewed").waitFor();
  await priv.goto(`${BASE}/business`); await idle(priv);
  assert(!new URL(priv.url()).pathname.startsWith("/business"), "switch happened without approval");
});

const owner = await newPage();
await step("Admin: overview splits Personal/Business; businesses list shows metadata only", async () => {
  await login(owner, OWNER);
  await owner.waitForURL(/\/(admin|verify-owner)/); await idle(owner);
  await owner.getByRole("heading", { name: "Platform overview" }).waitFor();
  await owner.getByText("ONE Business users").waitFor();
  await owner.goto(`${BASE}/admin/businesses?q=${encodeURIComponent(BOSS.company)}`); await idle(owner);
  await owner.click(`a:has-text("${BOSS.company}")`); await idle(owner);
  await owner.getByText("Company documents, tasks and knowledge are not accessible").waitFor();
  assert(!(await owner.getByText("Framework contract").count()), "admin sees company content");
  assert(!(await owner.getByText("Draft sitemap").count()), "admin sees company tasks");
  await shot(owner, "05-admin-business");
});

await step("Admin approves the account type request → user now lands in ONE Business", async () => {
  await owner.goto(`${BASE}/admin/requests`); await idle(owner);
  const row = owner.locator("div.py-4", { hasText: PRIV.email });
  await row.locator('button:has-text("Approve")').click();
  await row.waitFor({ state: "detached", timeout: 15000 });
  await priv.goto(`${BASE}/business`); await idle(priv);
  assert(new URL(priv.url()).pathname.startsWith("/business"), `approved user not in business: ${priv.url()}`);
  await priv.getByText("Pia Design Studio").first().waitFor();
});

await step("Admin plan management: set a business price → visible on landing; remove it again", async () => {
  await owner.goto(`${BASE}/admin/plans`); await idle(owner);
  const card = owner.locator("details", { has: owner.locator("#p-starter") });
  await card.locator("summary").click();
  await owner.fill("#p-starter", "39");
  await card.locator('button:has-text("Save plan")').click();
  await owner.getByText("Plan saved.").first().waitFor();
  const anon = await newPage();
  await anon.goto(BASE); await idle(anon);
  await anon.getByText("€39.00").first().waitFor();
  // server-side limits: price is now bookable for the company owner
  await boss.goto(`${BASE}/business/settings/billing?plan=starter`); await idle(boss);
  await boss.getByText("Go to checkout").waitFor();
  await owner.fill("#p-starter", "");
  await card.locator('button:has-text("Save plan")').click();
  await owner.waitForTimeout(800);
  await anon.goto(BASE); await idle(anon);
  assert(!(await anon.getByText("€39.00").count()), "price not removed");
  await owner.goto(`${BASE}/admin/audit`); await idle(owner);
  await owner.getByText("admin.plan_config_changed").first().waitFor();
});

await step("Owner MFA: enrol TOTP, new session must confirm a code, then turn it off", async () => {
  await owner.goto(`${BASE}/admin/security`); await idle(owner);
  await owner.click('button:has-text("Set up two-factor authentication")');
  const secretEl = owner.getByTestId("mfa-secret");
  await secretEl.waitFor();
  const secret = (await secretEl.textContent()).replace(/\s+/g, "");
  await owner.fill("#mfa-enrol", "000000");
  await owner.click('button:has-text("Activate two-factor authentication")');
  await owner.getByText("That code is not correct.").waitFor();
  await owner.fill("#mfa-enrol", totp(secret));
  await owner.click('button:has-text("Activate two-factor authentication")');
  await owner.getByText("Every new admin session asks for a code").waitFor();
  const o2 = await newPage();
  await login(o2, OWNER);
  await o2.waitForURL("**/verify-owner"); await idle(o2);
  const r = await o2.goto(`${BASE}/admin/users`); await idle(o2);
  assert(o2.url().includes("/verify-owner"), "admin page reachable without second factor");
  await o2.fill("#mfa-verify", totp(secret));
  await o2.click('button:has-text("Continue")');
  await o2.waitForURL("**/admin"); await idle(o2);
  await o2.getByRole("heading", { name: "Platform overview" }).waitFor();
  await o2.goto(`${BASE}/admin/security`); await idle(o2);
  await o2.fill("#mfa-disable", totp(secret));
  await o2.click('button:has-text("Turn off two-factor authentication")');
  await o2.locator('button:has-text("Set up two-factor authentication")').waitFor();
  void r;
});

await step("Non-owners get 404 on the owner verification page and admin", async () => {
  for (const path of ["/verify-owner", "/admin", "/admin/plans"]) {
    const r = await boss.goto(BASE + path); await idle(boss);
    assert(r.status() === 404, `${path} returned ${r.status()} for a business owner`);
  }
});

await step("Responsive: no horizontal overflow at 1440 / 1024 / 768 / 390 / 360 px", async () => {
  const targets = [
    [boss, ["/business", "/business/tasks", projectUrl.replace(BASE, ""), "/business/memory", "/business/team", "/business/settings/billing"]],
    [owner, ["/admin", "/admin/users", "/admin/plans", "/admin/analytics"]],
  ];
  const anon = await newPage();
  targets.push([anon, ["/", "/register", "/register?world=business", "/login"]]);
  const problems = [];
  for (const w of [1440, 1024, 768, 390, 360]) {
    for (const [p, paths] of targets) {
      await p.setViewportSize({ width: w, height: 900 });
      for (const path of paths) {
        await p.goto(BASE + path); await idle(p);
        const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
        if (o.sw > o.cw + 1) problems.push(`${path} @${w}px: ${o.sw} > ${o.cw}`);
      }
    }
    await boss.goto(`${BASE}/business`); await idle(boss);
    await shot(boss, `06-business-${w}`);
  }
  assert(!problems.length, problems.join("; "));
});

await step("Mobile: bottom navigation + “More” sheet in ONE Business", async () => {
  await boss.setViewportSize({ width: 390, height: 844 });
  await boss.goto(`${BASE}/business`); await idle(boss);
  const nav = boss.locator('nav[aria-label="Main mobile"]');
  await nav.waitFor();
  await nav.locator('button:has-text("More")').click();
  await boss.locator('[role="dialog"][aria-label="More"]').getByText("Team").click();
  await boss.waitForURL("**/business/team"); await idle(boss);
});

await step("PWA: manifest, icons, service worker and offline page are served", async () => {
  const m = await boss.request.get(`${BASE}/manifest.webmanifest`);
  assert(m.ok(), "manifest missing");
  const j = await m.json();
  assert(j.display === "standalone" && j.icons.length >= 2, "manifest incomplete");
  for (const path of ["/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png", "/sw.js", "/offline.html"]) {
    const r = await boss.request.get(BASE + path);
    assert(r.ok(), `${path} → ${r.status()}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
await browser.close();
process.exit(failed ? 1 : 0);
