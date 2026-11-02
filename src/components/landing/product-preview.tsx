import { getT } from "@/lib/i18n/server";
import { Brain, CheckCircle2, Clock, FileText, Sparkles, Zap, CalendarDays, Home } from "lucide-react";

/** Static, illustrative preview of the ONE dashboard for the landing page. */
export async function ProductPreview() {
  const tr = await getT();
  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="absolute -inset-x-10 -top-10 -bottom-10 -z-10 rounded-[3rem] bg-gradient-to-b from-sky/60 via-mist/50 to-transparent blur-2xl" />
      <div className="overflow-hidden rounded-[1.75rem] border border-line bg-white shadow-lift">
        <div className="flex items-center gap-1.5 border-b border-line bg-snow px-4 py-3">
          <span className="size-2.5 rounded-full bg-[#ffd9de]" />
          <span className="size-2.5 rounded-full bg-[#ffe9c7]" />
          <span className="size-2.5 rounded-full bg-[#cdeedd]" />
          <span className="ml-3 rounded-md bg-white px-3 py-0.5 text-[11px] text-muted shadow-soft">{tr("one.app")}</span>
        </div>
        <div className="grid grid-cols-12">
          <aside className="col-span-3 hidden border-r border-line bg-snow/60 p-4 md:block">
            {[
              [Home, "Home", true],
              [Brain, "Memory", false],
              [Zap, "Action", false],
              [CalendarDays, "Life", false],
              [Sparkles, "Intelligence", false],
            ].map(([Icon, label, active]) => {
              const I = Icon as typeof Home;
              return (
                <div key={tr(label as string)} className={`mb-1 flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] ${active ? "bg-white font-medium text-ink shadow-soft" : "text-muted"}`}>
                  <I className="size-4" /> {tr(label as string)}
                </div>
              );
            })}
          </aside>
          <div className="col-span-12 p-6 md:col-span-9 md:p-8">
            <p className="text-[12px] font-medium text-muted">{tr("Tuesday, 3 November")}</p>
            <h3 className="mt-1 text-2xl font-semibold text-ink">{tr("Good morning, Lena.")}</h3>
            <div className="mt-5 rounded-2xl border border-cloud bg-white p-4 shadow-glow">
              <div className="flex items-center gap-2 text-[14px] text-muted">
                <Sparkles className="size-4 text-primary" /> {tr("When does my apartment insurance renew?")}
              </div>
              <div className="mt-3 rounded-xl bg-snow p-3 text-[13px] leading-relaxed text-ink">
                {tr("Your home insurance renews on")} <strong>{tr("1 December")}</strong>{tr("; the notice period is 1 month, so you can cancel until 31 October")} <sup className="rounded bg-mist px-1 text-[10px] font-semibold text-accent-strong">1</sup>.
                <div className="mt-2 flex gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] text-muted shadow-soft"><FileText className="size-3" /> {tr("Insurance policy 2025.pdf")}</span>
                </div>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-line p-4">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">{tr("Today")}</p>
                {["Pay electricity bill", "Call Dr. Weber for appointment", "Send rental documents"].map((t, i) => (
                  <div key={t} className="mt-2.5 flex items-center gap-2 text-[13px] text-ink">
                    {i === 0 ? <CheckCircle2 className="size-4 text-mint-ink" /> : <span className="size-4 rounded-full border-2 border-cloud" />}
                    <span className={i === 0 ? "text-muted line-through" : ""}>{tr(t)}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-line bg-gradient-to-br from-lavender/70 to-white p-4">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-lavender-ink">{tr("Suggested")}</p>
                <p className="mt-2 text-[13px] text-ink">{tr("Your gym contract can be cancelled until")} <strong>{tr("15 Nov")}</strong>{tr(". Prepare the cancellation?")}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-accent-strong"><Clock className="size-3.5" /> {tr("Draft ready in Action")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
