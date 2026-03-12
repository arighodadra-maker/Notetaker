"use client";

import { useState } from "react";
import { QuizQuestion, QuizMode } from "@/lib/types";

interface QuizViewProps {
  notes: string;
}

type QuizState = "idle" | "loading" | "taking" | "results";

const MODES: { value: QuizMode; label: string; description: string }[] = [
  { value: "multiple-choice", label: "Multiple Choice", description: "4 options, one correct" },
  { value: "true-false", label: "True / False", description: "Decide if each statement is true or false" },
  { value: "open-ended", label: "Open Ended", description: "Write your own answer" },
  { value: "mixed", label: "Mixed", description: "All question types combined" },
];

export default function QuizView({ notes }: QuizViewProps) {
  const [quizState, setQuizState] = useState<QuizState>("idle");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  // For MC/T-F: stores selected option index. For open-ended: stores typed text.
  const [answers, setAnswers] = useState<Record<number, string | number>>({});
  const [error, setError] = useState("");
  const [questionCount, setQuestionCount] = useState(6);
  const [mode, setMode] = useState<QuizMode>("multiple-choice");
  const [attempt, setAttempt] = useState(0);

  const generateQuiz = async () => {
    const nextAttempt = attempt + 1;
    setAttempt(nextAttempt);
    setQuizState("loading");
    setError("");
    setAnswers({});

    try {
      const response = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, count: questionCount, attempt: nextAttempt, mode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate quiz");
      }

      setQuestions(data.questions);
      setQuizState("taking");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate quiz");
      setQuizState("idle");
    }
  };

  const gradableQuestions = questions.filter((q) => q.type !== "open-ended");
  const openEndedQuestions = questions.filter((q) => q.type === "open-ended");
  const score = gradableQuestions.filter(
    (q) => answers[q.id] === q.correctIndex
  ).length;
  const allAnswered =
    questions.length > 0 &&
    questions.every((q) => answers[q.id] !== undefined && answers[q.id] !== "");

  const Controls = () => (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          Questions:
        </label>
        <input
          type="number"
          min={3}
          max={20}
          value={questionCount}
          onChange={(e) =>
            setQuestionCount(Math.min(20, Math.max(3, parseInt(e.target.value) || 3)))
          }
          className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>
    </div>
  );

  // Idle
  if (quizState === "idle") {
    return (
      <div className="py-8 max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎯</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Test your knowledge
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Choose a question type and generate a quiz from your notes
          </p>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                mode === m.value
                  ? "border-primary bg-blue-50 dark:bg-blue-900/30"
                  : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
              }`}
            >
              <div className={`text-sm font-semibold mb-0.5 ${mode === m.value ? "text-primary dark:text-blue-300" : "text-gray-900 dark:text-white"}`}>
                {m.label}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{m.description}</div>
            </button>
          ))}
        </div>

        {error && (
          <p className="text-red-500 dark:text-red-400 text-sm mb-4 text-center">{error}</p>
        )}

        <div className="flex flex-col items-center gap-4">
          <Controls />
          <button
            onClick={generateQuiz}
            className="px-8 py-3 bg-primary hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
          >
            Generate Quiz
          </button>
        </div>
      </div>
    );
  }

  // Loading
  if (quizState === "loading") {
    return (
      <div className="text-center py-12">
        <svg
          className="animate-spin h-8 w-8 text-primary mx-auto mb-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-gray-600 dark:text-gray-400">
          Generating {questionCount} {MODES.find((m) => m.value === mode)?.label.toLowerCase()} questions...
        </p>
      </div>
    );
  }

  // Results
  if (quizState === "results") {
    const pct = gradableQuestions.length > 0 ? score / gradableQuestions.length : null;
    const feedback =
      pct === null ? "Review complete! 📖"
      : pct === 1 ? "Perfect score! 🎉"
      : pct >= 0.7 ? "Great job! 👍"
      : "Keep studying! 📚";

    return (
      <div>
        {/* Score banner */}
        <div className="text-center mb-6 p-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
          {pct !== null ? (
            <div className="text-5xl font-bold text-primary mb-1">
              {score}/{gradableQuestions.length}
            </div>
          ) : (
            <div className="text-3xl mb-1">📖</div>
          )}
          <p className="text-gray-600 dark:text-gray-300">{feedback}</p>
          {openEndedQuestions.length > 0 && gradableQuestions.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              +{openEndedQuestions.length} open-ended question{openEndedQuestions.length > 1 ? "s" : ""} to self-review below
            </p>
          )}
        </div>

        {/* Gradable questions review */}
        {gradableQuestions.length > 0 && (
          <div className="space-y-4 mb-4">
            {gradableQuestions.map((q, qIdx) => {
              const isCorrect = answers[q.id] === q.correctIndex;
              return (
                <div
                  key={q.id}
                  className={`border-2 rounded-lg p-4 ${
                    isCorrect
                      ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
                      : "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20"
                  }`}
                >
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-lg">{isCorrect ? "✅" : "❌"}</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {qIdx + 1}. {q.question}
                    </p>
                  </div>
                  <div className="space-y-1 mb-3 ml-7">
                    {q.options?.map((option, idx) => (
                      <div
                        key={idx}
                        className={`px-3 py-2 rounded text-sm ${
                          idx === q.correctIndex
                            ? "bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100 font-medium"
                            : idx === answers[q.id] && !isCorrect
                            ? "bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {q.type === "multiple-choice" && (
                          <span className="font-medium mr-1">{String.fromCharCode(65 + idx)}.</span>
                        )}
                        {option}
                      </div>
                    ))}
                  </div>
                  <p className="ml-7 text-sm text-gray-600 dark:text-gray-400 italic">
                    {q.explanation}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Open-ended review */}
        {openEndedQuestions.length > 0 && (
          <div className="space-y-4 mb-4">
            {gradableQuestions.length > 0 && (
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Open-ended — self review
              </h4>
            )}
            {openEndedQuestions.map((q, qIdx) => (
              <div
                key={q.id}
                className="border-2 border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4"
              >
                <p className="font-medium text-gray-900 dark:text-white mb-3">
                  {gradableQuestions.length + qIdx + 1}. {q.question}
                </p>
                <div className="ml-0 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Your answer</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-600 whitespace-pre-wrap">
                      {answers[q.id] as string || <span className="italic text-gray-400">No answer provided</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase mb-1">Sample answer</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-purple-100 dark:bg-purple-900/40 rounded p-3 border border-purple-200 dark:border-purple-700">
                      {q.modelAnswer}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">{q.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col items-center gap-3 mt-6">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Controls />
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">Type:</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as QuizMode)}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={generateQuiz}
            className="w-full py-3 bg-primary hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
          >
            Generate New Quiz
          </button>
        </div>
      </div>
    );
  }

  // Taking quiz
  return (
    <div>
      <div className="space-y-5 mb-6">
        {questions.map((q, qIdx) => (
          <div
            key={q.id}
            className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
          >
            <p className="font-medium text-gray-900 dark:text-white mb-3">
              {qIdx + 1}. {q.question}
            </p>

            {/* Multiple choice */}
            {q.type === "multiple-choice" && (
              <div className="space-y-2">
                {q.options?.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => setAnswers((p) => ({ ...p, [q.id]: idx }))}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors text-sm ${
                      answers[q.id] === idx
                        ? "border-primary bg-blue-50 dark:bg-blue-900/30 text-primary dark:text-blue-300"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    <span className="font-semibold mr-2">{String.fromCharCode(65 + idx)}.</span>
                    {option}
                  </button>
                ))}
              </div>
            )}

            {/* True / False */}
            {q.type === "true-false" && (
              <div className="flex gap-3">
                {["True", "False"].map((label, idx) => (
                  <button
                    key={idx}
                    onClick={() => setAnswers((p) => ({ ...p, [q.id]: idx }))}
                    className={`flex-1 py-3 rounded-lg border-2 font-semibold text-sm transition-colors ${
                      answers[q.id] === idx
                        ? "border-primary bg-blue-50 dark:bg-blue-900/30 text-primary dark:text-blue-300"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Open-ended */}
            {q.type === "open-ended" && (
              <textarea
                rows={3}
                placeholder="Write your answer..."
                value={(answers[q.id] as string) || ""}
                onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent resize-none placeholder-gray-400 dark:placeholder-gray-500"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {Object.keys(answers).filter((k) => answers[Number(k)] !== "").length}/{questions.length} answered
        </p>
        <button
          onClick={() => setQuizState("results")}
          disabled={!allAnswered}
          className="px-6 py-3 bg-primary hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          Submit Quiz
        </button>
      </div>
    </div>
  );
}
