"use client";

import { useState, useRef, useMemo } from "react";
import { QuizQuestion, QuizMode } from "@/lib/types";
import { saveQuizResult, TrackableFormat } from "@/lib/learningProfile";

interface QuizViewProps {
  notes: string;
  format?: TrackableFormat;
  userId?: string;
}

type QuizState = "idle" | "loading" | "taking" | "results";

const MODES: {
  value: QuizMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "multiple-choice",
    label: "Multiple Choice",
    description: "Pick from 4 options",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    value: "true-false",
    label: "True / False",
    description: "Is the statement correct?",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12.75 11.25 15 15 9.75" /><circle cx="12" cy="12" r="9" /><path d="M15 9 9 15" className="opacity-0" />
        <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="14" y2="12" />
      </svg>
    ),
  },
  {
    value: "fill-blank",
    label: "Fill in the Blank",
    description: "Type the missing word",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="10" x2="10" y2="10" /><line x1="14" y1="10" x2="20" y2="10" /><line x1="4" y1="14" x2="20" y2="14" /><line x1="4" y1="18" x2="14" y2="18" />
      </svg>
    ),
  },
  {
    value: "matching",
    label: "Matching",
    description: "Connect terms to definitions",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="6" x2="10" y2="6" /><line x1="4" y1="12" x2="10" y2="12" /><line x1="4" y1="18" x2="10" y2="18" />
        <line x1="14" y1="6" x2="20" y2="6" /><line x1="14" y1="12" x2="20" y2="12" /><line x1="14" y1="18" x2="20" y2="18" />
        <line x1="10" y1="6" x2="14" y2="12" strokeDasharray="2 2" /><line x1="10" y1="12" x2="14" y2="6" strokeDasharray="2 2" />
      </svg>
    ),
  },
  {
    value: "open-ended",
    label: "Short Answer",
    description: "Write your own answer",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    value: "mixed",
    label: "Mixed",
    description: "All question types combined",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" />
      </svg>
    ),
  },
];

function normalizeAnswer(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "");
}

