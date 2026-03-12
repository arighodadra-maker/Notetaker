"use client";

import { StudySession, ScheduleMetadata } from "@/lib/types";
import StudyScheduleCard from "./StudyScheduleCard";

interface StudyScheduleListProps {
  schedule: StudySession[];
  metadata: ScheduleMetadata;
}

export default function StudyScheduleList({
  schedule,
  metadata,
}: StudyScheduleListProps) {
  return (
    <div className="space-y-4">
      {/* Header with metadata */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Study Schedule Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-500 dark:text-gray-400">Total Topics</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {metadata.totalTopics}
            </div>
          </div>
          <div>
            <div className="text-gray-500 dark:text-gray-400">Study Days</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {metadata.studyDays}
            </div>
          </div>
          <div>
            <div className="text-gray-500 dark:text-gray-400">Review Days</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {metadata.reviewDays}
            </div>
          </div>
          <div>
            <div className="text-gray-500 dark:text-gray-400">Days Until Test</div>
            <div className="font-semibold text-primary">
              {metadata.daysUntilTest}
            </div>
          </div>
        </div>
      </div>

      {/* Session List */}
      <div className="space-y-3">
        {schedule.map((session, index) => (
          <StudyScheduleCard key={index} session={session} />
        ))}
      </div>
    </div>
  );
}
