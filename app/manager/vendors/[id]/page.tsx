"use client";

import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { VendorDetail } from "@/lib/types";

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, isLoading, error } = useQuery<VendorDetail>({
    queryKey: ["vendor", id],
    queryFn: () => api.get(`/manager/vendors/${id}`).then((r) => r.data),
  });

  if (isLoading) return <p className="text-gray-500">Loading…</p>;
  if (error || !data) return <p className="text-red-500">Vendor not found.</p>;

  const counts = [
    { label: "Arts & Parts", value: data.record_counts.arts_parts },
    { label: "FTZ Line Items", value: data.record_counts.ftz_line_items },
    { label: "In-Bonds", value: data.record_counts.inbonds },
    { label: "Tally Outs", value: data.record_counts.tally_outs },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/manager/vendors">
          <Button variant="ghost" size="sm">← Back</Button>
        </Link>
        <h1 className="text-2xl font-bold">{data.email}</h1>
        <Badge variant={data.is_active ? "default" : "secondary"}>
          {data.is_active ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="mb-6 text-sm text-gray-600 space-y-1">
        <p><span className="font-medium">Account:</span> {data.importer_account ?? "—"}</p>
        <p><span className="font-medium">Role:</span> {data.role}</p>
      </div>

      <h2 className="text-lg font-semibold mb-3">Record Counts</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {counts.map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
