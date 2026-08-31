# ASKARA EPC PROJECT — Project Control Dashboard

A production-quality Project Control / PMIS dashboard for an EPC construction
project, built with React, TypeScript, Tailwind CSS, and Recharts.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## What's inside

- **S-Curve** — cumulative planned vs actual vs forecast progress
- **KPI cards** — Overall/Planned/Actual progress, SPI, CPI, forecast finish date
- **Discipline progress** — Civil, Structural, Mechanical, Piping, Electrical,
  Instrumentation, colored by schedule status; click a bar to filter
- **Weekly progress trend** — planned vs actual weekly gain
- **Top 5 delayed activities**
- **Executive Insight panel** — auto-generated from the current filtered data
- **Filters** — reporting date and discipline, with a reset button

All figures are derived from a small set of baseline inputs in
`src/data/projectData.ts` (project dates, per-discipline weight/schedule/cost
inputs). Every other number — planned/actual %, SPI, CPI, the S-curve, the
weekly trend, and the executive insights — is computed from those inputs in
`src/utils/calculations.ts`, so the dataset stays internally consistent as
filters change.
