import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getQuizPrompt } from "@/lib/prompts";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { notes, count = 6, attempt = 1, mode = "multiple-choice" } = await request.json();

    if (!notes || typeof notes !== "string" || notes.trim().length === 0) {
      return NextResponse.json(
        { error: "Notes are required" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a quiz generator. Always return valid JSON only.",
        },
        {
          role: "user",
          content: getQuizPrompt(notes, count, attempt, mode),
        },
      ],
      temperature: 0.8,
      max_tokens: Math.max(2000, count * 300),
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    const quiz = JSON.parse(content);

    if (!quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      return NextResponse.json(
        { error: "Invalid quiz format returned" },
        { status: 500 }
      );
    }

    return NextResponse.json(quiz);
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `OpenAI API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
