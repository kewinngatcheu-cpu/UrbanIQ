"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Field, Textarea, Select } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { Button, type ButtonProps } from "@/components/ui/button";
import { initialState, type ActionState } from "@/lib/action-state";
import { saveProject } from "@/app/business/_actions/work";
import type { Project } from "@/lib/db/types";

export const STAGES = [["planned", "Planned"], ["active", "Active"], ["on_hold", "On hold"], ["done", "Done"]] as const;

export function ProjectDialog({ project, members, clients, trigger, triggerVariant = "primary" }: {
  project?: Project;
  members: { user_id: string; name: string }[];
  clients: { id: string; name: string }[];
  trigger: React.ReactNode;
  triggerVariant?: ButtonProps["variant"];
}) {
  const tr = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(async (prev: ActionState, form: FormData) => {
    const res = await saveProject(prev, form);
    if (res.ok) {
      setOpen(false);
      if (!project && typeof res.data?.id === "string") router.push(`/business/projects/${res.data.id}`);
    }
    return res;
  }, initialState);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant={triggerVariant}>{trigger}</Button></DialogTrigger>
      <DialogContent title={project ? tr("Edit project") : tr("New project")} description={tr("A shared goal with an owner, tasks, documents and a history.")}>
        <form action={action} className="space-y-4">
          {project && <input type="hidden" name="id" value={project.id} />}
          <Field label={tr("Name")} htmlFor="pj-name"><Input id="pj-name" name="name" required maxLength={120} defaultValue={project?.name} autoFocus /></Field>
          <Field label={tr("Description")} htmlFor="pj-desc"><Textarea id="pj-desc" name="description" className="min-h-24" defaultValue={project?.description ?? ""} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr("Status")} htmlFor="pj-stage">
              <Select id="pj-stage" name="stage" defaultValue={project?.stage ?? "planned"}>{STAGES.map(([v, l]) => <option key={v} value={v}>{tr(l)}</option>)}</Select>
            </Field>
            <Field label={tr("Deadline")} htmlFor="pj-date"><Input id="pj-date" type="date" name="target_date" defaultValue={project?.target_date ?? ""} /></Field>
            <Field label={tr("Responsible")} htmlFor="pj-lead">
              <Select id="pj-lead" name="lead_id" defaultValue={project?.lead_id ?? ""}><option value="">{tr("Nobody yet")}</option>{members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}</Select>
            </Field>
            <Field label={tr("Client")} htmlFor="pj-client">
              <Select id="pj-client" name="client_id" defaultValue={project?.client_id ?? ""}><option value="">{tr("None")}</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            </Field>
          </div>
          <FormMessage state={state} />
          <div className="flex justify-end"><SubmitButton pendingText={tr("Saving…")}>{project ? tr("Save changes") : tr("Create project")}</SubmitButton></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
