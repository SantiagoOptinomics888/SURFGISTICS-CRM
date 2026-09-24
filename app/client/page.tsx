"use client";

import Link from "next/link";
import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Circle, Download, FileText, Plus, RefreshCw, Search, Ship, Sparkles, UploadCloud } from "lucide-react";
import { api } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { workflowStatuses, apiError, documentTypes, downloadDocument, missingDocuments, statusLabel, uploadDocuments, validateFile, type Shipment, type ShipmentDocument } from "@/lib/client-shipments";
import { DocumentDropSlot } from "@/components/client/document-drop-slot";

export default function ClientPage() {
  return <Suspense fallback={<p className="p-6">Loading your workspace…</p>}><ClientShipments /></Suspense>;
}

function ClientShipments() {
  const user = getAuth();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedHbl, setSelectedHbl] = useState<string | null>(params.get("shipment"));
  const created = params.get("created");
  const [notice, setNotice] = useState<string | null>(created ? "Shipment submitted. We’re reading your documents now — no further details needed." : null);
  const [error, setError] = useState<string | null>(created === "partial" ? "Your shipment was created, but some documents didn’t upload. Please add them again below." : null);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const busy = uploadingType !== null;
  const submitting = useRef(false);
  const shipments = useQuery<Shipment[]>({
    queryKey: ["shipments", "client", user?.email, user?.importer_account],
    queryFn: async () => (await api.get("/shipments")).data,
    enabled: !!user?.importer_account,
    refetchInterval: 30_000,
    retry: 1,
  });
  const data = shipments.data ?? [];
  const needsDocuments = data.filter((shipment) => missingDocuments(shipment).length > 0);
  const filtered = data.filter((shipment) => shipment.hbl.toLowerCase().includes(search.toLowerCase()) && (filter === "all" || missingDocuments(shipment).length > 0));
  const selected = data.find((shipment) => shipment.hbl === selectedHbl);

  async function upload(shipment: Shipment, type: string, files: File[]) {
    if (submitting.current) return;
    const invalid = files.map((file) => validateFile(file, type)).find(Boolean);
    if (invalid) { setError(invalid); return; }
    submitting.current = true;
    setUploadingType(type);
    setError(null);
    setNotice(null);
    try {
      const { failed } = await uploadDocuments(shipment.hbl, files.map((file) => ({ type, file })));
      const received = files.filter((file) => !failed.some((item) => item.file === file));
      if (received.length) setNotice(`${received.map((file) => file.name).join(", ")} received. We’ll pull the details from ${received.length > 1 ? "them" : "it"} automatically.`);
      if (failed.length) setError(failed.map((item) => item.error).join(" "));
      await queryClient.invalidateQueries({ queryKey: ["shipments"] });
    } finally {
      setUploadingType(null);
      submitting.current = false;
    }
  }
  async function download(shipment: Shipment, document: ShipmentDocument) {
    setError(null);
    try { await downloadDocument(shipment.hbl, document); }
    catch (error) { setError(apiError(error, "Could not download this document. Please try again.")); }
  }

  if (!user?.importer_account) return <div className="surface p-8"><h1 className="text-xl font-bold">Your account needs setup</h1><p className="mt-2 text-sm text-[#607780]">Contact your Surfgistics administrator to assign your importer account.</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-wider text-[#087FA3]">Client portal</p><h1 className="mt-2 text-3xl font-bold text-[#142B35]">Your shipments, in one place.</h1><p className="mt-2 text-sm text-[#607780]">Send your documents and follow each shipment with Surfgistics.</p></div>
        <Link href="/client/new" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-[#087FA3] px-4 py-3 text-sm font-bold text-white hover:bg-[#076C8B]"><Plus className="h-4 w-4" /> Start a shipment</Link>
      </div>
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
      {shipments.isError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">We could not load your shipments. <button onClick={() => shipments.refetch()} className="font-bold underline">Try again</button></div>}
      <div className="grid gap-3 sm:grid-cols-3">
        {[{ label: "Your shipments", value: data.length, hint: "All shipments on your account", icon: Ship }, { label: "Documents to add", value: needsDocuments.length, hint: "Shipments with outstanding documents", icon: UploadCloud }, { label: "Documents received", value: data.reduce((sum, shipment) => sum + shipment.documents.length, 0), hint: "Stored with your shipment records", icon: FileText }].map(({ label, value, hint, icon: Icon }) => <div key={label} className="surface p-5"><div className="flex items-center justify-between"><p className="text-xs font-bold text-[#607780]">{label}</p><Icon className="h-5 w-5 text-[#087FA3]" /></div><p className="mt-3 text-3xl font-bold text-[#142B35]">{shipments.isLoading || shipments.isError ? "—" : value}</p><p className="mt-1 text-xs text-[#71858D]">{hint}</p></div>)}
      </div>
      <section className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2EBEE] p-4 sm:px-5">
          <div className="flex items-center gap-2"><h2 className="font-bold text-[#142B35]">My shipments</h2><button onClick={() => shipments.refetch()} aria-label="Refresh shipments" disabled={shipments.isFetching} className="rounded p-2 text-[#607780] hover:bg-slate-100 disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${shipments.isFetching ? "animate-spin" : ""}`} /></button></div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <label className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-[#71858D]" /><input aria-label="Search shipments by HBL" placeholder="Search HBL…" value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 w-full rounded-md border border-[#CFDDE1] py-2 pl-9 pr-3 text-sm sm:w-52" /></label>
            <select aria-label="Filter shipments" value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 rounded-md border border-[#CFDDE1] bg-white px-3 text-sm text-[#3F5963]"><option value="all">All shipments</option><option value="documents">Documents to add</option></select>
          </div>
        </div>
        {shipments.isLoading ? <p role="status" className="p-8 text-sm text-[#607780]">Loading your shipments…</p> : !shipments.isError && filtered.length === 0 ? <div className="px-5 py-12 text-center"><Ship className="mx-auto h-9 w-9 text-[#91ACB6]" /><h3 className="mt-4 text-lg font-bold text-[#142B35]">{data.length ? "No matching shipments" : "Your next shipment starts here"}</h3><p className="mt-2 text-sm text-[#607780]">{data.length ? "Try another HBL or change the filter." : "Upload your ISF and we’ll create a shipment for your documents and updates."}</p>{!data.length && <Link href="/client/new" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#087FA3]">Start your first shipment <ArrowRight className="h-4 w-4" /></Link>}</div> : <div className="divide-y divide-[#E2EBEE]">{filtered.map((shipment) => <button key={shipment.id} disabled={busy} onClick={() => setSelectedHbl(shipment.hbl)} className={`flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left transition-colors hover:bg-[#F4FAFB] ${selected?.id === shipment.id ? "bg-[#EDF8FB]" : ""}`} aria-pressed={selected?.id === shipment.id}><div><p className="font-mono text-sm font-bold text-[#142B35]">{shipment.hbl}</p><p className="mt-1 text-xs text-[#607780]">Started {date(shipment.created_at)} · {shipment.documents.length} documents</p></div><div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-[#E7F2F6] px-3 py-1.5 text-xs font-semibold text-[#24566A]">{statusLabel(shipment)}</span><span className="text-xs text-[#607780]">{missingDocuments(shipment).length ? `${missingDocuments(shipment).length} to add` : "All documents received"}</span><ArrowRight className="h-4 w-4 text-[#087FA3]" /></div></button>)}</div>}
      </section>
      {selected ? <section className="surface overflow-hidden" aria-label={`Shipment ${selected.hbl} details`}>
        <div className="flex flex-wrap justify-between gap-3 border-b border-[#E2EBEE] bg-[#F7FAFB] p-5"><div><p className="text-xs font-bold text-[#607780]">Shipment documents & updates</p><h2 className="mt-1 font-mono text-xl font-bold text-[#142B35]">{selected.hbl}</h2></div><p className="self-center text-sm font-semibold text-[#087FA3]">{statusLabel(selected)}</p></div>
        <div className="grid gap-7 p-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="min-w-0">
            <h3 className="font-bold text-[#142B35]">Document checklist</h3><p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-[#607780]"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#087FA3]" />Just drop each document in — no forms. We capture the shipment and E214 header details from the files.</p>
            <div className="mt-4 space-y-2">{documentTypes.map(({ type, label, description }) => { const received = selected.documents.some((doc) => doc.document_type === type); return type === "isf" ? <div key={type} className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">{received ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <Circle className="h-5 w-5 shrink-0 text-[#A1B4BC]" />}<div><p className="text-sm font-semibold text-[#24505F]">{label}</p><p className="text-xs text-[#71858D]">{received ? "Received" : description}</p></div></div> : <DocumentDropSlot key={type} label={label} description={description} received={received} multiple accept=".pdf,.txt,.csv,.xlsx" disabled={busy} uploading={uploadingType === type} onFiles={(files) => upload(selected, type, files)} />; })}
              <DocumentDropSlot label="Other documents" description="Anything else for this shipment" multiple accept=".pdf,.txt,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.docx" disabled={busy} uploading={uploadingType === "other"} onFiles={(files) => upload(selected, "other", files)} />
            </div>
            <h3 className="mb-3 mt-7 text-sm font-bold text-[#142B35]">Received files</h3>
            <div className="divide-y divide-[#E2EBEE]">{selected.documents.map((document) => <button key={document.id} onClick={() => download(selected, document)} className="flex w-full items-center gap-3 py-3 text-left"><FileText className="h-4 w-4 shrink-0 text-[#71858D]" /><span className="min-w-0 flex-1"><span className="block break-all text-xs font-semibold text-[#087FA3]">{document.file_name}</span><span className="text-xs text-[#71858D]">{(document.file_size / 1024).toFixed(0)} KB · {date(document.created_at)}</span></span><Download className="h-4 w-4 shrink-0 text-[#087FA3]" /></button>)}</div>
          </div>
          <aside className="min-w-0 space-y-6">
            <div><h3 className="text-sm font-bold text-[#142B35]">Progress</h3><dl className="mt-3 space-y-3">{workflowStatuses(selected).map(({ label, status, done }) => <div key={label} className="flex items-start gap-3 rounded-lg border border-[#E2EBEE] p-3">{done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="h-4 w-4 shrink-0 text-[#A1B4BC]" />}<div><dt className="text-xs font-bold text-[#24505F]">{label}</dt><dd className="mt-1 text-xs text-[#607780]">{status}</dd></div></div>)}</dl></div>
            <div className="rounded-lg bg-[#F4F8FA] p-4"><h3 className="text-sm font-bold text-[#142B35]">What happens next</h3><p className="mt-2 text-sm leading-6 text-[#607780]">{missingDocuments(selected).length ? "Drop in the outstanding documents whenever you have them. We extract everything we need automatically and handle the filings." : "Your documents are with the operations team for review. Shipment updates will appear here as processing continues."}</p>{selected.document_request_due_at && <p className="mt-3 text-xs text-[#607780]">Document follow-up scheduled: {date(selected.document_request_due_at)}</p>}</div>
            <div><h3 className="text-sm font-bold text-[#142B35]">Delivery details</h3><p className="mt-1 text-xs text-[#71858D]">Captured from your ISF</p><p className="mt-2 break-words text-sm leading-6 text-[#607780]">{[selected.client_delivery_address?.name, selected.client_delivery_address?.line1, selected.client_delivery_address?.line2, selected.client_delivery_address?.city, selected.client_delivery_address?.state, selected.client_delivery_address?.postal_code, selected.client_delivery_address?.country].filter(Boolean).join(", ") || "Contact your operations team to confirm delivery details."}</p><p className="mt-2 break-all text-xs text-[#607780]">{selected.client_email}</p><p className="mt-2 text-xs text-[#71858D]">Need a correction? Contact your Surfgistics operations team.</p></div>
            <div><h3 className="mb-4 text-sm font-bold text-[#142B35]">Shipment activity</h3><ol className="space-y-4 border-l border-[#D5E4E9] pl-4">{[...(selected.events ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 12).map((event) => <li key={event.id}><p className="text-xs font-semibold text-[#3F5963]">{event.event_type === "automation_approved" ? "Shipment approved for processing" : event.title}</p><p className="mt-1 text-xs text-[#71858D]">{date(event.created_at)}</p></li>)}</ol></div>
          </aside>
        </div>
      </section> : data.length > 0 && <p className="text-center text-sm text-[#607780]">Select a shipment to view its documents and updates.</p>}
    </div>
  );
}
function date(value: string) { return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
