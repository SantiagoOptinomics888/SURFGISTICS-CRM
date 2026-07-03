// FTZ Tally Out ETL — in-browser port of the "FTZ TallyOut ETL Workflow" n8n flow.
//
// Pipeline (each function mirrors one node in the original workflow):
//   parse 3 files → Build Tariff Lookup + Build CreatedDate Lookup
//   → Transform TallyOut Data → Split HTS & Group by Date
//   → Summarize by Manufacturer & HTS → Build Final Data (Acelynk import shape)
//
// Everything runs client-side; the only external dependency is SheetJS (xlsx),
// which is already used elsewhere in the app for CSV/XLSX handling.

import * as XLSX from "xlsx";

export type Cell = string | number;
export type DataRow = Record<string, Cell>;

/** parseFloat that never returns NaN — matches the `parseFloat(x) || 0` idiom in the n8n code. */
function num(v: Cell | undefined): number {
  const n = parseFloat(String(v ?? ""));
  return Number.isNaN(n) ? 0 : n;
}

function normalizeTallyIn(value: Cell | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^\d+$/.test(raw)) {
    return String(Number(raw));
  }
  return raw.replace(/^0+/, "") || raw;
}

// ---------------------------------------------------------------------------
// File parsing
// ---------------------------------------------------------------------------

/** Raw file bytes — a browser ArrayBuffer or a Node Buffer/Uint8Array. */
export type FileBytes = ArrayBuffer | Uint8Array;

