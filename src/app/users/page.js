"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { InviteUserModal } from "@/components/modals/invite-user-modal";
import { api } from "@/lib/api";
import { CollapsibleSection } from "@/components/forms/collapsible-section";

function badgeClass(status) {
  switch (status) {
    case "Active":
      return "border-green-300 bg-green-50 text-green-700";
    case "Pending Invite":
      return "border-yellow-300 bg-yellow-50 text-yellow-700";
    case "Expired":
      return "border-red-300 bg-red-50 text-red-700";
    case "Disabled":
      return "border-red-300 bg-red-50 text-red-700";
    default:
      return "border-base bg-surface text-main";
  }
}

function StatCard({ label, value, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-4 text-left transition ${
        active
          ? "bg-accent-soft border-transparent shadow-sm"
          : "bg-surface hover:bg-accent"
      }`}
    >
      <div className="text-muted text-sm">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </button>
  );
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
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

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

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (statusFilter !== "all" && user.status !== statusFilter) {
        return false;
      }

      if (roleFilter !== "all" && user.role !== roleFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.toLowerCase();
        const email = user.email?.toLowerCase() ?? "";

        if (!fullName.includes(query) && !email.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [users, statusFilter, roleFilter, searchQuery]);

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
      setError(err.message || "Failed to delete user.");
    } finally {
      setBusyId(null);
    }
  }

  async function resendInvite(id) {
    setBusyId(id);
    setError("");

    try {
      await api(`/users/invite/${id}/resend`, {
        method: "POST",
      });

      await loadUsers();
    } catch (err) {
      console.error(err);
      setError("Failed to resend invite.");
    } finally {
      setBusyId(null);
    }
  }

  function getDisplayStatus(user) {
    if (user.status === "active") return "Active";
    if (user.status === "disabled") return "Disabled";

    if (
      user.status === "invited" &&
      user.invite_expires_at &&
      new Date(user.invite_expires_at) < new Date()
    ) {
      return "Expired";
    }

    if (user.status === "invited") return "Pending Invite";

    return user.status;
  }

  const isOwner = currentUser?.role === "owner";

  if (loadingUser) {
    return (
      <AppShell title="Users">
        <div className="text-muted text-sm">Loading...</div>
      </AppShell>
    );
  }

  const usersTitle = (
    <div>
      {loadingUsers
        ? "Loading…"
        : filteredUsers.length === 0
          ? "No users yet"
          : `${filteredUsers.length} user${filteredUsers.length === 1 ? "" : "s"}`}
    </div>
  );

  return (
    <AppShell
      title="Users"
      right={
        <button onClick={() => setInviteModalOpen(true)} className="btn">
          Invite User
        </button>
      }
    >
      <div className="space-y-6">
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total"
            value={counts.total}
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          />
          <StatCard
            label="Active"
            value={counts.active}
            active={statusFilter === "active"}
            onClick={() => setStatusFilter("active")}
          />
          <StatCard
            label="Invited"
            value={counts.invited}
            active={statusFilter === "invited"}
            onClick={() => setStatusFilter("invited")}
          />
          <StatCard
            label="Disabled"
            value={counts.disabled}
            active={statusFilter === "disabled"}
            onClick={() => setStatusFilter("disabled")}
          />
        </section>

        {error ? (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="card rounded-lg p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <label className="text-muted text-xs">Search</label>
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input mt-1"
              />
            </div>

            <div className="w-full lg:w-40">
              <label className="text-muted text-xs">Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="input mt-1"
              >
                <option value="all">All Roles</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="agent">Agent</option>
              </select>
            </div>

            <div className="w-full lg:w-44">
              <label className="text-muted text-xs">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input mt-1"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="invited">Invited</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>
        </section>

        <CollapsibleSection title={usersTitle} defaultOpen={true}>
          {loadingUsers ? (
            <div className="text-muted px-5 py-6 text-sm">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-muted px-5 py-6 text-sm">No users found yet.</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-muted px-5 py-8 text-sm">
              No users match the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-accent border-b text-left">
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
                  {filteredUsers.map((user) => {
                    const isSelf = currentUser?.id === user.id;
                    const canDelete =
                      user.status === "invited" || user.status === "disabled";
                    const displayStatus = getDisplayStatus(user);
                    const canResend = user.status === "invited";
                    const isExpired =
                      user.status === "invited" &&
                      user.invite_expires_at &&
                      new Date(user.invite_expires_at) < new Date();

                    return (
                      <tr
                        key={user.id}
                        className="border-base hover:bg-accent border-t transition"
                      >
                        <td className="px-5 py-4 align-top">
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {[user.first_name, user.last_name]
                                .filter(Boolean)
                                .join(" ") || "Unnamed User"}
                            </div>
                            <div className="text-muted truncate text-xs sm:text-sm">
                              {user.email}
                            </div>
                            {isSelf ? (
                              <div className="text-muted mt-1 text-xs">
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
                            className="input max-w-[140px] py-1"
                          >
                            <option value="agent">Agent</option>
                            <option value="admin">Admin</option>
                            {isOwner ? <option value="owner">Owner</option> : null}
                          </select>
                        </td>

                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(displayStatus)}`}
                            >
                              {displayStatus}
                            </span>

                            {user.status === "invited" && user.invite_expires_at ? (
                              <span className="text-muted text-xs">
                                {isExpired
                                  ? "Invite expired"
                                  : `Expires ${new Date(user.invite_expires_at).toLocaleDateString()}`}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="text-muted px-5 py-4 align-top">
                          {user.invited_at
                            ? new Date(user.invited_at).toLocaleDateString()
                            : "—"}
                        </td>

                        <td className="text-muted px-5 py-4 align-top">
                          {user.last_login_at
                            ? new Date(user.last_login_at).toLocaleDateString()
                            : user.status === "invited"
                              ? "Pending"
                              : "—"}
                        </td>

                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-wrap items-center gap-2">
                            {user.status === "active" && !isSelf ? (
                              <button
                                onClick={() =>
                                  updateUser(user.id, { status: "disabled" })
                                }
                                disabled={busyId === user.id}
                                className="btn px-3 py-1.5 text-xs"
                              >
                                Disable
                              </button>
                            ) : null}

                            {user.status === "disabled" ? (
                              <button
                                onClick={() => updateUser(user.id, { status: "active" })}
                                disabled={busyId === user.id}
                                className="btn px-3 py-1.5 text-xs"
                              >
                                Re-enable
                              </button>
                            ) : null}

                            {canResend ? (
                              <button
                                onClick={() => resendInvite(user.id)}
                                disabled={busyId === user.id}
                                className="btn px-3 py-1.5 text-xs"
                              >
                                {busyId === user.id ? "Sending..." : "Resend Invite"}
                              </button>
                            ) : null}

                            {canDelete && !isSelf ? (
                              <button
                                onClick={() => deleteUser(user.id)}
                                disabled={busyId === user.id}
                                className="btn px-3 py-1.5 text-xs text-red-600"
                              >
                                Delete
                              </button>
                            ) : isSelf ? (
                              <span className="text-muted text-xs">Current account</span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CollapsibleSection>

        <InviteUserModal
          open={inviteModalOpen}
          onClose={() => {
            setInviteModalOpen(false);
            loadUsers();
          }}
        />
      </div>
    </AppShell>
  );
}
