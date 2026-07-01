const MIN_LISTENED_AT = "1900-01-01";
const FUTURE_TOLERANCE_MS = 36 * 60 * 60 * 1000;

export function parseDiaryRating(value: number | null | undefined): number | null {
  if (value === undefined || value === null) return null;
  if (!Number.isInteger(value) || value < 0 || value > 10) {
    throw new Error("INVALID_RATING");
  }
  return value;
}

export function parseListenedAt(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("INVALID_LISTENED_AT");

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const date = dateOnlyMatch
    ? new Date(Date.UTC(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3])))
    : new Date(trimmed);

  if (Number.isNaN(date.getTime())) throw new Error("INVALID_LISTENED_AT");

  const normalized = date.toISOString().slice(0, 10);
  if (dateOnlyMatch && normalized !== trimmed) throw new Error("INVALID_LISTENED_AT");
  if (normalized < MIN_LISTENED_AT) throw new Error("LISTENED_AT_TOO_OLD");
  if (date.getTime() > Date.now() + FUTURE_TOLERANCE_MS) throw new Error("LISTENED_AT_IN_FUTURE");

  return normalized;
}

export function diaryValidationMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : "";
  if (code === "INVALID_RATING") return "La note doit etre un entier entre 0 et 10";
  if (code === "INVALID_LISTENED_AT") return "Date d'ecoute invalide";
  if (code === "LISTENED_AT_TOO_OLD") return "La date d'ecoute est trop ancienne";
  if (code === "LISTENED_AT_IN_FUTURE") return "La date d'ecoute ne peut pas etre dans le futur";
  return "Donnees invalides";
}
