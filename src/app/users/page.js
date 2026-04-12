"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { InviteUserModal } from "@/components/modals/invite-user-modal";
import { api } from "@/lib/api";
import { CollapsibleSection } from "@/components/forms/collapsible-section";
import {
  FilterBarSkeleton,
  Skeleton,
  StatCardSkeleton,
  TableRowSkeleton,
} from "@/components/loading/loadingSkeletons";

/** 12rem — matches `min-w-[12rem]` menus */
const TABLE_DROPDOWN_MENU_WIDTH_PX = 192;
const TABLE_DROPDOWN_MENU_GAP_PX = 4;

function getTableDropdownMenuPosition(triggerEl) {
  const rect = triggerEl.getBoundingClientRect();
  let left = rect.right - TABLE_DROPDOWN_MENU_WIDTH_PX;
  const pad = 8;
  left = Math.max(
    pad,
    Math.min(left, window.innerWidth - TABLE_DROPDOWN_MENU_WIDTH_PX - pad),
  );
  return {
    top: rect.bottom + TABLE_DROPDOWN_MENU_GAP_PX,
    left,
    width: TABLE_DROPDOWN_MENU_WIDTH_PX,
  };
}

function badgeClass(status) {
  switch (status) {
    case "Active":
      return "border-green-300 bg-green-50 text-green-700";
    case "Pending":
      return "border-yellow-300 bg-yellow-50 text-yellow-700";
    case "Expired":
      return "border-red-300 bg-red-50 text-red-700";
    case "Disabled":
      return "border-red-300 bg-red-50 text-red-700";
    case "Revoked":
      return "border-slate-300 bg-slate-100 text-slate-700";
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
  const [successMessage, setSuccessMessage] = useState("");
  const [openActionsUserId, setOpenActionsUserId] = useState(null);
  /** Viewport-fixed placement so the menu does not expand `overflow-x-auto` scroll height */
  const [actionsMenuPosition, setActionsMenuPosition] = useState(null);
  const [openRoleUserId, setOpenRoleUserId] = useState(null);
  const [roleMenuPosition, setRoleMenuPosition] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const isInitialLoading = loadingUsers && users.length === 0;

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

  function syncActionsMenuPosition(userId) {
    if (userId == null) {
      setActionsMenuPosition(null);
      return;
    }
    const el = document.querySelector(`[data-user-actions-menu="${userId}"]`);
    if (el) {
      setActionsMenuPosition(getTableDropdownMenuPosition(el));
    }
  }

  function syncRoleMenuPosition(userId) {
    if (userId == null) {
      setRoleMenuPosition(null);
      return;
    }
    const el = document.querySelector(`[data-user-role-menu="${userId}"]`);
    if (el) {
      setRoleMenuPosition(getTableDropdownMenuPosition(el));
    }
  }

  useLayoutEffect(() => {
    syncActionsMenuPosition(openActionsUserId);
    syncRoleMenuPosition(openRoleUserId);
  }, [openActionsUserId, openRoleUserId]);

  useEffect(() => {
    if (openActionsUserId == null && openRoleUserId == null) return undefined;

    function handlePointerDown(e) {
      if (e.target.closest("[data-user-actions-menu]")) {
        return;
      }
      if (e.target.closest("[data-user-role-menu]")) {
        return;
      }
      setOpenActionsUserId(null);
      setActionsMenuPosition(null);
      setOpenRoleUserId(null);
      setRoleMenuPosition(null);
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setOpenActionsUserId(null);
        setActionsMenuPosition(null);
        setOpenRoleUserId(null);
        setRoleMenuPosition(null);
      }
    }

    function handleReposition() {
      syncActionsMenuPosition(openActionsUserId);
      syncRoleMenuPosition(openRoleUserId);
    }

    window.addEventListener("resize", handleReposition);
    document.addEventListener("scroll", handleReposition, true);

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", handleReposition);
      document.removeEventListener("scroll", handleReposition, true);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openActionsUserId, openRoleUserId]);

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
    setSuccessMessage("");

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

  async function copyInviteLink(id) {
    setBusyId(id);
    setError("");
    setSuccessMessage("");

    try {
      const data = await api(`/users/invite/${id}/resend`, {
        method: "POST",
      });

      const url = data?.invite_url;
      if (url && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setSuccessMessage("Invite link copied to clipboard.");
        window.setTimeout(() => setSuccessMessage(""), 4000);
      } else if (url) {
        setError("Clipboard is not available in this browser.");
      }

      await loadUsers();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to copy invite link.");
    } finally {
      setBusyId(null);
    }
  }

  async function revokeInvite(id) {
    const confirmed = window.confirm(
      "Revoke this invite? The link will stop working. You can send a new invite later.",
    );
    if (!confirmed) return;

    setBusyId(id);
    setError("");
    setSuccessMessage("");

    try {
      await api(`/users/invite/${id}/revoke`, {
        method: "POST",
      });

      await loadUsers();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to revoke invite.");
    } finally {
      setBusyId(null);
    }
  }

  function getDisplayStatus(user) {
    if (user.status === "active") return "Active";
    if (user.status === "disabled") return "Disabled";

    if (user.status === "invited" && user.invite_revoked_at) {
      return "Revoked";
    }

    if (
      user.status === "invited" &&
      user.invite_expires_at &&
      new Date(user.invite_expires_at) < new Date()
    ) {
      return "Expired";
    }

    if (user.status === "invited") return "Pending";

    return user.status;
  }

  const isOwner = currentUser?.role === "owner";
  const isAdmin = currentUser?.role === "admin";

  if (loadingUser) {
    return (
      <AppShell title="Users">
        <div className="space-y-6">
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </section>

          <FilterBarSkeleton />

          <div className="card rounded-lg p-4">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        </div>
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
      /* right={
        isAdmin || isOwner ? (
          <button onClick={() => setInviteModalOpen(true)} className="btn">
            Invite User
          </button>
        ) : null
      } */
    >
      <div className="space-y-6">
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isInitialLoading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
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
            </>
          )}
        </section>

        {error ? (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
            {successMessage}
          </div>
        ) : null}

        {isAdmin ? (
          <p className="text-muted text-sm">
            As an admin, you cannot change roles or account status for workspace owners.
            Ask an owner if you need changes to an owner account.
          </p>
        ) : null}

        {isInitialLoading ? (
          <FilterBarSkeleton />
        ) : (
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
        )}

        <CollapsibleSection
          title={usersTitle}
          defaultOpen={true}
          actions={
            isAdmin || isOwner ? (
              <button onClick={() => setInviteModalOpen(true)} className="btn">
                Invite User
              </button>
            ) : null
          }
        >
          {loadingUsers ? (
            <div className="scrollbar-theme overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-accent border-b text-left">
                  <tr>
                    <th className="px-5 py-3 font-medium">User</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Invited</th>
                    <th className="px-5 py-3 font-medium">Accepted</th>
                    <th className="px-5 py-3 font-medium">Last Login</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <TableRowSkeleton key={i} cols={7} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : users.length === 0 ? (
            <div className="text-muted px-5 py-6 text-sm">No users found yet.</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-muted px-5 py-8 text-sm">
              No users match the selected filters.
            </div>
          ) : (
            <div className="scrollbar-theme overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-accent border-b text-left">
                  <tr>
                    <th className="px-5 py-3 font-medium">User</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Invited</th>
                    <th className="px-5 py-3 font-medium">Accepted</th>
                    <th className="px-5 py-3 font-medium">Last Login</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((user) => {
                    const isSelf = currentUser?.id === user.id;
                    const adminLockedOwnerRow =
                      currentUser?.role === "admin" && user.role === "owner" && !isSelf;
                    const canDelete =
                      user.status === "invited" || user.status === "disabled";
                    const displayStatus = getDisplayStatus(user);
                    const canInviteActions =
                      user.status === "invited" && !adminLockedOwnerRow;
                    const canRevokeInvite =
                      user.status === "invited" &&
                      !user.invite_revoked_at &&
                      !adminLockedOwnerRow;
                    const isExpired =
                      user.status === "invited" &&
                      !user.invite_revoked_at &&
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
                          {(() => {
                            const roleLocked =
                              busyId === user.id || isSelf || adminLockedOwnerRow;
                            const roleOptions = [
                              { value: "agent", label: "Agent" },
                              { value: "admin", label: "Admin" },
                              ...(isOwner ? [{ value: "owner", label: "Owner" }] : []),
                            ];
                            const roleMenuOpen = openRoleUserId === user.id;

                            if (roleLocked) {
                              return (
                                <span
                                  className="text-muted inline-block max-w-[160px] truncate text-sm capitalize"
                                  title={
                                    isSelf
                                      ? "You can't change your own role"
                                      : adminLockedOwnerRow
                                        ? "Only an owner can change another owner's role or status."
                                        : undefined
                                  }
                                >
                                  {user.role}
                                </span>
                              );
                            }

                            return (
                              <div
                                className="relative flex justify-start"
                                data-user-role-menu={user.id}
                              >
                                <button
                                  type="button"
                                  className="btn flex max-w-[160px] items-center gap-1 px-3 py-1.5 text-xs capitalize"
                                  aria-expanded={roleMenuOpen}
                                  aria-haspopup="listbox"
                                  aria-label={`Role for ${user.email}`}
                                  disabled={busyId === user.id}
                                  onClick={(e) => {
                                    setOpenActionsUserId(null);
                                    setActionsMenuPosition(null);
                                    const wrap = e.currentTarget.closest(
                                      "[data-user-role-menu]",
                                    );
                                    if (openRoleUserId === user.id) {
                                      setOpenRoleUserId(null);
                                      setRoleMenuPosition(null);
                                      return;
                                    }
                                    if (wrap) {
                                      setRoleMenuPosition(
                                        getTableDropdownMenuPosition(wrap),
                                      );
                                    }
                                    setOpenRoleUserId(user.id);
                                  }}
                                >
                                  <span className="min-w-0 truncate">{user.role}</span>
                                  <span className="text-muted shrink-0" aria-hidden>
                                    ▾
                                  </span>
                                </button>

                                {roleMenuOpen && roleMenuPosition ? (
                                  <div
                                    role="listbox"
                                    aria-label={`Choose role for ${user.email}`}
                                    className="dropdown-panel fixed z-[100] min-w-[12rem] overflow-hidden py-1 shadow-lg"
                                    style={{
                                      top: roleMenuPosition.top,
                                      left: roleMenuPosition.left,
                                      width: roleMenuPosition.width,
                                    }}
                                  >
                                    {roleOptions.map((opt) => (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        role="option"
                                        aria-selected={user.role === opt.value}
                                        className={`hover:bg-accent focus-visible:bg-accent block w-full px-3 py-2 text-left text-xs capitalize transition-colors ${
                                          user.role === opt.value
                                            ? "bg-accent-soft font-medium"
                                            : ""
                                        }`}
                                        onClick={() => {
                                          setOpenRoleUserId(null);
                                          setRoleMenuPosition(null);
                                          if (opt.value !== user.role) {
                                            updateUser(user.id, { role: opt.value });
                                          }
                                        }}
                                      >
                                        {opt.label}
                                      </button>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })()}
                        </td>

                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(displayStatus)}`}
                            >
                              {displayStatus}
                            </span>

                            {user.status === "invited" && user.invite_revoked_at ? (
                              <span className="text-muted text-xs">
                                Invite was revoked
                              </span>
                            ) : null}

                            {user.status === "invited" &&
                            user.invite_expires_at &&
                            !user.invite_revoked_at ? (
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
                          {user.password_set_at
                            ? new Date(user.password_set_at).toLocaleDateString()
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
                          {(() => {
                            const canDisable =
                              user.status === "active" && !isSelf && !adminLockedOwnerRow;
                            const canReenable =
                              user.status === "disabled" && !adminLockedOwnerRow;
                            const canDeleteUser =
                              canDelete && !isSelf && !adminLockedOwnerRow;
                            const hasRowActions =
                              canDisable ||
                              canReenable ||
                              canInviteActions ||
                              canRevokeInvite ||
                              canDeleteUser;

                            if (isSelf) {
                              return (
                                <span className="text-muted text-xs">
                                  Current account
                                </span>
                              );
                            }

                            if (!hasRowActions) {
                              return <span className="text-muted text-xs">—</span>;
                            }

                            const menuOpen = openActionsUserId === user.id;
                            const busy = busyId === user.id;

                            const menuItems = [];
                            if (canDisable) {
                              menuItems.push({
                                key: "disable",
                                label: "Disable account",
                                itemClassName: "text-xs",
                                disabled: false,
                                onClick: () => {
                                  setOpenActionsUserId(null);
                                  updateUser(user.id, { status: "disabled" });
                                },
                              });
                            }
                            if (canReenable) {
                              menuItems.push({
                                key: "reenable",
                                label: "Re-enable account",
                                itemClassName: "text-xs",
                                disabled: false,
                                onClick: () => {
                                  setOpenActionsUserId(null);
                                  updateUser(user.id, { status: "active" });
                                },
                              });
                            }
                            if (canInviteActions) {
                              menuItems.push({
                                key: "copy",
                                label: "Copy invite link",
                                itemClassName: "text-xs",
                                disabled: busy,
                                onClick: () => {
                                  setOpenActionsUserId(null);
                                  copyInviteLink(user.id);
                                },
                              });
                              menuItems.push({
                                key: "resend",
                                label: "Resend invite",
                                itemClassName: "text-xs",
                                disabled: busy,
                                onClick: () => {
                                  setOpenActionsUserId(null);
                                  resendInvite(user.id);
                                },
                              });
                            }
                            if (canRevokeInvite) {
                              menuItems.push({
                                key: "revoke",
                                label: "Revoke invite",
                                itemClassName: "text-xs text-red-700",
                                disabled: busy,
                                onClick: () => {
                                  setOpenActionsUserId(null);
                                  revokeInvite(user.id);
                                },
                              });
                            }
                            if (canDeleteUser) {
                              menuItems.push({
                                key: "delete",
                                label: "Delete user",
                                itemClassName: "text-xs text-red-600",
                                disabled: busy,
                                onClick: () => {
                                  setOpenActionsUserId(null);
                                  deleteUser(user.id);
                                },
                              });
                            }

                            return (
                              <div
                                className="relative flex justify-end"
                                data-user-actions-menu={user.id}
                              >
                                <button
                                  type="button"
                                  className="btn flex items-center gap-1 px-3 py-1.5 text-xs"
                                  aria-expanded={menuOpen}
                                  aria-haspopup="menu"
                                  disabled={busy}
                                  onClick={(e) => {
                                    const wrap = e.currentTarget.closest(
                                      "[data-user-actions-menu]",
                                    );
                                    if (openActionsUserId === user.id) {
                                      setOpenActionsUserId(null);
                                      setActionsMenuPosition(null);
                                      return;
                                    }
                                    setOpenRoleUserId(null);
                                    setRoleMenuPosition(null);
                                    if (wrap) {
                                      setActionsMenuPosition(
                                        getTableDropdownMenuPosition(wrap),
                                      );
                                    }
                                    setOpenActionsUserId(user.id);
                                  }}
                                >
                                  {busy ? "…" : "Actions"}
                                  <span className="text-muted" aria-hidden>
                                    ▾
                                  </span>
                                </button>

                                {menuOpen && actionsMenuPosition ? (
                                  <div
                                    role="menu"
                                    aria-label={`Actions for ${user.email}`}
                                    className="dropdown-panel fixed z-[100] min-w-[12rem] overflow-hidden py-1 shadow-lg"
                                    style={{
                                      top: actionsMenuPosition.top,
                                      left: actionsMenuPosition.left,
                                      width: actionsMenuPosition.width,
                                    }}
                                  >
                                    {menuItems.map((item) => (
                                      <button
                                        key={item.key}
                                        type="button"
                                        role="menuitem"
                                        disabled={item.disabled}
                                        className={`hover:bg-accent focus-visible:bg-accent block w-full px-3 py-2 text-left transition-colors ${item.itemClassName}`}
                                        onClick={item.onClick}
                                      >
                                        {item.label}
                                      </button>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })()}
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
