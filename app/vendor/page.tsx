"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ArtsPart, FtzLineItem, Inbond, TallyOut } from "@/lib/types";

export default function VendorDashboard() {
  const user = getAuth();

  const { data: arts } = useQuery<ArtsPart[]>({
    queryKey: ["arts_parts"],
    queryFn: () => api.get("/arts_part").then((r) => r.data),
  });

  const { data: ftz } = useQuery<FtzLineItem[]>({
    queryKey: ["ftz_line_items"],
    queryFn: () => api.get("/ftz_line_item").then((r) => r.data),
  });

  const { data: inbonds } = useQuery<Inbond[]>({
    queryKey: ["inbonds"],
    queryFn: () => api.get("/inbond").then((r) => r.data),
  });

  const { data: tally } = useQuery<TallyOut[]>({
    queryKey: ["tally_outs"],
    queryFn: () => api.get("/tally_out").then((r) => r.data),
  });

  const stats = [
    { label: "Arts & Parts", value: arts?.length ?? "—" },
    { label: "FTZ Line Items", value: ftz?.length ?? "—" },
    { label: "In-Bonds", value: inbonds?.length ?? "—" },
    { label: "Tally Outs", value: tally?.length ?? "—" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-sm text-gray-500 mb-6">
        Account: <span className="font-medium">{user?.importer_account ?? "—"}</span>
      </p>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value }) => (
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
