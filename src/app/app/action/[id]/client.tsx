"use client";
import { useT } from "@/components/i18n";
import { useActionState, useState } from "react";
import { Copy, Check, Mail } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { initialState, type ActionState } from "@/lib/action-state";
import { saveDraft } from "../../_actions/action";

export function DraftEditor({ id, draft, missing, action: act = saveDraft }: { id: string; draft: string; missing: string[]; action?: (prev: ActionState, form: FormData) => Promise<ActionState> }) {
  const tr = useT();
  const [text, setText] = useState(draft);
  const [copied, setCopied] = useState(false);
  const [state, action] = useActionState(act, initialState);
  const subject = text.match(/^Subject:\s*(.*)$/m)?.[1] ?? "";
  const body = text.replace(/^Subject:.*\n+/m, "");
  return (
    <Card>
      <CardHeader title={tr("Draft")} description={tr("Edit freely. Placeholders in [BRACKETS] need your details.")} />
      <CardBody>
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <Textarea name="draft" value={text} onChange={(e) => setText(e.target.value)} className="min-h-72 font-mono text-[13px]" placeholder={tr("No draft for this action yet. Write one here if you need it.")} aria-label={tr("Draft")} />
          <Field label={tr("Missing information (one per line)")} htmlFor="d-missing">
            <Textarea id="d-missing" name="missing" defaultValue={missing.join("\n")} className="min-h-20" />
          </Field>
          <FormMessage state={state} />
          <div className="flex flex-wrap gap-2">
            <SubmitButton variant="secondary" pendingText={tr("Saving…")}>{tr("Save")}</SubmitButton>
            <Button type="button" variant="soft" disabled={!text} onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>
              {copied ? <><Check /> {tr("Copied")}</> : <><Copy /> {tr("Copy draft")}</>}
            </Button>
            {text && (
              <a className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium text-muted hover:bg-fog hover:text-ink" href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}>
                <Mail className="size-4" /> {tr("Open in my email app")}
              </a>
            )}
          </div>
          <p className="text-xs text-muted">{tr("“Open in my email app” only creates a draft in your own email program — nothing is sent until you press send there.")}</p>
        </form>
      </CardBody>
    </Card>
  );
}

