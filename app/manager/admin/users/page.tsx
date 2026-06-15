"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { startImpersonation } from "@/lib/auth";
import type { AdminUser } from "@/lib/types";
import { MODULE_PERMISSIONS } from "@/lib/types";

const PERMISSION_LABELS: Record<string, string> = {
  parts: "Parts",
  tally_in: "Tally In",
  inbond: "In-Bond",
  tally_out: "Tally Out",
};

function extractError(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const detail = (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const first = detail[0];
      if (first && typeof first === "object" && "msg" in first) {
        return String((first as { msg: unknown }).msg);
      }
    }
  }
  return fallback;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: () => api.get("/admin/users").then((r) => r.data),
  });

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle={data ? `${data.length} users` : undefined}
        action={
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#0369A1] hover:bg-[#0284C7] text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create User
          </button>
        }
      />

      {showForm && (
        <CreateUserForm
          onSuccess={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {isLoading && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-4 px-5 py-4 border-b border-[#F1F5F9]">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3.5 w-24 ml-auto" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
          Failed to load users.
        </div>
      )}

      {data && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  {["Email", "Role", "Account", "Permissions", "Status", "Created", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {data.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-[#94A3B8]">No users found</td></tr>
                )}
                {data.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    editing={editingId === user.id}
                    onEdit={() => setEditingId(user.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onSaved={() => {
                      setEditingId(null);
                      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function UserRow({
  user,
  editing,
  onEdit,
  onCancelEdit,
  onSaved,
}: {
  user: AdminUser;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [impersonateError, setImpersonateError] = useState<string | null>(null);

  const impersonateMutation = useMutation({
    mutationFn: () =>
      api.post(`/admin/users/${user.id}/impersonate`).then((r) => r.data as {
        access_token: string;
        role: "vendor" | "manager";
        importer_account: string | null;
        permissions: string[];
      }),
    onSuccess: (data) => {
      startImpersonation({
        email: user.email,
        role: data.role,
        importer_account: data.importer_account,
        access_token: data.access_token,
        permissions: data.permissions ?? [],
      });
      router.replace(data.role === "manager" ? "/manager" : "/vendor");
      router.refresh();
    },
    onError: (err) => setImpersonateError(extractError(err, "Failed to view as user.")),
  });

  if (editing) {
    return (
      <tr className="bg-[#F8FAFC]">
        <td colSpan={7} className="px-4 py-4">
          <EditUserForm user={user} onSuccess={onSaved} onCancel={onCancelEdit} />
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-[#F8FAFC] transition-colors">
      <td className="px-4 py-3 font-medium text-[#0F172A]">{user.email}</td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          user.role === "manager" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
        }`}>
          {user.role === "manager" ? "Admin" : "Vendor"}
        </span>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{user.importer_account ?? "—"}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {user.permissions.length === 0 ? (
            <span className="text-xs text-[#94A3B8]">{user.role === "manager" ? "All" : "None"}</span>
          ) : (
            user.permissions.map((p) => (
              <span key={p} className="text-xs font-medium px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">
                {PERMISSION_LABELS[p] ?? p}
              </span>
            ))
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
          user.is_active ? "bg-emerald-50 text-emerald-700" : "bg-[#F1F5F9] text-[#64748B]"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-[#94A3B8]"}`} />
          {user.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-[#94A3B8]">
        {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <div className="inline-flex items-center gap-2">
          <button
            onClick={onEdit}
            className="text-xs font-medium px-2.5 py-1 rounded border border-[#E2E8F0] text-[#334155] hover:bg-white hover:border-[#CBD5E1] transition-colors cursor-pointer"
          >
            Edit
          </button>
          <button
            onClick={() => { setImpersonateError(null); impersonateMutation.mutate(); }}
            disabled={impersonateMutation.isPending || !user.is_active}
            title={!user.is_active ? "User is inactive" : "View this user's portal"}
            className="text-xs font-medium px-2.5 py-1 rounded bg-[#0369A1] text-white hover:bg-[#0284C7] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {impersonateMutation.isPending ? "Loading…" : "View as"}
          </button>
        </div>
        {impersonateError && (
          <div className="text-xs text-red-600 mt-1 text-right">{impersonateError}</div>
        )}
      </td>
    </tr>
  );
}

function EditUserForm({
  user,
  onSuccess,
  onCancel,
}: {
  user: AdminUser;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [role, setRole] = useState(user.role);
  const [importerAccount, setImporterAccount] = useState(user.importer_account ?? "");
  const [isActive, setIsActive] = useState(user.is_active);
  const [permissions, setPermissions] = useState<string[]>(user.permissions);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        role,
        importer_account: importerAccount || null,
        is_active: isActive,
        permissions,
      };
      if (password) payload.password = password;
      return api.patch(`/admin/users/${user.id}`, payload);
    },
    onSuccess,
    onError: (err) => setError(extractError(err, "Failed to update user.")),
  });

  function togglePermission(perm: string) {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
      className="bg-white border border-[#E2E8F0] rounded-lg p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#020617]">Edit User</h3>
          <p className="text-xs text-[#64748B] mt-0.5">{user.email}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#334155] mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0369A1]"
          >
            <option value="vendor">Vendor</option>
            <option value="manager">Admin</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#334155] mb-1">Importer Account</label>
          <input
            type="text"
            value={importerAccount}
            onChange={(e) => setImporterAccount(e.target.value)}
            placeholder="e.g. ALOHA"
            className="w-full h-9 px-3 rounded-md border border-[#E2E8F0] bg-white text-sm placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0369A1]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#334155] mb-1">Status</label>
          <label className="flex items-center gap-2 h-9 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-[#CBD5E1] text-[#0369A1] focus:ring-[#0369A1]"
            />
            <span className="text-sm text-[#334155]">{isActive ? "Active" : "Inactive"}</span>
          </label>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#334155] mb-1">
            Reset Password <span className="text-[#94A3B8]">(optional)</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep current"
            minLength={6}
            className="w-full h-9 px-3 rounded-md border border-[#E2E8F0] bg-white text-sm placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0369A1]"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-[#334155] mb-2">Module Permissions</label>
          <div className="flex flex-wrap gap-3">
            {MODULE_PERMISSIONS.map((perm) => (
              <label key={perm} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.includes(perm)}
                  onChange={() => togglePermission(perm)}
                  className="w-4 h-4 rounded border-[#CBD5E1] text-[#0369A1] focus:ring-[#0369A1]"
                />
                <span className="text-sm text-[#334155]">{PERMISSION_LABELS[perm] ?? perm}</span>
              </label>
            ))}
          </div>
          {role === "manager" && (
            <p className="text-xs text-[#94A3B8] mt-2">Admins have full access regardless of these checkboxes.</p>
          )}
        </div>

        {error && (
          <div className="col-span-2 flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 border border-red-100 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="col-span-2 flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-md bg-[#0369A1] hover:bg-[#0284C7] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {mutation.isPending ? "Saving..." : "Save changes"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-md border border-[#E2E8F0] text-sm font-medium text-[#64748B] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

function CreateUserForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("vendor");
  const [importerAccount, setImporterAccount] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/admin/users", {
        email,
        password,
        role,
        importer_account: importerAccount || null,
        permissions,
      }),
    onSuccess,
    onError: (err) => setError(extractError(err, "Failed to create user.")),
  });

  function togglePermission(perm: string) {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  }

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 mb-6">
      <h3 className="text-sm font-semibold text-[#020617] mb-4">New User</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
        className="grid grid-cols-2 gap-4"
      >
        <div>
          <label className="block text-xs font-medium text-[#334155] mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-9 px-3 rounded-md border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0369A1]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#334155] mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full h-9 px-3 rounded-md border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0369A1]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#334155] mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0369A1]"
          >
            <option value="vendor">Vendor</option>
            <option value="manager">Admin</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#334155] mb-1">Importer Account</label>
          <input
            type="text"
            value={importerAccount}
            onChange={(e) => setImporterAccount(e.target.value)}
            placeholder="e.g. ALOHA"
            className="w-full h-9 px-3 rounded-md border border-[#E2E8F0] bg-white text-sm placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0369A1]"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-[#334155] mb-2">Module Permissions</label>
          <div className="flex flex-wrap gap-3">
            {MODULE_PERMISSIONS.map((perm) => (
              <label key={perm} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.includes(perm)}
                  onChange={() => togglePermission(perm)}
                  className="w-4 h-4 rounded border-[#CBD5E1] text-[#0369A1] focus:ring-[#0369A1]"
                />
                <span className="text-sm text-[#334155]">{PERMISSION_LABELS[perm] ?? perm}</span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="col-span-2 flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 border border-red-100 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="col-span-2 flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-md bg-[#0369A1] hover:bg-[#0284C7] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {mutation.isPending ? "Creating..." : "Create User"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-md border border-[#E2E8F0] text-sm font-medium text-[#64748B] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
