"use client";

import { DragEvent, FormEvent, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Download,
  FileCheck2,
  FileSearch,
  FileText,
  Loader2,
  Mail,
  MapPin,
  RefreshCw,
  Ship,
  UploadCloud,
  Workflow,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { AcelynkLogEntry, AdminUser, ImportShipment, ShipmentDocument } from "@/lib/types";

type WorkflowDocumentType = "commercial_invoice" | "packing_list";
type MblSource = "isf" | "arrival_notice";

interface MblExtractionResult {
  source_file: string;
  source_document_reference: string;
  mbl: string | null;
  extraction_method: "deterministic" | "manual_required";
  ai_allowed: boolean;
  ai_attempted: boolean;
  extraction_receipt: string;
  warnings: string[];
}

const isfFileExtensions = new Set(["pdf", "xls", "xlsx", "xlsm", "csv", "txt"]);
const maxIsfFileSize = 15 * 1024 * 1024;

const steps = [
  { title: "ISF", description: "Acelynk and GoFreight", icon: Workflow },
  { title: "Invoice & packing list", description: "Required commercial documents", icon: FileText },
  { title: "Manifest query", description: "MBL and AceLynk query", icon: Ship },
  { title: "Entry filing", description: "FTZ query or domestic entry", icon: FileCheck2 },
];

export function shipmentCurrentStep(shipment: ImportShipment) {
  if (!shipment.isf_processed_at) return 0;
  const types = new Set(shipment.documents.map((document) => document.document_type));
  if (!types.has("commercial_invoice") || !types.has("packing_list")) return 1;
  if (!shipment.approved_at) return 2;
  if (!["ftz_complete", "domestic_complete"].includes(shipment.status)) return 3;
  return 4;
}

export function shipmentProgress(shipment: ImportShipment) {
  return Math.min(shipmentCurrentStep(shipment), steps.length);
}

export function NewShipmentModal({
  vendors,
  onClose,
  onCreated,
}: {
  vendors: AdminUser[];
  onClose: () => void;
  onCreated: (shipment: ImportShipment) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isfFile, setIsfFile] = useState<File | null>(null);
  const [isDraggingIsf, setIsDraggingIsf] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const createShipment = useMutation({
    mutationFn: async (form: FormData) => (await api.post("/shipments/isf", form)).data as ImportShipment,
    onSuccess: onCreated,
    onError: (error: unknown) => setMessage(apiError(error, "Could not create the shipment.")),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isfFile) {
      setMessage("Select the ISF file before creating the shipment.");
      return;
    }
    setMessage(null);
    const form = new FormData(event.currentTarget);
    form.append("file", isfFile);
    createShipment.mutate(form);
  }

  function chooseIsfFile(file: File | null) {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!isfFileExtensions.has(extension)) {
      setMessage("The ISF must be a PDF, XLS, XLSX, XLSM, CSV, or TXT file.");
      return;
    }
    if (file.size > maxIsfFileSize) {
      setMessage("The ISF file cannot be larger than 15 MB.");
      return;
    }
    setMessage(null);
    setIsfFile(file);
  }

  function dropIsfFile(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDraggingIsf(false);
    chooseIsfFile(event.dataTransfer.files?.[0] ?? null);
  }

  return (
    <ModalFrame
      title="New import shipment"
      subtitle="Step 1 of 4 · Upload the ISF to create the HBL workflow"
      onClose={onClose}
      width="max-w-2xl"
    >
      <form id="new-shipment-form" onSubmit={submit} className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
        <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
          The ISF starts the shipment and queues both Acelynk and GoFreight automatically.
        </div>
        <label className={labelClass}>
          Importer account
          <select name="importer_account" required className={fieldClass} defaultValue="">
            <option value="" disabled>Select client account</option>
            {vendors.filter((vendor) => vendor.role === "vendor" && vendor.importer_account).map((vendor) => (
              <option key={vendor.id} value={vendor.importer_account ?? ""}>
                {vendor.importer_account} · {vendor.email}
              </option>
            ))}
          </select>
        </label>
        <div>
          <p className={labelClass}>ISF document</p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.xls,.xlsx,.xlsm,.csv,.txt"
            className="hidden"
            onChange={(event) => chooseIsfFile(event.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDraggingIsf(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
              setIsDraggingIsf(true);
            }}
            onDragLeave={(event) => {
              if (event.currentTarget === event.target) setIsDraggingIsf(false);
            }}
            onDrop={dropIsfFile}
            className={`flex w-full items-center justify-between rounded-lg border border-dashed px-4 py-4 text-left transition-colors ${isDraggingIsf ? "border-[#087FA3] bg-cyan-50" : "border-[#AFC3CA] bg-[#F8FBFC] hover:border-[#087FA3]"}`}
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#087FA3] shadow-sm"><UploadCloud className="h-5 w-5" /></span>
              <span>
                <span className="block text-sm font-semibold text-[#203B46]">
                  {isDraggingIsf ? "Drop the ISF file here" : isfFile?.name ?? "Drop the ISF here or select a file"}
                </span>
                <span className="block text-xs text-[#71858D]">PDF, XLS, XLSX, XLSM, CSV, or TXT up to 15 MB</span>
              </span>
            </span>
            <span className="text-xs font-semibold text-[#087FA3]">Browse</span>
          </button>
        </div>
        {message && <AlertMessage message={message} />}
      </form>
      <ModalFooter>
        <button type="button" onClick={onClose} className={secondaryButtonClass}>Cancel</button>
        <button form="new-shipment-form" disabled={createShipment.isPending} className={primaryButtonClass}>
          {createShipment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Workflow className="h-4 w-4" />}
          {createShipment.isPending ? "Creating shipment..." : "Create shipment & start ISF"}
        </button>
      </ModalFooter>
    </ModalFrame>
  );
}

export function ShipmentWorkflowModal({
  shipment,
  onClose,
  onChanged,
}: {
  shipment: ImportShipment;
  onClose: () => void;
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const arrivalNoticeRef = useRef<HTMLInputElement>(null);
  const [activeStep, setActiveStep] = useState(Math.min(shipmentCurrentStep(shipment), steps.length - 1));
  const [uploadType, setUploadType] = useState<WorkflowDocumentType | null>(null);
  const [mblSource, setMblSource] = useState<MblSource | null>(null);
  const [arrivalNoticeFile, setArrivalNoticeFile] = useState<File | null>(null);
  const [mblExtraction, setMblExtraction] = useState<MblExtractionResult | null>(null);
  const [mblConfirmed, setMblConfirmed] = useState(false);
  const [masterBill, setMasterBill] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const encodedHbl = encodeURIComponent(shipment.hbl);
  const jobs = useQuery<AcelynkLogEntry[]>({
    queryKey: ["shipment-automation", shipment.hbl],
    queryFn: async () => (await api.get(`/manager/acelynk-log?identifier=${encodedHbl}&limit=50`)).data,
    refetchInterval: 10_000,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["shipment-automation", shipment.hbl] });
    onChanged();
  };
  const markProcessed = useMutation({
    mutationFn: () => api.post(`/shipments/${encodedHbl}/isf-processed`),
    onSuccess: () => {
      setMessage("ISF marked complete. Commercial documents are now the next step.");
      setActiveStep(1);
      refresh();
    },
    onError: (error: unknown) => setMessage(apiError(error, "Could not mark the ISF complete.")),
  });
  const uploadDocument = useMutation({
    mutationFn: async ({ type, file }: { type: WorkflowDocumentType; file: File }) => {
      const form = new FormData();
      form.append("document_type", type);
      form.append("file", file);
      return (await api.post(`/shipments/${encodedHbl}/documents`, form)).data as ImportShipment;
    },
    onSuccess: (_data, variables) => {
      setMessage(`${documentLabel(variables.type)} uploaded successfully.`);
      refresh();
    },
    onError: (error: unknown) => setMessage(apiError(error, "Document upload failed.")),
  });
  const classify = useMutation({
    mutationFn: (shipmentType: "ftz" | "domestic") => {
      if (shipmentType === "ftz" && !mblSource) {
        throw new Error("Select the E214 MBL source before queueing.");
      }
      const extractedCanonical = (mblExtraction?.mbl ?? "").replace(/\s+/g, "").toUpperCase();
      const extractedMethod = mblExtraction?.extraction_method;
      const extractionMethod = mblSource === "isf"
        ? "staff_entry"
        : extractedCanonical && extractedCanonical === masterBill.replace(/\s+/g, "").toUpperCase() && extractedMethod && extractedMethod !== "manual_required"
          ? extractedMethod
          : "staff_corrected";
      return api.patch(`/shipments/${encodedHbl}/classification`, {
        shipment_type: shipmentType,
        approve: true,
        mbl: shipmentType === "ftz" ? masterBill : undefined,
        mbl_source: shipmentType === "ftz" ? mblSource : undefined,
        mbl_extraction_method: shipmentType === "ftz" ? extractionMethod : undefined,
        staff_mbl_confirmed: shipmentType === "ftz" && mblSource === "arrival_notice" ? mblConfirmed : false,
        source_document_reference: shipmentType === "ftz" && mblSource === "arrival_notice" ? mblExtraction?.source_document_reference : undefined,
        ai_allowed_at_extraction: shipmentType === "ftz" && mblSource === "arrival_notice" ? mblExtraction?.ai_allowed : undefined,
        ai_attempted: shipmentType === "ftz" && mblSource === "arrival_notice" ? mblExtraction?.ai_attempted : undefined,
        extraction_receipt: shipmentType === "ftz" && mblSource === "arrival_notice" ? mblExtraction?.extraction_receipt : undefined,
      });
    },
    onSuccess: (_data, shipmentType) => {
      setMessage(shipmentType === "ftz" ? "FTZ classification saved. The E214 Manifest Query is queued for AceLynk." : "Domestic entry approved for the admin filing queue.");
      refresh();
    },
    onError: (error: unknown) => setMessage(apiError(error, "Could not approve the entry filing.")),
  });
  const extractManifestMbl = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      if (shipment.importer_account) form.append("importer_account", shipment.importer_account);
      form.append("extraction_context", `shipment:${shipment.id}`);
      return (await api.post("/upload/e214-manifest-query/extract-mbl", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })).data as MblExtractionResult;
    },
    onSuccess: (data) => {
      setMblExtraction(data);
      setMasterBill(data.mbl ?? "");
      setMblConfirmed(false);
      setMessage(data.mbl ? "MBL extracted. Review and confirm it before continuing." : "No MBL was identified automatically. Enter it below and confirm it.");
    },
    onError: (error: unknown) => {
      setMblExtraction(null);
      setMblConfirmed(false);
      setMessage(apiError(error, "The Arrival Notice could not be read."));
    },
  });
  const reprocess = useMutation({
    mutationFn: (logId: number) => api.post(`/manager/acelynk-log/${logId}/reprocess`),
    onSuccess: () => {
      setMessage("Automation was requeued. This modal will update as the cloud worker runs.");
      refresh();
    },
    onError: (error: unknown) => setMessage(apiError(error, "Could not reprocess the automation job.")),
  });

  const latestJob = (resourceType: string) => jobs.data?.find((job) => job.resource_type === resourceType) ?? null;
  const isfJobs = [latestJob("isf_acelynk"), latestJob("isf_gofreight")].filter(Boolean) as AcelynkLogEntry[];
  const e214Job = latestJob("e214_entry_header");
  const canonicalMasterBill = masterBill.replace(/\s+/g, "").toUpperCase();
  const masterBillValid = /^[A-Z]{4}[A-Z0-9]+$/.test(canonicalMasterBill);
  const manifestMblReady = Boolean(mblSource) && masterBillValid && (mblSource === "isf" || (Boolean(mblExtraction) && mblConfirmed));
  const progress = shipmentProgress(shipment);

  function chooseUpload(type: WorkflowDocumentType) {
    setUploadType(type);
    fileRef.current?.click();
  }

  return (
    <ModalFrame
      title={shipment.hbl}
      subtitle={`${shipment.importer_account ?? "No importer account"} · Admin shipment workflow`}
      onClose={onClose}
      width="max-w-6xl"
      headerAside={<StatusPill status={shipment.status} />}
    >
      <div className="grid min-h-0 flex-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-[#DDE6E9] bg-[#F7FAFB] p-4 lg:border-b-0 lg:border-r">
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs font-semibold text-[#607780]"><span>Workflow progress</span><span>{progress}/{steps.length}</span></div>
            <div className="mt-2 grid grid-cols-4 gap-1">
              {steps.map((step, index) => <span key={step.title} className={`h-1.5 rounded-full ${index < progress ? "bg-emerald-500" : index === shipmentCurrentStep(shipment) ? "bg-[#087FA3]" : "bg-[#D9E3E6]"}`} />)}
            </div>
          </div>
          <nav className="space-y-1.5">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const completed = index < progress;
              const active = index === activeStep;
              return (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => setActiveStep(index)}
                  className={`flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors ${active ? "bg-white text-[#142B35] shadow-sm ring-1 ring-[#DDE6E9]" : "text-[#607780] hover:bg-white/70"}`}
                >
                  <span className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${completed ? "bg-emerald-100 text-emerald-700" : active ? "bg-cyan-100 text-cyan-700" : "bg-[#E8EFF1] text-[#78909A]"}`}>
                    {completed ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{index + 1}. {step.title}</span>
                    <span className="mt-0.5 block text-xs font-normal text-[#7B9098]">{step.description}</span>
                  </span>
                </button>
              );
            })}
          </nav>
          <div className="mt-5 space-y-2 border-t border-[#DDE6E9] pt-4 text-xs text-[#607780]">
            <MetaLine icon={<Mail className="h-3.5 w-3.5" />} value={shipment.client_email ?? "No client email"} />
            <MetaLine icon={<MapPin className="h-3.5 w-3.5" />} value={formatAddress(shipment.client_delivery_address)} />
          </div>
        </aside>

        <main className="min-h-0 overflow-y-auto p-5 sm:p-6">
          {message && <div className="mb-5"><AlertMessage message={message} /></div>}
          {activeStep === 0 && (
            <StepSection title="ISF processing" description="Confirm both cloud automations, then complete the ISF step for this shipment.">
              <DocumentSlot
                title="ISF document"
                document={latestDocument(shipment, "isf")}
                onDownload={(document) => downloadDocument(shipment.hbl, document, setMessage)}
              />
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <AutomationCard title="Acelynk ISF" job={latestJob("isf_acelynk")} loading={jobs.isLoading} onRetry={(logId) => reprocess.mutate(logId)} />
                <AutomationCard title="GoFreight ISF" job={latestJob("isf_gofreight")} loading={jobs.isLoading} onRetry={(logId) => reprocess.mutate(logId)} />
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#DDE6E9] bg-[#F8FAFC] px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-[#203B46]">{shipment.isf_processed_at ? "ISF step completed" : isfJobs.length === 2 && isfJobs.every((job) => job.status === "success") ? "Automation complete—ready for admin review" : "Review the automation results before continuing"}</p>
                  <p className="mt-0.5 text-xs text-[#71858D]">Completing this step starts the commercial-document stage.</p>
                </div>
                {!shipment.isf_processed_at && (
                  <button type="button" onClick={() => markProcessed.mutate()} disabled={markProcessed.isPending} className={primaryButtonClass}>
                    {markProcessed.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Mark ISF complete
                  </button>
                )}
              </div>
            </StepSection>
          )}

          {activeStep === 1 && (
            <StepSection title="Commercial documents" description="Attach both the commercial invoice and packing list before the manifest-query stage.">
              <div className="grid gap-4 md:grid-cols-2">
                <DocumentSlot
                  title="Commercial invoice"
                  document={latestDocument(shipment, "commercial_invoice")}
                  onUpload={() => chooseUpload("commercial_invoice")}
                  onDownload={(document) => downloadDocument(shipment.hbl, document, setMessage)}
                  busy={uploadDocument.isPending && uploadType === "commercial_invoice"}
                />
                <DocumentSlot
                  title="Packing list"
                  document={latestDocument(shipment, "packing_list")}
                  onUpload={() => chooseUpload("packing_list")}
                  onDownload={(document) => downloadDocument(shipment.hbl, document, setMessage)}
                  busy={uploadDocument.isPending && uploadType === "packing_list"}
                />
              </div>
              {latestDocument(shipment, "commercial_invoice") && latestDocument(shipment, "packing_list") && (
                <NextStepButton onClick={() => setActiveStep(2)}>Continue to manifest query</NextStepButton>
              )}
            </StepSection>
          )}

          {activeStep === 2 && (
            <StepSection title="E214 Manifest Query" description="Choose the MBL source. The first four letters become the SCAC and the remaining characters become the bill number.">
              <div className="mb-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={mblSource === "isf"}
                  onClick={() => {
                    setMblSource("isf");
                    setMasterBill("");
                    setArrivalNoticeFile(null);
                    setMblExtraction(null);
                    setMblConfirmed(false);
                  }}
                  className={`rounded-lg border px-4 py-4 text-left ${mblSource === "isf" ? "border-[#087FA3] bg-cyan-50 ring-1 ring-[#087FA3]" : "border-[#DDE6E9] bg-white hover:border-[#87AAB5]"}`}
                >
                  <span className="block text-sm font-bold text-[#203B46]">ISF / MBL available</span>
                  <span className="mt-1 block text-xs text-[#607780]">Enter the MBL already available to staff.</span>
                </button>
                <button
                  type="button"
                  aria-pressed={mblSource === "arrival_notice"}
                  onClick={() => {
                    setMblSource("arrival_notice");
                    setMasterBill("");
                    setArrivalNoticeFile(null);
                    setMblExtraction(null);
                    setMblConfirmed(false);
                  }}
                  className={`rounded-lg border px-4 py-4 text-left ${mblSource === "arrival_notice" ? "border-[#087FA3] bg-cyan-50 ring-1 ring-[#087FA3]" : "border-[#DDE6E9] bg-white hover:border-[#87AAB5]"}`}
                >
                  <span className="block text-sm font-bold text-[#203B46]">No ISF — use Arrival Notice</span>
                  <span className="mt-1 block text-xs text-[#607780]">Extract only the MBL and require staff confirmation.</span>
                </button>
              </div>
              {mblSource === "arrival_notice" && (
                <div className="mb-5 rounded-lg border border-[#DDE6E9] bg-[#F8FAFC] p-4">
                  <input
                    ref={arrivalNoticeRef}
                    type="file"
                    accept=".pdf,.txt,.text,.csv,.xlsx"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      if (!file) return;
                      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
                      if (!["pdf", "txt", "text", "csv", "xlsx"].includes(extension)) {
                        setMessage("Arrival Notice must be a PDF, TXT, CSV, or XLSX file.");
                        return;
                      }
                      if (file.size > 15 * 1024 * 1024) {
                        setMessage("Arrival Notice cannot be larger than 15 MB.");
                        return;
                      }
                      setArrivalNoticeFile(file);
                      setMblExtraction(null);
                      setMblConfirmed(false);
                      setMasterBill("");
                      setMessage(null);
                    }}
                  />
                  <p className="text-sm font-bold text-[#203B46]">Arrival Notice MBL source</p>
                  <p className="mt-1 text-xs leading-5 text-[#607780]">Uploading only proposes an MBL. It cannot queue AceLynk or click Get Report.</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => arrivalNoticeRef.current?.click()} className={secondaryButtonClass}><UploadCloud className="h-4 w-4" />{arrivalNoticeFile ? "Change file" : "Select Arrival Notice"}</button>
                    {arrivalNoticeFile && <span className="max-w-xs truncate text-xs text-[#607780]">{arrivalNoticeFile.name}</span>}
                    <button type="button" onClick={() => arrivalNoticeFile && extractManifestMbl.mutate(arrivalNoticeFile)} disabled={!arrivalNoticeFile || extractManifestMbl.isPending} className={primaryButtonClass}>
                      {extractManifestMbl.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
                      {extractManifestMbl.isPending ? "Finding MBL..." : "Extract MBL"}
                    </button>
                  </div>
                  {mblExtraction && (
                    <div className="mt-3 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-3 text-xs leading-5 text-cyan-950">
                      <p className="font-bold">{mblExtraction.extraction_method === "deterministic" ? "Local non-AI MBL extraction" : "Manual MBL entry required"}</p>
                      <p>This Manifest Query step never sends the Arrival Notice or its contents to an AI model.</p>
                      {mblExtraction.warnings.map((warning) => <p key={warning} className="mt-1 text-amber-800">{warning}</p>)}
                    </div>
                  )}
                </div>
              )}
              {mblSource && <>
              <label className={labelClass}>
                Master Bill of Lading (MBL)
                <input
                  value={masterBill}
                  onChange={(event) => {
                    setMasterBill(event.target.value);
                    if (mblSource === "arrival_notice") setMblConfirmed(false);
                  }}
                  placeholder="OOLU12345678"
                  className={fieldClass}
                />
              </label>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-[#DDE6E9] bg-[#F8FAFC] px-4 py-3"><p className="text-[10px] font-bold uppercase text-[#71858D]">SCAC</p><p className="mt-1 font-mono text-sm font-bold text-[#203B46]">{canonicalMasterBill.slice(0, 4) || "—"}</p></div>
                <div className="rounded-lg border border-[#DDE6E9] bg-[#F8FAFC] px-4 py-3"><p className="text-[10px] font-bold uppercase text-[#71858D]">Bill number</p><p className="mt-1 font-mono text-sm font-bold text-[#203B46]">{canonicalMasterBill.slice(4) || "—"}</p></div>
              </div>
              <p className={`mt-3 text-xs ${masterBill && !masterBillValid ? "text-amber-700" : "text-[#71858D]"}`}>{masterBill && !masterBillValid ? "Use four SCAC letters followed by letters or numbers only." : mblSource === "arrival_notice" ? "Review the extracted value against the Arrival Notice before confirming." : "The MBL will be used only for the Manifest Query."}</p>
              {mblSource === "arrival_notice" && mblExtraction && (
                <label className="mt-4 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
                  <input type="checkbox" checked={mblConfirmed} onChange={(event) => setMblConfirmed(event.target.checked)} disabled={!masterBillValid} className="mt-0.5 h-4 w-4" />
                  <span><strong>I reviewed the Arrival Notice and confirm this MBL.</strong><span className="mt-0.5 block text-xs">Editing the MBL clears this confirmation.</span></span>
                </label>
              )}
              </>}
              {manifestMblReady && <NextStepButton onClick={() => setActiveStep(3)}>Continue to entry filing</NextStepButton>}
            </StepSection>
          )}

          {activeStep === 3 && (
            <StepSection title="Entry filing" description="Classify the shipment and approve the correct customs workflow from the admin side.">
              {!shipment.approved_at ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <ApprovalCard
                    title="FTZ shipment"
                    description="Queue a Surface Bill of Lading Status query in AceLynk using the MBL."
                    action="Save FTZ & queue query"
                    primary
                    disabled={!manifestMblReady || classify.isPending}
                    onClick={() => classify.mutate("ftz")}
                  />
                  <ApprovalCard
                    title="Domestic shipment"
                    description="Approve the domestic 7501 workflow for admin processing."
                    action="Approve domestic entry"
                    disabled={!latestDocument(shipment, "arrival_notice") || classify.isPending}
                    onClick={() => classify.mutate("domestic")}
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-[#DDE6E9] bg-[#F8FAFC] px-4 py-4">
                  <p className="text-sm font-semibold text-[#203B46]">Approved as {shipment.shipment_type?.toUpperCase()}</p>
                  <p className="mt-1 text-xs text-[#71858D]">Approved by {shipment.approved_by_email ?? "admin"}{shipment.approved_at ? ` on ${new Date(shipment.approved_at).toLocaleString()}` : ""}</p>
                </div>
              )}
              {shipment.shipment_type === "ftz" && (
                <div className="mt-5">
                  <AutomationCard title="AceLynk E214 Manifest Query" job={e214Job} loading={jobs.isLoading} />
                </div>
              )}
              {shipment.shipment_type === "domestic" && (
                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Domestic 7501 automation is not yet connected. The approval is recorded for admin processing.
                </div>
              )}
            </StepSection>
          )}

          <details className="mt-8 border-t border-[#DDE6E9] pt-5">
            <summary className="cursor-pointer text-xs font-bold uppercase text-[#607780]">Shipment activity ({shipment.events.length})</summary>
            <div className="mt-4 border-l border-[#C9D7DB] pl-4">
              {shipment.events.map((event) => (
                <div key={event.id} className="mb-4 last:mb-0">
                  <p className="text-sm font-semibold text-[#203B46]">{event.title}</p>
                  <p className="text-xs text-[#8A9BA2]">{new Date(event.created_at).toLocaleString()}{event.actor_email ? ` · ${event.actor_email}` : ""}</p>
                  {event.description && <p className="mt-1 text-xs text-[#607780]">{event.description}</p>}
                </div>
              ))}
            </div>
          </details>
        </main>
      </div>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && uploadType) uploadDocument.mutate({ type: uploadType, file });
          event.target.value = "";
        }}
      />
      <ModalFooter>
        <span className="mr-auto text-xs text-[#71858D]">Live automation status refreshes every 10 seconds.</span>
        <button type="button" onClick={onClose} className={secondaryButtonClass}>Close</button>
      </ModalFooter>
    </ModalFrame>
  );
}

function ModalFrame({
  title,
  subtitle,
  onClose,
  width,
  headerAside,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  width: string;
  headerAside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close modal" onClick={onClose} className="absolute inset-0 bg-[#071A22]/55 backdrop-blur-[1px]" />
      <div className={`relative flex max-h-[92vh] w-full ${width} flex-col overflow-hidden rounded-xl bg-white shadow-2xl`}>
        <header className="flex items-start justify-between gap-4 border-b border-[#DDE6E9] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3"><h2 className="truncate text-lg font-bold text-[#142B35]">{title}</h2>{headerAside}</div>
            <p className="mt-1 text-xs text-[#607780]">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-[#78909A] hover:bg-[#EDF3F4] hover:text-[#203B46]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-[#DDE6E9] bg-[#F8FAFC] px-5 py-4 sm:px-6">{children}</footer>;
}

function StepSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-lg font-bold text-[#142B35]">{title}</h3>
      <p className="mt-1 text-sm text-[#607780]">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function DocumentSlot({
  title,
  document,
  onUpload,
  onDownload,
  busy,
}: {
  title: string;
  document: ShipmentDocument | null;
  onUpload?: () => void;
  onDownload: (document: ShipmentDocument) => void;
  busy?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${document ? "border-emerald-200 bg-emerald-50/60" : "border-dashed border-[#B8C9CE] bg-[#FAFCFC]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${document ? "bg-emerald-100 text-emerald-700" : "bg-[#EAF1F3] text-[#607780]"}`}>
            {document ? <CheckCircle2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#203B46]">{title}</p>
            <p className="mt-0.5 truncate text-xs text-[#71858D]">{document?.file_name ?? "No document attached"}</p>
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          {document && <button type="button" onClick={() => onDownload(document)} className={iconButtonClass} title="Download"><Download className="h-4 w-4" /></button>}
          {onUpload && <button type="button" onClick={onUpload} disabled={busy} className={secondaryButtonClass}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}{document ? "Replace" : "Upload"}</button>}
        </div>
      </div>
    </div>
  );
}

