"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

export function FadeIn({
  children,
  delay = 0,
  y = 24,
  className,
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.24em] transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-champagne disabled:cursor-not-allowed disabled:opacity-40";

const variants = {
  primary: "bg-sea-deep text-ivory hover:bg-sea shadow-[0_12px_30px_-12px_rgba(18,62,92,.55)] active:scale-[.98]",
  light: "bg-ivory text-sea-deep hover:bg-white shadow-[0_12px_30px_-12px_rgba(0,0,0,.35)] active:scale-[.98]",
  outline: "border border-ink/20 text-ink hover:border-ink/50 bg-transparent",
  ghost: "text-ink-soft hover:text-ink px-3",
} as const;

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof variants }) {
  return <button className={clsx(btnBase, variants[variant], className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof variants }) {
  return <Link className={clsx(btnBase, variants[variant], className)} {...props} />;
}

export function Wordmark({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <Link href="/" className={clsx("group inline-flex flex-col leading-none", light ? "text-ivory" : "text-ink", className)}>
      <span className="eyebrow !text-[0.6rem] !tracking-[0.34em]">Our Summer Escape</span>
      <span className="font-display text-lg italic opacity-80">2027 · J × K</span>
    </Link>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clsx("eyebrow text-sand-deep", className)}>{children}</p>;
}

export function StatusBadge({ status }: { status: "verified" | "estimated" | "unavailable" | "live" }) {
  const map = {
    verified: ["Verifiziert", "bg-olive-light text-olive"],
    live: ["Live abgefragt", "bg-olive-light text-olive"],
    estimated: ["Geschätzt", "bg-champagne/70 text-sand-deep"],
    unavailable: ["Noch nicht verfügbar", "bg-mist text-ink-soft"],
  } as const;
  const [label, cls] = map[status];
  return <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em]", cls)}>{label}</span>;
}

export function Divider({ className }: { className?: string }) {
  return (
    <div className={clsx("flex items-center gap-4 text-sand", className)} aria-hidden>
      <span className="h-px flex-1 bg-line" />
      <span className="font-display text-xl italic">✦</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
