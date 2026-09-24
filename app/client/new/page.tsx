"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { apiError, documentTypes, uploadDocuments, validateFile, type Shipment } from "@/lib/client-shipments";
import { DocumentDropSlot } from "@/components/client/document-drop-slot";

export default function NewClientShipment() {
  const user = getAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const submitting = useRef(false);
  const isf = files.isf?.[0];

  function addFiles(type: string, selected: File[]) {
    const invalid = selected.map((file) => validateFile(file, type)).find(Boolean);
    setError(invalid ?? null);
    if (invalid) return;
    setFiles((current) => ({ ...current, [type]: type === "isf" ? selected.slice(0, 1) : [...(current[type] ?? []), ...selected] }));
  }

  async function submit() {
    if (submitting.current) return;
    if (!isf) { setError("Add your ISF document to start the shipment."); return; }
    submitting.current = true;
    setError(null);
    setBusy("Reading your ISF…");
    try {
      const form = new FormData();
      form.append("file", isf);
      const { data } = await api.post<Shipment>("/shipments/isf", form);
      const extras = documentTypes.filter(({ type }) => type !== "isf").flatMap(({ type }) => (files[type] ?? []).map((file) => ({ type, file })));
      let failed = 0;
      if (extras.length) {
        setBusy("Attaching your other documents…");
        failed = (await uploadDocuments(data.hbl, extras)).failed.length;
      }
      await queryClient.invalidateQueries({ queryKey: ["shipments"] });
      router.push(`/client?shipment=${encodeURIComponent(data.hbl)}&created=${failed ? "partial" : "1"}`);
    } catch (error) {
      setError(apiError(error, "We could not confirm the shipment was created. Check My shipments before submitting again."));
      submitting.current = false;
      setBusy(null);
    }
  }

  if (!user?.importer_account) return <div className="surface p-8">Your administrator needs to assign an importer account before you can start a shipment.</div>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/client" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#607780]"><ArrowLeft className="h-4 w-4" /> My shipments</Link>
      <p className="text-xs font-bold uppercase tracking-wider text-[#087FA3]">New shipment</p>
      <h1 className="mt-2 text-3xl font-bold text-[#142B35]">Drop your documents. We handle the rest.</h1>
      <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-[#607780]"><Sparkles className="mt-1 h-4 w-4 shrink-0 text-[#087FA3]" />No forms to fill out. We read the HBL, MBL, containers, delivery address, and E214 header details straight from your documents.</p>
      <div className="surface mt-7 overflow-hidden">
        <div className="space-y-3 p-5 sm:p-7">
          {documentTypes.map(({ type, label, description }) => (
            <DocumentDropSlot
              key={type}
              label={type === "isf" ? `${label} (required)` : `${label} (optional)`}
              description={type === "isf" ? "Starts your shipment" : description}
              files={files[type] ?? []}
              multiple={type !== "isf"}
              accept=".pdf,.txt,.csv,.xlsx"
              disabled={!!busy}
              onFiles={(selected) => addFiles(type, selected)}
              onRemove={(index) => setFiles((current) => ({ ...current, [type]: (current[type] ?? []).filter((_, item) => item !== index) }))}
            />
          ))}
          <p className="pt-1 text-xs text-[#71858D]">PDF, TXT, CSV, or XLSX · Up to 15 MB each. You can add anything you don’t have yet later.</p>
        </div>
        {error && <p role="alert" className="mx-5 mb-4 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:mx-7">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2EBEE] bg-[#F8FAFB] px-5 py-4 sm:px-7">
          <p className="text-xs text-[#607780]">Account: {user.importer_account}</p>
          <button type="button" onClick={submit} disabled={!!busy || !isf} className="inline-flex items-center gap-2 rounded-md bg-[#087FA3] px-5 py-3 text-sm font-bold text-white hover:bg-[#076C8B] disabled:opacity-60">{busy ?? "Submit shipment"}<ArrowRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}
