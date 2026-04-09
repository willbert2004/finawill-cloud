import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.96]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-light hover:shadow-hover active:bg-primary-dark shadow-card",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80 hover:shadow-hover active:bg-destructive/100 shadow-card",
        outline: "border border-input bg-background hover:bg-primary/10 hover:text-primary hover:border-primary/40 active:bg-primary/20",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-light hover:shadow-hover active:bg-secondary-dark shadow-card",
        ghost: "hover:bg-primary/10 hover:text-primary active:bg-primary/20",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-light active:text-primary-dark",
        hero: "gradient-primary text-primary-foreground hover:scale-105 shadow-elegant hover:shadow-hover active:scale-[0.98] font-semibold",
        success: "bg-success text-success-foreground hover:bg-success/80 hover:shadow-hover active:bg-success/100 shadow-card",
        warning: "bg-warning text-warning-foreground hover:bg-warning/80 hover:shadow-hover active:bg-warning/100 shadow-card",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
        icon: "h-10 w-10",
        hero: "h-12 px-8 py-3 text-base font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
