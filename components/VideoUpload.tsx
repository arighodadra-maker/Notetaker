"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";

interface VideoUploadProps {
  onFileSelect: (file: File | null) => void;
  disabled: boolean;
  selectedFile: File | null;
}

// 500 MB — practical ceiling for in-browser ArrayBuffer + AudioContext decoding.
// Larger files risk OOM crashes in the browser tab. The video track is stripped
// client-side before upload, so only the extracted audio (≤ 24 MB) hits the server.
const MAX_MB = 500;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const ACCEPT = "video/mp4,video/webm,video/quicktime,video/x-msvideo,video/mpeg,video/x-matroska,audio/mpeg,audio/mp4,audio/wav,audio/webm,audio/ogg,audio/x-m4a";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VideoUpload({ onFileSelect, disabled, selectedFile }: VideoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState("");

  const handleFile = (file: File) => {
    setValidationError("");
    if (file.size > MAX_BYTES) {
      setValidationError(`File exceeds ${MAX_MB} MB limit.`);
      onFileSelect(null);
      return;
    }
    onFileSelect(file);
  };

  const onDragEnter = (e: DragEvent) => { e.preventDefault(); if (!disabled) setIsDragging(true); };
  const onDragLeave = (e: DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDragOver  = (e: DragEvent) => { e.preventDefault(); };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clear = () => {
    setValidationError("");
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      {!selectedFile ? (
        <div
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 select-none
            ${isDragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
              : "border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            }
            ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            onChange={onInputChange}
            disabled={disabled}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            {/* Camera icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isDragging ? "Drop video here" : "Drop a video or click to browse"}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                MP4, WebM, MOV, AVI, MKV · up to {MAX_MB} MB
              </p>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Audio files also supported (MP3, WAV, M4A)
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 min-w-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{formatSize(selectedFile.size)}</p>
            </div>
          </div>
          <button
            onClick={clear}
            disabled={disabled}
            className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-40 shrink-0"
            aria-label="Remove video"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {validationError && (
        <p className="text-xs text-red-600 dark:text-red-400">{validationError}</p>
      )}
    </div>
  );
}
