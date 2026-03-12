import { NoteFormat } from "./prompts";
import { StudySession } from "./types";

/**
 * Extract topics from notes based on format
 */
export function extractTopicsFromNotes(
  notes: string,
  format: NoteFormat
): string[] {
  let topics: string[] = [];

  switch (format) {
    case "cornell":
      // Extract ### headers from Notes section
      const notesSection = notes.match(/## Notes\s+([\s\S]*?)(?=### Summary|$)/);
      if (notesSection) {
        topics = extractHeaders(notesSection[1], "###");
      }
      break;

    case "bullet":
      // Extract ## main section headers
      topics = extractHeaders(notes, "##");
      break;

    case "flashcards":
      // Extract flashcard titles, group every 3-4 as one topic
      const flashcardMatches = notes.match(/## Flashcard \d+/g) || [];
      const flashcardCount = flashcardMatches.length;
      const groupSize = 3;
      for (let i = 0; i < flashcardCount; i += groupSize) {
        const endCard = Math.min(i + groupSize, flashcardCount);
        topics.push(`Flashcards ${i + 1}-${endCard}`);
      }
      break;

    case "study-guide":
      // Extract ### subsections from Content Review
      const reviewSection = notes.match(
        /## Content Review\s+([\s\S]*?)(?=##|$)/
      );
      if (reviewSection) {
        topics = extractHeaders(reviewSection[1], "###");
      }
      break;

    default:
      // Fallback: extract any ## headers
      topics = extractHeaders(notes, "##");
  }

  // Filter and clean topics
  return topics
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length < 100)
    .slice(0, 20); // Max 20 topics
}

/**
 * Extract markdown headers of a specific level
 */
function extractHeaders(content: string, level: string): string[] {
  const regex = new RegExp(`^${level}\\s+(.+)$`, "gm");
  const matches = [...content.matchAll(regex)];
  return matches.map((m) => m[1].trim());
}

/**
 * Validate test date
 */
export function validateTestDate(testDate: string): {
  valid: boolean;
  error?: string;
} {
  const date = new Date(testDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  if (isNaN(date.getTime())) {
    return { valid: false, error: "Invalid date format" };
  }

  if (date <= today) {
    return {
      valid: false,
      error: "Test date must be in the future. Please select a later date.",
    };
  }

  const daysUntilTest = Math.ceil(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilTest < 3) {
    return {
      valid: false,
      error: "Need at least 3 days before test to create an effective study schedule. Please extend your test date or start studying immediately!",
    };
  }

  return { valid: true };
}

/**
 * Calculate days between two dates
 */
function calculateDaysDifference(start: Date, end: Date): number {
  const startCopy = new Date(start);
  const endCopy = new Date(end);
  startCopy.setHours(0, 0, 0, 0);
  endCopy.setHours(0, 0, 0, 0);

  return Math.ceil(
    (endCopy.getTime() - startCopy.getTime()) / (1000 * 60 * 60 * 24)
  );
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Generate study schedule with spaced repetition
 */
export function generateStudySchedule(
  notes: string,
  format: NoteFormat,
  testDate: Date
): StudySession[] {
  // Extract topics
  const topics = extractTopicsFromNotes(notes, format);

  if (topics.length === 0) {
    throw new Error(
      "No topics found in notes. Please ensure your notes have section headers (## or ###)."
    );
  }

  // Calculate available days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  testDate.setHours(0, 0, 0, 0);

  const daysUntilTest = calculateDaysDifference(today, testDate);

  // Reserve days for reviews (need space for +1, +3, +7 reviews)
  // Minimum viable: 3 days (1 study, 1 review at +1, 1 final review)
  const minReviewDays = 2; // At least 1 intermediate review + final review
  const studyDaysAvailable = Math.max(1, daysUntilTest - minReviewDays);

  // Distribute topics across study days (max 4 topics per day)
  const maxTopicsPerDay = 4;
  const topicsPerDay = Math.min(
    maxTopicsPerDay,
    Math.ceil(topics.length / studyDaysAvailable)
  );

  // Generate initial study sessions
  const studySessions: StudySession[] = [];
  let currentDate = new Date(today);
  let topicIndex = 0;

  while (topicIndex < topics.length) {
    const dayTopics = topics.slice(topicIndex, topicIndex + topicsPerDay);

    studySessions.push({
      date: currentDate.toISOString().split("T")[0],
      type: "study",
      topics: dayTopics,
    });

    topicIndex += topicsPerDay;
    currentDate = addDays(currentDate, 1);
  }

  // Generate review sessions with spaced repetition
  const reviewSessions = generateReviewSessions(
    studySessions,
    testDate,
    topics
  );

  // Combine and sort all sessions
  const allSessions = [...studySessions, ...reviewSessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return allSessions;
}

/**
 * Generate spaced repetition review sessions
 */
function generateReviewSessions(
  studySessions: StudySession[],
  testDate: Date,
  allTopics: string[]
): StudySession[] {
  const reviews: StudySession[] = [];
  const reviewIntervals = [1, 3, 7]; // Days after initial study

  // For each study session, create reviews at intervals
  studySessions.forEach((session) => {
    const sessionDate = new Date(session.date);

    reviewIntervals.forEach((interval) => {
      const reviewDate = addDays(sessionDate, interval);

      // Only add review if it's before test date
      if (reviewDate < testDate) {
        reviews.push({
          date: reviewDate.toISOString().split("T")[0],
          type: "review",
          topics: session.topics,
          reviewDay: interval,
        });
      }
    });
  });

  // Consolidate reviews on the same day
  const consolidatedReviews = consolidateReviewsByDate(reviews);

  // Add final comprehensive review (day before test)
  const finalReviewDate = addDays(testDate, -1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (finalReviewDate >= today) {
    const finalReviewDateStr = finalReviewDate.toISOString().split("T")[0];

    // Check if there's already a review on this day
    const existingFinalReview = consolidatedReviews.find(
      (r) => r.date === finalReviewDateStr
    );

    if (existingFinalReview) {
      // Ensure all topics are included
      existingFinalReview.topics = allTopics;
      existingFinalReview.reviewDay = 1; // Mark as final review
    } else {
      consolidatedReviews.push({
        date: finalReviewDateStr,
        type: "review",
        topics: allTopics,
        reviewDay: 1, // 1 day before test
      });
    }
  }

  return consolidatedReviews;
}

/**
 * Consolidate multiple reviews on the same day
 */
function consolidateReviewsByDate(
  reviews: StudySession[]
): StudySession[] {
  const reviewMap = new Map<string, StudySession>();

  reviews.forEach((review) => {
    const dateKey = review.date;

    if (reviewMap.has(dateKey)) {
      // Merge topics (remove duplicates)
      const existing = reviewMap.get(dateKey)!;
      const uniqueTopics = [
        ...new Set([...existing.topics, ...review.topics]),
      ];
      existing.topics = uniqueTopics;
      // Keep the earliest review day
      if (
        review.reviewDay &&
        (!existing.reviewDay || review.reviewDay < existing.reviewDay)
      ) {
        existing.reviewDay = review.reviewDay;
      }
    } else {
      reviewMap.set(dateKey, { ...review });
    }
  });

  return Array.from(reviewMap.values());
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Check if date is today
 */
export function isToday(dateStr: string): boolean {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return date.getTime() === today.getTime();
}

/**
 * Calculate days until a date
 */
export function daysUntil(dateStr: string): number {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
