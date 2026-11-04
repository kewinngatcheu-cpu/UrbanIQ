"use client";
import { useActionState, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { useT } from "@/components/i18n";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Field, Textarea, Select } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { initialState, type ActionState } from "@/lib/action-state";
import { updateKnowledge } from "@/app/business/_actions/knowledge";
import { saveClient } from "@/app/business/_actions/work";
import type { Memory } from "@/lib/db/types";

type Opt = { id: string; name: string };

/** Client / project selects used by the business memory dialogs. */
export function LinkFields({ clients, projects, client, project }: { clients: Opt[]; projects: Opt[]; client?: string | null; project?: string | null }) {
  const tr = useT();
  if (!clients.length && !projects.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label={tr("Client")} htmlFor="l-client">
        <Select id="l-client" name="client_id" defaultValue={client ?? ""}><option value="">{tr("None")}</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
      </Field>
      <Field label={tr("Project")} htmlFor="l-project">
        <Select id="l-project" name="project_id" defaultValue={project ?? ""}><option value="">{tr("None")}</option>{projects.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
      </Field>
    </div>
  );
}

export function BizMemoryEditor({ memory, clients, projects, canEdit }: { memory: Memory; clients: Opt[]; projects: Opt[]; canEdit: boolean }) {
  const tr = useT();
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(async (prev: ActionState, form: FormData) => {
    const res = await updateKnowledge(prev, form);
    if (res.ok) setEditing(false);
    return res;
  }, initialState);
  if (!editing) {
    return (
      <div className="mt-5">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-ink">{memory.title}</h1>
          {canEdit && <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Pencil /> {tr("Edit")}</Button>}
        </div>
        {memory.content ? <div className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{memory.content}</div> : <p className="mt-4 text-sm text-muted">{tr("No note added.")}</p>}
        <FormMessage state={state} className="mt-4" />
      </div>
    );
  }
  return (
    <form action={action} className="mt-5 space-y-4">
      <input type="hidden" name="id" value={memory.id} />
      <Field label={tr("Title")} htmlFor="e-title"><Input id="e-title" name="title" defaultValue={memory.title} required maxLength={200} /></Field>
      <Field label={tr("Content")} htmlFor="e-content"><Textarea id="e-content" name="content" defaultValue={memory.content} className="min-h-48" /></Field>
      <LinkFields clients={clients} projects={projects} client={memory.client_id} project={memory.project_id} />
      <Field label={tr("Tags")} htmlFor="e-tags"><Input id="e-tags" name="tags" defaultValue={memory.tags.join(", ")} /></Field>
      <FormMessage state={state} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setEditing(false)}>{tr("Cancel")}</Button>
        <SubmitButton pendingText={tr("Saving…")}>{tr("Save changes")}</SubmitButton>
      </div>
    </form>
  );
}

export function ClientDialog() {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(async (prev: ActionState, form: FormData) => {
    const res = await saveClient(prev, form);
    if (res.ok) setOpen(false);
    return res;
  }, initialState);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="secondary"><Plus /> {tr("Client")}</Button></DialogTrigger>
      <DialogContent title={tr("New client")} description={tr("Clients connect documents, projects and knowledge.")}>
        <form action={action} className="space-y-4">
          <Field label={tr("Name")} htmlFor="c-name"><Input id="c-name" name="name" required maxLength={120} autoFocus /></Field>
          <Field label={tr("Contact")} htmlFor="c-contact" hint={tr("Email, phone or contact person")}><Input id="c-contact" name="contact" maxLength={200} /></Field>
          <Field label={tr("Notes")} htmlFor="c-notes"><Textarea id="c-notes" name="notes" maxLength={2000} /></Field>
          <FormMessage state={state} />
          <div className="flex justify-end"><SubmitButton pendingText={tr("Saving…")}>{tr("Add client")}</SubmitButton></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
