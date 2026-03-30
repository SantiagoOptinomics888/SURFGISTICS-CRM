"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import type { TallyOut } from "@/lib/types";

export default function TallyOutPage() {
  const { data, isLoading, error } = useQuery<TallyOut[]>({
    queryKey: ["tally_outs"],
    queryFn: () => api.get("/tally_out").then((r) => r.data),
  });

  const orders = new Set(data?.map((r) => r.delivery_order_no).filter(Boolean)).size;
  const totalQty = data?.reduce((s, r) => s + (r.quantity_ordered ?? 0), 0) ?? 0;
  const totalValue = data?.reduce((s, r) => s + ((r.quantity_ordered ?? 0) * (r.price_per_unit ?? 0)), 0) ?? 0;

  return (
    <div>
      <PageHeader title="Tally Out" subtitle={data ? `${data.length} items across ${orders} delivery orders` : undefined} />

      {data && data.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-[#E2E8F0] rounded-lg px-4 py-3">
            <p className="text-xs text-[#64748B] font-medium uppercase tracking-wider">Delivery Orders</p>
            <p className="text-xl font-semibold text-[#020617] mt-0.5 tabular-nums">{orders}</p>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-lg px-4 py-3">
            <p className="text-xs text-[#64748B] font-medium uppercase tracking-wider">Total Units</p>
            <p className="text-xl font-semibold text-[#020617] mt-0.5 tabular-nums">{totalQty.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-lg px-4 py-3">
            <p className="text-xs text-[#64748B] font-medium uppercase tracking-wider">Total Value</p>
            <p className="text-xl font-semibold text-[#020617] mt-0.5 tabular-nums">${totalValue.toLocaleString()}</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 px-5 py-3.5 border-b border-[#F1F5F9]">
              <Skeleton className="h-3.5 w-28" /><Skeleton className="h-3.5 w-24" /><Skeleton className="h-3.5 w-16 ml-auto" />
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

      {data && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  {["Delivery Order", "Item Code", "Qty", "Unit Price", "Total", "F/D", "Doc Code", "Operator", "Date"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {data.length === 0 && (
                  <tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-[#94A3B8]">No records found</td></tr>
                )}
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC] transition-fast">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0F172A]">{row.delivery_order_no ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold text-[#334155]">{row.item_code ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-[#334155] font-medium">{row.quantity_ordered ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-[#334155]">{row.price_per_unit != null ? `$${row.price_per_unit}` : "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-[#334155] font-medium">
                      {row.quantity_ordered != null && row.price_per_unit != null
                        ? `$${(row.quantity_ordered * row.price_per_unit).toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {row.foreign_domestic_ind ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          row.foreign_domestic_ind === "D" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                        }`}>
                          {row.foreign_domestic_ind === "D" ? "Domestic" : "Foreign"}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{row.doc_code_3461_7512 ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-[#475569]">{row.operator_id ?? "—"}</td>
                    <td className="px-4 py-3 text-[#94A3B8] text-xs">{new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
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
