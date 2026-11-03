"use client";
import * as React from "react";
import { useActionState, useState } from "react";
import { useT } from "@/components/i18n";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Field, Textarea, Select } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { Button, type ButtonProps } from "@/components/ui/button";
import { initialState, type ActionState } from "@/lib/action-state";
import { saveTask } from "@/app/business/_actions/work";
import type { Task } from "@/lib/db/types";

function localParts(iso: string | null | undefined) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return { date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, time: `${p(d.getHours())}:${p(d.getMinutes())}` };
}

export function BizTaskDialog({ task, members, projects, meId, canAssign, canRecur, trigger, triggerVariant = "primary", triggerSize = "md", defaultProject, parentId }: {
  task?: Task;
  members: { user_id: string; name: string }[];
  projects: { id: string; name: string }[];
  meId: string;
  /** Manager+ with the team feature. */
  canAssign: boolean;
  canRecur: boolean;
  trigger: React.ReactNode;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
  defaultProject?: string;
  parentId?: string;
}) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const parts = localParts(task?.due_at);
  const [state, action] = useActionState(async (prev: ActionState, form: FormData) => {
    const res = await saveTask(prev, form);
    if (res.ok) setOpen(false);
    return res;
  }, initialState);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant={triggerVariant} size={triggerSize}>{trigger}</Button></DialogTrigger>
      <DialogContent title={task ? tr("Edit task") : parentId ? tr("New sub-task") : tr("New task")} description={tr("Responsibility, deadline and priority — visible to the team.")}>
        <form action={action} className="space-y-4">
          {task && <input type="hidden" name="id" value={task.id} />}
          {parentId && <input type="hidden" name="parent_id" value={parentId} />}
          <input type="hidden" name="tz_offset" value={String(new Date().getTimezoneOffset())} />
          <Field label={tr("Title")} htmlFor="bt-title"><Input id="bt-title" name="title" required defaultValue={task?.title} maxLength={200} autoFocus /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr("Type")} htmlFor="bt-kind">
              <Select id="bt-kind" name="kind" defaultValue={task?.kind ?? "task"}>
                <option value="task">{tr("Task")}</option><option value="deadline">{tr("Deadline")}</option><option value="appointment">{tr("Appointment")}</option>
              </Select>
            </Field>
            <Field label={tr("Priority")} htmlFor="bt-prio">
              <Select id="bt-prio" name="priority" defaultValue={task?.priority ?? "normal"}>
                <option value="low">{tr("Low")}</option><option value="normal">{tr("Normal")}</option><option value="high">{tr("High")}</option>
              </Select>
            </Field>
            <Field label={tr("Date")} htmlFor="bt-date"><Input id="bt-date" type="date" name="date" defaultValue={parts.date} /></Field>
            <Field label={tr("Time")} htmlFor="bt-time"><Input id="bt-time" type="time" name="time" defaultValue={parts.time} /></Field>
            <Field label={tr("Responsible")} htmlFor="bt-assignee" hint={canAssign ? undefined : tr("Assigning to others needs the Manager role and Business Growth.")}>
              <Select id="bt-assignee" name="assignee_id" defaultValue={task?.assignee_id ?? meId} disabled={!canAssign}>
                {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}{m.user_id === meId ? ` (${tr("you")})` : ""}</option>)}
              </Select>
            </Field>
            <Field label={tr("Project")} htmlFor="bt-project">
              <Select id="bt-project" name="project_id" defaultValue={task?.project_id ?? defaultProject ?? ""}>
                <option value="">{tr("None")}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
          </div>
          {!canAssign && <input type="hidden" name="assignee_id" value={task?.assignee_id ?? meId} />}
          <Field label={tr("Repeat")} htmlFor="bt-rec" hint={canRecur ? undefined : tr("Recurring processes are part of business workflows.")}>
            <Select id="bt-rec" name="recurrence" defaultValue={task?.recurrence ?? "none"} disabled={!canRecur}>
              <option value="none">{tr("Does not repeat")}</option><option value="daily">{tr("Daily")}</option><option value="weekly">{tr("Weekly")}</option><option value="monthly">{tr("Monthly")}</option>
            </Select>
          </Field>
          <Field label={tr("Notes")} htmlFor="bt-notes"><Textarea id="bt-notes" name="notes" className="min-h-20" defaultValue={task?.notes ?? ""} /></Field>
          <FormMessage state={state} />
          <div className="flex justify-end"><SubmitButton pendingText={tr("Saving…")}>{task ? tr("Save changes") : tr("Add")}</SubmitButton></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
