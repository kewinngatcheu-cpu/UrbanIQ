/**
 * Stripe webhook integration test.
 * Starts its own ONE server in Stripe mode (isolated data dir, test signing secret) on port 3100,
 * registers a user through the UI, then sends signed Stripe events and checks the resulting plan.
 * No real Stripe account or network access to Stripe is needed.
 *
 *   npm run build && node tests/integration/stripe-webhook.mjs
 */
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Stripe = require("stripe");
const { chromium } = require("playwright");

const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
const DATA = ".data-stripe-test";
const SECRET = "whsec_test_one_integration_secret";
const env = {
  ...process.env,
  PORT: String(PORT),
  ONE_BACKEND: "local",
  ONE_DATA_DIR: DATA,
  NEXT_PUBLIC_APP_URL: BASE,
  ONE_SESSION_SECRET: "integration-test-session-secret-0123456789abcdef",
  ONE_BILLING_MODE: "stripe",
  STRIPE_SECRET_KEY: "sk_test_dummy_not_used_for_webhooks",
  STRIPE_WEBHOOK_SECRET: SECRET,
  STRIPE_PRICE_PREMIUM: "price_premium_test",
  STRIPE_PRICE_EXCLUSIVE: "price_exclusive_test",
  ANTHROPIC_API_KEY: "",
};
rmSync(DATA, { recursive: true, force: true });
const server = spawn("npx", ["next", "start", "-p", String(PORT)], { env, stdio: ["ignore", "pipe", "pipe"], detached: true });
const stopServer = () => { try { process.kill(-server.pid, "SIGTERM"); } catch {} };
process.on("exit", stopServer);
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));

let failed = 0, passed = 0;
const check = (cond, name) => { if (cond) { passed++; console.log(`✔ ${name}`); } else { failed++; console.log(`✘ ${name}`); } };
const stripe = new Stripe("sk_test_dummy");

try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }

  // Register + verify a user through the UI
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${BASE}/register`);
  await page.fill("#email", `stripe.${Date.now()}@one.test`);
  await page.fill("#password", "StripeTest2026");
  await page.check('input[name="terms"]');
  await page.click('button[type="submit"]');
  await page.waitForURL("**/verify-email");
  await page.click("text=Open verification link");
  await page.waitForURL("**/onboarding");
  const state = async () => (await (await page.request.get(`${BASE}/api/export`)).json());
  const userId = (await state()).profile.id;

  let n = 0;
  const send = async (type, object, { id = `evt_test_${++n}`, sign = true } = {}) => {
    const payload = JSON.stringify({ id, object: "event", type, api_version: "2026-10-28.endive", created: Math.floor(Date.now() / 1000), data: { object } });
    const header = sign ? stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET }) : "t=1,v1=deadbeef";
    const res = await fetch(`${BASE}/api/billing/stripe-webhook`, { method: "POST", headers: { "Content-Type": "application/json", "Stripe-Signature": header }, body: payload });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  };
  const sub = (over = {}) => ({
    id: "sub_test_1", object: "subscription", status: "active", customer: "cus_test_1", cancel_at_period_end: false,
    metadata: { user_id: userId, plan: "premium" },
    items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400, price: { id: "price_premium_test" } }] },
    ...over,
  });

  const forged = await send("customer.subscription.created", sub(), { sign: false });
  check(forged.status === 400 && (await state()).profile.plan === "free", "unsigned / forged event is rejected and changes nothing");

  const created = await send("customer.subscription.created", sub(), { id: "evt_created" });
  let s = await state();
  check(created.status === 200 && s.profile.plan === "premium" && s.subscription.provider === "stripe" && s.subscription.stripe_customer_id === "cus_test_1", "subscription.created activates Premium");

  const dup = await send("customer.subscription.created", sub(), { id: "evt_created" });
  check(dup.body.duplicate === true, "duplicate event delivery is ignored (idempotent)");

  await send("customer.subscription.updated", sub({ items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400, price: { id: "price_exclusive_test" } }] } }));
  check((await state()).profile.plan === "exclusive", "price change to Exclusive is applied");

  await send("customer.subscription.updated", sub({ status: "past_due", items: { data: [{ price: { id: "price_exclusive_test" } }] } }));
  s = await state();
  check(s.profile.plan === "exclusive" && s.subscription.status === "past_due", "past_due keeps access but flags the subscription");

  await send("customer.subscription.updated", sub({ cancel_at_period_end: true, items: { data: [{ price: { id: "price_exclusive_test" } }] } }));
  s = await state();
  check(s.subscription.cancel_at_period_end === true && s.profile.plan === "exclusive", "scheduled cancellation keeps the plan until period end");

  await send("customer.subscription.deleted", sub({ status: "canceled" }));
  s = await state();
  check(s.profile.plan === "free" && s.subscription.provider === "none", "subscription.deleted returns the user to Free");

  const unknown = await send("customer.subscription.created", sub({ id: "sub_other", customer: "cus_unknown", metadata: { user_id: "00000000-0000-0000-0000-000000000000", plan: "exclusive" } }));
  check(unknown.status === 200 && (await state()).profile.plan === "free", "event for an unknown customer is acknowledged and ignored");

  await send("checkout.session.completed", { id: "cs_test_1", object: "checkout.session", customer: "cus_test_1", metadata: { user_id: userId, plan: "premium", checkout_id: "none" } });
  check((await state()).subscription.stripe_customer_id === "cus_test_1", "checkout.session.completed stores the customer");

  // UI in stripe mode: no demo checkout; trying to start checkout with a fake key fails gracefully
  for (let i = 0; i < 3; i++) await page.click("text=Continue");
  await page.click("text=Go to my dashboard");
  await page.waitForURL("**/app**");
  await page.goto(`${BASE}/app/settings/billing?plan=premium#upgrade`);
  check((await page.getByText("Billing runs in demo mode", { exact: false }).count()) === 0, "billing page shows no demo-billing notice in Stripe mode");
  await page.click('button:has-text("Go to checkout")');
  await page.getByText("payment provider couldn't process", { exact: false }).waitFor({ timeout: 30000 }).then(
    () => check(true, "checkout with an invalid Stripe key fails with a friendly message"),
    () => check(false, "checkout with an invalid Stripe key fails with a friendly message"),
  );
  check((await state()).profile.plan === "free", "a failed checkout never activates a plan");
  await browser.close();
} catch (e) {
  failed++;
  console.error(e);
  console.error(serverLog.slice(-3000));
} finally {
  stopServer();
  rmSync(DATA, { recursive: true, force: true });
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
