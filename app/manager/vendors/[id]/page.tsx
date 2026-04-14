"use client";

import { useQuery } from "@tanstack/react-query";
import { use, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { DataToolbar } from "@/components/ui/data-toolbar";
import { useDateFilter } from "@/lib/use-date-filter";
import { exportToCsv } from "@/lib/export";
import type { VendorDetail, ArtsPart, FtzLineItem, Inbond, TallyOut } from "@/lib/types";

type Tab = "arts_parts" | "ftz_line_items" | "inbonds" | "tally_outs";

const TABS: { key: Tab; label: string }[] = [
  { key: "arts_parts", label: "Arts & Parts" },
  { key: "ftz_line_items", label: "FTZ Line Items" },
  { key: "inbonds", label: "In-Bonds" },
  { key: "tally_outs", label: "Tally Outs" },
];

const fmt = (n: number | null | undefined, prefix = "") =>
  n != null ? `${prefix}${n.toLocaleString()}` : "—";


export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<Tab>("arts_parts");

  const { data, isLoading, error } = useQuery<VendorDetail>({
    queryKey: ["vendor", id],
    queryFn: () => api.get(`/manager/vendors/${id}`).then((r) => r.data),
  });

  const artsParts = useQuery<ArtsPart[]>({
    queryKey: ["vendor", id, "arts_parts"],
    queryFn: () => api.get(`/manager/vendors/${id}/arts_parts`).then((r) => r.data),
    enabled: !!data,
  });

  const ftzItems = useQuery<FtzLineItem[]>({
    queryKey: ["vendor", id, "ftz_line_items"],
    queryFn: () => api.get(`/manager/vendors/${id}/ftz_line_items`).then((r) => r.data),
    enabled: !!data,
  });

  const inbonds = useQuery<Inbond[]>({
    queryKey: ["vendor", id, "inbonds"],
    queryFn: () => api.get(`/manager/vendors/${id}/inbonds`).then((r) => r.data),
    enabled: !!data,
  });

  const tallyOuts = useQuery<TallyOut[]>({
    queryKey: ["vendor", id, "tally_outs"],
    queryFn: () => api.get(`/manager/vendors/${id}/tally_outs`).then((r) => r.data),
    enabled: !!data,
  });

  const artsFilter = useDateFilter(artsParts.data);
  const ftzFilter = useDateFilter(ftzItems.data);
  const inbondFilter = useDateFilter(inbonds.data);
  const tallyFilter = useDateFilter(tallyOuts.data);

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-5 w-48 mb-8" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E2E8F0] rounded-lg p-5">
              <Skeleton className="h-3 w-16 mb-3" />
              <Skeleton className="h-8 w-10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        Vendor not found.
      </div>
    );
  }

  const initials = data.email.slice(0, 2).toUpperCase();

  const counts = [
    {
      label: "Arts & Parts",
      value: data.record_counts.arts_parts,
      tab: "arts_parts" as Tab,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
      ),
    },
    {
      label: "FTZ Line Items",
      value: data.record_counts.ftz_line_items,
      tab: "ftz_line_items" as Tab,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
      ),
    },
    {
      label: "In-Bonds",
      value: data.record_counts.inbonds,
      tab: "inbonds" as Tab,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
        </svg>
      ),
    },
    {
      label: "Tally Outs",
      value: data.record_counts.tally_outs,
      tab: "tally_outs" as Tab,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
  ];

  const handleExport = () => {
    const account = data.importer_account ?? "vendor";
    if (activeTab === "arts_parts" && artsFilter.filtered) {
      exportToCsv(`${account}_arts_parts.csv`, artsFilter.filtered, [
        { key: "part_number", label: "Part #" },
        { key: "description", label: "Description" },
        { key: "country", label: "Country" },
        { key: "tariff_num", label: "Tariff" },
        { key: "unit_price", label: "Unit Price" },
        { key: "value", label: "Value" },
        { key: "units_shipped", label: "Units" },
        { key: "is_duty_exempt", label: "Duty Exempt" },
        { key: "supplier_id", label: "Supplier" },
      ]);
    } else if (activeTab === "ftz_line_items" && ftzFilter.filtered) {
      exportToCsv(`${account}_ftz_line_items.csv`, ftzFilter.filtered, [
        { key: "country_origin", label: "Country_Origin" },
        { key: "part", label: "Part" },
        { key: "piece_count", label: "Piece_Count" },
        { key: "unit_price", label: "Unit_Price" },
        { key: "line_value", label: "Line_Value" },
        { key: "weight_kg", label: "Weight(KG)" },
        { key: "hts_qty_1", label: "HTS_QTY_1" },
        { key: "hts_qty_2", label: "HTS_QTY_2" },
        { key: "line_charge", label: "Line_Charge" },
        { key: "zone_status", label: "Zone_Status" },
        { key: "lot_number", label: "Lot_Number" },
        { key: "remarks", label: "Remarks" },
        { key: "hbl", label: "Talian" },
        { key: "concurrence", label: "Concurrence" },
      ]);
    } else if (activeTab === "inbonds" && inbondFilter.filtered) {
      exportToCsv(`${account}_inbonds.csv`, inbondFilter.filtered, [
        { key: "container", label: "Container" },
        { key: "marks_numbers", label: "Marks" },
        { key: "part_number", label: "Part #" },
        { key: "tariff_number", label: "Tariff" },
        { key: "description", label: "Description" },
        { key: "piece_count", label: "Qty" },
        { key: "value", label: "Value" },
        { key: "weight", label: "Weight" },
      ]);
    } else if (activeTab === "tally_outs" && tallyFilter.filtered) {
      exportToCsv(`${account}_tally_outs.csv`, tallyFilter.filtered, [
        { key: "delivery_order_no", label: "Delivery Order #" },
        { key: "item_code", label: "Item Code" },
        { key: "quantity_ordered", label: "Quantity Ordered" },
        { key: "price_per_unit", label: "Price Per Unit" },
        { key: "foreign_domestic_ind", label: "Foreign/Domestic Ind." },
        { key: "doc_code_3461_7512", label: "3461-7512" },
        { key: "operator_id", label: "Operator ID" },
        { key: "internal_order_flag", label: "Internal Order" },
      ]);
    }
  };

  const currentFilter =
    activeTab === "arts_parts" ? artsFilter
    : activeTab === "ftz_line_items" ? ftzFilter
    : activeTab === "inbonds" ? inbondFilter
    : tallyFilter;

  const isTabLoading =
    activeTab === "arts_parts" ? artsParts.isLoading
    : activeTab === "ftz_line_items" ? ftzItems.isLoading
    : activeTab === "inbonds" ? inbonds.isLoading
    : tallyOuts.isLoading;

  return (
    <div>
      {/* Back */}
      <Link
        href="/manager/vendors"
        className="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#334155] transition-fast cursor-pointer mb-6"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Vendors
      </Link>

      {/* Vendor header */}
      <div className="flex items-center gap-4 mb-7">
        <div className="w-12 h-12 rounded-full bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
          <span className="text-base font-bold text-[#0369A1]">{initials}</span>
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-[#020617] tracking-tight">{data.email}</h1>
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              data.is_active ? "bg-emerald-50 text-emerald-700" : "bg-[#F1F5F9] text-[#64748B]"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${data.is_active ? "bg-emerald-500" : "bg-[#94A3B8]"}`} />
              {data.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-sm text-[#64748B]">
              Account: <span className="font-mono font-medium text-[#334155]">{data.importer_account ?? "—"}</span>
            </p>
            {data.last_updated && (
              <span className="text-xs text-[#94A3B8] border border-[#E2E8F0] rounded px-2 py-0.5">
                Last updated {new Date(data.last_updated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Record counts */}
      <h2 className="text-sm font-semibold text-[#020617] mb-3 uppercase tracking-wider">Records</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
        {counts.map(({ label, value, tab, icon }) => (
          <button key={label} onClick={() => setActiveTab(tab)} className="cursor-pointer text-left">
            <StatCard label={label} value={value} icon={icon} active={activeTab === tab} />
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E2E8F0] mb-4">
        <nav className="flex gap-0 -mb-px">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === key
                  ? "border-[#0369A1] text-[#0369A1]"
                  : "border-transparent text-[#64748B] hover:text-[#334155] hover:border-[#CBD5E1]"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Toolbar */}
      <DataToolbar
        dateFrom={currentFilter.dateFrom}
        dateTo={currentFilter.dateTo}
        onDateFromChange={currentFilter.setDateFrom}
        onDateToChange={currentFilter.setDateTo}
        onExport={handleExport}
        count={currentFilter.filtered?.length}
      />

      {/* Table loading */}
      {isTabLoading && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 px-5 py-3.5 border-b border-[#F1F5F9]">
              <Skeleton className="h-3.5 w-20" /><Skeleton className="h-3.5 w-32" /><Skeleton className="h-3.5 w-16 ml-auto" />
            </div>
          ))}
        </div>
      )}

      {/* Arts & Parts table */}
      {activeTab === "arts_parts" && artsFilter.filtered && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  {["Part #", "Description", "Country", "Tariff", "Unit Price", "Value", "Units", "Duty", "Supplier"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {artsFilter.filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-[#94A3B8]">No records found</td></tr>
                )}
                {artsFilter.filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC] transition-fast">
                    <td className="px-4 py-3 font-semibold text-[#0F172A] whitespace-nowrap">{row.part_number ?? "—"}</td>
                    <td className="px-4 py-3 text-[#475569] max-w-[180px] truncate">{row.description ?? "—"}</td>
                    <td className="px-4 py-3 text-xs font-medium text-[#334155]">{row.country ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{row.tariff_num ?? "—"}</td>
                    <td className="px-4 py-3 text-[#334155] tabular-nums">{fmt(row.unit_price, "$")}</td>
                    <td className="px-4 py-3 text-[#334155] tabular-nums font-medium">{fmt(row.value, "$")}</td>
                    <td className="px-4 py-3 text-[#334155] tabular-nums">{fmt(row.units_shipped)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                        row.is_duty_exempt ? "bg-emerald-50 text-emerald-700" : "bg-[#F1F5F9] text-[#64748B]"
                      }`}>
                        {row.is_duty_exempt === null ? "—" : row.is_duty_exempt ? "Exempt" : "Taxable"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#475569] text-xs">{row.supplier_id ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FTZ Line Items table */}
      {activeTab === "ftz_line_items" && ftzFilter.filtered && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  {["Talian", "Part", "Origin", "Tariff", "Qty", "Unit Price", "Line Value", "Weight", "Zone", "Status"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {ftzFilter.filtered.length === 0 && (
                  <tr><td colSpan={10} className="px-5 py-12 text-center text-sm text-[#94A3B8]">No records found</td></tr>
                )}
                {ftzFilter.filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC] transition-fast">
                    <td className="px-4 py-3 font-mono text-xs text-[#94A3B8]">{row.hbl ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">{row.part ?? "—"}</td>
                    <td className="px-4 py-3 text-xs font-medium text-[#334155]">{row.country_origin ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{row.tariff_number ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-[#334155] font-medium">{row.piece_count ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-[#334155]">{fmt(row.unit_price, "$")}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* In-Bonds table */}
      {activeTab === "inbonds" && inbondFilter.filtered && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  {["Container", "Marks", "Part #", "Tariff", "Description", "Qty", "Value", "Weight"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {inbondFilter.filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-[#94A3B8]">No records found</td></tr>
                )}
                {inbondFilter.filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC] transition-fast">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0F172A]">{row.container ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{row.marks_numbers ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold text-[#334155]">{row.part_number ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{row.tariff_number ?? "—"}</td>
                    <td className="px-4 py-3 text-[#475569] max-w-[160px] truncate">{row.description ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-[#334155] font-medium">{row.piece_count ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-[#334155]">{row.value != null ? `$${row.value.toLocaleString()}` : "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-[#64748B] text-xs">{row.weight != null ? `${row.weight} ${row.weight_uom ?? ""}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tally Outs table */}
      {activeTab === "tally_outs" && tallyFilter.filtered && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  {["Delivery Order", "Item Code", "Qty", "Unit Price", "Total", "F/D", "Doc Code", "Operator"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {tallyFilter.filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-[#94A3B8]">No records found</td></tr>
                )}
                {tallyFilter.filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC] transition-fast">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0F172A]">{row.delivery_order_no ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold text-[#334155]">{row.item_code ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-[#334155] font-medium">{row.quantity_ordered ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-[#334155]">{fmt(row.price_per_unit, "$")}</td>
                    <td className="px-4 py-3 tabular-nums text-[#334155] font-medium">
                      {row.quantity_ordered != null && row.price_per_unit != null
                        ? `$${(row.quantity_ordered * row.price_per_unit).toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {row.foreign_domestic_ind ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          row.foreign_domestic_ind === "D" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                        }`}>
                          {row.foreign_domestic_ind === "D" ? "Domestic" : "Foreign"}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{row.doc_code_3461_7512 ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-[#475569]">{row.operator_id ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
