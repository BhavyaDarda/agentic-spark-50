import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none font-display text-xs font-black uppercase tracking-wide cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "brut brut-press bg-primary text-primary-foreground hover:bg-primary-dark",
        destructive: "brut brut-press bg-destructive text-destructive-foreground",
        outline:
          "brut brut-press bg-background text-foreground hover:bg-foreground hover:text-background",
        secondary: "brut brut-press bg-secondary text-secondary-foreground hover:bg-secondary-dark",
        brutal: "brut brut-press bg-foreground text-background hover:bg-accent",
        accent: "brut brut-press bg-accent text-accent-foreground",
        warning: "brut brut-press bg-secondary text-secondary-foreground brutal-shadow-secondary",
        ghost: "border-4 border-transparent hover:bg-secondary hover:text-secondary-foreground",
        link: "border-4 border-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-3 text-[11px]",
        lg: "h-14 px-8 text-base",
        icon: "h-11 w-11",
        "icon-sm": "h-9 w-9 [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);


export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
