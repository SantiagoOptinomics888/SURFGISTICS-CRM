"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, FileText, Ship } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";

type Shipment = {
  id: number;
  hbl: string;
  importer_account: string | null;
  client_email: string | null;
  client_delivery_address: Record<string, string | null>;
  shipment_type: string | null;
  status: string;
  isf_processed_at: string | null;
  document_request_due_at: string | null;
  documents: { id: number; document_type: string; file_name: string }[];
  events: { id: number; created_at: string; title: string; description: string | null; actor_email: string | null }[];
};

export default function ManagerImportsPage() {
  const queryClient = useQueryClient();
  const shipments = useQuery<Shipment[]>({
    queryKey: ["shipments", "manager"],
    queryFn: async () => (await api.get("/shipments")).data,
    refetchInterval: 30_000,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["shipments", "manager"] });
  const markProcessed = useMutation({ mutationFn: (hbl: string) => api.post(`/shipments/${encodeURIComponent(hbl)}/isf-processed`), onSuccess: refresh });
  const classify = useMutation({
    mutationFn: ({ hbl, shipmentType }: { hbl: string; shipmentType: string }) => api.patch(`/shipments/${encodeURIComponent(hbl)}/classification`, { shipment_type: shipmentType, approve: true }),
    onSuccess: refresh,
  });

  return (
    <div>
      <PageHeader title="Imports" subtitle="Review shipments from ISF upload through Acelynk handoff." />
      <div className="overflow-hidden border-y border-[#E2E8F0] bg-white">
        {shipments.isLoading && <p className="p-5 text-sm text-[#64748B]">Loading import shipments...</p>}
        {!shipments.isLoading && shipments.data?.length === 0 && <p className="p-5 text-sm text-[#64748B]">No import shipments have been created.</p>}
        {shipments.data?.map((shipment) => {
          const hasArrivalNotice = shipment.documents.some((item) => item.document_type === "arrival_notice");
          return (
            <article key={shipment.id} className="border-b border-[#E2E8F0] p-5 last:border-0">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Ship className="h-4 w-4 text-[#0369A1]" />
                    <h2 className="font-semibold text-[#0F172A]">{shipment.hbl}</h2>
                    <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs font-medium text-[#475569]">{shipment.importer_account ?? "No account"}</span>
                  </div>
                  <p className="mt-1 text-sm capitalize text-[#64748B]">{shipment.status.replaceAll("_", " ")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!shipment.isf_processed_at && (
                    <button onClick={() => markProcessed.mutate(shipment.hbl)} className="inline-flex items-center gap-1.5 rounded-md border border-[#CBD5E1] px-3 py-2 text-xs font-semibold text-[#334155]">
                      <Check className="h-3.5 w-3.5" /> Mark ISF processed
                    </button>
                  )}
                  {hasArrivalNotice && !shipment.shipment_type && (
                    <>
                      <button onClick={() => classify.mutate({ hbl: shipment.hbl, shipmentType: "ftz" })} className="rounded-md bg-[#0369A1] px-3 py-2 text-xs font-semibold text-white">Approve FTZ / E214</button>
                      <button onClick={() => classify.mutate({ hbl: shipment.hbl, shipmentType: "domestic" })} className="rounded-md border border-[#CBD5E1] px-3 py-2 text-xs font-semibold text-[#334155]">Approve Domestic / 7501</button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
                <Info label="Client" value={shipment.client_email ?? "Not provided"} />
                <Info label="Delivery address" value={formatAddress(shipment.client_delivery_address)} />
                <Info label="Document request" value={shipment.document_request_due_at ? new Date(shipment.document_request_due_at).toLocaleDateString() : "Begins after ISF is processed"} icon={<CalendarClock className="h-4 w-4" />} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {shipment.documents.map((document) => (
                  <span key={document.id} className="inline-flex items-center gap-1.5 rounded bg-[#F8FAFC] px-2 py-1 text-xs text-[#475569]">
                    <FileText className="h-3.5 w-3.5" /> {document.document_type.replaceAll("_", " ")}: {document.file_name}
                  </span>
                ))}
              </div>

              {shipment.events.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs font-semibold uppercase text-[#64748B]">Shipment timeline ({shipment.events.length})</summary>
                  <div className="mt-3 border-l border-[#CBD5E1] pl-4">
                    {shipment.events.map((event) => (
                      <div key={event.id} className="mb-3 last:mb-0">
                        <p className="text-sm font-medium text-[#334155]">{event.title}</p>
                        <p className="text-xs text-[#94A3B8]">{new Date(event.created_at).toLocaleString()}{event.actor_email ? ` · ${event.actor_email}` : ""}</p>
                        {event.description && <p className="mt-0.5 text-xs text-[#64748B]">{event.description}</p>}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div><p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-[#64748B]">{icon}{label}</p><p className="mt-1 text-[#0F172A]">{value}</p></div>;
}

function formatAddress(address: Record<string, string | null>) {
  const street = [address.line1, address.line2].filter(Boolean).join(", ");
  const locality = [address.city, address.state, address.postal_code].filter(Boolean).join(" ");
  return [address.name, street, locality, address.country].filter(Boolean).join(" · ") || "Not provided";
}
