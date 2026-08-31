import type { DelayedActivity } from "../types";
import { disciplineDefinitions } from "../data/projectData";

interface Props {
  activities: DelayedActivity[];
}

function disciplineName(key: DelayedActivity["discipline"]) {
  return disciplineDefinitions.find((d) => d.key === key)?.name ?? key;
}

function disciplineColor(key: DelayedActivity["discipline"]) {
  return disciplineDefinitions.find((d) => d.key === key)?.color ?? "var(--ink-muted)";
}

export default function DelayedActivitiesTable({ activities }: Props) {
  const maxDelay = Math.max(...activities.map((a) => a.delayDays), 1);

  if (activities.length === 0) {
    return <p className="py-6 text-center text-sm text-[var(--ink-muted)]">No delayed activities for this selection.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            <th className="py-2 pr-3">Activity</th>
            <th className="py-2 pr-3">Discipline</th>
            <th className="py-2 pr-3 text-right">Planned</th>
            <th className="py-2 pr-3 text-right">Actual</th>
            <th className="py-2 pr-3">Delay</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((a) => (
            <tr key={a.id} className="border-b border-[var(--border)] last:border-0">
              <td className="py-2.5 pr-3">
                <p className="font-medium text-[var(--ink)]">{a.name}</p>
                <p className="text-xs text-[var(--ink-muted)]">{a.id} · {a.responsible}</p>
              </td>
              <td className="py-2.5 pr-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ink-secondary)]">
                  <span className="h-2 w-2 rounded-full" style={{ background: disciplineColor(a.discipline) }} />
                  {disciplineName(a.discipline)}
                </span>
              </td>
              <td className="py-2.5 pr-3 text-right tabular-nums text-[var(--ink-secondary)]">{a.plannedPct.toFixed(0)}%</td>
              <td className="py-2.5 pr-3 text-right tabular-nums font-semibold text-[var(--ink)]">{a.actualPct.toFixed(0)}%</td>
              <td className="py-2.5 pr-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--critical-bg)]">
                    <div className="h-full rounded-full bg-[var(--critical)]" style={{ width: `${(a.delayDays / maxDelay) * 100}%` }} />
                  </div>
                  <span className="whitespace-nowrap text-xs font-semibold text-[var(--critical)]">{a.delayDays}d</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
