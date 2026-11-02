"use client";
import { useT } from "@/components/i18n";
import * as React from "react";
import { useActionState, useState } from "react";
import { Pencil, Sparkles, ListChecks, FlaskConical, ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field, Select } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { initialState, type ActionState } from "@/lib/action-state";
import type { Category, Memory } from "@/lib/db/types";
import type { ExtractedTask } from "@/lib/ai/retrieval";
import { updateMemory, summarizeMemory, detectTasks, addDetectedTasks, recognizeText } from "../../_actions/memory";

export function MemoryEditor({ memory, categories }: { memory: Memory; categories: Category[] }) {
  const tr = useT();
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(async (prev: ActionState, form: FormData) => {
    const res = await updateMemory(prev, form);
    if (res.ok) setEditing(false);
    return res;
  }, initialState);
  const editableKind = ["note", "idea", "info", "goal"].includes(memory.kind);

  if (!editing) {
    return (
      <div className="mt-5">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-ink">{memory.title}</h1>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Pencil /> {tr("Edit")}</Button>
        </div>
        {memory.content ? (
          <div className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{memory.content}</div>
        ) : (
          <p className="mt-4 text-sm text-muted">{tr("No note added.")}</p>
        )}
        <FormMessage state={state} className="mt-4" />
      </div>
    );
  }
  return (
    <form action={action} className="mt-5 space-y-4">
      <input type="hidden" name="id" value={memory.id} />
      <Field label={tr("Title")} htmlFor="e-title"><Input id="e-title" name="title" defaultValue={memory.title} required maxLength={200} /></Field>
      <Field label={tr("Content")} htmlFor="e-content"><Textarea id="e-content" name="content" defaultValue={memory.content} className="min-h-48" /></Field>
      <div className="grid gap-3 sm:grid-cols-3">
        {editableKind && (
          <Field label={tr("Type")} htmlFor="e-kind">
            <Select id="e-kind" name="kind" defaultValue={memory.kind}>
              <option value="note">{tr("Note")}</option><option value="idea">{tr("Idea")}</option><option value="info">{tr("Important info")}</option><option value="goal">{tr("Goal")}</option>
            </Select>
          </Field>
        )}
        <Field label={tr("Category")} htmlFor="e-cat">
          <Select id="e-cat" name="category_id" defaultValue={memory.category_id ?? ""}>
            <option value="">{tr("None")}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label={tr("Tags")} htmlFor="e-tags"><Input id="e-tags" name="tags" defaultValue={memory.tags.join(", ")} /></Field>
      </div>
      <FormMessage state={state} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setEditing(false)}>{tr("Cancel")}</Button>
        <SubmitButton pendingText={tr("Saving…")}>{tr("Save changes")}</SubmitButton>
      </div>
    </form>
  );
}

export function SummaryButton({ id, hasSummary, willUseAi }: { id: string; hasSummary: boolean; willUseAi: boolean }) {
  const tr = useT();
  const [state, action] = useActionState(summarizeMemory, initialState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="soft" size="sm" pendingText={tr("Summarising…")}><Sparkles /> {hasSummary ? tr("Regenerate summary") : willUseAi ? tr("Summarise with AI") : tr("Create quick summary")}</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function TaskDetector({ memoryId, aiDemo }: { memoryId: string; aiDemo: boolean }) {
  const tr = useT();
  const [selected, setSelected] = useState<number[]>([]);
  const [state, action] = useActionState(async (prev: ActionState, form: FormData) => {
    const res = await detectTasks(prev, form);
    setSelected(((res.data?.tasks as ExtractedTask[] | undefined) ?? []).map((_, i) => i));
    return res;
  }, initialState);
  const [addState, addAction] = useActionState(addDetectedTasks, initialState);
  const found = (state.data?.tasks as ExtractedTask[] | undefined) ?? [];
  const done = addState.ok;

  return (
    <div className="space-y-3">
      <form action={action}>
        <input type="hidden" name="id" value={memoryId} />
        <SubmitButton variant="soft" size="sm" pendingText={tr("Looking for tasks…")}><ListChecks /> {tr("Find tasks & deadlines")}</SubmitButton>
      </form>
      <FormMessage state={state} />
      {found.length > 0 && !done && (
        <form action={addAction} className="rounded-xl border border-line bg-snow p-4">
          <input type="hidden" name="memory_id" value={memoryId} />
          <input type="hidden" name="tasks" value={JSON.stringify(selected.map((i) => found[i]))} />
          <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-ink">
            {tr(found.length === 1 ? "ONE found {n} item. Choose what to add:" : "ONE found {n} items. Choose what to add:", { n: found.length })}
            {(state.data?.mode === "demo" || aiDemo) && <Badge tone="lavender"><FlaskConical /> {tr("Rule-based")}</Badge>}
          </p>
          <ul className="space-y-1.5">
            {found.map((t, i) => (
              <li key={i}>
                <label className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-[13.5px] text-ink hover:bg-white">
                  <input type="checkbox" className="mt-0.5 size-4 accent-[#438ed4]" checked={selected.includes(i)}
                    onChange={(e) => setSelected((s) => (e.target.checked ? [...s, i] : s.filter((x) => x !== i)))} />
                  <span className="flex-1">{t.title}</span>
                  {t.due && <Badge tone="gray">{t.due}</Badge>}
                  {t.kind !== "task" && <Badge tone={t.kind === "deadline" ? "peach" : "lavender"}>{t.kind}</Badge>}
                </label>
              </li>
            ))}
          </ul>
          <FormMessage state={addState} className="mt-2" />
          <SubmitButton size="sm" className="mt-3" disabled={!selected.length} pendingText={tr("Adding…")}>{tr("Add {n} to Life", { n: selected.length })}</SubmitButton>
        </form>
      )}
      {done && <FormMessage state={addState} />}
    </div>
  );
}

export function RecognizeTextButton({ id, again }: { id: string; again?: boolean }) {
  const tr = useT();
  const [state, action] = useActionState(recognizeText, initialState);
  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="soft" size="sm" pendingText={tr("Reading the file…")}><ScanText /> {again ? tr("Recognise text again") : tr("Recognise text with AI")}</SubmitButton>
      <p className="text-xs text-muted">{tr("Uses 1 AI request. ONE only transcribes what is visible in the file.")}</p>
      <FormMessage state={state} />
    </form>
  );
}
