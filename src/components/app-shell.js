"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import { InviteUserModal } from "@/components/invite-user-modal";

import MainLogo from "@/assets/mainlogo.svg";
import { api } from "@/lib/api";

const BASE_NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/tasks", label: "Tasks" },
  { href: "/integrations", label: "Integrations" },
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function AppShell({ children, title, right }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const { theme, setTheme, systemTheme } = useTheme();

  function handleToggleTheme() {
    const activeTheme = theme === "system" ? systemTheme : theme;
    setTheme(activeTheme === "dark" ? "light" : "dark");
  }

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (!res.ok) return;

        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        console.error("Failed to load user", err);
      }
    }

    loadUser();
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (!e.target.closest(".actions-menu")) {
        setActionsOpen(false);
      }
    }

    if (actionsOpen) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [actionsOpen]);

  useEffect(() => {
    setActionsOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await api("/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const navItems =
    user?.role === "owner" || user?.role === "admin"
      ? [...BASE_NAV, { href: "/users", label: "Users" }]
      : BASE_NAV;

  return (
    <div className={s.app}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <div className={s.left}>
            <Link href="/dashboard" className={s.brand}>
              <MainLogo className="text-main h-16 w-16 sm:h-20 sm:w-20" />
            </Link>

            {/* Desktop nav */}
            <nav className={s.navDesktop}>
              {navItems.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cx(
                      s.navItem,
                      active ? s.navItemActive : s.navItemInactive,
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className={s.right}>
            {right ? <div className={s.rightSlot}>{right}</div> : null}

            <div className="actions-menu relative">
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setActionsOpen((prev) => !prev)}
                  className="hover:bg-muted rounded-lg border px-3 py-2 text-sm"
                >
                  Menu ▾
                </button>

                {actionsOpen && (
                  <div className="bg-surface absolute right-0 z-50 mt-2 w-48 rounded-lg border shadow-lg">
                    {/* Invite (owner/admin only) */}
                    {(user?.role === "owner" || user?.role === "admin") && (
                      <button
                        onClick={() => {
                          setActionsOpen(false);
                          setInviteModalOpen(true);
                        }}
                        className="hover:bg-muted w-full px-4 py-2 text-left text-sm"
                      >
                        Invite User
                      </button>
                    )}

                    {/* Theme toggle */}
                    <button
                      onClick={handleToggleTheme}
                      className="hover:bg-muted w-full px-4 py-2 text-left text-sm"
                    >
                      Toggle Theme
                    </button>

                    {/* Divider */}
                    <div className="my-1 border-t" />

                    {/* Logout */}
                    <button
                      onClick={async () => {
                        await fetch("/api/auth/logout", {
                          method: "POST",
                          credentials: "include",
                        });

                        window.location.href = "/login";
                      }}
                      className="hover:bg-muted w-full px-4 py-2 text-left text-sm text-red-500"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                type="button"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className={cx(s.btn, "sm:hidden")}
              >
                {mobileMenuOpen ? "Close" : "Menu"}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className={s.mobileMenuWrap}>
            <nav className={s.mobileMenu}>
              {navItems.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cx(
                      s.mobileNavItem,
                      active ? s.navItemActive : s.navItemInactive,
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}

              <div className="mt-2 border-t pt-2">
                {(user?.role === "owner" || user?.role === "admin") && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setInviteModalOpen(true);
                    }}
                    className="block w-full px-2 py-2 text-left"
                  >
                    Invite User
                  </button>
                )}

                <button
                  onClick={handleToggleTheme}
                  className="block w-full px-2 py-2 text-left"
                >
                  Toggle Theme
                </button>

                <button
                  onClick={handleLogout}
                  className="block w-full px-2 py-2 text-left text-red-500"
                >
                  Log out
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className={s.main}>
        <div className={s.mainInner}>
          {title ? <h1 className={s.h1}>{title}</h1> : null}
          {children}
        </div>
      </main>
      <InviteUserModal open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} />
    </div>
  );
}

const s = {
  app: "min-h-screen bg-app text-main",

  header: "sticky top-0 z-20 border-b border-base bg-surface",
  headerInner: "mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3",

  left: "flex min-w-0 items-center gap-3 sm:gap-6",
  brand: "shrink-0 text-lg font-semibold tracking-tight",

  navDesktop: "hidden items-center gap-2 sm:flex",
  navItem: "rounded-md px-3 py-2 text-sm transition whitespace-nowrap",
  navItemActive: "bg-accent-soft",
  navItemInactive: "text-muted hover:bg-accent-soft",

  right: "flex shrink-0 items-center gap-2",
  rightSlot: "hidden items-center gap-2 md:flex",

  btn: "inline-flex items-center justify-center rounded-md border border-base bg-surface px-3 py-2 text-sm hover:bg-accent-soft",

  mobileMenuWrap: "border-t border-base px-4 pb-3 sm:hidden",
  mobileMenu: "mx-auto flex max-w-6xl flex-col gap-2 pt-3",
  mobileNavItem: "rounded-md px-3 py-2 text-sm transition",

  main: "mx-auto max-w-6xl px-4 py-6",
  mainInner: "space-y-6",

  h1: "text-2xl font-semibold",
};
