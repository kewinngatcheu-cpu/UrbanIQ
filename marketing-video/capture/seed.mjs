/**
 * Seeds a running local ONE instance (demo backend) with a realistic persona
 * through the REAL user interface — every item is created by clicking through ONE.
 *
 *   BASE=http://localhost:3000 EMAIL=... PASSWORD=... node marketing-video/capture/seed.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const EMAIL = process.env.EMAIL ?? "demo@one.app";
const PASSWORD = process.env.PASSWORD ?? "DemoPassw0rd2026";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: "Europe/Berlin", locale: "en-GB" });
const page = await ctx.newPage();
const go = async (p) => { await page.goto(BASE + p); await page.waitForLoadState("networkidle"); };
const step = (s) => console.log("•", s);

await go("/login");
await page.fill("#email", EMAIL);
await page.fill("#password", PASSWORD);
await page.click('button[type="submit"]:has-text("Sign in")');
await page.waitForURL(/\/app/, { timeout: 30000 });
await page.context().addCookies([{ name: "one_locale", value: "en", url: BASE }]);

// ── Memory via the central composer ("Remember")
await go("/app");
for (const text of [
  "Passport expires on 14 March 2027 — book a renewal appointment at the citizens' office in time. #documents #travel",
  "Idea: long weekend in Lisbon next spring with Jonas — Alfama, LX Factory, sunset at Miradouro. #travel",
  "Studio Wi-Fi: FRITZ!Box 7590, password is in the blue notebook on the shelf. #home",
]) {
  await page.click('[role="tab"]:has-text("Remember")');
  await page.fill("#one-input", text);
  await page.click('button[aria-label="Send"]');
  await page.getByText("Saved to Memory.").waitFor();
  step("memory: " + text.slice(0, 40));
}

// ── Memory via form
await go("/app/memory");
await page.click('button:has-text("New memory")');
await page.fill("#m-title", "Gym contract FitLife");
await page.fill("#m-content", "FitLife gym membership, member number 88213. Monthly fee 39.90 EUR. Contract can be cancelled until 15.11.2026.");
await page.fill("#m-tags", "finance, contracts");
await page.click('button[type="submit"]:has-text("Save")');
await page.waitForTimeout(1500);
step("memory: gym");

// ── Documents (real upload + text extraction)
const docs = [
  { name: "electricity-invoice-55-1029.txt", title: "Electricity invoice — Stadtwerke", body: "Stadtwerke electricity invoice no. 55-1029.\nBilling period: October 2026.\nAmount due: 84.20 EUR.\nPlease pay by 20.11.2026." },
  { name: "rental-agreement-kastanienallee.txt", title: "Rental agreement — Kastanienallee 12", body: "Rental agreement for the apartment Kastanienallee 12, 3rd floor.\nMonthly rent: 1,180.00 EUR incl. utilities.\nLandlord: Haven Properties GmbH.\nAnnual utility statement expected in spring." },
  { name: "nordlicht-car-insurance-renewal.txt", title: "Car insurance renewal — Nordlicht", body: "Nordlicht Versicherung AG — Policy no. KFZ-44817-2.\nDear Ms Lindqvist, your car insurance renews automatically on 01.01.2027.\nThe annual premium increases from 548.00 EUR to 612.40 EUR.\nIf you wish to cancel, your notice must reach us by 30.11.2026.\nPlease send the cancellation in writing or via the customer portal." },
];
let insuranceUrl = null;
for (const d of docs) {
  await go("/app/memory");
  await page.click('button:has-text("Upload")');
  await page.setInputFiles('input[type="file"]', { name: d.name, mimeType: "text/plain", buffer: Buffer.from(d.body) });
  await page.fill("#up-title", d.title);
  await page.click('form button[type="submit"]:has-text("Upload")');
  await page.getByText("Extracted text").first().waitFor({ timeout: 20000 });
  await page.waitForLoadState("networkidle");
  insuranceUrl = page.url();
  step("document: " + d.title);
}

// ── Understand: summary + task detection on the insurance letter → Life
await page.goto(insuranceUrl); await page.waitForLoadState("networkidle");
await page.click('button:has-text("Create quick summary")');
await page.getByText("Quick summary created").waitFor();
await page.click('button:has-text("Find tasks & deadlines")');
await page.getByText("ONE found", { exact: false }).waitFor();
await page.click('button:has-text("to Life")');
await page.getByText("added to Life", { exact: false }).waitFor();
step("insurance: summary + tasks");
console.log("INSURANCE_URL=" + insuranceUrl);

// ── Life items
const today = new Date();
const iso = (offset) => { const d = new Date(today); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
for (const [title, off, time] of [["Send tax documents to advisor", 0, "16:00"], ["Dentist check-up", 2, "10:30"], ["Pick up dry cleaning", 1, "18:00"], ["Call the landlord about the heating", 0, "11:00"]]) {
  await go("/app/life");
  await page.click('button:has-text("New item")');
  await page.fill("#t-title", title);
  await page.fill("#t-date", iso(off));
  await page.fill("#t-time", time);
  await page.click('form button[type="submit"]:has-text("Add")');
  await page.waitForTimeout(1200);
  step("task: " + title);
}
await go("/app/life?view=projects");
await page.click('button:has-text("New goal")');
await page.fill("#p-name", "Run a half marathon");
await page.click('form button[type="submit"]:has-text("Create")');
await page.getByText("Run a half marathon").first().waitFor();
await go("/app/life?view=reminders");
await page.fill("#r-title", "Renew passport appointment");
await page.click('button:has-text("Add reminder")');
await page.getByText("Reminder set.").waitFor();
step("goal + reminder");

// ── Action: cancellation plan
await go("/app/action/new?type=cancellation");
await page.fill("#a-title", "Cancel Nordlicht car insurance");
await page.fill("#a-desc", "Nordlicht Versicherung AG, policy no. KFZ-44817-2, notice by 30.11.2026");
await page.click('button:has-text("Prepare action")');
await page.getByText("Next steps").first().waitFor({ timeout: 20000 });
await page.waitForLoadState("networkidle");
await page.locator("ol li button").first().click();
await page.waitForTimeout(800);
await page.locator("ol li button").nth(1).click();
await page.waitForTimeout(800);
console.log("ACTION_URL=" + page.url());
await go("/app/action/new?type=understand_invoice");
await page.fill("#a-title", "Check Stadtwerke electricity invoice");
await page.fill("#a-desc", "Invoice no. 55-1029, 84.20 EUR, due 20.11.2026");
await page.click('button:has-text("Prepare action")');
await page.getByText("Next steps").first().waitFor({ timeout: 20000 });
step("actions");

// ── Ask ONE
await go("/app/intelligence");
await page.fill('textarea[aria-label="Ask ONE"]', "When do I need to cancel my car insurance?");
await page.click('form button[aria-label="Send"]');
await page.waitForTimeout(4000);
step("ask");

await browser.close();
