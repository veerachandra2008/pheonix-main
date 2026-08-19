import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[6px] text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-[#00F5A0] focus-visible:ring-[#00F5A0]/30 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-[#00F5A0] text-[#0D2C1F] shadow-xs hover:bg-[#7C3AED] hover:text-[#EEEEEE]",
        destructive:
          "bg-destructive text-[#EEEEEE] shadow-xs hover:bg-[#7C3AED] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-[rgba(255,255,255,0.07)] bg-[#141416] text-[#EEEEEE] shadow-xs hover:border-[#7C3AED] hover:bg-[#7C3AED]",
        secondary:
          "bg-[#141416] text-[#EEEEEE] shadow-xs hover:bg-[#7C3AED]",
        ghost:
          "text-[#EEEEEE] hover:bg-[#7C3AED] hover:text-[#EEEEEE]",
        link: "text-[#00F5A0] underline-offset-4 hover:text-[#7C3AED] hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
