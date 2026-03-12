"use client";

import { useState } from "react";
import { NoteFormat } from "@/lib/prompts";
import { StudySession, ScheduleMetadata } from "@/lib/types";
import StudyCalendar from "./StudyCalendar";
import StudyScheduleList from "./StudyScheduleList";

interface CalendarViewProps {
  notes: string;
  format: NoteFormat;
}

export default function CalendarView({ notes, format }: CalendarViewProps) {
  const [testDate, setTestDate] = useState("");
  const [schedule, setSchedule] = useState<StudySession[] | null>(null);
  const [metadata, setMetadata] = useState<ScheduleMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerateSchedule = async () => {
    if (!testDate) {
      setError("Please select a test date");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, format, testDate }),
      });

      const data = await response.json();

      if (response.ok) {
        setSchedule(data.schedule);
        setMetadata(data.metadata);
      } else {
        setError(data.error || "Failed to generate schedule");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSchedule(null);
    setMetadata(null);
    setTestDate("");
    setError("");
  };

  // Calculate minimum date (3 days from now)
  const getMinDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    return date.toISOString().split("T")[0];
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      {!schedule && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Create Study Schedule
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Generate a personalized study schedule with spaced repetition reviews
            based on your notes.
          </p>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="testDate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Test Date
              </label>
              <input
                type="date"
                id="testDate"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                min={getMinDate()}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Must be at least 3 days from today
              </p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerateSchedule}
              disabled={loading || !testDate}
              className="w-full bg-primary text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Generating Schedule..." : "Generate Study Schedule"}
            </button>
          </div>
        </div>
      )}

      {/* Schedule Display */}
      {schedule && metadata && (
        <div className="space-y-6">
          {/* Reset Button */}
          <div className="flex justify-end">
            <button
              onClick={handleReset}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline"
            >
              Create New Schedule
            </button>
          </div>

          {/* Calendar Grid View */}
          <StudyCalendar schedule={schedule} testDate={testDate} />

          {/* List View */}
          <StudyScheduleList schedule={schedule} metadata={metadata} />
        </div>
      )}
    </div>
  );
}
