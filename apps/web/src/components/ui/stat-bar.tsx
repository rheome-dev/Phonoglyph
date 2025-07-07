import React from "react";
import { cn } from "@/lib/utils";

export function StatBar({ label, value, max = 5, color = "bg-lcd-green", className }: {
  label: string;
  value: number;
  max?: number;
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="w-20 text-xs font-bold text-lcd-green font-mono uppercase tracking-widest drop-shadow-lcd">{label}</span>
      <div className="flex gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-3 w-6 rounded-[2px] border border-lcd-green transition-all duration-200",
              i < value ? color : "bg-lcd-dark"
            )}
          />
        ))}
      </div>
    </div>
  );
} 