"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { apiError, validateFile, type Shipment } from "@/lib/client-shipments";
import { DocumentDropSlot } from "@/components/client/document-drop-slot";

export default function NewClientShipment() {
  const user = getAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isf, setIsf] = useState<File | null>(null);
  const [noIsf, setNoIsf] = useState(false);
  const [commercial, setCommercial] = useState<Record<string, File>>({});
  const [needsHbl, setNeedsHbl] = useState(false);
  const [hbl, setHbl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const submitting = useRef(false);

  function addFiles(selected: File[]) {
    const file = selected[0];
    if (!file) return;
    const invalid = validateFile(file, "isf");
    setError(invalid ?? null);
    if (invalid) return;
    setIsf(file);
  }

  async function submit() {
    if (submitting.current) return;
    if (noIsf && (!commercial.commercial_invoice || !commercial.packing_list)) {
      setError("Add your commercial invoice and packing list."); return;
    }
    if (noIsf && needsHbl && !hbl.trim()) { setError("Enter the shipment HBL."); return; }
    if (!noIsf && !isf) { setError("Add your ISF document to start the shipment."); return; }
    submitting.current = true;
    setError(null);
    setBusy(noIsf ? "Reading your documents…" : "Reading your ISF…");
    try {
      const form = new FormData();
      if (noIsf) {
        form.append("commercial_invoice", commercial.commercial_invoice);
        form.append("packing_list", commercial.packing_list);
        if (needsHbl) form.append("hbl", hbl.trim());
      } else {
        form.append("file", isf!);
      }
      const { data } = await api.post<Shipment>(noIsf ? "/shipments/no-isf" : "/shipments/isf", form);
      await queryClient.invalidateQueries({ queryKey: ["shipments"] });
      router.push(`/client?shipment=${encodeURIComponent(data.hbl)}&created=1`);
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: { code?: string; message?: string } } } })?.response?.data?.detail;
      if (noIsf && detail?.code === "hbl_required") {
        setNeedsHbl(true);
        setError(detail.message ?? "Enter the shipment HBL.");
      } else setError(apiError(error, "We could not confirm the shipment was created. Check My shipments before submitting again."));
      submitting.current = false;
      setBusy(null);
    }
  }

  if (!user?.importer_account) return <div className="surface p-8">Your administrator needs to assign an importer account before you can start a shipment.</div>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/client" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#607780]"><ArrowLeft className="h-4 w-4" /> My shipments</Link>
      <p className="text-xs font-bold uppercase tracking-wider text-[#087FA3]">New shipment</p>
      <h1 className="mt-2 text-3xl font-bold text-[#142B35]">{noIsf ? "Upload your commercial documents." : "Upload your ISF. We handle the rest."}</h1>
      <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-[#607780]"><Sparkles className="mt-1 h-4 w-4 shrink-0 text-[#087FA3]" />{noIsf ? "We read the HBL from your documents and only ask if it’s missing." : "No data entry needed. We read the shipment details directly from your ISF."}</p>
      <label className="mt-6 flex items-start gap-3 rounded-lg border border-[#C9DCE1] p-4 text-sm text-[#142B35]">
        <input type="checkbox" checked={noIsf} disabled={!!busy} onChange={(event) => { setNoIsf(event.target.checked); setError(null); }} className="mt-1" />
        <span><span className="block font-bold">No ISF</span><span className="text-[#607780]">I’m not using Surfgistics for ISF filing. Continue with my commercial invoice and packing list.</span></span>
      </label>
      <div className="surface mt-7 overflow-hidden">
        <div className="space-y-3 p-5 sm:p-7">
          {noIsf ? <>
            {([ ["commercial_invoice", "Commercial invoice"], ["packing_list", "Packing list"] ] as const).map(([type, label]) => (
              <DocumentDropSlot key={type} label={label} description="Required" files={commercial[type] ? [commercial[type]] : []}
                accept=".pdf,.txt,.csv,.xlsx" disabled={!!busy}
                onFiles={(selected) => {
                  const file = selected[0]; if (!file) return;
                  const invalid = validateFile(file, type); setError(invalid);
                  if (!invalid) setCommercial((current) => ({ ...current, [type]: file }));
                }}
                onRemove={() => setCommercial((current) => { const next = { ...current }; delete next[type]; return next; })} />
            ))}
            {needsHbl && <label className="block text-sm font-semibold text-[#142B35]">Shipment HBL
              <input value={hbl} onChange={(event) => setHbl(event.target.value)} disabled={!!busy} className="mt-2 block w-full rounded-md border border-[#C9DCE1] p-3" />
            </label>}
          </> : <DocumentDropSlot
            label="ISF document"
            description="Upload your ISF to start the shipment"
            files={isf ? [isf] : []}
            accept=".pdf,.txt,.csv,.xlsx"
            disabled={!!busy}
            onFiles={addFiles}
            onRemove={() => setIsf(null)}
          />}
          <p className="pt-1 text-xs text-[#71858D]">PDF, TXT, CSV, or XLSX · Up to 15 MB. Supporting documents can be added after your shipment is created.</p>
        </div>
        {error && <p role="alert" className="mx-5 mb-4 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:mx-7">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2EBEE] bg-[#F8FAFB] px-5 py-4 sm:px-7">
          <p className="text-xs text-[#607780]">Account: {user.importer_account}</p>
          <button type="button" onClick={submit} disabled={!!busy || (noIsf ? !commercial.commercial_invoice || !commercial.packing_list || (needsHbl && !hbl.trim()) : !isf)} className="inline-flex items-center gap-2 rounded-md bg-[#087FA3] px-5 py-3 text-sm font-bold text-white hover:bg-[#076C8B] disabled:opacity-60">{busy ?? "Submit shipment"}<ArrowRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}
