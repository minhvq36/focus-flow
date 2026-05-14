import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border transition-all outline-none",
        "data-[size=default]:h-[18.4px] data-[size=default]:w-[32px]",
        "data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-600",
        "data-[state=unchecked]:bg-white data-[state=unchecked]:border-border",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-md transition-transform",
          "group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3",
          "group-data-[state=checked]/switch:translate-x-[calc(100%-2px)]",
          "group-data-[state=unchecked]/switch:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