export default function QuizView({ notes, format, userId }: QuizViewProps) {
  const [quizState, setQuizState] = useState<QuizState>("idle");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string | number>>({});
  // matching: key = `${questionId}-${pairIndex}`, value = selected definition
  const [matchingAnswers, setMatchingAnswers] = useState<Record<string, string>>({});
  // fill-blank manual overrides: undefined = use auto-grade, true/false = forced
  const [overrides, setOverrides] = useState<Record<number, boolean>>({});
  const [error, setError] = useState("");
  const [questionCount, setQuestionCount] = useState(6);
  const [mode, setMode] = useState<QuizMode>("multiple-choice");
  const [attempt, setAttempt] = useState(0);

  // Learning profile tracking
  const startTimeRef = useRef<number>(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedToProfile, setSavedToProfile] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Shuffle definitions for matching questions (stable per question set)
  const shuffledDefinitions = useMemo(() => {
    const map: Record<number, string[]> = {};
    for (const q of questions) {
      if (q.type === "matching" && q.matchingPairs) {
        const defs = q.matchingPairs.map((p) => p.definition);
        // Fisher-Yates shuffle with a seeded-ish approach (stable per question id)
        const shuffled = [...defs];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor((Math.sin(q.id * 9301 + i * 49297) * 0.5 + 0.5) * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        map[q.id] = shuffled;
      }
    }
    return map;
  }, [questions]);

  // Scoring helpers
  const gradableCount = useMemo(() => {
    return questions.reduce((acc, q) => {
      if (q.type === "open-ended") return acc;
      if (q.type === "matching") return acc + (q.matchingPairs?.length ?? 0);
      return acc + 1;
    }, 0);
  }, [questions]);

  const correctCount = useMemo(() => {
    return questions.reduce((acc, q) => {
      if (q.type === "open-ended") return acc;
      if (q.type === "fill-blank") {
        if (q.id in overrides) return acc + (overrides[q.id] ? 1 : 0);
        const typed = normalizeAnswer(String(answers[q.id] ?? ""));
        const correct = normalizeAnswer(q.correctAnswer ?? "");
        return acc + (typed && correct && typed === correct ? 1 : 0);
      }
      if (q.type === "matching" && q.matchingPairs) {
        const pairScore = q.matchingPairs.reduce((s, pair, i) => {
          return s + (matchingAnswers[`${q.id}-${i}`] === pair.definition ? 1 : 0);
        }, 0);
        return acc + pairScore;
      }
      return acc + (answers[q.id] === q.correctIndex ? 1 : 0);
    }, 0);
  }, [questions, answers, matchingAnswers, overrides]);

  const openEndedQuestions = questions.filter((q) => q.type === "open-ended");
  const gradableQuestions = questions.filter((q) => q.type !== "open-ended");

  const allAnswered = questions.length > 0 && questions.every((q) => {
    if (q.type === "matching") {
      return q.matchingPairs?.every((_, i) => matchingAnswers[`${q.id}-${i}`]);
    }
    return answers[q.id] !== undefined && answers[q.id] !== "";
  });

  const handleSaveToProfile = async (confidence: number) => {
    if (!userId || !format || !gradableCount) return;
    setSaving(true);
    setSaveError("");
    try {
      await saveQuizResult(userId, {
        format,
        score: gradableCount > 0 ? correctCount / gradableCount : 0,
        totalQuestions: gradableCount,
        correctAnswers: correctCount,
        timeMs: elapsedMs,
        confidenceRating: confidence,
      });
      setSavedToProfile(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save result");
    } finally {
      setSaving(false);
    }
  };

  const generateQuiz = async () => {
    const nextAttempt = attempt + 1;
    setAttempt(nextAttempt);
    setQuizState("loading");
    setError("");
    setAnswers({});
    setMatchingAnswers({});
    setOverrides({});
    setSavedToProfile(false);
    setSaveError("");

    try {
      const response = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, count: questionCount, attempt: nextAttempt, mode }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate quiz");

      setQuestions(data.questions);
      setQuizState("taking");
      startTimeRef.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate quiz");
      setQuizState("idle");
    }
  };

  const Controls = () => (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">Questions:</label>
      <input
        type="number"
        min={3}
        max={20}
        value={questionCount}
        onChange={(e) => setQuestionCount(Math.min(20, Math.max(3, parseInt(e.target.value) || 3)))}
        className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
      />
    </div>
  );

  // ── Idle ──────────────────────────────────────────────────────────────────────
  if (quizState === "idle") {
    return (
      <div className="py-6 px-1 max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Test your knowledge</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Choose a format and generate a quiz from your notes</p>
        </div>

        {/* Format picker */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`flex flex-col items-start gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                mode === m.value
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/50"
              }`}
            >
              <span className={mode === m.value ? "text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}>
                {m.icon}
              </span>
              <span>
                <p className={`text-xs font-semibold leading-tight ${mode === m.value ? "text-blue-700 dark:text-blue-300" : "text-gray-800 dark:text-gray-200"}`}>
                  {m.label}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{m.description}</p>
              </span>
            </button>
          ))}
        </div>

        {error && <p className="text-red-500 dark:text-red-400 text-sm mb-4 text-center">{error}</p>}

        <div className="flex flex-col items-center gap-4">
          {mode !== "matching" && <Controls />}
          {mode === "matching" && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">Pairs:</label>
              <input
                type="number"
                min={4}
                max={12}
                value={questionCount}
                onChange={(e) => setQuestionCount(Math.min(12, Math.max(4, parseInt(e.target.value) || 6)))}
                className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          )}
          <button
            onClick={generateQuiz}
            className="w-full px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
          >
            Generate Quiz
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (quizState === "loading") {
    return (
      <div className="text-center py-12">
        <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Generating {MODES.find((m) => m.value === mode)?.label.toLowerCase()} quiz…
        </p>
      </div>
    );
  }

  // ── Results ───────────────────────────────────────────────────────────────────
  if (quizState === "results") {
    const pct = gradableCount > 0 ? correctCount / gradableCount : null;
    const feedback =
      pct === null ? "Review complete!"
      : pct === 1 ? "Perfect score!"
      : pct >= 0.8 ? "Great job!"
      : pct >= 0.6 ? "Keep it up!"
      : "Keep studying!";

    return (
      <div className="p-4">
        {/* Score banner */}
        <div className="text-center mb-6 p-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl">
          {pct !== null ? (
            <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-1">{correctCount}/{gradableCount}</div>
          ) : (
            <svg className="h-8 w-8 text-blue-400 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          )}
          <p className="text-gray-600 dark:text-gray-300 font-medium">{feedback}</p>
        </div>

        {/* Gradable questions review */}
        {gradableQuestions.length > 0 && (
          <div className="space-y-4 mb-4">
            {gradableQuestions.map((q, qIdx) => {
              if (q.type === "fill-blank") {
                const typed = normalizeAnswer(String(answers[q.id] ?? ""));
                const correct = normalizeAnswer(q.correctAnswer ?? "");
                const autoRight = typed === correct && typed.length > 0;
                const isRight = q.id in overrides ? overrides[q.id] : autoRight;
                const isOverridden = q.id in overrides;
                return (
                  <div key={q.id} className={`border-2 rounded-xl p-4 ${isRight ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20" : "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20"}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start gap-2">
                        {isRight
                          ? <svg className="h-5 w-5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          : <svg className="h-5 w-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        }
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{qIdx + 1}. {q.question.replace("[BLANK]", "___")}</p>
                      </div>
                      <button
                        onClick={() => setOverrides((p) => {
                          if (isOverridden) { const n = { ...p }; delete n[q.id]; return n; }
                          return { ...p, [q.id]: !isRight };
                        })}
                        className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
                          isRight
                            ? "border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                            : "border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30"
                        }`}
                      >
                        {isRight ? "Mark wrong" : "Mark correct"}
                        {isOverridden && " ↺"}
                      </button>
                    </div>
                    <div className="ml-7 space-y-1 text-sm">
                      {!isRight && <p className="text-red-700 dark:text-red-300">Your answer: <span className="font-medium">{answers[q.id] as string || "—"}</span></p>}
                      <p className="text-green-700 dark:text-green-300">Correct: <span className="font-semibold">{q.correctAnswer}</span></p>
                      <p className="text-gray-500 dark:text-gray-400 italic text-xs mt-1">{q.explanation}</p>
                    </div>
                  </div>
                );
              }

              if (q.type === "matching" && q.matchingPairs) {
                const pairResults = q.matchingPairs.map((pair, i) => ({
                  pair,
                  selected: matchingAnswers[`${q.id}-${i}`],
                  isRight: matchingAnswers[`${q.id}-${i}`] === pair.definition,
                }));
                const pairScore = pairResults.filter((r) => r.isRight).length;
                return (
                  <div key={q.id} className="border-2 border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
                    <p className="font-medium text-gray-900 dark:text-white text-sm mb-3">
                      {qIdx + 1}. Matching — {pairScore}/{q.matchingPairs.length} correct
                    </p>
                    <div className="space-y-2">
                      {pairResults.map(({ pair, selected, isRight: pr }, i) => (
                        <div key={i} className={`flex gap-2 items-start p-2 rounded-lg text-sm ${pr ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                          <span className="shrink-0 mt-0.5">{pr ? "✓" : "✗"}</span>
                          <span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{pair.term}:</span>
                            {" "}<span className="text-gray-700 dark:text-gray-300">{pair.definition}</span>
                            {!pr && selected && <span className="block text-red-600 dark:text-red-400 text-xs mt-0.5">You chose: {selected}</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">{q.explanation}</p>
                  </div>
                );
              }

              const isCorrect = answers[q.id] === q.correctIndex;
              return (
                <div key={q.id} className={`border-2 rounded-xl p-4 ${isCorrect ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20" : "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20"}`}>
                  <div className="flex items-start gap-2 mb-3">
                    {isCorrect
                      ? <svg className="h-5 w-5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      : <svg className="h-5 w-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    }
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{qIdx + 1}. {q.question}</p>
                  </div>
                  <div className="space-y-1 mb-3 ml-7">
                    {q.options?.map((option, idx) => (
                      <div key={idx} className={`px-3 py-2 rounded-lg text-sm ${
                        idx === q.correctIndex ? "bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100 font-medium"
                        : idx === answers[q.id] && !isCorrect ? "bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100"
                        : "text-gray-500 dark:text-gray-400"
                      }`}>
                        {q.type === "multiple-choice" && <span className="font-semibold mr-1">{String.fromCharCode(65 + idx)}.</span>}
                        {option}
                      </div>
                    ))}
                  </div>
                  <p className="ml-7 text-xs text-gray-500 dark:text-gray-400 italic">{q.explanation}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Open-ended review */}
        {openEndedQuestions.length > 0 && (
          <div className="space-y-4 mb-4">
            {gradableQuestions.length > 0 && (
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Short answer — self review</h4>
            )}
            {openEndedQuestions.map((q, qIdx) => (
              <div key={q.id} className="border-2 border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                <p className="font-medium text-gray-900 dark:text-white text-sm mb-3">{gradableQuestions.length + qIdx + 1}. {q.question}</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Your answer</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600 whitespace-pre-wrap min-h-[2.5rem]">
                      {(answers[q.id] as string) || <span className="italic text-gray-400">No answer</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase mb-1">Sample answer</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-purple-100 dark:bg-purple-900/40 rounded-lg p-3 border border-purple-200 dark:border-purple-700">{q.modelAnswer}</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">{q.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Learning Profile confidence */}
        {format && userId && gradableCount > 0 && (
          <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-5">
            {!savedToProfile ? (
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">How confident do you feel?</p>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => handleSaveToProfile(n)} disabled={saving}
                      onMouseEnter={() => setHoveredStar(n)} onMouseLeave={() => setHoveredStar(0)}
                      className="p-1.5 rounded-lg transition-colors disabled:opacity-40" aria-label={`${n} star${n !== 1 ? "s" : ""}`}
                    >
                      <svg className={`h-6 w-6 transition-colors ${n <= hoveredStar ? "text-amber-400" : "text-gray-300 dark:text-gray-600 hover:text-amber-400"}`} viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  ))}
                </div>
                {saving && <p className="text-xs text-gray-400 mt-2">Saving…</p>}
                {saveError && <p className="text-xs text-red-500 mt-2">{saveError}</p>}
                <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-2">Saves to your Learning Profile</p>
              </div>
            ) : (
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center justify-center gap-1.5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Saved to Learning Profile
              </p>
            )}
          </div>
        )}

        {/* Retake controls */}
        <div className="flex flex-col items-center gap-3 mt-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {mode !== "matching" && <Controls />}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">Format:</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as QuizMode)}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <button onClick={generateQuiz} className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors">
            Generate New Quiz
          </button>
        </div>
      </div>
    );
  }

  // ── Taking ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4">
      <div className="space-y-5 mb-6">
        {questions.map((q, qIdx) => (
          <div key={q.id} className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800">
            <p className="font-medium text-gray-900 dark:text-white mb-3 text-sm">
              {qIdx + 1}.{" "}
              {q.type === "fill-blank"
                ? q.question.split("[BLANK]").map((part, i, arr) => (
                    <span key={i}>{part}{i < arr.length - 1 && <span className="inline-block border-b-2 border-gray-400 w-20 mx-1 align-bottom" />}</span>
                  ))
                : q.question}
            </p>

            {/* Multiple choice */}
            {q.type === "multiple-choice" && (
              <div className="space-y-2">
                {q.options?.map((option, idx) => (
                  <button key={idx} onClick={() => setAnswers((p) => ({ ...p, [q.id]: idx }))}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors text-sm ${
                      answers[q.id] === idx
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    <span className="font-semibold mr-2">{String.fromCharCode(65 + idx)}.</span>{option}
                  </button>
                ))}
              </div>
            )}

            {/* True / False */}
            {q.type === "true-false" && (
              <div className="flex gap-3">
                {["True", "False"].map((label, idx) => (
                  <button key={idx} onClick={() => setAnswers((p) => ({ ...p, [q.id]: idx }))}
                    className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-colors ${
                      answers[q.id] === idx
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-200"
                    }`}
                  >{label}</button>
                ))}
              </div>
            )}

            {/* Fill in the blank */}
            {q.type === "fill-blank" && (
              <input
                type="text"
                placeholder="Type your answer…"
                value={(answers[q.id] as string) || ""}
                onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-0 focus:border-blue-500 placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
              />
            )}

            {/* Matching */}
            {q.type === "matching" && q.matchingPairs && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1">
                  <span>Term</span><span>Definition</span>
                </div>
                {q.matchingPairs.map((pair, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 items-center">
                    <div className="px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-800 dark:text-gray-200">
                      {pair.term}
                    </div>
                    <select
                      value={matchingAnswers[`${q.id}-${i}`] ?? ""}
                      onChange={(e) => setMatchingAnswers((p) => ({ ...p, [`${q.id}-${i}`]: e.target.value }))}
                      className={`px-3 py-2.5 rounded-xl border-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors focus:outline-none focus:border-blue-500 ${
                        matchingAnswers[`${q.id}-${i}`]
                          ? "border-blue-400 dark:border-blue-600"
                          : "border-gray-200 dark:border-gray-600"
                      }`}
                    >
                      <option value="">Select…</option>
                      {(shuffledDefinitions[q.id] ?? []).map((def, di) => (
                        <option key={di} value={def}>{def.length > 60 ? def.slice(0, 60) + "…" : def}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* Open-ended / short answer */}
            {q.type === "open-ended" && (
              <textarea
                rows={3}
                placeholder="Write your answer…"
                value={(answers[q.id] as string) || ""}
                onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-0 focus:border-blue-500 resize-none placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {questions.filter((q) => {
            if (q.type === "matching") return q.matchingPairs?.every((_, i) => matchingAnswers[`${q.id}-${i}`]);
            return answers[q.id] !== undefined && answers[q.id] !== "";
          }).length}/{questions.length} answered
        </p>
        <button
          onClick={() => {
            setElapsedMs(startTimeRef.current ? Date.now() - startTimeRef.current : 0);
            setQuizState("results");
          }}
          disabled={!allAnswered}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
