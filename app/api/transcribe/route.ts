import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai/uploads";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB — Whisper limit

const ACCEPTED_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/mpeg",
  "video/x-matroska",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
]);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!ACCEPTED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload an MP4, WebM, MOV, AVI, MKV, or audio file." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Whisper supports a maximum of 25 MB." },
        { status: 400 }
      );
    }

    const transcription = await openai.audio.transcriptions.create({
      file: await toFile(file, file.name, { type: file.type }),
      model: "whisper-1",
      response_format: "text",
    });

    return NextResponse.json({ transcript: transcription });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to transcribe the video. Please try again." },
      { status: 500 }
    );
  }
}

