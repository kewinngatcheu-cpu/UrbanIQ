"use client";
import * as React from "react";
import { useActionState, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Field, Textarea, Select } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { Button, type ButtonProps } from "@/components/ui/button";
import { initialState } from "@/lib/action-state";
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
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(saveTask, initialState);
  const parts = localParts(task?.due_at ?? null);
  // Send the browser's local date/time; convert to an absolute instant on the client to respect the user's timezone.
  const [date, setDate] = useState(parts.date || defaultDate || "");
  const [time, setTime] = useState(parts.time);
  useEffect(() => { if (state.ok) setOpen(false); }, [state.ts, state.ok]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant={triggerVariant} size={triggerSize}>{trigger}</Button></DialogTrigger>
      <DialogContent title={task ? "Edit item" : "New item"} description="Tasks, appointments and deadlines all live in Life.">
        <form action={action} className="space-y-4">
          {task && <input type="hidden" name="id" value={task.id} />}
          <input type="hidden" name="tz_offset" value={String(new Date().getTimezoneOffset())} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type" htmlFor="t-kind">
              <Select id="t-kind" name="kind" defaultValue={task?.kind ?? defaultKind}>
                <option value="task">Task</option>
                <option value="appointment">Appointment</option>
                <option value="deadline">Deadline</option>
              </Select>
            </Field>
            <Field label="Priority" htmlFor="t-prio">
              <Select id="t-prio" name="priority" defaultValue={task?.priority ?? "normal"}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </Select>
            </Field>
          </div>
          <Field label="Title" htmlFor="t-title"><Input id="t-title" name="title" required defaultValue={task?.title} maxLength={200} autoFocus /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" htmlFor="t-date"><Input id="t-date" type="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Time" htmlFor="t-time"><Input id="t-time" type="time" name="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Project / goal" htmlFor="t-proj">
              <Select id="t-proj" name="project_id" defaultValue={task?.project_id ?? ""}>
                <option value="">None</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Category" htmlFor="t-cat">
              <Select id="t-cat" name="category_id" defaultValue={task?.category_id ?? ""}>
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Repeat" htmlFor="t-rec" hint={canRecur ? undefined : "Recurring tasks are part of Premium."}>
            <Select id="t-rec" name="recurrence" defaultValue={task?.recurrence ?? "none"} disabled={!canRecur}>
              <option value="none">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </Select>
          </Field>
          <Field label="Notes" htmlFor="t-notes"><Textarea id="t-notes" name="notes" className="min-h-20" defaultValue={task?.notes ?? ""} /></Field>
          {!task && (
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" name="remind" className="size-4 accent-[#438ed4]" /> Remind me 1 hour before
            </label>
          )}
          <FormMessage state={state} />
          <div className="flex justify-end"><SubmitButton pendingText="Saving…">{task ? "Save changes" : "Add"}</SubmitButton></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
