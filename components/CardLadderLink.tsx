"use client";

export function CardLadderLink({
  href,
  compact = false,
}: {
  href: string;
  compact?: boolean;
}) {
  if (!href || href === "sample") return null;

  if (compact) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="text-mute">
        Card Ladder
      </a>
    );
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-wax">
      Open on Card Ladder
    </a>
  );
}
