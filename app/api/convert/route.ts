import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getConversionPrompt, NoteFormat } from "@/lib/prompts";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notes, fromFormat, toFormat } = body as {
      notes: string;
      fromFormat: NoteFormat;
      toFormat: string;
    };

    // Validate input
    if (!notes || typeof notes !== "string" || notes.trim().length === 0) {
      return NextResponse.json(
        { error: "Notes are required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (!fromFormat || !["cornell", "bullet", "flashcards", "study-guide"].includes(fromFormat)) {
      return NextResponse.json(
        { error: "Invalid source format. Must be one of: cornell, bullet, flashcards, study-guide" },
        { status: 400 }
      );
    }

    // Don't allow converting from study-guide to study-guide
    if (fromFormat === "study-guide") {
      return NextResponse.json(
        { error: "Notes are already in Study Guide format" },
        { status: 400 }
      );
    }

    // Only support study-guide as target format for now
    if (toFormat !== "study-guide") {
      return NextResponse.json(
        { error: "Only conversion to Study Guide format is currently supported" },
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

    // Get the conversion prompt
    const prompt = getConversionPrompt(fromFormat, notes);

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that converts notes between different educational formats while preserving all content and educational value.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const convertedNotes = completion.choices[0]?.message?.content;

    if (!convertedNotes) {
      return NextResponse.json(
        { error: "Failed to convert notes" },
        { status: 500 }
      );
    }

    return NextResponse.json({ notes: convertedNotes });
  } catch (error) {
    // Handle OpenAI API errors
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `OpenAI API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred while converting notes" },
      { status: 500 }
    );
  }
}
