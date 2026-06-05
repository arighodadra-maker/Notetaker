import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "application/vnd.ms-powerpoint",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        maximumSizeInBytes: 100 * 1024 * 1024, // 100 MB
      }),
      // No onUploadCompleted — omitting it prevents Vercel Blob from embedding
      // a callbackUrl in the token, so the CDN won't make a server-to-server
      // webhook call. Without this, local dev hangs at 99% because the CDN
      // can't reach localhost. Cleanup is handled in /api/extract instead.
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
