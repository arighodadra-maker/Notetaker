"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { validateFile, formatFileSize } from "@/lib/fileValidation";

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  disabled: boolean;
  selectedFile: File | null;
}

export default function FileUpload({
  onFileSelect,
  disabled,
  selectedFile,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    setValidationError("");

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setValidationError(validation.error || "Invalid file");
      onFileSelect(null);
      return;
    }

    // File is valid
    onFileSelect(file);
  };

  const handleClearFile = () => {
    setValidationError("");
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      {/* Drag and Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${
            isDragging
              ? "border-primary bg-blue-50"
              : "border-gray-300 bg-gray-50"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary hover:bg-gray-100"}
        `}
        onClick={!disabled ? handleButtonClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          accept=".pdf,.ppt,.pptx,.doc,.docx"
          disabled={disabled}
          className="hidden"
        />

        <div className="space-y-3">
          {/* Upload Icon */}
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Instructions */}
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-700">
              {isDragging
                ? "Drop your file here"
                : "Drag and drop your file here"}
            </p>
            <p className="text-xs text-gray-500 mt-1">or click to browse</p>
          </div>

          {/* Supported Formats */}
          <p className="text-xs text-gray-400">
            Supports: PDF, PowerPoint (.ppt, .pptx), Word (.doc, .docx)
          </p>
          <p className="text-xs text-gray-400">Maximum file size: 100 MB</p>
        </div>
      </div>

      {/* Selected File Display */}
      {selectedFile && !validationError && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* File Icon */}
            <svg
              className="h-8 w-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
          </div>

          {/* Remove Button */}
          <button
            onClick={handleClearFile}
            disabled={disabled}
            className="ml-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Remove file"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Validation Error */}
      {validationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{validationError}</p>
        </div>
      )}
    </div>
  );
}
