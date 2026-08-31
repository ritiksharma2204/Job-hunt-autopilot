"use client";

import { FileText, Briefcase, TrendingUp, ListChecks } from "lucide-react";

type StatsBarProps = {
  resumeCount: number;
  activeResumeLabel: string | null;
  trackedCount: number;
  avgFitScore: number | null;
};

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-900/60 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate font-mono text-lg font-semibold text-fog-100">{value}</p>
        <p className="text-xs text-fog-300/70">{label}</p>
      </div>
    </div>
  );
}

export function StatsBar({ resumeCount, activeResumeLabel, trackedCount, avgFitScore }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        icon={<FileText size={18} />}
        label={activeResumeLabel ? "Active resume" : "No active resume"}
        value={activeResumeLabel ? activeResumeLabel.slice(0, 14) : String(resumeCount)}
      />
      <StatCard icon={<Briefcase size={18} />} label="Resumes uploaded" value={String(resumeCount)} />
      <StatCard icon={<ListChecks size={18} />} label="Jobs tracked" value={String(trackedCount)} />
      <StatCard
        icon={<TrendingUp size={18} />}
        label="Avg fit score (this session)"
        value={avgFitScore !== null ? `${Math.round(avgFitScore)}` : "-"}
      />
    </div>
  );
}