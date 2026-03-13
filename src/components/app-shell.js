"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

import MainLogo from "@/assets/mainlogo.svg";
import { api } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/tasks", label: "Tasks" },
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function AppShell({ children, title, right }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await api("/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className={s.app}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <div className={s.left}>
            <Link href="/dashboard" className={s.brand}>
              <MainLogo className="text-main h-20 w-20" />
            </Link>

            <nav className={s.nav}>
              {NAV.map((item) => {
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

            <ThemeToggle />

            <button type="button" onClick={handleLogout} className={s.btn}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className={s.main}>
        <div className={s.mainInner}>
          {title ? <h1 className={s.h1}>{title}</h1> : null}
          {children}
        </div>
      </main>
    </div>
  );
}

const s = {
  app: "min-h-screen bg-app text-main",

  header: "sticky top-0 z-20 border-b border-base bg-surface",
  headerInner: "mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3",

  left: "flex items-center gap-6",
  brand: "text-lg font-semibold tracking-tight",

  nav: "flex items-center gap-2",
  navItem: "rounded-md px-3 py-2 text-sm transition",
  navItemActive: "bg-accent-soft",
  navItemInactive: "text-muted hover:bg-accent-soft",

  right: "flex items-center gap-2",
  rightSlot: "flex items-center gap-2",

  btn: "rounded-md border border-base bg-surface px-3 py-2 text-sm hover:bg-accent-soft",

  main: "mx-auto max-w-6xl px-4 py-6",
  mainInner: "space-y-6",

  h1: "text-2xl font-semibold",
};
