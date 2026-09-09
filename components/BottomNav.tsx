"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

const tabs = [
  { href: "/alerts", label: "Alerts", icon: BellIcon },
  { href: "/watches", label: "Watches", icon: SearchIcon },
  { href: "/comps", label: "Ladder", icon: ChartIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const reduce = useReducedMotion();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <motion.nav
      initial={reduce ? false : { y: 36, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-[#10131a]/75 p-1.5 shadow-[0_18px_50px_rgba(240,180,90,0.12),0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className="relative flex min-w-[4.75rem] flex-col items-center gap-0.5 rounded-full px-4 py-2 text-[11px] font-medium tracking-wide"
            >
              {active ? (
                <motion.span
                  layoutId={reduce ? undefined : "nav-pill"}
                  className="absolute inset-0 rounded-full bg-wax"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              ) : null}
              <span className={`relative z-10 ${active ? "text-bg" : "text-mute"}`}>
                <Icon />
              </span>
              <span className={`relative z-10 ${active ? "text-bg" : "text-mute"}`}>{tab.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => void logout()}
          className="relative flex min-w-[4.25rem] flex-col items-center gap-0.5 rounded-full px-4 py-2 text-[11px] font-medium tracking-wide text-mute transition hover:text-ink"
        >
          <LogoutIcon />
          Out
        </button>
      </div>
    </motion.nav>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 9.5a5.5 5.5 0 1 1 11 0c0 4 1.5 5.5 1.5 5.5H5s1.5-1.5 1.5-5.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 18.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 19V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 19V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M19 19v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M10 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13 12h8m0 0-3-3m3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
