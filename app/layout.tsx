import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NotesAI - AI-Powered Note Taking",
  description: "Transform your lecture transcripts into beautifully formatted notes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
