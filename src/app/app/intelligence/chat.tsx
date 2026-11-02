"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Loader2, FlaskConical, Sparkles } from "lucide-react";
import { ask, type AskState } from "../_actions/ask";
import { Markdown } from "@/components/ui/markdown";
import { FormMessage } from "@/components/ui/form";
import { SourceChips } from "@/components/app/source-chips";
import type { Source } from "@/lib/db/types";
import { cn } from "@/lib/utils";

interface Msg { id: string; role: "user" | "assistant"; content: string; sources: Source[]; mode: "ai" | "demo" }

const SUGGESTIONS = ["What deadlines do I have coming up?", "What did I save about my insurance?", "Which tasks are still open?", "Summarise my ideas"];

export function Chat({ conversationId, messages }: { conversationId?: string; messages: Msg[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pendingQ, setPendingQ] = useState<string | null>(null);
  const [state, action, pending] = useActionState<AskState, FormData>(ask, {});
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.ok && state.conversationId && state.conversationId !== conversationId) {
      router.replace(`/app/intelligence?c=${state.conversationId}`, { scroll: false });
    }
    if (state.ts) setPendingQ(null);
  }, [state.ts, state.ok, state.conversationId, conversationId, router]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages.length, pending]);

  // Before the server-refreshed thread arrives, show the latest answer from the action result.
  const shown: Msg[] = [...messages];
  if (state.ok && state.answer && state.conversationId === conversationId && !messages.some((m) => m.content === state.answer)) {
    shown.push({ id: "q", role: "user", content: state.question ?? "", sources: [], mode: state.mode ?? "demo" });
    shown.push({ id: "a", role: "assistant", content: state.answer, sources: state.sources ?? [], mode: state.mode ?? "demo" });
  }

  return (
    <div className="flex min-h-[460px] flex-col rounded-2xl border border-line bg-white shadow-soft">
      <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6" aria-live="polite">
        {shown.length === 0 && !pendingQ && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-mist text-accent"><Sparkles className="size-5" /></div>
            <p className="mt-4 text-[15px] font-semibold text-ink">Ask anything about your life</p>
            <p className="mt-1 max-w-sm text-sm text-muted">ONE answers from what you&apos;ve stored and shows its sources. If it doesn&apos;t know, it says so.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => setText(s)} className="rounded-full border border-line bg-white px-3 py-1.5 text-[13px] text-ink shadow-soft hover:border-cloud">{s}</button>
              ))}
            </div>
          </div>
        )}
        {shown.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-[14.5px] text-white">{m.content}</div>
            ) : (
              <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-snow px-4 py-3">
                {m.mode === "demo" && <p className="mb-1 inline-flex items-center gap-1 rounded-full bg-lavender px-2 py-0.5 text-[11px] font-medium text-lavender-ink"><FlaskConical className="size-3" /> Demo mode</p>}
                <Markdown text={m.content} />
                <SourceChips sources={m.sources} numbered={m.mode === "ai"} />
              </div>
            )}
          </div>
        ))}
        {pendingQ && (
          <>
            <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-[14.5px] text-white">{pendingQ}</div></div>
            <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin text-primary" /> ONE is thinking…</div>
          </>
        )}
        <div ref={endRef} />
      </div>
      <form
        action={(f) => { setPendingQ(String(f.get("question") ?? "")); setText(""); action(f); }}
        className="border-t border-line p-3"
      >
        {conversationId && <input type="hidden" name="conversation_id" value={conversationId} />}
        {state.error && <FormMessage state={state} className="mb-2" />}
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-snow/60 p-1.5 focus-within:border-primary focus-within:bg-white">
          <textarea
            name="question"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (text.trim() && !pending) e.currentTarget.form?.requestSubmit(); } }}
            rows={1}
            placeholder="Ask ONE…"
            aria-label="Ask ONE"
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-[15px] text-ink placeholder:text-muted/70 focus:outline-none"
            maxLength={4000}
          />
          <button type="submit" disabled={!text.trim() || pending} aria-label="Send" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition hover:bg-[#3a82c6] disabled:bg-sky">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
