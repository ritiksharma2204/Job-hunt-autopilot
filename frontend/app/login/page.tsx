"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"error" | "success">("error");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    if (mode === "login") {
      const result = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (result.error) {
        setStatusType("error");
        setStatus(result.error.message);
        return;
      }
      router.push("/dashboard");
      return;
    }

    // Signup
    const result = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (result.error) {
      setStatusType("error");
      setStatus(result.error.message);
      return;
    }

    if (!result.data.session) {
      // Email confirmation is required - there's no session yet, so don't redirect.
      setStatusType("success");
      setStatus("Account created! Check your email for a confirmation link before logging in.");
      setMode("login");
      return;
    }

    // Some Supabase projects have email confirmation disabled - session exists immediately.
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/10">
            <span className="font-mono text-sm font-semibold text-amber-400">JA</span>
          </div>
          <h1 className="font-display text-xl font-semibold text-fog-100">Job-Hunt Autopilot</h1>
          <p className="mt-1 text-sm text-fog-300">
            {mode === "login" ? "Log in to your pipeline" : "Create your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-ink-700 bg-ink-900/60 p-6 shadow-xl backdrop-blur">
          <label className="mb-1 block text-xs font-medium text-fog-300">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-fog-100 outline-none placeholder:text-fog-300/40 focus:border-amber-500"
            placeholder="you@example.com"
          />

          <label className="mb-1 block text-xs font-medium text-fog-300">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-fog-100 outline-none placeholder:text-fog-300/40 focus:border-amber-500"
            placeholder="password"
          />

          {status && (
            <p className={`mb-4 text-xs ${statusType === "success" ? "text-signal-teal" : "text-signal-coral"}`}>
              {status}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-amber-500 py-2 text-sm font-semibold text-ink-950 transition hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? "Please wait..." : mode === "login" ? "Log In" : "Sign Up"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setStatus(null);
          }}
          className="mt-4 w-full text-center text-sm text-fog-300 hover:text-amber-400"
        >
          {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
