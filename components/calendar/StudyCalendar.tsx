"use client";

import { StudySession } from "@/lib/types";
import { isToday } from "@/lib/calendar";
import { useMemo } from "react";

interface StudyCalendarProps {
  schedule: StudySession[];
  testDate: string; // ISO date string
}

interface CalendarDay {
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  session?: StudySession;
  isTestDay: boolean;
}

export default function StudyCalendar({ schedule, testDate }: StudyCalendarProps) {
  // Generate calendar grid
  const calendarDays = useMemo(() => {
    // Determine which month to show (use first study session or current month)
    const firstSessionDate = schedule.length > 0
      ? new Date(schedule[0].date + "T00:00:00")
      : new Date();

    const year = firstSessionDate.getFullYear();
    const month = firstSessionDate.getMonth();

    // Get first day of month and last day of month
    const firstDayOfMonth = new Date(year, month, 1);

    // Get day of week for first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = firstDayOfMonth.getDay();

    // Calculate start date (may be in previous month)
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - firstDayOfWeek);

    // Generate 42 days (6 weeks) for calendar grid
    const days: CalendarDay[] = [];
    const currentDate = new Date(startDate);

    // Create session map for quick lookup
    const sessionMap = new Map<string, StudySession>();
    schedule.forEach((session) => {
      sessionMap.set(session.date, session);
    });

    for (let i = 0; i < 42; i++) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const isCurrentMonth = currentDate.getMonth() === month;
      const session = sessionMap.get(dateStr);
      const isTestDay = dateStr === testDate;

      days.push({
        date: new Date(currentDate),
        dateStr,
        isCurrentMonth,
        session,
        isTestDay,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { days, month, year };
  }, [schedule, testDate]);

  // Get cell styling based on session type
  const getCellStyle = (day: CalendarDay) => {
    if (!day.isCurrentMonth) {
      return "bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-600";
    }

    if (isToday(day.dateStr)) {
      return "bg-green-100 dark:bg-green-900/40 border-2 border-green-400 font-bold text-gray-900 dark:text-white";
    }

    if (day.isTestDay) {
      return "bg-red-100 dark:bg-red-900/40 border-2 border-red-300 dark:border-red-700 font-bold text-gray-900 dark:text-white";
    }

    if (day.session) {
      if (day.session.type === "study") {
        return "bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-300 dark:border-blue-700 text-gray-900 dark:text-white";
      } else if (day.session.type === "review") {
        return "bg-amber-100 dark:bg-amber-900/40 border-2 border-amber-300 dark:border-amber-700 text-gray-900 dark:text-white";
      }
    }

    return "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700";
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
      {/* Month Header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          {monthNames[calendarDays.month]} {calendarDays.year}
        </h3>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {dayNames.map((day) => (
          <div key={day} className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 pb-2">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.days.map((day, index) => (
          <div
            key={index}
            className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors ${getCellStyle(day)}`}
            title={
              day.session
                ? `${day.session.type === "study" ? "Study" : "Review"}: ${day.session.topics.join(", ")}`
                : day.isTestDay
                ? "Test Day"
                : ""
            }
          >
            <div className="font-medium">{day.date.getDate()}</div>
            {day.session && (
              <div className="text-xs mt-1">
                {day.session.type === "study" ? "📚" : "🔄"}
              </div>
            )}
            {day.isTestDay && (
              <div className="text-xs mt-1">📝</div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-700 dark:text-gray-300">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-100 dark:bg-green-900/40 border-2 border-green-400 rounded"></div>
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-300 dark:border-blue-700 rounded"></div>
          <span>Study</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-amber-100 border-2 border-amber-300 rounded"></div>
          <span>Review</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
          <span>Test Day</span>
        </div>
      </div>
    </div>
  );
}
