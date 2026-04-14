"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveBadge } from "@/components/ui/live-badge";
import type { ArtsPart, FtzLineItem, Inbond, TallyOut } from "@/lib/types";

const POLL = 15_000;

export default function VendorDashboard() {
  const user = getAuth();

  const { data: arts, isLoading: l1 } = useQuery<ArtsPart[]>({
    queryKey: ["arts_parts"],
    queryFn: () => api.get("/arts_part").then((r) => r.data),
    refetchInterval: POLL,
  });
  const { data: ftz, isLoading: l2 } = useQuery<FtzLineItem[]>({
    queryKey: ["ftz_line_items"],
    queryFn: () => api.get("/ftz_line_item").then((r) => r.data),
    refetchInterval: POLL,
  });
  const { data: inbonds, isLoading: l3 } = useQuery<Inbond[]>({
    queryKey: ["inbonds"],
    queryFn: () => api.get("/inbond").then((r) => r.data),
    refetchInterval: POLL,
  });
  const { data: tally, isLoading: l4 } = useQuery<TallyOut[]>({
    queryKey: ["tally_outs"],
    queryFn: () => api.get("/tally_out").then((r) => r.data),
    refetchInterval: POLL,
  });

  const isLoading = l1 || l2 || l3 || l4;

  const totalPartsValue = arts?.reduce((s, r) => s + (r.value ?? 0), 0) ?? 0;
  const ftzApproved = ftz?.filter((r) => r.concurrence === true).length ?? 0;
  const ftzPending = ftz?.filter((r) => r.concurrence !== true).length ?? 0;

  // Build unified activity feed — last 8 events across all resources sorted by created_at
  const activityFeed = [
    ...(arts ?? []).map((r) => ({ type: "arts_part" as const, id: r.id, label: r.part_number ?? "Part", sub: r.description ?? "", created_at: r.created_at })),
    ...(ftz ?? []).map((r) => ({ type: "ftz" as const, id: r.id, label: r.part ?? "FTZ Item", sub: `Talian ${r.hbl ?? "—"}`, created_at: r.created_at })),
    ...(inbonds ?? []).map((r) => ({ type: "inbond" as const, id: r.id, label: r.container ?? "Container", sub: r.part_number ?? "", created_at: r.created_at })),
    ...(tally ?? []).map((r) => ({ type: "tally" as const, id: r.id, label: r.delivery_order_no ?? "DO", sub: r.item_code ?? "", created_at: r.created_at })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  const typeConfig = {
    arts_part: { label: "Arts & Parts", color: "bg-blue-50 text-blue-700", href: "/vendor/arts-parts" },
    ftz:       { label: "FTZ",          color: "bg-purple-50 text-purple-700", href: "/vendor/ftz-line-items" },
    inbond:    { label: "In-Bond",      color: "bg-amber-50 text-amber-700", href: "/vendor/inbonds" },
    tally:     { label: "Tally Out",    color: "bg-emerald-50 text-emerald-700", href: "/vendor/tally-out" },
  };

  return (
    <div>
      {/* Header with tracking code + live badge */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#020617] tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <LiveBadge />
          </div>
        </div>
        {user?.importer_account && (
          <div className="text-right">
            <p className="text-xs text-[#94A3B8] uppercase tracking-widest font-medium mb-1.5">Importer Code</p>
            <div className="inline-flex items-center gap-2 bg-[#0F172A] text-white px-3 py-1.5 rounded-md">
              <svg className="w-3.5 h-3.5 text-[#0EA5E9] flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5-3.9 19.5m-2.1-19.5-3.9 19.5" />
              </svg>
              <span className="font-mono font-semibold text-sm tracking-widest">{user.importer_account}</span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">All API calls filtered by this code</p>
          </div>
        )}
      </div>

      {/* Stat cards — each clickable, reacts to API calls */}
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
            { label: "Arts & Parts", value: arts?.length ?? 0, sub: `$${totalPartsValue.toLocaleString()} value`, href: "/vendor/arts-parts" },
            { label: "FTZ Line Items", value: ftz?.length ?? 0, sub: `${ftzApproved} approved · ${ftzPending} pending`, href: "/vendor/ftz-line-items" },
            { label: "In-Bonds", value: inbonds?.length ?? 0, sub: `${new Set(inbonds?.map((r) => r.container).filter(Boolean)).size} containers`, href: "/vendor/inbonds" },
            { label: "Tally Out", value: tally?.length ?? 0, sub: `${new Set(tally?.map((r) => r.delivery_order_no).filter(Boolean)).size} delivery orders`, href: "/vendor/tally-out" },
          ].map(({ label, value, sub, href }) => (
            <a key={label} href={href} className="bg-white border border-[#E2E8F0] rounded-lg p-5 hover:border-[#0369A1] hover:shadow-sm transition-fast cursor-pointer group block">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{label}</span>
                <svg className="w-3.5 h-3.5 text-[#CBD5E1] group-hover:text-[#0369A1] transition-fast" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </div>
              <p className="text-3xl font-semibold text-[#0369A1] tabular-nums">{value}</p>
              <p className="text-xs text-[#94A3B8] mt-1.5">{sub}</p>
            </a>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Activity feed — reacts to incoming API calls */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#020617] uppercase tracking-wider">Live Activity</h2>
            <span className="text-xs text-[#94A3B8]">Last 8 events · updates every 15s</span>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-[#F1F5F9]">
                  <Skeleton className="w-14 h-5 rounded-full" />
                  <div className="flex-1"><Skeleton className="h-3.5 w-32 mb-1.5" /><Skeleton className="h-3 w-24" /></div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))
            ) : activityFeed.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-[#94A3B8]">No activity yet.</p>
                <p className="text-xs text-[#CBD5E1] mt-1">Make an API call to see it appear here.</p>
              </div>
            ) : (
              activityFeed.map((event) => {
                const cfg = typeConfig[event.type];
                const ts = new Date(event.created_at);
                return (
                  <a key={`${event.type}-${event.id}`} href={cfg.href} className="flex items-center gap-3 px-4 py-3.5 border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-fast cursor-pointer last:border-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.color}`}>{cfg.label}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] truncate">{event.label}</p>
                      {event.sub && <p className="text-xs text-[#94A3B8] truncate">{event.sub}</p>}
                    </div>
                    <span className="text-xs text-[#CBD5E1] whitespace-nowrap flex-shrink-0">
                      {ts.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </a>
                );
              })
            )}
          </div>
        </div>

        {/* Right column — FTZ status + connection info */}
        <div className="lg:col-span-2 space-y-4">
          {/* API Connection box */}
          <div>
            <h2 className="text-sm font-semibold text-[#020617] uppercase tracking-wider mb-3">API Connection</h2>
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-[#334155]">Endpoint</p>
                  <p className="text-xs font-mono text-[#64748B] break-all">{process.env.NEXT_PUBLIC_API_URL ?? "api.surfgistics.com"}</p>
                </div>
              </div>
              <div className="border-t border-[#F1F5F9] pt-3">
                <p className="text-xs font-semibold text-[#334155] mb-1">Your filter key</p>
                <div className="bg-[#F8FAFC] rounded px-2.5 py-1.5 border border-[#E2E8F0]">
                  <p className="text-xs font-mono text-[#0369A1] font-semibold">
                    importer_account: {user?.importer_account ?? "—"}
                  </p>
                </div>
                <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
                  Every record you POST to the API must include this code. The CRM auto-filters by it.
                </p>
              </div>
              <div className="border-t border-[#F1F5F9] pt-3 space-y-1.5">
                <p className="text-xs font-semibold text-[#334155]">Available endpoints</p>
                {["/arts_part", "/ftz_line_item", "/inbond", "/tally_out"].map((ep) => (
                  <div key={ep} className="flex items-center gap-2">
                    <span className="text-xs bg-[#E0F2FE] text-[#0369A1] font-mono px-1.5 py-0.5 rounded">POST</span>
                    <span className="text-xs font-mono text-[#64748B]">{ep}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FTZ concurrence summary */}
          {(ftz ?? []).length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-[#020617] uppercase tracking-wider mb-3">FTZ Status</h2>
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
                <div className="flex items-center gap-4 mb-3">
                  <div>
                    <p className="text-xs text-[#64748B] uppercase tracking-wider font-medium">Approved</p>
                    <p className="text-2xl font-semibold text-emerald-600 tabular-nums">{ftzApproved}</p>
                  </div>
                  <div className="w-px h-8 bg-[#E2E8F0]" />
                  <div>
                    <p className="text-xs text-[#64748B] uppercase tracking-wider font-medium">Pending</p>
                    <p className="text-2xl font-semibold text-amber-600 tabular-nums">{ftzPending}</p>
                  </div>
                  <div className="w-px h-8 bg-[#E2E8F0]" />
                  <div>
                    <p className="text-xs text-[#64748B] uppercase tracking-wider font-medium">Rate</p>
                    <p className="text-2xl font-semibold text-[#020617] tabular-nums">
                      {(ftz ?? []).length > 0 ? Math.round((ftzApproved / (ftz ?? []).length) * 100) : 0}%
                    </p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(ftz ?? []).length > 0 ? (ftzApproved / (ftz ?? []).length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
