"use client";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import { setLanguage } from "@/lib/i18n/actions";
import { useLocale } from "./i18n";
import { cn } from "@/lib/utils";

/** DE / EN toggle. Stores the choice in a cookie; the page re-renders server-side. */
export function LanguageSwitch({ className }: { className?: string }) {
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-full border border-line bg-white/80 p-0.5 text-[12px] shadow-soft", pending && "opacity-60", className)} role="group" aria-label="Language / Sprache">
      <Globe className="ml-1.5 mr-0.5 size-3.5 text-muted" aria-hidden />
      {(["de", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={locale === l}
          disabled={pending}
          onClick={() => start(async () => { const f = new FormData(); f.set("lang", l); await setLanguage(f); })}
          className={cn("rounded-full px-2 py-0.5 font-medium uppercase transition", locale === l ? "bg-accent text-white" : "text-muted hover:text-ink")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
