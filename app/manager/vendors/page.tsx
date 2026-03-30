"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { VendorDetail } from "@/lib/types";

export default function VendorsPage() {
  const { data, isLoading, error } = useQuery<VendorDetail[]>({
    queryKey: ["vendors"],
    queryFn: () => api.get("/manager/vendors").then((r) => r.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Vendors</h1>
      {isLoading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-500">Failed to load vendors.</p>}
      {data && (
        <div className="rounded-md border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Arts</TableHead>
                <TableHead>FTZ</TableHead>
                <TableHead>In-Bond</TableHead>
                <TableHead>Tally</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-400 py-8">
                    No vendors found.
                  </TableCell>
                </TableRow>
              )}
              {data.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.email}</TableCell>
                  <TableCell>{v.importer_account ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={v.is_active ? "default" : "secondary"}>
                      {v.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{v.record_counts.arts_parts}</TableCell>
                  <TableCell>{v.record_counts.ftz_line_items}</TableCell>
                  <TableCell>{v.record_counts.inbonds}</TableCell>
                  <TableCell>{v.record_counts.tally_outs}</TableCell>
                  <TableCell>
                    <Link
                      href={`/manager/vendors/${v.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View
                    </Link>
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
