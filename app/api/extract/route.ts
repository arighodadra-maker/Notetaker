import { NextRequest, NextResponse } from "next/server";
import { extractTextFromFile } from "@/lib/fileExtractor";

export async function POST(request: NextRequest) {
  try {
    // Parse FormData from the request
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    // Validate that a file was provided
    if (!file) {
      return NextResponse.json(
        { error: "No file provided. Please upload a document." },
        { status: 400 }
      );
    }

    // Validate that it's actually a File object
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Invalid file upload. Please try again." },
        { status: 400 }
      );
    }

    // Extract text from the uploaded file
    const transcript = await extractTextFromFile(file);

    // Return the extracted text
    return NextResponse.json({ transcript });
  } catch (error) {
    // Handle known errors with user-friendly messages
    if (error instanceof Error) {
      // These are validation or extraction errors with user-friendly messages
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Handle unexpected errors
    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while processing your file. Please try again.",
      },
      { status: 500 }
    );
  }
}
