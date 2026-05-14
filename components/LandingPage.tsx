"use client";

import { useTheme } from "@/components/ThemeProvider";

interface LandingPageProps {
  onStart: () => void;
}

const CAPABILITIES = [
  { label: "Bullet Notes", group: "formats" },
  { label: "Cornell Notes", group: "formats" },
  { label: "Flashcards", group: "formats" },
  { label: "Study Guides", group: "formats" },
  { label: "Flowcharts", group: "visual" },
  { label: "Mind Maps", group: "visual" },
  { label: "Quizzes", group: "practice" },
  { label: "Study Calendar", group: "practice" },
];

const FEATURES = [
  {
    label: "8 output formats",
    desc: "From quick bullet points to full Cornell notes, flashcards, and study guides.",
  },
  {
    label: "Adaptive quizzes",
    desc: "Multiple choice, true/false, and open-ended questions. Every generation is different.",
  },
  {
    label: "Visual diagrams",
    desc: "Flowcharts and mind maps generated from your content, downloadable as PDF.",
  },
  {
    label: "Study calendar",
    desc: "A personalized review schedule built automatically from your notes.",
  },
];

export default function LandingPage({ onStart }: LandingPageProps) {
  const { theme, toggleTheme } = useTheme();

  const dotColor =
    theme === "dark"
      ? "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)"
      : "radial-gradient(circle, rgba(0,0,0,0.09) 1px, transparent 1px)";

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-300">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5">
        <span className="text-sm tracking-tight text-gray-900 dark:text-white" style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}>ClassCapsule</span>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
        {/* Dot grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: dotColor,
            backgroundSize: "26px 26px",
          }}
        />

        <div className="relative z-10 max-w-xl w-full text-center">
          {/* Eyebrow */}
          <p
            className="anim-fade-up text-[11px] font-medium tracking-[0.22em] uppercase text-blue-500 mb-7"
            style={{ animationDelay: "0ms" }}
          >
            AI-powered note taking
          </p>

          {/* Headline */}
          <h1
            className="anim-fade-up text-gray-900 dark:text-white leading-[1.08] mb-5"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(2.6rem, 6vw, 4.2rem)",
              animationDelay: "80ms",
            }}
          >
            Your lectures,
            <br />
            <em>organized.</em>
          </h1>

          {/* Subheading */}
          <p
            className="anim-fade-up text-gray-500 dark:text-gray-400 text-base leading-relaxed max-w-md mx-auto"
            style={{ animationDelay: "160ms" }}
          >
            Paste a transcript or upload a document — get structured notes, quizzes,
            flowcharts, and a study calendar in seconds.
          </p>

          {/* Divider + capability tags */}
          <div
            className="anim-fade-up mt-8 mb-8"
            style={{ animationDelay: "240ms" }}
          >
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2">
                {CAPABILITIES.map((cap, i) => (
                  <span key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {cap.label}
                    </span>
                    {i < CAPABILITIES.length - 1 && (
                      <span className="text-gray-200 dark:text-gray-700 text-xs">·</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div
            className="anim-fade-up"
            style={{ animationDelay: "320ms" }}
          >
            <button
              onClick={onStart}
              className="inline-flex items-center gap-2.5 bg-gray-950 dark:bg-white text-white dark:text-gray-950 text-sm font-medium px-7 py-3.5 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors duration-200 shadow-sm"
            >
              Open the app
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </main>

      {/* Feature strip */}
      <section
        className="border-t border-gray-100 dark:border-gray-800 px-8 py-10 anim-fade-up"
        style={{ animationDelay: "440ms" }}
      >
        <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {FEATURES.map((f, i) => (
            <div key={i}>
              <p className="text-xs font-semibold text-gray-900 dark:text-white mb-1">
                {f.label}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-4 text-center border-t border-gray-100 dark:border-gray-800">
        <p className="text-[11px] text-gray-300 dark:text-gray-700">
          No account required · Works with any transcript, PDF, or document
        </p>
      </footer>
    </div>
  );
}
