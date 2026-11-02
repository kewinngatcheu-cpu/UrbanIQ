import { test } from "node:test";
import assert from "node:assert/strict";
import { PLANS, PLAN_ORDER, minPlanFor, isPlanId, formatPrice } from "../../src/lib/config/plans.ts";

test("plans are ordered by price and limits never shrink on upgrade", () => {
  for (let i = 1; i < PLAN_ORDER.length; i++) {
    const a = PLANS[PLAN_ORDER[i - 1]], b = PLANS[PLAN_ORDER[i]];
    assert.ok(b.priceMonthlyEur > a.priceMonthlyEur);
    for (const k of Object.keys(a.limits) as (keyof typeof a.limits)[]) assert.ok(b.limits[k] >= a.limits[k], `${b.id}.${k}`);
    for (const f of Object.keys(a.features) as (keyof typeof a.features)[]) if (a.features[f]) assert.ok(b.features[f], `${b.id} lost ${f}`);
  }
});

test("free plan costs nothing; feature gates map to the right plan", () => {
  assert.equal(PLANS.free.priceMonthlyEur, 0);
  assert.equal(minPlanFor("taskExtraction"), "premium");
  assert.equal(minPlanFor("priorityProcessing"), "exclusive");
  assert.equal(minPlanFor("actionPlans"), "free");
});

test("isPlanId rejects unknown values (no privilege injection via plan names)", () => {
  assert.ok(isPlanId("premium"));
  for (const v of ["owner", "admin", "", null, undefined, "PREMIUM"]) assert.equal(isPlanId(v), false);
});

test("formatPrice", () => {
  assert.equal(formatPrice(0), "€0");
  assert.equal(formatPrice(12.99), "€12.99");
});
