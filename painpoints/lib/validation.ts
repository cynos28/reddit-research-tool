import { MAX_PHRASE_LEN, MIN_PHRASE_LEN } from "@/lib/constants";

export type SettingsInput = { phrases: string[] };

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; field?: string };

function uniqueClean(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const cleaned = items
    .map((item) => String(item).normalize("NFKC").trim())
    .filter(Boolean);
  return [...new Set(cleaned)].slice(0, 50);
}

export function validateSettings(body: unknown): ValidationResult<SettingsInput> {
  const data = (body ?? {}) as Record<string, unknown>;
  const phrases = uniqueClean(data.phrases);

  const invalidPhrase = phrases.find(
    (item) => item.length < MIN_PHRASE_LEN || item.length > MAX_PHRASE_LEN,
  );
  if (invalidPhrase) {
    return {
      ok: false,
      field: "phrases",
      error: `"${invalidPhrase}" must be ${MIN_PHRASE_LEN}–${MAX_PHRASE_LEN} characters.`,
    };
  }
  const regexLike = phrases.find((item) => /[\\^$|()\[\]{}*+?]/.test(item));
  if (regexLike) {
    return {
      ok: false,
      field: "phrases",
      error: `"${regexLike}" contains regex characters; use plain text only.`,
    };
  }
  if (!phrases.length) {
    return { ok: false, field: "phrases", error: "Add at least one search phrase." };
  }

  return { ok: true, value: { phrases } };
}
