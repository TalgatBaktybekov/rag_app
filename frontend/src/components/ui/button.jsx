// components/ui/button.jsx
import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 disabled:pointer-events-none disabled:opacity-50 hover:scale-105 active:scale-95",
  {
    variants: {
      variant: {
        default: "glass-button text-white shadow-lg hover:shadow-xl",
        destructive: "bg-red-500 text-white shadow-lg hover:bg-red-600 hover:shadow-xl",
        outline: "border border-white/20 bg-white/10 shadow-md hover:bg-white/20 hover:border-white/30 text-white backdrop-blur-md",
        secondary: "bg-white/10 text-white shadow-md hover:bg-white/20 backdrop-blur-md",
        ghost: "hover:bg-white/10 text-white/80 hover:text-white",
        link: "text-blue-400 underline-offset-4 hover:underline hover:text-blue-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

