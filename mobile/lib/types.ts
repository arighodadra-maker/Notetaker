// Shared types — kept in sync with the web app's lib/types.ts

export type NoteFormat =
  | "cornell"
  | "bullet"
  | "flashcards"
  | "study-guide"
  | "flowchart"
  | "mindmap"
  | "diagrams";

export type QuizQuestionType =
  | "multiple-choice"
  | "true-false"
  | "open-ended"
  | "fill-blank"
  | "matching";

export type QuizMode =
  | "multiple-choice"
  | "true-false"
  | "open-ended"
  | "fill-blank"
  | "matching"
  | "mixed";

export interface MatchingPair {
  term: string;
  definition: string;
}

export interface QuizQuestion {
  id: number;
  type: QuizQuestionType;
  question: string;
  options?: string[];
  correctIndex?: number;
  modelAnswer?: string;
  correctAnswer?: string;
  matchingPairs?: MatchingPair[];
  explanation: string;
}

export interface StudySession {
  date: string;
  type: "study" | "review";
  topics: string[];
  reviewDay?: number;
}

export interface ScheduleMetadata {
  totalTopics: number;
  studyDays: number;
  reviewDays: number;
  daysUntilTest: number;
}

export interface Session {
  id: string;
  title: string;
  format: NoteFormat;
  notes: string;
  transcript: string;
  subjectId?: string;
  unitId?: string;
  createdAt: Date;
}
