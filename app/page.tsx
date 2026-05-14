"use client";

import { useState, useRef } from "react";
import { NoteFormat } from "@/lib/prompts";
import FileUpload from "@/components/FileUpload";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import QuizView from "@/components/quiz/QuizView";
import CalendarView from "@/components/calendar/CalendarView";
import { useTheme } from "@/components/ThemeProvider";
import LandingPage from "@/components/LandingPage";
import AuthPage from "@/components/AuthPage";
import Dashboard from "@/components/Dashboard";
import VideoUpload from "@/components/VideoUpload";
import SessionDrawer from "@/components/SessionDrawer";
import { extractAudio } from "@/lib/audioExtractor";
import { extractTextFromPdf } from "@/lib/pdfExtractor";
import { upload } from "@vercel/blob/client";
import { useAuth } from "@/components/AuthProvider";
import { saveSession, Session } from "@/lib/sessions";

type InputMode = "text" | "file" | "video";
type BaseFormat = "bullet" | "cornell" | "flashcards" | "study-guide" | "flowchart" | "mindmap";
type OutputTab = BaseFormat | "diagrams" | "quiz" | "calendar";
type AllNotes = Partial<Record<BaseFormat, string>>;

const BASE_FORMATS: BaseFormat[] = ["bullet", "cornell", "flashcards", "study-guide", "flowchart", "mindmap"];

