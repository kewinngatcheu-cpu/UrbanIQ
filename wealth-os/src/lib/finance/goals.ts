import type { FinanceData, Goal } from "../types";
import { accountValue } from "./wealth";
import { monthDiff, toMonth } from "./months";
import { requiredMonthlySaving } from "./property";

export interface GoalProgress {
  goal: Goal;
  current: number;
  progressPct: number;
  remaining: number;
  monthsLeft: number | null;
  requiredMonthly: number | null;
}

export function goalProgress(goal: Goal, data: Pick<FinanceData, "accounts" | "holdings">, now: Date = new Date()): GoalProgress {
  const linked = data.accounts.filter((a) => goal.linkedAccountIds.includes(a.id));
  const current = linked.length > 0 ? linked.reduce((s, a) => s + accountValue(a, data.holdings), 0) : goal.manualCurrent ?? 0;
  const remaining = Math.max(0, goal.targetAmount - current);
  const monthsLeft = goal.targetDate ? Math.max(0, monthDiff(toMonth(now), toMonth(goal.targetDate))) : null;
  return {
    goal,
    current,
    progressPct: goal.targetAmount > 0 ? Math.min(100, (current / goal.targetAmount) * 100) : 0,
    remaining,
    monthsLeft,
    requiredMonthly: monthsLeft !== null ? requiredMonthlySaving(goal.targetAmount, current, monthsLeft) : null,
  };
}
