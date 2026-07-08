"use client";

import { useEffect, useState } from "react";
import { cn, TIME_RANGES, type TimeRangeKey } from "@/lib/utils";

interface Props {
  value: TimeRangeKey;
  onChange: (v: TimeRangeKey) => void;
}

export function TimeFilter({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-md border border-border bg-card overflow-hidden">
      {TIME_RANGES.map((r) => (
        <button
          key={r.key}
          onClick={() => onChange(r.key)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium transition-colors border-r border-border last:border-r-0",
            value === r.key
              ? "bg-accent text-white"
              : "text-text-soft hover:bg-card-hover hover:text-text"
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}