
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-button hover:bg-primary/90 hover:shadow-[0_6px_20px_hsl(217_91%_50%/0.4)] active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-border bg-background text-foreground hover:bg-muted hover:border-primary/30 active:scale-[0.98]",
        secondary:
          "bg-navy-800 text-white hover:bg-navy-700 active:scale-[0.98]",
        ghost:
          "hover:bg-muted hover:text-foreground",
        link:
          "text-primary underline-offset-4 hover:underline p-0 h-auto",
        premium:
          "bg-amber-500 text-white hover:bg-amber-600 shadow-button active:scale-[0.98]",
        glass:
          "bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm",
        success:
          "bg-success text-success-foreground hover:bg-success/90",
        warning:
          "bg-warning text-warning-foreground hover:bg-warning/90",
        gradient:
          "bg-gradient-primary text-white shadow-button hover:shadow-glow active:scale-[0.98]",
        "outline-navy":
          "border border-white/20 bg-transparent text-white hover:bg-white/10 active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-5 py-2 text-sm rounded-lg",
        sm: "h-8 px-4 text-xs rounded-md",
        lg: "h-12 px-7 text-base rounded-xl",
        xl: "h-14 px-10 text-base rounded-xl",
        icon: "h-10 w-10 rounded-lg",
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
