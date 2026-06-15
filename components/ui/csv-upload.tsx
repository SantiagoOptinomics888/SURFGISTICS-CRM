"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { api } from "@/lib/api";

const TEMPLATE_HEADERS: Record<string, string[]> = {
  parts: ["PartNumber", "Description", "Country", "Tariff #", "CountryOfOrigin"],
  ftz_line_item: ["Country_Origin", "Part", "Piece_Count", "Unit_Price", "Line_Value", "Weight_KG", "HTS_QTY_1", "HTS_QTY_2", "Line_Charge", "Reference_Qualifier", "Reference_ID", "Zone_Status", "SPI", "SPI_Country", "SPI_Secondary", "Lot_Number", "Remarks"],
  inbond: ["container", "part_number", "tariff_number", "description", "piece_count", "value", "weight", "weight_uom", "marks_numbers", "manifest_uom"],
  tally_out: ["Delivery Order #", "Item Code", "Quantity Ordered", "Price Per Unit", "Foreign/Domestic Ind.", "3461-7512", "Operator ID", "Internal Order"],
};

function downloadTemplate(resourceType: string, format: "csv" | "xlsx" = "csv") {
  const headers = TEMPLATE_HEADERS[resourceType];
  if (!headers) return;
  if (format === "xlsx") {
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${resourceType}_template.xlsx`);
    return;
  }
  const csv = headers.join(",") + "\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${resourceType}_template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function TemplateMenu({ resourceType }: { resourceType: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        Template
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 mt-1 z-10 min-w-[140px] bg-white border border-[#E2E8F0] rounded-md shadow-lg overflow-hidden">
          <button
            onClick={() => { downloadTemplate(resourceType, "csv"); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-xs font-medium text-[#334155] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          >
            CSV Template
          </button>
          <button
            onClick={() => { downloadTemplate(resourceType, "xlsx"); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-xs font-medium text-[#334155] hover:bg-[#F8FAFC] transition-colors cursor-pointer border-t border-[#F1F5F9]"
          >
            Excel Template
          </button>
        </div>
      )}
    </div>
  );
}

interface UploadResult {
  created: number;
  errors: string[];
  message?: string;
  missingParts?: string[];
  missingPartRows?: Record<string, number[]>;
}

interface CsvUploadProps {
  resourceType: string;
  label: string;
  /** Query keys to invalidate on successful upload */
  invalidateKeys?: string[][];
}

export function CsvUpload({ resourceType, label, invalidateKeys }: CsvUploadProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [hbl, setHbl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const isTallyIn = resourceType === "ftz_line_item";
  const hblValid = !isTallyIn || hbl.trim().length > 0;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      const form = new FormData();
      form.append("file", file);
      const params = isTallyIn ? `?hbl=${encodeURIComponent(hbl.trim())}` : "";
      const res = await api.post(`/upload/${resourceType}${params}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data as UploadResult;
    },
    onSuccess: (data) => {
      setResult(data);
      setFile(null);
      if (invalidateKeys) {
        invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      }
    },
    onError: (err: unknown) => {
      const resp = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { detail?: string | { message?: string; errors?: string[]; missing_parts?: string[]; missing_part_rows?: Record<string, number[]> } } } }).response?.data?.detail
        : undefined;
      if (typeof resp === "string") {
        setResult({ created: 0, errors: [resp] });
      } else if (resp && typeof resp === "object") {
        const r = resp as { message?: string; errors?: string[]; missing_parts?: string[]; missing_part_rows?: Record<string, number[]> };
        setResult({
          created: 0,
          errors: r.errors ?? [],
          message: r.message,
          missingParts: r.missing_parts,
          missingPartRows: r.missing_part_rows,
        });
      } else {
        setResult({ created: 0, errors: ["Upload failed. Check your file format."] });
      }
    },
  });

  function handleFile(f: File | undefined) {
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "xlsx") {
      setResult({ created: 0, errors: ["File must be .csv or .xlsx"] });
      return;
    }
    setFile(f);
    setResult(null);
  }

  if (!open) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[#E2E8F0] bg-white text-[#0369A1] hover:bg-[#F0F9FF] transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
          Upload {label}
        </button>
        <TemplateMenu resourceType={resourceType} />
      </div>
    );
  }

  return (
    <div className="mb-6 border border-[#E2E8F0] rounded-lg bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#020617]">Upload {label}</h3>
        <button
          onClick={() => { setOpen(false); setFile(null); setResult(null); setHbl(""); }}
          className="text-xs text-[#64748B] hover:text-[#334155] cursor-pointer"
        >
          Close
        </button>
      </div>

      {/* HBL input for Tally In */}
      {isTallyIn && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-[#334155] mb-1.5">HBL Number <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={hbl}
            onChange={(e) => { setHbl(e.target.value); setResult(null); }}
            placeholder="Enter HBL number (e.g. TAL-20260501-A)"
            className="w-full px-3 py-2 rounded-md border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0369A1] focus:border-transparent"
          />
        </div>
      )}

      {/* Drop zone — only show after HBL is entered for Tally In */}
      {hblValid && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-lg px-6 py-8 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-[#0369A1] bg-[#F0F9FF]"
              : file
                ? "border-emerald-300 bg-emerald-50"
                : "border-[#E2E8F0] hover:border-[#0369A1] bg-[#FAFAFA]"
          }`}
        >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="hidden"
        />
        {file ? (
          <div>
            <svg className="w-6 h-6 mx-auto text-emerald-500 mb-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <p className="text-sm font-medium text-[#0F172A]">{file.name}</p>
            <p className="text-xs text-[#64748B] mt-0.5">{(file.size / 1024).toFixed(1)} KB — Click to change</p>
          </div>
        ) : (
          <div>
            <svg className="w-6 h-6 mx-auto text-[#94A3B8] mb-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm font-medium text-[#334155]">Drop your file here or click to browse</p>
            <p className="text-xs text-[#94A3B8] mt-0.5">Supports .csv and .xlsx (max 10MB)</p>
          </div>
        )}
      </div>
      )}

      {/* Actions */}
      {file && (
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !hblValid}
            className="px-4 py-2 rounded-md bg-[#0369A1] hover:bg-[#0284C7] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {mutation.isPending ? "Uploading..." : "Upload"}
          </button>
          <button
            onClick={() => { setFile(null); setResult(null); }}
            className="px-3 py-1.5 rounded-md border border-[#E2E8F0] text-sm font-medium text-[#64748B] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          >
            Clear
          </button>
          <div className="ml-auto">
            <TemplateMenu resourceType={resourceType} />
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-3 space-y-2">
          {result.created > 0 && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-sm text-emerald-700">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Successfully imported {result.created} record{result.created !== 1 ? "s" : ""}.
            </div>
          )}
          {result.missingParts && result.missingParts.length > 0 && (
            <div className="px-3 py-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">
                    {result.message ?? `${result.missingParts.length} part number(s) not in your parts list`}
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Add these part numbers to your Parts list, then re-upload:
                  </p>
                  <div className="mt-2 bg-white border border-amber-200 rounded-md divide-y divide-amber-100 overflow-hidden">
                    {result.missingParts.slice(0, 50).map((p) => {
                      const rows = result.missingPartRows?.[p] ?? [];
                      return (
                        <div key={p} className="flex items-center gap-3 px-2.5 py-1.5 text-xs">
                          <span className="font-mono font-semibold text-amber-900 flex-1 min-w-0 truncate">{p}</span>
                          {rows.length > 0 && (
                            <span className="text-[11px] text-amber-700 whitespace-nowrap">
                              row{rows.length !== 1 ? "s" : ""} {rows.slice(0, 5).join(", ")}
                              {rows.length > 5 && ` +${rows.length - 5}`}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {result.missingParts.length > 50 && (
                      <div className="px-2.5 py-1.5 text-[11px] text-amber-700 font-medium">
                        …and {result.missingParts.length - 50} more
                      </div>
                    )}
                  </div>
                  <a
                    href="/vendor/arts-parts"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-amber-900 mt-2 cursor-pointer"
                  >
                    Go to Parts
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          )}
          {result.errors.length > 0 && !result.missingParts?.length && (
            <div className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-100">
              <p className="text-sm font-medium text-red-700 mb-1.5">
                {result.message ?? (result.created > 0 ? `${result.errors.length} row(s) had issues:` : "Upload failed:")}
              </p>
              <ul className="space-y-0.5">
                {result.errors.slice(0, 20).map((err, i) => (
                  <li key={i} className="text-xs text-red-600">{err}</li>
                ))}
                {result.errors.length > 20 && (
                  <li className="text-xs text-red-500 font-medium">...and {result.errors.length - 20} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
