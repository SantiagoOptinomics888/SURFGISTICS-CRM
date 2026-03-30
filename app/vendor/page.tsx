"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ArtsPart, FtzLineItem, Inbond, TallyOut } from "@/lib/types";

const icons = {
  parts: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  ),
  ftz: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  ),
  inbond: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
    </svg>
  ),
  tally: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
};

export default function VendorDashboard() {
  const user = getAuth();

  const { data: arts, isLoading: l1 } = useQuery<ArtsPart[]>({ queryKey: ["arts_parts"], queryFn: () => api.get("/arts_part").then((r) => r.data) });
  const { data: ftz, isLoading: l2 } = useQuery<FtzLineItem[]>({ queryKey: ["ftz_line_items"], queryFn: () => api.get("/ftz_line_item").then((r) => r.data) });
  const { data: inbonds, isLoading: l3 } = useQuery<Inbond[]>({ queryKey: ["inbonds"], queryFn: () => api.get("/inbond").then((r) => r.data) });
  const { data: tally, isLoading: l4 } = useQuery<TallyOut[]>({ queryKey: ["tally_outs"], queryFn: () => api.get("/tally_out").then((r) => r.data) });

  const isLoading = l1 || l2 || l3 || l4;

  return (
    <div>
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-[#020617] tracking-tight">Dashboard</h1>
        <p className="text-sm text-[#64748B] mt-0.5">
          Account <span className="font-medium text-[#334155]">{user?.importer_account ?? "—"}</span>
        </p>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E2E8F0] rounded-lg p-5">
              <Skeleton className="h-3 w-20 mb-3" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Arts & Parts" value={arts?.length ?? 0} icon={icons.parts} />
          <StatCard label="FTZ Line Items" value={ftz?.length ?? 0} icon={icons.ftz} />
          <StatCard label="In-Bonds" value={inbonds?.length ?? 0} icon={icons.inbond} />
          <StatCard label="Tally Outs" value={tally?.length ?? 0} icon={icons.tally} />
        </div>
      )}

      {/* Recent activity placeholder */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-[#020617] mb-3 uppercase tracking-wider">Recent Activity</h2>
        <div className="bg-white border border-[#E2E8F0] rounded-lg divide-y divide-[#F1F5F9]">
          {[
            { label: "Arts & Parts", count: arts?.length ?? 0, href: "/vendor/arts-parts" },
            { label: "FTZ Line Items", count: ftz?.length ?? 0, href: "/vendor/ftz-line-items" },
            { label: "In-Bond Records", count: inbonds?.length ?? 0, href: "/vendor/inbonds" },
            { label: "Tally Out Records", count: tally?.length ?? 0, href: "/vendor/tally-out" },
          ].map(({ label, count, href }) => (
            <a
              key={label}
              href={href}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F8FAFC] transition-fast cursor-pointer group"
            >
              <span className="text-sm text-[#334155] font-medium">{label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#64748B] tabular-nums">{count} records</span>
                <svg className="w-3.5 h-3.5 text-[#CBD5E1] group-hover:text-[#0369A1] transition-fast" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
