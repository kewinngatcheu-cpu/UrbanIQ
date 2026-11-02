import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { systemDb } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { setFeedbackStatus } from "../actions";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Feedback" };

export default async function AdminFeedback() {
  await requireOwner();
  const items = await systemDb().select("feedback", { order: { column: "created_at", ascending: false }, limit: 300 });
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Feedback & bug reports</h1>
        <p className="text-sm text-muted">{items.filter((i) => i.status === "new").length} new · {items.length} total</p>
      </div>
      {items.length === 0 ? <EmptyState icon={<MessageSquare />} title="No feedback yet" /> : (
        <div className="space-y-3">
          {items.map((f) => (
            <Card key={f.id} className={cn(f.status === "resolved" && "opacity-60")}>
              <CardBody>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={f.kind === "bug" ? "rose" : f.kind === "idea" ? "lavender" : "blue"}>{f.kind}</Badge>
                  <Badge tone={f.status === "new" ? "peach" : f.status === "reviewed" ? "gray" : "mint"}>{f.status}</Badge>
                  <span className="text-[12px] text-muted">{f.email ?? "deleted user"} · {formatDateTime(f.created_at)}</span>
                  <div className="ml-auto flex gap-1">
                    {(["new", "reviewed", "resolved"] as const).filter((s) => s !== f.status).map((s) => (
                      <form key={s} action={setFeedbackStatus}>
                        <input type="hidden" name="id" value={f.id} />
                        <input type="hidden" name="status" value={s} />
                        <button className="rounded-lg px-2.5 py-1 text-[12px] text-muted ring-1 ring-line hover:text-ink">Mark {s}</button>
                      </form>
                    ))}
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{f.message}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
