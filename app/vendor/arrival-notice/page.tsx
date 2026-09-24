"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, FileSearch, Loader2, Search, ShieldCheck, UploadCloud, X } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";

type MblSource = "isf" | "arrival_notice";

interface ManifestQueryResult {
  logId: number;
  importerAccount: string | null;
  mbl: string;
  scac: string;
  billNumber: string;
  queryType: string;
  limitResults: string;
  workflowState: string;
  mblSource: MblSource;
  duplicate: boolean;
  headerSaveRequested: boolean;
}

interface MblExtractionResult {
  source_file: string;
  source_document_reference: string;
  mbl: string | null;
  scac: string | null;
  bill_of_lading_number: string | null;
  extraction_method: "deterministic" | "manual_required";
  ai_allowed: boolean;
  ai_attempted: boolean;
  extraction_receipt: string;
  requires_confirmation: boolean;
  warnings: string[];
}

type ArrivalNoticeBatchOutcome = "queued" | "duplicate" | "failed" | "rejected";

interface ArrivalNoticeBatchItem {
  source_file: string;
  outcome: ArrivalNoticeBatchOutcome;
  log_id: number | null;
  identifier: string | null;
  importer_account: string | null;
  missing_fields: string[];
  error: string | null;
}

interface ArrivalNoticeBatchResult {
  queued_count: number;
  duplicate_count: number;
  failed_count: number;
  rejected_count: number;
  items: ArrivalNoticeBatchItem[];
}

const ARRIVAL_NOTICE_EXTENSIONS = ["pdf", "txt", "text", "csv", "xlsx"];
const MAX_ARRIVAL_NOTICE_SIZE = 15 * 1024 * 1024;
const MAX_ARRIVAL_NOTICE_BATCH = 25;

