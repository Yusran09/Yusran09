import type { DisciplineSnapshot, OverallSnapshot } from "../types";
import { formatDate } from "../utils/calculations";

interface Props {
  overall: OverallSnapshot;
  discipline: DisciplineSnapshot | null;
}

function statusColor(value: number, goodAt = 1, warnAt = 0.9) {
  if (value >= goodAt) return { fg: "var(--good)", bg: "var(--good-bg)" };
  if (value >= warnAt) return { fg: "#b8790f", bg: "var(--warning-bg)" };
  return { fg: "var(--critical)", bg: "var(--critical-bg)" };
}

function CardShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm ${className}`}>{children}</div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">{children}</p>;
}

function ProgressRing({ pct, color }: { pct: number; color: string }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const offset = c - (clamp01(pct / 100) * c);
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 26 26)"
      />
    </svg>
  );
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

export default function KpiCards({ overall, discipline }: Props) {
  const data = discipline
    ? { plannedPct: discipline.plannedPct, actualPct: discipline.actualPct, spi: discipline.spi, gapPct: discipline.gapPct }
    : { plannedPct: overall.plannedPct, actualPct: overall.actualPct, spi: overall.spi, gapPct: overall.gapPct };
  const cpi = discipline ? discipline.earnedValue / discipline.actualCost : overall.cpi;
  const forecastDate = discipline ? discipline.forecastFinishDate : overall.forecastFinishDate;
  const slipDays = discipline ? discipline.baselineSlipDays : overall.slipDays;
  const scopeLabel = discipline ? discipline.name : "Overall";

  const spiColor = statusColor(data.spi);
  const cpiColor = statusColor(cpi);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <CardShell>
        <Label>Overall Progress</Label>
        <div className="mt-2 flex items-center gap-3">
          <ProgressRing pct={data.actualPct} color="var(--blue)" />
          <div>
            <p className="text-2xl font-bold tabular-nums leading-none text-[var(--ink)]">{data.actualPct.toFixed(1)}%</p>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">{scopeLabel} physical completion</p>
          </div>
        </div>
      </CardShell>

      <CardShell>
        <Label>Planned Progress</Label>
        <p className="mt-2 text-2xl font-bold tabular-nums leading-none text-[var(--ink)]">{data.plannedPct.toFixed(1)}%</p>
        <p className="mt-2 text-xs text-[var(--ink-muted)]">Baseline plan to date</p>
      </CardShell>

      <CardShell>
        <Label>Actual Progress</Label>
        <p className="mt-2 text-2xl font-bold tabular-nums leading-none text-[var(--ink)]">{data.actualPct.toFixed(1)}%</p>
        <p
          className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{ color: data.gapPct > 0.05 ? "var(--critical)" : "var(--good)", background: data.gapPct > 0.05 ? "var(--critical-bg)" : "var(--good-bg)" }}
        >
          {data.gapPct > 0.05 ? "▼" : "▲"} {Math.abs(data.gapPct).toFixed(1)}% vs plan
        </p>
      </CardShell>

      <CardShell>
        <Label>SPI</Label>
        <p className="mt-2 text-2xl font-bold tabular-nums leading-none" style={{ color: spiColor.fg }}>
          {data.spi.toFixed(2)}
        </p>
        <p className="mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold" style={{ color: spiColor.fg, background: spiColor.bg }}>
          {data.spi >= 1 ? "On / ahead of schedule" : "Behind schedule"}
        </p>
      </CardShell>

      <CardShell>
        <Label>CPI</Label>
        <p className="mt-2 text-2xl font-bold tabular-nums leading-none" style={{ color: cpiColor.fg }}>
          {cpi.toFixed(2)}
        </p>
        <p className="mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold" style={{ color: cpiColor.fg, background: cpiColor.bg }}>
          {cpi >= 1 ? "Under budget" : "Cost overrun"}
        </p>
      </CardShell>

      <CardShell>
        <Label>Forecast Finish</Label>
        <p className="mt-2 text-xl font-bold leading-none text-[var(--ink)]">{formatDate(forecastDate)}</p>
        <p
          className="mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{
            color: slipDays > 0 ? "var(--critical)" : "var(--good)",
            background: slipDays > 0 ? "var(--critical-bg)" : "var(--good-bg)",
          }}
        >
          {slipDays > 0 ? `+${slipDays} days vs baseline` : "On baseline"}
        </p>
      </CardShell>
    </div>
  );
}
