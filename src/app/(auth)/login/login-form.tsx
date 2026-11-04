"use client";
import { useT } from "@/components/i18n";
import Link from "next/link";
import { useActionState } from "react";
import { Input, Field } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { initialState, type ActionState } from "@/lib/action-state";
import { loginAction } from "../actions";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const tr = useT();
  const [state, action] = useActionState(async (prev: ActionState, form: FormData) => {
    const res = await loginAction(prev, form);
    // Full navigation from the callback: the page may re-render (new session cookie) before an effect could run.
    if (res.ok && typeof res.data?.target === "string") window.location.assign(res.data.target);
    return res;
  }, initialState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {notice && <FormMessage state={{ error: notice }} />}
      <Field label={tr("Email")} htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder={tr("you@example.com")} autoFocus />
      </Field>
      <Field label={tr("Password")} htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••••" />
        <Link href="/forgot-password" className="mt-1.5 inline-block text-xs text-accent-strong hover:underline">{tr("Forgot your password?")}</Link>
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" size="lg" pendingText={tr("Signing in…")}>{tr("Sign in")}</SubmitButton>
      <p className="text-center text-sm text-muted">
        {tr("New to ONE?")} <Link href="/register" className="font-medium text-accent-strong hover:underline">{tr("Create an account")}</Link>
      </p>
    </form>
  );
}
