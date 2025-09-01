
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 transform hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-primary-foreground shadow-button hover:shadow-glow hover:shadow-button/50",
        destructive: "bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground shadow-button hover:shadow-red-500/50",
        outline: "border-2 border-border bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary shadow-card hover:shadow-button",
        secondary: "bg-gradient-secondary text-secondary-foreground shadow-button hover:shadow-glow",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:shadow-card",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-glow",
        premium: "bg-gradient-hero text-white shadow-premium hover:shadow-glow hover:scale-105 relative before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700",
        glass: "bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-xl shadow-glass",
        success: "bg-gradient-to-r from-success to-success/80 text-success-foreground shadow-button hover:shadow-green-500/50",
        warning: "bg-gradient-to-r from-warning to-warning/80 text-warning-foreground shadow-button hover:shadow-amber-500/50",
        gradient: "bg-gradient-hero text-white shadow-premium hover:shadow-glow animate-glow-pulse",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-lg px-4 text-xs font-medium",
        lg: "h-14 rounded-2xl px-8 text-base font-bold",
        xl: "h-16 rounded-2xl px-12 text-lg font-bold",
        icon: "h-11 w-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
