"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { marked } from "marked";
import { useState, useEffect, useRef } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

const TEXT_COLORS = [
  { hex: "#111827", label: "Black" },
  { hex: "#6b7280", label: "Gray" },
  { hex: "#ef4444", label: "Red" },
  { hex: "#f97316", label: "Orange" },
  { hex: "#eab308", label: "Yellow" },
  { hex: "#22c55e", label: "Green" },
  { hex: "#3b82f6", label: "Blue" },
  { hex: "#8b5cf6", label: "Purple" },
];

const HIGHLIGHT_COLORS = [
  { hex: "#fef08a", label: "Yellow" },
  { hex: "#bbf7d0", label: "Green" },
  { hex: "#bfdbfe", label: "Blue" },
  { hex: "#fecdd3", label: "Pink" },
  { hex: "#e9d5ff", label: "Purple" },
  { hex: "#fed7aa", label: "Orange" },
];

function Divider() {
  return <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5 flex-shrink-0" />;
}

function ToolBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // keep editor focus
        onClick();
      }}
      title={title}
      className={`h-7 min-w-[28px] px-1.5 rounded flex items-center justify-center text-[13px] transition-colors select-none
        ${
          active
            ? "bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white"
            : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
        }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const [openPicker, setOpenPicker] = useState<"color" | "highlight" | null>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const isHtml = content.trimStart().startsWith("<");
  const initialContent = isHtml ? content : (marked(content) as string);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: initialContent,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none dark:prose-invert focus:outline-none px-5 py-4 min-h-[420px]",
      },
    },
  });

  // Close pickers when clicking outside
  useEffect(() => {
    if (!openPicker) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const ref = openPicker === "color" ? colorRef.current : highlightRef.current;
      if (ref && !ref.contains(target)) setOpenPicker(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openPicker]);

  if (!editor) return null;

  const currentColor = editor.getAttributes("textStyle").color as string | undefined;

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 sm:px-3 py-1.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/40 flex-wrap sticky top-0 z-10 overflow-x-auto">
        {/* Undo / Redo */}
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Undo (⌘Z)">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
          </svg>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Redo (⌘⇧Z)">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 14 5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
          </svg>
        </ToolBtn>

        <Divider />

        {/* Headings */}
        {([1, 2, 3] as const).map((level) => (
          <ToolBtn
            key={level}
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
            active={editor.isActive("heading", { level })}
            title={`Heading ${level}`}
          >
            <span className="font-semibold tracking-tight">H{level}</span>
          </ToolBtn>
        ))}

        <Divider />

        {/* Inline marks */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold (⌘B)">
          <span className="font-bold">B</span>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic (⌘I)">
          <span className="italic font-medium">I</span>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline (⌘U)">
          <span className="underline font-medium">U</span>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
          <span className="line-through font-medium">S</span>
        </ToolBtn>

        <Divider />

        {/* Text color */}
        <div className="relative" ref={colorRef}>
          <ToolBtn
            onClick={() => setOpenPicker(openPicker === "color" ? null : "color")}
            active={openPicker === "color"}
            title="Text color"
          >
            <span className="flex flex-col items-center gap-[3px]">
              <span className="text-[11px] font-bold leading-none">A</span>
              <span
                className="w-3.5 h-[3px] rounded-full"
                style={{ backgroundColor: currentColor ?? "#111827" }}
              />
            </span>
          </ToolBtn>
          {openPicker === "color" && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 min-w-[120px]">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5 px-0.5">Text Color</p>
              <div className="grid grid-cols-4 gap-1 mb-1.5">
                {TEXT_COLORS.map(({ hex, label }) => (
                  <button
                    key={hex}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      editor.chain().focus().setColor(hex).run();
                      setOpenPicker(null);
                    }}
                    title={label}
                    className="w-6 h-6 rounded border border-gray-200 dark:border-gray-600 hover:scale-110 transition-transform shadow-sm"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().unsetColor().run();
                  setOpenPicker(null);
                }}
                className="w-full text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 py-0.5 text-center"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Highlight */}
        <div className="relative" ref={highlightRef}>
          <ToolBtn
            onClick={() => setOpenPicker(openPicker === "highlight" ? null : "highlight")}
            active={openPicker === "highlight"}
            title="Highlight"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 11-6 6v3h9l3-3" />
              <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
            </svg>
          </ToolBtn>
          {openPicker === "highlight" && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 min-w-[120px]">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5 px-0.5">Highlight</p>
              <div className="grid grid-cols-3 gap-1 mb-1.5">
                {HIGHLIGHT_COLORS.map(({ hex, label }) => (
                  <button
                    key={hex}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      editor.chain().focus().toggleHighlight({ color: hex }).run();
                      setOpenPicker(null);
                    }}
                    title={label}
                    className="w-8 h-6 rounded border border-gray-200 dark:border-gray-600 hover:scale-110 transition-transform shadow-sm"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().unsetHighlight().run();
                  setOpenPicker(null);
                }}
                className="w-full text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 py-0.5 text-center"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <Divider />

        {/* Lists */}
        <ToolBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet list"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
            <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </ToolBtn>
        <ToolBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered list"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
            <path d="M4 6h1v4" strokeLinejoin="round" /><path d="M4 10h2" />
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" strokeLinejoin="round" />
          </svg>
        </ToolBtn>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
