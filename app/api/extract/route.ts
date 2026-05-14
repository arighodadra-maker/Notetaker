import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { extractTextFromBuffer } from "@/lib/fileExtractor";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { blobUrl, fileName, mimeType } = await request.json();

    if (!blobUrl || !fileName) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // Fetch the file from Vercel Blob storage
    const response = await fetch(blobUrl);
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch uploaded file." },
        { status: 400 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text from the buffer
    const transcript = await extractTextFromBuffer(buffer, fileName, mimeType);

    // Clean up the blob after extraction (best-effort)
    await del(blobUrl).catch(() => {});

    return NextResponse.json({ transcript });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while processing your file. Please try again.",
      },
      { status: 500 }
    );
  }
}
