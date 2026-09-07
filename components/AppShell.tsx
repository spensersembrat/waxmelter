"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<{ database: boolean; ebay: boolean } | null>(null);

  useEffect(() => {
    void fetch("/api/status")
      .then((response) => response.json())
      .then((json: { database: boolean; ebay: boolean }) => setStatus(json))
      .catch(() => setStatus({ database: false, ebay: false }));
  }, []);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-5 pb-16 pt-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <h1 className="font-display text-3xl text-ink">Wax Melter</h1>
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
            Log out
          </button>
        </nav>
      </header>
      <div className="mt-3 flex min-h-6 flex-wrap gap-2 text-xs text-mute">
        {status ? (
          <>
            <StatusDot ok={status.database} label={status.database ? "Database" : "Mock data"} />
            <StatusDot ok={status.ebay} label={status.ebay ? "eBay connected" : "eBay pending"} />
          </>
        ) : null}
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
