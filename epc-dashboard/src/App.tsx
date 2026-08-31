import { useMemo, useState } from "react";
import Header from "./components/Header";
import FiltersBar from "./components/FiltersBar";
import KpiCards from "./components/KpiCards";
import ChartCard from "./components/ChartCard";
import SCurveChart from "./components/SCurveChart";
import DisciplineChart, { DisciplineChartLegend } from "./components/DisciplineChart";
import WeeklyTrendChart from "./components/WeeklyTrendChart";
import DelayedActivitiesTable from "./components/DelayedActivitiesTable";
import ExecutiveInsights from "./components/ExecutiveInsights";
import type { DashboardFilters } from "./types";
import {
  buildAllDisciplineSnapshots,
  buildDelayedActivities,
  buildOverallSnapshot,
  buildWeeklySeries,
  buildWeeklyTrend,
  defaultFilters,
  generateInsights,
} from "./utils/calculations";
import { disciplineDefinitions } from "./data/projectData";

export default function App() {
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);

  const overall = useMemo(() => buildOverallSnapshot(filters.asOfWeek), [filters.asOfWeek]);
  const disciplines = useMemo(() => buildAllDisciplineSnapshots(filters.asOfWeek), [filters.asOfWeek]);
  const selectedDiscipline = useMemo(
    () => (filters.discipline === "all" ? null : disciplines.find((d) => d.key === filters.discipline) ?? null),
    [disciplines, filters.discipline],
  );
  const selectedDisciplineDef = useMemo(
    () => (filters.discipline === "all" ? undefined : disciplineDefinitions.find((d) => d.key === filters.discipline)),
    [filters.discipline],
  );
  const series = useMemo(
    () => buildWeeklySeries(filters.asOfWeek, selectedDisciplineDef),
    [filters.asOfWeek, selectedDisciplineDef],
  );
  const weeklyTrend = useMemo(() => buildWeeklyTrend(filters.asOfWeek), [filters.asOfWeek]);
  const activities = useMemo(() => buildDelayedActivities(filters.discipline), [filters.discipline]);
  const insights = useMemo(() => generateInsights(filters), [filters]);

  return (
    <div className="min-h-screen bg-[var(--page)]">
      <Header />
      <main className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
        <FiltersBar filters={filters} onChange={setFilters} />

        <KpiCards overall={overall} discipline={selectedDiscipline} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard
            title="S-Curve — Planned vs Actual vs Forecast"
            subtitle={selectedDiscipline ? `${selectedDiscipline.name} cumulative progress` : "Project cumulative physical progress"}
            className="lg:col-span-2"
          >
            <SCurveChart series={series} asOfWeek={filters.asOfWeek} />
          </ChartCard>

          <ExecutiveInsights insights={insights} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Discipline Progress" subtitle="Click a bar to filter the dashboard by discipline" right={<DisciplineChartLegend />}>
            <DisciplineChart
              disciplines={disciplines}
              selected={filters.discipline}
              onSelect={(key) => setFilters((f) => ({ ...f, discipline: key }))}
            />
          </ChartCard>

          <ChartCard title="Weekly Progress Trend" subtitle={`Last ${weeklyTrend.length} weeks of planned vs actual gain`}>
            <WeeklyTrendChart data={weeklyTrend} />
          </ChartCard>
        </div>

        <ChartCard
          title="Top 5 Delayed Activities"
          subtitle={selectedDiscipline ? `Filtered to ${selectedDiscipline.name}` : "Across all disciplines, ranked by delay"}
        >
          <DelayedActivitiesTable activities={activities} />
        </ChartCard>

        <footer className="py-2 text-center text-xs text-[var(--ink-muted)]">
          ASKARA EPC PROJECT · Project Control Dashboard — figures are illustrative dummy data for demonstration purposes.
        </footer>
      </main>
    </div>
  );
}
