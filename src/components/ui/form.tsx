"use client";
import { useT } from "@/components/i18n";
import * as React from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { Button, type ButtonProps } from "./button";
import type { ActionState } from "@/lib/action-state";
import { PLANS } from "@/lib/config/plans";
import { cn } from "@/lib/utils";

export function SubmitButton({ children, pendingText, ...props }: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}

export function FormMessage({ state, className }: { state: ActionState; className?: string }) {
  const tr = useT();
  if (state.error) {
    return (
      <div role="alert" className={cn("flex flex-wrap items-center gap-2 rounded-xl border border-[#ffd9de] bg-rose px-3.5 py-2.5 text-[13px] text-rose-ink", className)}>
        <AlertCircle className="size-4 shrink-0" />
        <span className="flex-1">{state.error}</span>
        {state.upgradeTo && (
          <Link href={`/app/settings/billing?plan=${state.upgradeTo}`} className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-accent-strong shadow-soft hover:bg-snow">
            <Sparkles className="size-3" /> {tr("Upgrade to {plan}", { plan: PLANS[state.upgradeTo].name })}
          </Link>
        )}
      </div>
    );
  }
  if (state.message) {
    return (
      <div role="status" className={cn("flex items-center gap-2 rounded-xl border border-[#cdeedd] bg-mint px-3.5 py-2.5 text-[13px] text-mint-ink", className)}>
        <CheckCircle2 className="size-4 shrink-0" />
        {state.message}
      </div>
    );
  }
  return null;
}
