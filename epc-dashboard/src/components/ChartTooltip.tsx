interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

export function TooltipBox({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-[var(--ink)]">{title}</p>
      <div className="flex flex-col gap-0.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2 text-xs">
            {row.color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />}
            <span className="text-[var(--ink-secondary)]">{row.label}</span>
            <span className="ml-auto font-semibold tabular-nums text-[var(--ink)]">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
