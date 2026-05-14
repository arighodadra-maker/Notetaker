"use client";

import { useEffect, useState, useRef } from "react";
import {
  Session,
  Subject,
  Unit,
  loadSessions,
  deleteSession,
  loadSubjects,
  createSubject,
  deleteSubject,
  createUnit,
  deleteUnit,
  updateSessionFolder,
  SUBJECT_COLOR_CYCLE,
} from "@/lib/sessions";
import { NoteFormat } from "@/lib/prompts";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/components/AuthProvider";

interface DashboardProps {
  onNewNote: () => void;
  onLoadSession: (session: Session) => void;
}

// ── Color helpers ─────────────────────────────────────────────────────────────

const DOT: Record<string, string> = {
  blue:   "bg-blue-500",
  purple: "bg-purple-500",
  green:  "bg-green-500",
  amber:  "bg-amber-500",
  pink:   "bg-pink-500",
  teal:   "bg-teal-500",
  rose:   "bg-rose-500",
  indigo: "bg-indigo-500",
};


const FORMAT_COLORS: Record<NoteFormat, string> = {
  bullet:        "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  cornell:       "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  flashcards:    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "study-guide": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  flowchart:     "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  mindmap:       "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  diagrams:      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
};

const FORMAT_LABEL: Record<NoteFormat, string> = {
  bullet:        "Bullet Points",
  cornell:       "Cornell Notes",
  flashcards:    "Flashcards",
  "study-guide": "Study Guide",
  flowchart:     "Flowchart",
  mindmap:       "Mind Map",
  diagrams:      "Flowchart + Mind Map",
};

function formatDate(d: Date): string {
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: days > 365 ? "numeric" : undefined });
}

// ── Move Modal ────────────────────────────────────────────────────────────────

interface MoveModalProps {
  session: Session;
  subjects: Subject[];
  onMove: (subjectId: string | null, unitId: string | null) => void;
  onClose: () => void;
}

