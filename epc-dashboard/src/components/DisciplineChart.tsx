import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from "recharts";
import type { DisciplineSnapshot, DisciplineKey } from "../types";
import { TooltipBox } from "./ChartTooltip";

const LEGEND_ITEMS: { label: string; color: string }[] = [
  { label: "Planned", color: "#d7dbe3" },
  { label: "On track", color: "var(--good)" },
  { label: "Watch", color: "var(--warning)" },
  { label: "Behind", color: "var(--critical)" },
];

export function DisciplineChartLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {LEGEND_ITEMS.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ink-secondary)]">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

interface Props {
  disciplines: DisciplineSnapshot[];
  selected: DisciplineKey | "all";
  onSelect: (key: DisciplineKey | "all") => void;
}

const COLOR_PLANNED = "#d7dbe3";

function statusColorFor(spi: number) {
  if (spi >= 0.97) return "var(--good)";
  if (spi >= 0.88) return "var(--warning)";
  return "var(--critical)";
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: DisciplineSnapshot }> }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <TooltipBox
      title={d.name}
      rows={[
        { label: "Planned", value: `${d.plannedPct.toFixed(1)}%`, color: COLOR_PLANNED },
        { label: "Actual", value: `${d.actualPct.toFixed(1)}%`, color: statusColorFor(d.spi) },
        { label: "Gap", value: `${d.gapPct >= 0 ? "-" : "+"}${Math.abs(d.gapPct).toFixed(1)} pts` },
        { label: "SPI", value: d.spi.toFixed(2) },
      ]}
    />
  );
}

interface ClickableBarDatum {
  payload?: DisciplineSnapshot;
}

export default function DisciplineChart({ disciplines, selected, onSelect }: Props) {
  const handleBarClick = (data: ClickableBarDatum) => {
    const key = data.payload?.key;
    if (key) onSelect(selected === key ? "all" : key);
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={disciplines} margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barGap={2} barCategoryGap="24%">
        <CartesianGrid stroke="#e1e0d9" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#52514e" }} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} interval={0} />
        <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11, fill: "#898781" }} axisLine={false} tickLine={false} width={44} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(11,11,11,0.03)" }} />
        <Bar
          dataKey="plannedPct"
          name="Planned"
          fill={COLOR_PLANNED}
          radius={[3, 3, 0, 0]}
          maxBarSize={34}
          onClick={handleBarClick}
          cursor="pointer"
          isAnimationActive={false}
        >
          {disciplines.map((d) => (
            <Cell key={d.key} fillOpacity={selected === "all" || selected === d.key ? 1 : 0.35} />
          ))}
        </Bar>
        <Bar
          dataKey="actualPct"
          name="Actual"
          fill="var(--good)"
          radius={[3, 3, 0, 0]}
          maxBarSize={34}
          onClick={handleBarClick}
          cursor="pointer"
          isAnimationActive={false}
        >
          <LabelList
            dataKey="actualPct"
            position="top"
            formatter={(label: React.ReactNode) => (typeof label === "number" ? `${label.toFixed(0)}%` : "")}
            style={{ fontSize: 10, fill: "var(--ink-secondary)", fontWeight: 600 }}
          />
          {disciplines.map((d) => (
            <Cell key={d.key} fill={statusColorFor(d.spi)} fillOpacity={selected === "all" || selected === d.key ? 1 : 0.35} stroke={selected === d.key ? "var(--navy-800)" : "none"} strokeWidth={selected === d.key ? 1.5 : 0} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
