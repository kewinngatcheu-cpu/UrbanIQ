import { cn } from "@/lib/utils";

/**
 * ONE logo: a soft "orbit" mark (a single continuous ring with a sky-blue point of light — one life, one place)
 * next to a clean wordmark. Solid colors only: the mark renders several times per page
 * (desktop + mobile nav), and duplicated SVG gradient ids break when the first copy is hidden.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="9" fill="#EFF7FF" />
      <circle cx="16" cy="16" r="8.2" fill="none" stroke="#6AAFE8" strokeWidth="3.2" />
      <circle cx="22.4" cy="9.6" r="2.6" fill="#438ED4" stroke="#EFF7FF" strokeWidth="1.4" />
    </svg>
  );
}

export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-[15px]" : "text-lg";
  const mark = size === "lg" ? "size-9" : size === "sm" ? "size-6" : "size-7";
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={mark} />
      <span className={cn("font-semibold tracking-[0.18em] text-ink", text)}>
        ONE
      </span>
    </span>
  );
}
