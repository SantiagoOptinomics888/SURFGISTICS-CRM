"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TallyOut } from "@/lib/types";

export default function TallyOutPage() {
  const { data, isLoading, error } = useQuery<TallyOut[]>({
    queryKey: ["tally_outs"],
    queryFn: () => api.get("/tally_out").then((r) => r.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tally Out</h1>
      {isLoading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-500">Failed to load data.</p>}
      {data && (
        <div className="rounded-md border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Delivery Order #</TableHead>
                <TableHead>Part #</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                    No records found.
                  </TableCell>
                </TableRow>
              )}
              {data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.delivery_order_no ?? "—"}</TableCell>
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
