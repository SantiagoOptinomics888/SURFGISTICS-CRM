"use client";

interface DataToolbarProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onExport: () => void;
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
        <button
          onClick={onExport}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export CSV
        </button>
      </div>
    </div>
  );
}