function MoveModal({ session, subjects, onMove, onClose }: MoveModalProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(session.subjectId ?? null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(session.unitId ?? null);

  const handleSubjectClick = (id: string | null) => {
    setSelectedSubjectId(id);
    setSelectedUnitId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Move to folder</h2>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-3 max-h-72 overflow-y-auto">
          {/* No folder */}
          <button
            onClick={() => handleSubjectClick(null)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedSubjectId === null
                ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60"
            }`}
          >
            <svg className="h-3.5 w-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></svg>
            No folder
          </button>

          {subjects.map((subj) => (
            <div key={subj.id}>
              <button
                onClick={() => handleSubjectClick(subj.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mt-0.5 ${
                  selectedSubjectId === subj.id && selectedUnitId === null
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                }`}
              >
                <span className={`h-2 w-2 rounded-full shrink-0 ${DOT[subj.color] ?? "bg-gray-400"}`} />
                {subj.name}
              </button>
              {subj.units.map((unit) => (
                <button
                  key={unit.id}
                  onClick={() => { setSelectedSubjectId(subj.id); setSelectedUnitId(unit.id); }}
                  className={`w-full flex items-center gap-2.5 pl-8 pr-3 py-2 rounded-lg text-sm transition-colors mt-0.5 ${
                    selectedSubjectId === subj.id && selectedUnitId === unit.id
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                      : "text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  }`}
                >
                  <span className="h-1 w-1 rounded-full shrink-0 bg-gray-300 dark:bg-gray-600" />
                  {unit.name}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onMove(selectedSubjectId, selectedUnitId)}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          >
            Move
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard({ onNewNote, onLoadSession }: DashboardProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [movingSession, setMovingSession] = useState<Session | null>(null);

  // Sidebar selection
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  // New subject form
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const subjectInputRef = useRef<HTMLInputElement>(null);

  // New unit form (per subject)
  const [creatingUnitFor, setCreatingUnitFor] = useState<string | null>(null);
  const [newUnitName, setNewUnitName] = useState("");
  const unitInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    loadSessions(user.uid)
      .then(setSessions)
      .finally(() => setLoading(false));
    loadSubjects(user.uid)
      .then(setSubjects)
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (creatingSubject && subjectInputRef.current) subjectInputRef.current.focus();
  }, [creatingSubject]);

  useEffect(() => {
    if (creatingUnitFor && unitInputRef.current) unitInputRef.current.focus();
  }, [creatingUnitFor]);

  // ── Filtered sessions ────────────────────────────────────────────────────

  const filteredSessions = sessions.filter((s) => {
    if (selectedUnitId) return s.unitId === selectedUnitId && s.subjectId === selectedSubjectId;
    if (selectedSubjectId) return s.subjectId === selectedSubjectId;
    return true;
  });

  const countForSubject = (subjectId: string) =>
    sessions.filter((s) => s.subjectId === subjectId).length;

  const countForUnit = (subjectId: string, unitId: string) =>
    sessions.filter((s) => s.subjectId === subjectId && s.unitId === unitId).length;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) return;
    setDeletingId(id);
    await deleteSession(user.uid, id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setDeletingId(null);
  };

  const handleMove = async (subjectId: string | null, unitId: string | null) => {
    if (!user || !movingSession) return;
    await updateSessionFolder(user.uid, movingSession.id, subjectId, unitId);
    setSessions((prev) =>
      prev.map((s) =>
        s.id === movingSession.id
          ? { ...s, subjectId: subjectId ?? undefined, unitId: unitId ?? undefined }
          : s
      )
    );
    setMovingSession(null);
  };

  const handleCreateSubject = async () => {
    if (!user || !newSubjectName.trim()) return;
    const color = SUBJECT_COLOR_CYCLE[subjects.length % SUBJECT_COLOR_CYCLE.length];
    const id = await createSubject(user.uid, newSubjectName.trim(), color);
    const newSubj: Subject = {
      id,
      name: newSubjectName.trim(),
      color,
      units: [],
      createdAt: new Date(),
    };
    setSubjects((prev) => [...prev, newSubj]);
    setNewSubjectName("");
    setCreatingSubject(false);
    setExpandedSubjects((prev) => new Set([...prev, id]));
  };

  const handleDeleteSubject = async (e: React.MouseEvent, subjectId: string) => {
    e.stopPropagation();
    if (!user) return;
    await deleteSubject(user.uid, subjectId);
    setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
    // Unassign sessions
    setSessions((prev) =>
      prev.map((s) =>
        s.subjectId === subjectId ? { ...s, subjectId: undefined, unitId: undefined } : s
      )
    );
    if (selectedSubjectId === subjectId) {
      setSelectedSubjectId(null);
      setSelectedUnitId(null);
    }
  };

  const handleCreateUnit = async (subjectId: string) => {
    if (!user || !newUnitName.trim()) return;
    const id = await createUnit(user.uid, subjectId, newUnitName.trim());
    const newUnit: Unit = { id, name: newUnitName.trim(), createdAt: new Date() };
    setSubjects((prev) =>
      prev.map((s) => (s.id === subjectId ? { ...s, units: [...s.units, newUnit] } : s))
    );
    setNewUnitName("");
    setCreatingUnitFor(null);
  };

  const handleDeleteUnit = async (e: React.MouseEvent, subjectId: string, unitId: string) => {
    e.stopPropagation();
    if (!user) return;
    await deleteUnit(user.uid, subjectId, unitId);
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId ? { ...s, units: s.units.filter((u) => u.id !== unitId) } : s
      )
    );
    setSessions((prev) =>
      prev.map((s) => (s.unitId === unitId ? { ...s, unitId: undefined } : s))
    );
    if (selectedUnitId === unitId) setSelectedUnitId(null);
  };

  const toggleExpand = (subjectId: string) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });
  };

  // ── Breadcrumb label ──────────────────────────────────────────────────────

  const breadcrumb = (() => {
    if (!selectedSubjectId) return null;
    const subj = subjects.find((s) => s.id === selectedSubjectId);
    if (!subj) return null;
    if (selectedUnitId) {
      const unit = subj.units.find((u) => u.id === selectedUnitId);
      return `${subj.name}${unit ? ` › ${unit.name}` : ""}`;
    }
    return subj.name;
  })();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-200 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between shrink-0">
        <span className="text-sm tracking-tight" style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}>ClassCapsule</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">{user?.email}</span>
          <button onClick={signOut} className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            Sign out
          </button>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
          <button onClick={toggleTheme} className="p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Toggle theme">
            {theme === "light" ? (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 border-r border-gray-100 dark:border-gray-800 flex flex-col overflow-y-auto">
          <div className="px-3 pt-5 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 px-2 mb-1">Library</p>

            {/* All Notes */}
            <button
              onClick={() => { setSelectedSubjectId(null); setSelectedUnitId(null); }}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors ${
                !selectedSubjectId
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
                All Notes
              </span>
              {sessions.length > 0 && (
                <span className="text-[10px] text-gray-400 dark:text-gray-600">{sessions.length}</span>
              )}
            </button>
          </div>

          {/* Subjects */}
          <div className="px-3 flex-1">
            {subjects.length > 0 && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 px-2 mt-3 mb-1">Subjects</p>
            )}
            {subjects.map((subj) => {
              const expanded = expandedSubjects.has(subj.id);
              const count = countForSubject(subj.id);
              return (
                <div key={subj.id} className="mb-0.5">
                  {/* Subject row */}
                  <div className="group flex items-center">
                    <button
                      onClick={() => { toggleExpand(subj.id); setSelectedSubjectId(subj.id); setSelectedUnitId(null); }}
                      className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors min-w-0 ${
                        selectedSubjectId === subj.id && !selectedUnitId
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                      }`}
                    >
                      <svg className={`h-2.5 w-2.5 shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                      <span className={`h-2 w-2 rounded-full shrink-0 ${DOT[subj.color] ?? "bg-gray-400"}`} />
                      <span className="truncate">{subj.name}</span>
                      {count > 0 && (
                        <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-600 shrink-0">{count}</span>
                      )}
                    </button>
                    <button
                      onClick={(e) => handleDeleteSubject(e, subj.id)}
                      className="shrink-0 p-1 rounded text-gray-300 dark:text-gray-700 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      aria-label="Delete subject"
                    >
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Units */}
                  {expanded && (
                    <div className="ml-4 mt-0.5">
                      {subj.units.map((unit) => (
                        <div key={unit.id} className="group flex items-center">
                          <button
                            onClick={() => { setSelectedSubjectId(subj.id); setSelectedUnitId(unit.id); }}
                            className={`flex-1 flex items-center gap-2 pl-3 pr-2 py-1 rounded-md text-xs transition-colors min-w-0 ${
                              selectedUnitId === unit.id && selectedSubjectId === subj.id
                                ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                                : "text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                            }`}
                          >
                            <span className="h-1 w-1 rounded-full shrink-0 bg-gray-300 dark:bg-gray-600" />
                            <span className="truncate">{unit.name}</span>
                            {countForUnit(subj.id, unit.id) > 0 && (
                              <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-600 shrink-0">
                                {countForUnit(subj.id, unit.id)}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={(e) => handleDeleteUnit(e, subj.id, unit.id)}
                            className="shrink-0 p-1 rounded text-gray-300 dark:text-gray-700 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            aria-label="Delete unit"
                          >
                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}

                      {/* Add unit */}
                      {creatingUnitFor === subj.id ? (
                        <form
                          onSubmit={(e) => { e.preventDefault(); handleCreateUnit(subj.id); }}
                          className="flex items-center gap-1 pl-3 pr-1 py-1"
                        >
                          <input
                            ref={unitInputRef}
                            value={newUnitName}
                            onChange={(e) => setNewUnitName(e.target.value)}
                            onKeyDown={(e) => e.key === "Escape" && (setCreatingUnitFor(null), setNewUnitName(""))}
                            placeholder="Unit name…"
                            className="flex-1 text-xs bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 text-gray-700 dark:text-gray-300 placeholder-gray-400 py-0.5 min-w-0"
                          />
                          <button type="submit" className="text-blue-500 hover:text-blue-600 text-xs font-medium shrink-0">Add</button>
                        </form>
                      ) : (
                        <button
                          onClick={() => { setCreatingUnitFor(subj.id); setNewUnitName(""); }}
                          className="w-full flex items-center gap-1.5 pl-4 pr-2 py-1 text-[11px] text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                        >
                          <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          Add unit
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* New subject */}
            {creatingSubject ? (
              <form
                onSubmit={(e) => { e.preventDefault(); handleCreateSubject(); }}
                className="flex items-center gap-1.5 px-2 py-1.5 mt-1"
              >
                <input
                  ref={subjectInputRef}
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && (setCreatingSubject(false), setNewSubjectName(""))}
                  placeholder="Subject name…"
                  className="flex-1 text-xs bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 text-gray-700 dark:text-gray-300 placeholder-gray-400 py-0.5 min-w-0"
                />
                <button type="submit" className="text-blue-500 hover:text-blue-600 text-xs font-medium shrink-0">Add</button>
              </form>
            ) : (
              <button
                onClick={() => { setCreatingSubject(true); setNewSubjectName(""); }}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 mt-2 text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New subject
              </button>
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 px-8 py-8 overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl tracking-tight" style={{ fontFamily: "var(--font-serif)", fontWeight: 400 }}>
                {breadcrumb ?? "All Notes"}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {loading ? "" : filteredSessions.length === 0
                  ? "Nothing here yet."
                  : `${filteredSessions.length} note${filteredSessions.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <button
              onClick={onNewNote}
              className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium px-3.5 py-2 rounded-xl transition-colors shrink-0"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New note
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-24">
              <svg className="animate-spin h-5 w-5 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredSessions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">No notes here</p>
                <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">
                  {selectedSubjectId ? "Move notes here or create a new one" : "Create your first note to get started"}
                </p>
              </div>
              <button onClick={onNewNote} className="mt-1 text-sm text-blue-500 hover:text-blue-600 font-medium transition-colors">
                Create a note →
              </button>
            </div>
          )}

          {/* Session grid */}
          {!loading && filteredSessions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredSessions.map((s) => {
                const subj = subjects.find((sub) => sub.id === s.subjectId);
                const unit = subj?.units.find((u) => u.id === s.unitId);
                return (
                  <div
                    key={s.id}
                    onClick={() => onLoadSession(s)}
                    className="group relative flex flex-col gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer transition-colors"
                  >
                    {/* Format badge */}
                    <span className={`self-start text-[10px] font-medium px-2 py-0.5 rounded-full ${FORMAT_COLORS[s.format]}`}>
                      {FORMAT_LABEL[s.format]}
                    </span>

                    {/* Title */}
                    <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2 leading-snug flex-1">
                      {s.title.replace(/^[^·]+·\s*/, "")}
                    </p>

                    {/* Subject/unit tag */}
                    {subj && (
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${DOT[subj.color] ?? "bg-gray-400"}`} />
                        <span className="text-[10px] text-gray-400 dark:text-gray-600 truncate">
                          {subj.name}{unit ? ` › ${unit.name}` : ""}
                        </span>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400 dark:text-gray-600">{formatDate(s.createdAt)}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        {/* Move button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setMovingSession(s); }}
                          className="p-1 rounded text-gray-300 dark:text-gray-700 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                          aria-label="Move to folder"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                        </button>
                        {/* Delete button */}
                        <button
                          onClick={(e) => handleDelete(e, s.id)}
                          disabled={deletingId === s.id}
                          className="p-1 rounded text-gray-300 dark:text-gray-700 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-40 transition-colors"
                          aria-label="Delete"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Move modal */}
      {movingSession && (
        <MoveModal
          session={movingSession}
          subjects={subjects}
          onMove={handleMove}
          onClose={() => setMovingSession(null)}
        />
      )}
    </div>
  );
}
