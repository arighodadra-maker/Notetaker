/**
 * Client-side PDF text extraction using pdf.js.
 * Runs entirely in the browser — no file is uploaded to the server.
 */

export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");

  // Use the CDN worker so we don't bundle it
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    if (pageText.trim()) pages.push(pageText.trim());
  }

  const text = pages.join("\n\n").replace(/[ \t]+/g, " ").trim();
  if (!text) throw new Error("No text found in PDF. It may be a scanned image or password-protected.");
  return text;
}
