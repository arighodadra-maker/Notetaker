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
            🎯 Learning Objectives
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
            📚 Key Concepts & Definitions
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
            📖 Content Review
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
            ✍️ Practice Questions
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
            💡 Study Tips & Common Mistakes
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
