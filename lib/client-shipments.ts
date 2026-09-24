import { api } from "@/lib/api";

export type ShipmentDocument = {
  id: number;
  document_type: string;
  file_name: string;
  file_size: number;
  created_at: string;
};
export type Shipment = {
  id: number;
  hbl: string;
  status: string;
  automation?: Record<string, Record<string, unknown>>;
  shipment_type: string | null;
  client_email: string | null;
  client_delivery_address: Record<string, string | null>;
  created_at: string;
  updated_at: string;
  isf_processed_at: string | null;
  document_request_due_at: string | null;
  documents: ShipmentDocument[];
  events: { id: number; title: string; event_type: string; created_at: string }[];
};
export const documentTypes = [
  { type: "isf", label: "ISF", description: "Starts your shipment" },
  { type: "commercial_invoice", label: "Commercial invoice", description: "Goods, quantities, and values" },
  { type: "packing_list", label: "Packing list", description: "Package and weight details" },
  { type: "arrival_notice", label: "Arrival notice", description: "Upload when your carrier provides it" },
];
export const statusLabels: Record<string, string> = {
  isf_automation_pending: "ISF processing",
  isf_automation_failed: "ISF needs team attention",
  isf_review_ready: "ISF ready for review",
  ftz_complete: "E214 complete (customs filing is separate)",
  ftz_header_saved: "E214 header saved; earlier stages pending",
  ftz_query_ready: "Manifest report ready; header pending",
  tally_in_review_required: "Tally-in needs team review",
  tally_in_ready_for_review: "Tally-in ready for team review",
  tally_in_pending: "Tally-in queued",
  tally_in_failed: "Tally-in needs team attention",
  ftz_automation_failed: "FTZ needs team attention",
  awaiting_documents: "Documents needed",
  documents_ready: "Documents ready for review",
  awaiting_classification: "Shipment under review",
  ftz_automation_pending: "FTZ processing",
  domestic_automation_pending: "Domestic entry approved",
};
export function statusLabel(shipment: Shipment) {
  return statusLabels[shipment.status] ?? shipment.status.replaceAll("_", " ");
}
export function missingDocuments(shipment: Shipment) {
  return documentTypes.filter(({ type }) => !shipment.documents.some((doc) => doc.document_type === type));
}
export function apiError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((item) => typeof item?.msg === "string" ? item.msg : "Check the form fields.").join(" ");
  }
  return fallback;
}
export function validateFile(file: File, type: string): string | null {
  if (!file.size) return "This file is empty. Please select a document with content.";
  if (file.size > 15 * 1024 * 1024) return "Files must be 15 MB or smaller.";
  const supported = type === "other" ? /\.(pdf|txt|csv|xlsx|xls|png|jpe?g|docx)$/i : /\.(pdf|txt|csv|xlsx)$/i;
  if (!supported.test(file.name)) return type === "other" ? "Choose a PDF, image, Word document, text file, or spreadsheet." : "Choose a PDF, TXT, CSV, or XLSX document.";
  return null;
}
export async function downloadDocument(hbl: string, document: ShipmentDocument) {
  const response = await api.get(`/shipments/${encodeURIComponent(hbl)}/documents/${document.id}`, { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = document.file_name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function uploadDocuments(hbl: string, uploads: { type: string; file: File }[]) {
  const failed: { type: string; file: File; error: string }[] = [];
  for (const { type, file } of uploads) {
    try {
      const form = new FormData();
      form.append("document_type", type);
      form.append("file", file);
      await api.post(`/shipments/${encodeURIComponent(hbl)}/documents`, form);
    } catch (error) {
      failed.push({ type, file, error: apiError(error, `${file.name} could not be uploaded.`) });
    }
  }
  return { failed };
}

// Client-facing progress. Internal system names (AceLynk, GoFreight, tally-in) stay on the operations side.
export function workflowStatuses(shipment: Shipment) {
  const state = (key: string) => {
    const status = shipment.automation?.[key]?.status;
    return typeof status === "string" ? status : "";
  };
  const describe = (status: string, waiting: string) => {
    if (status === "success") return { status: "Complete", done: true };
    if (["pending", "queued", "running"].includes(status)) return { status: "In progress", done: false };
    if (status) return { status: "Our team is handling this — nothing needed from you", done: false };
    return { status: waiting, done: false };
  };
  const isf = ["isf_acelynk", "isf_gofreight"].map(state);
  const isfStep = shipment.isf_processed_at || isf.every((value) => value === "success")
    ? { status: "Complete", done: true }
    : describe(isf.find((value) => value && value !== "success") ?? "queued", "In progress");
  const tally = shipment.automation?.tally_in?.new_documents_require_review ? { status: "Reviewing your new documents", done: false } : describe(state("tally_in"), "Waiting for your invoice and packing list");
  const header = ["ftz_complete", "ftz_header_saved", "domestic_complete"].includes(shipment.status)
    ? { status: "Complete — customs filing is handled separately", done: true }
    : describe(state("e214_entry_header"), shipment.documents.some((doc) => doc.document_type === "arrival_notice") ? "Details captured from your arrival notice" : "Waiting for your arrival notice");
  return [
    { label: "ISF filing", ...isfStep },
    { label: "Goods & packing details", ...tally },
    { label: "Entry header (E214)", ...header },
  ];
}
