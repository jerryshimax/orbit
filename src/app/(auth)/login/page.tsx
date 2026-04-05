"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const allowedDomains = ["synergiscap.com", "neuronvc.io"];
    const domain = email.split("@")[1];
    if (!allowedDomains.includes(domain)) {
      setError("Access restricted to Current Equities team.");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Orbit</h1>
          <p className="text-zinc-400 text-sm mt-1">Current Equities Fund I</p>
        </div>

        {sent ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <p className="text-white text-sm">
              Check your email for a magic link to sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@synergiscap.com"
              required
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600"
            />
            {error && (
              <p className="text-red-400 text-xs">{error}</p>
            )}
            <button
              type="submit"
              className="w-full px-3 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors"
            >
              Sign in with magic link
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
