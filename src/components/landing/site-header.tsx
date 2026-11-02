import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-white/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" aria-label="ONE home"><Logo /></Link>
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="#modules" className="transition hover:text-ink">Product</a>
          <a href="#preview" className="transition hover:text-ink">Preview</a>
          <a href="#pricing" className="transition hover:text-ink">Pricing</a>
          <a href="#faq" className="transition hover:text-ink">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Link href="/app" className={buttonVariants({ size: "sm" })}>Open ONE</Link>
          ) : (
            <>
              <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>Log in</Link>
              <Link href="/register" className={buttonVariants({ size: "sm" })}>Get started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-snow">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-10 sm:flex-row sm:items-center">
        <div>
          <Logo size="sm" />
          <p className="mt-2 text-sm text-muted">Your Personal Life Operating System.</p>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-muted">
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
          <a href="#faq" className="hover:text-ink">FAQ</a>
          <span>© {new Date().getFullYear()} ONE</span>
        </div>
      </div>
    </footer>
  );
}
