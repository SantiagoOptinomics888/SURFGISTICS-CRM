"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileInput,
  PackageCheck,
  Ship,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import type { ArtsPart, FtzLineItem, Inbond, TallyOut } from "@/lib/types";

const POLL = 15_000;

type Shipment = {
  id: number;
  hbl: string;
  status: string;
  shipment_type: string | null;
  updated_at: string;
  documents: { id: number; document_type: string }[];
};

const shipmentStatus: Record<string, { label: string; tone: string }> = {
  isf_automation_pending: { label: "ISF processing", tone: "bg-cyan-50 text-cyan-800" },
  awaiting_documents: { label: "Documents needed", tone: "bg-amber-50 text-amber-800" },
  documents_ready: { label: "Documents ready", tone: "bg-emerald-50 text-emerald-800" },
  awaiting_classification: { label: "Under review", tone: "bg-violet-50 text-violet-800" },
  ftz_automation_pending: { label: "E214 processing", tone: "bg-cyan-50 text-cyan-800" },
  domestic_automation_pending: { label: "7501 processing", tone: "bg-cyan-50 text-cyan-800" },
};

export default function VendorDashboard() {
  const user = getAuth();
  const permissions = user?.permissions ?? [];
  const hasPerm = (permission: string) => permissions.includes(permission);

  const { data: parts, isLoading: partsLoading } = useQuery<ArtsPart[]>({
    queryKey: ["arts_parts"], queryFn: () => api.get("/parts").then((r) => r.data), refetchInterval: POLL, enabled: hasPerm("parts"),
  });
  const { data: tallyIn, isLoading: tallyInLoading } = useQuery<FtzLineItem[]>({
    queryKey: ["ftz_line_items"], queryFn: () => api.get("/ftz_line_item").then((r) => r.data), refetchInterval: POLL, enabled: hasPerm("tally_in"),
  });
  const { data: inbonds, isLoading: inbondLoading } = useQuery<Inbond[]>({
    queryKey: ["inbonds"], queryFn: () => api.get("/inbond").then((r) => r.data), refetchInterval: POLL, enabled: hasPerm("inbond"),
  });
  const { data: tallyOut, isLoading: tallyOutLoading } = useQuery<TallyOut[]>({
    queryKey: ["tally_outs"], queryFn: () => api.get("/tally_out").then((r) => r.data), refetchInterval: POLL, enabled: hasPerm("tally_out"),
  });
  const { data: shipments, isLoading: shipmentsLoading } = useQuery<Shipment[]>({
    queryKey: ["shipments"], queryFn: () => api.get("/shipments").then((r) => r.data), refetchInterval: POLL, enabled: hasPerm("imports"),
  });

  const isLoading = partsLoading || tallyInLoading || inbondLoading || tallyOutLoading || shipmentsLoading;
  const tallyApproved = tallyIn?.filter((row) => row.concurrence === true).length ?? 0;
  const tallyPending = tallyIn?.filter((row) => row.concurrence !== true).length ?? 0;
  const activeShipments = shipments?.filter((shipment) => !shipment.status.includes("complete")).length ?? 0;

  const metrics = [
    hasPerm("imports") && { label: "Active shipments", value: activeShipments, detail: `${shipments?.length ?? 0} total HBLs`, href: "/vendor/imports", icon: Ship, tone: "text-cyan-700 bg-cyan-50" },
    hasPerm("parts") && { label: "Registered parts", value: parts?.length ?? 0, detail: `$${(parts?.reduce((sum, row) => sum + (row.value ?? 0), 0) ?? 0).toLocaleString()} total value`, href: "/vendor/arts-parts", icon: Boxes, tone: "text-sky-700 bg-sky-50" },
    hasPerm("tally_in") && { label: "Tally-in items", value: tallyIn?.length ?? 0, detail: `${tallyApproved} approved · ${tallyPending} pending`, href: "/vendor/tally-in", icon: ClipboardList, tone: "text-amber-700 bg-amber-50" },
    hasPerm("tally_out") && { label: "Delivery orders", value: new Set(tallyOut?.map((row) => row.delivery_order_no).filter(Boolean)).size, detail: `${tallyOut?.length ?? 0} tally-out rows`, href: "/vendor/tally-out", icon: PackageCheck, tone: "text-emerald-700 bg-emerald-50" },
    hasPerm("inbond") && { label: "In-bond records", value: inbonds?.length ?? 0, detail: `${new Set(inbonds?.map((row) => row.container).filter(Boolean)).size} containers`, href: "/vendor/inbonds", icon: CheckCircle2, tone: "text-violet-700 bg-violet-50" },
  ].filter((item): item is { label: string; value: number; detail: string; href: string; icon: LucideIcon; tone: string } => Boolean(item));

  const quickActions = [
    hasPerm("imports") && { label: "Upload ISF", detail: "Start Acelynk and GoFreight automatically", href: "/vendor/imports", icon: Ship },
    hasPerm("tally_in") && { label: "Add arrival notice", detail: "Send a shipment for header review", href: "/vendor/arrival-notice", icon: FileInput },
    hasPerm("parts") && { label: "Upload parts", detail: "Register or update the parts catalog", href: "/vendor/arts-parts", icon: Boxes },
    hasPerm("tally_in") && { label: "Upload tally in", detail: "Validate parts and submit line items", href: "/vendor/tally-in", icon: Upload },
  ].filter((item): item is { label: string; detail: string; href: string; icon: LucideIcon } => Boolean(item));

  const activity = [
    ...(parts ?? []).map((row) => ({ id: `part-${row.id}`, label: row.part_number ?? "Part", detail: row.description ?? "Part updated", date: row.created_at, href: "/vendor/arts-parts", type: "Part" })),
    ...(tallyIn ?? []).map((row) => ({ id: `tally-${row.id}`, label: row.hbl ?? "Tally in", detail: row.part ?? "Line item", date: row.created_at, href: "/vendor/tally-in", type: "Tally In" })),
    ...(shipments ?? []).map((row) => ({ id: `shipment-${row.id}`, label: row.hbl, detail: shipmentStatus[row.status]?.label ?? row.status.replaceAll("_", " "), date: row.updated_at, href: "/vendor/imports", type: "Shipment" })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 7);

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 border-b border-[#DDE6E9] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase text-[#0C91B6]">Vendor workspace</p>
          <h1 className="mt-1.5 text-2xl font-bold text-[#142B35]">Your import operations</h1>
          <p className="mt-1 text-sm text-[#607780]">Track shipments, documents, parts, and filings from one place.</p>
        </div>
        {user?.importer_account && <div className="rounded-md border border-[#D5E2E5] bg-white px-3 py-2 font-mono text-sm font-bold text-[#31515D]">{user.importer_account}</div>}
      </div>

      {quickActions.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="section-label">Start a task</h2><span className="text-xs text-[#82969D]">Choose what you need to do</span></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.label} href={action.href} className="group flex min-h-24 items-start gap-3 rounded-lg border border-[#DDE6E9] bg-white p-4 shadow-[0_1px_2px_rgba(10,35,48,0.025)] transition-colors hover:border-[#64B8CB]">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-[#E2F5F8] text-[#087FA3]"><Icon className="h-[18px] w-[18px]" /></div>
                  <div className="min-w-0"><p className="text-sm font-bold text-[#18333E]">{action.label}</p><p className="mt-1 text-xs leading-5 text-[#71858D]">{action.detail}</p></div>
                  <ArrowRight className="ml-auto h-4 w-4 flex-shrink-0 text-[#B0C0C5] group-hover:text-[#087FA3]" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="section-label mb-3">At a glance</h2>
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[...Array(4)].map((_, index) => <div key={index} className="surface p-5"><Skeleton className="h-4 w-28" /><Skeleton className="mt-5 h-8 w-16" /></div>)}</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return <Link key={metric.label} href={metric.href} className="surface group p-5 transition-colors hover:border-[#64B8CB]"><div className="flex items-start justify-between"><p className="text-xs font-bold text-[#607780]">{metric.label}</p><span className={`flex h-8 w-8 items-center justify-center rounded-md ${metric.tone}`}><Icon className="h-4 w-4" /></span></div><p className="mt-3 text-3xl font-bold text-[#142B35] tabular-nums">{metric.value}</p><p className="mt-1 text-xs text-[#81949B]">{metric.detail}</p></Link>;
            })}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="section-label">Recent activity</h2><span className="inline-flex items-center gap-1.5 text-xs text-[#6D828A]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live</span></div>
          <div className="surface overflow-hidden divide-y divide-[#E8EFF1]">
            {activity.length === 0 ? <EmptyState icon={Clock3} title="No activity yet" detail="Your latest shipment and upload activity will appear here." /> : activity.map((event) => (
              <Link key={event.id} href={event.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#F7FAFA] sm:px-5">
                <span className="w-20 flex-shrink-0 text-[10px] font-bold uppercase text-[#0C91B6]">{event.type}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#203B46]">{event.label}</p><p className="truncate text-xs text-[#81949B]">{event.detail}</p></div>
                <span className="flex-shrink-0 text-xs text-[#9AABB1]">{new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="section-label">Shipment status</h2>{hasPerm("imports") && <Link href="/vendor/imports" className="text-xs font-bold text-[#087FA3]">View all</Link>}</div>
          <div className="surface overflow-hidden divide-y divide-[#E8EFF1]">
            {!hasPerm("imports") || !shipments?.length ? <EmptyState icon={Ship} title="No shipments yet" detail="New shipments will appear here after an ISF is uploaded." /> : shipments.slice(0, 5).map((shipment) => {
              const status = shipmentStatus[shipment.status] ?? { label: shipment.status.replaceAll("_", " "), tone: "bg-slate-100 text-slate-700" };
              return <Link key={shipment.id} href="/vendor/imports" className="block px-4 py-3.5 hover:bg-[#F7FAFA]"><div className="flex items-center justify-between gap-3"><p className="truncate font-mono text-sm font-bold text-[#203B46]">{shipment.hbl}</p><span className={`flex-shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${status.tone}`}>{status.label}</span></div><p className="mt-1 text-xs text-[#81949B]">{shipment.documents.length} document{shipment.documents.length === 1 ? "" : "s"} attached</p></Link>;
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return <div className="px-5 py-10 text-center"><Icon className="mx-auto h-7 w-7 text-[#9EB0B6]" /><p className="mt-3 text-sm font-bold text-[#31515D]">{title}</p><p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-[#81949B]">{detail}</p></div>;
}
