import type { DashboardFilters, DisciplineKey } from "../types";
import { asOfWeekOptions, dataWeek, defaultFilters } from "../utils/calculations";
import { disciplineDefinitions } from "../data/projectData";

interface Props {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
}

export default function FiltersBar({ filters, onChange }: Props) {
  const isDefault = filters.asOfWeek === defaultFilters.asOfWeek && filters.discipline === "all";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-4 py-3 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Filters</span>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-[var(--ink-secondary)]">Reporting date</span>
        <select
          className="rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-sm font-medium text-[var(--ink)] shadow-sm focus:border-[var(--blue)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]/20"
          value={filters.asOfWeek}
          onChange={(e) => onChange({ ...filters, asOfWeek: Number(e.target.value) })}
        >
          {asOfWeekOptions.map((opt) => (
            <option key={opt.weekIndex} value={opt.weekIndex}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-[var(--ink-secondary)]">Discipline</span>
        <select
          className="rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-sm font-medium text-[var(--ink)] shadow-sm focus:border-[var(--blue)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]/20"
          value={filters.discipline}
          onChange={(e) => onChange({ ...filters, discipline: e.target.value as DisciplineKey | "all" })}
        >
          <option value="all">All Disciplines</option>
          {disciplineDefinitions.map((d) => (
            <option key={d.key} value={d.key}>
              {d.name}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        disabled={isDefault}
        onClick={() => onChange(defaultFilters)}
        className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--ink-secondary)] transition hover:border-[var(--blue)] hover:text-[var(--blue)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--ink-secondary)]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
        </svg>
        Reset Filters
      </button>

      <span className="basis-full text-[11px] text-[var(--ink-muted)] sm:basis-auto">
        Showing data through week {filters.asOfWeek} of {dataWeek}
        {filters.discipline !== "all" ? ` · ${disciplineDefinitions.find((d) => d.key === filters.discipline)?.name}` : ""}
      </span>
    </div>
  );
}
