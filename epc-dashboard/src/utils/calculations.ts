import { delayedActivityCandidates, disciplineDefinitions, projectMeta } from "../data/projectData";
import type {
  DashboardFilters,
  DelayedActivity,
  DisciplineDefinition,
  DisciplineKey,
  DisciplineSnapshot,
  OverallSnapshot,
  WeeklySeriesPoint,
  WeeklyTrendPoint,
} from "../types";
import { addDays, daysBetween, formatDate, weekToDate } from "./dateUtils";

/** A day-per-percent-of-schedule-gap factor used to convert a progress gap
 * into a calendar delay, applied uniformly so every delay figure in the
 * dashboard is derived the same way. */
const DELAY_DAYS_PER_PCT_GAP = 3.4;
/** How strongly a discipline's schedule gap translates into cost overrun
 * (rework, expediting, overtime) — applied uniformly across disciplines. */
const COST_OVERRUN_PER_PCT_GAP = 0.009;

export const dataWeek = Math.floor(daysBetween(projectMeta.startDate, projectMeta.dataDate) / 7);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Baseline planned % complete for a discipline at an arbitrary week — a
 * straight ramp from 0% at mobilization to 100% at its planned finish,
 * calibrated so it equals `plannedPctAtData` exactly at the data date. */
export function plannedEndWeek(d: DisciplineDefinition): number {
  return d.startWeek + ((dataWeek - d.startWeek) * 100) / d.plannedPctAtData;
}

export function disciplinePlannedPct(d: DisciplineDefinition, week: number): number {
  const endWeek = plannedEndWeek(d);
  if (week <= d.startWeek) return 0;
  return clamp(((week - d.startWeek) / (endWeek - d.startWeek)) * 100, 0, 100);
}

/** Actual % complete for a discipline at an arbitrary week — a straight
 * ramp from 0% at mobilization to `actualPctAtData` at the data date, so
 * gaps against plan naturally widen over time as delays compound. */
export function disciplineActualPct(d: DisciplineDefinition, week: number): number {
  const evalWeek = Math.min(week, dataWeek);
  if (evalWeek <= d.startWeek) return 0;
  return clamp(((evalWeek - d.startWeek) / (dataWeek - d.startWeek)) * d.actualPctAtData, 0, 100);
}

export function disciplineSpi(d: DisciplineDefinition, asOfWeek: number): number {
  const planned = disciplinePlannedPct(d, asOfWeek);
  const actual = disciplineActualPct(d, asOfWeek);
  if (planned <= 0) return 1;
  return actual / planned;
}

export function disciplineCostIndex(d: DisciplineDefinition): number {
  const gap = Math.max(0, d.plannedPctAtData - d.actualPctAtData);
  return 1 + gap * COST_OVERRUN_PER_PCT_GAP;
}

function disciplineForecastFinishWeek(d: DisciplineDefinition, asOfWeek: number): number {
  const spi = disciplineSpi(d, asOfWeek);
  const endWeek = plannedEndWeek(d);
  const actual = disciplineActualPct(d, asOfWeek);
  if (actual >= 100) return Math.min(asOfWeek, endWeek);
  const remainingPlanned = Math.max(0, endWeek - asOfWeek);
  return asOfWeek + remainingPlanned / Math.max(spi, 0.05);
}

/** Forecast % complete for a discipline at a future week, continuing on
 * from its actual progress at `asOfWeek` toward 100% at its (SPI-derived)
 * forecast finish. */
export function disciplineForecastPct(d: DisciplineDefinition, week: number, asOfWeek: number): number {
  const finishWeek = disciplineForecastFinishWeek(d, asOfWeek);
  const startPct = disciplineActualPct(d, asOfWeek);
  if (week <= asOfWeek) return startPct;
  if (finishWeek <= asOfWeek) return 100;
  return clamp(startPct + ((week - asOfWeek) / (finishWeek - asOfWeek)) * (100 - startPct), 0, 100);
}

export function buildDisciplineSnapshot(d: DisciplineDefinition, asOfWeek: number): DisciplineSnapshot {
  const plannedPct = disciplinePlannedPct(d, asOfWeek);
  const actualPct = disciplineActualPct(d, asOfWeek);
  const spi = disciplineSpi(d, asOfWeek);
  const costIndex = disciplineCostIndex(d);
  const earnedValue = (actualPct / 100) * (d.weight / 100) * projectMeta.bac;
  const actualCost = earnedValue * costIndex;
  const endWeek = plannedEndWeek(d);
  const forecastFinishWeek = disciplineForecastFinishWeek(d, asOfWeek);
  const forecastFinishDate = weekToDate(projectMeta.startDate, forecastFinishWeek);
  const baselineFinishDate = weekToDate(projectMeta.startDate, endWeek);

  return {
    ...d,
    plannedPct,
    actualPct,
    gapPct: plannedPct - actualPct,
    spi,
    costIndex,
    earnedValue,
    actualCost,
    plannedEndWeek: endWeek,
    forecastFinishWeek,
    forecastFinishDate,
    baselineSlipDays: daysBetween(baselineFinishDate, forecastFinishDate),
  };
}

