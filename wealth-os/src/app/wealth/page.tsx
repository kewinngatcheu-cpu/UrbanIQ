"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Camera, Plus, PlusCircle } from "lucide-react";
import { useFinance, useNow } from "@/components/providers";
import { Alert, Assumption, Badge, Button, Card, EmptyState, PageHeader, Progress, Stat, Table, cx } from "@/components/ui";
import { Breakdown, StackedArea, ValueVsContributions } from "@/components/charts";
import { AccountModal, BUCKET_LABEL, DepositModal, HoldingModal } from "@/components/wealth-modals";
import { fmtEUR, fmtEUR2, fmtNum, fmtPct, uid } from "@/lib/format";
import { holdingCost, holdingValue, makeSnapshots, wealthSummary } from "@/lib/finance/wealth";
import { historyWithCurrent } from "@/lib/finance/series";
import { goalProgress } from "@/lib/finance/goals";
import { monthLabel, toMonth } from "@/lib/finance/months";
import { db } from "@/lib/db";
import type { Account, AccountBucket, Holding } from "@/lib/types";

export default function WealthPage() {
  const data = useFinance();
  const now = useNow();
  const month = toMonth(now);
  const s = useMemo(() => wealthSummary(data), [data]);
  const hist = useMemo(() => historyWithCurrent(data, now, 12), [data, now]);
  const [account, setAccount] = useState<Account | null>(null);
  const [holding, setHolding] = useState<Holding | null>(null);
  const [deposit, setDeposit] = useState<string | null | undefined>(undefined);
  const [snapMsg, setSnapMsg] = useState<string | null>(null);
  const hasSnapshot = data.snapshots.some((x) => x.month === month);

  async function saveSnapshot() {
    await db().snapshots.bulkPut(makeSnapshots(data, month));
    setSnapMsg(`Snapshot für ${monthLabel(month, true)} gespeichert (${data.accounts.length} Konten).`);
  }

  const buckets: AccountBucket[] = ["liquid", "property", "invested", "other"];
  const bucketValue = { liquid: s.liquid, property: s.property, invested: s.invested, other: s.other };
  const brokers = data.accounts.filter((a) => a.bucket === "invested" || a.bucket === "other");
  const holdingsCost = data.holdings.reduce((t, h) => t + holdingCost(h), 0);
  const holdingsValue = data.holdings.reduce((t, h) => t + holdingValue(h), 0);

  return (
    <>
      <PageHeader
        title="Vermögen"
        description="Vermögensaufbau in vier Bereichen. Kontostände und Positionen pflegst du manuell oder per Import; Einzahlungen und Rendite werden getrennt ausgewiesen."
        actions={
          <>
            <Button onClick={saveSnapshot}>
              <Camera size={15} /> {hasSnapshot ? "Snapshot aktualisieren" : "Snapshot speichern"}
            </Button>
            <Button onClick={() => setDeposit(null)}>
              <PlusCircle size={15} /> Einzahlung
            </Button>
            <Button variant="primary" onClick={() => setAccount({ id: uid("acc"), name: "", type: "savings", bucket: "liquid", balance: 0, contributions: 0 })}>
              <Plus size={15} /> Konto
            </Button>
          </>
        }
      />
      {snapMsg && <div className="mb-4"><Alert tone="good" title={snapMsg} /></div>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Gesamtvermögen" value={fmtEUR(s.totalAssets)} sub={`Netto ${fmtEUR(s.netWorth)}`} />
        <Stat label="Eingezahlt (Investments)" value={fmtEUR(s.contributionsInvested)} />
        <Stat label="Rendite (Investments)" value={`${s.returnsInvested >= 0 ? "+" : ""}${fmtEUR(s.returnsInvested)}`} sub={s.contributionsInvested > 0 ? fmtPct((s.returnsInvested / s.contributionsInvested) * 100) : undefined} tone={s.returnsInvested >= 0 ? "good" : "critical"} />
        <Stat label="Sicheres Guthaben" value={fmtEUR(s.liquid + s.property)} sub="Liquidität + Immobilien-EK (nicht schwankend)" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Vermögensaufteilung">
          <Breakdown label="Vermögensaufteilung" items={buckets.map((b) => ({ name: BUCKET_LABEL[b].split(" · ")[1], value: bucketValue[b] }))} />
        </Card>
        <Card className="lg:col-span-2" title="Wertentwicklung nach Bereichen" subtitle="12 Monate aus Snapshots">
          <StackedArea
            label="Wertentwicklung"
            data={hist as never}
            series={[
              { key: "liquid", label: "Liquide", color: "var(--s1)" },
              { key: "property", label: "Immobilien-EK", color: "var(--s2)" },
              { key: "invested", label: "Investiert", color: "var(--s3)" },
              { key: "other", label: "Sonstige", color: "var(--s4)" },
            ]}
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {buckets.map((b) => {
          const accounts = data.accounts.filter((a) => a.bucket === b);
          return (
            <Card key={b} title={BUCKET_LABEL[b]} subtitle={fmtEUR(bucketValue[b])}>
              {accounts.length === 0 ? (
                <EmptyState title="Noch kein Konto" description="Lege ein Konto für diesen Bereich an." />
              ) : (
                <ul className="divide-y divide-border/60">
                  {accounts.map((a) => {
                    const v = s.byAccount.find((x) => x.account.id === a.id)?.value ?? 0;
                    const goal = data.goals.find((g) => g.linkedAccountIds.includes(a.id));
                    const gp = goal ? goalProgress(goal, data, now) : null;
                    return (
                      <li key={a.id} className="py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <button onClick={() => setAccount(a)} className="min-w-0 text-left hover:text-accent">
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                              {a.name} {a.isDemo && <Badge tone="demo">Demo</Badge>}
                            </div>
                            <div className="text-xs text-muted">
                              {a.institution ? `${a.institution} · ` : ""}Einzahlungen {fmtEUR(a.contributions)}
                              {a.interestRate ? ` · ${fmtPct(a.interestRate, 2)} p. a.` : ""}
                            </div>
                          </button>
                          <div className="flex items-center gap-2">
                            <span className="tabular text-sm font-semibold">{fmtEUR(v)}</span>
                            <Button size="sm" variant="ghost" onClick={() => setDeposit(a.id)} aria-label={`Einzahlung ${a.name}`}>
                              <PlusCircle size={15} />
                            </Button>
                          </div>
                        </div>
                        {gp && (
                          <div className="mt-2">
                            <div className="mb-1 flex justify-between text-[11px] text-muted">
                              <span>Ziel: {goal!.name}</span>
                              <span>{fmtPct(gp.progressPct, 0)} von {fmtEUR(goal!.targetAmount)}</span>
                            </div>
                            <Progress value={gp.progressPct} label={goal!.name} />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      <Card
        className="mt-4"
        title="Positionen (Trade Republic & weitere Depots)"
        subtitle={`Wert ${fmtEUR(holdingsValue)} · Einstand ${fmtEUR(holdingsCost)} · ${holdingsValue - holdingsCost >= 0 ? "+" : ""}${fmtEUR(holdingsValue - holdingsCost)} unrealisiert`}
        action={
          <Button size="sm" disabled={!brokers.length} onClick={() => setHolding({ id: uid("h"), accountId: brokers[0]?.id ?? "", name: "", type: "etf", quantity: 0, avgPrice: 0, currentPrice: 0, priceSource: "manual" })}>
            <Plus size={14} /> Position
          </Button>
        }
      >
        {data.holdings.length === 0 ? (
          <EmptyState title="Keine Positionen" description="Trage deine Trade-Republic-Bestände manuell ein (Name, ISIN, Stückzahl, Einstandskurs, aktueller Kurs)." />
        ) : (
          <Table head={["Position", "Stück", "Einstand", "Kurs", "Wert", "G/V", "Kursdatum"]}>
            {data.holdings.map((h) => {
              const pl = holdingValue(h) - holdingCost(h);
              const plPct = holdingCost(h) > 0 ? (pl / holdingCost(h)) * 100 : 0;
              const stale = !h.priceDate || (now.getTime() - new Date(h.priceDate).getTime()) / 86_400_000 > 31;
              return (
                <tr key={h.id} className="cursor-pointer hover:bg-surface-2" onClick={() => setHolding(h)}>
                  <td>
                    <div className="flex items-center gap-1.5 font-medium">
                      {h.name} {h.isDemo && <Badge tone="demo">Demo</Badge>}
                    </div>
                    <div className="text-xs text-muted">{[h.isin, h.symbol].filter(Boolean).join(" · ")}</div>
                  </td>
                  <td>{fmtNum(h.quantity)}</td>
                  <td>{fmtEUR2(h.avgPrice)}</td>
                  <td>{fmtEUR2(h.currentPrice)}</td>
                  <td className="font-medium">{fmtEUR(holdingValue(h))}</td>
                  <td className={cx(pl >= 0 ? "text-good" : "text-critical")}>
                    {pl >= 0 ? "+" : ""}
                    {fmtEUR(pl)} <span className="text-xs">({fmtPct(plPct)})</span>
                  </td>
                  <td className="text-xs">
                    {h.priceDate ?? "–"} {stale && <Badge tone="warn">veraltet</Badge>}
                    <div className="text-muted">{h.priceSource === "alphavantage" ? "Alpha Vantage" : "manuell"}</div>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      <Card className="mt-4" title="Einzahlungen vs. Rendite" subtitle="Investiertes Vermögen (Bereich C)">
        <ValueVsContributions label="Einzahlungen vs. Rendite" data={hist.map((h) => ({ month: h.month, value: h.invested, contributions: h.investedContributions }))} height={240} />
        <Assumption>
          Rendite = aktueller Wert − Summe Einzahlungen. Steuern, Gebühren und Dividenden werden nur berücksichtigt, wenn du sie in Kurs/Einzahlungen einpflegst. Sparziele verwaltest du unter <Link href="/goals" className="text-accent">Ziele</Link>.
        </Assumption>
      </Card>

      {account && <AccountModal key={account.id} account={account} onClose={() => setAccount(null)} />}
      {holding && <HoldingModal key={holding.id} holding={holding} onClose={() => setHolding(null)} />}
      {deposit !== undefined && <DepositModal accountId={deposit ?? undefined} onClose={() => setDeposit(undefined)} />}
    </>
  );
}
