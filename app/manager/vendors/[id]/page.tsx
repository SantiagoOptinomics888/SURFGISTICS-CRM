"use client";

import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import type { VendorDetail } from "@/lib/types";

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, isLoading, error } = useQuery<VendorDetail>({
    queryKey: ["vendor", id],
    queryFn: () => api.get(`/manager/vendors/${id}`).then((r) => r.data),
  });

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
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
      ),
    },
    {
      label: "FTZ Line Items",
      value: data.record_counts.ftz_line_items,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
      ),
    },
    {
      label: "In-Bonds",
      value: data.record_counts.inbonds,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
        </svg>
      ),
    },
    {
      label: "Tally Outs",
      value: data.record_counts.tally_outs,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
  ];

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
          <p className="text-sm text-[#64748B] mt-0.5">
            Account: <span className="font-mono font-medium text-[#334155]">{data.importer_account ?? "—"}</span>
          </p>
        </div>
      </div>

      {/* Record counts */}
      <h2 className="text-sm font-semibold text-[#020617] mb-3 uppercase tracking-wider">Records</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {counts.map(({ label, value, icon }) => (
          <StatCard key={label} label={label} value={value} icon={icon} />
        ))}
      </div>
    </div>
  );
}
