// Small progress bar used on course cards, group headers and earned cells.
// Plain component (no "use client") so Server Components can render it too.

export function ProgressBar({
  fraction,
  color,
  className,
}: {
  /** 0–1; clamped. */
  fraction: number;
  /** CSS color for the fill; defaults to the theme primary. */
  color?: string;
  className?: string;
}) {
  const percent = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <span
      className={`bg-muted inline-block h-1.5 overflow-hidden rounded-full align-middle ${className ?? ""}`}
    >
      <span
        className="block h-full rounded-full transition-[width] duration-300"
        style={{ width: `${percent}%`, backgroundColor: color ?? "var(--primary)" }}
      />
    </span>
  );
}
