import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WeeklyTrendPoint } from "../types";
import { formatDate } from "../utils/dateUtils";
import { TooltipBox } from "./ChartTooltip";

interface Props {
  data: WeeklyTrendPoint[];
}

const COLOR_PLANNED = "#898781";
const COLOR_ACTUAL = "var(--blue)";

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: WeeklyTrendPoint }> }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <TooltipBox
      title={formatDate(p.date)}
      rows={[
        { label: "Planned gain", value: `${p.plannedDelta.toFixed(2)}%`, color: COLOR_PLANNED },
        { label: "Actual gain", value: `${p.actualDelta.toFixed(2)}%`, color: COLOR_ACTUAL },
      ]}
    />
  );
}

export default function WeeklyTrendChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#e1e0d9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#898781" }} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} interval={1} />
        <YAxis
          domain={["dataMin - 0.15", "dataMax + 0.15"]}
          tickFormatter={(v: number) => `${v.toFixed(2)}%`}
          tick={{ fontSize: 11, fill: "#898781" }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend verticalAlign="top" align="right" height={28} iconType="plainline" wrapperStyle={{ fontSize: 12, color: "var(--ink-secondary)" }} />
        <Line type="monotone" dataKey="plannedDelta" name="Planned" stroke={COLOR_PLANNED} strokeWidth={2} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="actualDelta" name="Actual" stroke={COLOR_ACTUAL} strokeWidth={2.5} dot={{ r: 3, fill: COLOR_ACTUAL, strokeWidth: 0 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
