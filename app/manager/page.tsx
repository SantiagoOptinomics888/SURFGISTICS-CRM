"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileCheck2,
  Package,
  RefreshCw,
  ShieldCheck,
  Ship,
  Users,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import type { AcelynkLogEntry, ManagerStats, RecentActivityItem } from "@/lib/types";

type ImportShipment = {
  id: number;
  hbl: string;
  status: string;
  updated_at: string;
};

const moduleMeta = {
  parts: {
    label: "Parts",
    href: "/manager/new-items?module=parts",
    color: "text-sky-700",
    bg: "bg-sky-50",
    icon: Package,
  },
  tallyIn: {
    label: "Tally In",
    href: "/manager/new-items?module=ftz_line_item",
    color: "text-amber-700",
    bg: "bg-amber-50",
    icon: ClipboardList,
  },
  inbond: {
    label: "In-Bonds",
    href: "/manager/new-items?module=inbond",
    color: "text-violet-700",
    bg: "bg-violet-50",
    icon: Ship,
  },
  tallyOut: {
    label: "Tally Outs",
    href: "/manager/new-items?module=tally_out",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    icon: FileCheck2,
  },
};

const activityTypeLabels: Record<string, { label: string; color: string }> = {
  part: { label: "Part", color: "bg-sky-50 text-sky-700" },
  arts_part: { label: "Part", color: "bg-sky-50 text-sky-700" },
  ftz_line_item: { label: "Tally In", color: "bg-amber-50 text-amber-700" },
  inbond: { label: "In-Bond", color: "bg-violet-50 text-violet-700" },
  tally_out: { label: "Tally Out", color: "bg-emerald-50 text-emerald-700" },
};

const resourceLabels: Record<string, string> = {
  parts: "Parts",
  ftz_line_item: "Tally In",
  e214_entry_header: "E214 Entry Header",
  inbond: "In-Bond",
  tally_out: "Tally Out",
};

