import * as XLSX from "xlsx";
import { buildPayload } from "./arith";
import type { Payload } from "./types";
import type { SourceFrame } from "./arith";

export class ParseError extends Error {}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function cellNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = cellText(value).replace(",", ".");
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

export function detectGrade(text: string): number | null {
  const m = text.match(/(?<!\d)(11|10|[7-9])(?!\d)/);
  return m ? Number(m[1]) : null;
}

export function detectDate(text: string): string | null {
  const m = text.match(/\d{2}\.\d{2}\.\d{4}/);
  return m ? m[0] : null;
}

export function normalizeClassName(text: string): string | null {
  const m = text.match(/(?<!\d)(11|10|[1-9])\s*[-–]?\s*([А-ЯЁ])/i);
  if (!m) return null;
  return `${Number(m[1])}${m[2].toUpperCase()}`;
}

export interface ParsedExport {
  frame: SourceFrame;
  dataDate: string;
  periodStart: string;
  className: string | null;
  grade: number | null;
}

// Some exporters write a stale <dimension> (e.g. A1:B7 for a 34x17 sheet).
// SheetJS trusts it, so rebuild the range from the cells that actually exist.
function fixRange(ws: XLSX.WorkSheet): void {
  let minR = Infinity, minC = Infinity, maxR = -1, maxC = -1;
  for (const key of Object.keys(ws)) {
    if (key.startsWith("!")) continue;
    const { r, c } = XLSX.utils.decode_cell(key);
    if (r < minR) minR = r;
    if (c < minC) minC = c;
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  if (maxR >= 0) ws["!ref"] = XLSX.utils.encode_range({ s: { r: minR, c: minC }, e: { r: maxR, c: maxC } });
}

export function readExport(buffer: ArrayBuffer): ParsedExport {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
  } catch {
    throw new ParseError("Не удалось прочитать файл. Нужен XLSX-экспорт «Averagemarks».");
  }
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) throw new ParseError("В файле нет ни одного листа.");
  fixRange(sheet);

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: "",
  });
  if (rows.length < 4) throw new ParseError("Файл слишком короткий — это не выгрузка оценок.");

  const dataDate = detectDate(cellText(rows[0]?.[0])) ?? "";
  const periodStart = detectDate(cellText(rows[1]?.[0])) ?? "";
  const className = normalizeClassName(cellText(rows[2]?.[0]));
  const grade = detectGrade(cellText(rows[2]?.[0]));

  let headerRow = -1;
  for (let i = 0; i < Math.min(30, rows.length); i++) {
    const first = cellText(rows[i]?.[0]).toLowerCase();
    if (/^(обучающ|ученик|student|ф\.и|фио|name)/.test(first)) {
      headerRow = i;
      break;
    }
  }
  if (headerRow === -1)
    throw new ParseError(
      "Не найдена строка заголовка («Обучающийся»). Проверьте, что это экспорт средних баллов.",
    );

  const header = rows[headerRow];
  const subjects: string[] = [];
  const colIdx: number[] = [];
  for (let c = 1; c < header.length; c++) {
    const name = cellText(header[c]);
    if (name) {
      subjects.push(name);
      colIdx.push(c);
    }
  }
  if (subjects.length === 0) throw new ParseError("В заголовке нет ни одного предмета.");

  const rawRows: { name: string; values: (number | null)[] }[] = [];
  for (let i = headerRow + 1; i < rows.length; i++) {
    const name = cellText(rows[i]?.[0]);
    if (!name) continue;
    const values = colIdx.map((c) => {
      const v = cellNumber(rows[i]?.[c]);
      return v !== null && v > 0 ? v : null; // 0.00 = не аттестован
    });
    rawRows.push({ name, values });
  }

  // keep only subjects with at least one mark, then drop students with no marks
  const keepCol = subjects.map((_, j) => rawRows.some((r) => r.values[j] !== null));
  const keptSubjects = subjects.filter((_, j) => keepCol[j]);
  const kept = rawRows
    .map((r) => ({ name: r.name, values: r.values.filter((_, j) => keepCol[j]) }))
    .filter((r) => r.values.some((v) => v !== null));

  if (kept.length === 0) throw new ParseError("В файле нет ни одной оценки.");
  if (keptSubjects.length === 0) throw new ParseError("Все предметы пусты — оценок нет.");

  return {
    frame: {
      students: kept.map((r) => r.name),
      subjects: keptSubjects,
      grid: kept.map((r) => r.values),
    },
    dataDate,
    periodStart,
    className,
    grade,
  };
}

export function parseExport(
  buffer: ArrayBuffer,
  className: string,
  grade: number,
): Payload {
  const parsed = readExport(buffer);
  const dataDate = parsed.dataDate || new Date().toLocaleDateString("ru-RU");
  return buildPayload(parsed.frame, className, dataDate, grade, parsed.periodStart);
}