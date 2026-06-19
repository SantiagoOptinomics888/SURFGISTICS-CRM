"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileText, UploadCloud, X } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";

interface ArrivalNoticeResult {
  logId: number;
  identifier: string;
  importerAccount: string | null;
  extracted: Record<string, unknown>;
  missingFields: string[];
}

export default function ArrivalNoticePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<ArrivalNoticeResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      const form = new FormData();
      form.append("file", file);
      const res = await api.post("/upload/arrival-notice/e214", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return {
        logId: res.data.log_id,
        identifier: res.data.identifier,
        importerAccount: res.data.importer_account,
        extracted: res.data.extracted,
        missingFields: res.data.missing_fields ?? [],
      } as ArrivalNoticeResult;
    },
    onSuccess: (data) => {
      setResult(data);
      setErrors(
        data.missingFields.length > 0
          ? [`Missing required fields: ${data.missingFields.join(", ")}`]
          : []
      );
      setFile(null);
    },
    onError: (err: unknown) => {
      const detail = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined;
      setResult(null);
      setErrors([detail || "Arrival notice upload failed. Check the file and try again."]);
    },
  });

  function handleFile(nextFile: File | undefined) {
    if (!nextFile) return;
    const ext = nextFile.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "txt", "csv", "xlsx"].includes(ext)) {
      setFile(null);
      setResult(null);
      setErrors(["File must be .pdf, .txt, .csv, or .xlsx"]);
      return;
    }
    setFile(nextFile);
    setResult(null);
    setErrors([]);
  }

  return (
    <div>
      <PageHeader
        title="Arrival Notice"
        subtitle="Upload arrival notices so the CRM can extract E214 Entry Header details and queue Acelynk automation."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => inputRef.current?.click()}
            className={`relative rounded-lg border-2 border-dashed px-8 py-14 text-center transition-colors cursor-pointer ${
              dragOver
                ? "border-[#0369A1] bg-[#F0F9FF]"
                : file
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-[#CBD5E1] bg-white hover:border-[#0369A1]"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.txt,.csv,.xlsx"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="hidden"
            />
            {file ? (
              <div>
                <FileText className="mx-auto mb-3 h-9 w-9 text-emerald-600" />
                <p className="text-sm font-semibold text-[#0F172A]">{file.name}</p>
                <p className="mt-1 text-xs text-[#64748B]">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <UploadCloud className="mx-auto mb-3 h-9 w-9 text-[#94A3B8]" />
                <p className="text-sm font-semibold text-[#334155]">Drop the arrival notice here or click to browse</p>
                <p className="mt-1 text-xs text-[#94A3B8]">Supports text-based PDF, TXT, CSV, and XLSX files up to 15MB</p>
              </div>
            )}
          </div>

          {file && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-[#0369A1] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0284C7] disabled:opacity-50"
              >
                <UploadCloud className="h-4 w-4" />
                {mutation.isPending ? "Queueing..." : "Queue E214 Entry Header"}
              </button>
              <button
                onClick={() => { setFile(null); setErrors([]); setResult(null); }}
                className="inline-flex items-center gap-2 rounded-md border border-[#E2E8F0] px-4 py-2.5 text-sm font-medium text-[#64748B] transition-colors hover:bg-[#F8FAFC]"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            </div>
          )}

          {errors.length > 0 && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-sm font-semibold text-red-800">Needs attention</p>
              <ul className="mt-2 space-y-1">
                {errors.map((error) => (
                  <li key={error} className="text-sm text-red-700">{error}</li>
                ))}
              </ul>
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
              <p className="text-sm font-semibold text-[#0F172A]">
                {result.missingFields.length > 0 ? "Arrival notice saved for review" : "Arrival notice queued for Acelynk"}
              </p>
              <p className="mt-1 text-sm text-[#64748B]">
                Log #{result.logId} · HBL {result.identifier}
              </p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {([
                  ["Account", result.importerAccount],
                  ["Arrival date", result.extracted.arrival_date],
                  ["Carrier", result.extracted.carrier_id],
                  ["Voyage", result.extracted.voyage_flight],
                  ["FIRMS", result.extracted.firms],
                  ["Container", result.extracted.container_number],
                  ["Gross weight", result.extracted.gross_weight],
                  ["Port code", result.extracted.port_code],
                  ["Master bill", result.extracted.master_bill],
                ] as [string, unknown][]).map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-xs font-medium text-[#64748B]">{label}</dt>
                    <dd className="mt-1 truncate text-sm text-[#0F172A]">{value ? String(value) : "Not found"}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>

        <aside className="rounded-lg border border-[#E2E8F0] bg-white p-4 h-fit">
          <p className="text-sm font-semibold text-[#0F172A]">What happens next</p>
          <div className="mt-4 space-y-3 text-sm text-[#64748B]">
            <p>The CRM reads the arrival notice and extracts the fields needed for the E214 Entry Header.</p>
            <p>If HBL and arrival date are found, the job is queued for the Acelynk watcher.</p>
            <p>Admins can monitor the result under Modules, E214 Entry Header.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
