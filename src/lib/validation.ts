import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Please enter a valid email address.").max(254);

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters for your password.")
  .max(200)
  .regex(/[a-zA-Z]/, "Your password needs at least one letter.")
  .regex(/[0-9]/, "Your password needs at least one number.");
