import type { Metadata } from "next";
import { Download, Lock, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { userDb } from "@/lib/db";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/misc";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm";
import { revokeSupportAccess } from "../../_actions/settings";
import { SupportGrantForm, DeleteAccountForm } from "../forms";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Privacy & data" };

export default async function PrivacyPage() {
  const user = await requireUser();
  const db = await userDb(user.id);
  const grants = await db.select("support_access_grants", { order: { column: "created_at", ascending: false } });
  const active = grants.filter((g) => !g.revoked_at && Date.parse(g.expires_at) > Date.now());
  return (
    <div className="space-y-6">
      <Notice tone="blue"><Lock /> Your memories, documents, tasks and conversations are private. Every record is bound to your account, and even the ONE operator cannot read them by default.</Notice>

      <Card>
        <CardHeader title="Export your data" description="Download everything stored in your account as a JSON file (GDPR Art. 20)." />
        <CardBody><a href="/api/export" className={buttonVariants({ variant: "secondary" })}><Download /> Download export</a></CardBody>
      </Card>

      <Card>
        <CardHeader title={<span className="flex items-center gap-2"><ShieldCheck className="size-4 text-accent" /> Support access</span>}
          description="If you need help, you can allow the ONE team to look at your account for a limited time. Every access is logged." />
        <CardBody className="space-y-4">
          {active.length > 0 ? active.map((g) => (
            <div key={g.id} className="flex flex-col gap-2 rounded-xl border border-[#ffe2cf] bg-peach/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[13px] text-peach-ink">
                <p className="font-semibold">Support access is active until {formatDateTime(g.expires_at)}</p>
                <p className="opacity-80">Reason: {g.reason}</p>
              </div>
              <ConfirmAction action={revokeSupportAccess} fields={{ id: g.id }} trigger="Revoke now" title="Revoke support access?" confirmLabel="Revoke" />
            </div>
          )) : <SupportGrantForm />}
        </CardBody>
      </Card>

      <Card className="border-[#ffd9de]">
        <CardHeader title="Delete account" description="Permanently deletes your account, all memories, documents, tasks, actions and conversations. This cannot be undone." />
        <CardBody><DeleteAccountForm /></CardBody>
      </Card>
    </div>
  );
}
