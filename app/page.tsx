"use client";

import { useState } from "react";
import { NoteFormat } from "@/lib/prompts";
import FileUpload from "@/components/FileUpload";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import CalendarView from "@/components/calendar/CalendarView";
import QuizView from "@/components/quiz/QuizView";
import { useTheme } from "@/components/ThemeProvider";

type InputMode = "text" | "file";

const FORMAT_OPTIONS: { value: NoteFormat; label: string }[] = [
  { value: "bullet", label: "Bullet Points" },
  { value: "cornell", label: "Cornell Notes" },
  { value: "flashcards", label: "Flashcards" },
  { value: "study-guide", label: "Study Guide" },
  { value: "flowchart", label: "Flowchart" },
  { value: "mindmap", label: "Mind Map" },
  { value: "diagrams", label: "Flowchart + Mind Map" },
];

const OUTPUT_TABS = [
  { key: "notes", label: "Notes" },
  { key: "calendar", label: "Study Calendar" },
  { key: "quiz", label: "Quiz" },
] as const;

const isDiagram = (f: NoteFormat) =>
  f === "flowchart" || f === "mindmap" || f === "diagrams";

export default function Home() {
  const { theme, toggleTheme } = useTheme();

  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [format, setFormat] = useState<NoteFormat>("bullet");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"notes" | "calendar" | "quiz">("notes");
  const [converting, setConverting] = useState(false);

  const handleModeSwitch = (mode: InputMode) => {
    setInputMode(mode);
    setError("");
    if (mode === "text") setSelectedFile(null);
    else setTranscript("");
  };

  const handleFormatChange = (f: NoteFormat) => {
    setFormat(f);
    setNotes("");
  };

  const handleGenerate = async () => {
    if (inputMode === "text" && !transcript.trim()) {
      setError("Please enter a transcript.");
      return;
    }
    if (inputMode === "file" && !selectedFile) {
      setError("Please select a file.");
      return;
    }

    setLoading(true);
    setError("");
    setNotes("");

    let transcriptText = transcript;

    try {
      if (inputMode === "file" && selectedFile) {
        setExtracting(true);
        const formData = new FormData();
        formData.append("file", selectedFile);
        const extractResponse = await fetch("/api/extract", { method: "POST", body: formData });
        const extractData = await extractResponse.json();
        if (!extractResponse.ok) throw new Error(extractData.error || "Failed to extract text");
        transcriptText = extractData.transcript;
        setExtracting(false);
      }

      if (format === "diagrams") {
        const [flowRes, mindRes] = await Promise.all([
          fetch("/api/format", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript: transcriptText, format: "flowchart" }) }),
          fetch("/api/format", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript: transcriptText, format: "mindmap" }) }),
        ]);
        const [flowData, mindData] = await Promise.all([flowRes.json(), mindRes.json()]);
        if (!flowRes.ok || !mindRes.ok) throw new Error(flowData.error || mindData.error || "Failed to generate diagrams");
        setNotes(JSON.stringify({ flowchart: flowData.notes, mindmap: mindData.notes }));
      } else {
        const response = await fetch("/api/format", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript: transcriptText, format }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to generate notes");
        setNotes(data.notes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      setExtracting(false);
    }
  };

  const handleCopy = async () => {
    if (!notes) return;
    try {
      await navigator.clipboard.writeText(notes);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  const handleConvertToStudyGuide = async () => {
    setConverting(true);
    setError("");
    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, fromFormat: format, toFormat: "study-guide" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to convert notes");
      setNotes(data.notes);
      setFormat("study-guide");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setConverting(false);
    }
  };

  const isGenerateDisabled = loading || extracting || (inputMode === "text" ? !transcript.trim() : !selectedFile);

  const busyLabel = extracting ? "Extracting…" : "Generating…";

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-200">
      {/* Nav */}
      <nav className="border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <span className="text-base font-semibold tracking-tight">NotesAI</span>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>
      </nav>

      <main className={`mx-auto px-6 py-10 transition-all duration-300 ${format === "diagrams" ? "max-w-5xl" : "max-w-2xl"}`}>
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Generate notes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Paste a transcript or upload a file — get structured notes instantly.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Input card */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-3">
          {/* Mode toggle */}
          <div className="flex border-b border-gray-200 dark:border-gray-800">
            {(["text", "file"] as InputMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleModeSwitch(mode)}
                disabled={loading || extracting}
                className={`px-5 py-3 text-sm font-medium transition-colors disabled:opacity-40 ${
                  inputMode === mode
                    ? "text-gray-900 dark:text-white bg-white dark:bg-gray-900 border-b-2 border-blue-500"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-50 dark:bg-gray-900/50"
                }`}
              >
                {mode === "text" ? "Text" : "Upload file"}
              </button>
            ))}
          </div>

          {/* Input area */}
          <div className="bg-white dark:bg-gray-900">
            {inputMode === "text" ? (
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste your lecture transcript here…"
                rows={9}
                disabled={loading || extracting}
                className="w-full px-5 py-4 text-sm bg-transparent resize-y min-h-[200px] placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none disabled:opacity-50"
              />
            ) : (
              <div className="px-5 py-4">
                <FileUpload onFileSelect={setSelectedFile} disabled={loading || extracting} selectedFile={selectedFile} />
              </div>
            )}
          </div>
        </div>

        {/* Format chips */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Format</p>
          <div className="flex flex-wrap gap-2">
            {FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleFormatChange(opt.value)}
                disabled={loading || extracting}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors disabled:opacity-40 ${
                  format === opt.value
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate */}
        <button
          onClick={handleGenerate}
          disabled={isGenerateDisabled}
          className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 px-6 rounded-xl transition-colors mb-10"
        >
          {(loading || extracting) && (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {loading || extracting ? busyLabel : "Generate"}
        </button>

        {/* Output */}
        {notes && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {/* Output header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              {/* Tabs */}
              <div className="flex gap-1">
                {OUTPUT_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {format !== "study-guide" && !isDiagram(format) && (
                  <button
                    onClick={handleConvertToStudyGuide}
                    disabled={converting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {converting && (
                      <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    {converting ? "Converting…" : "→ Study Guide"}
                  </button>
                )}
                {!isDiagram(format) && (
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                )}
              </div>
            </div>

            {/* Tab content */}
            <div className="bg-white dark:bg-gray-900">
              {activeTab === "notes" && (
                <div className="p-5 overflow-x-auto">
                  <MarkdownRenderer content={notes} format={format} />
                </div>
              )}
              {activeTab === "calendar" && <CalendarView notes={notes} format={format} />}
              {activeTab === "quiz" && <QuizView notes={notes} />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
