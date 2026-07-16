"use client";

import { NoteFormat } from "@/lib/prompts";
import BulletNotesRenderer from "./notes/BulletNotesRenderer";
import CornellNotesRenderer from "./notes/CornellNotesRenderer";
import FlashcardsRenderer from "./notes/FlashcardsRenderer";
import StudyGuideRenderer from "./notes/StudyGuideRenderer";
import FlowchartRenderer from "./notes/FlowchartRenderer";
import MindMapRenderer from "./notes/MindMapRenderer";
import DiagramsRenderer from "./notes/DiagramsRenderer";

interface MarkdownRendererProps {
  content: string;
  format: NoteFormat;
}

export default function MarkdownRenderer({
  content,
  format,
}: MarkdownRendererProps) {
  // After WYSIWYG editing, content is stored as HTML
  if (content.trimStart().startsWith("<")) {
    return (
      <div
        className="px-5 py-4 prose prose-sm max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  switch (format) {
    case "bullet":
      return <BulletNotesRenderer content={content} />;
    case "cornell":
      return <CornellNotesRenderer content={content} />;
    case "flashcards":
      return <FlashcardsRenderer content={content} />;
    case "study-guide":
      return <StudyGuideRenderer content={content} />;
    case "flowchart":
      return <FlowchartRenderer content={content} />;
    case "mindmap":
      return <MindMapRenderer content={content} />;
    case "diagrams":
      return <DiagramsRenderer content={content} />;
    default:
      return <BulletNotesRenderer content={content} />;
  }
}
