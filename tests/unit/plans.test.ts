import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PLANS, PLANS, PERSONAL_FEATURES, BUSINESS_FEATURES, isPlanId, isWorld, formatPrice, DEFAULT_PLAN } from "../../src/lib/config/plans.ts";

const world = (w: "personal" | "business") => DEFAULT_PLANS.filter((p) => p.world === w).sort((a, b) => a.sort - b.sort);

test("personal prices are exactly 0 / 14.99 / 29.99 €", () => {
  assert.deepEqual(world("personal").map((p) => [p.id, p.priceMonthlyEur]), [["free", 0], ["premium", 14.99], ["exclusive", 29.99]]);
});

test("business plans have NO invented prices (configured by the owner in admin)", () => {
  assert.deepEqual(world("business").map((p) => p.id), ["starter", "growth", "scale"]);
  for (const p of world("business")) assert.equal(p.priceMonthlyEur, null, `${p.id} must not have a default price`);
});

test("within each world, limits never shrink and features are never lost on upgrade", () => {
  for (const w of ["personal", "business"] as const) {
    const list = world(w);
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1], b = list[i];
      for (const k of Object.keys(a.limits) as (keyof typeof a.limits)[]) assert.ok(b.limits[k] >= a.limits[k], `${b.id}.${k}`);
      for (const [f, on] of Object.entries(a.features)) if (on) assert.ok(b.features[f as keyof typeof b.features], `${b.id} lost ${f}`);
    }
  }
});

test("each plan only declares features of its own world", () => {
  for (const p of DEFAULT_PLANS) {
    const allowed = p.world === "business" ? BUSINESS_FEATURES : PERSONAL_FEATURES;
    for (const f of Object.keys(p.features)) assert.ok(allowed.includes(f as never), `${p.id} declares foreign feature ${f}`);
  }
  assert.ok(!PLANS.premium.features.team && !PLANS.premium.features.projects, "personal plans have no team/project-management features");
  assert.equal(PLANS.starter.limits.members, 3);
  assert.equal(PLANS.growth.limits.members, 15);
});

test("isPlanId / isWorld reject unknown values (no privilege injection)", () => {
  assert.ok(isPlanId("premium"));
  for (const v of ["owner", "admin", "", null, undefined, "PREMIUM", "starter"]) assert.equal(isPlanId(v), false);
  assert.ok(isWorld("business"));
  for (const v of ["admin", "owner", "", null]) assert.equal(isWorld(v), false);
  assert.deepEqual(DEFAULT_PLAN, { personal: "free", business: "starter" });
});

test("formatPrice", () => {
  assert.equal(formatPrice(0), "€0");
  assert.equal(formatPrice(14.99), "€14.99");
  assert.equal(formatPrice(29.99, "de"), "29,99 €");
  assert.equal(formatPrice(null), "Price coming soon");
  assert.equal(formatPrice(null, "de"), "Preis folgt");
});
