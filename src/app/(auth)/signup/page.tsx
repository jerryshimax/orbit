"use client";

import { useState } from "react";
import Link from "next/link";
import { signUpAction } from "@/lib/actions/auth";

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized:
    "This email is not on the invite list. Contact jerry@synergiscap.com.",
  already_registered: "Account already exists. Please sign in instead.",
};

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);

    const result = await signUpAction(email, password);
    if (result?.error) {
      setError(ERROR_MESSAGES[result.error] ?? result.error);
      setLoading(false);
    }
  }

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
              Set Up Your Account
            </h1>
            <p className="text-xs text-[#9a8f80] mt-1.5 font-[var(--font-label)] uppercase tracking-wider">
              Create a password for your invite
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 mb-5 p-3 rounded-lg bg-[#ffb4ab]/10 text-[#ffb4ab] text-xs">
              <span className="material-symbols-rounded text-sm mt-0.5 shrink-0">
                error
              </span>
              <span>{error}</span>
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
                placeholder="Password (min. 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full h-11 pl-10 pr-3 bg-[#262a31] border border-[#4e4639]/30 rounded-lg text-[#dfe2eb] placeholder-[#9a8f80] text-sm font-[var(--font-body)] focus:outline-none focus:ring-1 focus:ring-[#e9c176]/50 focus:border-[#e9c176]/50 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#e9c176] text-[#412d00] rounded-lg text-sm font-semibold font-[var(--font-headline)] flex items-center justify-center gap-2 hover:bg-[#d4ad63] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creating account\u2026" : "Create Account"}
              {!loading && (
                <span className="material-symbols-rounded text-lg">
                  arrow_forward
                </span>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-[#9a8f80] mt-5">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#dfe2eb] underline underline-offset-2 hover:text-[#e9c176] transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
