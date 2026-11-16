import { z } from "zod";
import { CATEGORIES } from "../types";

const month = z.string().regex(/^\d{4}-\d{2}$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}/);
const category = z.enum([...CATEGORIES, "Einkommen"] as [string, ...string[]]);
const expenseCategory = z.enum(CATEGORIES as unknown as [string, ...string[]]);
const money = z.number().finite();

export const transactionSchema = z.object({
  id: z.string(), date, amount: money.nonnegative(), type: z.enum(["income", "expense"]), category, description: z.string(),
  accountId: z.string().optional(), recurringId: z.string().optional(), source: z.enum(["manual", "csv", "recurring", "deposit"]), isDemo: z.boolean().optional(),
});

export const recurringSchema = z.object({
  id: z.string(), name: z.string(), amount: money.nonnegative(), kind: z.enum(["income", "expense", "investment", "saving"]), category,
  interval: z.enum(["monthly", "quarterly", "yearly"]), dayOfMonth: z.number().int().min(1).max(31), startMonth: month, endMonth: month.optional(),
  isSubscription: z.boolean().optional(), isContract: z.boolean().optional(), cancellationNotice: z.string().optional(),
  targetAccountId: z.string().optional(), debtId: z.string().optional(), note: z.string().optional(),
});

export const backupSchema = z.object({
  app: z.literal("wealth-os"),
  version: z.number(),
  exportedAt: z.string(),
  data: z.object({
    settings: z.object({
      id: z.literal("main"), demoMode: z.boolean(), personalBudgetCap: money, personalCategories: z.array(expenseCategory),
      emergencyFundMonths: z.number(), salaryGrowthPct: z.number(), safeInterestPct: z.number(), warnThresholdPct: z.number(),
      consent: z.object({ ai: z.boolean(), marketData: z.boolean(), interestRates: z.boolean() }),
      ownerName: z.string().optional(), lastBackupAt: z.string().optional(),
      careerStart: z.object({ month, netIncome: money }).optional(),
    }),
    transactions: z.array(transactionSchema),
    recurring: z.array(recurringSchema),
    budgets: z.array(z.object({ id: z.string(), category: expenseCategory, monthlyLimit: money, startMonth: month.optional(), endMonth: month.optional() })),
    accounts: z.array(z.object({
      id: z.string(), name: z.string(), type: z.enum(["checking", "savings", "emergency", "property_equity", "broker", "other_investment", "cash"]),
      bucket: z.enum(["liquid", "property", "invested", "other"]), institution: z.string().optional(), balance: money, contributions: money,
      interestRate: z.number().optional(), isDemo: z.boolean().optional(),
    })),
    holdings: z.array(z.object({
      id: z.string(), accountId: z.string(), name: z.string(), isin: z.string().optional(), symbol: z.string().optional(),
      type: z.enum(["etf", "stock", "bond", "crypto", "fund", "other"]), quantity: z.number(), avgPrice: money, currentPrice: money,
      priceDate: z.string().optional(), priceSource: z.enum(["manual", "alphavantage"]).optional(), isDemo: z.boolean().optional(),
    })),
    snapshots: z.array(z.object({ id: z.string(), accountId: z.string(), month, value: money, contributions: money })),
    debts: z.array(z.object({
      id: z.string(), name: z.string(), lender: z.string().optional(), balance: money, interestRate: z.number(), monthlyPayment: money,
      endMonth: month.optional(), balanceIsEstimate: z.boolean().optional(),
    })),
    goals: z.array(z.object({
      id: z.string(), name: z.string(), type: z.enum(["property", "emergency", "travel", "investment", "custom"]), targetAmount: money,
      targetDate: z.string().optional(), linkedAccountIds: z.array(z.string()), manualCurrent: money.optional(), priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    })),
    property: z.object({
      id: z.literal("main"), purchasePrice: money, location: z.string(), region: z.enum(["berlin", "brandenburg", "custom"]), sizeSqm: z.number(),
      equity: money.optional(), transferTaxRate: z.number(), notaryRate: z.number(), brokerRate: z.number(), interestRate: z.number(),
      repaymentRate: z.number(), fixationYears: z.number(), hoaMonthly: money, hoaNonAllocableShare: z.number(), maintenancePerSqmYear: z.number(),
      lendingValueDiscount: z.number(), usage: z.enum(["self", "rental"]), expectedColdRentPerSqm: z.number(), vacancyRiskPct: z.number(),
      targetDate: date, equityTargetPct: z.number(), rateSource: z.string().optional(),
    }),
    closings: z.array(z.object({ id: month, closedAt: z.string(), summary: z.any(), notes: z.string().optional() })),
    aiReports: z.array(z.object({ id: z.string(), month, createdAt: z.string(), provider: z.string(), model: z.string().optional(), content: z.string() })),
  }),
});
