"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { DataToolbar } from "@/components/ui/data-toolbar";
import { useDateFilter } from "@/lib/use-date-filter";
import { CsvUpload } from "@/components/ui/csv-upload";
import type { ArtsPart } from "@/lib/types";

const fmt = (n: number | null, prefix = "") =>
  n != null ? `${prefix}${n.toLocaleString()}` : "—";

export default function ArtsPartsPage() {
  const { data, isLoading, error } = useQuery<ArtsPart[]>({
    queryKey: ["arts_parts"],
    queryFn: () => api.get("/parts").then((r) => r.data),
  });

  const { filtered, dateFrom, dateTo, setDateFrom, setDateTo } = useDateFilter(data);

  const totalValue = filtered?.reduce((s, r) => s + (r.value ?? 0), 0) ?? 0;
  const exemptCount = filtered?.filter((r) => r.is_duty_exempt).length ?? 0;

  return (
    <div>
      <PageHeader title="Parts" subtitle={filtered ? `${filtered.length} parts · $${totalValue.toLocaleString()} total value` : undefined} />

      <CsvUpload resourceType="parts" label="Parts" invalidateKeys={[["arts_parts"]]} />

      {/* Summary bar */}
      {filtered && filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total Parts", value: filtered.length },
            { label: "Duty Exempt", value: exemptCount },
            { label: "Total Value", value: `$${totalValue.toLocaleString()}` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-[#E2E8F0] rounded-lg px-4 py-3">
              <p className="text-xs text-[#64748B] font-medium uppercase tracking-wider">{label}</p>
              <p className="text-xl font-semibold text-[#020617] mt-0.5 tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar — vendors don't get an export button on Parts (admin-only) */}
      <DataToolbar
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        count={filtered?.length}
      />

      {isLoading && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 px-5 py-3.5 border-b border-[#F1F5F9]">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-44" />
              <Skeleton className="h-3.5 w-28 ml-auto" />
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

      {filtered && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  {["Part #", "Description", "Country", "Tariff", "Unit Price", "Value", "Units", "Duty", "Supplier", "Filer"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-5 py-12 text-center text-sm text-[#94A3B8]">No records found</td>
                  </tr>
                )}
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC] transition-fast">
                    <td className="px-4 py-3 font-semibold text-[#0F172A] whitespace-nowrap">{row.part_number ?? "—"}</td>
                    <td className="px-4 py-3 text-[#475569] max-w-[180px] truncate">{row.description ?? "—"}</td>
                    <td className="px-4 py-3">
                      {row.country ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#334155]">
                          <span className="w-4 text-center">{countryFlag(row.country)}</span>
                          {row.country}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{row.tariff_num ?? "—"}</td>
                    <td className="px-4 py-3 text-[#334155] tabular-nums">{fmt(row.unit_price, "$")}</td>
                    <td className="px-4 py-3 text-[#334155] tabular-nums font-medium">{fmt(row.value, "$")}</td>
                    <td className="px-4 py-3 text-[#334155] tabular-nums">{fmt(row.units_shipped)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                        row.is_duty_exempt
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-[#F1F5F9] text-[#64748B]"
                      }`}>
                        {row.is_duty_exempt === null ? "—" : row.is_duty_exempt ? "Exempt" : "Taxable"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#475569] text-xs">{row.supplier_id ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#94A3B8]">{row.filer_code ?? "—"}</td>
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

function countryFlag(code: string): string {
  // Convert a 2-letter ISO code to its flag emoji. Returns "" for non-2-letter
  // strings (e.g. "USA", "PRC") so the table doesn't render the code twice.
  if (!code || code.length !== 2) return "";
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "";
  const codePoints = [...upper].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}
