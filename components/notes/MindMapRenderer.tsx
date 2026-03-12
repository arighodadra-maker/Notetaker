"use client";

import { useState } from "react";

interface MindMapRendererProps {
  content: string;
}

function extractMermaidCode(raw: string): string {
  const fenced = raw.match(/```(?:mermaid)?\n?([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return raw.trim();
}

async function downloadAsPdf(code: string, title: string) {
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "loose" });
  const { svg } = await mermaid.render(`pdf-${Date.now()}`, code);

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>${title}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { padding: 24px; font-family: sans-serif; }
      h1 { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #111; }
      svg { width: 100%; height: auto; }
      @media print {
        body { padding: 0; }
        h1 { margin: 12px; }
      }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    ${svg}
    <script>
      window.onload = function() { window.print(); };
    </script>
  </body>
</html>`);
  printWindow.document.close();
}

export default function MindMapRenderer({ content }: MindMapRendererProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const code = extractMermaidCode(content);

  const handleDownload = async () => {
    setLoading(true);
    setError("");
    try {
      await downloadAsPdf(code, "Mind Map");
    } catch {
      setError("Failed to generate PDF. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-10 text-center">
      <div className="text-5xl mb-4">🧠</div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Mind Map Ready
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Your mind map has been generated. Download it as a PDF to view or share it.
      </p>
      {error && <p className="text-red-500 dark:text-red-400 text-sm mb-4">{error}</p>}
      <button
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Preparing PDF...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            Download as PDF
          </>
        )}
      </button>
    </div>
  );
}
