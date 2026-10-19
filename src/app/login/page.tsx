"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/ui/Card";
import Logo from "@/components/ui/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { Sparkle, Starburst } from "@/components/ui/Decor";

// Login + signup on one page. Email/password + Google.
// Beginner note: this runs in the browser, so it only uses the public anon key.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Check your inbox to confirm, then sign in. +");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      // Friendly hint when .env.local is missing
      if (message.includes("supabase") || message.includes("URL")) {
        setMsg("Supabase not configured yet — see README Phase 1 setup.");
      } else {
        setMsg(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Google login failed.");
    }
  }

  return (
    <main className="relative mx-auto grid min-h-screen max-w-md place-items-center overflow-clip px-6 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
        <Sparkle className="absolute left-[8%] top-24 size-5 text-accent-pink animate-float-slow" />
        <Starburst className="absolute right-[6%] top-40 size-12 text-accent-yellow animate-spin-slower" />
        <Sparkle className="absolute bottom-24 right-[12%] size-4 text-accent-mint animate-float-fast" />
      </div>
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <div className="relative w-full">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <Card>
          <h1 className="font-display text-2xl">
            {mode === "signin" ? "Welcome back +" : "Join plusductivity +"}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {mode === "signin"
              ? "Sign in to see your dashboard."
              : "Create an account to save your stuff."}
          </p>

          <button
            onClick={handleGoogle}
            className="mt-5 w-full rounded-full border border-white/15 py-2.5 text-sm hover:bg-white/10"
          >
            Continue with Google
          </button>

          <div className="my-4 text-center text-xs text-zinc-500">or with email</div>

          <form onSubmit={handleEmail} className="flex flex-col gap-3">
            <label className="text-sm">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none focus:border-accent-pink"
              />
            </label>
            <label className="text-sm">
              Password
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none focus:border-accent-pink"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-accent-pink py-2.5 font-semibold text-black disabled:opacity-50"
            >
              {loading ? "…" : mode === "signin" ? "Log in" : "Sign up"}
            </button>
          </form>

          {msg && <p className="mt-4 text-sm text-accent-yellow">{msg}</p>}

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 w-full text-center text-sm text-zinc-400 hover:text-white"
          >
            {mode === "signin"
              ? "No account? Sign up +"
              : "Have an account? Log in"}
          </button>
        </Card>
        <p className="mt-4 text-center text-sm text-zinc-500">
          <Link href="/" className="hover:text-white">← Home</Link>
          {" · "}
          <Link href="/dashboard" className="hover:text-white">Demo dashboard</Link>
        </p>
      </div>
    </main>
  );
}
