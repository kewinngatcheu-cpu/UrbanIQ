"use client";
import { useActionState, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Brain, CalendarDays, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { initialState } from "@/lib/action-state";
import { PLANS, PLAN_ORDER, formatPrice, type PlanId } from "@/lib/config/plans";
import { cn } from "@/lib/utils";
import { completeOnboarding } from "./actions";
import { INTERESTS } from "./interests";

const STEPS = ["Welcome", "Your plan", "What matters", "Ready"];

export function OnboardingFlow({ email, requestedPlan }: { email: string; requestedPlan: PlanId }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<PlanId>(requestedPlan);
  const [interests, setInterests] = useState<string[]>([]);
  const [state, action] = useActionState(completeOnboarding, initialState);

  useEffect(() => {
    if (state.ok && typeof state.data?.target === "string") window.location.assign(state.data.target);
  }, [state.ok, state.data?.target]);

  const toggle = (id: string) => setInterests((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <div>
      <div className="mb-8 flex items-center justify-center gap-2" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <span key={s} className={cn("h-1.5 rounded-full transition-all duration-500", i <= step ? "w-10 bg-primary" : "w-6 bg-sky")} />
        ))}
      </div>

      <form action={action} className="animate-fade-up rounded-3xl border border-line bg-white/90 p-8 shadow-lift backdrop-blur sm:p-10" key={step}>
        <input type="hidden" name="name" value={name} />
        <input type="hidden" name="plan" value={plan} />
        {interests.map((i) => <input key={i} type="hidden" name="interests" value={i} />)}

        {step === 0 && (
          <div>
            <p className="text-[13px] font-semibold tracking-[0.18em] text-accent-strong">WELCOME TO ONE</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Nice to meet you.</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">Your email <span className="text-ink">{email}</span> is verified. What should ONE call you?</p>
            <Input className="mt-6" placeholder="Your first name" value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={80} aria-label="Your name" />
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                [Brain, "Memory", "Save notes, ideas and documents. Find them instantly."],
                [Zap, "Action", "Turn information into prepared next steps."],
                [CalendarDays, "Life", "Tasks, deadlines and goals in a calm week view."],
                [Sparkles, "Intelligence", "Insights that show exactly what they're based on."],
              ].map(([Icon, t, d]) => {
                const I = Icon as typeof Brain;
                return (
                  <div key={t as string} className="flex gap-3 rounded-2xl bg-snow p-4">
                    <I className="mt-0.5 size-5 shrink-0 text-accent" />
                    <div>
                      <p className="text-sm font-semibold text-ink">{t as string}</p>
                      <p className="text-[13px] text-muted">{d as string}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">Choose your plan</h1>
            <p className="mt-2 text-[15px] text-muted">You can change it anytime in Settings.</p>
            <div className="mt-6 space-y-3" role="radiogroup">
              {PLAN_ORDER.map((id) => (
                <button key={id} type="button" role="radio" aria-checked={plan === id} onClick={() => setPlan(id)}
                  className={cn("flex w-full items-start justify-between gap-4 rounded-2xl border p-5 text-left transition", plan === id ? "border-primary bg-mist/70 shadow-[0_0_0_3px_rgba(187,223,255,0.6)]" : "border-line hover:border-cloud")}>
                  <div>
                    <p className="font-semibold text-ink">{PLANS[id].name} {PLANS[id].highlight && <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">POPULAR</span>}</p>
                    <p className="mt-0.5 text-[13px] text-muted">{PLANS[id].bullets.slice(1, 4).join(" · ")}</p>
                  </div>
                  <p className="shrink-0 text-right"><span className="text-lg font-semibold text-ink">{formatPrice(PLANS[id].priceMonthlyEur)}</span><span className="block text-xs text-muted">per month</span></p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">What would you like ONE to help with?</h1>
            <p className="mt-2 text-[15px] text-muted">Optional — this helps ONE set you up with a few useful starting points.</p>
            <div className="mt-6 grid grid-cols-2 gap-2.5">
              {INTERESTS.map((i) => (
                <button key={i.id} type="button" aria-pressed={interests.includes(i.id)} onClick={() => toggle(i.id)}
                  className={cn("flex items-center gap-2.5 rounded-xl border px-4 py-3 text-left text-sm transition", interests.includes(i.id) ? "border-primary bg-mist text-ink" : "border-line text-ink hover:border-cloud")}>
                  <span className="text-lg" aria-hidden>{i.emoji}</span> {i.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-mist animate-float"><Sparkles className="size-7 text-accent" /></div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink">You&apos;re all set{name ? `, ${name}` : ""}.</h1>
            <p className="mx-auto mt-2 max-w-md text-[15px] text-muted">
              {plan === "free" ? "Your dashboard is ready. Start by telling ONE something you want to remember." : `Next, confirm your ${PLANS[plan].name} plan. Until then, you're on Free.`}
            </p>
            <FormMessage state={state} className="mt-6 text-left" />
          </div>
        )}

        <div className="mt-10 flex items-center justify-between">
          {step > 0 ? (
            <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}><ArrowLeft /> Back</Button>
          ) : <span />}
          {step < 3 ? (
            <div className="flex items-center gap-2">
              {step === 2 && <Button type="button" variant="ghost" onClick={() => { setInterests([]); setStep(3); }}>Skip</Button>}
              <Button type="button" onClick={() => setStep(step + 1)}>Continue <ArrowRight /></Button>
            </div>
          ) : (
            <SubmitButton size="lg" pendingText="Setting up…">{plan === "free" ? "Go to my dashboard" : "Continue to checkout"} <ArrowRight /></SubmitButton>
          )}
        </div>
      </form>
    </div>
  );
}
