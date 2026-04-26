/**
 * Export an array of objects to a CSV file and trigger download.
 */
export function exportToCsv<T>(
  filename: string,
  rows: T[],
  columns: { key: keyof T; label: string }[],
): void {
  if (rows.length === 0) return;

  const header = columns.map((c) => c.label).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const val = row[c.key] as unknown;
          if (val == null) return "";
          const str = String(val);
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(","),
    )
    .join("\n");

  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(val: unknown): string {
  if (val == null) return "";
  const str = String(val);
  return str.includes(",") || str.includes('"') || str.includes("\n")
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

/**
 * Acelynk-format Parts export with all 42 columns.
 * Maps existing DB fields to Acelynk headers; unmapped columns export as empty.
 */
const ACELYNK_PARTS_COLUMNS: { header: string; key?: string }[] = [
  { header: "ImporterAccount", key: "importer_account" },
  { header: "FilerCode", key: "filer_code" },
  { header: "PartNumber", key: "part_number" },
  { header: "Description", key: "description" },
  { header: "Country", key: "country" },
  { header: "UnitPrice", key: "unit_price" },
  { header: "IsDutyExempt", key: "is_duty_exempt" },
  { header: "IsDutyReduced" },
  { header: "IsMPFExempt", key: "is_mpfs_exempt" },
  { header: "IsOtherFeesExempt" },
  { header: "Tariff #", key: "tariff_num" },
  { header: "UnitsShipped", key: "units_shipped" },
  { header: "UnitsShipped2" },
  { header: "UnitsShipped3" },
  { header: "SI" },
  { header: "SI2" },
  { header: "SICountry" },
  { header: "Value", key: "value" },
  { header: "CountryOfOrigin" },
  { header: "IsGlobalPart" },
  { header: "ZoneStatus" },
  { header: "PrivilegedFilingDate" },
  { header: "PGA AGENCY", key: "pga_agency" },
  { header: "AGENCY PROGRAM CODE" },
  { header: "AGENCY PROCESSING CODE" },
  { header: "PRODUCT CODE QUALIFIER" },
  { header: "PRODUCT CODE NUMBER" },
  { header: "PACKAGING QUALIFIER 1" },
  { header: "UNIT OF MEASURE 1" },
  { header: "PACKAGING QUALIFIER 2" },
  { header: "UNIT OF MEASURE 2" },
  { header: "PACKAGING QUALIFIER 3" },
  { header: "UNIT OF MEASURE 3" },
  { header: "PACKAGING QUALIFIER 4" },
  { header: "UNIT OF MEASURE 4" },
  { header: "PACKAGING QUALIFIER 5" },
  { header: "UNIT OF MEASURE 5" },
  { header: "PACKAGING QUALIFIER 6" },
  { header: "UNIT OF MEASURE 6" },
  { header: "PGA Disclaim Code", key: "pga_disclaim_code" },
  { header: "Manufacturer", key: "manufacturer" },
  { header: "PartAlias", key: "part_alias" },
];

export function exportPartsForAcelynk(
  filename: string,
  rows: Record<string, unknown>[],
): void {
  if (rows.length === 0) return;

  const header = ACELYNK_PARTS_COLUMNS.map((c) => csvEscape(c.header)).join(",");
  const body = rows
    .map((row) =>
      ACELYNK_PARTS_COLUMNS.map((c) => csvEscape(c.key ? row[c.key] : null)).join(","),
    )
    .join("\n");

  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