const FORMAT_TABS: { key: OutputTab; label: string }[] = [
  { key: "bullet",       label: "Bullets" },
  { key: "cornell",      label: "Cornell" },
  { key: "flashcards",   label: "Flashcards" },
  { key: "study-guide",  label: "Study Guide" },
  { key: "flowchart",    label: "Flowchart" },
  { key: "mindmap",      label: "Mind Map" },
  { key: "diagrams",     label: "Both" },
  { key: "calendar",     label: "Calendar" },
  { key: "quiz",         label: "Quiz" },
];

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const { user, authLoading, signOut } = useAuth();
  const [started, setStarted] = useState(false);
  const [view, setView] = useState<"dashboard" | "tool">("dashboard");

  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");

  const [toolMode, setToolMode] = useState<"create" | "view">("create");
  const [allNotes, setAllNotes] = useState<AllNotes>({});
  const [activeTab, setActiveTab] = useState<OutputTab>("bullet");

  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeProgress, setTranscribeProgress] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBuffer, setEditBuffer] = useState("");

  const transcriptCache = useRef<Map<string, string>>(new Map());

  const hasAnyNotes = Object.keys(allNotes).length > 0;

  // The notes string for the active tab
  const activeNotes = (() => {
    if (activeTab === "diagrams") {
      if (!allNotes.flowchart || !allNotes.mindmap) return null;
      return JSON.stringify({ flowchart: allNotes.flowchart, mindmap: allNotes.mindmap });
    }
    if (activeTab === "quiz") return null;
    return allNotes[activeTab as BaseFormat] ?? null;
  })();

  // Best notes for quiz and calendar (prefer study-guide, fallback to others)
  const richNotes =
    allNotes["study-guide"] || allNotes["bullet"] || allNotes["cornell"] ||
    Object.values(allNotes).find(Boolean) || "";

  const richNotesFormat: NoteFormat =
    allNotes["study-guide"] ? "study-guide" :
    allNotes["bullet"] ? "bullet" :
    allNotes["cornell"] ? "cornell" :
    (Object.entries(allNotes).find(([, v]) => v)?.[0] as NoteFormat) ?? "bullet";

  const handleModeSwitch = (mode: InputMode) => {
    setInputMode(mode);
    setError("");
    if (mode === "text") { setSelectedFile(null); setSelectedVideo(null); }
    else if (mode === "file") { setTranscript(""); setSelectedVideo(null); }
    else { setTranscript(""); setSelectedFile(null); }
  };

  const handleGenerate = async () => {
    if (inputMode === "text" && !transcript.trim()) { setError("Please enter a transcript."); return; }
    if (inputMode === "file" && !selectedFile) { setError("Please select a file."); return; }
    if (inputMode === "video" && !selectedVideo) { setError("Please select a video."); return; }

    setLoading(true);
    setError("");
    setAllNotes({});
    setActiveTab("bullet");

    let transcriptText = transcript;

    try {
      // ── Extract/transcribe input ──────────────────────────────────────
      if (inputMode === "file" && selectedFile) {
        const key = `${selectedFile.name}-${selectedFile.size}-${selectedFile.lastModified}`;
        const cached = transcriptCache.current.get(key);
        if (cached) {
          transcriptText = cached;
        } else {
          setExtracting(true);
          const isPdf = selectedFile.name.toLowerCase().endsWith(".pdf") ||
            selectedFile.type === "application/pdf";
          if (isPdf) {
            // Extract client-side — no upload, no size limit
            transcriptText = await extractTextFromPdf(selectedFile);
          } else {
            // Word / PowerPoint — upload to Vercel Blob first to bypass the
            // 4 MB serverless body limit, then extract server-side
            const blob = await upload(selectedFile.name, selectedFile, {
              access: "public",
              handleUploadUrl: "/api/upload",
            });
            const res = await fetch("/api/extract", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                blobUrl: blob.url,
                fileName: selectedFile.name,
                mimeType: selectedFile.type,
              }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to extract text");
            transcriptText = data.transcript;
          }
          transcriptCache.current.set(key, transcriptText);
          setExtracting(false);
        }
      }

      if (inputMode === "video" && selectedVideo) {
        const key = `${selectedVideo.name}-${selectedVideo.size}-${selectedVideo.lastModified}`;
        const cached = transcriptCache.current.get(key);
        if (cached) {
          transcriptText = cached;
        } else {
          setTranscribing(true);
          const { chunks } = await extractAudio(selectedVideo);
          const parts: string[] = [];
          for (let i = 0; i < chunks.length; i++) {
            setTranscribeProgress(chunks.length > 1 ? `Part ${i + 1} of ${chunks.length}` : "");
            const fd = new FormData();
            fd.append("file", new File([chunks[i]], `audio_${i}.wav`, { type: "audio/wav" }));
            const res = await fetch("/api/transcribe", { method: "POST", body: fd });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || (res.status === 413 ? "Audio chunk too large — try a shorter video" : "Failed to transcribe video"));
            parts.push(data.transcript);
          }
          transcriptText = parts.join(" ");
          transcriptCache.current.set(key, transcriptText);
          setTranscribing(false);
          setTranscribeProgress("");
        }
      }

      // ── Generate all formats in parallel ─────────────────────────────
      await Promise.all(
        BASE_FORMATS.map(async (fmt) => {
          try {
            const res = await fetch("/api/format", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ transcript: transcriptText, format: fmt }),
            });
            const data = await res.json();
            if (res.ok) {
              setAllNotes((prev) => ({ ...prev, [fmt]: data.notes }));
            }
          } catch {
            // Individual format failure doesn't block the rest
          }
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      setExtracting(false);
      setTranscribing(false);
      setTranscribeProgress("");
    }
  };

  const handleSave = async () => {
    if (!user || activeTab === "quiz") return;
    let notesToSave: string;
    let formatToSave: NoteFormat;
    if (activeTab === "calendar") {
      if (!richNotes) return;
      notesToSave = richNotes;
      formatToSave = richNotesFormat;
    } else {
      if (!activeNotes) return;
      notesToSave = activeNotes;
      formatToSave = activeTab as NoteFormat;
    }
    setSaving(true);
    await saveSession(user.uid, formatToSave, notesToSave, transcript).catch(() => {});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCopy = async () => {
    if (!activeNotes) return;
    try {
      await navigator.clipboard.writeText(activeNotes);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  const handleLoadSession = (session: Session) => {
    // Populate only the format that was saved; other tabs will show "not generated"
    if (session.format === "diagrams") {
      try {
        const parsed = JSON.parse(session.notes);
        setAllNotes({ flowchart: parsed.flowchart, mindmap: parsed.mindmap });
      } catch { setAllNotes({}); }
    } else {
      setAllNotes({ [session.format as BaseFormat]: session.notes });
    }
    setActiveTab(session.format as OutputTab);
    setTranscript(session.transcript);
    setSelectedFile(null);
    setSelectedVideo(null);
    setInputMode("text");
    setError("");
    setToolMode("view");
  };

  const isGenerateDisabled =
    loading || extracting || transcribing ||
    (inputMode === "text" ? !transcript.trim() : inputMode === "file" ? !selectedFile : !selectedVideo);

  const busyLabel = transcribing
    ? `Transcribing…${transcribeProgress ? ` (${transcribeProgress})` : ""}`
    : extracting ? "Extracting text…" : "Generating all formats…";

  const isDiagramTab = activeTab === "flowchart" || activeTab === "mindmap" || activeTab === "diagrams";

  // ── Auth / routing gates ──────────────────────────────────────────────
  if (authLoading) return null;
  if (!started) return <LandingPage onStart={() => setStarted(true)} />;
  if (!user) return <AuthPage onBack={() => setStarted(false)} />;
  if (view === "dashboard") return (
    <Dashboard
      onNewNote={() => {
        setAllNotes({}); setTranscript(""); setSelectedFile(null);
        setSelectedVideo(null); setInputMode("text"); setActiveTab("bullet");
        setToolMode("create"); setView("tool");
      }}
      onLoadSession={(session) => { handleLoadSession(session); setView("tool"); }}
    />
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-200">
      <SessionDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} userId={user.uid} onLoad={(s) => { handleLoadSession(s); }} />

      {/* Nav */}
      <nav className="border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("dashboard")} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            Notes
          </button>
          <span className="text-sm tracking-tight" style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}>ClassCapsule</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setDrawerOpen(true)} className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="History">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            <span className="text-xs font-medium">History</span>
          </button>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">{user?.email}</span>
          <button onClick={signOut} className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">Sign out</button>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
          <button onClick={toggleTheme} className="p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Toggle theme">
            {theme === "light" ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      <main className={`mx-auto px-6 py-10 transition-all duration-300 ${activeTab === "diagrams" ? "max-w-5xl" : "max-w-2xl"}`}>
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-2xl tracking-tight mb-1" style={{ fontFamily: "var(--font-serif)", fontWeight: 400 }}>Generate notes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Paste a transcript or upload a file — all formats generated at once.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">{error}</div>
        )}

        {/* Input card — hidden when viewing a saved session */}
        {toolMode === "view" && (
          <button
            onClick={() => { setAllNotes({}); setToolMode("create"); }}
            className="mb-6 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New note
          </button>
        )}
        <div className={`rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-4 ${toolMode === "view" ? "hidden" : ""}`}>
          <div className="flex border-b border-gray-200 dark:border-gray-800">
            {([{ key: "text", label: "Text" }, { key: "file", label: "Upload file" }, { key: "video", label: "Video" }] as { key: InputMode; label: string }[]).map(({ key, label }) => (
              <button key={key} onClick={() => handleModeSwitch(key)} disabled={loading || extracting || transcribing}
                className={`px-5 py-3 text-sm font-medium transition-colors disabled:opacity-40 ${inputMode === key ? "text-gray-900 dark:text-white bg-white dark:bg-gray-900 border-b-2 border-blue-500" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-50 dark:bg-gray-900/50"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="bg-white dark:bg-gray-900">
            {inputMode === "text" && (
              <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Paste your lecture transcript here…" rows={9} disabled={loading || extracting || transcribing}
                className="w-full px-5 py-4 text-sm bg-transparent resize-y min-h-[200px] placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none disabled:opacity-50" />
            )}
            {inputMode === "file" && (
              <div className="px-5 py-4"><FileUpload onFileSelect={setSelectedFile} disabled={loading || extracting || transcribing} selectedFile={selectedFile} /></div>
            )}
            {inputMode === "video" && (
              <div className="px-5 py-4"><VideoUpload onFileSelect={setSelectedVideo} disabled={loading || extracting || transcribing} selectedFile={selectedVideo} /></div>
            )}
          </div>
        </div>

        {/* Generate — hidden in view mode */}
        <button onClick={handleGenerate} disabled={isGenerateDisabled} style={{ display: toolMode === "view" ? "none" : undefined }}
          className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 px-6 rounded-xl transition-colors mb-10">
          {(loading || extracting || transcribing) && (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {loading || extracting || transcribing ? busyLabel : "Generate"}
        </button>

        {/* Output */}
        {hasAnyNotes && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {/* Tab bar + actions */}
            <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              {/* Format tabs */}
              <div className="flex items-center overflow-x-auto px-3 pt-2 gap-0.5">
                {FORMAT_TABS.filter((tab) => {
                  if (tab.key === "calendar") return !!richNotes;
                  if (toolMode === "create") return true;
                  if (tab.key === "quiz") return !!richNotes;
                  if (tab.key === "diagrams") return !!(allNotes.flowchart && allNotes.mindmap);
                  return !!allNotes[tab.key as BaseFormat];
                }).map((tab) => {
                  const isQuiz = tab.key === "quiz";
                  const isCalendar = tab.key === "calendar";
                  const isDiagrams = tab.key === "diagrams";
                  const hasContent = isQuiz || isCalendar
                    ? !!richNotes
                    : isDiagrams
                    ? !!(allNotes.flowchart && allNotes.mindmap)
                    : !!allNotes[tab.key as BaseFormat];

                  return (
                    <button
                      key={tab.key}
                      onClick={() => { setActiveTab(tab.key); setEditing(false); }}
                      className={`relative shrink-0 px-3 py-2 text-xs font-medium rounded-t-md transition-colors whitespace-nowrap ${
                        activeTab === tab.key
                          ? "bg-white dark:bg-gray-950 text-gray-900 dark:text-white border border-b-0 border-gray-200 dark:border-gray-800"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      }`}
                    >
                      {tab.label}
                      {/* Loading dot */}
                      {!isQuiz && !isCalendar && !hasContent && loading && (
                        <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Actions row */}
              {activeTab !== "quiz" && (
                <div className="flex items-center justify-end gap-2 px-4 py-2">
                  {editing ? (
                    <>
                      <button
                        onClick={() => setEditing(false)}
                        className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setAllNotes((prev) => ({ ...prev, [activeTab as BaseFormat]: editBuffer }));
                          setEditing(false);
                        }}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors"
                      >
                        Done
                      </button>
                    </>
                  ) : (
                    <>
                      {!isDiagramTab && activeTab !== "calendar" && activeNotes && (
                        <>
                          <button
                            onClick={() => { setEditBuffer(activeNotes); setEditing(true); }}
                            className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            Edit
                          </button>
                          <button onClick={handleCopy} className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            {copied ? "Copied" : "Copy"}
                          </button>
                        </>
                      )}
                      {(activeTab === "calendar" ? !!richNotes : !!activeNotes) && (
                        <button onClick={handleSave} disabled={saving || saved} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                          {saving && <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                          {saved ? "Saved!" : saving ? "Saving…" : "Save to notes"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Tab content */}
            <div className="bg-white dark:bg-gray-900">
              {activeTab === "quiz" ? (
                <QuizView notes={richNotes} />
              ) : activeTab === "calendar" ? (
                <div className="p-5">
                  <CalendarView notes={richNotes} format={richNotesFormat} />
                </div>
              ) : editing ? (
                <textarea
                  value={editBuffer}
                  onChange={(e) => setEditBuffer(e.target.value)}
                  className="w-full px-5 py-4 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-y min-h-[400px] focus:outline-none font-mono leading-relaxed"
                  autoFocus
                />
              ) : activeNotes ? (
                <div className={activeTab === "diagrams" ? "" : "p-5 overflow-x-auto"}>
                  <MarkdownRenderer content={activeNotes} format={activeTab as NoteFormat} />
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  {loading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Generating…
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Not generated for this session.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
