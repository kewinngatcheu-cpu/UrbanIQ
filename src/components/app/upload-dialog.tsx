"use client";
import * as React from "react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Field, Textarea } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { initialState } from "@/lib/action-state";
import { uploadDocument } from "@/app/app/_actions/memory";
import { formatBytes } from "@/lib/utils";

export function UploadDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [state, action] = useActionState(uploadDocument, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.data?.id) {
      setOpen(false);
      setFile(null);
      router.push(`/app/memory/${state.data.id}`);
    }
  }, [state.ts, state.ok, state.data?.id, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><button type="button">{trigger}</button></DialogTrigger>
      <DialogContent title="Upload to Memory" description="PDFs, text files, images — and voice notes when enabled. Text from PDFs and text files becomes searchable.">
        <form action={action} className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cloud bg-snow px-6 py-8 text-center transition hover:border-primary hover:bg-mist">
            {file ? (
              <>
                <FileText className="size-7 text-accent" />
                <span className="mt-2 max-w-full truncate text-sm font-medium text-ink">{file.name}</span>
                <span className="text-xs text-muted">{formatBytes(file.size)} · click to change</span>
              </>
            ) : (
              <>
                <UploadCloud className="size-7 text-primary" />
                <span className="mt-2 text-sm font-medium text-ink">Choose a file</span>
                <span className="text-xs text-muted">PDF, TXT, MD, CSV, JSON, PNG, JPG, WEBP, audio</span>
              </>
            )}
            <input type="file" name="file" className="sr-only" required onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              accept=".pdf,.txt,.md,.csv,.json,.html,.png,.jpg,.jpeg,.webp,.gif,.heic,.mp3,.m4a,.wav,.webm,.ogg,application/pdf,text/*,image/*,audio/*" />
          </label>
          <Field label="Title (optional)" htmlFor="up-title"><Input id="up-title" name="title" placeholder="e.g. Rental contract 2025" /></Field>
          <Field label="Note (optional)" htmlFor="up-note"><Textarea id="up-note" name="note" className="min-h-20" placeholder="Anything you want to remember about this file" /></Field>
          <Field label="Tags" htmlFor="up-tags" hint="Comma separated, e.g. home, contracts"><Input id="up-tags" name="tags" placeholder="home, contracts" /></Field>
          <FormMessage state={state} />
          <div className="flex justify-end"><SubmitButton pendingText="Uploading…">Upload</SubmitButton></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
