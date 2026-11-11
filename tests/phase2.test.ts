import { beforeEach, describe, expect, it } from "vitest";
import { freshDb } from "./helpers";
import { baselineFrom, budgetStatus, monthsToGoal, project, spendableThisMonth, summarizeMonth, type Tx } from "@/lib/finance/calc";
import { categorize, parseAmount, parseBankCsv, parseDate } from "@/lib/finance/csv";
import { addTransaction, financeOverview, importCsv, setBudget, runScenario, updateTransactionCategory } from "@/lib/finance/service";
import { streakOf, createHabit, toggleCheckin, listHabits, startFocus, stopFocus, focusStats, resolveProcrastination, procrastinationCandidates } from "@/lib/discipline";
import { createGoal, goalProgress, listGoals, goalAlignment, toggleMilestone } from "@/lib/goals";
import { createTask, updateTask } from "@/lib/tasks";
import { weightedGrade, createCourse, listCourses, addMeasurement, fitnessOverview } from "@/lib/lifestyle";
import { buildBriefing, briefingForAI, planRules, makePlan, saveEvening, getDay } from "@/lib/myday";
import { getSettings, updateSettings } from "@/lib/settings";
import { addDays, berlinDay, weekStart, addMonths } from "@/lib/time";
import type { Task } from "@/lib/tasks";

