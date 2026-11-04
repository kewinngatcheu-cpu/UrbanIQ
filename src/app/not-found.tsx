import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

export default async function NotFound() {
  const tr = await getT();
  return (
    <div className="bg-one-gradient flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <Logo size="lg" />
      <p className="mt-10 text-[13px] font-semibold tracking-[0.18em] text-accent-strong">404</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink">{tr("This page doesn't exist.")}</h1>
      <p className="mt-2 text-muted">{tr("It may have been moved or deleted.")}</p>
      <Link href="/" className={buttonVariants({ className: "mt-8" })}>{tr("Back to ONE")}</Link>
    </div>
  );
}
