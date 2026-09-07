"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
      <h1 className="font-display text-sm tracking-[0.22em] text-wax uppercase">Wax Melter</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm text-mute">
          Site password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-lg border border-line bg-panel px-3 py-3 text-ink outline-none focus:border-wax"
            autoFocus
          />
        </label>
        {error ? <p className="text-sm text-warn">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-wax px-4 py-3 text-sm font-medium text-bg disabled:opacity-60"
        >
          {pending ? "Checking…" : "Enter"}
        </button>
      </form>
    </main>
  );
}
