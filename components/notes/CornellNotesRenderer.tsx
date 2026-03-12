"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMemo } from "react";

interface CornellNotesRendererProps {
  content: string;
}

interface CornellSections {
  cues: string;
  notes: string;
  summary: string;
}

export default function CornellNotesRenderer({
  content,
}: CornellNotesRendererProps) {
  // Pre-process markdown to extract sections
  const sections = useMemo<CornellSections>(() => {
    const cuesMatch = content.match(
      /## Cues\s+([\s\S]*?)(?=## Notes|### Summary|$)/
    );
    const notesMatch = content.match(/## Notes\s+([\s\S]*?)(?=### Summary|$)/);
    const summaryMatch = content.match(/### Summary\s+([\s\S]*?)$/);

    return {
      cues: cuesMatch?.[1]?.trim() || "",
      notes: notesMatch?.[1]?.trim() || "",
      summary: summaryMatch?.[1]?.trim() || "",
    };
  }, [content]);

  return (
    <div className="space-y-4">
      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cues Column */}
        <div className="md:col-span-1 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-sm font-bold text-primary uppercase mb-3">
            Cues
          </h3>
          <div className="prose prose-sm max-w-none dark:prose-invert prose-strong:text-primary dark:prose-strong:text-blue-400 prose-ul:my-1 prose-li:my-0.5">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {sections.cues || "_No cues provided_"}
            </ReactMarkdown>
          </div>
        </div>

        {/* Notes Column */}
        <div className="md:col-span-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase mb-3">
            Notes
          </h3>
          <div className="prose prose-sm max-w-none dark:prose-invert prose-strong:text-primary dark:prose-strong:text-blue-400 prose-h3:text-base prose-h3:font-semibold">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {sections.notes || "_No notes provided_"}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      {sections.summary && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400 uppercase mb-3">
            Summary
          </h3>
          <div className="prose prose-sm max-w-none dark:prose-invert prose-strong:text-amber-900 dark:prose-strong:text-amber-400">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {sections.summary}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
