"use client";
import { useT } from "@/components/i18n";
import { useActionState, useState } from "react";
import { FlaskConical } from "lucide-react";
import { Input, Textarea, Field, Select } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { Notice } from "@/components/ui/misc";
import { initialState, type ActionState } from "@/lib/action-state";
import { ACTION_TYPES } from "@/lib/ai/templates";
import type { ActionType } from "@/lib/db/types";
import { cn } from "@/lib/utils";
import { createAction } from "../../_actions/action";

type Act = (prev: ActionState, form: FormData) => Promise<ActionState>;
type ActType = { type: ActionType; label: string; description: string; emoji: string };

export function NewActionForm({ initialType, memories, presetMemory, aiDemo, types = ACTION_TYPES, action: act = createAction, fallbackType }: {
  types?: ActType[];
  action?: Act;
  fallbackType?: ActionType;
  initialType?: string;
  memories: { id: string; title: string }[];
  presetMemory?: { id: string; title: string };
  aiDemo: boolean;
}) {
  const tr = useT();
  const [type, setType] = useState<ActionType>((types.find((t) => t.type === initialType)?.type ?? fallbackType ?? (presetMemory ? "summarize" : "cancellation")));
  const [state, action] = useActionState(act, initialState);
  const current = types.find((t) => t.type === type) ?? types[0];
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="type" value={type} />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" role="radiogroup" aria-label={tr("Action type")}>
        {types.map((t) => (
          <button key={t.type} type="button" role="radio" aria-checked={type === t.type} onClick={() => setType(t.type)}
            className={cn("rounded-2xl border p-3.5 text-left transition", type === t.type ? "border-primary bg-mist shadow-[0_0_0_3px_rgba(187,223,255,0.6)]" : "border-line bg-white hover:border-cloud")}>
            <span className="text-lg" aria-hidden>{t.emoji}</span>
            <span className="mt-1 block text-[13px] font-semibold text-ink">{tr(t.label)}</span>
          </button>
        ))}
      </div>
      <div className="space-y-4 rounded-3xl border border-line bg-white p-6 shadow-soft">
        <Field label={tr("Title")} htmlFor="a-title">
          <Input id="a-title" name="title" required maxLength={200} placeholder={type === "cancellation" ? tr("e.g. Cancel my FitLife gym membership") : `${tr("e.g.")} ${tr(current.description)}`} />
        </Field>
        <Field label={tr("Details")} htmlFor="a-desc" hint={tr("The more ONE knows (names, numbers, dates), the better the draft. Never share passwords.")}>
          <Textarea id="a-desc" name="description" className="min-h-32" placeholder={tr("Describe the situation…")} />
        </Field>
        <Field label={tr("Link a memory (optional)")} htmlFor="a-mem" hint={tr("e.g. the contract, invoice or letter this is about")}>
          <Select id="a-mem" name="memory_id" defaultValue={presetMemory?.id ?? ""}>
            <option value="">{tr("None")}</option>
            {memories.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </Select>
        </Field>
        {aiDemo && <Notice tone="lavender"><FlaskConical /> {tr("AI demo mode: ONE will use a proven template for this action type instead of an AI-generated plan.")}</Notice>}
        <FormMessage state={state} />
        <div className="flex justify-end"><SubmitButton size="lg" pendingText={tr("Preparing your plan…")}>{tr("Prepare action")}</SubmitButton></div>
      </div>
    </form>
  );
}
