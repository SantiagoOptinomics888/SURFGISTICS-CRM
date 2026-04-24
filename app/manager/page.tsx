"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ManagerStats } from "@/lib/types";

const icons = {
  vendors: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  ),
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

export default function ManagerDashboard() {
  const { data, isLoading } = useQuery<ManagerStats>({
    queryKey: ["manager_stats"],
    queryFn: () => api.get("/manager/stats").then((r) => r.data),
  });

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-[#020617] tracking-tight">Overview</h1>
        <div className="flex items-center gap-3 mt-0.5">
          <p className="text-sm text-[#64748B]">Global operations summary</p>
          {data?.last_updated && (
            <span className="text-xs text-[#94A3B8] border border-[#E2E8F0] rounded px-2 py-0.5">
              Last updated {new Date(data.last_updated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E2E8F0] rounded-lg p-5">
              <Skeleton className="h-3 w-16 mb-3" />
              <Skeleton className="h-8 w-10" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard label="Vendors" value={data?.total_vendors ?? 0} icon={icons.vendors} />
          <StatCard label="Parts" value={data?.total_arts_parts ?? 0} icon={icons.parts} />
          <StatCard label="Tally In" value={data?.total_ftz_line_items ?? 0} icon={icons.ftz} />
          <StatCard label="In-Bonds" value={data?.total_inbonds ?? 0} icon={icons.inbond} />
          <StatCard label="Tally Outs" value={data?.total_tally_outs ?? 0} icon={icons.tally} />
        </div>
      )}

      {/* Quick links */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-[#020617] mb-3 uppercase tracking-wider">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href="/manager/vendors" className="bg-white border border-[#E2E8F0] rounded-lg px-5 py-4 flex items-center justify-between hover:border-[#0369A1] hover:shadow-sm transition-fast cursor-pointer group">
            <div>
              <p className="text-sm font-semibold text-[#020617]">Vendor Management</p>
              <p className="text-xs text-[#64748B] mt-0.5">View all vendors and their records</p>
            </div>
            <svg className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#0369A1] transition-fast" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </a>
          <div className="bg-white border border-[#E2E8F0] rounded-lg px-5 py-4 flex items-center justify-between opacity-50">
            <div>
              <p className="text-sm font-semibold text-[#020617]">Reports</p>
              <p className="text-xs text-[#64748B] mt-0.5">Coming soon</p>
            </div>
            <svg className="w-4 h-4 text-[#CBD5E1]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
