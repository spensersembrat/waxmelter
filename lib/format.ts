const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function money(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return USD.format(value);
}

export function pctBelow(liveTotal: number, median: number | null): number | null {
  if (median == null || median <= 0) return null;
  return ((median - liveTotal) / median) * 100;
}

export function timeLeft(endsAt: string | null): string {
  if (!endsAt) return "BIN";
  const end = new Date(endsAt).getTime();
  const diff = end - Date.now();
  if (diff <= 0) return "Ended";
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (hours >= 48) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours >= 1) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "Not yet";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "Not yet";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function nextHourlyScanAt(from = Date.now()): number {
  const hourMs = 3_600_000;
  return Math.floor(from / hourMs) * hourMs + hourMs;
}

export function scanCountdown(from = Date.now()): string {
  const remaining = Math.max(0, nextHourlyScanAt(from) - from);
  const totalSec = Math.floor(remaining / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes >= 1) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}
