"use client";

import { KeyboardEvent, useState } from "react";

export function ChipInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const next = raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .filter((value) => !values.some((existing) => existing.toLowerCase() === value.toLowerCase()));
    if (!next.length) return;
    onChange([...values, ...next]);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
    }
    if (event.key === "Backspace" && !draft && values.length) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <label className="block text-sm text-mute">
      {label}
      <div className="mt-2 flex min-h-12 flex-wrap gap-2 rounded-lg border border-line bg-panel px-2 py-2">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(values.filter((item) => item !== value))}
            className="rounded-full bg-panel-2 px-2.5 py-1 text-xs text-ink"
          >
            {value} ×
          </button>
        ))}
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          placeholder={values.length ? "" : placeholder}
          className="min-w-32 flex-1 bg-transparent px-1 text-sm text-ink outline-none"
        />
      </div>
    </label>
  );
}
