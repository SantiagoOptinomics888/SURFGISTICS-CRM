"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { DataToolbar } from "@/components/ui/data-toolbar";
import { useDateFilter } from "@/lib/use-date-filter";
import { exportToCsv } from "@/lib/export";
import { CsvUpload } from "@/components/ui/csv-upload";
import type { HblGroup, FtzLineItem } from "@/lib/types";

export default function FtzLineItemsPage() {
  const { data: groups, isLoading, error } = useQuery<HblGroup[]>({
    queryKey: ["ftz_grouped"],
    queryFn: () => api.get("/ftz_line_item/grouped").then((r) => r.data),
  });

  // Flatten for stats and date filtering
  const allItems = groups?.flatMap((g) => g.line_items) ?? [];
  const { filtered, dateFrom, dateTo, setDateFrom, setDateTo } = useDateFilter(allItems.length > 0 ? allItems : undefined);

  const approved = filtered?.filter((r) => r.concurrence === true).length ?? 0;
  const pending = filtered?.filter((r) => r.concurrence !== true).length ?? 0;
  const totalValue = filtered?.reduce((s, r) => s + (r.line_value ?? 0), 0) ?? 0;

  // Re-group filtered items by HBL
  const filteredGroups = filtered
    ? Object.entries(
        filtered.reduce<Record<string, FtzLineItem[]>>((acc, item) => {
          const key = item.hbl || "(No HBL)";
          if (!acc[key]) acc[key] = [];
          acc[key].push(item);
          return acc;
        }, {}),
      )
        .map(([hbl, items]) => ({
          hbl,
          line_count: items.length,
          total_pieces: items.reduce((s, r) => s + (r.piece_count ?? 0), 0),
          total_value: items.reduce((s, r) => s + (r.line_value ?? 0), 0),
          pending_count: items.filter((r) => !r.concurrence).length,
          line_items: items,
        }))
        .sort((a, b) => a.hbl.localeCompare(b.hbl))
    : null;

  const handleExport = () => {
    if (!filtered) return;
    exportToCsv("ftz_line_items.csv", filtered, [
      { key: "hbl", label: "HBL" },
      { key: "country_origin", label: "Country_Origin" },
      { key: "part", label: "Part" },
      { key: "piece_count", label: "Piece_Count" },
      { key: "unit_price", label: "Unit_Price" },
      { key: "line_value", label: "Line_Value" },
      { key: "weight_kg", label: "Weight(KG)" },
      { key: "hts_qty_1", label: "HTS_QTY_1" },
      { key: "hts_qty_2", label: "HTS_QTY_2" },
      { key: "line_charge", label: "Line_Charge" },
      { key: "zone_status", label: "Zone_Status" },
      { key: "lot_number", label: "Lot_Number" },
      { key: "remarks", label: "Remarks" },
      { key: "concurrence", label: "Concurrence" },
    ]);
  };

  return (
    <div>
      <PageHeader title="Tally In" subtitle={filtered ? `${filtered.length} items across ${filteredGroups?.length ?? 0} shipments` : undefined} />

      <CsvUpload resourceType="ftz_line_item" label="Tally In" invalidateKeys={[["ftz_grouped"]]} />

      {filtered && filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-[#E2E8F0] rounded-lg px-4 py-3">
            <p className="text-xs text-[#64748B] font-medium uppercase tracking-wider">Approved</p>
            <p className="text-xl font-semibold text-emerald-600 mt-0.5 tabular-nums">{approved}</p>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-lg px-4 py-3">
            <p className="text-xs text-[#64748B] font-medium uppercase tracking-wider">Pending</p>
            <p className="text-xl font-semibold text-amber-600 mt-0.5 tabular-nums">{pending}</p>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-lg px-4 py-3">
            <p className="text-xs text-[#64748B] font-medium uppercase tracking-wider">Total Line Value</p>
            <p className="text-xl font-semibold text-[#020617] mt-0.5 tabular-nums">${totalValue.toLocaleString()}</p>
          </div>
        </div>
      )}

      <DataToolbar
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onExport={handleExport}
        count={filtered?.length}
      />

      {isLoading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E2E8F0] rounded-lg p-4">
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
          Failed to load data.
        </div>
      )}

      {filteredGroups && <HblAccordion groups={filteredGroups} />}
    </div>
  );
}

function HblAccordion({ groups }: { groups: { hbl: string; line_count: number; total_pieces: number; total_value: number; pending_count: number; line_items: FtzLineItem[] }[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleHbl(hbl: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(hbl)) next.delete(hbl);
      else next.add(hbl);
      return next;
    });
  }

  if (groups.length === 0) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-lg px-5 py-12 text-center text-sm text-[#94A3B8]">
        No records found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const isOpen = expanded.has(group.hbl);

        return (
          <div key={group.hbl} className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
            <button
              onClick={() => toggleHbl(group.hbl)}
              className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors cursor-pointer"
            >
              <svg
                className={`w-4 h-4 text-[#94A3B8] shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}
                fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
              <span className="font-mono text-sm font-semibold text-[#0F172A] min-w-0 flex-1 text-left">{group.hbl}</span>
              <div className="flex items-center gap-4 shrink-0 text-xs">
                <span className="text-[#64748B]">
                  <span className="font-semibold text-[#334155]">{group.line_count}</span> line{group.line_count !== 1 ? "s" : ""}
                </span>
                <span className="text-[#64748B]">
                  <span className="font-semibold text-[#334155] tabular-nums">{group.total_pieces.toLocaleString()}</span> pcs
                </span>
                <span className="text-[#64748B]">
                  <span className="font-semibold text-[#334155] tabular-nums">${group.total_value.toLocaleString()}</span>
                </span>
                {group.pending_count > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {group.pending_count} pending
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    All approved
                  </span>
                )}
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-[#E2E8F0]">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                        {["Part", "Origin", "Tariff", "Qty", "Unit Price", "Line Value", "Weight", "Zone", "Status"].map((h) => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {group.line_items.map((row) => (
                        <tr key={row.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="px-4 py-3 font-semibold text-[#0F172A]">{row.part ?? "—"}</td>
                          <td className="px-4 py-3 text-xs font-medium text-[#334155]">{row.country_origin ?? "—"}</td>
                          <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{row.tariff_number ?? "—"}</td>
                          <td className="px-4 py-3 tabular-nums text-[#334155] font-medium">{row.piece_count ?? "—"}</td>
                          <td className="px-4 py-3 tabular-nums text-[#334155]">{row.unit_price != null ? `$${row.unit_price}` : "—"}</td>
                          <td className="px-4 py-3 tabular-nums text-[#334155] font-medium">{row.line_value != null ? `$${row.line_value.toLocaleString()}` : "—"}</td>
                          <td className="px-4 py-3 tabular-nums text-[#64748B] text-xs">{row.weight_kg != null ? `${row.weight_kg} kg` : "—"}</td>
                          <td className="px-4 py-3">
                            {row.zone_status ? (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                row.zone_status === "P" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                              }`}>{row.zone_status === "P" ? "Privileged" : "Foreign"}</span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                              row.concurrence ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${row.concurrence ? "bg-emerald-500" : "bg-amber-500"}`} />
                              {row.concurrence ? "Approved" : "Pending"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
