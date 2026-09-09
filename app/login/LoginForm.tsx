"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setPending(false);
    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setError(json.error ?? "Could not sign in.");
      return;
    }
    router.push(params.get("next") || "/alerts");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl border border-white/10 bg-panel/70 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
      >
        <h1 className="font-display text-sm tracking-[0.28em] text-wax uppercase">Wax Melter</h1>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm text-mute">
            Site password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-bg/70 px-4 py-3 text-ink outline-none transition focus:border-wax/60"
              autoFocus
            />
          </label>
          {error ? <p className="text-sm text-warn">{error}</p> : null}
          <motion.button
            type="submit"
            disabled={pending}
            whileHover={{ scale: pending ? 1 : 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full rounded-full bg-wax px-4 py-3 text-sm font-medium text-bg disabled:opacity-60"
          >
            {pending ? "Checking..." : "Enter"}
          </motion.button>
        </form>
      </motion.div>
    </main>
  );
}
