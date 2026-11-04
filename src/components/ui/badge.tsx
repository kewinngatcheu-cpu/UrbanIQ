import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap [&_svg]:size-3", {
  variants: {
    tone: {
      blue: "bg-mist text-accent-strong",
      mint: "bg-mint text-mint-ink",
      lavender: "bg-lavender text-lavender-ink",
      gray: "bg-fog text-muted",
      peach: "bg-peach text-peach-ink",
      rose: "bg-rose text-rose-ink",
      outline: "border border-line text-muted bg-white",
    },
  },
  defaultVariants: { tone: "blue" },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}
