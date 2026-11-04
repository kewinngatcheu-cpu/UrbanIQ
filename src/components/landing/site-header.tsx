import { LanguageSwitch } from "@/components/language-switch";
import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const tr = await getT();
  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-white/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" aria-label={tr("ONE home")}><Logo /></Link>
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <Link href="/#worlds" className="transition hover:text-ink">{tr("Personal & Business")}</Link>
          <Link href="/#modules" className="transition hover:text-ink">{tr("Product")}</Link>
          <Link href="/#pricing" className="transition hover:text-ink">{tr("Pricing")}</Link>
          <Link href="/#faq" className="transition hover:text-ink">{tr("FAQ")}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitch className="hidden sm:inline-flex" />
          {signedIn ? (
            <Link href="/app" className={buttonVariants({ size: "sm" })}>{tr("Open ONE")}</Link>
          ) : (
            <>
              <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>{tr("Log in")}</Link>
              <Link href="/register" className={buttonVariants({ size: "sm" })}>{tr("Get started")}</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const tr = await getT();
  return (
    <footer className="border-t border-line bg-snow">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-10 sm:flex-row sm:items-center">
        <div>
          <Logo size="sm" />
          <p className="mt-2 text-sm text-muted">{tr("Your Life. Your Business. One Intelligent System.")}</p>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-muted">
          <Link href="/privacy" className="hover:text-ink">{tr("Privacy")}</Link>
          <Link href="/terms" className="hover:text-ink">{tr("Terms")}</Link>
          <a href="#faq" className="hover:text-ink">{tr("FAQ")}</a>
          <span>© {new Date().getFullYear()} ONE</span>
        </div>
      </div>
    </footer>
  );
}
