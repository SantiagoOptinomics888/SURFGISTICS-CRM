"use client";

import { useEffect, useRef, useState } from "react";
import type { ExportFormat } from "@/lib/export";

interface DataToolbarProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onExport?: (format: ExportFormat) => void;
  count?: number;
}

export function DataToolbar({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onExport,
  count,
}: DataToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-[#64748B] uppercase tracking-wider">From</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-sm text-[#334155] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-[#64748B] uppercase tracking-wider">To</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-sm text-[#334155] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>
      {(dateFrom || dateTo) && (
        <button
          onClick={() => { onDateFromChange(""); onDateToChange(""); }}
          className="text-xs text-[#64748B] hover:text-[#334155] underline underline-offset-2 cursor-pointer"
        >
          Clear
        </button>
      )}
      <div className="ml-auto flex items-center gap-3">
        {count != null && (
          <span className="text-xs text-[#94A3B8]">{count} record{count !== 1 ? "s" : ""}</span>
        )}
        {onExport && <ExportMenu onExport={onExport} />}
      </div>
    </div>
  );
}

export function ExportMenu({
  onExport,
  label = "Export",
}: {
  onExport: (format: ExportFormat) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        {label}
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 z-10 min-w-[140px] bg-white border border-[#E2E8F0] rounded-md shadow-lg overflow-hidden">
          <button
            onClick={() => { onExport("csv"); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-xs font-medium text-[#334155] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          >
            Export as CSV
          </button>
          <button
            onClick={() => { onExport("xlsx"); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-xs font-medium text-[#334155] hover:bg-[#F8FAFC] transition-colors cursor-pointer border-t border-[#F1F5F9]"
          >
            Export as Excel
          </button>
        </div>
      )}
    </div>
  );
}
