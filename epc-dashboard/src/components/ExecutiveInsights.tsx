interface Props {
  insights: string[];
}

export default function ExecutiveInsights({ insights }: Props) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--navy-800)] p-4 text-white shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#5dade2]">
          <path d="M9.663 17h4.673M12 3a6 6 0 0 0-4 10.472V15a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-1.528A6 6 0 0 0 12 3z" />
        </svg>
        <h2 className="text-sm font-bold">Executive Insight</h2>
      </div>
      <ul className="flex flex-col gap-2.5">
        {insights.map((insight, i) => (
          <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-[#dce4ef]">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-[#8fc0e8]">
              {i + 1}
            </span>
            <span>{insight}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
