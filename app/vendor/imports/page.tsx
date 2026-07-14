"use client";

import { FormEvent, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Ship, UploadCloud } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";

type ShipmentDocument = {
  id: number;
  document_type: string;
  file_name: string;
  file_size: number;
};

type Shipment = {
  id: number;
  hbl: string;
  status: string;
  shipment_type: string | null;
  client_email: string | null;
  document_request_due_at: string | null;
  documents: ShipmentDocument[];
};

const statusLabels: Record<string, string> = {
  isf_automation_pending: "ISF automation pending",
  awaiting_documents: "Awaiting client documents",
  documents_ready: "Documents ready",
  awaiting_classification: "Awaiting classification",
  ftz_automation_pending: "E214 queued",
  domestic_automation_pending: "7501 pending Phase 2",
};

export default function ImportsPage() {
  const queryClient = useQueryClient();
  const isfRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef<HTMLInputElement>(null);
  const [isfFile, setIsfFile] = useState<File | null>(null);
  const [documentTarget, setDocumentTarget] = useState<{ hbl: string; type: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const shipments = useQuery<Shipment[]>({
    queryKey: ["shipments"],
    queryFn: async () => (await api.get("/shipments")).data,
  });

  const createShipment = useMutation({
    mutationFn: async (form: FormData) => (await api.post("/shipments/isf", form)).data,
    onSuccess: (data: Shipment) => {
      setMessage(`Shipment ${data.hbl} created. The ISF is waiting for the Phase 2 filing automation.`);
      setIsfFile(null);
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
    },
    onError: (error: unknown) => setMessage(apiError(error, "Could not create the shipment.")),
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ hbl, type, file }: { hbl: string; type: string; file: File }) => {
      const form = new FormData();
      form.append("document_type", type);
      form.append("file", file);
      return (await api.post(`/shipments/${encodeURIComponent(hbl)}/documents`, form)).data;
    },
    onSuccess: (_data, variables) => {
      setMessage(`${labelFor(variables.type)} attached to ${variables.hbl}.`);
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
    },
    onError: (error: unknown) => setMessage(apiError(error, "Document upload failed.")),
  });

  function submitIsf(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isfFile) {
      setMessage("Select the ISF file before creating the shipment.");
      return;
    }
    const form = new FormData(event.currentTarget);
    form.append("file", isfFile);
    createShipment.mutate(form);
  }

  function chooseDocument(hbl: string, type: string) {
    setDocumentTarget({ hbl, type });
    documentRef.current?.click();
  }

  return (
    <div>
      <PageHeader title="Imports" subtitle="Create and track each import shipment by HBL." />

      <form onSubmit={submitIsf} className="border-y border-[#E2E8F0] bg-white py-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Field name="hbl" label="HBL" required />
          <Field name="client_email" label="Client email" type="email" required />
          <Field name="delivery_name" label="Delivery company" />
          <Field name="delivery_line1" label="Delivery address" required />
          <Field name="delivery_line2" label="Suite / unit" />
          <Field name="delivery_city" label="City" required />
          <Field name="delivery_state" label="State" required />
          <Field name="delivery_postal_code" label="ZIP code" required />
          <Field name="delivery_country" label="Country" defaultValue="US" required />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <input
            ref={isfRef}
            type="file"
            className="hidden"
            onChange={(event) => setIsfFile(event.target.files?.[0] ?? null)}
          />
          <button type="button" onClick={() => isfRef.current?.click()} className="inline-flex items-center gap-2 rounded-md border border-[#CBD5E1] px-3 py-2 text-sm font-medium text-[#334155]">
            <FileText className="h-4 w-4" /> {isfFile?.name ?? "Select ISF"}
          </button>
          <button disabled={createShipment.isPending} className="inline-flex items-center gap-2 rounded-md bg-[#0369A1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            <UploadCloud className="h-4 w-4" /> {createShipment.isPending ? "Creating..." : "Create shipment"}
          </button>
        </div>
      </form>

      {message && <div className="mt-4 border-l-4 border-[#0369A1] bg-[#F0F9FF] px-4 py-3 text-sm text-[#0C4A6E]">{message}</div>}

      <section className="mt-8">
        <h2 className="text-base font-semibold text-[#0F172A]">Shipments</h2>
        <div className="mt-3 overflow-hidden border-y border-[#E2E8F0] bg-white">
          {shipments.isLoading && <p className="p-5 text-sm text-[#64748B]">Loading shipments...</p>}
          {!shipments.isLoading && shipments.data?.length === 0 && <p className="p-5 text-sm text-[#64748B]">No import shipments yet.</p>}
          {shipments.data?.map((shipment) => (
            <div key={shipment.id} className="border-b border-[#E2E8F0] p-5 last:border-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Ship className="h-4 w-4 text-[#0369A1]" />
                    <p className="font-semibold text-[#0F172A]">{shipment.hbl}</p>
                  </div>
                  <p className="mt-1 text-sm text-[#64748B]">{statusLabels[shipment.status] ?? shipment.status.replaceAll("_", " ")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <DocumentButton label="Commercial invoice" onClick={() => chooseDocument(shipment.hbl, "commercial_invoice")} />
                  <DocumentButton label="Packing list" onClick={() => chooseDocument(shipment.hbl, "packing_list")} />
                  <DocumentButton label="Arrival notice" onClick={() => chooseDocument(shipment.hbl, "arrival_notice")} />
                </div>
              </div>
              {shipment.documents.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {shipment.documents.map((document) => (
                    <button key={document.id} onClick={() => downloadDocument(shipment.hbl, document)} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0369A1] hover:underline">
                      <Download className="h-3.5 w-3.5" /> {labelFor(document.document_type)}: {document.file_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <input
        ref={documentRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && documentTarget) uploadDocument.mutate({ ...documentTarget, file });
          event.target.value = "";
        }}
      />
    </div>
  );
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block text-xs font-semibold uppercase text-[#64748B]">
      {label}
      <input {...props} className="mt-1.5 w-full rounded-md border border-[#CBD5E1] px-3 py-2 text-sm font-normal normal-case text-[#0F172A] outline-none focus:border-[#0369A1]" />
    </label>
  );
}

function DocumentButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick} className="rounded-md border border-[#CBD5E1] px-2.5 py-1.5 text-xs font-medium text-[#334155] hover:bg-[#F8FAFC]">{label}</button>;
}

function labelFor(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function apiError(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "response" in error) {
    return (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? fallback;
  }
  return fallback;
}

async function downloadDocument(hbl: string, document: ShipmentDocument) {
  const response = await api.get(`/shipments/${encodeURIComponent(hbl)}/documents/${document.id}`, { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = document.file_name;
  anchor.click();
  URL.revokeObjectURL(url);
}
