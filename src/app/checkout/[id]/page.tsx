import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FlaskConical, ShieldCheck, Check } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCheckout } from "@/lib/billing";
import { PLANS, formatPrice } from "@/lib/config/plans";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmCheckout, AwaitPayment } from "./confirm";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const co = await getCheckout(user, id);
  if (!co) notFound();
  const plan = PLANS[co.plan];
  const open = co.status === "pending" && Date.parse(co.expires_at) > Date.now();
  return (
    <div className="bg-one-gradient min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center px-5"><Link href="/app"><Logo /></Link></header>
      <main className="mx-auto max-w-lg px-5 pb-20 pt-6">
        <div className="animate-fade-up rounded-3xl border border-line bg-white p-8 shadow-lift">
          {co.provider === "demo" && (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-[#e2dcff] bg-lavender/70 px-3.5 py-2.5 text-[13px] text-lavender-ink">
              <FlaskConical className="size-4 shrink-0" />
              <span><strong>Demo payment mode.</strong> No real payment is processed and no money is charged.</span>
            </div>
          )}
          <p className="mt-7 text-[13px] font-semibold tracking-[0.18em] text-accent-strong">ONE {plan.name.toUpperCase()}</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-4xl font-semibold text-ink">{formatPrice(co.amount_eur)}</span>
            <span className="text-muted">/ month</span>
          </div>
          <ul className="mt-6 space-y-2">
            {plan.bullets.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-sm text-ink"><Check className="size-4 text-accent" /> {b}</li>
            ))}
          </ul>
          <div className="mt-8 border-t border-line pt-6">
            {co.status === "paid" ? (
              <div className="text-center">
                <p className="font-semibold text-mint-ink">This plan is active.</p>
                <Link href="/app" className={buttonVariants({ className: "mt-4" })}>Go to dashboard</Link>
              </div>
            ) : co.provider === "stripe" && co.status === "pending" ? (
              <AwaitPayment />
            ) : open ? (
              <ConfirmCheckout id={co.id} planName={plan.name} />
            ) : (
              <div className="text-center text-sm text-muted">
                This checkout has expired or was canceled.
                <Link href="/app/settings/billing" className={buttonVariants({ variant: "secondary", className: "mt-4 w-full" })}>Back to plans</Link>
              </div>
            )}
          </div>
          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted"><ShieldCheck className="size-3.5" /> Your plan activates only after server-side confirmation.</p>
        </div>
      </main>
    </div>
  );
}