describe("time helpers", () => {
  it("computes Berlin day, week start and month arithmetic", () => {
    expect(berlinDay(new Date("2026-11-10T23:30:00Z"))).toBe("2026-11-11"); // already Wednesday in Berlin
    expect(weekStart("2026-11-11")).toBe("2026-11-09");
    expect(weekStart("2026-11-15")).toBe("2026-11-09"); // Sunday belongs to the same ISO week
    expect(addMonths("2026-11", 2)).toBe("2027-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("finance calculations", () => {
  const txs: Tx[] = [
    { day: "2026-10-01", amount_cents: 120000, kind: "income", category: "einkommen" },
    { day: "2026-10-02", amount_cents: -55000, kind: "fixed", category: "miete" },
    { day: "2026-10-10", amount_cents: -30000, kind: "variable", category: "lebensmittel" },
    { day: "2026-10-12", amount_cents: -10000, kind: "savings", category: "sparen" },
    { day: "2026-11-01", amount_cents: -55000, kind: "fixed", category: "miete" },
    { day: "2026-11-05", amount_cents: -16000, kind: "variable", category: "lebensmittel" },
  ];
  it("summarizes a month", () => {
    const s = summarizeMonth("2026-10", txs);
    expect(s).toMatchObject({ income: 120000, fixed: 55000, variable: 30000, savings: 10000, net: 35000, cashflow: 25000 });
    expect(s.savingsRate).toBeCloseTo(10000 / 120000);
  });
  it("answers 'how much can I spend' using the baseline when income is not booked yet", () => {
    const current = summarizeMonth("2026-11", txs);
    const baseline = baselineFrom([summarizeMonth("2026-10", txs)]);
    const s = spendableThisMonth({ today: "2026-11-11", current, baseline, budgets: {} });
    // 1200 income − 550 fixed − 100 saving − 160 spent = 390 €
    expect(s.available).toBe(39000);
    expect(s.daysLeft).toBe(20);
    expect(s.perDay).toBe(1950);
    expect(s.basis).toBe("mixed"); // rent already booked (actual), income from baseline
    expect(s.explanation.join(" ")).toContain("Durchschnitt");
  });
  it("flags budgets that run ahead of the month", () => {
    const current = summarizeMonth("2026-11", txs);
    const st = budgetStatus({ lebensmittel: 20000, freizeit: 10000 }, current, { today: "2026-11-11" });
    expect(st[0]).toMatchObject({ category: "lebensmittel", state: "warning" }); // 80 %
    expect(st[1]).toMatchObject({ category: "freizeit", state: "ok" });
  });
  it("projects scenarios and time to a savings goal", () => {
    const base = { months: 1, income: 120000, fixed: 55000, variable: 30000, savings: 10000, investment: 0 };
    const ref = project({ startMonth: "2026-12", months: 6, liquid: 100000, saved: 0, baseline: base });
    expect(ref[5]).toMatchObject({ month: "2027-05", liquid: 100000 + 6 * 25000, saved: 60000 });
    const rent = project({ startMonth: "2026-12", months: 6, liquid: 100000, saved: 0, baseline: base, scenario: { rentChangeCents: 10000, oneOffCents: 50000 } });
    expect(rent[0].liquid).toBe(100000 + 25000 - 10000 - 50000);
    const cut = project({ startMonth: "2026-12", months: 1, liquid: 0, saved: 0, baseline: base, scenario: { expenseChangePct: -10 } });
    expect(cut[0].liquid).toBe(25000 + 8500);
    expect(monthsToGoal(500000, 100000, 25000)).toBe(16);
    expect(monthsToGoal(500000, 100000, 0)).toBeNull();
  });
});

describe("bank CSV import", () => {
  it("parses German amounts and dates", () => {
    expect(parseAmount("-1.234,56 €")).toBe(-123456);
    expect(parseAmount("12.50")).toBe(1250);
    expect(parseAmount("1,234.50")).toBe(123450);
    expect(parseAmount("45,00-")).toBe(-4500);
    expect(parseDate("03.11.2026")).toBe("2026-11-03");
    expect(parseDate("3.1.26")).toBe("2026-01-03");
  });
  it("categorizes by keyword and treats refunds as inflow", () => {
    expect(categorize("REWE Markt GmbH", -2300)).toEqual({ category: "lebensmittel", kind: "variable" });
    expect(categorize("Spotify AB", -999)).toEqual({ category: "abos", kind: "fixed" });
    expect(categorize("Zalando Erstattung", 4999)).toEqual({ category: "einkommen", kind: "income" });
    expect(categorize("Irgendwas", -100)).toEqual({ category: "sonstiges", kind: "variable" });
  });
  it("reads a typical bank export with preamble, quotes and identical rows", () => {
    const csv = `Kontonummer;DE00 1234
"Buchungstag";"Valuta";"Auftraggeber/Empfänger";"Verwendungszweck";"Betrag (EUR)"
"03.11.2026";"03.11.2026";"REWE";"Einkauf; Karte";"-23,40"
"03.11.2026";"03.11.2026";"REWE";"Einkauf; Karte";"-23,40"
"01.11.2026";"01.11.2026";"Arbeitgeber GmbH";"Gehalt November";"1.450,00"
"kaputt";"";"";"";"1"`;
    const r = parseBankCsv(csv);
    expect(r.columns.date).toBe("buchungstag");
    expect(r.rows).toHaveLength(3);
    expect(new Set(r.rows.map((x) => x.import_hash)).size).toBe(3); // identical rows stay distinct
    expect(r.rows[2]).toMatchObject({ amount_cents: 145000, kind: "income" });
    expect(r.skipped).toHaveLength(1);
  });
  it("supports separate debit/credit columns", () => {
    const r = parseBankCsv("Datum,Beschreibung,Soll,Haben\n2026-11-02,BVG Ticket,49.00,\n2026-11-03,Bafög,,500.00");
    expect(r.rows.map((x) => x.amount_cents)).toEqual([-4900, 50000]);
  });
});

describe("Phase 2 services (database)", () => {
  beforeEach(async () => { await freshDb(); });

  it("imports CSV idempotently and powers the overview", async () => {
    const csv = `Buchungstag;Empfänger;Verwendungszweck;Betrag\n01.10.2026;Arbeitgeber;Gehalt;1200,00\n02.10.2026;Hausverwaltung;Miete;-550,00\n05.10.2026;REWE;Einkauf;-80,00`;
    const preview = await importCsv(csv, true);
    expect(preview).toMatchObject({ newRows: 3, imported: false });
    expect((await importCsv(csv, false)).newRows).toBe(3);
    expect((await importCsv(csv, false)).newRows).toBe(0); // re-import: duplicates skipped
    await addTransaction({ day: "2026-11-03", amount: 40, kind: "variable", category: "lebensmittel", description: "Markt" });
    await setBudget("lebensmittel", 100);
    const o = await financeOverview("2026-11-11");
    expect(o.baseline).toMatchObject({ months: 1, income: 120000, fixed: 55000, variable: 8000 });
    expect(o.spendable?.available).toBe(120000 - 55000 - 4000);
    expect(o.budgetStatus[0]).toMatchObject({ category: "lebensmittel", spent: 4000 });
    const sc = await runScenario({ incomeChangePct: 10 }, 3, "2026-11-11");
    expect(sc.scenario[0].income).toBe(132000);
    expect(sc.balancesKnown).toBe(false);
  });

  it("re-categorizing keeps the sign consistent", async () => {
    const { id } = await addTransaction({ day: "2026-11-03", amount: 40, kind: "variable", category: "sonstiges" });
    await updateTransactionCategory(id, "einkommen");
    const o = await financeOverview("2026-11-11");
    expect(o.current.income).toBe(4000);
  });

  it("tracks habits, streaks and refuses to rewrite old history", async () => {
    expect(streakOf(new Set(["2026-11-09", "2026-11-10"]), "2026-11-11")).toBe(2);
    const h = await createHabit({ title: "Lesen 20 Min", targetPerWeek: 5 });
    for (const d of ["2026-11-09", "2026-11-10", "2026-11-11"]) await toggleCheckin(h.id, d, true, "2026-11-11");
    await expect(toggleCheckin(h.id, "2026-10-01", true, "2026-11-11")).rejects.toThrow();
    const [hab] = await listHabits("2026-11-11");
    expect(hab).toMatchObject({ streak: 3, week_done: 3 });
    expect(hab.consistency30).toBe(1); // new habit: measured over its own lifetime, not 30 days
  });

  it("runs focus sessions and attributes them to the task's workspace", async () => {
    const t = await createTask({ workspaceId: "ngcx", title: "Pitch" }, "owner");
    const s = await startFocus({ taskId: t.id, plannedMin: 25 });
    await expect(startFocus({})).rejects.toThrow("bereits");
    await stopFocus(s.id, { completed: true, taskDone: true });
    const st = await focusStats();
    expect(st.sessions_week).toBe(1);
    expect(st.byWorkspace[0].workspace_id).toBe("ngcx");
  });

  it("handles procrastination with a real next step", async () => {
    const t = await createTask({ title: "Steuererklärung", dueAt: "2026-11-01T10:00:00Z" }, "owner");
    await updateTask(t.id, { dueAt: "2026-11-05T10:00:00Z" }, "owner");
    await updateTask(t.id, { dueAt: "2026-11-08T10:00:00Z" }, "owner");
    expect((await procrastinationCandidates()).map((x) => x.id)).toContain(t.id);
    const r = await resolveProcrastination(t.id, "unclear", { nextStep: "Belege in einen Ordner legen" });
    expect(r.actions).toContain("next_step_created");
    expect(r.advice).toContain("ersten physischen Schritt");
  });

  it("computes goal progress from metric, milestones or tasks", async () => {
    const g1 = await createGoal({ title: "Rücklage", category: "finance", metricUnit: "€", metricStart: 0, metricTarget: 5000, metricCurrent: 1250 }, "owner");
    expect(g1.progress).toBe(0.25);
    const g2 = await createGoal({ title: "NGCX validieren", workspaceId: "ngcx", category: "business", milestones: [{ title: "10 Interviews" }, { title: "Pilotkunde" }] }, "owner");
    await toggleMilestone(g2.milestones![0].id, true);
    const g3 = await createGoal({ title: "Ohne Messung" }, "owner");
    const goals = await listGoals();
    expect(goals.find((g) => g.id === g2.id)!.progress).toBe(0.5);
    expect(goals.find((g) => g.id === g3.id)!.progress).toBeNull();
    expect(goalProgress({ ...g1, metric_current: 6000 })).toBe(1);
    const linked = await createTask({ title: "Interview 1", goalId: g2.id }, "owner");
    await updateTask(linked.id, { status: "done" }, "owner");
    expect((await goalAlignment()).aligned).toBe(1);
  });

  it("computes the ECTS-weighted grade and stale measurements", async () => {
    expect(weightedGrade([{ grade: 1.3, ects: 5, status: "passed" }, { grade: 2.7, ects: 10, status: "passed" }, { grade: 1.0, ects: 5, status: "active" }]))
      .toEqual({ average: 2.23, ects: 15 });
    await createCourse({ name: "Finanzmathematik", ects: 5, examDate: "2026-11-20" });
    expect((await listCourses())[0].name).toBe("Finanzmathematik");
    await addMeasurement({ day: "2026-09-01", metric: "weight_kg", value: 78.5 });
    const f = await fitnessOverview("2026-11-11");
    expect(f.latest[0]).toMatchObject({ metric: "weight_kg", stale: true });
  });

  it("builds a data-backed briefing without inventing anything", async () => {
    const now = new Date("2026-11-11T07:30:00Z");
    await createTask({ workspaceId: "ngcx", title: "Interviewleitfaden", priority: "critical", dueAt: "2026-11-09T10:00:00Z" }, "owner");
    await createCourse({ name: "Finanzmathematik", ects: 5, examDate: "2026-11-20" });
    const b = await buildBriefing(now);
    expect(b.day).toBe("2026-11-11");
    expect(b.priorities[0].title).toBe("Interviewleitfaden");
    expect(b.schedule.calendarConnected).toBe(false);
    expect(b.finance).toBeNull(); // no finance data → nothing shown
    expect(b.risks.join(" ")).toContain("überfällig");
    expect(b.risks.join(" ")).toContain("Finanzmathematik");
    expect(b.ventures.map((v) => v.id)).toEqual(["ngcx", "venturesx"]);
    expect(b.nextActions[0]).toContain("Interviewleitfaden");
  });

  it("respects privacy switches for AI context", async () => {
    await addTransaction({ day: berlinDay(), amount: 1000, kind: "income", category: "einkommen" });
    const b = await buildBriefing();
    expect(b.finance).not.toBeNull();
    await updateSettings({ aiContextFinance: false });
    expect((await briefingForAI(b)).finance).toBe("nicht freigegeben");
  });

  it("chat snapshot: finance only in the personal workspace and only when allowed", async () => {
    const { chatSnapshot } = await import("@/lib/myday");
    await addTransaction({ day: berlinDay(), amount: 1500, kind: "income", category: "einkommen" });
    await createGoal({ title: "NGCX Pilotkunde gewinnen", workspaceId: "ngcx", category: "business" }, "owner");
    await createGoal({ title: "Privates Sparziel", category: "finance" }, "owner");
    const personal = await chatSnapshot("personal");
    expect(personal).toContain("noch verfügbar");
    expect(personal).toContain("Privates Sparziel");
    expect(personal).not.toContain("NGCX Pilotkunde");
    const ngcx = await chatSnapshot("ngcx");
    expect(ngcx).toContain("NGCX Pilotkunde");
    expect(ngcx).not.toMatch(/Finanzen|Sparziel|Gewohnheiten/);
    await updateSettings({ aiContextFinance: false });
    expect(await chatSnapshot("personal")).toContain("nicht für die KI freigegeben");
  });

  it("plans time blocks by priority with breaks and partial blocks", () => {
    const mk = (id: string, priority: Task["priority"], est: number | null): Task => ({ id, workspace_id: "personal", title: id, notes: "", priority, status: "open",
      project: null, due_at: null, postponed_count: 0, estimate_min: est, completed_at: null, created_by: "owner", goal_id: null, course_id: null,
      blocker_reason: null, parent_id: null, created_at: "", updated_at: "" });
    const tasks = [mk("low", "low", 30), mk("crit", "critical", 60), mk("high", "high", 60)];
    const plan = planRules(tasks, 170, 9 * 60);
    expect(plan.blocks.map((b) => b.title)).toEqual(["crit", "high", "Pause", "low"]);
    expect(plan.blocks[0]).toMatchObject({ start: "09:00", end: "10:00" });
    expect(plan.blocks[2]).toMatchObject({ start: "11:00", end: "11:10" });
    expect(plan.blocks.reduce((a, b) => a + b.minutes, 0)).toBeLessThanOrEqual(170);
    // Too little time for the whole second task → partial block of the remaining 30 min
    expect(planRules(tasks, 90, 9 * 60).blocks.map((b) => [b.title, b.minutes])).toEqual([["crit", 60], ["high (Teil 1)", 30]]);
    // Less than 25 min left → no fragment is planned
    expect(planRules(tasks, 80, 9 * 60).blocks.map((b) => b.title)).toEqual(["crit"]);
  });

  it("stores plans and evening reviews with real day stats", async () => {
    const t = await createTask({ title: "Sport" }, "owner");
    await updateTask(t.id, { status: "done" }, "owner");
    const plan = await makePlan({ availableMin: 90, start: "18:00", useAI: true });
    expect(plan.method).toBe("rules");
    expect(plan.warnings.join(" ")).toContain("Keine offenen Aufgaben");
    const r = await saveEvening({ accomplished: "Sport", learned: "Früher anfangen", energy: 4 }, { withAI: true });
    expect(r.feedback).toBeNull(); // no provider → no fake feedback
    expect(r.evening.stats.done).toBe(1);
    const d = await getDay(berlinDay());
    expect(d?.plan?.availableMin).toBe(90);
    expect(d?.evening).toBeTruthy();
  });

  it("settings are validated per key and only touched keys are written", async () => {
    await updateSettings({ memoryMode: "auto" });
    await updateSettings({ effort: "high" });
    const s = await getSettings();
    expect(s.memoryMode).toBe("auto");
    expect(s.effort).toBe("high");
    expect(s.financeLiquidCents).toBeNull();
    await expect(updateSettings({ effort: "extreme" })).rejects.toThrow();
  });
});
