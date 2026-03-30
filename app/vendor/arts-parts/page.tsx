"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import type { ArtsPart } from "@/lib/types";

export default function ArtsPartsPage() {
  const { data, isLoading, error } = useQuery<ArtsPart[]>({
    queryKey: ["arts_parts"],
    queryFn: () => api.get("/arts_part").then((r) => r.data),
  });

  return (
    <div>
      <PageHeader
        title="Arts & Parts"
        subtitle={data ? `${data.length} records` : undefined}
      />

      {isLoading && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-[#F1F5F9]">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3.5 w-24 ml-auto" />
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
                  {["Part #", "Description", "Tariff", "Unit Price", "Duty Exempt", "Supplier", "Account"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-[#94A3B8]">
                      No records found
                    </td>
                  </tr>
                )}
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC] transition-fast">
                    <td className="px-5 py-3.5 font-semibold text-[#0F172A] whitespace-nowrap">{row.part_number}</td>
                    <td className="px-5 py-3.5 text-[#475569] max-w-[200px] truncate">{row.description ?? "—"}</td>
                    <td className="px-5 py-3.5 text-[#475569] font-mono text-xs">{row.tariff_number ?? "—"}</td>
                    <td className="px-5 py-3.5 text-[#334155] tabular-nums">{row.unit_price != null ? `$${row.unit_price}` : "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        row.duty_exempt
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-[#F1F5F9] text-[#64748B]"
                      }`}>
                        {row.duty_exempt ? "Exempt" : "Taxable"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#475569]">{row.supplier ?? "—"}</td>
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