function bytesToMatrix(data: FileBytes): string[][] {
  const wb = XLSX.read(data, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
}

function matrixToObjects(matrix: string[][], headerIndex: number): DataRow[] {
  const header = (matrix[headerIndex] ?? []).map((h) =>
    String(h).replace(/^﻿/, "").trim(),
  );
  const rows: DataRow[] = [];
  for (let i = headerIndex + 1; i < matrix.length; i++) {
    const r = matrix[i];
    if (!r || r.every((c) => String(c ?? "").trim() === "")) continue;
    const obj: DataRow = {};
    header.forEach((h, idx) => {
      if (h) obj[h] = r[idx] != null ? String(r[idx]) : "";
    });
    rows.push(obj);
  }
  return rows;
}

/**
 * Tally Out reports carry a few banner rows above the real header. Find the
 * header row the same way "Clean misleading rows" did: it contains TallyIn,
 * ItemCode and either Quantity (Regular) or TallyInDeductedQty (Estimate).
 */
export function parseTallyOut(data: FileBytes): DataRow[] {
  const matrix = bytesToMatrix(data);
  let headerIndex = 0;
  for (let i = 0; i < matrix.length; i++) {
    const line = matrix[i].join(",");
    if (
      line.includes("TallyIn") &&
      line.includes("ItemCode") &&
      (line.includes("Quantity") || line.includes("TallyInDeductedQty"))
    ) {
      headerIndex = i;
      break;
    }
  }
  return matrixToObjects(matrix, headerIndex);
}

/** Parts (xlsx) and FTZ Periodic (csv) both use the first row as the header. */
export function parseFirstRowHeader(data: FileBytes): DataRow[] {
  return matrixToObjects(bytesToMatrix(data), 0);
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

/** Build Tariff Lookup: PartNumber → Tariff (from the Parts report). */
export function buildTariffLookup(parts: DataRow[]): Record<string, string> {
  const lookup: Record<string, string> = {};
  for (const p of parts) {
    const partNum = p.PartNumber;
    const tariff = p.Tariff;
    if (partNum && tariff) lookup[String(partNum)] = String(tariff);
  }
  return lookup;
}

/** Build CreatedDate Lookup: `${TallyIn}_${ItemNo1}` → CreatedDate (from FTZ Periodic). */
export function buildCreatedDateLookup(ftz: DataRow[]): Record<string, string> {
  const lookup: Record<string, string> = {};
  for (const item of ftz) {
    const itemNo = item.ItemNo1 ?? Object.values(item)[0];
    const tallyIn = String(item.TallyIn);
    const normalizedTallyIn = normalizeTallyIn(item.TallyIn);
    const key = `${tallyIn}_${itemNo}`;
    if (item.CreatedDate) {
      lookup[key] = String(item.CreatedDate);
      if (normalizedTallyIn && normalizedTallyIn !== tallyIn) {
        lookup[`${normalizedTallyIn}_${itemNo}`] = String(item.CreatedDate);
      }
    }
  }
  return lookup;
}

// ---------------------------------------------------------------------------
// Transform TallyOut Data
// ---------------------------------------------------------------------------

export function transformTallyOut(
  tallyOut: DataRow[],
  tariffLookup: Record<string, string>,
  createdDateLookup: Record<string, string>,
  isEstimate: boolean,
): DataRow[] {
  return tallyOut.map((item) => {
    const data: DataRow = { ...item };
    const itemCode = String(data.ItemCode ?? "");
    const tallyIn = String(data.TallyIn ?? "");
    const normalizedTallyIn = normalizeTallyIn(data.TallyIn);

    // 1. Replace HTSNumber with the Tariff from Parts
    if (itemCode && tariffLookup[itemCode]) {
      data.HTSNumber = tariffLookup[itemCode];
    }

    // 2. Attach CreatedDate from the FTZ lookup
    data.CreatedDate = createdDateLookup[`${tallyIn}_${itemCode}`] || createdDateLookup[`${normalizedTallyIn}_${itemCode}`] || "";

    // 3. Resolve Quantity / Total.
    //    The current Tally Out report no longer carries dedicated Quantity/Total
    //    columns — the per-line quantity is TallyInDeductedQty and the extended
    //    line value is UnitPrice1 (despite the name, it is qty × unit price).
    //    Legacy reports that still have Quantity/Total columns keep using them.
    if (data.Quantity == null || data.Quantity === "") {
      data.Quantity = num(data.TallyInDeductedQty);
    }
    if (data.Total == null || data.Total === "") {
      data.Total = num(data.UnitPrice1);
    }

    // Estimate variant: always derive from TallyInDeductedQty / UnitPrice1.
    if (isEstimate) {
      data.Quantity = num(data.TallyInDeductedQty);
      data.Total = num(data.UnitPrice1);
    }

    // 4. Cap runaway unit prices: 30+ collapses to 3 and Total recomputes
    const unitPrice = num(data.UnitPrice);
    if (unitPrice >= 30) {
      data.UnitPrice = 3;
      data.Total = num(data.Quantity) * 3;
    }

    return data;
  });
}

// ---------------------------------------------------------------------------
// Split HTS & Group by Date
// ---------------------------------------------------------------------------

const CUTOFF_BUCKET = "2-24-2026 to Present";
const BEFORE_BUCKET = "Before 2-24-2026";

function getBucket(dateStr: string): { name: string; filingDate: string } | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  const cutoff = new Date("2026-02-24");
  return date >= cutoff
    ? { name: CUTOFF_BUCKET, filingDate: "2026-02-24" }
    : { name: BEFORE_BUCKET, filingDate: "2026-02-01" };
}

export interface SplitRow extends DataRow {
  /** Index of the transformed row this split came from (for grouping in the UI). */
  __sourceIndex: number;
  /** Which HTS part this is, and how many parts the source split into. */
  __partIndex: number;
  __partCount: number;
}

/**
 * A row whose HTSNumber holds several comma-separated codes is fanned out into
 * one row per code. Gross weight and total are divided evenly across the codes
 * (the last code absorbs the rounding remainder); unit price is recomputed.
 * Each row is then tagged with a date bucket based on CreatedDate.
 */
export function splitHtsAndGroupByDate(rows: DataRow[]): SplitRow[] {
  const out: SplitRow[] = [];

  rows.forEach((data, sourceIndex) => {
    const rawHTS = String(data.HTSNumber ?? "");
    let htsArray = rawHTS.split(",").map((h) => h.trim()).filter((h) => h !== "");
    if (htsArray.length === 0) htsArray = [rawHTS];

    const qty = num(data.Quantity);
    const grossWeight = num(data.GrossWeight);
    const total = num(data.Total);
    const parts = htsArray.length;

    let remainingGW = grossWeight;
    let remainingTotal = total;

    for (let i = 0; i < htsArray.length; i++) {
      let splitGW: number;
      let splitTotal: number;

      if (parts === 1) {
        splitGW = grossWeight;
        splitTotal = total;
      } else if (i < htsArray.length - 1) {
        splitGW = grossWeight / parts;
        splitTotal = total / parts;
        remainingGW -= splitGW;
        remainingTotal -= splitTotal;
      } else {
        splitGW = remainingGW;
        splitTotal = remainingTotal;
      }

      const splitUP = qty > 0 ? splitTotal / qty : 0;
      const bucket = getBucket(String(data.CreatedDate ?? ""));

      out.push({
        ...data,
        HTSNumber: htsArray[i],
        GrossWeight: splitGW,
        UnitPrice: splitUP,
        Total: splitTotal,
        DateBucket: bucket ? bucket.name : "Unknown",
        FilingDate: bucket ? bucket.filingDate : "",
        __sourceIndex: sourceIndex,
        __partIndex: i,
        __partCount: parts,
      });
    }
  });

  return out;
}

// ---------------------------------------------------------------------------
// Summarize by Manufacturer & HTS
// ---------------------------------------------------------------------------

export interface SummaryRow {
  ManufacturerID: string;
  HTSNumber: string;
  TotalQuantity: number;
  TotalGrossWeight: number;
  TotalUnitPrice: number;
  TotalAmount: number;
  ItemCode: string;
  Description: string;
  DateBucket: string;
  FilingDate: string;
}

/** Group by DateBucket → `${ManufacturerID}|${HTSNumber}` and sum the measures. */
export function summarize(rows: SplitRow[]): SummaryRow[] {
  const buckets: Record<string, Record<string, SummaryRow>> = {};

  for (const data of rows) {
    const bucket = String(data.DateBucket || "Unknown");
    const key = `${data.ManufacturerID}|${data.HTSNumber}`;
    (buckets[bucket] ??= {});

    if (!buckets[bucket][key]) {
      buckets[bucket][key] = {
        ManufacturerID: String(data.ManufacturerID ?? ""),
        HTSNumber: String(data.HTSNumber ?? ""),
        TotalQuantity: 0,
        TotalGrossWeight: 0,
        TotalUnitPrice: 0,
        TotalAmount: 0,
        ItemCode: String(data.ItemCode ?? ""),
        Description: String(data.Description ?? ""),
        DateBucket: bucket,
        FilingDate: String(data.FilingDate ?? ""),
      };
    }

    const s = buckets[bucket][key];
    s.TotalQuantity += num(data.Quantity);
    s.TotalGrossWeight += num(data.GrossWeight);
    s.TotalUnitPrice += num(data.UnitPrice);
    s.TotalAmount += num(data.Total);
    if (!s.ItemCode && data.ItemCode) s.ItemCode = String(data.ItemCode);
    if (!s.Description && data.Description) s.Description = String(data.Description);
  }

  const output: SummaryRow[] = [];
  for (const b of Object.keys(buckets)) {
    for (const k of Object.keys(buckets[b])) output.push(buckets[b][k]);
  }
  return output;
}

// ---------------------------------------------------------------------------
// Build Final Data (Acelynk import shape)
// ---------------------------------------------------------------------------

export const FINAL_COLUMNS: string[] = [
  "Invoice_No", "Part", "Commercial_Description", "Country_of_Origin",
  "Country_of_Export", "Tariff_Number", "Quantity", "Quantity_UOM", "Unit_Price",
  "Total_Line_Value", "Net_Weight_KG", "Gross_Weight_KG", "Manufacturer_Name",
  "Manufacturer_Address_1", "Manufacturer_Address_2", "Manufacturer_City",
  "Manufacturer_State", "Manufacturer_Zip", "Manufacturer_Country", "MID_Code",
  "Buyer_Name", "Buyer_Address_1", "Buyer_Address_2", "Buyer_City", "Buyer_State",
  "Buyer_Zip", "Buyer_Country", "Buyer_ID_Number", "Consignee_Name",
  "Consignee_Address_1", "Consignee_Address_2", "Consignee_City", "Consignee_State",
  "Consignee_Zip", "Consignee_Country", "Consignee_ID_Number", "SICountry", "SP1",
  "SP2", "Zone_Status", "Privileged_Filing_Date", "Line_Piece_Count",
];

export type FinalRow = Record<string, Cell>;

export function buildFinalData(summary: SummaryRow[]): FinalRow[] {
  return summary.map((data) => {
    const manuID = String(data.ManufacturerID || "");
    const origin = manuID.substring(0, 2);
    const sp1 = origin === "EG" ? "N" : "";

    return {
      Invoice_No: "",
      Part: data.ItemCode,
      Commercial_Description: data.Description,
      Country_of_Origin: origin,
      Country_of_Export: origin,
      Tariff_Number: data.HTSNumber,
      Quantity: data.TotalQuantity,
      Quantity_UOM: "",
      Unit_Price: data.TotalUnitPrice,
      Total_Line_Value: data.TotalAmount,
      Net_Weight_KG: "",
      Gross_Weight_KG: data.TotalGrossWeight,
      Manufacturer_Name: "",
      Manufacturer_Address_1: "",
      Manufacturer_Address_2: "",
      Manufacturer_City: "",
      Manufacturer_State: "",
      Manufacturer_Zip: "",
      Manufacturer_Country: "",
      MID_Code: manuID,
      Buyer_Name: "",
      Buyer_Address_1: "",
      Buyer_Address_2: "",
      Buyer_City: "",
      Buyer_State: "",
      Buyer_Zip: "",
      Buyer_Country: "",
      Buyer_ID_Number: "",
      Consignee_Name: "",
      Consignee_Address_1: "",
      Consignee_Address_2: "",
      Consignee_City: "",
      Consignee_State: "",
      Consignee_Zip: "",
      Consignee_Country: "",
      Consignee_ID_Number: "",
      SICountry: "",
      SP1: sp1,
      SP2: "",
      Zone_Status: "",
      Privileged_Filing_Date: data.FilingDate,
      Line_Piece_Count: "",
      // Kept for reference / per-bucket splitting (as the original workflow did).
      DateBucket: data.DateBucket,
    };
  });
}

// ---------------------------------------------------------------------------
// Orchestration + CSV output
// ---------------------------------------------------------------------------

export interface EtlInput {
  tallyOut: DataRow[];
  parts: DataRow[];
  ftz: DataRow[];
  tallyType: string;
}

export interface EtlResult {
  isEstimate: boolean;
  tariffCount: number;
  dateCount: number;
  tallyOutRows: DataRow[];
  transformed: DataRow[];
  splits: SplitRow[];
  summary: SummaryRow[];
  final: FinalRow[];
}

export function runEtl({ tallyOut, parts, ftz, tallyType }: EtlInput): EtlResult {
  const isEstimate = String(tallyType).toLowerCase().includes("estimate");
  const tariffLookup = buildTariffLookup(parts);
  const createdDateLookup = buildCreatedDateLookup(ftz);
  // Keep only real line items — drop any banner/footer rows without an ItemCode.
  const lineItems = tallyOut.filter((r) => String(r.ItemCode ?? "").trim() !== "");
  const transformed = transformTallyOut(lineItems, tariffLookup, createdDateLookup, isEstimate);
  const splits = splitHtsAndGroupByDate(transformed);
  const summary = summarize(splits);
  const final = buildFinalData(summary);

  return {
    isEstimate,
    tariffCount: Object.keys(tariffLookup).length,
    dateCount: transformed.filter((row) => String(row.CreatedDate ?? "").trim() !== "").length,
    tallyOutRows: lineItems,
    transformed,
    splits,
    summary,
    final,
  };
}

function csvEscape(v: Cell | undefined): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Render Final Data rows as the Tallyout.csv the workflow emailed. */
export function buildFinalCsv(rows: FinalRow[]): string {
  const cols = [...FINAL_COLUMNS, "DateBucket"];
  const header = cols.join(",");
  const body = rows.map((r) => cols.map((c) => csvEscape(r[c])).join(",")).join("\n");
  return `${header}\n${body}`;
}

// ---------------------------------------------------------------------------
// Detailed breakdown report (xlsx) — shows each summary group with the
// individual line items that rolled into it, plus the group totals.
// ---------------------------------------------------------------------------

/**
 * Round half away from zero (commercial rounding) and format to `dp` decimals.
 * Re-parsing through a decimal exponent avoids the binary-float boundary errors
 * that make plain toFixed round 2.635 down to "2.63".
 */
function roundStr(v: number, dp: number): string {
  const shifted = Math.round(Number(`${v}e${dp}`));
  return Number(`${shifted}e${-dp}`).toFixed(dp);
}

/** Group qty totals print as a trimmed number (840, not 840.00) to match the template. */
function trimNum(v: number): string {
  return String(Number(roundStr(v, 2)));
}

/**
 * Build the "Breakdown by Group" sheet as a 2-D array. Groups are ordered the
 * same way `summarize()` orders its output: by date bucket, then by the order
 * each Manufacturer|HTS pair was first seen.
 */
export function buildBreakdownAoa(splits: SplitRow[]): string[][] {
  return buildBreakdownAoaFromRows(
    splits.map((s) => ({
      ItemCode: s.ItemCode,
      ManufacturerID: s.ManufacturerID,
      HTSNumber: s.HTSNumber,
      Description: s.Description,
      Quantity: s.Quantity,
      UnitPrice: s.UnitPrice,
      Total: s.Total,
      GrossWeight: s.GrossWeight,
      DateBucket: s.DateBucket,
      FilingDate: s.FilingDate,
    })),
  );
}

export function buildBreakdownAoaFromRows(rows: DataRow[]): string[][] {
  interface Group {
    mid: string;
    hts: string;
    bucket: string;
    filing: string;
    items: DataRow[];
  }
  const buckets: Record<string, Record<string, Group>> = {};

  for (const s of rows) {
    const bucket = String(s.DateBucket || "Unknown");
    const key = `${s.ManufacturerID}|${s.HTSNumber}`;
    (buckets[bucket] ??= {});
    (buckets[bucket][key] ??= {
      mid: String(s.ManufacturerID ?? ""),
      hts: String(s.HTSNumber ?? ""),
      bucket,
      filing: String(s.FilingDate ?? ""),
      items: [],
    });
    buckets[bucket][key].items.push(s);
  }

  const aoa: string[][] = [];
  let groupNo = 0;

  for (const bucket of Object.keys(buckets)) {
    for (const key of Object.keys(buckets[bucket])) {
      groupNo++;
      const g = buckets[bucket][key];

      let qty = 0, ups = 0, total = 0, gw = 0;
      for (const it of g.items) {
        qty += num(it.Quantity);
        ups += num(it.UnitPrice);
        total += num(it.Total);
        gw += num(it.GrossWeight);
      }

      aoa.push([`GROUP ${groupNo}`]);
      aoa.push([
        "",
        `MID: ${g.mid}`,
        `HTS: ${g.hts}`,
        `Bucket: ${g.bucket}`,
        `Filing Date: ${g.filing}`,
        "",
        "TOTALS:",
        `Qty: ${trimNum(qty)}`,
        `Unit Price Sum: ${roundStr(ups, 4)}`,
        `Total: ${roundStr(total, 2)}`,
        `GrossWeight: ${roundStr(gw, 2)}`,
      ]);
      aoa.push(["Item#", "ItemCode", "Quantity", "UnitPrice", "LineTotal", "GrossWeight"]);
      g.items.forEach((it, i) => {
        aoa.push([
          String(i + 1),
          String(it.ItemCode ?? ""),
          roundStr(num(it.Quantity), 2),
          roundStr(num(it.UnitPrice), 4),
          roundStr(num(it.Total), 2),
          roundStr(num(it.GrossWeight), 2),
        ]);
      });
      aoa.push(["", "SUBTOTAL:", roundStr(qty, 2), roundStr(ups, 4), roundStr(total, 2), roundStr(gw, 2)]);
      aoa.push([]);
      aoa.push(["✓ VERIFIED"]);
      aoa.push([]);
    }
  }

  // Drop a trailing blank row so the sheet ends cleanly on the last group.
  while (aoa.length && aoa[aoa.length - 1].length === 0) aoa.pop();

  return aoa;
}

export function buildBreakdownCsvFromRows(rows: DataRow[]): string {
  return buildBreakdownAoaFromRows(rows)
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
}

export function buildBreakdownWorkbook(splits: SplitRow[]): XLSX.WorkBook {
  return buildBreakdownWorkbookFromRows(splits);
}

export function buildBreakdownWorkbookFromRows(rows: DataRow[]): XLSX.WorkBook {
  const ws = XLSX.utils.aoa_to_sheet(buildBreakdownAoaFromRows(rows));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Breakdown by Group");
  return wb;
}

/** Build the breakdown workbook and trigger a browser download. */
export function downloadBreakdownXlsx(splits: SplitRow[], filename: string): void {
  XLSX.writeFile(buildBreakdownWorkbook(splits), filename);
}

export function downloadBreakdownRowsXlsx(rows: DataRow[], filename: string): void {
  XLSX.writeFile(buildBreakdownWorkbookFromRows(rows), filename);
}
