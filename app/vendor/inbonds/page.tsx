"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import type { Inbond } from "@/lib/types";

export default function InbondsPage() {
  const { data, isLoading, error } = useQuery<Inbond[]>({
    queryKey: ["inbonds"],
    queryFn: () => api.get("/inbond").then((r) => r.data),
  });

  return (
    <div>
      <PageHeader title="In-Bond Records" subtitle={data ? `${data.length} records` : undefined} />

      {isLoading && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-[#F1F5F9]">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3.5 w-28" />
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
                  {["Container #", "Manifest #", "Part #", "Quantity", "Account", "Created"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {data.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-[#94A3B8]">No records found</td>
                  </tr>
                )}
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC] transition-fast">
                    <td className="px-5 py-3.5 font-semibold text-[#0F172A] font-mono text-xs">{row.container_number ?? "—"}</td>
                    <td className="px-5 py-3.5 text-[#475569] font-mono text-xs">{row.manifest_number ?? "—"}</td>
                    <td className="px-5 py-3.5 text-[#334155]">{row.part_number ?? "—"}</td>
                    <td className="px-5 py-3.5 text-[#334155] tabular-nums font-medium">{row.quantity ?? "—"}</td>
                    <td className="px-5 py-3.5 text-[#94A3B8] text-xs font-mono">{row.importer_account}</td>
                    <td className="px-5 py-3.5 text-[#94A3B8] text-xs">{new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
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