function canonicalMbl(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function apiError(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "response" in error) {
    const detail = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

export default function E214ManifestQueryPage() {
  const arrivalInputRef = useRef<HTMLInputElement>(null);
  const arrivalBatchInputRef = useRef<HTMLInputElement>(null);
  const workflowRecordRef = useRef("");
  const [source, setSource] = useState<MblSource | null>(null);
  const [arrivalFile, setArrivalFile] = useState<File | null>(null);
  const [arrivalBatchFiles, setArrivalBatchFiles] = useState<File[]>([]);
  const [extraction, setExtraction] = useState<MblExtractionResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [mbl, setMbl] = useState("");
  const [result, setResult] = useState<ManifestQueryResult | null>(null);
  const [batchResult, setBatchResult] = useState<ArrivalNoticeBatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canonical = useMemo(() => canonicalMbl(mbl), [mbl]);
  const valid = /^[A-Z]{4}[A-Z0-9]+$/.test(canonical);
  const arrivalReady = source === "isf" || (source === "arrival_notice" && Boolean(extraction) && confirmed);

  const extractMbl = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("extraction_context", `standalone:${workflowRecordRef.current}`);
      return (await api.post("/upload/e214-manifest-query/extract-mbl", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })).data as MblExtractionResult;
    },
    onSuccess: (data) => {
      setExtraction(data);
      setMbl(data.mbl ?? "");
      setConfirmed(false);
      setError(null);
      setResult(null);
    },
    onError: (err: unknown) => {
      setExtraction(null);
      setConfirmed(false);
      setError(apiError(err, "The Arrival Notice could not be read."));
    },
  });

  const queueQuery = useMutation({
    mutationFn: async () => {
      if (!source) throw new Error("Select the MBL source before queueing.");
      const extractedCanonical = canonicalMbl(extraction?.mbl ?? "");
      const extractedMethod = extraction?.extraction_method;
      const extractionMethod = source === "isf"
        ? "staff_entry"
        : extractedCanonical && extractedCanonical === canonical && extractedMethod && extractedMethod !== "manual_required"
          ? extractedMethod
          : "staff_corrected";
      const response = await api.post("/upload/e214-manifest-query", {
        mbl,
        crm_record_id: source === "arrival_notice" ? workflowRecordRef.current : undefined,
        mbl_source: source,
        extraction_method: extractionMethod,
        staff_mbl_confirmed: source === "arrival_notice" ? confirmed : false,
        source_document_reference: source === "arrival_notice" ? extraction?.source_document_reference : undefined,
        ai_allowed_at_extraction: source === "arrival_notice" ? extraction?.ai_allowed : undefined,
        ai_attempted: source === "arrival_notice" ? extraction?.ai_attempted : undefined,
        extraction_receipt: source === "arrival_notice" ? extraction?.extraction_receipt : undefined,
        save_header_after_query: source === "arrival_notice",
      });
      return {
        logId: response.data.log_id,
        importerAccount: response.data.importer_account,
        mbl: response.data.mbl,
        scac: response.data.scac,
        billNumber: response.data.bill_of_lading_number,
        queryType: response.data.query_type,
        limitResults: response.data.limit_results,
        workflowState: response.data.workflow_state,
        mblSource: response.data.mbl_source,
        duplicate: response.data.duplicate,
        headerSaveRequested: response.data.header_save_requested === true,
      } as ManifestQueryResult;
    },
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      setMbl("");
      setArrivalFile(null);
      setExtraction(null);
      setConfirmed(false);
      workflowRecordRef.current = "";
    },
    onError: (err: unknown) => {
      setResult(null);
      setError(apiError(err, "The E214 Manifest Query could not be queued."));
    },
  });

  const queueArrivalNoticeBatch = useMutation({
    mutationFn: async (files: File[]) => {
      const form = new FormData();
      for (const file of files) form.append("files", file);
      return (await api.post("/upload/arrival-notice/e214/batch", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })).data as ArrivalNoticeBatchResult;
    },
    onSuccess: (data) => {
      setBatchResult(data);
      setArrivalBatchFiles([]);
      setError(null);
      setResult(null);
      if (arrivalBatchInputRef.current) arrivalBatchInputRef.current.value = "";
    },
    onError: (err: unknown) => {
      setBatchResult(null);
      setError(apiError(err, "The Arrival Notice batch could not be queued."));
    },
  });

  function changeSource(nextSource: MblSource) {
    setSource(nextSource);
    setMbl("");
    setArrivalFile(null);
    setArrivalBatchFiles([]);
    setExtraction(null);
    setConfirmed(false);
    setError(null);
    setResult(null);
    setBatchResult(null);
    workflowRecordRef.current = "";
  }

  function chooseArrivalFile(file: File | null) {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ARRIVAL_NOTICE_EXTENSIONS.includes(extension)) {
      setError("Arrival Notice must be a PDF, TXT, CSV, or XLSX file.");
      return;
    }
    if (file.size > MAX_ARRIVAL_NOTICE_SIZE) {
      setError("Arrival Notice cannot be larger than 15 MB.");
      return;
    }
    setArrivalFile(file);
    if (!workflowRecordRef.current) workflowRecordRef.current = crypto.randomUUID();
    setExtraction(null);
    setConfirmed(false);
    setMbl("");
    setError(null);
    setResult(null);
  }

  function chooseArrivalNoticeBatch(files: FileList | null) {
    const selected = Array.from(files ?? []);
    if (!selected.length) return;
    if (selected.length > MAX_ARRIVAL_NOTICE_BATCH) {
      setError(`Select no more than ${MAX_ARRIVAL_NOTICE_BATCH} Arrival Notices at once.`);
      return;
    }
    const invalid = selected.find((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      return !ARRIVAL_NOTICE_EXTENSIONS.includes(extension) || file.size > MAX_ARRIVAL_NOTICE_SIZE;
    });
    if (invalid) {
      setError(`${invalid.name} must be a PDF, TXT, CSV, or XLSX file no larger than 15 MB.`);
      return;
    }
    setArrivalBatchFiles(selected);
    setBatchResult(null);
    setError(null);
    setResult(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!source) {
      setError("Choose whether the MBL comes from an ISF or an Arrival Notice.");
      return;
    }
    if (!valid) {
      setError("Enter an MBL with a four-letter SCAC followed by the bill of lading number.");
      return;
    }
    if (!arrivalReady) {
      setError("Upload the Arrival Notice, review the MBL, and confirm it before queueing.");
      return;
    }
    setError(null);
    queueQuery.mutate();
  }

  return (
    <div>
      <PageHeader
        title="E214 Headers & Manifest Query"
        subtitle="Upload an Arrival Notice to query, validate, and save an E214 Header. ISF / manual MBL requests run a query only. E214 Submit is never performed."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form onSubmit={submit} className="rounded-lg border border-[#DDE6E9] bg-white p-6 shadow-sm">
          <fieldset>
            <legend className="text-sm font-bold text-[#203B46]">1. Where is the MBL coming from?</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={source === "isf"}
                onClick={() => changeSource("isf")}
                className={`rounded-lg border px-4 py-4 text-left ${source === "isf" ? "border-[#087FA3] bg-cyan-50 ring-1 ring-[#087FA3]" : "border-[#D5E2E5] hover:border-[#87AAB5]"}`}
              >
                <span className="block text-sm font-bold text-[#203B46]">ISF / MBL already available</span>
                <span className="mt-1 block text-xs leading-5 text-[#607780]">Enter or paste the MBL from the ISF. Query only; no Header Save.</span>
              </button>
              <button
                type="button"
                aria-pressed={source === "arrival_notice"}
                onClick={() => changeSource("arrival_notice")}
                className={`rounded-lg border px-4 py-4 text-left ${source === "arrival_notice" ? "border-[#087FA3] bg-cyan-50 ring-1 ring-[#087FA3]" : "border-[#D5E2E5] hover:border-[#87AAB5]"}`}
              >
                <span className="block text-sm font-bold text-[#203B46]">No ISF — use Arrival Notice</span>
                <span className="mt-1 block text-xs leading-5 text-[#607780]">Extract MBL, optional HBL, quantity, and containers without AI; then create a validated Header from Queries V2.</span>
              </button>
            </div>
          </fieldset>

          {source === "arrival_notice" && (
            <section className="mt-6 rounded-lg border border-[#DDE6E9] bg-[#F8FAFC] p-4">
              <h2 className="text-sm font-bold text-[#203B46]">2. Upload the Arrival Notice</h2>
              <p className="mt-1 text-xs leading-5 text-[#607780]">This step only proposes an MBL. It cannot queue the query or click Get Report.</p>
              <input
                ref={arrivalInputRef}
                type="file"
                accept=".pdf,.txt,.text,.csv,.xlsx"
                className="hidden"
                onChange={(event) => chooseArrivalFile(event.target.files?.[0] ?? null)}
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => arrivalInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-md border border-[#B9C9CE] bg-white px-4 py-2.5 text-sm font-semibold text-[#203B46] hover:bg-[#F2F7F8]">
                  <UploadCloud className="h-4 w-4" /> {arrivalFile ? "Change Arrival Notice" : "Select Arrival Notice"}
                </button>
                {arrivalFile && <span className="max-w-full truncate text-xs text-[#607780]">{arrivalFile.name}</span>}
                <button
                  type="button"
                  onClick={() => arrivalFile && extractMbl.mutate(arrivalFile)}
                  disabled={!arrivalFile || extractMbl.isPending}
                  className="inline-flex items-center gap-2 rounded-md bg-[#087FA3] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {extractMbl.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
                  {extractMbl.isPending ? "Finding MBL..." : "Extract MBL"}
                </button>
              </div>
              {extraction && (
                <div className="mt-4 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-3 text-xs leading-5 text-cyan-950">
                  <p className="font-bold">{extraction.extraction_method === "deterministic" ? "MBL found with local non-AI parsing" : "Automatic extraction needs staff entry"}</p>
                  <p>This Manifest Query step never sends the Arrival Notice or its contents to an AI model.</p>
                  {extraction.warnings.map((warning) => <p key={warning} className="mt-1 text-amber-800">{warning}</p>)}
                </div>
              )}
              <div className="mt-5 border-t border-[#DDE6E9] pt-5">
                <h3 className="text-sm font-bold text-[#203B46]">Upload several Arrival Notices</h3>
                <p className="mt-1 text-xs leading-5 text-[#607780]">Select up to 25 notices. Each clear MBL and package quantity is queued for Queries V2 and a validated Header Save. An HBL is matched when present; otherwise only a single matching bill is allowed. Incomplete files need review without blocking the rest. No AI model receives any file. E214 Submit is never performed.</p>
                <input
                  ref={arrivalBatchInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.txt,.text,.csv,.xlsx"
                  className="hidden"
                  onChange={(event) => chooseArrivalNoticeBatch(event.target.files)}
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => arrivalBatchInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-md border border-[#B9C9CE] bg-white px-4 py-2.5 text-sm font-semibold text-[#203B46] hover:bg-[#F2F7F8]">
                    <UploadCloud className="h-4 w-4" /> Select several notices
                  </button>
                  {arrivalBatchFiles.length > 0 && <span className="text-xs text-[#607780]">{arrivalBatchFiles.length} file{arrivalBatchFiles.length === 1 ? "" : "s"} selected</span>}
                  <button
                    type="button"
                    onClick={() => queueArrivalNoticeBatch.mutate(arrivalBatchFiles)}
                    disabled={!arrivalBatchFiles.length || queueArrivalNoticeBatch.isPending}
                    className="inline-flex items-center gap-2 rounded-md bg-[#087FA3] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#076D8C] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {queueArrivalNoticeBatch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                    {queueArrivalNoticeBatch.isPending ? "Queueing Headers..." : "Create Headers for selected notices"}
                  </button>
                </div>
                {arrivalBatchFiles.length > 0 && <p className="mt-2 truncate text-xs text-[#607780]">{arrivalBatchFiles.map((file) => file.name).join(" · ")}</p>}
              </div>
            </section>
          )}

          {source && <section className="mt-6">
            <label htmlFor="e214-mbl" className="text-sm font-bold text-[#203B46]">{source === "arrival_notice" ? "3. Review the Master Bill of Lading (MBL)" : "2. Enter the Master Bill of Lading (MBL)"}</label>
            <p className="mt-1 text-xs leading-5 text-[#71858D]">The first four letters are the carrier SCAC. Spaces are removed and letters are capitalized.</p>
            <input
              id="e214-mbl"
              value={mbl}
              onChange={(event) => {
                setMbl(event.target.value);
                if (source === "arrival_notice") setConfirmed(false);
                setError(null);
                setResult(null);
              }}
              placeholder="OOLU12345678"
              autoComplete="off"
              className="mt-3 w-full rounded-md border border-[#B9C9CE] px-3 py-2.5 font-mono text-sm uppercase text-[#142B35] outline-none focus:border-[#087FA3] focus:ring-2 focus:ring-cyan-100"
            />

            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-[#F4F8F9] px-3 py-3"><dt className="text-[10px] font-bold uppercase text-[#71858D]">Issuer code / SCAC</dt><dd className="mt-1 font-mono text-sm font-bold text-[#203B46]">{canonical.slice(0, 4) || "—"}</dd></div>
              <div className="rounded-md bg-[#F4F8F9] px-3 py-3"><dt className="text-[10px] font-bold uppercase text-[#71858D]">Bill of lading number</dt><dd className="mt-1 font-mono text-sm font-bold text-[#203B46]">{canonical.slice(4) || "—"}</dd></div>
            </dl>

            {mbl && !valid && <p className="mt-3 text-sm text-amber-700">Use four SCAC letters followed by letters or numbers only.</p>}
            {source === "arrival_notice" && extraction && (
              <label className="mt-4 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
                <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={!valid} className="mt-0.5 h-4 w-4" />
                <span><strong>I reviewed the Arrival Notice and confirm this MBL.</strong><span className="mt-0.5 block text-xs">Changing the MBL clears this confirmation.</span></span>
              </label>
            )}
          </section>}

          {error && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          {source && <div className="mt-6 flex items-center gap-3">
            <button type="submit" disabled={!valid || !arrivalReady || queueQuery.isPending} className="inline-flex items-center gap-2 rounded-md bg-[#087FA3] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#076D8C] disabled:cursor-not-allowed disabled:opacity-50">
              <Search className="h-4 w-4" /> {queueQuery.isPending ? "Queueing..." : source === "arrival_notice" ? "Create E214 Header" : "Queue E214 Manifest Query"}
            </button>
            {mbl && <button type="button" onClick={() => { setMbl(""); setConfirmed(false); setError(null); setResult(null); }} className="inline-flex items-center gap-2 rounded-md border border-[#D5E2E5] px-4 py-2.5 text-sm font-semibold text-[#607780] hover:bg-[#F7FAFB]"><X className="h-4 w-4" /> Clear MBL</button>}
          </div>}
          {source === "arrival_notice" && <p className="mt-3 text-xs leading-5 text-[#607780]">Create E214 Header authorizes one Get Report and one new Header Save after bill matching, complete validation, and duplicate checking. It does not Submit the E214. A queued job is not yet a saved Header.</p>}
        </form>

        <aside className="h-fit space-y-4">
          <div className="rounded-lg border border-[#DDE6E9] bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-[#203B46]"><ShieldCheck className="h-4 w-4 text-[#087FA3]" />AceLynk settings</div>
            <ul className="mt-4 space-y-2 text-sm leading-5 text-[#607780]"><li>Surface Bill of Lading Status</li><li>Get Related House/Master Bills: checked</li><li>Ace Query: checked</li><li>Most recent notification/selectivity result</li></ul>
          </div>
          <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm leading-5 text-cyan-900">
            Arrival Notice parsing is local and deterministic only. No AI model receives the document. Single notices require staff review and confirmation; a batch queues only documents with a clear MBL and package quantity. The worker uses the selected query bill and reconciles its containers with the notice before saving.
          </div>
        </aside>
      </div>

      {batchResult && (
        <section className="mt-6 rounded-lg border border-cyan-200 bg-cyan-50 p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-cyan-950"><CheckCircle2 className="h-4 w-4" />Arrival Notice batch processed</div>
          <p className="mt-1 text-sm text-cyan-900">{batchResult.queued_count} queued · {batchResult.duplicate_count} already queued · {batchResult.failed_count} need review · {batchResult.rejected_count} rejected</p>
          <ul className="mt-4 space-y-2 text-sm">
            {batchResult.items.map((item) => (
              <li key={`${item.source_file}-${item.log_id ?? item.outcome}`} className="rounded-md border border-cyan-100 bg-white px-3 py-2 text-[#203B46]">
                <span className="font-semibold">{item.source_file}</span>{" — "}
                <span>{item.outcome === "queued" ? "Queued for Queries V2" : item.outcome === "duplicate" ? "Already queued" : item.outcome === "failed" ? `Needs review: ${item.missing_fields.join(", ")}` : item.error ?? "Rejected"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result && (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4" />{result.duplicate ? "Existing job — not rerun" : result.headerSaveRequested ? "E214 Header creation queued" : "Manifest Query queued (query only)"}</div>
          <p className="mt-1 text-sm text-emerald-700">{result.headerSaveRequested ? "The worker will validate the selected bill, check for duplicates, and save the Header. This queue confirmation does not mean it has been saved yet." : "No automatic Header Save was requested for this job."}</p>
          <p className="mt-1 text-sm text-emerald-700">Log #{result.logId} · {result.workflowState.replaceAll("-", " ")} · Source: {result.mblSource === "arrival_notice" ? "Arrival Notice" : "ISF / staff entry"}</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[["MBL", result.mbl], ["SCAC", result.scac], ["Bill number", result.billNumber], ["Account", result.importerAccount ?? "—"]].map(([label, value]) => <div key={label}><dt className="text-[10px] font-bold uppercase text-emerald-700">{label}</dt><dd className="mt-1 font-mono text-sm font-bold text-emerald-950">{value}</dd></div>)}
          </dl>
        </div>
      )}
    </div>
  );
}
