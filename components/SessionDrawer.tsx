"use client";

import { useEffect, useState } from "react";
import { Session, loadSessions, deleteSession } from "@/lib/sessions";
import { NoteFormat } from "@/lib/prompts";

interface SessionDrawerProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onLoad: (session: Session) => void;
}

const FORMAT_COLORS: Record<NoteFormat, string> = {
  bullet: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  cornell: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  flashcards: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "study-guide": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  flowchart: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  mindmap: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  diagrams: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
};

const FORMAT_SHORT: Record<NoteFormat, string> = {
  bullet: "Bullets",
  cornell: "Cornell",
  flashcards: "Flashcards",
  "study-guide": "Study Guide",
  flowchart: "Flowchart",
  mindmap: "Mind Map",
  diagrams: "Diagrams",
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
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function SessionDrawer({ open, onClose, userId, onLoad }: SessionDrawerProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [fetching, setFetching] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFetching(true);
    loadSessions(userId)
      .then(setSessions)
      .finally(() => setFetching(false));
  }, [open, userId]);

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setDeletingId(sessionId);
    await deleteSession(userId, sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setDeletingId(null);
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-80 z-40 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-medium">History</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto">
          {fetching ? (
            <div className="flex items-center justify-center py-16">
              <svg className="animate-spin h-5 w-5 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : sessions.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-600">No saved sessions yet.</p>
              <p className="text-xs text-gray-300 dark:text-gray-700 mt-1">Generate notes to get started.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  onClick={() => { onLoad(s); onClose(); }}
                  className="group flex items-start gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/60 cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate leading-snug">
                      {s.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${FORMAT_COLORS[s.format]}`}>
                        {FORMAT_SHORT[s.format]}
                      </span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-600">
                        {formatDate(s.createdAt)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, s.id)}
                    disabled={deletingId === s.id}
                    className="shrink-0 mt-0.5 p-1 rounded text-gray-300 dark:text-gray-700 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 disabled:opacity-40 transition-all"
                    aria-label="Delete session"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
