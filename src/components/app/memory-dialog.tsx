"use client";
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

export function NewMemoryDialog({ categories, triggerLabel = "New memory", triggerIcon }: { categories: Pick<Category, "id" | "name">[]; triggerLabel?: string; triggerIcon?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action] = useActionState(async (prev: ActionState, form: FormData) => {
    const res = await createMemory(prev, form);
    if (res.ok && res.data?.id) { setOpen(false); router.push(`/app/memory/${res.data.id}`); }
    return res;
  }, initialState);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>{triggerIcon}{triggerLabel}</Button></DialogTrigger>
      <DialogContent title="Save to Memory" description="Notes, ideas, important information or a personal goal.">
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type" htmlFor="m-kind">
              <Select id="m-kind" name="kind" defaultValue="note">
                <option value="note">Note</option>
                <option value="idea">Idea</option>
                <option value="info">Important info</option>
                <option value="goal">Personal goal</option>
              </Select>
            </Field>
            <Field label="Category" htmlFor="m-cat">
              <Select id="m-cat" name="category_id" defaultValue="">
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Title" htmlFor="m-title"><Input id="m-title" name="title" placeholder="Leave empty to use the first line" maxLength={200} /></Field>
          <Field label="Content" htmlFor="m-content"><Textarea id="m-content" name="content" className="min-h-40" required placeholder="What do you want to remember?" /></Field>
          <Field label="Tags" htmlFor="m-tags" hint="Comma separated"><Input id="m-tags" name="tags" placeholder="finance, insurance" /></Field>
          <FormMessage state={state} />
          <div className="flex justify-end"><SubmitButton pendingText="Saving…">Save</SubmitButton></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
