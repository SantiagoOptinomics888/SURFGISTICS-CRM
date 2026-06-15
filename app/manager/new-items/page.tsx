"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import type { AcelynkLogEntry, AcelynkResource } from "@/lib/types";

type ModuleKey = AcelynkResource;

const MODULES: { key: ModuleKey; label: string; automated: boolean }[] = [
  { key: "parts", label: "Parts", automated: true },
  { key: "ftz_line_item", label: "Tally In", automated: true },
  { key: "inbond", label: "In-Bonds", automated: false },
  { key: "tally_out", label: "Tally Out", automated: false },
];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_DOTS: Record<string, string> = {
  pending: "bg-amber-500",
  success: "bg-emerald-500",
  failed: "bg-red-500",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  success: "Sent",
  failed: "Failed",
};

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function redactEmbeddedData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactEmbeddedData);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      key === "data_base64" && typeof item === "string" ? `[embedded file data, ${item.length} chars]` : redactEmbeddedData(item),
    ])
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function partErrorsFromDetails(details: Record<string, unknown>) {
  const raw = Array.isArray(details.part_errors) ? details.part_errors : [];
  return raw.map((item) => {
    const record = asRecord(item);
    return {
      excelRow: asNumber(record.excel_row),
      partNumber: asString(record.part_number),
      description: asString(record.description),
      tariff: asString(record.tariff),
      country: asString(record.country),
      issues: asStringList(record.issues),
    };
  });
}

function detailLinesFromDetails(details: Record<string, unknown>): string[] {
  return [
    ...asStringList(details.details),
    ...asStringList(details.acelynk_save_errors),
  ];
}

function friendlyFixes(entry: AcelynkLogEntry, details: Record<string, unknown>, partErrors: ReturnType<typeof partErrorsFromDetails>) {
  const message = `${entry.error_message ?? ""} ${detailLinesFromDetails(details).join(" ")}`.toLowerCase();
  const fixes = new Set<string>();

  for (const partError of partErrors) {
    for (const issue of partError.issues) {
      fixes.add(issue);
    }
  }

  if (message.includes("tariff")) {
    fixes.add("Check the tariff number. Acelynk usually expects the HTS/tariff value without periods or extra characters.");
  }
  if (message.includes("duplicate")) {
    fixes.add("Remove duplicate part numbers from the upload, or keep one row per importer and part number.");
  }
  if (message.includes("cannot find column") || message.includes("column")) {
    fixes.add("Use the latest Acelynk template and keep the column headers exactly as downloaded.");
  }
  if (message.includes("did not finish accepting") || message.includes("hasfile")) {
    fixes.add("Try reprocessing. If it repeats, confirm the file was attached in Acelynk before pressing Upload.");
  }
  if (message.includes("did not finish saving") || message.includes("after confirm")) {
    fixes.add("The file validated, but Acelynk did not complete the save. Reprocess once, then check whether those rows already exist in Acelynk.");
  }
  if (message.includes("page.screenshot") || message.includes("browser has been closed")) {
    fixes.add("The browser session closed during the run. Reprocess after confirming no other Acelynk watcher is running.");
  }
  if (fixes.size === 0) {
    fixes.add("Review the screenshot and the affected rows below, then correct the source upload and reprocess.");
  }

  return Array.from(fixes);
}

function friendlyErrorSummary(entry: AcelynkLogEntry) {
  const details = asRecord(entry.details);
  const confirmSummary = asRecord(details.confirm_summary);
  const uploadSummary = asRecord(details.upload_summary);
  const partErrors = partErrorsFromDetails(details);
  const detailLines = detailLinesFromDetails(details);
  const rowCount = asNumber(details.row_count) ?? asNumber(confirmSummary.rows) ?? asNumber(uploadSummary.total_rows);
  const validCount = asNumber(details.valid_count) ?? asNumber(confirmSummary.valid);
  const detectedErrorCount = asNumber(details.error_count) ?? asNumber(confirmSummary.errors) ?? partErrors.length;
  const errorCount = detectedErrorCount > 0 ? detectedErrorCount : null;
  const fileName = asString(details.file_name);
  const title = errorCount && errorCount > 0
    ? `${errorCount} row${errorCount === 1 ? "" : "s"} need attention`
    : "Acelynk could not finish this upload";
  const explanation = entry.error_message
    ? entry.error_message.replace(/^Acelynk\s*/i, "Acelynk ")
    : "The watcher reached Acelynk, but the upload did not complete successfully.";

  return {
    title,
    explanation,
    details,
    fileName,
    rowCount,
    validCount,
    errorCount,
    partErrors,
    detailLines,
    fixes: friendlyFixes(entry, details, partErrors),
  };
}

