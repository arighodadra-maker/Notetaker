"use client";

import { useState } from "react";

interface DiagramsRendererProps {
  content: string; // JSON: { flowchart: string; mindmap: string }
}

function extractMermaidCode(raw: string): string {
  const fenced = raw.match(/```(?:mermaid)?\n?([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return raw.trim();
}

function fixFlowchartSyntax(code: string): string {
  let counter = 0;
  const labelToId = new Map<string, string>();
  const getOrCreateId = (label: string) => {
    const key = label.trim();
    if (!labelToId.has(key)) labelToId.set(key, `n${++counter}`);
    return labelToId.get(key)!;
  };
  return code
    .replace(/(?<![A-Za-z0-9_])\(\s*\)/g, () => `n${++counter}((Start))`)
    .replace(/(?<![A-Za-z0-9_])\(\(([^)]+)\)\)/g, (_, l) => `${getOrCreateId(l)}((${l}))`)
    .replace(/(?<![A-Za-z0-9_])\[([^\]]+)\]/g, (_, l) => `${getOrCreateId(l)}[${l}]`)
    .replace(/(?<![A-Za-z0-9_(])\(([^)]+)\)/g, (_, l) => `${getOrCreateId(l)}(${l})`)
    .replace(/(?<![A-Za-z0-9_])\{([^}]+)\}/g, (_, l) => `${getOrCreateId(l)}{${l}}`);
}

function getSvgDimensions(svgString: string): { width: number; height: number } {
  const viewBox = svgString.match(/viewBox="([^"]+)"/);
  if (viewBox) {
    const parts = viewBox[1].split(/\s+/);
    if (parts.length === 4) {
      return { width: parseFloat(parts[2]), height: parseFloat(parts[3]) };
    }
  }
  const w = svgString.match(/\swidth="([^"]+)"/);
  const h = svgString.match(/\sheight="([^"]+)"/);
  return {
    width: w ? parseFloat(w[1]) : 0,
    height: h ? parseFloat(h[1]) : 0,
  };
}

async function downloadAsPdf(code: string, title: string) {
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "loose" });
  const { svg } = await mermaid.render(`pdf-${Date.now()}`, code);

  const { width, height } = getSvgDimensions(svg);
  const isWide = width > 0 && height > 0 && width > height;

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
      @media print { ${isWide ? "@page { size: landscape; }" : ""} body { padding: 0; } h1 { margin: 12px; } }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    ${svg}
    <script>window.onload = function() { window.print(); };</script>
  </body>
</html>`);
  printWindow.document.close();
}

function DiagramCard({
  emoji,
  title,
  code,
  fixSyntax,
}: {
  emoji: string;
  title: string;
  code: string;
  fixSyntax?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const finalCode = fixSyntax ? fixFlowchartSyntax(code) : code;

  const handleDownload = async () => {
    setLoading(true);
    setError("");
    try {
      await downloadAsPdf(finalCode, title);
    } catch {
      setError("Failed to generate PDF. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-10 text-center">
      <div className="text-5xl mb-4">{emoji}</div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title} Ready</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Download your {title.toLowerCase()} as a PDF to view or share it.
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

export default function DiagramsRenderer({ content }: DiagramsRendererProps) {
  let flowchart = "";
  let mindmap = "";

  try {
    const parsed = JSON.parse(content);
    flowchart = extractMermaidCode(parsed.flowchart ?? "");
    mindmap = extractMermaidCode(parsed.mindmap ?? "");
  } catch {
    return (
      <p className="text-red-500 dark:text-red-400 text-sm">Failed to parse diagram data.</p>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <DiagramCard emoji="🔀" title="Flowchart" code={flowchart} fixSyntax />
      <DiagramCard emoji="🧠" title="Mind Map" code={mindmap} />
    </div>
  );
}
