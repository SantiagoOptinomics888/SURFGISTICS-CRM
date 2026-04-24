"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToCsv } from "@/lib/export";
import type { NewItemsResponse, ArtsPart, FtzLineItem, Inbond, TallyOut } from "@/lib/types";

type DataType = "arts_parts" | "ftz_line_items" | "inbonds" | "tally_outs";

const TABS: { key: DataType; label: string }[] = [
  { key: "arts_parts", label: "Parts" },
  { key: "ftz_line_items", label: "Tally In" },
  { key: "inbonds", label: "In-Bond" },
  { key: "tally_outs", label: "Tally Out" },
];

function defaultSince() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

export default function NewItemsPage() {
  const [since, setSince] = useState(defaultSince);
  const [until, setUntil] = useState("");
  const [account, setAccount] = useState("");
  const [activeTab, setActiveTab] = useState<DataType>("arts_parts");

  const params = new URLSearchParams();
  if (since) params.set("since", since);
  if (until) params.set("until", until);
  if (account) params.set("account", account);

  const { data, isLoading } = useQuery<NewItemsResponse>({
    queryKey: ["new_items", since, until, account],
    queryFn: () => api.get(`/manager/new-items?${params}`).then((r) => r.data),
  });

  // Fetch all vendors for the dropdown (independent of date filter)
  const { data: vendors } = useQuery<{ importer_account: string | null }[]>({
    queryKey: ["manager_vendors_list"],
    queryFn: () => api.get("/manager/vendors").then((r) => r.data),
  });

  const allAccounts = vendors
    ? [...new Set(vendors.map((v) => v.importer_account).filter(Boolean) as string[])].sort()
    : [];

  const counts = data
    ? {
        arts_parts: data.arts_parts.length,
        ftz_line_items: data.ftz_line_items.length,
        inbonds: data.inbonds.length,
        tally_outs: data.tally_outs.length,
      }
    : null;

  const totalNew = counts
    ? counts.arts_parts + counts.ftz_line_items + counts.inbonds + counts.tally_outs
    : 0;

  function handleExport() {
    if (!data) return;
    if (activeTab === "arts_parts") {
      exportToCsv("new_parts.csv", data.arts_parts, [
        { key: "importer_account", label: "Account" },
        { key: "part_number", label: "Part #" },
        { key: "description", label: "Description" },
        { key: "country", label: "Country" },
        { key: "tariff_num", label: "Tariff" },
        { key: "unit_price", label: "Unit Price" },
        { key: "value", label: "Value" },
        { key: "units_shipped", label: "Units" },
        { key: "is_duty_exempt", label: "Duty Exempt" },
        { key: "manufacturer", label: "Manufacturer" },
        { key: "supplier_id", label: "Supplier" },
        { key: "filer_code", label: "Filer" },
        { key: "warehouse", label: "Warehouse" },
        { key: "created_at", label: "Created" },
      ]);
    } else if (activeTab === "ftz_line_items") {
      exportToCsv("new_tally_in.csv", data.ftz_line_items, [
        { key: "importer_account", label: "Account" },
        { key: "hbl", label: "Talian" },
        { key: "country_origin", label: "Country_Origin" },
        { key: "part", label: "Part" },
        { key: "piece_count", label: "Piece_Count" },
        { key: "unit_price", label: "Unit_Price" },
        { key: "line_value", label: "Line_Value" },
        { key: "weight_kg", label: "Weight_KG" },
        { key: "hts_qty_1", label: "HTS_QTY_1" },
        { key: "hts_qty_2", label: "HTS_QTY_2" },
        { key: "line_charge", label: "Line_Charge" },
        { key: "zone_status", label: "Zone_Status" },
        { key: "lot_number", label: "Lot_Number" },
        { key: "remarks", label: "Remarks" },
        { key: "concurrence", label: "Concurrence" },
        { key: "created_at", label: "Created" },
      ]);
    } else if (activeTab === "inbonds") {
      exportToCsv("new_inbonds.csv", data.inbonds, [
        { key: "importer_account", label: "Account" },
        { key: "container", label: "Container" },
        { key: "marks_numbers", label: "Marks" },
        { key: "part_number", label: "Part #" },
        { key: "tariff_number", label: "Tariff" },
        { key: "description", label: "Description" },
        { key: "piece_count", label: "Qty" },
        { key: "value", label: "Value" },
        { key: "weight", label: "Weight" },
        { key: "weight_uom", label: "Weight UOM" },
        { key: "created_at", label: "Created" },
      ]);
    } else if (activeTab === "tally_outs") {
      exportToCsv("new_tally_outs.csv", data.tally_outs, [
        { key: "importer_account", label: "Account" },
        { key: "delivery_order_no", label: "Delivery Order #" },
        { key: "item_code", label: "Item Code" },
        { key: "quantity_ordered", label: "Quantity Ordered" },
        { key: "price_per_unit", label: "Price Per Unit" },
        { key: "foreign_domestic_ind", label: "Foreign/Domestic" },
        { key: "doc_code_3461_7512", label: "3461-7512" },
        { key: "operator_id", label: "Operator ID" },
        { key: "internal_order_flag", label: "Internal Order" },
        { key: "created_at", label: "Created" },
      ]);
    }
  }

  return (
    <div>
      <PageHeader title="New Items" subtitle="Review new vendor submissions for Acelynk entry" />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[#64748B] uppercase tracking-wider">Since</label>
          <input
            type="date"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            className="border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-sm text-[#334155] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[#64748B] uppercase tracking-wider">Until</label>
          <input
            type="date"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            className="border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-sm text-[#334155] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[#64748B] uppercase tracking-wider">Vendor</label>
          <select
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            className="border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-sm text-[#334155] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            <option value="">All Vendors</option>
            {allAccounts.map((acc) => (
              <option key={acc} value={acc}>{acc}</option>
            ))}
          </select>
        </div>
        {(since || until || account) && (
          <button
            onClick={() => { setSince(defaultSince()); setUntil(""); setAccount(""); }}
            className="text-xs text-[#64748B] hover:text-[#334155] underline underline-offset-2 cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>

      {/* Summary cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E2E8F0] rounded-lg p-4">
              <Skeleton className="h-3 w-16 mb-2" /><Skeleton className="h-7 w-8" />
            </div>
          ))}
        </div>
      ) : counts && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 mb-6">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`text-left bg-white border rounded-lg p-4 transition-colors cursor-pointer ${
                activeTab === key ? "border-[#0369A1] ring-1 ring-[#0369A1]/20" : "border-[#E2E8F0] hover:border-[#94A3B8]"
              }`}
            >
              <p className="text-xs font-medium text-[#64748B] uppercase tracking-wider">{label}</p>
              <p className={`text-2xl font-semibold mt-1 tabular-nums ${counts[key] > 0 ? "text-[#0369A1]" : "text-[#CBD5E1]"}`}>
                {counts[key]}
              </p>
            </button>
          ))}
          <div className="bg-[#0F172A] rounded-lg p-4 flex flex-col justify-center">
            <p className="text-xs font-medium text-[#64748B] uppercase tracking-wider">Total New</p>
            <p className="text-2xl font-semibold text-white mt-1 tabular-nums">{totalNew}</p>
          </div>
        </div>
      )}

      {/* Export toolbar */}
      {data && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === key
                    ? "bg-[#0369A1] text-white"
                    : "bg-white border border-[#E2E8F0] text-[#334155] hover:border-[#0369A1]"
                }`}
              >
                {label} ({counts?.[key] ?? 0})
              </button>
            ))}
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export {TABS.find((t) => t.key === activeTab)?.label} CSV
          </button>
        </div>
      )}

      {/* Data table */}
      {isLoading && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 px-5 py-3.5 border-b border-[#F1F5F9]">
              <Skeleton className="h-3.5 w-20" /><Skeleton className="h-3.5 w-32" /><Skeleton className="h-3.5 w-16 ml-auto" />
            </div>
          ))}
        </div>
      )}

      {data && activeTab === "arts_parts" && <PartsTable rows={data.arts_parts} />}
      {data && activeTab === "ftz_line_items" && <TallyInTable rows={data.ftz_line_items} />}
      {data && activeTab === "inbonds" && <InbondTable rows={data.inbonds} />}
      {data && activeTab === "tally_outs" && <TallyOutTable rows={data.tally_outs} />}
    </div>
  );
}

function PartsTable({ rows }: { rows: ArtsPart[] }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              {["Account", "Part #", "Description", "Country", "Tariff", "Unit Price", "Value", "Units", "Duty", "Created"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {rows.length === 0 && (
              <tr><td colSpan={10} className="px-5 py-12 text-center text-sm text-[#94A3B8]">No new parts in this period</td></tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-[#F8FAFC] transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0369A1]">{row.importer_account ?? "—"}</td>
                <td className="px-4 py-3 font-semibold text-[#0F172A] whitespace-nowrap">{row.part_number ?? "—"}</td>
                <td className="px-4 py-3 text-[#475569] max-w-[160px] truncate">{row.description ?? "—"}</td>
                <td className="px-4 py-3 text-xs font-medium text-[#334155]">{row.country ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{row.tariff_num ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums text-[#334155]">{row.unit_price != null ? `$${row.unit_price}` : "—"}</td>
                <td className="px-4 py-3 tabular-nums text-[#334155] font-medium">{row.value != null ? `$${row.value.toLocaleString()}` : "—"}</td>
                <td className="px-4 py-3 tabular-nums text-[#334155]">{row.units_shipped ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    row.is_duty_exempt ? "bg-emerald-50 text-emerald-700" : "bg-[#F1F5F9] text-[#64748B]"
                  }`}>{row.is_duty_exempt === null ? "—" : row.is_duty_exempt ? "Exempt" : "Taxable"}</span>
                </td>
                <td className="px-4 py-3 text-xs text-[#94A3B8] whitespace-nowrap">
                  {new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TallyInTable({ rows }: { rows: FtzLineItem[] }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              {["Account", "Talian", "Part", "Origin", "Qty", "Unit Price", "Line Value", "Weight", "Zone", "Status", "Created"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {rows.length === 0 && (
              <tr><td colSpan={11} className="px-5 py-12 text-center text-sm text-[#94A3B8]">No new tally in items in this period</td></tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-[#F8FAFC] transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0369A1]">{row.importer_account ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-[#94A3B8]">{row.hbl ?? "—"}</td>
                <td className="px-4 py-3 font-semibold text-[#0F172A]">{row.part ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-[#334155]">{row.country_origin ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums text-[#334155] font-medium">{row.piece_count ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums text-[#334155]">{row.unit_price != null ? `$${row.unit_price}` : "—"}</td>
                <td className="px-4 py-3 tabular-nums text-[#334155] font-medium">{row.line_value != null ? `$${row.line_value.toLocaleString()}` : "—"}</td>
                <td className="px-4 py-3 tabular-nums text-[#64748B] text-xs">{row.weight_kg != null ? `${row.weight_kg} kg` : "—"}</td>
                <td className="px-4 py-3">
                  {row.zone_status ? (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      row.zone_status === "P" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                    }`}>{row.zone_status === "P" ? "Privileged" : "Foreign"}</span>
                  ) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    row.concurrence ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${row.concurrence ? "bg-emerald-500" : "bg-amber-500"}`} />
                    {row.concurrence ? "Approved" : "Pending"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-[#94A3B8] whitespace-nowrap">
                  {new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InbondTable({ rows }: { rows: Inbond[] }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              {["Account", "Container", "Marks", "Part #", "Tariff", "Description", "Qty", "Value", "Weight", "Created"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {rows.length === 0 && (
              <tr><td colSpan={10} className="px-5 py-12 text-center text-sm text-[#94A3B8]">No new in-bond records in this period</td></tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-[#F8FAFC] transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0369A1]">{row.importer_account ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0F172A]">{row.container ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{row.marks_numbers ?? "—"}</td>
                <td className="px-4 py-3 font-semibold text-[#334155]">{row.part_number ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{row.tariff_number ?? "—"}</td>
                <td className="px-4 py-3 text-[#475569] max-w-[140px] truncate">{row.description ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums text-[#334155] font-medium">{row.piece_count ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums text-[#334155]">{row.value != null ? `$${row.value.toLocaleString()}` : "—"}</td>
                <td className="px-4 py-3 tabular-nums text-[#64748B] text-xs">{row.weight != null ? `${row.weight} ${row.weight_uom ?? ""}` : "—"}</td>
                <td className="px-4 py-3 text-xs text-[#94A3B8] whitespace-nowrap">
                  {new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TallyOutTable({ rows }: { rows: TallyOut[] }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              {["Account", "Delivery Order", "Item Code", "Qty", "Unit Price", "Total", "F/D", "Doc Code", "Operator", "Created"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {rows.length === 0 && (
              <tr><td colSpan={10} className="px-5 py-12 text-center text-sm text-[#94A3B8]">No new tally out items in this period</td></tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-[#F8FAFC] transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0369A1]">{row.importer_account ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0F172A]">{row.delivery_order_no ?? "—"}</td>
                <td className="px-4 py-3 font-semibold text-[#334155]">{row.item_code ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums text-[#334155] font-medium">{row.quantity_ordered ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums text-[#334155]">{row.price_per_unit != null ? `$${row.price_per_unit}` : "—"}</td>
                <td className="px-4 py-3 tabular-nums text-[#334155] font-medium">
                  {row.quantity_ordered != null && row.price_per_unit != null
                    ? `$${(row.quantity_ordered * row.price_per_unit).toLocaleString()}`
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  {row.foreign_domestic_ind ? (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      row.foreign_domestic_ind === "D" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                    }`}>{row.foreign_domestic_ind === "D" ? "Domestic" : "Foreign"}</span>
                  ) : "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{row.doc_code_3461_7512 ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-[#475569]">{row.operator_id ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-[#94A3B8] whitespace-nowrap">
                  {new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
