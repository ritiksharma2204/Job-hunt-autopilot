const STATUS_STYLES: Record<string, string> = {
  saved: "bg-ink-700 text-fog-300 border-ink-700",
  applied: "bg-signal-slate/15 text-signal-slate border-signal-slate/40",
  interviewing: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  offer: "bg-signal-teal/15 text-signal-teal border-signal-teal/40",
  rejected: "bg-signal-coral/15 text-signal-coral border-signal-coral/40",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.saved;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${style}`}>
      {status}
    </span>
  );
}

export const STATUS_OPTIONS = ["saved", "applied", "interviewing", "offer", "rejected"];