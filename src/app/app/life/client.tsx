"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Target, FolderKanban } from "lucide-react";
import { Input, Field, Textarea } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { initialState, type ActionState } from "@/lib/action-state";
import { saveReminder, saveProject, saveCategory } from "../_actions/life";
import { cn } from "@/lib/utils";

const COLORS = ["#6aafe8", "#5bbf94", "#8b7fe0", "#e8a26a", "#e88a9a", "#e8c46a", "#438ed4", "#7cc7a4"];

function ColorPicker({ name }: { name: string }) {
  const [c, setC] = useState(COLORS[0]);
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Color">
      <input type="hidden" name={name} value={c} />
      {COLORS.map((x) => (
        <button key={x} type="button" role="radio" aria-checked={c === x} aria-label={x} onClick={() => setC(x)}
          className={cn("size-7 rounded-full transition", c === x ? "ring-2 ring-offset-2 ring-primary" : "hover:scale-110")} style={{ background: x }} />
      ))}
    </div>
  );
}

export function ReminderForm({ defaultDate }: { defaultDate: string }) {
  const [state, action] = useActionState(saveReminder, initialState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state.ts, state.ok]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <input type="hidden" name="tz_offset" value={String(new Date().getTimezoneOffset())} />
      <Field label="What?" htmlFor="r-title"><Input id="r-title" name="title" required maxLength={200} placeholder="e.g. Call grandma" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Date" htmlFor="r-date"><Input id="r-date" type="date" name="date" defaultValue={defaultDate} required /></Field>
        <Field label="Time" htmlFor="r-time"><Input id="r-time" type="time" name="time" defaultValue="09:00" /></Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Saving…"><Plus /> Add reminder</SubmitButton>
    </form>
  );
}

export function CategoryForm() {
  const [state, action] = useActionState(saveCategory, initialState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state.ts, state.ok]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <Field label="Name" htmlFor="c-name"><Input id="c-name" name="name" required maxLength={40} placeholder="e.g. Finance" /></Field>
      <Field label="Color"><ColorPicker name="color" /></Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Saving…"><Plus /> Create category</SubmitButton>
    </form>
  );
}

export function ProjectDialog({ kind }: { kind: "project" | "goal" }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(async (prev: ActionState, form: FormData) => {
    const res = await saveProject(prev, form);
    if (res.ok) setOpen(false);
    return res;
  }, initialState);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={kind === "goal" ? "secondary" : "primary"}>{kind === "goal" ? <Target /> : <FolderKanban />} New {kind}</Button>
      </DialogTrigger>
      <DialogContent title={kind === "goal" ? "New personal goal" : "New project"} description={kind === "goal" ? "Something you want to achieve — with an optional target date." : "Group related tasks together."}>
        <form action={action} className="space-y-4">
          <input type="hidden" name="kind" value={kind} />
          <Field label="Name" htmlFor="p-name"><Input id="p-name" name="name" required maxLength={120} placeholder={kind === "goal" ? "e.g. Run a half marathon" : "e.g. Move to Hamburg"} /></Field>
          <Field label="Description" htmlFor="p-desc"><Textarea id="p-desc" name="description" className="min-h-20" /></Field>
          <Field label="Target date" htmlFor="p-date"><Input id="p-date" type="date" name="target_date" /></Field>
          <Field label="Color"><ColorPicker name="color" /></Field>
          <FormMessage state={state} />
          <div className="flex justify-end"><SubmitButton pendingText="Saving…">Create</SubmitButton></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
