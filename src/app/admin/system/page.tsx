import { getT, getLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { requireAdmin } from "@/lib/admin-guard";
import { systemDb } from "@/lib/db";
import { env } from "@/lib/config/env";
import { stripeConfigured } from "@/lib/billing/stripe";
import { mailConfigured } from "@/lib/mail";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("System") };
}

type Check = { name: string; state: "ok" | "warn" | "error"; detail: string };

export default async function AdminSystem() {
  const tr = await getT();
  const locale = await getLocale();
  await requireAdmin();
  const checks: Check[] = [];
  const t0 = Date.now();
  try {
    await systemDb().count("profiles");
    checks.push({ name: "Database", state: env.backend === "supabase" ? "ok" : "warn", detail: `${env.backend === "supabase" ? tr("Supabase PostgreSQL") : tr("Local JSON store (demo / development only)")} · ${Date.now() - t0} ms` });
  } catch (e) {
    checks.push({ name: "Database", state: "error", detail: (e as Error).message });
  }
  checks.push({ name: "Authentication", state: env.backend === "supabase" ? "ok" : "warn", detail: env.backend === "supabase" ? tr("Supabase Auth") : tr("Local auth (scrypt + signed session cookie), demo mail outbox") });
  checks.push({ name: "File storage", state: env.backend === "supabase" ? "ok" : "warn", detail: env.backend === "supabase" ? tr("Supabase Storage bucket “documents”") : `Local folder ${env.dataDir}/uploads` });
  checks.push({ name: "AI provider", state: env.aiMode === "anthropic" ? "ok" : "warn", detail: env.aiMode === "anthropic" ? `Anthropic · ${env.aiModel}` : tr("Demo mode — set ANTHROPIC_API_KEY to enable real AI") });
  checks.push({
    name: "Billing",
    state: env.billingMode === "stripe" ? (stripeConfigured() ? "ok" : "error") : "warn",
    detail: env.billingMode === "stripe"
      ? stripeConfigured() ? tr("Stripe — Checkout, webhook (/api/billing/stripe-webhook) and customer portal") : tr("Stripe mode, but STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / STRIPE_PRICE_* are incomplete")
      : tr("Demo payment mode — no real payments"),
  });
  checks.push({
    name: "Email",
    state: env.backend === "supabase" || mailConfigured() ? "ok" : "warn",
    detail: mailConfigured() ? tr("Resend (verification & password reset emails)") : env.backend === "supabase" ? tr("Supabase Auth mailer") : tr("No mail service — demo outbox (verification) / server log (password reset)"),
  });
  checks.push({ name: "Owner configuration", state: env.ownerUserId ? "ok" : "error", detail: env.ownerUserId ? tr("ONE_OWNER_USER_ID is set (server-side)") : tr("ONE_OWNER_USER_ID missing") });
  checks.push({ name: "Session secret", state: env.backend === "supabase" || (process.env.ONE_SESSION_SECRET?.length ?? 0) >= 32 ? "ok" : "warn", detail: env.backend === "supabase" ? tr("Managed by Supabase") : (process.env.ONE_SESSION_SECRET?.length ?? 0) >= 32 ? tr("Custom secret configured") : tr("Using development fallback secret") });

  const Icon = { ok: CheckCircle2, warn: AlertTriangle, error: XCircle };
  const color = { ok: "text-mint-ink", warn: "text-peach-ink", error: "text-rose-ink" };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{tr("System status")}</h1>
        <p className="text-sm text-muted">{tr("Runtime: Node {v} · {mode} · checked {time}", { v: process.version, mode: env.isProd ? "production" : "development", time: new Date().toLocaleTimeString(locale === "de" ? "de-DE" : "en-GB") })}</p>
      </div>
      <Card>
        <CardHeader title={tr("Components")} />
        <CardBody className="divide-y divide-line/70 pt-2">
          {checks.map((c) => {
            const I = Icon[c.state];
            return (
              <div key={c.name} className="flex items-start gap-3 py-3">
                <I className={`mt-0.5 size-5 ${color[c.state]}`} />
                <div><p className="text-[14px] font-medium text-ink">{tr(c.name)}</p><p className="text-[13px] text-muted">{tr(c.detail)}</p></div>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}
