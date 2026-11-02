"use client";
import { useT } from "@/components/i18n";
import * as React from "react";
import { useActionState, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Field, Textarea, Select } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { Button, type ButtonProps } from "@/components/ui/button";
import { initialState, type ActionState } from "@/lib/action-state";
import { saveTask } from "@/app/app/_actions/life";
import type { Category, Project, Task } from "@/lib/db/types";

function localParts(iso: string | null) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return { date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, time: `${p(d.getHours())}:${p(d.getMinutes())}` };
}

export function TaskDialog({
  task, projects, categories, canRecur, trigger, triggerVariant = "primary", triggerSize = "md", defaultKind = "task", defaultDate,
}: {
  task?: Task;
  projects: Pick<Project, "id" | "name">[];
  categories: Pick<Category, "id" | "name">[];
  canRecur: boolean;
  trigger: React.ReactNode;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
  defaultKind?: Task["kind"];
  defaultDate?: string;
}) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(async (prev: ActionState, form: FormData) => {
    const res = await saveTask(prev, form);
    if (res.ok) setOpen(false);
    return res;
  }, initialState);
  const parts = localParts(task?.due_at ?? null);
  // Send the browser's local date/time; convert to an absolute instant on the client to respect the user's timezone.
  const [date, setDate] = useState(parts.date || defaultDate || "");
  const [time, setTime] = useState(parts.time);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant={triggerVariant} size={triggerSize}>{trigger}</Button></DialogTrigger>
      <DialogContent title={task ? tr("Edit item") : tr("New item")} description={tr("Tasks, appointments and deadlines all live in Life.")}>
        <form action={action} className="space-y-4">
          {task && <input type="hidden" name="id" value={task.id} />}
          <input type="hidden" name="tz_offset" value={String(new Date().getTimezoneOffset())} />
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr("Type")} htmlFor="t-kind">
              <Select id="t-kind" name="kind" defaultValue={task?.kind ?? defaultKind}>
                <option value="task">{tr("Task")}</option>
                <option value="appointment">{tr("Appointment")}</option>
                <option value="deadline">{tr("Deadline")}</option>
              </Select>
            </Field>
            <Field label={tr("Priority")} htmlFor="t-prio">
              <Select id="t-prio" name="priority" defaultValue={task?.priority ?? "normal"}>
                <option value="low">{tr("Low")}</option>
                <option value="normal">{tr("Normal")}</option>
                <option value="high">{tr("High")}</option>
              </Select>
            </Field>
          </div>
          <Field label={tr("Title")} htmlFor="t-title"><Input id="t-title" name="title" required defaultValue={task?.title} maxLength={200} autoFocus /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr("Date")} htmlFor="t-date"><Input id="t-date" type="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label={tr("Time")} htmlFor="t-time"><Input id="t-time" type="time" name="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr("Project / goal")} htmlFor="t-proj">
              <Select id="t-proj" name="project_id" defaultValue={task?.project_id ?? ""}>
                <option value="">{tr("None")}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label={tr("Category")} htmlFor="t-cat">
              <Select id="t-cat" name="category_id" defaultValue={task?.category_id ?? ""}>
                <option value="">{tr("None")}</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label={tr("Repeat")} htmlFor="t-rec" hint={canRecur ? undefined : tr("Recurring tasks are part of Premium.")}>
            <Select id="t-rec" name="recurrence" defaultValue={task?.recurrence ?? "none"} disabled={!canRecur}>
              <option value="none">{tr("Does not repeat")}</option>
              <option value="daily">{tr("Daily")}</option>
              <option value="weekly">{tr("Weekly")}</option>
              <option value="monthly">{tr("Monthly")}</option>
            </Select>
          </Field>
          <Field label={tr("Notes")} htmlFor="t-notes"><Textarea id="t-notes" name="notes" className="min-h-20" defaultValue={task?.notes ?? ""} /></Field>
          {!task && (
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" name="remind" className="size-4 accent-[#438ed4]" /> {tr("Remind me 1 hour before")}
            </label>
          )}
          <FormMessage state={state} />
          <div className="flex justify-end"><SubmitButton pendingText={tr("Saving…")}>{task ? tr("Save changes") : tr("Add")}</SubmitButton></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
