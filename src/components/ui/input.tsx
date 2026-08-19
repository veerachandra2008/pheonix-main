import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-[#EEEEEE] placeholder:text-[#888888] selection:bg-[#00F5A0]/35 selection:text-[#EEEEEE] flex h-9 w-full min-w-0 rounded-[6px] border border-[rgba(255,255,255,0.1)] bg-[#1A1A1F] px-3 py-1 text-base text-[#EEEEEE] shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-[#00F5A0] focus-visible:ring-[#00F5A0]/30 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
