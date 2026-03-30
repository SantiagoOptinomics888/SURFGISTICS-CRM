"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import type { FtzLineItem } from "@/lib/types";

export default function FtzLineItemsPage() {
  const { data, isLoading, error } = useQuery<FtzLineItem[]>({
    queryKey: ["ftz_line_items"],
    queryFn: () => api.get("/ftz_line_item").then((r) => r.data),
  });

  return (
    <div>
      <PageHeader title="FTZ Line Items" subtitle={data ? `${data.length} records` : undefined} />

      {isLoading && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-[#F1F5F9]">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3.5 w-16 ml-auto" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          Failed to load data.
        </div>
      )}

      {data && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  {["Batch ID", "Part #", "Description", "Qty", "Unit Value", "Status", "Account"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-[#94A3B8]">No records found</td>
                  </tr>
                )}
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC] transition-fast">
                    <td className="px-5 py-3.5 font-mono text-xs text-[#94A3B8]">{row.batch_reference_id.slice(0, 8)}…</td>
                    <td className="px-5 py-3.5 font-semibold text-[#0F172A]">{row.part_number}</td>
                    <td className="px-5 py-3.5 text-[#475569] max-w-[180px] truncate">{row.description ?? "—"}</td>
                    <td className="px-5 py-3.5 text-[#334155] tabular-nums font-medium">{row.quantity}</td>
                    <td className="px-5 py-3.5 text-[#334155] tabular-nums">{row.unit_value != null ? `$${row.unit_value}` : "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        row.concurrence
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${row.concurrence ? "bg-emerald-500" : "bg-amber-500"}`} />
                        {row.concurrence ? "Approved" : "Pending"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#94A3B8] text-xs font-mono">{row.importer_account}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
