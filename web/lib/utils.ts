import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtNum(x: number | null | undefined, digits = 2): string {
  if (x === null || x === undefined || Number.isNaN(x)) return "—";
  return x.toLocaleString("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtPct(x: number | null | undefined, digits = 1): string {
  if (x === null || x === undefined || Number.isNaN(x)) return "—";
  return `${(x * 100).toLocaleString("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export function fmtDelta(x: number | null | undefined, digits = 2): string {
  if (x === null || x === undefined || Number.isNaN(x)) return "—";
  const sign = x > 0 ? "+" : x < 0 ? "−" : "";
  return `${sign}${Math.abs(x).toLocaleString("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function fmtDeltaPp(x: number | null | undefined, digits = 1): string {
  if (x === null || x === undefined || Number.isNaN(x)) return "—";
  const pp = x * 100;
  const sign = pp > 0 ? "+" : pp < 0 ? "−" : "";
  return `${sign}${Math.abs(pp).toLocaleString("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} п.п.`;
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Russian count nouns: 1 класс / 2 класса / 5 классов
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export const CLASS_NAME_RE = /^(7|8|9|10|11)[А-ЯЁ]$/;

export function normalizeClassNameInput(raw: string): string {
  const m = raw.trim().match(/^(11|10|[1-9])\s*[-–—]?\s*([А-Яа-яЁё])$/);
  if (!m) return raw.trim().toUpperCase();
  return `${Number(m[1])}${m[2].toUpperCase()}`;
}

export function markTone(mark: number): "m5" | "m4" | "m3" | "m2" {
  return mark === 5 ? "m5" : mark === 4 ? "m4" : mark === 3 ? "m3" : "m2";
}

export function categoryTone(category: string): "m5" | "m4" | "m3" | "m2" | "muted" {
  switch (category) {
    case "Отличник (все 5)":
      return "m5";
    case "Одна 4":
    case "Две и более 4":
      return "m4";
    case "Одна 3, без 2":
    case "Две и более 3, без 2":
      return "m3";
    case "Есть оценка 2":
      return "m2";
    default:
      return "muted";
  }
}

export function categoryBadgeVariant(
  category: string,
): "m5" | "m4" | "m3" | "m2" | "outline" {
  const tone = categoryTone(category);
  return tone === "muted" ? "outline" : tone;
}