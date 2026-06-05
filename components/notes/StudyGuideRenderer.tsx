"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMemo } from "react";

interface StudyGuideRendererProps {
  content: string;
}

interface StudyGuideSections {
  objectives: string;
  concepts: string;
  review: string;
  questions: string;
  tips: string;
}

export default function StudyGuideRenderer({
  content,
}: StudyGuideRendererProps) {
  // Pre-process markdown to extract sections
  const sections = useMemo<StudyGuideSections>(() => {
    const objectivesMatch = content.match(
      /## Learning Objectives\s+([\s\S]*?)(?=##|$)/
    );
    const conceptsMatch = content.match(
      /## Key Concepts\s+([\s\S]*?)(?=##|$)/
    );
    const reviewMatch = content.match(
      /## Content Review\s+([\s\S]*?)(?=##|$)/
    );
    const questionsMatch = content.match(
      /## Practice Questions\s+([\s\S]*?)(?=##|$)/
    );
    const tipsMatch = content.match(/## Study Tips\s+([\s\S]*?)(?=##|$)/);

    return {
      objectives: objectivesMatch?.[1]?.trim() || "",
      concepts: conceptsMatch?.[1]?.trim() || "",
      review: reviewMatch?.[1]?.trim() || "",
      questions: questionsMatch?.[1]?.trim() || "",
      tips: tipsMatch?.[1]?.trim() || "",
    };
  }, [content]);

  return (
    <div className="space-y-4">
      {/* Learning Objectives Section */}
      {sections.objectives && (
        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-4">
          <h3 className="text-sm font-bold text-green-800 dark:text-green-400 uppercase mb-3">
            <svg className="inline h-4 w-4 mr-1.5 align-text-bottom shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
            Learning Objectives
          </h3>
          <div className="prose prose-sm max-w-none dark:prose-invert prose-strong:text-green-700 dark:prose-strong:text-green-400 prose-ul:my-2 prose-li:my-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {sections.objectives}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Key Concepts Section */}
      {sections.concepts && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-sm font-bold text-blue-800 dark:text-blue-400 uppercase mb-3">
            <svg className="inline h-4 w-4 mr-1.5 align-text-bottom shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            Key Concepts & Definitions
          </h3>
          <div className="prose prose-sm max-w-none dark:prose-invert prose-strong:text-primary dark:prose-strong:text-blue-400 prose-ul:my-2 prose-li:my-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {sections.concepts}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Content Review Section */}
      {sections.review && (
        <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase mb-3">
            <svg className="inline h-4 w-4 mr-1.5 align-text-bottom shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
            Content Review
          </h3>
          <div className="prose prose-sm max-w-none dark:prose-invert prose-strong:text-primary dark:prose-strong:text-blue-400 prose-h3:text-base prose-h3:font-semibold prose-ul:my-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {sections.review}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Practice Questions Section */}
      {sections.questions && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <h3 className="text-sm font-bold text-purple-800 dark:text-purple-400 uppercase mb-3">
            <svg className="inline h-4 w-4 mr-1.5 align-text-bottom shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
            Practice Questions
          </h3>
          <div className="prose prose-sm max-w-none dark:prose-invert prose-strong:text-purple-700 dark:prose-strong:text-purple-400 prose-ul:my-2 prose-li:my-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {sections.questions}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Study Tips Section */}
      {sections.tips && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400 uppercase mb-3">
            <svg className="inline h-4 w-4 mr-1.5 align-text-bottom shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>
            Study Tips & Common Mistakes
          </h3>
          <div className="prose prose-sm max-w-none dark:prose-invert prose-strong:text-amber-800 dark:prose-strong:text-amber-400 prose-ul:my-2 prose-li:my-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {sections.tips}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
