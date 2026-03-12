import { NextRequest, NextResponse } from "next/server";
import { NoteFormat } from "@/lib/prompts";
import {
  generateStudySchedule,
  validateTestDate,
  extractTopicsFromNotes,
} from "@/lib/calendar";
import { ScheduleRequest, ScheduleResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: ScheduleRequest = await request.json();
    const { notes, format, testDate } = body;

    // Validate inputs
    if (!notes || !format || !testDate) {
      return NextResponse.json(
        { error: "Missing required fields: notes, format, testDate" },
        { status: 400 }
      );
    }

    // Validate format
    if (!["cornell", "bullet", "flashcards", "study-guide"].includes(format)) {
      return NextResponse.json(
        { error: "Invalid format. Must be cornell, bullet, flashcards, or study-guide" },
        { status: 400 }
      );
    }

    // Validate test date
    const dateValidation = validateTestDate(testDate);
    if (!dateValidation.valid) {
      return NextResponse.json(
        { error: dateValidation.error },
        { status: 400 }
      );
    }

    // Generate study schedule
    const testDateObj = new Date(testDate);
    const schedule = generateStudySchedule(notes, format, testDateObj);

    // Calculate metadata
    const topics = extractTopicsFromNotes(notes, format);
    const studySessions = schedule.filter((s) => s.type === "study");
    const reviewSessions = schedule.filter((s) => s.type === "review");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    testDateObj.setHours(0, 0, 0, 0);
    const daysUntilTest = Math.ceil(
      (testDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    const response: ScheduleResponse = {
      schedule,
      metadata: {
        totalTopics: topics.length,
        studyDays: studySessions.length,
        reviewDays: reviewSessions.length,
        daysUntilTest,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Schedule generation error:", error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("No topics found")) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Failed to generate schedule: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate study schedule" },
      { status: 500 }
    );
  }
}
