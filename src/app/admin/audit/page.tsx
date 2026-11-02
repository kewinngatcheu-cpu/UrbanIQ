import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { systemDb } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit log" };

export default async function AdminAudit({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const sp = await searchParams;
  await requireOwner();
  const db = systemDb();
  let logs = await db.select("audit_logs", { order: { column: "created_at", ascending: false }, limit: 500 });
  if (sp.action) logs = logs.filter((l) => l.action.startsWith(sp.action!));
  const profiles = await db.select("profiles");
  const email = new Map(profiles.map((p) => [p.id, p.email]));
  const prefixes = ["admin.", "auth.", "subscription.", "billing.", "support_access.", "account."];
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Audit log</h1>
        <p className="text-sm text-muted">Append-only record of security-relevant and administrative actions.</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Link href="/admin/audit" className={`rounded-full px-3 py-1 text-[12.5px] ${!sp.action ? "bg-ink text-white" : "bg-white text-muted ring-1 ring-line"}`}>All</Link>
        {prefixes.map((p) => (
          <Link key={p} href={`/admin/audit?action=${p}`} className={`rounded-full px-3 py-1 text-[12.5px] ${sp.action === p ? "bg-ink text-white" : "bg-white text-muted ring-1 ring-line"}`}>{p.replace(".", "")}</Link>
        ))}
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-line bg-snow text-[12px] uppercase tracking-wider text-muted">
            <tr><th className="px-4 py-3 font-medium">Time</th><th className="px-4 py-3 font-medium">Action</th><th className="px-4 py-3 font-medium">Actor</th><th className="px-4 py-3 font-medium">Target</th><th className="px-4 py-3 font-medium">Details</th></tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {logs.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No entries.</td></tr>}
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap px-4 py-2.5 text-muted">{formatDateTime(l.created_at)}</td>
                <td className="px-4 py-2.5 font-mono text-[12px] text-ink">{l.action}</td>
                <td className="px-4 py-2.5 text-muted">{l.actor_id ? email.get(l.actor_id) ?? l.actor_id.slice(0, 8) : "system"}</td>
                <td className="px-4 py-2.5 text-muted">{l.target_type ? `${l.target_type}:${l.target_id ? (email.get(l.target_id) ?? l.target_id.slice(0, 8)) : ""}` : "—"}</td>
                <td className="max-w-xs truncate px-4 py-2.5 font-mono text-[11.5px] text-muted">{Object.keys(l.details ?? {}).length ? JSON.stringify(l.details) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
