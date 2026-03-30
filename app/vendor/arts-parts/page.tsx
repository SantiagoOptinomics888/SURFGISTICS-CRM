"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ArtsPart } from "@/lib/types";

export default function ArtsPartsPage() {
  const { data, isLoading, error } = useQuery<ArtsPart[]>({
    queryKey: ["arts_parts"],
    queryFn: () => api.get("/arts_part").then((r) => r.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Arts & Parts</h1>
      {isLoading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-500">Failed to load data.</p>}
      {data && (
        <div className="rounded-md border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part #</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Tariff</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Duty Exempt</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Account</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                    No records found.
                  </TableCell>
                </TableRow>
              )}
              {data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.part_number}</TableCell>
                  <TableCell>{row.description ?? "—"}</TableCell>
                  <TableCell>{row.tariff_number ?? "—"}</TableCell>
                  <TableCell>{row.unit_price != null ? `$${row.unit_price}` : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={row.duty_exempt ? "default" : "secondary"}>
                      {row.duty_exempt ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.supplier ?? "—"}</TableCell>
                  <TableCell>{row.importer_account}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
