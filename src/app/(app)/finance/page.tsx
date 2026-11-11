import { requireOwner } from "@/lib/auth/guard";
import { PageHeader } from "@/components/PageHeader";
import { FinanceClient } from "./FinanceClient";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  await requireOwner();
  return (
    <>
      <PageHeader eyebrow="Personal CFO" title="Finanzen"
        subtitle="Manuelle Buchungen und CSV-Import aus dem Online-Banking. Keine Bankverbindung, keine Transaktionen – JARVIS rechnet nur mit dem, was du erfasst." />
      <FinanceClient />
    </>
  );
}
