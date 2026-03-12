"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface BulletNotesRendererProps {
  content: string;
}

export default function BulletNotesRenderer({
  content,
}: BulletNotesRendererProps) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-h2:text-xl prose-h2:font-bold prose-h2:mb-3 prose-h3:text-lg prose-h3:font-semibold prose-h3:mb-2 prose-strong:text-primary dark:prose-strong:text-blue-400 prose-strong:font-semibold prose-ul:my-2 prose-li:my-1">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