export default function ModulesPage() {
  const [activeTab, setActiveTab] = useState<ModuleKey>("parts");
  const activeModule = MODULES.find((m) => m.key === activeTab)!;

  return (
    <div>
      <PageHeader
        title="Modules"
        subtitle="Acelynk push status by module — manage retries when a vendor upload fails to reach Acelynk."
      />

      {/* Tabs */}
      <div className="border-b border-[#E2E8F0] mb-5">
        <nav className="flex gap-0 -mb-px">
          {MODULES.map((m) => (
            <button
              key={m.key}
              onClick={() => setActiveTab(m.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === m.key
                  ? "border-[#0369A1] text-[#0369A1]"
                  : "border-transparent text-[#64748B] hover:text-[#334155] hover:border-[#CBD5E1]"
              }`}
            >
              {m.label}
              {!m.automated && (
                <span className="ml-2 text-[10px] uppercase tracking-wider text-[#94A3B8]">manual</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {activeModule.automated ? (
        <ModuleStatusTable resourceType={activeTab} />
      ) : (
        <ManualModulePlaceholder label={activeModule.label} />
      )}
    </div>
  );
}

function ModuleStatusTable({ resourceType }: { resourceType: ModuleKey }) {
  const queryClient = useQueryClient();
  const [errorPreview, setErrorPreview] = useState<AcelynkLogEntry | null>(null);

  const { data, isLoading, error } = useQuery<AcelynkLogEntry[]>({
    queryKey: ["acelynk-log", resourceType],
    queryFn: () =>
      api.get(`/manager/acelynk-log?resource_type=${resourceType}&limit=200`).then((r) => r.data),
    refetchInterval: 15_000,
  });

  const reprocess = useMutation({
    mutationFn: (id: number) => api.post(`/manager/acelynk-log/${id}/reprocess`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["acelynk-log", resourceType] }),
  });

  if (isLoading) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-lg">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-4 px-5 py-4 border-b border-[#F1F5F9]">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3.5 w-24 ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
        Failed to load Acelynk log.
      </div>
    );
  }

  const rows = data ?? [];

  return (
    <>
      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                {["Account", "Identifier", "Status", "Processed", "Retries", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-[#94A3B8]">
                    No Acelynk push attempts logged yet for this module.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-[#0369A1] font-semibold whitespace-nowrap">
                    {row.importer_account ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#334155] truncate max-w-[260px]">
                    {row.identifier}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${
                        STATUS_STYLES[row.status] ?? "bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOTS[row.status] ?? "bg-[#94A3B8]"}`} />
                      {STATUS_LABELS[row.status] ?? row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#475569] whitespace-nowrap">
                    {row.processed_at ? formatRelative(row.processed_at) : formatRelative(row.created_at)}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#64748B] tabular-nums">{row.retried_count || "—"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      {row.status === "failed" && row.error_message && (
                        <button
                          onClick={() => setErrorPreview(row)}
                          className="text-xs font-medium px-2.5 py-1 rounded border border-[#E2E8F0] text-[#334155] hover:bg-white hover:border-[#CBD5E1] transition-colors cursor-pointer"
                        >
                          View error
                        </button>
                      )}
                      {row.status === "failed" && (
                        <button
                          onClick={() => reprocess.mutate(row.id)}
                          disabled={reprocess.isPending}
                          className="text-xs font-medium px-2.5 py-1 rounded bg-[#0369A1] text-white hover:bg-[#0284C7] transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {reprocess.isPending ? "…" : "Reprocess"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-[#94A3B8] mt-3">
        Auto-refreshing every 15s. The watcher fires every 60s — a queued Reprocess may take up to a minute to pick up.
      </p>

      {errorPreview && (
        <ErrorPreviewModal entry={errorPreview} onClose={() => setErrorPreview(null)} />
      )}
    </>
  );
}

function ErrorPreviewModal({ entry, onClose }: { entry: AcelynkLogEntry; onClose: () => void }) {
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotState, setScreenshotState] = useState<"loading" | "ready" | "missing">("loading");
  const [downloadState, setDownloadState] = useState<"idle" | "downloading" | "missing">("idle");
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const summary = friendlyErrorSummary(entry);
  const detailsForDisplay = redactEmbeddedData(entry.details ?? {});

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setScreenshotUrl(null);
    setScreenshotState("loading");

    api
      .get(`/manager/acelynk-log/${entry.id}/screenshot?kind=error`, { responseType: "blob" })
      .then((response) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(response.data);
        setScreenshotUrl(objectUrl);
        setScreenshotState("ready");
      })
      .catch(() => {
        if (active) setScreenshotState("missing");
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [entry.id]);

  function downloadUploadFile() {
    setDownloadState("downloading");
    api
      .get(`/manager/acelynk-log/${entry.id}/file`, { responseType: "blob" })
      .then((response) => {
        const objectUrl = URL.createObjectURL(response.data);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = summary.fileName ?? `acelynk_upload_${entry.id}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
        setDownloadState("idle");
      })
      .catch(() => {
        setDownloadState("missing");
      });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[86vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-lg font-semibold text-[#020617]">Acelynk error — {entry.identifier}</h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              {entry.importer_account ?? "—"} · attempt #{(entry.retried_count || 0) + 1}
            </p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#334155] cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-800">{summary.title}</p>
            <p className="mt-1 text-sm text-red-700">{summary.explanation}</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E2E8F0] bg-white px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">Need to correct the upload?</p>
              <p className="mt-0.5 text-xs text-[#64748B]">
                Download the exact file sent to Acelynk, edit it, then reupload or reprocess after fixing the source data.
              </p>
              {downloadState === "missing" && (
                <p className="mt-1 text-xs font-medium text-amber-700">
                  This older log does not have a downloadable file attached.
                </p>
              )}
            </div>
            <button
              onClick={downloadUploadFile}
              disabled={downloadState === "downloading"}
              className="inline-flex items-center gap-2 rounded-md bg-[#0369A1] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0284C7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {downloadState === "downloading" ? "Preparing..." : "Download upload file"}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">File</p>
              <p className="mt-1 truncate text-xs font-medium text-[#334155]" title={summary.fileName ?? undefined}>
                {summary.fileName ?? "Not provided"}
              </p>
            </div>
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Rows</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[#0F172A]">{summary.rowCount ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Valid</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-700">{summary.validCount ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Errors</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-red-700">{summary.errorCount ?? "—"}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#334155] uppercase tracking-wider mb-2">How to fix it</p>
            <ul className="space-y-2">
              {summary.fixes.map((fix) => (
                <li key={fix} className="flex gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#334155]">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0369A1]" />
                  <span>{fix}</span>
                </li>
              ))}
            </ul>
          </div>

          {summary.partErrors.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#334155] uppercase tracking-wider mb-2">Affected parts</p>
              <div className="overflow-hidden rounded-lg border border-[#E2E8F0]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                      {["Row", "Part", "Tariff", "Country", "Issue"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {summary.partErrors.slice(0, 12).map((partError, index) => (
                      <tr key={`${partError.excelRow ?? index}-${partError.partNumber ?? index}`}>
                        <td className="px-3 py-2 text-xs tabular-nums text-[#64748B]">{partError.excelRow ?? "—"}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-[#0F172A]">{partError.partNumber ?? "—"}</p>
                          {partError.description && <p className="max-w-[180px] truncate text-xs text-[#64748B]">{partError.description}</p>}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-[#334155]">{partError.tariff ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-[#334155]">{partError.country ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-red-700">
                          {partError.issues.length > 0 ? partError.issues.join("; ") : "Review this row in the source file."}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {summary.partErrors.length > 12 && (
                <p className="mt-2 text-xs text-[#64748B]">
                  Showing 12 of {summary.partErrors.length} affected parts. Export or open the source file to review the rest.
                </p>
              )}
            </div>
          )}

          {summary.detailLines.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#334155] uppercase tracking-wider mb-2">Acelynk messages</p>
              <div className="space-y-2">
                {summary.detailLines.map((line) => (
                  <p key={line} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-[#334155] uppercase tracking-wider mb-1.5">Screenshot</p>
            {screenshotState === "loading" && (
              <div className="h-48 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] animate-pulse" />
            )}
            {screenshotState === "missing" && (
              <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-3 py-8 text-center text-xs text-[#64748B]">
                No screenshot is attached to this error.
              </div>
            )}
            {screenshotUrl && (
              <a href={screenshotUrl} target="_blank" rel="noreferrer" className="block">
                <img
                  src={screenshotUrl}
                  alt={`Acelynk error screenshot for ${entry.identifier}`}
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] object-contain max-h-[420px]"
                />
              </a>
            )}
          </div>

          {Object.keys(entry.details ?? {}).length > 0 && (
            <div>
              <button
                onClick={() => setShowTechnicalDetails((value) => !value)}
                className="flex w-full items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#334155] hover:bg-white"
              >
                Technical details
                <span className="text-[#64748B]">{showTechnicalDetails ? "Hide" : "Show"}</span>
              </button>
              {showTechnicalDetails && (
                <pre className="mt-2 max-h-72 overflow-auto rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-xs font-mono text-[#334155]">
                  {JSON.stringify(detailsForDisplay, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ManualModulePlaceholder({ label }: { label: string }) {
  return (
    <div className="bg-white border border-dashed border-[#CBD5E1] rounded-lg px-6 py-12 text-center">
      <p className="text-sm font-medium text-[#334155]">No automated Acelynk push for {label} yet.</p>
      <p className="text-xs text-[#64748B] mt-1">
        Records still flow into the CRM normally — they just don&apos;t get auto-pushed to Acelynk.
        Set up an agent + watcher (mirroring the Parts/Tally In pattern) when you&apos;re ready.
      </p>
    </div>
  );
}
