"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ManagerStats, RecentActivityItem } from "@/lib/types";

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

const activityTypeLabels: Record<string, { label: string; color: string }> = {
  arts_part: { label: "Part", color: "bg-blue-50 text-blue-700" },
  ftz_line_item: { label: "Tally In", color: "bg-amber-50 text-amber-700" },
  inbond: { label: "In-Bond", color: "bg-purple-50 text-purple-700" },
  tally_out: { label: "Tally Out", color: "bg-green-50 text-green-700" },
};

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ManagerDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<ManagerStats>({
    queryKey: ["manager_stats"],
    queryFn: () => api.get("/manager/stats").then((r) => r.data),
  });

  const { data: activity, isLoading: activityLoading } = useQuery<RecentActivityItem[]>({
    queryKey: ["manager_recent_activity"],
    queryFn: () => api.get("/manager/recent-activity").then((r) => r.data),
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-[#020617] tracking-tight">Overview</h1>
        <div className="flex items-center gap-3 mt-0.5">
          <p className="text-sm text-[#64748B]">Global operations summary</p>
          {stats?.last_updated && (
            <span className="text-xs text-[#94A3B8] border border-[#E2E8F0] rounded px-2 py-0.5">
              Last updated {new Date(stats.last_updated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      {/* Highlight cards */}
      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E2E8F0] rounded-lg p-6">
              <Skeleton className="h-3 w-20 mb-3" />
              <Skeleton className="h-10 w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Total Records</span>
            <p className="text-4xl font-semibold text-[#020617] tabular-nums mt-2">{stats?.total_records ?? 0}</p>
            <p className="text-xs text-[#94A3B8] mt-1">Across all record types</p>
          </div>
          <div className={`bg-white border rounded-lg p-6 ${
            (stats?.pending_concurrences ?? 0) > 0
              ? "border-amber-300 ring-1 ring-amber-200/50"
              : "border-[#E2E8F0]"
          }`}>
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Pending Concurrences</span>
            <p className={`text-4xl font-semibold tabular-nums mt-2 ${
              (stats?.pending_concurrences ?? 0) > 0 ? "text-amber-600" : "text-[#020617]"
            }`}>{stats?.pending_concurrences ?? 0}</p>
            <p className="text-xs text-[#94A3B8] mt-1">FTZ line items awaiting review</p>
          </div>
        </div>
      )}

      {/* Record breakdown */}
      {statsLoading ? (
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
          <Link href="/manager/vendors">
            <StatCard label="Vendors" value={stats?.total_vendors ?? 0} icon={icons.vendors} />
          </Link>
          <Link href="/manager/new-items">
            <StatCard label="Parts" value={stats?.total_arts_parts ?? 0} icon={icons.parts} />
          </Link>
          <Link href="/manager/new-items">
            <StatCard label="Tally In" value={stats?.total_ftz_line_items ?? 0} icon={icons.ftz} />
          </Link>
          <Link href="/manager/new-items">
            <StatCard label="In-Bonds" value={stats?.total_inbonds ?? 0} icon={icons.inbond} />
          </Link>
          <Link href="/manager/new-items">
            <StatCard label="Tally Outs" value={stats?.total_tally_outs ?? 0} icon={icons.tally} />
          </Link>
        </div>
      )}

      {/* Two-column: Recent Activity + Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-[#020617] mb-3 uppercase tracking-wider">Recent Activity</h2>
          <div className="bg-white border border-[#E2E8F0] rounded-lg divide-y divide-[#E2E8F0]">
            {activityLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="px-5 py-4">
                  <Skeleton className="h-3 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))
            ) : activity && activity.length > 0 ? (
              activity.map((item, i) => {
                const meta = activityTypeLabels[item.type] ?? { label: item.type, color: "bg-gray-50 text-gray-700" };
                return (
                  <div key={i} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${meta.color}`}>
                          {meta.label}
                        </span>
                        {item.vendor_email && (
                          <span className="text-xs text-[#64748B] truncate">{item.vendor_email}</span>
                        )}
                      </div>
                      <p className="text-sm text-[#020617] truncate">{item.description}</p>
                      {item.importer_account && (
                        <p className="text-xs text-[#94A3B8] mt-0.5">{item.importer_account}</p>
                      )}
                    </div>
                    <span className="text-xs text-[#94A3B8] whitespace-nowrap shrink-0">{timeAgo(item.created_at)}</span>
                  </div>
                );
              })
            ) : (
              <div className="px-5 py-10 text-center text-sm text-[#94A3B8]">No recent activity</div>
            )}
          </div>
        </div>

        {/* Quick Access */}
        <div>
          <h2 className="text-sm font-semibold text-[#020617] mb-3 uppercase tracking-wider">Quick Access</h2>
          <div className="flex flex-col gap-3">
            <Link href="/manager/new-items" className="bg-white border border-[#E2E8F0] rounded-lg px-5 py-4 flex items-center justify-between hover:border-[#0369A1] hover:shadow-sm transition-colors group">
              <div>
                <p className="text-sm font-semibold text-[#020617]">New Items</p>
                <p className="text-xs text-[#64748B] mt-0.5">Review recent submissions</p>
              </div>
              <svg className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#0369A1] transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
            <Link href="/manager/vendors" className="bg-white border border-[#E2E8F0] rounded-lg px-5 py-4 flex items-center justify-between hover:border-[#0369A1] hover:shadow-sm transition-colors group">
              <div>
                <p className="text-sm font-semibold text-[#020617]">Vendor Management</p>
                <p className="text-xs text-[#64748B] mt-0.5">View all vendors and records</p>
              </div>
              <svg className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#0369A1] transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
            <Link href="/manager/admin/users" className="bg-white border border-[#E2E8F0] rounded-lg px-5 py-4 flex items-center justify-between hover:border-[#0369A1] hover:shadow-sm transition-colors group">
              <div>
                <p className="text-sm font-semibold text-[#020617]">Admin Users</p>
                <p className="text-xs text-[#64748B] mt-0.5">Manage accounts and permissions</p>
              </div>
              <svg className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#0369A1] transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
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
    </div>
  );
}
