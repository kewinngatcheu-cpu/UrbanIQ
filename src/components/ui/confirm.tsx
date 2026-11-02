"use client";
import { useT } from "@/components/i18n";
import * as React from "react";
import { useActionState } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogClose } from "./dialog";
import { Button, type ButtonProps } from "./button";
import { SubmitButton, FormMessage } from "./form";
import { initialState, type ActionState } from "@/lib/action-state";

/**
 * A button that opens a confirmation dialog and then submits a server action.
 * Used for every destructive or binding operation.
 */
export function ConfirmAction({
  action,
  fields = {},
  trigger,
  triggerVariant = "secondary",
  triggerSize = "sm",
  title,
  description,
  confirmLabel = "Confirm",
  danger,
  children,
  onDone,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  fields?: Record<string, string>;
  trigger: React.ReactNode;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  children?: React.ReactNode;
  onDone?: (s: ActionState) => void;
}) {
  const tr = useT();
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useActionState(async (prev: ActionState, form: FormData) => {
    const res = await action(prev, form);
    if (!res.error) {
      setOpen(false);
      onDone?.(res);
    }
    return res;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} type="button">{trigger}</Button>
      </DialogTrigger>
      <DialogContent title={title} description={description}>
        <form action={formAction} className="space-y-4">
          {Object.entries(fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          {children}
          <FormMessage state={state} />
          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button variant="ghost" type="button">{tr("Cancel")}</Button>
            </DialogClose>
            <SubmitButton variant={danger ? "danger" : "primary"}>{confirmLabel}</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
