"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginAction } from "@/lib/actions/auth";
import { Suspense } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized:
    "This email is not authorized. Contact jerry@synergiscap.com for access.",
  auth_failed: "Authentication failed. Please try again.",
  missing_code: "Missing authentication code.",
  no_email: "No email associated with this account.",
};

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const urlError = searchParams.get("error");
  const displayError =
    error ?? (urlError ? (ERROR_MESSAGES[urlError] ?? urlError) : null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await loginAction(email, password);
      if (result?.error) {
        setError(ERROR_MESSAGES[result.error] ?? result.error);
        setLoading(false);
      }
    } catch {
      // redirect() throws NEXT_REDIRECT — this is expected on success
      // If it's a real error, it will surface as an unhandled rejection
    }
  }

  return (
    <>
      {displayError && (
        <div className="flex items-start gap-2 mb-5 p-3 rounded-lg bg-[#ffb4ab]/10 text-[#ffb4ab] text-xs">
          <span className="material-symbols-rounded text-sm mt-0.5 shrink-0">
            error
          </span>
          <span>{displayError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[#9a8f80] text-lg">
            mail
          </span>
          <input
            type="email"
            placeholder="you@synergiscap.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-11 pl-10 pr-3 bg-[#262a31] border border-[#4e4639]/30 rounded-lg text-[#dfe2eb] placeholder-[#9a8f80] text-sm font-[var(--font-body)] focus:outline-none focus:ring-1 focus:ring-[#e9c176]/50 focus:border-[#e9c176]/50 transition-colors"
          />
        </div>
        <div className="relative">
          <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[#9a8f80] text-lg">
            lock
          </span>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full h-11 pl-10 pr-3 bg-[#262a31] border border-[#4e4639]/30 rounded-lg text-[#dfe2eb] placeholder-[#9a8f80] text-sm font-[var(--font-body)] focus:outline-none focus:ring-1 focus:ring-[#e9c176]/50 focus:border-[#e9c176]/50 transition-colors"
          />
        </div>

        <label className="flex items-center gap-2 py-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-4 h-4 rounded border-[#4e4639] bg-[#262a31] text-[#e9c176] accent-[#e9c176] cursor-pointer"
          />
          <span className="text-xs text-[#9a8f80]">Remember me</span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-[#e9c176] text-[#412d00] rounded-lg text-sm font-semibold font-[var(--font-headline)] flex items-center justify-center gap-2 hover:bg-[#d4ad63] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Signing in\u2026" : "Sign In"}
          {!loading && (
            <span className="material-symbols-rounded text-lg">
              arrow_forward
            </span>
          )}
        </button>
      </form>

      <p className="text-center text-xs text-[#9a8f80] mt-5">
        First time?{" "}
        <Link
          href="/signup"
          className="text-[#dfe2eb] underline underline-offset-2 hover:text-[#e9c176] transition-colors"
        >
          Set up your account
        </Link>
      </p>

      <p className="text-[11px] text-center text-[#9a8f80]/60 mt-3">
        Invitation-only access
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#10141a]">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#e9c176]/3 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-[#b0c6f9]/3 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm border border-[#4e4639]/20 rounded-2xl shadow-2xl shadow-black/30 bg-[#181c22]/95 backdrop-blur-sm">
        <div className="pt-10 pb-8 px-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e9c176] to-[#c5a059] shadow-lg shadow-[#e9c176]/20">
                <span className="material-symbols-rounded text-[#412d00] text-[28px]">
                  public
                </span>
              </div>
            </div>
            <h1 className="text-xl font-bold tracking-tight font-[var(--font-headline)] text-[#dfe2eb]">
              Orbit
            </h1>
            <p className="text-xs text-[#9a8f80] mt-1.5 font-[var(--font-label)] uppercase tracking-wider">
              Intelligence Hub
            </p>
          </div>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
