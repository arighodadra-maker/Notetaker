import { parseOfficeAsync } from "officeparser";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB in bytes

const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.ms-powerpoint", // .ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];

const SUPPORTED_EXTENSIONS = [".pdf", ".ppt", ".pptx", ".doc", ".docx"];

/**
 * Extract text from uploaded document files (PDF, PowerPoint, Word)
 */
export async function extractTextFromFile(file: File): Promise<string> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds 10 MB limit. Your file is ${(file.size / (1024 * 1024)).toFixed(1)} MB.`
    );
  }

  // Validate file type by extension
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!extension || !SUPPORTED_EXTENSIONS.includes(extension)) {
    throw new Error(
      "Unsupported file type. Please upload PDF, PowerPoint (.ppt, .pptx), or Word (.doc, .docx) documents."
    );
  }

  // Validate MIME type (additional security check)
  if (file.type && !SUPPORTED_MIME_TYPES.includes(file.type)) {
    throw new Error(
      "Invalid file format. Please upload a valid document file."
    );
  }

  try {
    // Convert File to Buffer for officeparser
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text using officeparser
    const data = await parseOfficeAsync(buffer, {
      newlineDelimiter: "\n", // Use newline for better readability
      ignoreNotes: false, // Include speaker notes from presentations
    });

    // Clean and normalize the extracted text
    const cleanedText = cleanText(data);

    // Validate that we extracted some text
    if (!cleanedText || cleanedText.trim().length === 0) {
      throw new Error(
        "No text found in document. Please upload a file with text content."
      );
    }

    return cleanedText;
  } catch (error) {
    // If it's one of our custom errors, re-throw it
    if (error instanceof Error && error.message.includes("File size exceeds")) {
      throw error;
    }
    if (error instanceof Error && error.message.includes("Unsupported file type")) {
      throw error;
    }
    if (error instanceof Error && error.message.includes("No text found")) {
      throw error;
    }

    // For parsing errors, provide a user-friendly message
    throw new Error(
      "Unable to extract text from file. The file may be corrupted or password-protected. Please try a different document or paste text manually."
    );
  }
}

/**
 * Clean and normalize extracted text
 */
function cleanText(text: string): string {
  return (
    text
      // Remove excessive whitespace
      .replace(/\n{3,}/g, "\n\n") // Max 2 consecutive newlines
      .replace(/[ \t]+/g, " ") // Multiple spaces/tabs to single space
      // Trim each line
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      // Trim overall text
      .trim()
  );
}
