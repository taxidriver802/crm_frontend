"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { InviteUserModal } from "@/components/invite-user-modal";
import { api } from "@/lib/api";

function badgeClass(status) {
  switch (status) {
    case "active":
      return "border-green-300 bg-green-50 text-green-700";
    case "invited":
      return "border-yellow-300 bg-yellow-50 text-yellow-700";
    case "disabled":
      return "border-red-300 bg-red-50 text-red-700";
    default:
      return "border-base bg-surface text-main";
  }
}

export default function UsersPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState("");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  async function loadCurrentUser() {
    const res = await fetch("/api/auth/me", {
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) {
      router.replace("/login");
      return null;
    }

    const data = await res.json();
    return data.user;
  }

  async function loadUsers() {
    setLoadingUsers(true);
    setError("");

    try {
      const data = await api("/users");
      setUsers(data.users ?? []);
    } catch (err) {
      console.error(err);
      setError("Failed to load users.");
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    async function boot() {
      try {
        const user = await loadCurrentUser();
        setCurrentUser(user);

        if (!user) return;

        if (user.role !== "owner" && user.role !== "admin") {
          router.replace("/dashboard");
          return;
        }

        await loadUsers();
      } catch (err) {
        console.error(err);
        router.replace("/login");
      } finally {
        setLoadingUser(false);
      }
    }

    boot();
  }, [router]);

  const counts = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.status === "active").length,
      invited: users.filter((u) => u.status === "invited").length,
      disabled: users.filter((u) => u.status === "disabled").length,
    };
  }, [users]);

  async function updateUser(id, patch) {
    setBusyId(id);
    setError("");

    try {
      await api(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });

      await loadUsers();
    } catch (err) {
      console.error(err);
      setError("Failed to update user.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(id) {
    const confirmed = window.confirm(
      "Delete this user? This is best reserved for test accounts or unused invited users.",
    );
    if (!confirmed) return;

    setBusyId(id);
    setError("");

    try {
      await api(`/users/${id}`, {
        method: "DELETE",
      });

      await loadUsers();
    } catch (err) {
      console.error(err);
      setError("Failed to delete user.");
    } finally {
      setBusyId(null);
    }
  }

  const isOwner = currentUser?.role === "owner";

  function getDisplayStatus(user) {
    if (user.status === "invited") return "Pending Invite";
    if (user.status === "active") return "Active";
    if (user.status === "disabled") return "Disabled";
    return user.status;
  }

  if (loadingUser) {
    return (
      <AppShell title="Users">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Users"
      right={
        <button
          onClick={() => setInviteModalOpen(true)}
          className="hover:bg-accent-soft rounded-lg border px-4 py-2 text-sm font-medium"
        >
          Invite User
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total" value={counts.total} />
        <StatCard label="Active" value={counts.active} />
        <StatCard label="Invited" value={counts.invited} />
        <StatCard label="Disabled" value={counts.disabled} />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex gap-2 px-5 py-3">
        {["all", "active", "invited", "disabled"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-md border px-3 py-1 text-xs ${
              statusFilter === s ? "bg-accent-soft" : ""
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <section className="bg-surface rounded-2xl border">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Team Members</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage invited, active, and disabled users.
            </p>
          </div>
        </div>

        {loadingUsers ? (
          <div className="text-muted-foreground px-5 py-6 text-sm">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="text-muted-foreground px-5 py-6 text-sm">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 border-b text-left">
                <tr>
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Invited</th>
                  <th className="px-5 py-3 font-medium">Last Login</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {users
                  .filter((u) => statusFilter === "all" || u.status === statusFilter)
                  .map((user) => {
                    const isSelf = currentUser?.id === user.id;
                    const canDelete =
                      user.status === "invited" || user.status === "disabled";

                    return (
                      <tr key={user.id} className="border-b last:border-b-0">
                        <td className="px-5 py-4 align-top">
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {[user.first_name, user.last_name]
                                .filter(Boolean)
                                .join(" ") || "Unnamed User"}
                            </div>
                            <div className="text-muted-foreground truncate text-xs sm:text-sm">
                              {user.email}
                            </div>
                            {isSelf ? (
                              <div className="text-muted-foreground mt-1 text-xs">
                                Current account
                              </div>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-5 py-4 align-top">
                          <select
                            value={user.role}
                            disabled={busyId === user.id || isSelf}
                            onChange={(e) =>
                              updateUser(user.id, { role: e.target.value })
                            }
                            className="bg-background rounded-md border px-2 py-1"
                          >
                            <option value="agent">Agent</option>
                            <option value="admin">Admin</option>
                            {isOwner && <option value="owner">Owner</option>}
                          </select>
                        </td>

                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(
                                user.status,
                              )}`}
                            >
                              {getDisplayStatus(user)}
                            </span>

                            {user.status === "invited" && user.invite_expires_at ? (
                              <span className="text-muted-foreground text-xs">
                                Expires{" "}
                                {new Date(user.invite_expires_at).toLocaleDateString()}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="text-muted-foreground px-5 py-4 align-top">
                          {user.invited_at
                            ? new Date(user.invited_at).toLocaleDateString()
                            : "—"}
                        </td>

                        <td className="text-muted-foreground px-5 py-4 align-top">
                          {user.last_login_at
                            ? new Date(user.last_login_at).toLocaleDateString()
                            : user.status === "invited"
                              ? "Pending"
                              : "—"}
                        </td>

                        <td className="px-5 py-4 align-top">
                          <div className="flex w-full items-center justify-between gap-2">
                            <div>
                              {user.status === "active" && !isSelf ? (
                                <button
                                  onClick={() =>
                                    updateUser(user.id, { status: "disabled" })
                                  }
                                  disabled={busyId === user.id}
                                  className="hover:bg-accent-soft rounded-md border px-3 py-1.5 text-xs"
                                >
                                  Disable
                                </button>
                              ) : user.status === "disabled" ? (
                                <button
                                  onClick={() =>
                                    updateUser(user.id, { status: "active" })
                                  }
                                  disabled={busyId === user.id}
                                  className="hover:bg-accent-soft rounded-md border px-3 py-1.5 text-xs"
                                >
                                  Re-enable
                                </button>
                              ) : (
                                <span />
                              )}
                            </div>

                            <div>
                              {canDelete && !isSelf ? (
                                <button
                                  onClick={() => deleteUser(user.id)}
                                  disabled={busyId === user.id}
                                  className="rounded-md border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              ) : isSelf ? (
                                <span className="text-muted-foreground text-xs">
                                  Current account
                                </span>
                              ) : (
                                <span />
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <InviteUserModal
        open={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false);
          loadUsers();
        }}
      />
    </AppShell>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-surface rounded-2xl border px-4 py-4">
      <div className="text-muted-foreground text-sm">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
