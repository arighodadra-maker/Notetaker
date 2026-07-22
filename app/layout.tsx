import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "ClassCapsule - AI-Powered Note Taking",
  description: "Transform your lecture transcripts into beautifully formatted notes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider><AuthProvider>{children}</AuthProvider></ThemeProvider>
        <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />
      </body>
    </html>
  );
}
