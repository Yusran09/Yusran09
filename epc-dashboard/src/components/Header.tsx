import { formatDate } from "../utils/calculations";
import { projectMeta } from "../data/projectData";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--navy-800)] text-sm font-bold tracking-tight text-white">
            EPC
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[15px] font-bold tracking-tight text-[var(--ink)] sm:text-[17px]">
                {projectMeta.projectName}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--good-bg)] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-[var(--good)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--good)]" />
                {projectMeta.status}
              </span>
            </div>
            <p className="text-xs text-[var(--ink-muted)]">Project Control Dashboard · PMIS</p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden text-right sm:block">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--ink-muted)]">Reporting Date</p>
            <p className="text-sm font-semibold tabular-nums text-[var(--ink)]">{formatDate(projectMeta.dataDate)}</p>
          </div>
          <div className="h-8 w-px bg-[var(--border)] hidden sm:block" />
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--blue)] text-xs font-semibold text-white">
              PC
            </div>
            <div className="hidden leading-tight md:block">
              <p className="text-sm font-semibold text-[var(--ink)]">Project Controls</p>
              <p className="text-xs text-[var(--ink-muted)]">Lead Engineer</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
