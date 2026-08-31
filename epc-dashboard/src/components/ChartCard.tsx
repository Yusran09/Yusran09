import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function ChartCard({ title, subtitle, right, children, className = "" }: Props) {
  return (
    <div className={`flex flex-col rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[var(--ink)]">{title}</h2>
          {subtitle && <p className="text-xs text-[var(--ink-muted)]">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
