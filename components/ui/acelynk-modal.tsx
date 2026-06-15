"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface AcelynkModalProps {
  open: boolean;
  onClose: () => void;
  hbls: string[];
  importerAccount: string;
}

interface TallyInPayload {
  zone_id: string;
  port_code: string;
  firms_code: string;
  admission_num: string;
  admission_type: string;
  calendar_year: string;
  control_number: string;
  foreign_domestic_indicator: string;
  direct_delivery_indicator: string;
  mot: string;
  scac: string;
  conveyance_name: string;
  voyage_trip_flight_number: string;
  import_date: string;
  port_of_unlading: string;
  estimated_date_of_arrival: string;
  filer_code: string;
  tax_id: string;
  broker_ref_num: string;
  importer_ref_num: string;
  importer_account: string;
  hbls: string[];
}

const currentYear = new Date().getFullYear().toString();

export function AcelynkModal({ open, onClose, hbls, importerAccount }: AcelynkModalProps) {
  const [mode, setMode] = useState<"form" | "preview" | "result">("form");
  const [previewData, setPreviewData] = useState<object | null>(null);

  const [form, setForm] = useState({
    zone_id: "",
    port_code: "",
    firms_code: "",
    admission_num: "",
    admission_type: "06",
    calendar_year: currentYear,
    control_number: "",
    foreign_domestic_indicator: "F",
    direct_delivery_indicator: "N",
    mot: "",
    scac: "",
    conveyance_name: "",
    voyage_trip_flight_number: "",
    import_date: "",
    port_of_unlading: "",
    estimated_date_of_arrival: "",
    filer_code: "",
    tax_id: "",
    broker_ref_num: "",
    importer_ref_num: "",
  });

  const payload: TallyInPayload = {
    ...form,
    importer_account: importerAccount,
    hbls,
  };

  const previewMutation = useMutation({
    mutationFn: () => api.post("/acelynk/ftz/tally-in/preview", payload).then((r) => r.data),
    onSuccess: (data) => {
      setPreviewData(data);
      setMode("preview");
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => api.post("/acelynk/ftz/tally-in", payload).then((r) => r.data),
    onSuccess: (data) => {
      setPreviewData(data);
      setMode("result");
    },
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  if (!open) return null;

  const inputClass =
    "w-full border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-sm text-[#334155] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400";
  const labelClass = "text-xs font-medium text-[#64748B] uppercase tracking-wider mb-1 block";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-lg font-semibold text-[#020617]">Send to ACELynk</h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              {hbls.length} HBL{hbls.length !== 1 ? "s" : ""} selected: {hbls.join(", ")}
            </p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#334155] cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {mode === "form" && (
            <div className="space-y-6">
              {/* Zone & Port */}
              <fieldset>
                <legend className="text-sm font-semibold text-[#020617] mb-3">Zone & Port Information</legend>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Zone ID *</label>
                    <input value={form.zone_id} onChange={set("zone_id")} className={inputClass} placeholder="e.g. 123" />
                  </div>
                  <div>
                    <label className={labelClass}>Port Code *</label>
                    <input value={form.port_code} onChange={set("port_code")} className={inputClass} placeholder="e.g. 5301" />
                  </div>
                  <div>
                    <label className={labelClass}>FIRMS Code *</label>
                    <input value={form.firms_code} onChange={set("firms_code")} className={inputClass} placeholder="e.g. Z123" />
                  </div>
                </div>
              </fieldset>

              {/* Admission */}
              <fieldset>
                <legend className="text-sm font-semibold text-[#020617] mb-3">Admission Details</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Admission #</label>
                    <input value={form.admission_num} onChange={set("admission_num")} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Admission Type</label>
                    <select value={form.admission_type} onChange={set("admission_type")} className={inputClass}>
                      <option value="06">06 - FTZ Admission</option>
                      <option value="01">01 - Direct Delivery</option>
                      <option value="02">02 - Warehouse Entry</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Calendar Year</label>
                    <input value={form.calendar_year} onChange={set("calendar_year")} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Control Number</label>
                    <input value={form.control_number} onChange={set("control_number")} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Foreign/Domestic</label>
                    <select value={form.foreign_domestic_indicator} onChange={set("foreign_domestic_indicator")} className={inputClass}>
                      <option value="F">F - Foreign</option>
                      <option value="D">D - Domestic</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Direct Delivery</label>
                    <select value={form.direct_delivery_indicator} onChange={set("direct_delivery_indicator")} className={inputClass}>
                      <option value="N">N - No</option>
                      <option value="Y">Y - Yes</option>
                    </select>
                  </div>
                </div>
              </fieldset>

              {/* Transport */}
              <fieldset>
                <legend className="text-sm font-semibold text-[#020617] mb-3">Transport</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Mode of Transport</label>
                    <input value={form.mot} onChange={set("mot")} className={inputClass} placeholder="e.g. 11" />
                  </div>
                  <div>
                    <label className={labelClass}>SCAC</label>
                    <input value={form.scac} onChange={set("scac")} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Conveyance Name</label>
                    <input value={form.conveyance_name} onChange={set("conveyance_name")} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Voyage/Trip/Flight #</label>
                    <input value={form.voyage_trip_flight_number} onChange={set("voyage_trip_flight_number")} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Import Date</label>
                    <input type="date" value={form.import_date} onChange={set("import_date")} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Port of Unlading</label>
                    <input value={form.port_of_unlading} onChange={set("port_of_unlading")} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>ETA</label>
                    <input type="date" value={form.estimated_date_of_arrival} onChange={set("estimated_date_of_arrival")} className={inputClass} />
                  </div>
                </div>
              </fieldset>

              {/* Importer / References */}
              <fieldset>
                <legend className="text-sm font-semibold text-[#020617] mb-3">Importer & References</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Importer Account</label>
                    <input value={importerAccount} disabled className={`${inputClass} bg-[#F8FAFC] text-[#94A3B8]`} />
                  </div>
                  <div>
                    <label className={labelClass}>Filer Code</label>
                    <input value={form.filer_code} onChange={set("filer_code")} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Tax ID</label>
                    <input value={form.tax_id} onChange={set("tax_id")} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Broker Ref #</label>
                    <input value={form.broker_ref_num} onChange={set("broker_ref_num")} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Importer Ref #</label>
                    <input value={form.importer_ref_num} onChange={set("importer_ref_num")} className={inputClass} />
                  </div>
                </div>
              </fieldset>
            </div>
          )}

          {mode === "preview" && previewData && (
            <div>
              <p className="text-sm text-[#64748B] mb-3">Review the ACELynk payload before submitting:</p>
              <pre className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 text-xs text-[#334155] overflow-auto max-h-[50vh] font-mono">
                {JSON.stringify(previewData, null, 2)}
              </pre>
            </div>
          )}

          {mode === "result" && previewData && (
            <div>
              {(previewData as { success?: boolean }).success ? (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-100 text-sm text-emerald-700 mb-4">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  Successfully submitted to ACELynk
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600 mb-4">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                  {(previewData as { error?: string }).error ?? "Submission failed"}
                </div>
              )}
              <pre className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 text-xs text-[#334155] overflow-auto max-h-[50vh] font-mono">
                {JSON.stringify(previewData, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          {mode === "form" && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#64748B] hover:text-[#334155] cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => previewMutation.mutate()}
                disabled={!form.zone_id || !form.port_code || !form.firms_code || previewMutation.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F1F5F9] disabled:opacity-50 cursor-pointer"
              >
                {previewMutation.isPending ? "Loading..." : "Preview Payload"}
              </button>
              <button
                onClick={() => submitMutation.mutate()}
                disabled={!form.zone_id || !form.port_code || !form.firms_code || submitMutation.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-[#0369A1] text-white hover:bg-[#075985] disabled:opacity-50 cursor-pointer"
              >
                {submitMutation.isPending ? "Sending..." : "Send to ACELynk"}
              </button>
            </>
          )}
          {mode === "preview" && (
            <>
              <button onClick={() => setMode("form")} className="px-4 py-2 text-sm font-medium text-[#64748B] hover:text-[#334155] cursor-pointer">
                Back to Form
              </button>
              <button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-[#0369A1] text-white hover:bg-[#075985] disabled:opacity-50 cursor-pointer"
              >
                {submitMutation.isPending ? "Sending..." : "Confirm & Send"}
              </button>
            </>
          )}
          {mode === "result" && (
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg bg-[#0369A1] text-white hover:bg-[#075985] cursor-pointer">
              Done
            </button>
          )}

          {(previewMutation.isError || submitMutation.isError) && (
            <p className="text-xs text-red-500 mr-auto">
              {(previewMutation.error as Error)?.message || (submitMutation.error as Error)?.message || "Request failed"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
