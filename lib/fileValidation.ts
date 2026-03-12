// Client-side file validation utilities
// This file does NOT import officeparser, so it's safe for browser use

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB in bytes

const SUPPORTED_EXTENSIONS = [".pdf", ".ppt", ".pptx", ".doc", ".docx"];

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate file on the client side before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 100 MB limit (${formatFileSize(file.size)})`,
    };
  }

  // Check file extension
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!extension || !SUPPORTED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: "Please upload PDF, PowerPoint, or Word documents only",
    };
  }

  return { valid: true };
}
