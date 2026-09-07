"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function AppShell({
  children,
  database,
  ebay,
}: {
  children: React.ReactNode;
  database: boolean;
  ebay: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-5 pb-16 pt-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="font-display text-xs tracking-[0.28em] text-wax uppercase">Sports card desk</p>
          <h1 className="font-display text-3xl text-ink">Wax Melter</h1>
        </div>
        <nav className="flex items-center gap-2">
          <NavLink href="/alerts" active={pathname.startsWith("/alerts")}>
            Alerts
          </NavLink>
          <NavLink href="/watches" active={pathname.startsWith("/watches")}>
            Watches
          </NavLink>
          <button
            type="button"
            onClick={logout}
            className="rounded-full border border-line px-3 py-1.5 text-sm text-mute hover:text-ink"
          >
            Lock
          </button>
        </nav>
      </header>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-mute">
        <StatusDot ok={database} label={database ? "Supabase" : "Mock data"} />
        <StatusDot ok={ebay} label={ebay ? "eBay connected" : "eBay pending"} />
        <span>Hourly scan · comps from 130point</span>
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm ${
        active ? "bg-wax text-bg" : "border border-line text-mute hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5">
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-gain" : "bg-warn"}`} />
      {label}
    </span>
  );
}
