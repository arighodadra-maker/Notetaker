"use client";

import { StudySession } from "@/lib/types";
import { formatDate, isToday } from "@/lib/calendar";

interface StudyScheduleCardProps {
  session: StudySession;
}

export default function StudyScheduleCard({ session }: StudyScheduleCardProps) {
  const isTodaySession = isToday(session.date);

  // Determine badge style based on session type and review day
  const getBadgeStyle = () => {
    if (session.type === "review" && session.reviewDay === 1) {
      return "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700";
    } else if (session.type === "review") {
      return "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700";
    } else {
      return "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700";
    }
  };

  const getBadgeText = () => {
    if (session.type === "review" && session.reviewDay === 1) {
      return "Final Review";
    } else if (session.type === "review") {
      return `Review (Day +${session.reviewDay})`;
    } else {
      return "Study";
    }
  };

  return (
    <div
      className={`rounded-lg border-2 p-4 ${
        isTodaySession
          ? "border-green-400 bg-green-50 dark:bg-green-900/20"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      }`}
    >
      {/* Date Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {formatDate(session.date)}
          {isTodaySession && (
            <span className="ml-2 text-sm text-green-600 dark:text-green-400 font-bold">
              (Today)
            </span>
          )}
        </h3>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold border ${getBadgeStyle()}`}
        >
          {getBadgeText()}
        </span>
      </div>

      {/* Topics List */}
      <div className="space-y-1">
        {session.topics.map((topic, index) => (
          <div key={index} className="flex items-start">
            <span className="text-primary mr-2">•</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">{topic}</span>
          </div>
        ))}
      </div>

      {/* Topic Count */}
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        {session.topics.length} topic{session.topics.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
