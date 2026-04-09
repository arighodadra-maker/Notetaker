"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";

interface AuthPageProps {
  onBack: () => void;
}

function parseFirebaseError(code: string): string {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export default function AuthPage({ onBack }: AuthPageProps) {
  const { signIn, signUp, resetPassword, signInWithGoogle } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [view, setView] = useState<"auth" | "reset">("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(parseFirebaseError(code));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (tab === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (tab === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      // AuthProvider will update user state; page.tsx will react and show the tool
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(parseFirebaseError(code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-300">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back
        </button>

        <span
          className="text-sm tracking-tight"
          style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}
        >
          ClassCapsule
        </span>

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

      {/* Form */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {view === "reset" ? (
            /* ── Forgot password view ── */
            <>
              <h1 className="text-2xl mb-1 tracking-tight" style={{ fontFamily: "var(--font-serif)", fontWeight: 400 }}>
                Reset password
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                Enter your email and we'll send a reset link.
              </p>

              {error && (
                <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              {resetSent ? (
                <div className="px-4 py-3 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400 mb-5">
                  Check your inbox — a reset link is on its way.
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      disabled={loading}
                      className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-gray-950 dark:bg-white text-white dark:text-gray-950 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading && (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    {loading ? "Sending…" : "Send reset link"}
                  </button>
                </form>
              )}

              <button
                onClick={() => { setView("auth"); setError(""); setResetSent(false); }}
                className="mt-5 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                ← Back to sign in
              </button>
            </>
          ) : (
            /* ── Sign in / Sign up view ── */
            <>
              <h1 className="text-2xl mb-1 tracking-tight" style={{ fontFamily: "var(--font-serif)", fontWeight: 400 }}>
                {tab === "signin" ? "Welcome back" : "Create an account"}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                {tab === "signin" ? "Sign in to continue to ClassCapsule." : "Get started — it's free."}
              </p>

              {/* Tab toggle */}
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden mb-6">
                {(["signin", "signup"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setError(""); }}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      tab === t
                        ? "bg-gray-950 dark:bg-white text-white dark:text-gray-950"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    }`}
                  >
                    {t === "signin" ? "Sign in" : "Sign up"}
                  </button>
                ))}
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={async () => { setError(""); setLoading(true); try { await signInWithGoogle(); } catch (err: unknown) { setError(parseFirebaseError((err as { code?: string }).code ?? "")); } finally { setLoading(false); } }}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-5"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                <span className="text-xs text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
              </div>

              {error && (
                <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={loading}
                    className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Password</label>
                    {tab === "signin" && (
                      <button
                        type="button"
                        onClick={() => { setView("reset"); setError(""); }}
                        className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tab === "signup" ? "At least 6 characters" : "••••••••"}
                    disabled={loading}
                    className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-colors"
                  />
                </div>

                {tab === "signup" && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Confirm password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={loading}
                      className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-colors"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-gray-950 dark:bg-white text-white dark:text-gray-950 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
                >
                  {loading && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {loading ? "Please wait…" : tab === "signin" ? "Sign in" : "Create account"}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
