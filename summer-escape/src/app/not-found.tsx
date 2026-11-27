import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow text-sand-deep">Our Summer Escape 2027</p>
      <h1 className="mt-5 font-display text-5xl font-light">
        This path leads <span className="italic">nowhere.</span>
      </h1>
      <p className="mt-4 max-w-sm text-sm text-ink-soft">Der Link ist ungültig oder wurde erneuert. Bitte nutze deinen aktuellen persönlichen Link.</p>
      <Link href="/" className="mt-10 text-xs uppercase tracking-[0.24em] underline-offset-4 hover:underline">
        Zur Startseite
      </Link>
    </main>
  );
}
