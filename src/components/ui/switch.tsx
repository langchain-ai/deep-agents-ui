"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      style={{
        display: "inline-flex",
        height: "20px",
        width: "36px",
        alignItems: "center",
        borderRadius: "9999px",
        border: "1px solid #d1d5db",
        backgroundColor: "var(--color-border)",
        cursor: "pointer",
        transition: "background-color 0.2s",
      }}
      data-state-styles={{
        checked: {
          backgroundColor: "var(--color-primary)",
        },
      }}
      className={cn(
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:!bg-[var(--color-primary)]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        style={{
          display: "block",
          width: "16px",
          height: "16px",
          borderRadius: "9999px",
          backgroundColor: "white",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
          transition: "transform 0.2s",
          transform: "translateX(1px)",
        }}
        className="data-[state=checked]:!translate-x-[17px]"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
