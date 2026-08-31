import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeeklySeriesPoint } from "../types";
import { chartHorizonWeek } from "../utils/calculations";
import { formatDate, weekToDate } from "../utils/dateUtils";
import { projectMeta } from "../data/projectData";
import { TooltipBox } from "./ChartTooltip";

interface Props {
  series: WeeklySeriesPoint[];
  asOfWeek: number;
}

const COLOR_PLANNED = "#898781";
const COLOR_ACTUAL = "var(--blue)";
const COLOR_FORECAST = "#eb6834";

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: WeeklySeriesPoint }> }) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;
  const rows = [
    { label: "Planned", value: `${point.plannedCum?.toFixed(1) ?? "—"}%`, color: COLOR_PLANNED },
    ...(point.actualCum !== null ? [{ label: "Actual", value: `${point.actualCum.toFixed(1)}%`, color: COLOR_ACTUAL }] : []),
    ...(point.forecastCum !== null ? [{ label: "Forecast", value: `${point.forecastCum.toFixed(1)}%`, color: COLOR_FORECAST }] : []),
  ];
  return <TooltipBox title={formatDate(point.date)} rows={rows} />;
}

export default function SCurveChart({ series, asOfWeek }: Props) {
  const ticks = useMemo(() => {
    const step = 12;
    const result: number[] = [];
    for (let w = 0; w <= chartHorizonWeek; w += step) result.push(w);
    return result;
  }, []);

  const dataDateLabel = formatDate(weekToDate(projectMeta.startDate, asOfWeek));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={series} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#e1e0d9" vertical={false} />
        <XAxis
          dataKey="weekIndex"
          type="number"
          domain={[0, chartHorizonWeek]}
          ticks={ticks}
          tickFormatter={(w: number) => formatDate(weekToDate(projectMeta.startDate, w)).replace(/ \d{4}$/, "")}
          tick={{ fontSize: 11, fill: "#898781" }}
          axisLine={{ stroke: "#c3c2b7" }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fontSize: 11, fill: "#898781" }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="top"
          align="right"
          height={28}
          iconType="plainline"
          wrapperStyle={{ fontSize: 12, color: "var(--ink-secondary)" }}
        />
        <ReferenceLine x={asOfWeek} stroke="#c3c2b7" strokeDasharray="3 3" label={{ value: `As of ${dataDateLabel}`, position: "insideTopLeft", fontSize: 10, fill: "#898781" }} />
        <Line type="monotone" dataKey="plannedCum" name="Planned" stroke={COLOR_PLANNED} strokeWidth={2} dot={false} strokeDasharray="4 3" isAnimationActive={false} />
        <Line type="monotone" dataKey="actualCum" name="Actual" stroke={COLOR_ACTUAL} strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />
        <Line type="monotone" dataKey="forecastCum" name="Forecast" stroke={COLOR_FORECAST} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
