"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FtzLineItem } from "@/lib/types";

export default function FtzLineItemsPage() {
  const { data, isLoading, error } = useQuery<FtzLineItem[]>({
    queryKey: ["ftz_line_items"],
    queryFn: () => api.get("/ftz_line_item").then((r) => r.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">FTZ Line Items</h1>
      {isLoading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-500">Failed to load data.</p>}
      {data && (
        <div className="rounded-md border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch ID</TableHead>
                <TableHead>Part #</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Value</TableHead>
                <TableHead>Concurrence</TableHead>
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
                  <TableCell className="font-mono text-xs">{row.batch_reference_id.slice(0, 8)}…</TableCell>
                  <TableCell className="font-medium">{row.part_number}</TableCell>
                  <TableCell>{row.description ?? "—"}</TableCell>
                  <TableCell>{row.quantity}</TableCell>
                  <TableCell>{row.unit_value != null ? `$${row.unit_value}` : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={row.concurrence ? "default" : "secondary"}>
                      {row.concurrence ? "Approved" : "Pending"}
                    </Badge>
                  </TableCell>
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