function formatNumber(value: number | undefined) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "Never";
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function statusTone(status: AcelynkLogEntry["status"]) {
  if (status === "success") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "failed") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function StatTile({
  label,
  value,
  detail,
  icon: Icon,
  tone = "text-slate-700",
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ElementType;
  tone?: string;
}) {
  return (
    <div className="surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase text-[#6D828A]">{label}</p>
          <p className="mt-2 text-3xl font-bold text-[#142B35] tabular-nums">{value}</p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-md bg-[#EDF4F5] ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-xs text-[#71858D]">{detail}</p>
    </div>
  );
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

  const { data: acelynkLogs, isLoading: logsLoading } = useQuery<AcelynkLogEntry[]>({
    queryKey: ["manager_acelynk_logs_overview"],
    queryFn: () => api.get("/manager/acelynk-log?limit=50").then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: importShipments, isLoading: shipmentsLoading } = useQuery<ImportShipment[]>({
    queryKey: ["shipments", "manager", "overview"],
    queryFn: () => api.get("/shipments").then((r) => r.data),
    refetchInterval: 30000,
  });

  const moduleCards = [
    { ...moduleMeta.parts, value: stats?.total_parts ?? 0 },
    { ...moduleMeta.tallyIn, value: stats?.total_ftz_line_items ?? 0 },
    { ...moduleMeta.inbond, value: stats?.total_inbonds ?? 0 },
    { ...moduleMeta.tallyOut, value: stats?.total_tally_outs ?? 0 },
  ];

  const acelynkSummary = useMemo(() => {
    const logs = acelynkLogs ?? [];
    const failed = logs.filter((log) => log.status === "failed");
    const pending = logs.filter((log) => log.status === "pending");
    const success = logs.filter((log) => log.status === "success");
    const needsAttention = [...pending, ...failed].slice(0, 5);
    const latest = logs[0] ?? null;
    return { failed, pending, success, needsAttention, latest };
  }, [acelynkLogs]);

  const health = acelynkSummary.failed.length > 0
    ? {
        label: "Needs attention",
        detail: `${acelynkSummary.failed.length} failed Acelynk push${acelynkSummary.failed.length === 1 ? "" : "es"} in the latest 50 logs`,
        icon: AlertTriangle,
        tone: "text-rose-700",
        bg: "bg-rose-50",
        border: "border-rose-200",
      }
    : acelynkSummary.pending.length > 0
      ? {
          label: "Queue running",
          detail: `${acelynkSummary.pending.length} upload${acelynkSummary.pending.length === 1 ? "" : "s"} waiting for the watcher`,
          icon: Clock3,
          tone: "text-amber-700",
          bg: "bg-amber-50",
          border: "border-amber-200",
        }
      : {
          label: "Operational",
          detail: "No failed or pending Acelynk pushes in the latest logs",
          icon: ShieldCheck,
          tone: "text-emerald-700",
          bg: "bg-emerald-50",
          border: "border-emerald-200",
        };

  const HealthIcon = health.icon;
  const shipmentAttention = (importShipments ?? []).filter((shipment) =>
    ["isf_automation_pending", "awaiting_documents", "awaiting_classification"].includes(shipment.status)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-[#DDE6E9] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase text-[#0C91B6]">Admin workspace</p>
          <h1 className="mt-1.5 text-2xl font-bold text-[#142B35]">Operations overview</h1>
          <p className="mt-1 text-sm text-[#607780]">See what is moving, what needs attention, and where to act next.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {stats?.last_updated && (
            <span className="text-xs text-[#64748B] border border-[#E2E8F0] bg-white rounded-md px-3 py-2">
              Data updated {timeAgo(stats.last_updated)}
            </span>
          )}
          <Link
            href="/manager/new-items"
            className="inline-flex items-center gap-2 rounded-md bg-[#087FA3] px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-[#076C8B]"
          >
            Review Modules
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Link href="/manager/imports" className="surface group flex items-center gap-3 p-4 transition-colors hover:border-[#64B8CB]">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-50 text-cyan-700"><Ship className="h-[18px] w-[18px]" /></div>
          <div className="min-w-0 flex-1"><p className="text-sm font-bold text-[#203B46]">Import shipments</p><p className="text-xs text-[#71858D]">{shipmentsLoading ? "Loading..." : `${shipmentAttention.length} need attention`}</p></div>
          <ArrowRight className="h-4 w-4 text-[#B3C1C6] group-hover:text-[#087FA3]" />
        </Link>
        <Link href="/manager/new-items" className="surface group flex items-center gap-3 p-4 transition-colors hover:border-[#64B8CB]">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-700"><RefreshCw className="h-[18px] w-[18px]" /></div>
          <div className="min-w-0 flex-1"><p className="text-sm font-bold text-[#203B46]">Automation queue</p><p className="text-xs text-[#71858D]">{acelynkSummary.failed.length + acelynkSummary.pending.length} open jobs</p></div>
          <ArrowRight className="h-4 w-4 text-[#B3C1C6] group-hover:text-[#087FA3]" />
        </Link>
        <Link href="/manager/vendors" className="surface group flex items-center gap-3 p-4 transition-colors hover:border-[#64B8CB]">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"><Users className="h-[18px] w-[18px]" /></div>
          <div className="min-w-0 flex-1"><p className="text-sm font-bold text-[#203B46]">Vendor accounts</p><p className="text-xs text-[#71858D]">{formatNumber(stats?.total_vendors)} accounts</p></div>
          <ArrowRight className="h-4 w-4 text-[#B3C1C6] group-hover:text-[#087FA3]" />
        </Link>
      </div>

      <div className={`border rounded-lg ${health.bg} ${health.border} p-5`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className={`h-10 w-10 rounded-md bg-white flex items-center justify-center ${health.tone}`}>
              <HealthIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-[#020617]">Acelynk automation: {health.label}</h2>
                {acelynkSummary.latest && (
                  <span className="text-xs text-[#64748B]">Latest run {timeAgo(acelynkSummary.latest.created_at)}</span>
                )}
              </div>
              <p className="text-sm text-[#475569] mt-1">{health.detail}</p>
            </div>
          </div>
          <Link
            href="/manager/new-items"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-sm font-semibold text-[#0F172A] hover:border-[#0369A1] hover:text-[#0369A1] transition-colors"
          >
            Open Push Status
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E2E8F0] rounded-lg p-5">
              <Skeleton className="h-3 w-24 mb-4" />
              <Skeleton className="h-9 w-20 mb-3" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Import Shipments"
            value={formatNumber(importShipments?.length)}
            detail={`${shipmentAttention.length} currently need attention`}
            icon={Ship}
            tone="text-cyan-700"
          />
          <StatTile
            label="Vendors"
            value={formatNumber(stats?.total_vendors)}
            detail="Active and inactive vendor accounts"
            icon={Users}
            tone="text-sky-700"
          />
          <StatTile
            label="Pending Review"
            value={formatNumber(stats?.pending_concurrences)}
            detail="Tally-in concurrence items awaiting review"
            icon={AlertTriangle}
            tone={(stats?.pending_concurrences ?? 0) > 0 ? "text-amber-700" : "text-emerald-700"}
          />
          <StatTile
            label="Acelynk Success"
            value={formatNumber(acelynkSummary.success.length)}
            detail="Successful pushes in the latest 50 logs"
            icon={CheckCircle2}
            tone="text-emerald-700"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {moduleCards.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              key={module.label}
              href={module.href}
              className="bg-white border border-[#E2E8F0] rounded-lg p-5 hover:border-[#0369A1] hover:shadow-sm transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className={`h-9 w-9 rounded-md ${module.bg} ${module.color} flex items-center justify-center`}>
                  <Icon className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-[#CBD5E1]" />
              </div>
              <p className="text-sm font-semibold text-[#020617] mt-4">{module.label}</p>
              <p className="text-2xl font-semibold tabular-nums text-[#020617] mt-1">{formatNumber(module.value)}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#020617] uppercase tracking-wider">Recent Activity</h2>
            <Link href="/manager/vendors" className="text-sm font-semibold text-[#0369A1] hover:text-[#075985]">
              View Vendors
            </Link>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-lg divide-y divide-[#E2E8F0]">
            {activityLoading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="px-5 py-4">
                  <Skeleton className="h-3 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))
            ) : activity && activity.length > 0 ? (
              activity.map((item, i) => {
                const meta = activityTypeLabels[item.type] ?? { label: item.type, color: "bg-gray-50 text-gray-700" };
                return (
                  <div key={`${item.type}-${item.created_at}-${i}`} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${meta.color}`}>
                          {meta.label}
                        </span>
                        {item.importer_account && (
                          <span className="text-xs font-medium text-[#64748B]">{item.importer_account}</span>
                        )}
                        {item.vendor_email && (
                          <span className="text-xs text-[#94A3B8] truncate">{item.vendor_email}</span>
                        )}
                      </div>
                      <p className="text-sm text-[#020617] truncate">{item.description}</p>
                    </div>
                    <span className="text-xs text-[#94A3B8] whitespace-nowrap shrink-0">{timeAgo(item.created_at)}</span>
                  </div>
                );
              })
            ) : (
              <div className="px-5 py-10 text-center text-sm text-[#94A3B8]">No recent activity</div>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#020617] uppercase tracking-wider">Automation Queue</h2>
            <RefreshCw className="h-4 w-4 text-[#94A3B8]" />
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-lg">
            <div className="grid grid-cols-3 border-b border-[#E2E8F0]">
              <div className="p-4">
                <p className="text-xs text-[#64748B]">Pending</p>
                <p className="text-xl font-semibold text-amber-700 tabular-nums">{acelynkSummary.pending.length}</p>
              </div>
              <div className="p-4 border-x border-[#E2E8F0]">
                <p className="text-xs text-[#64748B]">Failed</p>
                <p className="text-xl font-semibold text-rose-700 tabular-nums">{acelynkSummary.failed.length}</p>
              </div>
              <div className="p-4">
                <p className="text-xs text-[#64748B]">Passed</p>
                <p className="text-xl font-semibold text-emerald-700 tabular-nums">{acelynkSummary.success.length}</p>
              </div>
            </div>

            <div className="divide-y divide-[#E2E8F0]">
              {logsLoading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="p-4">
                    <Skeleton className="h-3 w-28 mb-2" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                ))
              ) : acelynkSummary.needsAttention.length > 0 ? (
                acelynkSummary.needsAttention.map((log) => (
                  <Link
                    key={log.id}
                    href="/manager/new-items"
                    className="p-4 flex items-start gap-3 hover:bg-[#F8FAFC] transition-colors"
                  >
                    {log.status === "failed" ? (
                      <XCircle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                    ) : (
                      <Clock3 className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusTone(log.status)}`}>
                          {log.status}
                        </span>
                        <span className="text-xs text-[#64748B]">{resourceLabels[log.resource_type] ?? log.resource_type}</span>
                      </div>
                      <p className="text-sm font-medium text-[#020617] truncate mt-1">{log.identifier}</p>
                      <p className="text-xs text-[#94A3B8] mt-0.5">{log.importer_account ?? "No account"} · {timeAgo(log.created_at)}</p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-6 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                  <p className="text-sm font-semibold text-[#020617] mt-3">Queue is clear</p>
                  <p className="text-xs text-[#64748B] mt-1">No pending or failed Acelynk jobs in the latest logs.</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 mt-4">
            <Link href="/manager/new-items" className="bg-white border border-[#E2E8F0] rounded-lg px-4 py-3 flex items-center justify-between hover:border-[#0369A1] transition-colors">
              <span className="text-sm font-semibold text-[#020617]">Modules and reprocess</span>
              <ArrowRight className="h-4 w-4 text-[#CBD5E1]" />
            </Link>
            <Link href="/manager/admin/users" className="bg-white border border-[#E2E8F0] rounded-lg px-4 py-3 flex items-center justify-between hover:border-[#0369A1] transition-colors">
              <span className="text-sm font-semibold text-[#020617]">Admin users</span>
              <ArrowRight className="h-4 w-4 text-[#CBD5E1]" />
            </Link>
            <Link href="/manager/vendors" className="bg-white border border-[#E2E8F0] rounded-lg px-4 py-3 flex items-center justify-between hover:border-[#0369A1] transition-colors">
              <span className="text-sm font-semibold text-[#020617]">Vendor records</span>
              <ArrowRight className="h-4 w-4 text-[#CBD5E1]" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
