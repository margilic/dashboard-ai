"use client";

import { useEffect, useRef, useState } from "react";
import { cn, SYMBOL_PRESETS } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function SymbolPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setInput(value), [value]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const upper = input.toUpperCase().trim();

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center rounded-md border border-border bg-card overflow-hidden">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && upper) {
              onChange(upper);
              setOpen(false);
            }
          }}
          placeholder="BTCUSDT"
          className="px-3 py-1.5 text-sm bg-transparent outline-none w-32 font-mono"
          spellCheck={false}
        />
        <button
          onClick={() => setOpen((o) => !o)}
          className="px-2 py-1.5 border-l border-border hover:bg-card-hover transition-colors text-xs text-text-muted"
        >
          ▼
        </button>
      </div>
      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card shadow-xl fade-in">
          <div className="max-h-48 overflow-y-auto">
            {SYMBOL_PRESETS.filter((s) => s.includes(upper)).map((s) => (
              <button
                key={s}
                onClick={() => {
                  onChange(s);
                  setInput(s);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-sm font-mono hover:bg-card-hover transition-colors",
                  value === s && "text-accent"
                )}
              >
                {s}
              </button>
            ))}
            {upper && !SYMBOL_PRESETS.includes(upper as typeof SYMBOL_PRESETS[number]) && (
              <button
                onClick={() => {
                  onChange(upper);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-sm font-mono hover:bg-card-hover text-accent"
              >
                {upper} (custom)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}