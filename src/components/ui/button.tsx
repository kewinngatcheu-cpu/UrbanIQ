import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-accent text-white shadow-[0_6px_20px_-6px_rgba(67,142,212,0.6)] hover:bg-[#3a82c6] hover:shadow-[0_8px_24px_-6px_rgba(67,142,212,0.7)]",
        secondary: "bg-white text-ink border border-line shadow-soft hover:border-cloud hover:bg-snow",
        soft: "bg-mist text-accent-strong hover:bg-sky",
        ghost: "text-muted hover:bg-fog hover:text-ink",
        danger: "bg-rose text-rose-ink hover:bg-[#ffe3e6]",
        link: "text-accent-strong underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-[15px] rounded-2xl",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = "Button";
