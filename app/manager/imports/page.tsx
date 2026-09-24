"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ChevronRight, CirclePlus, FileText, Ship } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import {
  NewShipmentModal,
  ShipmentWorkflowModal,
  shipmentCurrentStep,
  shipmentProgress,
} from "@/components/shipment-workflow-modal";
import type { AdminUser, ImportShipment } from "@/lib/types";

export default function ManagerImportsPage() {
  const queryClient = useQueryClient();
  const [creatingShipment, setCreatingShipment] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const shipments = useQuery<ImportShipment[]>({
    queryKey: ["shipments", "manager"],
    queryFn: async () => (await api.get("/shipments")).data,
    refetchInterval: 15_000,
  });
  const vendors = useQuery<AdminUser[]>({
    queryKey: ["admin-users", "shipment-workflow"],
    queryFn: async () => (await api.get("/admin/users")).data,
  });
  const selectedShipment = shipments.data?.find((shipment) => shipment.id === selectedShipmentId) ?? null;
  const rows = shipments.data ?? [];
  const attentionCount = rows.filter((shipment) => shipment.status.includes("failed") || shipmentCurrentStep(shipment) < 4).length;
  const completedCount = rows.filter((shipment) => shipment.status.includes("complete")).length;

  function refreshShipments() {
    queryClient.invalidateQueries({ queryKey: ["shipments", "manager"] });
  }

  function shipmentCreated(shipment: ImportShipment) {
    queryClient.setQueryData<ImportShipment[]>(["shipments", "manager"], (current) => [shipment, ...(current ?? []).filter((item) => item.id !== shipment.id)]);
    setCreatingShipment(false);
    setSelectedShipmentId(shipment.id);
    setMessage(`${shipment.hbl} was created and its ISF automations are queued.`);
  }

  return (
    <div>
      <PageHeader
        title="Import Shipments"
        subtitle="Run every shipment from ISF through commercial documents, the MBL Manifest Query, and entry filing from one admin workflow."
        action={(
          <button type="button" onClick={() => setCreatingShipment(true)} className="inline-flex items-center gap-2 rounded-md bg-[#087FA3] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#076C8B]">
            <CirclePlus className="h-4 w-4" /> New shipment
          </button>
        )}
      />

      {message && <div className="mb-5 border-l-4 border-[#087FA3] bg-[#F0F9FF] px-4 py-3 text-sm text-[#0C4A6E]">{message}</div>}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Total shipments" value={rows.length} detail="All tracked HBLs" icon={<Ship className="h-5 w-5" />} tone="bg-cyan-50 text-cyan-700" />
        <SummaryCard label="Needs action" value={attentionCount} detail="Open workflow steps or failures" icon={<AlertTriangle className="h-5 w-5" />} tone="bg-amber-50 text-amber-700" />
        <SummaryCard label="Completed" value={completedCount} detail="Entry filing confirmed" icon={<CheckCircle2 className="h-5 w-5" />} tone="bg-emerald-50 text-emerald-700" />
      </div>

      <section className="surface overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-[#DDE6E9] bg-[#F8FAFC] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#203B46]">Shipment workflows</h2>
            <p className="mt-0.5 text-xs text-[#71858D]">Open any HBL to complete its next task or inspect the cloud automation.</p>
          </div>
          <span className="text-xs font-semibold text-[#71858D]">Auto-refreshes every 15 seconds</span>
        </div>

        <div className="hidden grid-cols-[1.3fr_1fr_1.4fr_.8fr_120px] gap-4 border-b border-[#DDE6E9] px-5 py-3 text-[11px] font-bold uppercase text-[#71858D] lg:grid">
          <span>Shipment</span><span>Client</span><span>Workflow</span><span>Documents</span><span />
        </div>

        {shipments.isLoading && <p className="p-6 text-sm text-[#71858D]">Loading import shipments...</p>}
        {shipments.isError && <p className="p-6 text-sm text-rose-700">Could not load the shipment list.</p>}
        {!shipments.isLoading && rows.length === 0 && (
          <div className="px-6 py-12 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-50 text-cyan-700"><Ship className="h-6 w-6" /></span>
            <h3 className="mt-4 text-base font-bold text-[#203B46]">No shipments yet</h3>
            <p className="mt-1 text-sm text-[#71858D]">Create the first shipment by uploading its ISF.</p>
          </div>
        )}
        {rows.map((shipment) => {
          const progress = shipmentProgress(shipment);
          const currentStep = shipmentCurrentStep(shipment);
          return (
            <article key={shipment.id} className="grid gap-4 border-b border-[#E3EAEC] px-5 py-4 last:border-0 lg:grid-cols-[1.3fr_1fr_1.4fr_.8fr_120px] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-[#142B35]">{shipment.hbl}</h3>
                  <StatusPill status={shipment.status} />
                </div>
                <p className="mt-1 text-xs text-[#71858D]">{shipment.importer_account ?? "No importer account"}</p>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-[#334E58]">{shipment.client_email ?? "No client email"}</p>
                <p className="mt-1 text-xs text-[#8A9BA2]">Updated {new Date(shipment.updated_at).toLocaleString()}</p>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs"><span className="font-semibold text-[#334E58]">{currentStep >= 4 ? "All steps complete" : `Step ${currentStep + 1}: ${stepName(currentStep)}`}</span><span className="text-[#8A9BA2]">{progress}/4</span></div>
                <div className="mt-2 grid grid-cols-4 gap-1">
                  {[0, 1, 2, 3].map((index) => <span key={index} className={`h-1.5 rounded-full ${index < progress ? "bg-emerald-500" : index === currentStep ? "bg-[#087FA3]" : "bg-[#DDE6E9]"}`} />)}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#334E58]">
                <FileText className="h-4 w-4 text-[#71858D]" /> {uniqueDocumentCount(shipment)}/4
              </div>
              <button type="button" onClick={() => setSelectedShipmentId(shipment.id)} className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[#C9D7DB] bg-white px-3 py-2 text-sm font-semibold text-[#334E58] hover:border-[#73B7C7] hover:bg-[#F7FBFC]">
                Open <ChevronRight className="h-4 w-4" />
              </button>
            </article>
          );
        })}
      </section>

      {creatingShipment && (
        <NewShipmentModal
          vendors={vendors.data ?? []}
          onClose={() => setCreatingShipment(false)}
          onCreated={shipmentCreated}
        />
      )}
      {selectedShipment && (
        <ShipmentWorkflowModal
          key={selectedShipment.id}
          shipment={selectedShipment}
          onClose={() => setSelectedShipmentId(null)}
          onChanged={refreshShipments}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, detail, icon, tone }: { label: string; value: number; detail: string; icon: React.ReactNode; tone: string }) {
  return (
    <div className="surface flex items-center gap-3 p-4">
      <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>{icon}</span>
      <div><p className="text-xl font-bold text-[#142B35]">{value}</p><p className="text-xs font-bold text-[#334E58]">{label}</p><p className="text-[11px] text-[#8A9BA2]">{detail}</p></div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const failed = status.includes("failed");
  const complete = status.includes("complete");
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${failed ? "bg-rose-100 text-rose-700" : complete ? "bg-emerald-100 text-emerald-700" : "bg-cyan-100 text-cyan-800"}`}>{statusName(status)}</span>;
}

function statusName(status: string) {
  const labels: Record<string, string> = {
    isf_automation_pending: "ISF running",
    isf_automation_failed: "ISF failed",
    isf_review_ready: "ISF ready",
    awaiting_documents: "Documents needed",
    documents_ready: "Documents ready",
    awaiting_classification: "Ready for manifest query",
    ftz_automation_pending: "E214 query running",
    ftz_automation_failed: "E214 query needs review",
    ftz_complete: "Complete",
    domestic_automation_pending: "Domestic approved",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

function stepName(index: number) {
  return ["ISF", "Invoice & packing list", "Manifest query", "Entry filing"][index] ?? "Complete";
}

function uniqueDocumentCount(shipment: ImportShipment) {
  return new Set(shipment.documents.map((document) => document.document_type).filter((type) => ["isf", "commercial_invoice", "packing_list"].includes(type))).size;
}
