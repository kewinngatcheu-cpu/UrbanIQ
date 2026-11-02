import type { PlanId } from "@/lib/config/plans";

export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
  upgradeTo?: PlanId | null;
  /** Arbitrary payload for the client (e.g. created id). */
  data?: Record<string, unknown>;
  /** Changes on every submission so clients can react to repeated results. */
  ts?: number;
}

export const initialState: ActionState = {};
