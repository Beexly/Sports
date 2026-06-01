"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface AdminUserRow {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "ADMIN";
  compedTier: "PRO" | "ELITE" | "VIP" | null;
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
  createdAt: string;
}

const COMP_OPTIONS = ["", "PRO", "ELITE", "VIP"] as const;

export function UsersTable({
  users,
  currentUserId,
}: {
  users: AdminUserRow[];
  currentUserId: string;
}): JSX.Element {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-xs uppercase text-gray-400">
            <th className="px-4 py-3 text-left">User</th>
            <th className="px-4 py-3 text-left">Role</th>
            <th className="px-4 py-3 text-left">Billing tier</th>
            <th className="px-4 py-3 text-left">Comp (override)</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <UserRow key={u.id} user={u} isSelf={u.id === currentUserId} />
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                No users yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function UserRow({ user, isSelf }: { user: AdminUserRow; isSelf: boolean }): JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(url: string, body: unknown): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    } catch {
      setError("network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-b border-gray-800/50 align-top hover:bg-gray-800/30">
      <td className="px-4 py-3">
        <div className="text-white">{user.name ?? "—"}</div>
        <div className="text-xs text-gray-500">{user.email}</div>
        {error && <div className="mt-1 text-xs text-red-400">{error}</div>}
      </td>

      <td className="px-4 py-3">
        <button
          type="button"
          disabled={busy || isSelf}
          title={isSelf ? "You can't change your own role" : "Toggle role"}
          onClick={() =>
            call(`/api/admin/users/${user.id}/role`, {
              role: user.role === "ADMIN" ? "USER" : "ADMIN",
            })
          }
          className={`rounded px-2 py-0.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            user.role === "ADMIN"
              ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          {user.role}
        </button>
      </td>

      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            user.subscriptionTier === "ELITE" || user.subscriptionTier === "VIP"
              ? "bg-yellow-400/10 text-yellow-400"
              : user.subscriptionTier === "PRO"
                ? "bg-blue-500/10 text-blue-400"
                : "bg-gray-700 text-gray-400"
          }`}
        >
          {user.subscriptionTier ?? "FREE"}
        </span>
      </td>

      <td className="px-4 py-3">
        <select
          disabled={busy}
          value={user.compedTier ?? ""}
          onChange={(e) =>
            call(`/api/admin/users/${user.id}/comp`, {
              tier: e.target.value === "" ? null : e.target.value,
            })
          }
          className="rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs text-gray-200 disabled:opacity-50"
        >
          {COMP_OPTIONS.map((opt) => (
            <option key={opt || "none"} value={opt}>
              {opt === "" ? "— none —" : opt}
            </option>
          ))}
        </select>
        {user.compedTier && (
          <span className="ml-2 rounded-full bg-plasma/10 px-2 py-0.5 text-[10px] font-semibold text-plasma">
            comped
          </span>
        )}
      </td>

      <td className="px-4 py-3 text-xs text-gray-400">
        {user.subscriptionStatus ?? "—"}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">{user.createdAt}</td>
    </tr>
  );
}
