"use client";

import { useState } from "react";
import { NoteFormat } from "@/lib/prompts";
import { StudySession, ScheduleMetadata } from "@/lib/types";
import StudyCalendar from "./StudyCalendar";
import StudyScheduleList from "./StudyScheduleList";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

function nextDay(iso: string): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0];
}

function buildGoogleEvent(session: StudySession) {
  const prefix = session.type === "study" ? "Study" : "Review";
  const topicList =
    session.topics.slice(0, 3).join(", ") + (session.topics.length > 3 ? "…" : "");
  return {
    summary: `${prefix}: ${topicList}`,
    description: `Topics: ${session.topics.join(", ")}`,
    start: { date: session.date },
    end: { date: nextDay(session.date) },
    reminders: {
      useDefault: false,
      overrides: [{ method: "popup", minutes: 480 }],
    },
  };
}

async function exportToGoogleCalendar(
  schedule: StudySession[],
  testDate: string,
  onProgress: (done: number, total: number) => void
): Promise<void> {
  if (!window.google?.accounts?.oauth2) {
    throw new Error("Google sign-in library not loaded. Please refresh and try again.");
  }
  if (!GOOGLE_CLIENT_ID) {
    throw new Error(
      "Google Calendar is not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to your environment."
    );
  }

  return new Promise((resolve, reject) => {
    const tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/calendar.events",
      callback: async (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error ?? "Authorization failed or was cancelled"));
          return;
        }

        const events = [
          ...schedule.map(buildGoogleEvent),
          {
            summary: "🎯 Test Day",
            description: "Exam day",
            start: { date: testDate },
            end: { date: nextDay(testDate) },
          },
        ];

        try {
          for (let i = 0; i < events.length; i++) {
            onProgress(i, events.length);
            const res = await fetch(
              "https://www.googleapis.com/calendar/v3/calendars/primary/events",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${response.access_token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(events[i]),
              }
            );
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
            }
          }
          onProgress(events.length, events.length);
          resolve();
        } catch (err) {
          reject(err);
        }
      },
    });

    tokenClient.requestAccessToken();
  });
}

// ── ICS fallback ─────────────────────────────────────────────────────────────

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function toICSDate(iso: string): string {
  return iso.replace(/-/g, "");
}

function nextDayICS(iso: string): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0].replace(/-/g, "");
}

function buildICS(schedule: StudySession[], testDate: string): string {
  const now = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ClassCapsule//Study Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Study Schedule",
  ];

  for (const session of schedule) {
    const summary =
      session.type === "study"
        ? `Study: ${session.topics.slice(0, 3).join(", ")}${session.topics.length > 3 ? "…" : ""}`
        : `Review: ${session.topics.slice(0, 3).join(", ")}${session.topics.length > 3 ? "…" : ""}`;
    const description = `${session.type === "study" ? "Study" : "Review"} session\\nTopics: ${session.topics.join(", ")}`;
    lines.push(
      "BEGIN:VEVENT",
      `DTSTART;VALUE=DATE:${toICSDate(session.date)}`,
      `DTEND;VALUE=DATE:${nextDayICS(session.date)}`,
      `DTSTAMP:${now}`,
      `UID:cc-${session.date}-${session.type}@classcapsule`,
      `SUMMARY:${escapeICS(summary)}`,
      `DESCRIPTION:${escapeICS(description)}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT8H",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeICS(summary)}`,
      "END:VALARM",
      "END:VEVENT"
    );
  }

  lines.push(
    "BEGIN:VEVENT",
    `DTSTART;VALUE=DATE:${toICSDate(testDate)}`,
    `DTEND;VALUE=DATE:${nextDayICS(testDate)}`,
    `DTSTAMP:${now}`,
    `UID:cc-testday-${testDate}@classcapsule`,
    "SUMMARY:🎯 Test Day",
    "DESCRIPTION:Exam day",
    "END:VEVENT",
    "END:VCALENDAR"
  );

  return lines.join("\r\n");
}

function downloadICS(schedule: StudySession[], testDate: string) {
  const content = buildICS(schedule, testDate);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "study-schedule.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────

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

  const [gcalStatus, setGcalStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [gcalProgress, setGcalProgress] = useState({ done: 0, total: 0 });
  const [gcalError, setGcalError] = useState("");

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
    } catch {
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
    setGcalStatus("idle");
    setGcalProgress({ done: 0, total: 0 });
    setGcalError("");
  };

  const handleGoogleExport = async () => {
    if (!schedule) return;
    setGcalStatus("loading");
    setGcalError("");
    setGcalProgress({ done: 0, total: schedule.length + 1 });
    try {
      await exportToGoogleCalendar(schedule, testDate, (done, total) => {
        setGcalProgress({ done, total });
      });
      setGcalStatus("success");
    } catch (err) {
      setGcalStatus("error");
      setGcalError(err instanceof Error ? err.message : "Export failed");
    }
  };

  const getMinDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    return date.toISOString().split("T")[0];
  };

  return (
    <div className="space-y-6">
      {!schedule && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Create Study Schedule
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Generate a personalized study schedule with spaced repetition reviews based on your
            notes.
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

      {schedule && metadata && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Primary: direct Google Calendar */}
            <button
              onClick={handleGoogleExport}
              disabled={gcalStatus === "loading" || gcalStatus === "success"}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5C3.89 3 3.01 3.9 3.01 5L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
              </svg>
              {gcalStatus === "loading"
                ? `Adding events… (${gcalProgress.done}/${gcalProgress.total})`
                : gcalStatus === "success"
                ? `✓ Added to Google Calendar`
                : "Add to Google Calendar"}
            </button>

            {/* Fallback: download .ics */}
            <button
              onClick={() => downloadICS(schedule, testDate)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
              </svg>
              Download .ics
            </button>

            <button
              onClick={handleReset}
              className="ml-auto text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              New schedule
            </button>
          </div>

          {gcalStatus === "error" && gcalError && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
              {gcalError}
            </div>
          )}

          <StudyCalendar schedule={schedule} testDate={testDate} />
          <StudyScheduleList schedule={schedule} metadata={metadata} />
        </div>
      )}
    </div>
  );
}