export function buildAllDisciplineSnapshots(asOfWeek: number): DisciplineSnapshot[] {
  return disciplineDefinitions.map((d) => buildDisciplineSnapshot(d, asOfWeek));
}

/** Fixed baseline horizon — the latest planned finish across all
 * disciplines — computed once so chart axes stay stable as filters change. */
export const baselineFinishWeek = Math.max(...disciplineDefinitions.map((d) => plannedEndWeek(d)));
export const baselineFinishDate = weekToDate(projectMeta.startDate, baselineFinishWeek);

const currentForecastFinishWeek = Math.max(
  ...disciplineDefinitions.map((d) => disciplineForecastFinishWeek(d, dataWeek)),
);
export const chartHorizonWeek = Math.ceil(Math.max(baselineFinishWeek, currentForecastFinishWeek)) + 2;

export function overallPlannedPct(week: number): number {
  return disciplineDefinitions.reduce((sum, d) => sum + (d.weight / 100) * disciplinePlannedPct(d, week), 0);
}

export function overallActualPct(week: number): number {
  return disciplineDefinitions.reduce((sum, d) => sum + (d.weight / 100) * disciplineActualPct(d, week), 0);
}

function overallForecastPct(week: number, asOfWeek: number): number {
  return disciplineDefinitions.reduce(
    (sum, d) => sum + (d.weight / 100) * disciplineForecastPct(d, week, asOfWeek),
    0,
  );
}

export function buildOverallSnapshot(asOfWeek: number): OverallSnapshot {
  const disciplines = buildAllDisciplineSnapshots(asOfWeek);
  const pv = disciplines.reduce((sum, d) => sum + (d.plannedPct / 100) * (d.weight / 100) * projectMeta.bac, 0);
  const ev = disciplines.reduce((sum, d) => sum + d.earnedValue, 0);
  const ac = disciplines.reduce((sum, d) => sum + d.actualCost, 0);
  const plannedPct = overallPlannedPct(asOfWeek);
  const actualPct = overallActualPct(asOfWeek);
  const spi = pv > 0 ? ev / pv : 1;
  const cpi = ac > 0 ? ev / ac : 1;

  const remainingPlannedWeeks = Math.max(0, baselineFinishWeek - asOfWeek);
  const forecastFinishWeek = asOfWeek + remainingPlannedWeeks / Math.max(spi, 0.05);
  const forecastFinishDate = weekToDate(projectMeta.startDate, forecastFinishWeek);

  return {
    plannedPct,
    actualPct,
    spi,
    cpi,
    gapPct: plannedPct - actualPct,
    pv,
    ev,
    ac,
    baselineFinishDate,
    forecastFinishDate,
    slipDays: daysBetween(baselineFinishDate, forecastFinishDate),
  };
}

export function buildWeeklySeries(asOfWeek: number, discipline?: DisciplineDefinition): WeeklySeriesPoint[] {
  const planned = discipline ? (w: number) => disciplinePlannedPct(discipline, w) : overallPlannedPct;
  const actual = discipline ? (w: number) => disciplineActualPct(discipline, w) : overallActualPct;
  const forecast = discipline
    ? (w: number, asOf: number) => disciplineForecastPct(discipline, w, asOf)
    : overallForecastPct;

  const points: WeeklySeriesPoint[] = [];
  for (let week = 0; week <= chartHorizonWeek; week++) {
    points.push({
      weekIndex: week,
      date: weekToDate(projectMeta.startDate, week),
      plannedCum: Number(planned(week).toFixed(2)),
      actualCum: week <= asOfWeek ? Number(actual(week).toFixed(2)) : null,
      forecastCum: week >= asOfWeek ? Number(forecast(week, asOfWeek).toFixed(2)) : null,
    });
  }
  return points;
}

export function buildWeeklyTrend(asOfWeek: number, weeks = 12): WeeklyTrendPoint[] {
  const points: WeeklyTrendPoint[] = [];
  const firstWeek = Math.max(1, asOfWeek - weeks + 1);
  for (let week = firstWeek; week <= asOfWeek; week++) {
    const plannedDelta = overallPlannedPct(week) - overallPlannedPct(week - 1);
    const actualDelta = overallActualPct(week) - overallActualPct(week - 1);
    points.push({
      weekIndex: week,
      date: weekToDate(projectMeta.startDate, week),
      label: `Wk ${week}`,
      plannedDelta: Number(plannedDelta.toFixed(2)),
      actualDelta: Number(actualDelta.toFixed(2)),
    });
  }
  return points;
}

