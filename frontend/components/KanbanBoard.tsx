"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Building2, GripVertical } from "lucide-react";
import { STATUS_OPTIONS } from "./StatusBadge";

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
};

type Application = {
  id: string;
  job_id: string;
  status: string;
  jobs: Job;
};

const COLUMN_STYLES: Record<string, { border: string; header: string; dropActive: string }> = {
  saved: { border: "border-ink-700", header: "text-fog-300", dropActive: "border-fog-300 bg-ink-800/60" },
  applied: { border: "border-signal-slate/40", header: "text-signal-slate", dropActive: "border-signal-slate bg-signal-slate/10" },
  interviewing: { border: "border-amber-500/40", header: "text-amber-600", dropActive: "border-amber-500 bg-amber-500/10" },
  offer: { border: "border-signal-teal/40", header: "text-signal-teal", dropActive: "border-signal-teal bg-signal-teal/10" },
  rejected: { border: "border-signal-coral/40", header: "text-signal-coral", dropActive: "border-signal-coral bg-signal-coral/10" },
};

export function KanbanBoard({
  applications,
  onStatusChange,
}: {
  applications: Application[];
  onStatusChange: (applicationId: string, newStatus: string) => void;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  function handleDrop(status: string) {
    if (draggedId) {
      onStatusChange(draggedId, status);
    }
    setDraggedId(null);
    setDragOverColumn(null);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {STATUS_OPTIONS.map((status, colIndex) => {
        const columnApps = applications.filter((a) => a.status === status);
        const styles = COLUMN_STYLES[status] ?? COLUMN_STYLES.saved;
        const isDropTarget = dragOverColumn === status;

        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverColumn(status);
            }}
            onDragLeave={() => setDragOverColumn((prev) => (prev === status ? null : prev))}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(status);
            }}
            className={`rounded-xl border p-3 transition-colors ${
              isDropTarget ? styles.dropActive : `${styles.border} bg-ink-950/40`
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className={`text-xs font-semibold uppercase tracking-wide ${styles.header}`}>
                {status}
              </h3>
              <span className="rounded-full bg-ink-800 px-2 py-0.5 font-mono text-xs text-fog-300">
                {columnApps.length}
              </span>
            </div>

            <div className="space-y-2">
              {columnApps.length === 0 ? (
                <p className="rounded-lg border border-dashed border-ink-700 p-3 text-center text-xs text-fog-300/50">
                  {isDropTarget ? "Drop here" : "Empty"}
                </p>
              ) : (
                columnApps.map((app) => {
                  const prevStatus = colIndex > 0 ? STATUS_OPTIONS[colIndex - 1] : null;
                  const nextStatus =
                    colIndex < STATUS_OPTIONS.length - 1 ? STATUS_OPTIONS[colIndex + 1] : null;
                  const isDragging = draggedId === app.id;

                  return (
                    <div
                      key={app.id}
                      draggable
                      onDragStart={() => setDraggedId(app.id)}
                      onDragEnd={() => {
                        setDraggedId(null);
                        setDragOverColumn(null);
                      }}
                      className={`cursor-grab rounded-lg border border-ink-700 bg-ink-900 p-3 shadow-sm transition active:cursor-grabbing hover:border-brand-400/50 hover:shadow-md ${
                        isDragging ? "opacity-40" : "opacity-100"
                      }`}
                    >
                      <div className="flex items-start gap-1.5">
                        <GripVertical size={14} className="mt-0.5 shrink-0 text-fog-300/40" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-fog-100">{app.jobs?.title}</p>
                          <div className="mt-1 flex items-center gap-1 text-xs text-fog-300/70">
                            <Building2 size={12} />
                            <span className="truncate">{app.jobs?.company}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <button
                          onClick={() => prevStatus && onStatusChange(app.id, prevStatus)}
                          disabled={!prevStatus}
                          className="rounded border border-ink-700 p-1 text-fog-300 hover:border-fog-300 disabled:opacity-20"
                          aria-label="Move to previous stage"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          onClick={() => nextStatus && onStatusChange(app.id, nextStatus)}
                          disabled={!nextStatus}
                          className="rounded border border-ink-700 p-1 text-fog-300 hover:border-amber-500/50 hover:text-amber-600 disabled:opacity-20"
                          aria-label="Move to next stage"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}