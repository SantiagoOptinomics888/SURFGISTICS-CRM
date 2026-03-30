"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import type { ArtsPart, FtzLineItem, Inbond, TallyOut } from "@/lib/types";

export default function VendorDashboard() {
  const user = getAuth();

  const { data: arts, isLoading: l1 } = useQuery<ArtsPart[]>({
    queryKey: ["arts_parts"],
    queryFn: () => api.get("/arts_part").then((r) => r.data),
  });
  const { data: ftz, isLoading: l2 } = useQuery<FtzLineItem[]>({
    queryKey: ["ftz_line_items"],
    queryFn: () => api.get("/ftz_line_item").then((r) => r.data),
  });
  const { data: inbonds, isLoading: l3 } = useQuery<Inbond[]>({
    queryKey: ["inbonds"],
    queryFn: () => api.get("/inbond").then((r) => r.data),
  });
  const { data: tally, isLoading: l4 } = useQuery<TallyOut[]>({
    queryKey: ["tally_outs"],
    queryFn: () => api.get("/tally_out").then((r) => r.data),
  });

  const isLoading = l1 || l2 || l3 || l4;

  // Derived metrics from Arts & Parts
  const totalPartsValue = arts?.reduce((s, r) => s + (r.value ?? 0), 0) ?? 0;
  const dutyExempt = arts?.filter((r) => r.is_duty_exempt).length ?? 0;
  const ftzApproved = ftz?.filter((r) => r.concurrence === true).length ?? 0;
  const ftzPending = ftz?.filter((r) => r.concurrence !== true).length ?? 0;

  return (
    <div>
      {/* Vendor identity / tracking code */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-xl font-semibold text-[#020617] tracking-tight">Dashboard</h1>
          <p className="text-sm text-[#64748B] mt-0.5">{user?.email}</p>
        </div>
        {user?.importer_account && (
          <div className="text-right">
            <p className="text-xs text-[#94A3B8] uppercase tracking-widest font-medium mb-1">Importer Code</p>
            <div className="inline-flex items-center gap-2 bg-[#0F172A] text-white px-3 py-1.5 rounded-md">
              <svg className="w-3.5 h-3.5 text-[#0EA5E9]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5-3.9 19.5m-2.1-19.5-3.9 19.5" />
              </svg>
              <span className="font-mono font-semibold text-sm tracking-wider">{user.importer_account}</span>
            </div>
          </div>
        )}
      </div>

      {/* Record count cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E2E8F0] rounded-lg p-5">
              <Skeleton className="h-3 w-20 mb-3" /><Skeleton className="h-8 w-10" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
          {[
            { label: "Arts & Parts", value: arts?.length ?? 0, sub: `$${totalPartsValue.toLocaleString()} value`, href: "/vendor/arts-parts", color: "text-[#0369A1]" },
            { label: "FTZ Line Items", value: ftz?.length ?? 0, sub: `${ftzApproved} approved · ${ftzPending} pending`, href: "/vendor/ftz-line-items", color: "text-[#0369A1]" },
            { label: "In-Bonds", value: inbonds?.length ?? 0, sub: `${new Set(inbonds?.map(r => r.container).filter(Boolean)).size} containers`, href: "/vendor/inbonds", color: "text-[#0369A1]" },
            { label: "Tally Out", value: tally?.length ?? 0, sub: `${new Set(tally?.map(r => r.delivery_order_no).filter(Boolean)).size} delivery orders`, href: "/vendor/tally-out", color: "text-[#0369A1]" },
          ].map(({ label, value, sub, href, color }) => (
            <a key={label} href={href} className="bg-white border border-[#E2E8F0] rounded-lg p-5 hover:border-[#0369A1] hover:shadow-sm transition-fast cursor-pointer group block">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{label}</span>
                <svg className="w-3.5 h-3.5 text-[#CBD5E1] group-hover:text-[#0369A1] transition-fast" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </div>
              <p className={`text-3xl font-semibold tabular-nums ${color}`}>{value}</p>
              <p className="text-xs text-[#94A3B8] mt-1.5">{sub}</p>
            </a>
          ))}
        </div>
      )}

      {/* Arts & Parts quick view */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#020617] uppercase tracking-wider">Recent Arts & Parts</h2>
          <a href="/vendor/arts-parts" className="text-xs text-[#0369A1] hover:text-[#0284C7] font-medium transition-fast">View all →</a>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-3.5 border-b border-[#F1F5F9]">
                <Skeleton className="h-3.5 w-20" /><Skeleton className="h-3.5 w-44" /><Skeleton className="h-3.5 w-20 ml-auto" />
              </div>
            ))
          ) : arts && arts.length > 0 ? (
            <>
              <div className="grid grid-cols-5 gap-4 px-5 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                {["Part #", "Description", "Country", "Unit Price", "Duty"].map(h => (
                  <span key={h} className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{h}</span>
                ))}
              </div>
              {arts.slice(0, 5).map((row) => (
                <div key={row.id} className="grid grid-cols-5 gap-4 px-5 py-3.5 border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-fast">
                  <span className="text-sm font-semibold text-[#0F172A]">{row.part_number ?? "—"}</span>
                  <span className="text-sm text-[#475569] truncate">{row.description ?? "—"}</span>
                  <span className="text-sm text-[#334155]">{row.country ?? "—"}</span>
                  <span className="text-sm text-[#334155] tabular-nums">{row.unit_price != null ? `$${row.unit_price}` : "—"}</span>
                  <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full self-center w-fit ${
                    row.is_duty_exempt ? "bg-emerald-50 text-emerald-700" : "bg-[#F1F5F9] text-[#64748B]"
                  }`}>
                    {row.is_duty_exempt === null ? "—" : row.is_duty_exempt ? "Exempt" : "Taxable"}
                  </span>
                </div>
              ))}
              {arts.length > 5 && (
                <div className="px-5 py-3 text-center">
                  <a href="/vendor/arts-parts" className="text-xs text-[#0369A1] hover:text-[#0284C7] font-medium transition-fast">
                    +{arts.length - 5} more parts →
                  </a>
                </div>
              )}
            </>
          ) : (
            <p className="px-5 py-8 text-sm text-center text-[#94A3B8]">No arts & parts records yet.</p>
          )}
        </div>
      </div>

      {/* FTZ status summary */}
      {ftz && ftz.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#020617] uppercase tracking-wider">FTZ Concurrence Status</h2>
            <a href="/vendor/ftz-line-items" className="text-xs text-[#0369A1] hover:text-[#0284C7] font-medium transition-fast">View all →</a>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 flex items-center gap-8">
            <div>
              <p className="text-xs text-[#64748B] uppercase tracking-wider font-medium">Approved</p>
              <p className="text-2xl font-semibold text-emerald-600 tabular-nums mt-0.5">{ftzApproved}</p>
            </div>
            <div className="w-px h-10 bg-[#E2E8F0]" />
            <div>
              <p className="text-xs text-[#64748B] uppercase tracking-wider font-medium">Pending Review</p>
              <p className="text-2xl font-semibold text-amber-600 tabular-nums mt-0.5">{ftzPending}</p>
            </div>
            <div className="w-px h-10 bg-[#E2E8F0]" />
            <div>
              <p className="text-xs text-[#64748B] uppercase tracking-wider font-medium">Approval Rate</p>
              <p className="text-2xl font-semibold text-[#020617] tabular-nums mt-0.5">
                {ftz.length > 0 ? Math.round((ftzApproved / ftz.length) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
