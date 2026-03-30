"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Inbond } from "@/lib/types";

export default function InbondsPage() {
  const { data, isLoading, error } = useQuery<Inbond[]>({
    queryKey: ["inbonds"],
    queryFn: () => api.get("/inbond").then((r) => r.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">In-Bond Records</h1>
      {isLoading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-500">Failed to load data.</p>}
      {data && (
        <div className="rounded-md border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Container #</TableHead>
                <TableHead>Manifest #</TableHead>
                <TableHead>Part #</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                    No records found.
                  </TableCell>
                </TableRow>
              )}
              {data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.container_number ?? "—"}</TableCell>
                  <TableCell>{row.manifest_number ?? "—"}</TableCell>
                  <TableCell>{row.part_number ?? "—"}</TableCell>
                  <TableCell>{row.quantity ?? "—"}</TableCell>
                  <TableCell>{row.importer_account}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(row.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
