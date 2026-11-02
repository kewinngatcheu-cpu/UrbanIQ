import type { Metadata } from "next";
import { requireOwner } from "@/lib/auth";
import { FEATURE_FLAGS, getFlags, type FlagKey } from "@/lib/features";
import { PLANS, PLAN_ORDER, FEATURE_LABELS, type FeatureKey } from "@/lib/config/plans";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { toggleFlag } from "../actions";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Features" };

export default async function AdminFeatures() {
  await requireOwner();
  const flags = await getFlags();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Product features</h1>
        <p className="text-sm text-muted">Global switches take effect immediately for everyone. Changes are logged.</p>
      </div>
      <Card>
        <CardHeader title="Feature switches" />
        <CardBody className="divide-y divide-line/70 pt-2">
          {(Object.keys(FEATURE_FLAGS) as FlagKey[]).map((k) => (
            <div key={k} className="flex items-center justify-between gap-4 py-3.5">
              <div>
                <p className="font-mono text-[13px] text-ink">{k}</p>
                <p className="text-[13px] text-muted">{FEATURE_FLAGS[k].description}</p>
              </div>
              <form action={toggleFlag}>
                <input type="hidden" name="key" value={k} />
                <input type="hidden" name="enabled" value={String(!flags[k])} />
                <button role="switch" aria-checked={flags[k]} aria-label={`Toggle ${k}`}
                  className={cn("relative h-6 w-11 rounded-full transition", flags[k] ? "bg-accent" : "bg-cloud/60")}>
                  <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", flags[k] ? "left-[22px]" : "left-0.5")} />
                </button>
              </form>
            </div>
          ))}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Plan entitlements" description="Defined centrally in src/lib/config/plans.ts — edit prices, limits and features there." />
        <CardBody className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="text-[12px] uppercase tracking-wider text-muted">
              <tr><th className="py-2 pr-4 font-medium">Feature / limit</th>{PLAN_ORDER.map((p) => <th key={p} className="py-2 pr-4 font-medium">{PLANS[p].name}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              <tr><td className="py-2 pr-4 text-ink">Price / month</td>{PLAN_ORDER.map((p) => <td key={p} className="py-2 pr-4">€{PLANS[p].priceMonthlyEur}</td>)}</tr>
              {(["aiRequestsPerMonth", "storageMb", "maxFileMb", "memories", "activeActions"] as const).map((l) => (
                <tr key={l}><td className="py-2 pr-4 text-ink">{l}</td>{PLAN_ORDER.map((p) => <td key={p} className="py-2 pr-4">{PLANS[p].limits[l].toLocaleString()}</td>)}</tr>
              ))}
              {(Object.keys(FEATURE_LABELS) as FeatureKey[]).map((f) => (
                <tr key={f}><td className="py-2 pr-4 text-ink">{FEATURE_LABELS[f]}</td>{PLAN_ORDER.map((p) => <td key={p} className="py-2 pr-4">{PLANS[p].features[f] ? "✓" : "—"}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
