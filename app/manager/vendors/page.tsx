"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import type { VendorDetail } from "@/lib/types";

export default function VendorsPage() {
  const { data, isLoading, error } = useQuery<VendorDetail[]>({
    queryKey: ["vendors"],
    queryFn: () => api.get("/manager/vendors").then((r) => r.data),
  });

  return (
    <div>
      <PageHeader title="Vendors" subtitle={data ? `${data.length} vendors` : undefined} />

      {isLoading && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[#F1F5F9]">
              <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-3.5 w-16" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          Failed to load vendors.
        </div>
      )}

      {data && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="border-b border-[#E2E8F0] px-5 py-3 grid grid-cols-12 gap-4">
            {["Vendor", "Account", "Status", "Arts", "FTZ", "In-Bond", "Tally", "Last Updated", ""].map((h, i) => (
              <div key={i} className={`text-xs font-semibold text-[#64748B] uppercase tracking-wider ${
                i === 0 ? "col-span-2" : i === 1 ? "col-span-2" : i === 7 ? "col-span-2" : i === 8 ? "col-span-1 text-right" : "col-span-1"
              }`}>
                {h}
              </div>
            ))}
          </div>

          <div className="divide-y divide-[#F1F5F9]">
            {data.length === 0 && (
              <div className="px-5 py-12 text-center text-sm text-[#94A3B8]">No vendors found</div>
            )}
            {data.map((v) => {
              const initials = v.email.slice(0, 2).toUpperCase();
              return (
                <div key={v.id} className="px-5 py-4 grid grid-cols-12 gap-4 items-center hover:bg-[#F8FAFC] transition-fast">
                  {/* Vendor */}
                  <div className="col-span-2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-[#0369A1]">{initials}</span>
                    </div>
                    <span className="text-sm font-medium text-[#0F172A] truncate">{v.email}</span>
                  </div>
                  {/* Account */}
                  <div className="col-span-2 text-xs font-mono text-[#64748B]">{v.importer_account ?? "—"}</div>
                  {/* Status */}
                  <div className="col-span-1">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      v.is_active ? "bg-emerald-50 text-emerald-700" : "bg-[#F1F5F9] text-[#64748B]"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${v.is_active ? "bg-emerald-500" : "bg-[#94A3B8]"}`} />
                      {v.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {/* Counts */}
                  <div className="col-span-1 text-sm text-[#334155] tabular-nums">{v.record_counts.arts_parts}</div>
                  <div className="col-span-1 text-sm text-[#334155] tabular-nums">{v.record_counts.ftz_line_items}</div>
                  <div className="col-span-1 text-sm text-[#334155] tabular-nums">{v.record_counts.inbonds}</div>
                  <div className="col-span-1 text-sm text-[#334155] tabular-nums">{v.record_counts.tally_outs}</div>
                  {/* Last Updated */}
                  <div className="col-span-2 text-xs text-[#94A3B8]">
                    {v.last_updated
                      ? new Date(v.last_updated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "—"}
                  </div>
                  {/* Action */}
                  <div className="col-span-1 text-right">
                    <Link
                      href={`/manager/vendors/${v.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#0369A1] hover:text-[#0284C7] transition-fast cursor-pointer"
                    >
                      View
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
