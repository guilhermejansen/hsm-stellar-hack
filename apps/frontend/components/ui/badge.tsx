import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Corporate status variants
        success: "border-transparent bg-success-100 text-success-800 hover:bg-success-200",
        warning: "border-transparent bg-warning-100 text-warning-800 hover:bg-warning-200",
        error: "border-transparent bg-error-100 text-error-800 hover:bg-error-200",
        pending: "border-transparent bg-corporate-100 text-corporate-800 hover:bg-corporate-200",
        // Guardian role variants
        ceo: "border-transparent bg-stellar-100 text-stellar-800 hover:bg-stellar-200",
        cfo: "border-transparent bg-success-100 text-success-800 hover:bg-success-200",
        cto: "border-transparent bg-warning-100 text-warning-800 hover:bg-warning-200",
        // Wallet type variants
        hot: "border-transparent bg-warning-100 text-warning-800 hover:bg-warning-200",
        cold: "border-transparent bg-stellar-100 text-stellar-800 hover:bg-stellar-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }