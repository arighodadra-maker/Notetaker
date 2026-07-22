import { NoteFormat } from "./prompts";

export type QuizQuestionType = "multiple-choice" | "true-false" | "open-ended" | "fill-blank" | "matching";
export type QuizMode = "multiple-choice" | "true-false" | "open-ended" | "fill-blank" | "matching" | "mixed";

export interface MatchingPair {
  term: string;
  definition: string;
}

export interface QuizQuestion {
  id: number;
  type: QuizQuestionType;
  question: string;
  // multiple-choice and true-false
  options?: string[];
  correctIndex?: number;
  // open-ended
  modelAnswer?: string;
  // fill-blank
  correctAnswer?: string;
  // matching
  matchingPairs?: MatchingPair[];
  explanation: string;
}

export interface StudySession {
  date: string; // ISO date string
  type: "study" | "review";
  topics: string[];
  reviewDay?: number; // 1, 3, or 7 days after initial study
}

export interface ScheduleMetadata {
  totalTopics: number;
  studyDays: number;
  reviewDays: number;
  daysUntilTest: number;
}

export interface ScheduleResponse {
  schedule: StudySession[];
  metadata: ScheduleMetadata;
}

export interface ScheduleRequest {
  notes: string;
  format: NoteFormat;
  testDate: string; // ISO date string
}
