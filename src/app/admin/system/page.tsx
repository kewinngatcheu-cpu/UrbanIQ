import type { Metadata } from "next";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { systemDb } from "@/lib/db";
import { env } from "@/lib/config/env";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = { title: "System" };

type Check = { name: string; state: "ok" | "warn" | "error"; detail: string };

export default async function AdminSystem() {
  await requireOwner();
  const checks: Check[] = [];
  const t0 = Date.now();
  try {
    await systemDb().count("profiles");
    checks.push({ name: "Database", state: env.backend === "supabase" ? "ok" : "warn", detail: `${env.backend === "supabase" ? "Supabase PostgreSQL" : "Local JSON store (demo / development only)"} · ${Date.now() - t0} ms` });
  } catch (e) {
    checks.push({ name: "Database", state: "error", detail: (e as Error).message });
  }
  checks.push({ name: "Authentication", state: env.backend === "supabase" ? "ok" : "warn", detail: env.backend === "supabase" ? "Supabase Auth" : "Local auth (scrypt + signed session cookie), demo mail outbox" });
  checks.push({ name: "File storage", state: env.backend === "supabase" ? "ok" : "warn", detail: env.backend === "supabase" ? "Supabase Storage bucket “documents”" : `Local folder ${env.dataDir}/uploads` });
  checks.push({ name: "AI provider", state: env.aiMode === "anthropic" ? "ok" : "warn", detail: env.aiMode === "anthropic" ? `Anthropic · ${env.aiModel}` : "Demo mode — set ANTHROPIC_API_KEY to enable real AI" });
  checks.push({ name: "Billing", state: env.billingMode === "stripe" && env.stripeSecretKey ? "ok" : "warn", detail: env.billingMode === "stripe" ? "Stripe (integration pending — see README)" : "Demo payment mode" });
  checks.push({ name: "Owner configuration", state: env.ownerUserId ? "ok" : "error", detail: env.ownerUserId ? "ONE_OWNER_USER_ID is set (server-side)" : "ONE_OWNER_USER_ID missing" });
  checks.push({ name: "Session secret", state: env.backend === "supabase" || (process.env.ONE_SESSION_SECRET?.length ?? 0) >= 32 ? "ok" : "warn", detail: env.backend === "supabase" ? "Managed by Supabase" : (process.env.ONE_SESSION_SECRET?.length ?? 0) >= 32 ? "Custom secret configured" : "Using development fallback secret" });

  const Icon = { ok: CheckCircle2, warn: AlertTriangle, error: XCircle };
  const color = { ok: "text-mint-ink", warn: "text-peach-ink", error: "text-rose-ink" };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">System status</h1>
        <p className="text-sm text-muted">Runtime: Node {process.version} · {env.isProd ? "production" : "development"} · checked {new Date().toLocaleTimeString("en-GB")}</p>
      </div>
      <Card>
        <CardHeader title="Components" />
        <CardBody className="divide-y divide-line/70 pt-2">
          {checks.map((c) => {
            const I = Icon[c.state];
            return (
              <div key={c.name} className="flex items-start gap-3 py-3">
                <I className={`mt-0.5 size-5 ${color[c.state]}`} />
                <div><p className="text-[14px] font-medium text-ink">{c.name}</p><p className="text-[13px] text-muted">{c.detail}</p></div>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}
