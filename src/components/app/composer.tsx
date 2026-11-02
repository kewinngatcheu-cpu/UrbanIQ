"use client";
import * as React from "react";
import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, Brain, CheckSquare, Loader2, MessageCircle, Paperclip, FlaskConical, ArrowRight } from "lucide-react";
import { ask, quickCapture, type AskState } from "@/app/app/_actions/ask";
import { initialState } from "@/lib/action-state";
import { FormMessage } from "@/components/ui/form";
import { Markdown } from "@/components/ui/markdown";
import { SourceChips } from "./source-chips";
import { UploadDialog } from "./upload-dialog";
import { cn } from "@/lib/utils";

type Mode = "ask" | "remember" | "task";

const MODES: { id: Mode; label: string; icon: typeof Brain; placeholder: string }[] = [
  { id: "ask", label: "Ask", icon: MessageCircle, placeholder: "Ask ONE anything or tell me what you need." },
  { id: "remember", label: "Remember", icon: Brain, placeholder: "Write down a thought, an idea or something important… (use #tags)" },
  { id: "task", label: "Task", icon: CheckSquare, placeholder: "What do you need to get done?" },
];

export function Composer({ aiDemo }: { aiDemo: boolean }) {
  const [mode, setMode] = useState<Mode>("ask");
  const [text, setText] = useState("");
  const [askState, askAction, asking] = useActionState<AskState, FormData>(ask, {});
  const [capState, capAction, capturing] = useActionState(quickCapture, initialState);
  const ref = useRef<HTMLTextAreaElement>(null);
  const pending = asking || capturing;

  useEffect(() => { if (capState.ok) setText(""); }, [capState.ts, capState.ok]);
  useEffect(() => { if (askState.ok) setText(""); }, [askState.ts, askState.ok]);

  const current = MODES.find((m) => m.id === mode)!;
  const submit = (form: FormData) => (mode === "ask" ? askAction(form) : capAction(form));

  return (
    <div>
      <form
        action={submit}
        className="relative rounded-3xl border border-cloud/80 bg-white p-2 shadow-glow transition focus-within:border-primary"
      >
        <input type="hidden" name="mode" value={mode} />
        <label htmlFor="one-input" className="sr-only">{current.placeholder}</label>
        <textarea
          id="one-input"
          ref={ref}
          name={mode === "ask" ? "question" : "text"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (text.trim() && !pending) e.currentTarget.form?.requestSubmit();
            }
          }}
          rows={2}
          placeholder={current.placeholder}
          className="block w-full resize-none bg-transparent px-4 pt-3 pb-1 text-[16px] leading-relaxed text-ink placeholder:text-muted/70 focus:outline-none"
          maxLength={4000}
        />
        <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-1">
          <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Input mode">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={mode === m.id}
                onClick={() => { setMode(m.id); ref.current?.focus(); }}
                className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition", mode === m.id ? "bg-mist font-medium text-accent-strong" : "text-muted hover:bg-fog hover:text-ink")}
              >
                <m.icon className="size-3.5" /> {m.label}
              </button>
            ))}
            <UploadDialog trigger={<span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] text-muted transition hover:bg-fog hover:text-ink"><Paperclip className="size-3.5" /> Upload</span>} />
          </div>
          <button
            type="submit"
            disabled={!text.trim() || pending}
            aria-label="Send"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-[0_6px_16px_-6px_rgba(67,142,212,0.8)] transition hover:bg-[#3a82c6] disabled:bg-sky disabled:shadow-none"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
          </button>
        </div>
      </form>

      <div aria-live="polite">
        {mode !== "ask" && <FormMessage state={capState} className="mt-3" />}
        {mode === "ask" && askState.error && <FormMessage state={askState} className="mt-3" />}
        {mode === "ask" && asking && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-snow px-5 py-4 text-sm text-muted">
            <Loader2 className="size-4 animate-spin text-primary" /> ONE is looking through your memory…
          </div>
        )}
        {mode === "ask" && !asking && askState.answer && (
          <div className="animate-fade-up mt-4 rounded-2xl border border-line bg-snow/70 px-5 py-4">
            <p className="mb-2 text-[13px] font-medium text-muted">You asked: <span className="text-ink">{askState.question}</span></p>
            {askState.mode === "demo" && (
              <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-lavender px-2.5 py-0.5 text-[11.5px] font-medium text-lavender-ink"><FlaskConical className="size-3" /> Demo mode</p>
            )}
            <Markdown text={askState.answer} />
            <SourceChips sources={askState.sources ?? []} numbered={askState.mode === "ai"} />
            <Link href={`/app/intelligence?c=${askState.conversationId}`} className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent-strong hover:underline">
              Continue this conversation <ArrowRight className="size-3.5" />
            </Link>
          </div>
        )}
        {aiDemo && mode === "ask" && !askState.answer && !asking && (
          <p className="mt-3 px-2 text-xs text-muted">ONE is running without an AI model — questions are answered with a keyword search over your own data.</p>
        )}
      </div>
    </div>
  );
}
