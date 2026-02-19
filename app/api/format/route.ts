import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getPrompt, NoteFormat } from "@/lib/prompts";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript, format } = body as {
      transcript: string;
      format: NoteFormat;
    };

    // Validate input
    if (!transcript || typeof transcript !== "string" || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: "Transcript is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (!format || !["cornell", "bullet", "flashcards"].includes(format)) {
      return NextResponse.json(
        { error: "Format must be one of: cornell, bullet, flashcards" },
        { status: 400 }
      );
    }

    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    // Get the appropriate prompt
    const prompt = getPrompt(format, transcript);

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that formats lecture transcripts into well-structured notes.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const notes = completion.choices[0]?.message?.content;

    if (!notes) {
      return NextResponse.json(
        { error: "Failed to generate notes" },
        { status: 500 }
      );
    }

    return NextResponse.json({ notes });
  } catch (error) {
    // Handle OpenAI API errors
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `OpenAI API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred while generating notes" },
      { status: 500 }
    );
  }
}
