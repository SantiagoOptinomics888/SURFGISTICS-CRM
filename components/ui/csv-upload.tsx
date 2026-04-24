"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const TEMPLATE_HEADERS: Record<string, string[]> = {
  arts_part: ["part_number", "description", "country", "unit_price", "tariff_num", "manufacturer", "warehouse", "value", "units_shipped", "is_duty_exempt", "filer_code", "supplier_id"],
  ftz_line_item: ["Country_Origin", "Part", "Piece_Count", "Unit_Price", "Line_Value", "Weight_KG", "HTS_QTY_1", "HTS_QTY_2", "Line_Charge", "Reference_Qualifier", "Reference_ID", "Zone_Status", "SPI", "SPI_Country", "SPI_Secondary", "Lot_Number", "Remarks"],
  inbond: ["container", "part_number", "tariff_number", "description", "piece_count", "value", "weight", "weight_uom", "marks_numbers", "manifest_uom"],
  tally_out: ["Delivery Order #", "Item Code", "Quantity Ordered", "Price Per Unit", "Foreign/Domestic Ind.", "3461-7512", "Operator ID", "Internal Order"],
};

function downloadTemplate(resourceType: string) {
  const headers = TEMPLATE_HEADERS[resourceType];
  if (!headers) return;
  const csv = headers.join(",") + "\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${resourceType}_template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface UploadResult {
  created: number;
  errors: string[];
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
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      const form = new FormData();
      form.append("file", file);
      const res = await api.post(`/upload/${resourceType}`, form, {
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
        ? (err as { response?: { data?: { detail?: string | { message?: string; errors?: string[] } } } }).response?.data?.detail
        : undefined;
      if (typeof resp === "string") {
        setResult({ created: 0, errors: [resp] });
      } else if (resp && typeof resp === "object" && "errors" in resp) {
        setResult({ created: 0, errors: (resp as { errors: string[] }).errors });
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
        <button
          onClick={() => downloadTemplate(resourceType)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          CSV Template
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 border border-[#E2E8F0] rounded-lg bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#020617]">Upload {label}</h3>
        <button
          onClick={() => { setOpen(false); setFile(null); setResult(null); }}
          className="text-xs text-[#64748B] hover:text-[#334155] cursor-pointer"
        >
          Close
        </button>
      </div>

      {/* Drop zone */}
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

      {/* Actions */}
      {file && (
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
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
          <button
            onClick={() => downloadTemplate(resourceType)}
            className="ml-auto inline-flex items-center gap-1.5 text-xs text-[#0369A1] hover:underline cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download Template
          </button>
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
          {result.errors.length > 0 && (
            <div className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-100">
              <p className="text-sm font-medium text-red-700 mb-1.5">
                {result.created > 0 ? `${result.errors.length} row(s) had issues:` : "Upload failed:"}
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
