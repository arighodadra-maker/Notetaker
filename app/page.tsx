"use client";

import { useState } from "react";
import { NoteFormat } from "@/lib/prompts";
import FileUpload from "@/components/FileUpload";

type InputMode = "text" | "file";

export default function Home() {
  // Input mode state
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Existing state
  const [transcript, setTranscript] = useState("");
  const [format, setFormat] = useState<NoteFormat>("bullet");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleModeSwitch = (mode: InputMode) => {
    setInputMode(mode);
    setError("");
    // Clear the non-active input
    if (mode === "text") {
      setSelectedFile(null);
    } else {
      setTranscript("");
    }
  };

  const handleGenerate = async () => {
    // Validate input based on mode
    if (inputMode === "text" && !transcript.trim()) {
      setError("Please enter a transcript");
      return;
    }

    if (inputMode === "file" && !selectedFile) {
      setError("Please select a file to upload");
      return;
    }

    setLoading(true);
    setError("");
    setNotes("");

    let transcriptText = transcript;

    try {
      // If file mode, extract text first
      if (inputMode === "file" && selectedFile) {
        setExtracting(true);

        const formData = new FormData();
        formData.append("file", selectedFile);

        const extractResponse = await fetch("/api/extract", {
          method: "POST",
          body: formData,
        });

        const extractData = await extractResponse.json();

        if (!extractResponse.ok) {
          throw new Error(extractData.error || "Failed to extract text");
        }

        transcriptText = extractData.transcript;
        setExtracting(false);
      }

      // Format the transcript into notes
      const response = await fetch("/api/format", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript: transcriptText, format }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate notes");
      }

      setNotes(data.notes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      setExtracting(false);
    }
  };

  const handleCopy = async () => {
    if (!notes) return;

    try {
      await navigator.clipboard.writeText(notes);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError("Failed to copy to clipboard");
    }
  };

  const isGenerateDisabled =
    loading ||
    extracting ||
    (inputMode === "text" ? !transcript.trim() : !selectedFile);

  const getButtonText = () => {
    if (extracting) return "Extracting text...";
    if (loading) return "Generating notes...";
    return "Generate Notes";
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">NotesAI</h1>
          <p className="text-lg text-gray-600">
            Transform your lecture transcripts and documents into beautifully
            formatted notes
          </p>
        </header>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <p className="font-medium">Error: {error}</p>
          </div>
        )}

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {/* Tab Switcher */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Lecture Transcript
            </label>
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => handleModeSwitch("text")}
                disabled={loading || extracting}
                className={`
                  px-6 py-2 text-sm font-medium transition-all duration-200 border-b-2 -mb-px
                  ${
                    inputMode === "text"
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                  ${loading || extracting ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                Text Input
              </button>
              <button
                onClick={() => handleModeSwitch("file")}
                disabled={loading || extracting}
                className={`
                  px-6 py-2 text-sm font-medium transition-all duration-200 border-b-2 -mb-px
                  ${
                    inputMode === "file"
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                  ${loading || extracting ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                Upload File
              </button>
            </div>
          </div>

          {/* Text Input Mode */}
          {inputMode === "text" && (
            <div className="mb-4">
              <textarea
                id="transcript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste your lecture transcript here..."
                rows={10}
                disabled={loading || extracting}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-y min-h-[200px] bg-gray-50 disabled:opacity-50"
              />
            </div>
          )}

          {/* File Upload Mode */}
          {inputMode === "file" && (
            <div className="mb-4">
              <FileUpload
                onFileSelect={setSelectedFile}
                disabled={loading || extracting}
                selectedFile={selectedFile}
              />
            </div>
          )}

          {/* Format Selector */}
          <div className="mb-6">
            <label
              htmlFor="format"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Format
            </label>
            <select
              id="format"
              value={format}
              onChange={(e) => setFormat(e.target.value as NoteFormat)}
              disabled={loading || extracting}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white disabled:opacity-50"
            >
              <option value="bullet">Bullet Points</option>
              <option value="cornell">Cornell Notes</option>
              <option value="flashcards">Flashcards</option>
            </select>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerateDisabled}
            className="w-full bg-primary hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            {loading || extracting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {getButtonText()}
              </>
            ) : (
              "Generate Notes"
            )}
          </button>
        </div>

        {/* Output Section */}
        {notes && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Generated Notes
              </h2>
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-200 text-sm"
              >
                {copied ? "Copied!" : "Copy to Clipboard"}
              </button>
            </div>
            <div className="prose prose-sm max-w-none bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-x-auto">
              <pre className="whitespace-pre-wrap font-sans text-gray-800">
                {notes}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
