"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ManagerStats } from "@/lib/types";

export default function ManagerDashboard() {
  const { data, isLoading } = useQuery<ManagerStats>({
    queryKey: ["manager_stats"],
    queryFn: () => api.get("/manager/stats").then((r) => r.data),
  });

  const cards = data
    ? [
        { label: "Vendors", value: data.total_vendors },
        { label: "Arts & Parts", value: data.total_arts_parts },
        { label: "FTZ Line Items", value: data.total_ftz_line_items },
        { label: "In-Bonds", value: data.total_inbonds },
        { label: "Tally Outs", value: data.total_tally_outs },
      ]
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Manager Dashboard</h1>
      {isLoading && <p className="text-gray-500">Loading…</p>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {cards.map(({ label, value }) => (
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
