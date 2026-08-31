"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { apiGet, apiPost, apiPatch, apiDelete, apiUploadResume } from "@/lib/api";
import { FitGauge } from "@/components/FitGauge";
import { StatsBar } from "@/components/StatsBar";
import { KanbanBoard } from "@/components/KanbanBoard";
import {
  Search,
  Upload,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  LogOut,
  Loader2,
  Sparkles,
} from "lucide-react";

const COUNTRIES = [
  { code: "in", label: "India" },
  { code: "us", label: "United States" },
  { code: "gb", label: "United Kingdom" },
  { code: "ca", label: "Canada" },
  { code: "au", label: "Australia" },
  { code: "de", label: "Germany" },
];

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
};

type Application = {
  id: string;
  job_id: string;
  status: string;
  jobs: Job;
};

type MatchResult = {
  fit_score: number;
  skill_gaps: string[];
  reasoning: string;
};

type Resume = {
  id: string;
  label: string;
  created_at: string;
};

function SkeletonRow() {
  return (
    <div className="animate-pulse rounded-lg border border-ink-700 bg-ink-950/50 p-4">
      <div className="h-4 w-1/3 rounded bg-ink-700" />
      <div className="mt-2 h-3 w-1/4 rounded bg-ink-700/60" />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [loadingResumes, setLoadingResumes] = useState(true);

  const [what, setWhat] = useState("");
  const [where, setWhere] = useState("");
  const [country, setCountry] = useState("in");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [matches, setMatches] = useState<Record<string, MatchResult>>({});
  const [matchingJobId, setMatchingJobId] = useState<string | null>(null);

  const [applications, setApplications] = useState<Application[]>([]);
  const [trackedJobIds, setTrackedJobIds] = useState<Set<string>>(new Set());
  const [trackError, setTrackError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setUserEmail(data.session.user.email ?? null);
    });
    loadResumes();
    loadApplications();
  }, [router]);

  async function loadResumes() {
    setLoadingResumes(true);
    try {
      const [resumesRes, profileRes] = await Promise.all([
        apiGet("/profile/resumes"),
        apiGet("/profile"),
      ]);
      setResumes(resumesRes.resumes ?? []);
      setActiveResumeId(profileRes.active_resume_id ?? null);
    } catch {
      // Non-fatal - resume list just stays empty until it loads.
    } finally {
      setLoadingResumes(false);
    }
  }

  async function loadApplications() {
    try {
      const res = await apiGet("/applications");
      setApplications(res.applications ?? []);
      setTrackedJobIds(new Set((res.applications ?? []).map((a: Application) => a.job_id)));
    } catch {
      // Non-fatal - tracker section just stays empty until it works.
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingResume(true);
    setResumeError(null);
    try {
      await apiUploadResume(file);
      await loadResumes();
    } catch (err) {
      setResumeError(
        err instanceof Error ? err.message : "Upload failed. Make sure it's a PDF or DOCX."
      );
    } finally {
      setUploadingResume(false);
      e.target.value = "";
    }
  }

  async function handleActivateResume(resumeId: string) {
    setResumeError(null);
    try {
      await apiPatch(`/profile/resumes/${resumeId}/activate`, {});
      setActiveResumeId(resumeId);
    } catch (err) {
      setResumeError(err instanceof Error ? err.message : "Failed to activate resume.");
    }
  }

  async function handleDeleteResume(resumeId: string) {
    setResumeError(null);
    try {
      await apiDelete(`/profile/resumes/${resumeId}`);
      await loadResumes();
    } catch (err) {
      setResumeError(err instanceof Error ? err.message : "Failed to delete resume.");
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setSearchError(null);
    try {
      const res = await apiPost("/jobs/search", { what, where, country });
      setJobs(res.jobs ?? []);
    } catch {
      setSearchError("Search failed. Try again.");
    } finally {
      setSearching(false);
    }
  }

  async function handleGenerateMatch(jobId: string) {
    if (!activeResumeId) {
      setSearchError("Select or upload a resume first (see Resumes section above).");
      return;
    }
    setMatchingJobId(jobId);
    try {
      const result = await apiPost("/matches/generate", { job_id: jobId, resume_id: activeResumeId });
      setMatches((prev) => ({ ...prev, [jobId]: result }));
    } catch (err) {
      setMatches((prev) => ({
        ...prev,
        [jobId]: {
          fit_score: 0,
          skill_gaps: [],
          reasoning: err instanceof Error ? err.message : "Match failed.",
        },
      }));
    } finally {
      setMatchingJobId(null);
    }
  }

  async function handleTrack(jobId: string) {
    setTrackError(null);
    try {
      await apiPost("/applications", { job_id: jobId, status: "saved" });
      setTrackedJobIds((prev) => new Set(prev).add(jobId));
      await loadApplications();
    } catch (err) {
      setTrackError(
        err instanceof Error ? err.message : "Failed to track this job. Try again."
      );
    }
  }

  async function handleStatusChange(applicationId: string, status: string) {
    // Optimistic update so the Kanban board feels instant.
    setApplications((prev) =>
      prev.map((a) => (a.id === applicationId ? { ...a, status } : a))
    );
    try {
      await apiPatch(`/applications/${applicationId}`, { status });
    } catch {
      loadApplications(); // revert to server truth on failure
    }
  }

  const activeResume = resumes.find((r) => r.id === activeResumeId);
  const matchScores = Object.values(matches).map((m) => m.fit_score).filter((s) => s > 0);
  const avgFitScore = matchScores.length > 0 ? matchScores.reduce((a, b) => a + b, 0) / matchScores.length : null;

  return (
    <div className="min-h-screen px-4 pb-24 pt-8 sm:px-8">
      <header className="mx-auto mb-6 flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/10">
            <Sparkles size={16} className="text-amber-600" />
          </div>
          <span className="font-display text-lg font-semibold">Job-Hunt Autopilot</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden font-mono text-xs text-fog-300 sm:inline">{userEmail}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-1.5 text-xs font-medium text-fog-300 hover:border-signal-coral hover:text-signal-coral"
          >
            <LogOut size={13} />
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6">
        <StatsBar
          resumeCount={resumes.length}
          activeResumeLabel={activeResume?.label ?? null}
          trackedCount={applications.length}
          avgFitScore={avgFitScore}
        />

        {/* Resumes */}
        <section className="rounded-xl border border-ink-700 bg-ink-900/80 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-fog-300">
              Resumes
            </h2>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-500">
              {uploadingResume ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploadingResume ? "Analyzing..." : "Upload Resume"}
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={handleResumeUpload}
                disabled={uploadingResume}
                className="hidden"
              />
            </label>
          </div>

          {resumeError && <p className="mb-3 text-sm text-signal-coral">{resumeError}</p>}

          {loadingResumes ? (
            <div className="space-y-2">
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : resumes.length === 0 ? (
            <p className="text-sm text-fog-300/60">
              No resumes yet. Upload one to start matching against jobs.
            </p>
          ) : (
            <div className="space-y-2">
              {resumes.map((r) => {
                const isActive = r.id === activeResumeId;
                return (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between rounded-lg border p-3 shadow-sm transition ${
                      isActive ? "border-amber-500/50 bg-amber-500/5" : "border-ink-700 bg-ink-900 hover:border-brand-400/40 hover:shadow-md"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-fog-100">{r.label}</p>
                      <p className="text-xs text-fog-300/60">
                        Uploaded {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <span className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-600">
                          <CheckCircle2 size={12} />
                          Active
                        </span>
                      ) : (
                        <button
                          onClick={() => handleActivateResume(r.id)}
                          className="rounded-md border border-ink-700 px-3 py-1.5 text-xs font-medium text-fog-300 hover:border-amber-500/50 hover:text-amber-600"
                        >
                          Use for matching
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteResume(r.id)}
                        className="rounded-md border border-ink-700 p-1.5 text-fog-300 hover:border-signal-coral hover:text-signal-coral"
                        aria-label="Delete resume"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Job search */}
        <section className="rounded-xl border border-ink-700 bg-ink-900/80 p-5 shadow-sm">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-fog-300">
            Scout - Search Jobs
          </h2>
          <form onSubmit={handleSearch} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <input
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              placeholder="Role, e.g. backend developer"
              required
              className="rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-fog-100 outline-none placeholder:text-fog-300/40 focus:border-amber-500 sm:col-span-2"
            />
            <input
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              placeholder="City (optional)"
              className="rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-fog-100 outline-none placeholder:text-fog-300/40 focus:border-amber-500"
            />
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-fog-100 outline-none focus:border-amber-500"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={searching}
              className="flex items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 disabled:opacity-50 sm:col-span-4"
            >
              {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              {searching ? "Searching..." : "Search"}
            </button>
          </form>
          {searchError && <p className="mt-3 text-sm text-signal-coral">{searchError}</p>}
          {trackError && <p className="mt-3 text-sm text-signal-coral">{trackError}</p>}

          <div className="mt-5 space-y-3">
            {searching ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : (
              jobs.map((job) => {
                const match = matches[job.id];
                return (
                  <div
                    key={job.id}
                    className="flex flex-col gap-4 rounded-lg border border-ink-700 bg-ink-900 p-4 shadow-sm transition hover:shadow-md hover:border-brand-400/40 sm:flex-row sm:items-center"
                  >
                    {match && <FitGauge score={match.fit_score} />}
                    <div className="flex-1">
                      <p className="font-display text-sm font-semibold text-fog-100">{job.title}</p>
                      <p className="text-xs text-fog-300">
                        {job.company} - {job.location}
                      </p>
                      {match && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-fog-300">{match.reasoning}</p>
                          {match.skill_gaps.length > 0 && (
                            <p className="text-xs text-amber-600">
                              Gaps: {match.skill_gaps.join(", ")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleGenerateMatch(job.id)}
                          disabled={matchingJobId === job.id}
                          className="flex items-center gap-1.5 rounded-md border border-amber-500/40 px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-500/10 disabled:opacity-50"
                        >
                          {matchingJobId === job.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Sparkles size={13} />
                          )}
                          {matchingJobId === job.id ? "Scoring..." : "Score Fit"}
                        </button>
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-md border border-signal-slate/50 px-3 py-1.5 text-xs font-medium text-signal-slate hover:bg-signal-slate/10"
                        >
                          <ExternalLink size={13} />
                          Apply
                        </a>
                      </div>
                      <button
                        onClick={() => handleTrack(job.id)}
                        disabled={trackedJobIds.has(job.id)}
                        className="flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-1.5 text-xs font-medium text-fog-300 hover:border-signal-teal hover:text-signal-teal disabled:opacity-50"
                      >
                        {trackedJobIds.has(job.id) ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                        {trackedJobIds.has(job.id) ? "Tracked" : "Track"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Tracker - Kanban board */}
        <section className="rounded-xl border border-ink-700 bg-ink-900/80 p-5 shadow-sm">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-fog-300">
            Tracker - Your Pipeline
          </h2>
          {applications.length === 0 ? (
            <p className="text-sm text-fog-300/60">
              Nothing tracked yet - search for jobs above and hit &quot;Track&quot;.
            </p>
          ) : (
            <KanbanBoard applications={applications} onStatusChange={handleStatusChange} />
          )}
        </section>
      </main>
    </div>
  );
}