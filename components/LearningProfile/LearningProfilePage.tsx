"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  loadQuizResults,
  computeLearningProfile,
  LearningProfile,
  QuizResult,
  MethodStats,
  FORMAT_LABELS,
  FORMAT_BAR_COLORS,
  FORMAT_BADGE_COLORS,
  FORMAT_TEXT_COLORS,
} from "@/lib/learningProfile";

interface Props {
  onBack: () => void;
}

function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const color =
    score >= 0.8 ? "#22c55e" : score >= 0.6 ? "#3b82f6" : "#f59e0b";
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: "rotate(-90deg)" }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={size * 0.09}
        className="text-gray-100 dark:text-gray-800"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={size * 0.09}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - score)}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
      />
    </svg>
  );
}

function formatMs(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function relativeDate(d: Date): string {
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Stars({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <svg
          key={i}
          className={`h-2.5 w-2.5 ${
            i < rating
              ? "text-amber-400"
              : "text-gray-200 dark:text-gray-700"
          }`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

export default function LearningProfilePage({ onBack }: Props) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadQuizResults(user.uid)
      .then((results) => {
        setProfile(computeLearningProfile(results));
        setLoading(false);
        setTimeout(() => setMounted(true), 80);
      })
      .catch(() => setLoading(false));
  }, [user]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-200">
      {/* Header */}
      <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Dashboard
        </button>
        <span className="text-gray-200 dark:text-gray-700 text-xs">·</span>
        <h1
          className="text-sm text-gray-700 dark:text-gray-200"
          style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}
        >
          Learning Profile
        </h1>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <svg
              className="animate-spin h-5 w-5 text-gray-300 dark:text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        ) : !profile || profile.totalSessions === 0 ? (
          <EmptyState onBack={onBack} />
        ) : (
          <ProfileContent profile={profile} mounted={mounted} />
        )}
      </main>
    </div>
  );
}

function EmptyState({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center gap-5">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center">
        <svg
          className="h-7 w-7 text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </div>
      <div className="space-y-1">
        <h2
          className="text-lg text-gray-900 dark:text-white"
          style={{ fontFamily: "var(--font-serif)", fontWeight: 400 }}
        >
          No data yet
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
          Generate notes, then take a quiz and rate your confidence. Your
          Learning Profile builds from real performance.
        </p>
      </div>
      <button
        onClick={onBack}
        className="mt-1 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl transition-colors"
      >
        Generate notes
      </button>
    </div>
  );
}

function ProfileContent({
  profile,
  mounted,
}: {
  profile: LearningProfile;
  mounted: boolean;
}) {
  const scoreLabel =
    profile.avgScore >= 0.8
      ? "text-green-600 dark:text-green-400"
      : profile.avgScore >= 0.6
      ? "text-blue-600 dark:text-blue-400"
      : "text-amber-600 dark:text-amber-400";

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Average score ring */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 flex flex-col items-center gap-2">
          <div className="relative flex items-center justify-center w-[72px] h-[72px]">
            <ScoreRing score={profile.avgScore} size={72} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-base font-bold tabular-nums ${scoreLabel}`}>
                {Math.round(profile.avgScore * 100)}%
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Avg Score</p>
        </div>

        {/* Total quizzes */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 flex flex-col items-center justify-center gap-1.5">
          <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
            {profile.totalSessions}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Quizzes</p>
        </div>

        {/* Streak */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 flex flex-col items-center justify-center gap-1.5">
          <div className="flex items-baseline gap-1.5">
            <p className="text-3xl font-bold text-orange-500 tabular-nums">
              {profile.streak}
            </p>
            <span className="text-xl leading-none">🔥</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Day Streak</p>
        </div>

        {/* Best method */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 flex flex-col items-center justify-center gap-2">
          {profile.topFormat ? (
            <>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${FORMAT_BADGE_COLORS[profile.topFormat]}`}
              >
                {FORMAT_LABELS[profile.topFormat]}
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Best Method
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-600">—</p>
          )}
        </div>
      </div>

      {/* Effectiveness + Insights */}
      <div className="grid md:grid-cols-2 gap-5">
        <EffectivenessCard stats={profile.methodStats} mounted={mounted} />
        <InsightsCard recommendations={profile.recommendations} />
      </div>

      {/* Recent activity */}
      {profile.recentResults.length > 0 && (
        <RecentActivityCard results={profile.recentResults} />
      )}
    </div>
  );
}

function EffectivenessCard({
  stats,
  mounted,
}: {
  stats: MethodStats[];
  mounted: boolean;
}) {
  if (!stats.length) return null;
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-5">
        Method Effectiveness
      </h2>
      <div className="space-y-4">
        {stats.map((s, i) => (
          <div key={s.format}>
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={`text-xs font-medium ${FORMAT_TEXT_COLORS[s.format]}`}
              >
                {FORMAT_LABELS[s.format]}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400 dark:text-gray-600">
                  {s.sessionCount}×
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                  {Math.round(s.avgScore * 100)}%
                </span>
                {s.trend > 0.04 && (
                  <svg
                    className="h-3 w-3 text-green-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                )}
                {s.trend < -0.04 && (
                  <svg
                    className="h-3 w-3 text-red-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                )}
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${FORMAT_BAR_COLORS[s.format]} transition-all duration-700 ease-out`}
                style={{
                  width: mounted ? `${Math.round(s.avgScore * 100)}%` : "0%",
                  transitionDelay: `${i * 80}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightsCard({ recommendations }: { recommendations: string[] }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
      <div className="flex items-center gap-2 mb-5">
        <svg
          className="h-4 w-4 text-blue-500 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Insights
        </h2>
      </div>
      <div className="space-y-3.5">
        {recommendations.map((rec, i) => (
          <div key={i} className="flex gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {rec}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentActivityCard({ results }: { results: QuizResult[] }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
        Recent Quizzes
      </h2>
      <div className="space-y-0.5">
        {results.map((r) => {
          const pct = Math.round(r.score * 100);
          const scoreColor =
            pct >= 80
              ? "text-green-600 dark:text-green-400"
              : pct >= 60
              ? "text-blue-600 dark:text-blue-400"
              : "text-amber-600 dark:text-amber-400";
          return (
            <div
              key={r.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <span
                className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${FORMAT_BADGE_COLORS[r.format]}`}
              >
                {FORMAT_LABELS[r.format]}
              </span>
              <span
                className={`text-sm font-semibold tabular-nums ${scoreColor} w-9 shrink-0`}
              >
                {pct}%
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-600 hidden sm:block">
                {r.correctAnswers}/{r.totalQuestions} correct
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-600 hidden sm:block">
                {formatMs(r.timeMs)}
              </span>
              <Stars rating={r.confidenceRating} />
              <span className="ml-auto text-[11px] text-gray-400 dark:text-gray-600 shrink-0">
                {relativeDate(r.createdAt)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
