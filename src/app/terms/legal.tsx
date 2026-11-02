import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function LegalPage({ title, sections }: { title: string; sections: [string, string][] }) {
  return (
    <div className="bg-one-gradient min-h-screen">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link href="/"><Logo /></Link>
        <h1 className="mt-12 text-4xl font-semibold tracking-tight text-ink">{title}</h1>
        <div className="mt-10 space-y-8">
          {sections.map(([h, t]) => (
            <section key={h}>
              <h2 className="text-lg font-semibold text-ink">{h}</h2>
              <p className="mt-2 leading-relaxed text-muted">{t}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
