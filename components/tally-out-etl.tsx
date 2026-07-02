"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, FileSpreadsheet, FileText, Loader2, Scissors, UploadCloud, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { api } from "@/lib/api";
import {
  buildFinalCsv,
  downloadBreakdownXlsx,
  parseFirstRowHeader,
  parseTallyOut,
  runEtl,
  type Cell,
  type EtlResult,
  type SplitRow,
} from "@/lib/ftz-tally-out";

// ---------------------------------------------------------------------------
// File slot
// ---------------------------------------------------------------------------

interface SlotProps {
  label: string;
  hint: string;
  accept: string;
  file: File | null;
  onPick: (f: File | null) => void;
}

function FileSlot({ label, hint, accept, file, onPick }: SlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1.5">{label}</p>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); onPick(e.dataTransfer.files[0] ?? null); }}
        onClick={() => inputRef.current?.click()}
        className={`relative rounded-lg border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors ${
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
          accept={accept}
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        {file ? (
          <div className="flex items-center justify-center gap-2 min-w-0">
            <FileText className="h-5 w-5 shrink-0 text-emerald-600" />
            <span className="truncate text-sm font-semibold text-[#0F172A]">{file.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onPick(null); }}
              className="shrink-0 rounded p-0.5 text-[#94A3B8] hover:bg-white hover:text-[#0F172A]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div>
            <UploadCloud className="mx-auto mb-1.5 h-6 w-6 text-[#94A3B8]" />
            <p className="text-xs text-[#94A3B8]">{hint}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic table
// ---------------------------------------------------------------------------

function fmt(v: Cell | undefined): string {
  if (v == null || v === "") return "";
  if (typeof v === "number") {
    return Number.isInteger(v) ? v.toLocaleString() : v.toFixed(4);
  }
  return String(v);
}

function DataTable({
  columns,
  rows,
  numeric,
}: {
  columns: string[];
  rows: Record<string, Cell>[];
  numeric?: Set<string>;
}) {
  if (rows.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-[#94A3B8]">No rows.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm whitespace-nowrap">
        <thead>
          <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
            {columns.map((c) => (
              <th key={c} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F1F5F9]">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-[#F8FAFC]">
              {columns.map((c) => (
                <td
                  key={c}
                  className={`px-3 py-2 text-[#334155] ${numeric?.has(c) ? "text-right tabular-nums" : ""}`}
                >
                  {fmt(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type Tab = "splits" | "transformed" | "summary" | "final";
const FINAL_COLUMNS = ["Part", "Tariff_Number", "Country_of_Origin", "Quantity", "Unit_Price", "Total_Line_Value", "Gross_Weight_KG", "MID_Code", "SP1", "Privileged_Filing_Date", "DateBucket"];
const FINAL_NUMERIC = new Set(["Quantity", "Unit_Price", "Total_Line_Value", "Gross_Weight_KG"]);
const BREAKDOWN_COLUMNS = ["Source_Row", "ItemCode", "TallyIn", "HTSNumber", "ManufacturerID", "Description", "Quantity", "UnitPrice", "Total", "GrossWeight", "CreatedDate", "DateBucket", "FilingDate", "HTS_Part", "HTS_Count"];
const ROW_CHUNK_SIZE = 200;

interface TallyOutEtlRun {
  id: number;
  created_at: string;
  updated_at: string;
  created_by_email: string | null;
  tally_name: string;
  tally_type: string;
  status: "saving" | "success" | "failed";
  error_message: string | null;
  files: Record<string, unknown>;
  counts: Record<string, unknown>;
  final_rows: Record<string, unknown>[];
  summary_rows: Record<string, unknown>[];
  breakdown_rows: Record<string, unknown>[];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asRows(value: unknown): Record<string, Cell>[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => asRecord(row))
    .filter((row) => Object.keys(row).length > 0)
    .map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          key,
          typeof value === "number" ? value : value == null ? "" : String(value),
        ]),
      ) as Record<string, Cell>,
    );
}

function csvEscape(value: Cell | undefined): string {
  if (value == null) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildRowsCsv(rows: Record<string, Cell>[], columns: string[]): string {
  const header = columns.join(",");
  const body = rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")).join("\n");
  return `${header}\n${body}`;
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function breakdownRowsFromSplits(rows: SplitRow[]): Record<string, Cell>[] {
  return rows.map((row) => ({
    Source_Row: row.__sourceIndex + 1,
    ItemCode: row.ItemCode ?? "",
    TallyIn: row.TallyIn ?? "",
    HTSNumber: row.HTSNumber ?? "",
    ManufacturerID: row.ManufacturerID ?? "",
    Description: row.Description ?? "",
    Quantity: row.Quantity ?? "",
    UnitPrice: row.UnitPrice ?? "",
    Total: row.Total ?? "",
    GrossWeight: row.GrossWeight ?? "",
    CreatedDate: row.CreatedDate ?? "",
    DateBucket: row.DateBucket ?? "",
    FilingDate: row.FilingDate ?? "",
    HTS_Part: row.__partIndex + 1,
    HTS_Count: row.__partCount,
  }));
}

function historyDetails(entry: TallyOutEtlRun) {
  const counts = asRecord(entry.counts);
  const files = asRecord(entry.files);
  const breakdownRows = asRows(entry.breakdown_rows);
  return {
    tallyName: entry.tally_name,
    tallyType: entry.tally_type || "Regular",
    files,
    finalRows: asRows(entry.final_rows),
    breakdownRows,
    finalCount: typeof counts.final_lines === "number" ? counts.final_lines : asRows(entry.final_rows).length,
    splitCount: typeof counts.split_rows === "number" ? counts.split_rows : breakdownRows.length || null,
    tariffCount: typeof counts.tariff_matches === "number" ? counts.tariff_matches : null,
    dateCount: typeof counts.date_matches === "number" ? counts.date_matches : null,
  };
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TallyOutEtl() {
  const queryClient = useQueryClient();
  const [tallyFile, setTallyFile] = useState<File | null>(null);
  const [partsFile, setPartsFile] = useState<File | null>(null);
  const [ftzFile, setFtzFile] = useState<File | null>(null);
  const [tallyType, setTallyType] = useState("Regular");
  const [tallyName, setTallyName] = useState("");

  const [result, setResult] = useState<EtlResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("splits");
  const [selectedHistory, setSelectedHistory] = useState<TallyOutEtlRun | null>(null);

  const historyQuery = useQuery<TallyOutEtlRun[]>({
    queryKey: ["tally-out-etl-history"],
    queryFn: () => api.get<TallyOutEtlRun[]>("/manager/tally-out-etl-runs?limit=500").then((response) => response.data),
    refetchInterval: 30_000,
  });

  const saveRun = useMutation({
    mutationFn: async (etl: EtlResult) => {
      const name = tallyName.trim() || `${tallyType} tally out ${new Date().toLocaleDateString("en-US")}`;
      const created = await api.post<TallyOutEtlRun>("/manager/tally-out-etl-runs", {
        tally_name: name,
        tally_type: tallyType,
        files: {
          tally_out: tallyFile?.name ?? null,
          parts: partsFile?.name ?? null,
          ftz_periodic: ftzFile?.name ?? null,
        },
        counts: {
          tally_out_lines: etl.tallyOutRows.length,
          tariff_matches: etl.tariffCount,
          date_matches: etl.dateCount,
          split_rows: etl.splits.length,
          final_lines: etl.final.length,
          summary_lines: etl.summary.length,
        },
      });

      try {
        for (let i = 0; i < etl.final.length; i += ROW_CHUNK_SIZE) {
          await api.post<TallyOutEtlRun>(`/manager/tally-out-etl-runs/${created.data.id}/rows`, {
            final_rows: etl.final.slice(i, i + ROW_CHUNK_SIZE),
          });
        }
        for (let i = 0; i < etl.summary.length; i += ROW_CHUNK_SIZE) {
          await api.post<TallyOutEtlRun>(`/manager/tally-out-etl-runs/${created.data.id}/rows`, {
            summary_rows: etl.summary.slice(i, i + ROW_CHUNK_SIZE),
          });
        }
        const breakdownRows = breakdownRowsFromSplits(etl.splits);
        for (let i = 0; i < breakdownRows.length; i += ROW_CHUNK_SIZE) {
          await api.post<TallyOutEtlRun>(`/manager/tally-out-etl-runs/${created.data.id}/rows`, {
            breakdown_rows: breakdownRows.slice(i, i + ROW_CHUNK_SIZE),
          });
        }
        return api.patch<TallyOutEtlRun>(`/manager/tally-out-etl-runs/${created.data.id}/status`, {
          status: "success",
        });
      } catch (err) {
        await api.patch(`/manager/tally-out-etl-runs/${created.data.id}/status`, {
          status: "failed",
          error_message: err instanceof Error ? err.message : "Failed to save all ETL rows.",
        }).catch(() => undefined);
        throw err;
      }
    },
    onSuccess: (response) => {
      setSelectedHistory(response.data);
      queryClient.invalidateQueries({ queryKey: ["tally-out-etl-history"] });
    },
  });

  const ready = tallyFile && partsFile && ftzFile && !busy;

  async function process() {
    if (!tallyFile || !partsFile || !ftzFile) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const [tallyBuf, partsBuf, ftzBuf] = await Promise.all([
        tallyFile.arrayBuffer(),
        partsFile.arrayBuffer(),
        ftzFile.arrayBuffer(),
      ]);
      const etl = runEtl({
        tallyOut: parseTallyOut(tallyBuf),
        parts: parseFirstRowHeader(partsBuf),
        ftz: parseFirstRowHeader(ftzBuf),
        tallyType,
      });
      setResult(etl);
      setTab("splits");
      await saveRun.mutateAsync(etl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process the files. Check the formats and try again.");
    } finally {
      setBusy(false);
    }
  }

  function download(rows: EtlResult["final"], suffix: string) {
    const csv = buildFinalCsv(rows);
    const base = (tallyName.trim() || "Tallyout").replace(/[^\w.-]+/g, "_");
    downloadCsv(`${base}${suffix}.csv`, csv);
  }

  function downloadBreakdownCsv() {
    if (!result) return;
    const base = (tallyName.trim() || "FTZ").replace(/[^\w.-]+/g, "_");
    downloadCsv(`${base}_Detailed_Breakdown.csv`, buildRowsCsv(breakdownRowsFromSplits(result.splits), BREAKDOWN_COLUMNS));
  }

  function downloadBreakdown() {
    if (!result) return;
    const base = (tallyName.trim() || "FTZ").replace(/[^\w.-]+/g, "_");
    downloadBreakdownXlsx(result.splits, `${base}_Detailed_Breakdown.xlsx`);
  }

  return (
    <div>
      <PageHeader
        title="Tally Out ETL"
        subtitle="Upload the three FTZ reports to build the Acelynk tally-out import. Review the HTS splits and date buckets before exporting."
      />

      {/* Inputs */}
      <div className="rounded-lg border border-[#E2E8F0] bg-white p-5 space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <FileSlot
            label="Tally Out report"
            hint="TallyOut .csv / .xlsx"
            accept=".csv,.xlsx,.xls"
            file={tallyFile}
            onPick={setTallyFile}
          />
          <FileSlot
            label="Parts report"
            hint="Parts .xlsx (PartNumber → Tariff)"
            accept=".csv,.xlsx,.xls"
            file={partsFile}
            onPick={setPartsFile}
          />
          <FileSlot
            label="FTZ Periodic report"
            hint="FTZPeriodic .csv (CreatedDate)"
            accept=".csv,.xlsx,.xls"
            file={ftzFile}
            onPick={setFtzFile}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-[200px_1fr_auto] sm:items-end">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Tally Type</label>
            <select
              value={tallyType}
              onChange={(e) => setTallyType(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#0369A1] focus:outline-none"
            >
              <option value="Regular">Regular</option>
              <option value="Estimate">Estimate</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Tally Name</label>
            <input
              value={tallyName}
              onChange={(e) => setTallyName(e.target.value)}
              placeholder="e.g. March Periodic"
              className="mt-1.5 w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#0369A1] focus:outline-none"
            />
          </div>
          <button
            onClick={process}
            disabled={!ready}
            className="inline-flex h-[38px] items-center justify-center gap-2 rounded-md bg-[#0369A1] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0284C7] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}
            {busy ? "Processing..." : "Process"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <History
        entries={historyQuery.data ?? []}
        isLoading={historyQuery.isLoading}
        selected={selectedHistory}
        setSelected={setSelectedHistory}
      />

      {result && (
        <Results
          result={result}
          download={download}
          downloadBreakdownCsv={downloadBreakdownCsv}
          downloadBreakdown={downloadBreakdown}
          tab={tab}
          setTab={setTab}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Persisted history
// ---------------------------------------------------------------------------

function History({
  entries,
  isLoading,
  selected,
  setSelected,
}: {
  entries: TallyOutEtlRun[];
  isLoading: boolean;
  selected: TallyOutEtlRun | null;
  setSelected: (entry: TallyOutEtlRun | null) => void;
}) {
  function downloadHistory(entry: TallyOutEtlRun) {
    const details = historyDetails(entry);
    const csv = buildFinalCsv(details.finalRows as EtlResult["final"]);
    const base = details.tallyName.replace(/[^\w.-]+/g, "_") || "Tallyout";
    downloadCsv(`${base}_Tallyout.csv`, csv);
  }

  function downloadHistoryBreakdown(entry: TallyOutEtlRun) {
    const details = historyDetails(entry);
    const base = details.tallyName.replace(/[^\w.-]+/g, "_") || "Tallyout";
    downloadCsv(`${base}_Detailed_Breakdown.csv`, buildRowsCsv(details.breakdownRows, BREAKDOWN_COLUMNS));
  }

  return (
    <div className="mt-6 rounded-lg border border-[#E2E8F0] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">Processed Tally Outs</h2>
          <p className="mt-0.5 text-xs text-[#64748B]">Saved ETL runs stay here so admins can review or download prior outputs.</p>
        </div>
        <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-medium text-[#475569]">
          {entries.length.toLocaleString()} saved
        </span>
      </div>

      {isLoading ? (
        <p className="px-5 py-8 text-center text-sm text-[#94A3B8]">Loading processed tally outs...</p>
      ) : entries.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-[#94A3B8]">No processed tally outs saved yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                {["Processed", "Tally", "Status", "Type", "Final Rows", "Matches", "Files", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {entries.map((entry) => {
                const details = historyDetails(entry);
                return (
                  <tr key={entry.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 text-xs text-[#64748B] whitespace-nowrap">
                      {formatDateTime(entry.updated_at ?? entry.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#0F172A] max-w-[220px] truncate">
                      {details.tallyName}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        entry.status === "success"
                          ? "bg-emerald-50 text-emerald-700"
                          : entry.status === "failed"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                      }`}>
                        {entry.status === "success" ? "Saved" : entry.status === "failed" ? "Failed" : "Saving"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#475569]">{details.tallyType}</td>
                    <td className="px-4 py-3 text-xs tabular-nums text-[#334155]">{details.finalCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-[#475569] whitespace-nowrap">
                      Tariff {details.tariffCount ?? "—"} · Date {details.dateCount ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#64748B] max-w-[260px] truncate">
                      {[details.files.tally_out, details.files.parts, details.files.ftz_periodic].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => setSelected(selected?.id === entry.id ? null : entry)}
                          className="inline-flex items-center gap-1.5 rounded border border-[#E2E8F0] px-2.5 py-1 text-xs font-medium text-[#334155] hover:bg-white"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {selected?.id === entry.id ? "Hide" : "View rows"}
                        </button>
                        <button
                          onClick={() => downloadHistory(entry)}
                          className="inline-flex items-center gap-1.5 rounded border border-[#0369A1] px-2.5 py-1 text-xs font-medium text-[#0369A1] hover:bg-[#F0F9FF]"
                        >
                          <Download className="h-3.5 w-3.5" />
                          CSV
                        </button>
                        <button
                          onClick={() => downloadHistoryBreakdown(entry)}
                          disabled={historyDetails(entry).breakdownRows.length === 0}
                          className="inline-flex items-center gap-1.5 rounded border border-[#E2E8F0] px-2.5 py-1 text-xs font-medium text-[#334155] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                          Breakdown CSV
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="border-t border-[#E2E8F0] p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">{historyDetails(selected).tallyName}</p>
              <p className="mt-0.5 text-xs text-[#64748B]">Final rows saved from this ETL run.</p>
            </div>
            <button
              onClick={() => downloadHistory(selected)}
              className="inline-flex items-center gap-2 rounded-md bg-[#0369A1] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0284C7]"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </button>
            <button
              onClick={() => downloadHistoryBreakdown(selected)}
              disabled={historyDetails(selected).breakdownRows.length === 0}
              className="inline-flex items-center gap-2 rounded-md border border-[#0369A1] bg-white px-3 py-2 text-xs font-semibold text-[#0369A1] hover:bg-[#F0F9FF] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Breakdown CSV
            </button>
          </div>
          <div className="overflow-hidden rounded-lg border border-[#E2E8F0]">
            <DataTable
              columns={FINAL_COLUMNS}
              numeric={FINAL_NUMERIC}
              rows={historyDetails(selected).finalRows}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

function Results({
  result,
  download,
  downloadBreakdownCsv,
  downloadBreakdown,
  tab,
  setTab,
}: {
  result: EtlResult;
  download: (rows: EtlResult["final"], suffix: string) => void;
  downloadBreakdownCsv: () => void;
  downloadBreakdown: () => void;
  tab: Tab;
  setTab: (t: Tab) => void;
}) {
  // Group the split rows by their source line so each split is easy to inspect.
  const splitGroups = useMemo(() => {
    const groups = new Map<number, SplitRow[]>();
    for (const s of result.splits) {
      const arr = groups.get(s.__sourceIndex) ?? [];
      arr.push(s);
      groups.set(s.__sourceIndex, arr);
    }
    return [...groups.entries()]
      .map(([sourceIndex, rows]) => ({
        sourceIndex,
        rows,
        source: result.transformed[sourceIndex],
        multi: rows.length > 1,
      }))
      .sort((a, b) => Number(b.multi) - Number(a.multi)); // multi-HTS lines first
  }, [result]);

  const multiCount = splitGroups.filter((g) => g.multi).length;

  // Distinct date buckets present in the final output.
  const buckets = useMemo(
    () => [...new Set(result.final.map((r) => String(r.DateBucket ?? "Unknown")))],
    [result],
  );

  const stats: [string, string | number][] = [
    ["Tally Out lines", result.tallyOutRows.length],
    ["Tariff matches", result.tariffCount],
    ["Date matches", result.dateCount],
    ["Multi-HTS lines", multiCount],
    ["Split rows", result.splits.length],
    ["Final lines", result.final.length],
  ];

  const tabs: [Tab, string][] = [
    ["splits", `HTS Splits (${result.splits.length})`],
    ["transformed", `Transformed (${result.transformed.length})`],
    ["summary", `Summary (${result.summary.length})`],
    ["final", `Final Output (${result.final.length})`],
  ];

  return (
    <div className="mt-6 space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#64748B]">{label}</p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums text-[#020617]">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {result.isEstimate && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Processed as an <strong>Estimate</strong>: quantity taken from TallyInDeductedQty and total from UnitPrice1.
        </div>
      )}

      {/* Download */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={() => download(result.final, "_Tallyout")}
          className="inline-flex items-center gap-2 rounded-md bg-[#0369A1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0284C7]"
        >
          <Download className="h-4 w-4" />
          Download Tallyout.csv
        </button>
        <button
          onClick={downloadBreakdown}
          className="inline-flex items-center gap-2 rounded-md border border-[#0369A1] bg-white px-4 py-2 text-sm font-semibold text-[#0369A1] hover:bg-[#F0F9FF]"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Detailed Breakdown (.xlsx)
        </button>
        <button
          onClick={downloadBreakdownCsv}
          className="inline-flex items-center gap-2 rounded-md border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]"
        >
          <Download className="h-4 w-4" />
          Detailed Breakdown CSV
        </button>
        {buckets.length > 1 && buckets.map((b) => (
          <button
            key={b}
            onClick={() => download(result.final.filter((r) => String(r.DateBucket ?? "Unknown") === b), `_${b}`)}
            className="inline-flex items-center gap-2 rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-medium text-[#475569] hover:bg-[#F8FAFC]"
          >
            <Download className="h-3.5 w-3.5" />
            {b}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div>
        <div className="flex flex-wrap gap-1 border-b border-[#E2E8F0]">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-3.5 py-2 text-sm font-medium transition-colors ${
                tab === key
                  ? "border-[#0369A1] text-[#0369A1]"
                  : "border-transparent text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-[#E2E8F0] bg-white overflow-hidden">
          {tab === "splits" && <SplitsView groups={splitGroups} />}
          {tab === "transformed" && (
            <DataTable
              columns={["ItemCode", "TallyIn", "HTSNumber", "ManufacturerID", "Quantity", "UnitPrice", "Total", "GrossWeight", "CreatedDate"]}
              numeric={new Set(["Quantity", "UnitPrice", "Total", "GrossWeight"])}
              rows={result.transformed}
            />
          )}
          {tab === "summary" && (
            <DataTable
              columns={["DateBucket", "ManufacturerID", "HTSNumber", "ItemCode", "TotalQuantity", "TotalUnitPrice", "TotalAmount", "TotalGrossWeight", "FilingDate"]}
              numeric={new Set(["TotalQuantity", "TotalUnitPrice", "TotalAmount", "TotalGrossWeight"])}
              rows={result.summary as unknown as Record<string, Cell>[]}
            />
          )}
          {tab === "final" && (
            <DataTable
              columns={FINAL_COLUMNS}
              numeric={FINAL_NUMERIC}
              rows={result.final}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HTS splits view — the key inspection surface
// ---------------------------------------------------------------------------

function SplitsView({
  groups,
}: {
  groups: { sourceIndex: number; rows: SplitRow[]; source: Record<string, Cell>; multi: boolean }[];
}) {
  const [onlyMulti, setOnlyMulti] = useState(true);
  const shown = onlyMulti ? groups.filter((g) => g.multi) : groups;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-[#F1F5F9] px-4 py-2.5">
        <p className="text-xs text-[#64748B]">
          Each line with comma-separated HTS codes is split into one row per code; gross weight and total are divided evenly (last code takes the remainder).
        </p>
        <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-[#475569]">
          <input type="checkbox" checked={onlyMulti} onChange={(e) => setOnlyMulti(e.target.checked)} />
          Only split lines
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-[#94A3B8]">No lines split into multiple HTS codes.</p>
      ) : (
        <div className="divide-y divide-[#F1F5F9]">
          {shown.map((g) => (
            <div key={g.sourceIndex} className="px-4 py-3.5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-semibold text-[#0F172A]">{fmt(g.source.ItemCode) || "—"}</span>
                {g.multi && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F0F9FF] px-2 py-0.5 text-xs font-medium text-[#0369A1]">
                    <Scissors className="h-3 w-3" />
                    {g.rows.length} HTS
                  </span>
                )}
                <span className="text-xs text-[#64748B]">Qty {fmt(g.source.Quantity)}</span>
                <span className="text-xs text-[#64748B]">Total {fmt(g.source.Total)}</span>
                <span className="text-xs text-[#64748B]">GW {fmt(g.source.GrossWeight)}</span>
                <span className="font-mono text-xs text-[#94A3B8]">{fmt(g.source.HTSNumber)}</span>
              </div>

              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-[#94A3B8]">
                      <th className="py-1 pr-4 font-medium">HTS</th>
                      <th className="py-1 pr-4 text-right font-medium">Unit Price</th>
                      <th className="py-1 pr-4 text-right font-medium">Total</th>
                      <th className="py-1 pr-4 text-right font-medium">Gross Wt</th>
                      <th className="py-1 pr-4 font-medium">Date Bucket</th>
                      <th className="py-1 pr-4 font-medium">Filing Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r, i) => (
                      <tr key={i} className="border-t border-[#F8FAFC]">
                        <td className="py-1.5 pr-4 font-mono text-xs text-[#0F172A]">{fmt(r.HTSNumber)}</td>
                        <td className="py-1.5 pr-4 text-right tabular-nums text-[#334155]">{fmt(r.UnitPrice)}</td>
                        <td className="py-1.5 pr-4 text-right tabular-nums text-[#334155]">{fmt(r.Total)}</td>
                        <td className="py-1.5 pr-4 text-right tabular-nums text-[#334155]">{fmt(r.GrossWeight)}</td>
                        <td className="py-1.5 pr-4">
                          <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#475569]">{fmt(r.DateBucket)}</span>
                        </td>
                        <td className="py-1.5 pr-4 text-xs text-[#64748B]">{fmt(r.FilingDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
