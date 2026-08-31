import type { DelayedActivity, DisciplineDefinition, ProjectMeta } from "../types";

/**
 * Baseline inputs for the ASKARA EPC PROJECT.
 *
 * Only these primitives are hand-set; every derived figure shown in the
 * dashboard (planned/actual %, SPI, CPI, forecast finish date, the S-curve,
 * weekly trend, and insight text) is computed from them in
 * `src/utils/calculations.ts` so the numbers stay internally consistent —
 * e.g. Piping's low actualPctAtData is what drives its low SPI, its later
 * forecast finish, and its appearance in the executive insights.
 */
export const projectMeta: ProjectMeta = {
  projectName: "ASKARA EPC PROJECT",
  status: "EXECUTION",
  startDate: new Date(2025, 0, 6), // 06 Jan 2025 — notice-to-proceed
  dataDate: new Date(2026, 7, 31), // reporting / data date
  bac: 250_000_000, // Budget At Completion (USD)
};

// Weights sum to 100. Piping/Mechanical carry the largest scope, typical
// of a process-plant EPC — which is also why underperformance there moves
// the whole project the most.
export const disciplineDefinitions: DisciplineDefinition[] = [
  {
    key: "civil",
    name: "Civil",
    weight: 15,
    startWeek: 0,
    plannedPctAtData: 96,
    actualPctAtData: 95,
    color: "var(--disc-civil)",
  },
  {
    key: "structural",
    name: "Structural",
    weight: 20,
    startWeek: 6,
    plannedPctAtData: 92,
    actualPctAtData: 89,
    color: "var(--disc-structural)",
  },
  {
    key: "mechanical",
    name: "Mechanical",
    weight: 20,
    startWeek: 16,
    plannedPctAtData: 82,
    actualPctAtData: 74,
    color: "var(--disc-mechanical)",
  },
  {
    key: "piping",
    name: "Piping",
    weight: 25,
    startWeek: 20,
    plannedPctAtData: 78,
    actualPctAtData: 68,
    color: "var(--disc-piping)",
  },
  {
    key: "electrical",
    name: "Electrical",
    weight: 12,
    startWeek: 34,
    plannedPctAtData: 80,
    actualPctAtData: 76,
    color: "var(--disc-electrical)",
  },
  {
    key: "instrumentation",
    name: "Instrumentation",
    weight: 8,
    startWeek: 48,
    plannedPctAtData: 68,
    actualPctAtData: 64,
    color: "var(--disc-instrumentation)",
  },
];

// Top delayed activities. delayDays is derived (see calculations.ts) from
// each activity's own planned/actual gap, using the same day-per-percent
// factor applied consistently across the project.
export const delayedActivityCandidates: Omit<DelayedActivity, "delayDays">[] = [
  {
    id: "PIP-004",
    name: "Piping Fabrication Package PF-004 (Unit 200)",
    discipline: "piping",
    plannedPct: 100,
    actualPct: 61,
    responsible: "PT. Askara Fabrication",
  },
  {
    id: "MEC-101",
    name: "Compressor K-101 Mechanical Installation",
    discipline: "mechanical",
    plannedPct: 95,
    actualPct: 66,
    responsible: "Rotating Equipment Team",
  },
  {
    id: "PIP-012",
    name: "Underground Piping Tie-in — Tank Farm",
    discipline: "piping",
    plannedPct: 88,
    actualPct: 58,
    responsible: "PT. Askara Fabrication",
  },
  {
    id: "MEC-205",
    name: "Heat Exchanger E-205 Setting & Alignment",
    discipline: "mechanical",
    plannedPct: 90,
    actualPct: 67,
    responsible: "Static Equipment Team",
  },
  {
    id: "STR-030",
    name: "Pipe Rack PR-03 Steel Erection",
    discipline: "structural",
    plannedPct: 100,
    actualPct: 82,
    responsible: "Steel Erection Contractor",
  },
  {
    id: "ELE-018",
    name: "Substation SS-02 Cable Termination",
    discipline: "electrical",
    plannedPct: 85,
    actualPct: 68,
    responsible: "Electrical Installation Team",
  },
  {
    id: "INS-007",
    name: "DCS Field Instrument Loop Checks — Unit 100",
    discipline: "instrumentation",
    plannedPct: 72,
    actualPct: 55,
    responsible: "Instrumentation & Controls Team",
  },
];