function AutomationCard({
  title,
  job,
  loading,
  onRetry,
}: {
  title: string;
  job: AcelynkLogEntry | null;
  loading: boolean;
  onRetry?: (logId: number) => void;
}) {
  const status = job?.status ?? "not_queued";
  const manifest = isManifestQueryJob(job);
  const meta = manifest ? manifestAutomationStatus(job) : automationStatus(status);
  const StatusIcon = meta.icon;
  const details = objectValue(job?.details);
  const query = objectValue(details?.manifest_query);
  const manifestMbl = textValue(query?.mbl) ?? textValue(details?.masked_mbl);
  const safeSummary = textValue(details?.safe_response_summary) ?? textValue(details?.safe_error_summary);
  return (
    <div className={`rounded-lg border p-4 ${meta.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`flex h-8 w-8 items-center justify-center rounded-full ${meta.iconTone}`}><StatusIcon className={`h-4 w-4 ${status === "pending" ? "animate-pulse" : ""}`} /></span>
          <div>
            <p className="text-sm font-semibold text-[#203B46]">{title}</p>
            <p className={`mt-0.5 text-xs font-semibold ${meta.text}`}>{loading ? "Loading..." : meta.label}</p>
          </div>
        </div>
        {job?.status === "failed" && onRetry && <button type="button" onClick={() => onRetry(job.id)} className={secondaryButtonClass}><RefreshCw className="h-4 w-4" />Retry</button>}
      </div>
      {manifest && job && (
        <div className="mt-3 grid gap-2 rounded-md border border-white/80 bg-white/70 px-3 py-3 text-xs sm:grid-cols-2">
          <div><span className="font-semibold text-[#607780]">MBL</span><p className="mt-0.5 font-mono font-bold text-[#203B46]">{manifestMbl ?? "Not recorded"}</p></div>
          <div><span className="font-semibold text-[#607780]">Query state</span><p className="mt-0.5 font-semibold text-[#203B46]">{meta.label}</p></div>
        </div>
      )}
      {(safeSummary || job?.error_message) && <p className={`mt-3 rounded-md bg-white/70 px-3 py-2 text-xs ${job?.status === "failed" ? "text-rose-700" : "text-[#506872]"}`}>{safeSummary ?? job?.error_message}</p>}
      {job && <p className="mt-3 text-[11px] text-[#7B9098]">Job #{job.id}{manifest && textValue(details?.workflow_state) ? ` · ${textValue(details?.workflow_state)}` : ""}{job.retried_count ? ` · ${job.retried_count} retr${job.retried_count === 1 ? "y" : "ies"}` : ""}</p>}
    </div>
  );
}

function ApprovalCard({ title, description, action, onClick, disabled, primary }: { title: string; description: string; action: string; onClick: () => void; disabled: boolean; primary?: boolean }) {
  return (
    <div className="rounded-lg border border-[#DDE6E9] p-5">
      <p className="text-base font-bold text-[#203B46]">{title}</p>
      <p className="mt-2 min-h-10 text-sm text-[#607780]">{description}</p>
      <button type="button" onClick={onClick} disabled={disabled} className={`mt-5 ${primary ? primaryButtonClass : secondaryButtonClass}`}>{action}</button>
    </div>
  );
}

function NextStepButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <div className="mt-6 flex justify-end"><button type="button" onClick={onClick} className={primaryButtonClass}>{children}</button></div>;
}

function AlertMessage({ message }: { message: string }) {
  return <div className="border-l-4 border-[#087FA3] bg-[#F0F9FF] px-4 py-3 text-sm text-[#0C4A6E]">{message}</div>;
}

function StatusPill({ status }: { status: string }) {
  const failed = status.includes("failed");
  const complete = status.includes("complete");
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${failed ? "bg-rose-100 text-rose-700" : complete ? "bg-emerald-100 text-emerald-700" : "bg-cyan-100 text-cyan-800"}`}>{statusLabel(status)}</span>;
}

function MetaLine({ icon, value }: { icon: React.ReactNode; value: string }) {
  return <div className="flex items-start gap-2"><span className="mt-0.5 text-[#87A0A8]">{icon}</span><span className="break-words">{value}</span></div>;
}

function latestDocument(shipment: ImportShipment, type: string) {
  return shipment.documents.find((document) => document.document_type === type) ?? null;
}

function automationStatus(status: string) {
  if (status === "success") return { label: "Completed", icon: CheckCircle2, card: "border-emerald-200 bg-emerald-50/60", iconTone: "bg-emerald-100 text-emerald-700", text: "text-emerald-700" };
  if (status === "failed") return { label: "Needs attention", icon: AlertTriangle, card: "border-rose-200 bg-rose-50/60", iconTone: "bg-rose-100 text-rose-700", text: "text-rose-700" };
  if (status === "pending") return { label: "Cloud worker running", icon: Clock3, card: "border-amber-200 bg-amber-50/60", iconTone: "bg-amber-100 text-amber-700", text: "text-amber-700" };
  return { label: "Not queued", icon: Circle, card: "border-[#DDE6E9] bg-[#F8FAFC]", iconTone: "bg-[#E8EFF1] text-[#78909A]", text: "text-[#71858D]" };
}

function isManifestQueryJob(job: AcelynkLogEntry | null): boolean {
  return textValue(objectValue(job?.details)?.source) === "e214_manifest_query";
}

function manifestAutomationStatus(job: AcelynkLogEntry | null) {
  const state = textValue(objectValue(job?.details)?.workflow_state);
  const states = {
    "CRM-MQ-READY": { label: "Queued", icon: Clock3, card: "border-amber-200 bg-amber-50/60", iconTone: "bg-amber-100 text-amber-700", text: "text-amber-700" },
    "CRM-MQ-IN-PROGRESS": { label: "Running", icon: Clock3, card: "border-cyan-200 bg-cyan-50/60", iconTone: "bg-cyan-100 text-cyan-700", text: "text-cyan-700" },
    "CRM-MQ-RESULT-AVAILABLE": { label: "Report ready", icon: CheckCircle2, card: "border-emerald-200 bg-emerald-50/60", iconTone: "bg-emerald-100 text-emerald-700", text: "text-emerald-700" },
    "CRM-MQ-NO-MATCH": { label: "No match", icon: Circle, card: "border-slate-200 bg-slate-50/70", iconTone: "bg-slate-200 text-slate-700", text: "text-slate-700" },
    "CRM-MQ-REJECTED": { label: "Rejected", icon: AlertTriangle, card: "border-rose-200 bg-rose-50/60", iconTone: "bg-rose-100 text-rose-700", text: "text-rose-700" },
    "CRM-MQ-OUTCOME-UNKNOWN": { label: "Needs human review", icon: AlertTriangle, card: "border-orange-200 bg-orange-50/70", iconTone: "bg-orange-100 text-orange-700", text: "text-orange-700" },
    "CRM-MQ-HUMAN-TAKEOVER": { label: "Human takeover required", icon: AlertTriangle, card: "border-orange-200 bg-orange-50/70", iconTone: "bg-orange-100 text-orange-700", text: "text-orange-700" },
    "CRM-MQ-SKIPPED-EXISTING": { label: "Already queried", icon: CheckCircle2, card: "border-emerald-200 bg-emerald-50/60", iconTone: "bg-emerald-100 text-emerald-700", text: "text-emerald-700" },
    "CRM-MQ-VALIDATION-FAILED": { label: "Invalid query", icon: AlertTriangle, card: "border-rose-200 bg-rose-50/60", iconTone: "bg-rose-100 text-rose-700", text: "text-rose-700" },
  } as const;
  return state && state in states
    ? states[state as keyof typeof states]
    : automationStatus(job?.status ?? "not_queued");
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function textValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    isf_automation_pending: "ISF automation running",
    isf_automation_failed: "ISF automation failed",
    isf_review_ready: "ISF ready for review",
    awaiting_documents: "Awaiting commercial documents",
    documents_ready: "Commercial documents ready",
    awaiting_classification: "Ready for manifest query",
    ftz_automation_pending: "E214 Manifest Query running",
    ftz_automation_failed: "E214 Manifest Query needs review",
    ftz_complete: "E214 Manifest Query complete",
    domestic_automation_pending: "Domestic filing approved",
  };
  return labels[status] ?? status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function documentLabel(type: string) {
  return type.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatAddress(address: Record<string, string | null>) {
  const street = [address.line1, address.line2].filter(Boolean).join(", ");
  const locality = [address.city, address.state, address.postal_code].filter(Boolean).join(" ");
  return [address.name, street, locality, address.country].filter(Boolean).join(" · ") || "No delivery address";
}

function apiError(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "response" in error) {
    return (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? fallback;
  }
  return fallback;
}

async function downloadDocument(hbl: string, document: ShipmentDocument, setMessage: (message: string) => void) {
  try {
    const response = await api.get(`/shipments/${encodeURIComponent(hbl)}/documents/${document.id}`, { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = document.file_name;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    setMessage(apiError(error, "Could not download the document."));
  }
}

const labelClass = "block text-xs font-bold uppercase text-[#607780]";
const fieldClass = "mt-1.5 h-10 w-full rounded-md border border-[#C9D7DB] bg-white px-3 text-sm font-normal normal-case text-[#142B35] outline-none focus:border-[#087FA3]";
const primaryButtonClass = "inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-[#087FA3] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#076C8B] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass = "inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-[#C9D7DB] bg-white px-3.5 py-2 text-sm font-semibold text-[#334E58] hover:bg-[#F1F6F7] disabled:cursor-not-allowed disabled:opacity-50";
const iconButtonClass = "inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#C9D7DB] bg-white text-[#4D6872] hover:bg-[#F1F6F7]";
