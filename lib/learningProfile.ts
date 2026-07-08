import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { NoteFormat } from "@/lib/prompts";

export type TrackableFormat = Exclude<NoteFormat, "diagrams">;

export interface QuizResult {
  id: string;
  format: TrackableFormat;
  score: number;            // 0–1
  totalQuestions: number;
  correctAnswers: number;
  timeMs: number;           // ms from first question to submit
  confidenceRating: number; // 1–5
  createdAt: Date;
}

export interface MethodStats {
  format: TrackableFormat;
  avgScore: number;       // 0–1
  avgConfidence: number;  // 1–5
  sessionCount: number;
  trend: number;          // positive = improving over last 3 sessions
}

export interface LearningProfile {
  totalSessions: number;
  avgScore: number;
  methodStats: MethodStats[];
  recentResults: QuizResult[];
  topFormat: TrackableFormat | null;
  weakestFormat: TrackableFormat | null;
  streak: number;
  recommendations: string[];
}

export const FORMAT_LABELS: Record<TrackableFormat, string> = {
  bullet: "Outline Notes",
  cornell: "Cornell Method",
  flashcards: "Active Recall",
  "study-guide": "Study Guide",
  flowchart: "Visual Flow",
  mindmap: "Mind Map",
};

export const FORMAT_BAR_COLORS: Record<TrackableFormat, string> = {
  bullet: "bg-blue-500",
  cornell: "bg-purple-500",
  flashcards: "bg-green-500",
  "study-guide": "bg-amber-500",
  flowchart: "bg-pink-500",
  mindmap: "bg-teal-500",
};

export const FORMAT_BADGE_COLORS: Record<TrackableFormat, string> = {
  bullet: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  cornell: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  flashcards: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "study-guide": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  flowchart: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  mindmap: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
};

export const FORMAT_TEXT_COLORS: Record<TrackableFormat, string> = {
  bullet: "text-blue-600 dark:text-blue-400",
  cornell: "text-purple-600 dark:text-purple-400",
  flashcards: "text-green-600 dark:text-green-400",
  "study-guide": "text-amber-600 dark:text-amber-400",
  flowchart: "text-pink-600 dark:text-pink-400",
  mindmap: "text-teal-600 dark:text-teal-400",
};

export async function saveQuizResult(
  userId: string,
  result: Omit<QuizResult, "id" | "createdAt">
): Promise<string> {
  const ref = collection(db, "users", userId, "quizResults");
  const docRef = await addDoc(ref, { ...result, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function loadQuizResults(userId: string): Promise<QuizResult[]> {
  const ref = collection(db, "users", userId, "quizResults");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      format: data.format as TrackableFormat,
      score: data.score,
      totalQuestions: data.totalQuestions,
      correctAnswers: data.correctAnswers,
      timeMs: data.timeMs,
      confidenceRating: data.confidenceRating,
      createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    };
  });
}

export function computeLearningProfile(results: QuizResult[]): LearningProfile {
  if (!results.length) {
    return {
      totalSessions: 0,
      avgScore: 0,
      methodStats: [],
      recentResults: [],
      topFormat: null,
      weakestFormat: null,
      streak: 0,
      recommendations: [
        "Take a quiz after generating notes to start building your Learning Profile.",
      ],
    };
  }

  const byFormat = new Map<TrackableFormat, QuizResult[]>();
  for (const r of results) {
    const arr = byFormat.get(r.format) ?? [];
    arr.push(r);
    byFormat.set(r.format, arr);
  }

  const methodStats: MethodStats[] = [];
  for (const [format, fmtResults] of byFormat.entries()) {
    const avgScore =
      fmtResults.reduce((s, r) => s + r.score, 0) / fmtResults.length;
    const avgConfidence =
      fmtResults.reduce((s, r) => s + r.confidenceRating, 0) / fmtResults.length;
    const recent = fmtResults.slice(0, 3);
    const older = fmtResults.slice(3, 6);
    const recentAvg = recent.reduce((s, r) => s + r.score, 0) / recent.length;
    const olderAvg = older.length
      ? older.reduce((s, r) => s + r.score, 0) / older.length
      : recentAvg;
    methodStats.push({
      format,
      avgScore,
      avgConfidence,
      sessionCount: fmtResults.length,
      trend: recentAvg - olderAvg,
    });
  }

  methodStats.sort((a, b) => b.avgScore - a.avgScore);
  const avgScore = results.reduce((s, r) => s + r.score, 0) / results.length;
  const topFormat = methodStats[0]?.format ?? null;
  const weakestFormat =
    methodStats.length > 1 ? methodStats[methodStats.length - 1].format : null;
  const streak = computeStreak(results);
  const recommendations = generateRecommendations(
    methodStats,
    streak,
    avgScore,
    results.length
  );

  return {
    totalSessions: results.length,
    avgScore,
    methodStats,
    recentResults: results.slice(0, 15),
    topFormat,
    weakestFormat,
    streak,
    recommendations,
  };
}

function computeStreak(results: QuizResult[]): number {
  if (!results.length) return 0;
  const days = [
    ...new Set(results.map((r) => r.createdAt.toDateString())),
  ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (const dayStr of days) {
    const day = new Date(dayStr);
    day.setHours(0, 0, 0, 0);
    const diff = Math.round(
      (cursor.getTime() - day.getTime()) / 86400000
    );
    if (diff <= 1) { streak++; cursor = day; }
    else break;
  }
  return streak;
}

function generateRecommendations(
  stats: MethodStats[],
  streak: number,
  avgScore: number,
  total: number
): string[] {
  const tips: string[] = [];
  if (total < 3) {
    tips.push(
      "Complete a few more quizzes to unlock personalized learning insights."
    );
    return tips;
  }

  const top = stats[0];
  const weak = stats[stats.length - 1];

  if (top && weak && top.format !== weak.format) {
    const delta = Math.round((top.avgScore - weak.avgScore) * 100);
    if (delta > 5)
      tips.push(
        `You retain ${delta}% more with ${FORMAT_LABELS[top.format]} than ${FORMAT_LABELS[weak.format]}.`
      );
  }

  if (top)
    tips.push(
      `Prioritize ${FORMAT_LABELS[top.format]} for complex topics — it produces your best results.`
    );

  if (top?.trend > 0.05)
    tips.push(
      `Your ${FORMAT_LABELS[top.format]} scores are trending up. Keep that momentum.`
    );

  if (weak && weak.avgScore < 0.65)
    tips.push(
      `${FORMAT_LABELS[weak.format]} produces lower scores. Use it for review rather than initial learning.`
    );

  if (streak >= 3)
    tips.push(
      `${streak}-day streak — consistent daily practice boosts long-term retention significantly.`
    );

  if (avgScore > 0.8)
    tips.push(
      "Strong overall performance. Try harder questions to keep pushing your limits."
    );
  else if (avgScore < 0.6)
    tips.push(
      "Review your notes thoroughly before quizzing to improve retention scores."
    );

  return tips.slice(0, 4);
}
