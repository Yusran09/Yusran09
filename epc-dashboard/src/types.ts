export type DisciplineKey =
  | "civil"
  | "structural"
  | "mechanical"
  | "piping"
  | "electrical"
  | "instrumentation";

/** Static baseline inputs for one discipline's S-curve. Everything else
 * (planned %, actual %, SPI, cost index, forecast) is derived from these. */
export interface DisciplineDefinition {
  key: DisciplineKey;
  name: string;
  /** % weight of total project budget/value (all disciplines sum to 100) */
  weight: number;
  /** week index (from project start) discipline mobilizes */
  startWeek: number;
  /** baseline planned % complete at the data date */
  plannedPctAtData: number;
  /** actual % complete at the data date */
  actualPctAtData: number;
  color: string;
}

/** Fully derived discipline snapshot at a given "as of" week. */
export interface DisciplineSnapshot extends DisciplineDefinition {
  plannedPct: number;
  actualPct: number;
  gapPct: number;
  spi: number;
  costIndex: number;
  earnedValue: number;
  actualCost: number;
  plannedEndWeek: number;
  forecastFinishWeek: number;
  forecastFinishDate: Date;
  baselineSlipDays: number;
}

export interface WeeklySeriesPoint {
  weekIndex: number;
  date: Date;
  plannedCum: number | null;
  actualCum: number | null;
  forecastCum: number | null;
}

export interface WeeklyTrendPoint {
  weekIndex: number;
  date: Date;
  label: string;
  plannedDelta: number;
  actualDelta: number;
}

export interface DelayedActivity {
  id: string;
  name: string;
  discipline: DisciplineKey;
  plannedPct: number;
  actualPct: number;
  delayDays: number;
  /** who owns recovering this activity */
  responsible: string;
}

export interface ProjectMeta {
  projectName: string;
  status: string;
  startDate: Date;
  dataDate: Date;
  bac: number;
}

export interface DashboardFilters {
  asOfWeek: number;
  discipline: DisciplineKey | "all";
}

export interface OverallSnapshot {
  plannedPct: number;
  actualPct: number;
  spi: number;
  cpi: number;
  gapPct: number;
  pv: number;
  ev: number;
  ac: number;
  baselineFinishDate: Date;
  forecastFinishDate: Date;
  slipDays: number;
}