export function buildDelayedActivities(discipline?: DisciplineKey | "all"): DelayedActivity[] {
  const withDelay = delayedActivityCandidates.map((a) => ({
    ...a,
    delayDays: Math.round((a.plannedPct - a.actualPct) * DELAY_DAYS_PER_PCT_GAP),
  }));
  const filtered =
    !discipline || discipline === "all" ? withDelay : withDelay.filter((a) => a.discipline === discipline);
  return filtered.sort((a, b) => b.delayDays - a.delayDays).slice(0, 5);
}

export const asOfWeekOptions: { weekIndex: number; label: string }[] = [0, 4, 8, 12, 16].map((offset) => {
  const week = dataWeek - offset;
  const isCurrent = offset === 0;
  return {
    weekIndex: week,
    label: isCurrent ? `Current — ${formatDate(projectMeta.dataDate)}` : formatDate(weekToDate(projectMeta.startDate, week)),
  };
});

export const defaultFilters: DashboardFilters = {
  asOfWeek: dataWeek,
  discipline: "all",
};

export function generateInsights(filters: DashboardFilters): string[] {
  const overall = buildOverallSnapshot(filters.asOfWeek);
  const disciplines = buildAllDisciplineSnapshots(filters.asOfWeek);
  const sortedByGap = [...disciplines].sort((a, b) => b.gapPct - a.gapPct);
  const worst = sortedByGap[0];
  const secondWorst = sortedByGap[1];
  const best = sortedByGap[sortedByGap.length - 1];
  const activities = buildDelayedActivities(filters.discipline);
  const insights: string[] = [];

  if (filters.discipline !== "all") {
    const d = disciplines.find((x) => x.key === filters.discipline)!;
    insights.push(
      `${d.name} is ${d.actualPct.toFixed(1)}% complete against a planned ${d.plannedPct.toFixed(1)}%, a gap of ${d.gapPct.toFixed(1)} points and an SPI of ${d.spi.toFixed(2)}${d.spi < 1 ? ", indicating the discipline is behind schedule" : ", on or ahead of schedule"}.`,
    );
    if (d.baselineSlipDays > 0) {
      insights.push(
        `At the current rate, ${d.name} is forecast to finish on ${formatDate(d.forecastFinishDate)}, ${d.baselineSlipDays} days later than its baseline finish of ${formatDate(weekToDate(projectMeta.startDate, d.plannedEndWeek))}.`,
      );
    } else {
      insights.push(`${d.name} is forecast to finish on ${formatDate(d.forecastFinishDate)}, in line with or ahead of its baseline.`);
    }
  } else {
    insights.push(
      `Overall progress is ${Math.abs(overall.gapPct).toFixed(1)}% behind plan (${overall.actualPct.toFixed(1)}% actual vs ${overall.plannedPct.toFixed(1)}% planned), primarily driven by ${worst.name} and ${secondWorst.name}.`,
    );
    insights.push(
      `Schedule Performance Index is ${overall.spi.toFixed(2)}, meaning the project is progressing at roughly ${Math.round(overall.spi * 100)}% of the planned rate; Cost Performance Index of ${overall.cpi.toFixed(2)} reflects moderate cost inefficiency from rework and expediting in ${worst.name.toLowerCase()}.`,
    );
  }

  if (overall.slipDays > 0) {
    insights.push(
      `Forecast completion has slipped to ${formatDate(overall.forecastFinishDate)} — ${overall.slipDays} days beyond the baseline finish of ${formatDate(overall.baselineFinishDate)} — driven by sustained underperformance in ${worst.name} (SPI ${worst.spi.toFixed(2)}) and ${secondWorst.name} (SPI ${secondWorst.spi.toFixed(2)}).`,
    );
  }

  insights.push(
    `${best.name} is the best-performing discipline at ${best.spi.toFixed(2)} SPI, only ${best.gapPct.toFixed(1)} points behind plan, and can free up resources to support recovery elsewhere.`,
  );

  if (activities.length > 0) {
    const top = activities[0];
    insights.push(
      `The most critical delayed activity is "${top.name}" (${top.delayDays} days late) — recovery here would have the largest single impact on ${filters.discipline === "all" ? "overall" : "this discipline's"} schedule.`,
    );
  }

  return insights.slice(0, 5);
}

export { addDays, formatDate };
