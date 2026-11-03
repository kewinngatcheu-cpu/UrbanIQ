"use client";
import { useT } from "@/components/i18n";
import * as React from "react";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Field, Textarea, Select } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { initialState, type ActionState } from "@/lib/action-state";
import { createMemory } from "@/app/app/_actions/memory";
import type { Category } from "@/lib/db/types";

const DEFAULT_KINDS = [
  { value: "note", label: "Note" },
  { value: "idea", label: "Idea" },
  { value: "info", label: "Important info" },
  { value: "goal", label: "Personal goal" },
];

export function NewMemoryDialog({ categories, triggerLabel = "New memory", triggerIcon, action: createAction = createMemory, basePath = "/app/memory", extra, kinds }: {
  categories: Pick<Category, "id" | "name">[];
  triggerLabel?: string;
  triggerIcon?: React.ReactNode;
  action?: (prev: ActionState, form: FormData) => Promise<ActionState>;
  basePath?: string;
  extra?: React.ReactNode;
  /** Override the type options (ONE Business uses its own wording). */
  kinds?: { value: string; label: string }[];
}) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action] = useActionState(async (prev: ActionState, form: FormData) => {
    const res = await createAction(prev, form);
    if (res.ok && res.data?.id) { setOpen(false); router.push(`${basePath}/${res.data.id}`); }
    return res;
  }, initialState);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>{triggerIcon}{tr(triggerLabel)}</Button></DialogTrigger>
      <DialogContent title={tr("Save to Memory")} description={tr("Notes, ideas, important information or a personal goal.")}>
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr("Type")} htmlFor="m-kind">
              <Select id="m-kind" name="kind" defaultValue={(kinds ?? DEFAULT_KINDS)[0].value}>
                {(kinds ?? DEFAULT_KINDS).map((k) => <option key={k.value} value={k.value}>{tr(k.label)}</option>)}
              </Select>
            </Field>
            {categories.length > 0 && (
              <Field label={tr("Category")} htmlFor="m-cat">
                <Select id="m-cat" name="category_id" defaultValue="">
                  <option value="">{tr("None")}</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
            )}
          </div>
          {extra}
          <Field label={tr("Title")} htmlFor="m-title"><Input id="m-title" name="title" placeholder={tr("Leave empty to use the first line")} maxLength={200} /></Field>
          <Field label={tr("Content")} htmlFor="m-content"><Textarea id="m-content" name="content" className="min-h-40" required placeholder={tr("What do you want to remember?")} /></Field>
          <Field label={tr("Tags")} htmlFor="m-tags" hint={tr("Comma separated")}><Input id="m-tags" name="tags" placeholder={tr("finance, insurance")} /></Field>
          <FormMessage state={state} />
          <div className="flex justify-end"><SubmitButton pendingText={tr("Saving…")}>{tr("Save")}</SubmitButton></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
