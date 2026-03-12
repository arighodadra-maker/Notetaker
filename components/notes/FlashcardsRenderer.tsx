"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMemo } from "react";

interface FlashcardsRendererProps {
  content: string;
}

interface Flashcard {
  id: number;
  question: string;
  answer: string;
}

export default function FlashcardsRenderer({
  content,
}: FlashcardsRendererProps) {
  // Pre-process markdown to extract flashcards
  const flashcards = useMemo<Flashcard[]>(() => {
    const cards: Flashcard[] = [];
    const sections = content.split(/## Flashcard \d+/);

    sections.forEach((section, index) => {
      if (index === 0) return; // Skip intro text

      // Extract Q: and A: sections
      const qMatch = section.match(/\*\*Q:\*\*\s*(.+?)(?=\*\*A:\*\*)/s);
      const aMatch = section.match(/\*\*A:\*\*\s*(.+?)$/s);

      if (qMatch && aMatch) {
        cards.push({
          id: index,
          question: qMatch[1].trim(),
          answer: aMatch[1].trim(),
        });
      }
    });

    return cards;
  }, [content]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {flashcards.map((card) => (
        <div
          key={card.id}
          className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-primary dark:hover:border-primary transition-colors duration-200 shadow-sm hover:shadow-md"
        >
          <div className="mb-3">
            <div className="text-xs font-semibold text-primary uppercase mb-2">
              Question
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert prose-strong:text-primary dark:prose-strong:text-blue-400">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {card.question}
              </ReactMarkdown>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">
              Answer
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert prose-strong:text-primary dark:prose-strong:text-blue-400">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {card.answer}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
