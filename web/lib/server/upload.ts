import "server-only";
import { Query } from "node-appwrite";
import { DATABASE_ID, TABLES, tablesDb, withRetry } from "./appwrite";
import { listClasses } from "./repository";
import { buildPayload } from "@/lib/arith";
import { ParseError, readExport } from "@/lib/parse";
import type { Payload } from "@/lib/types";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export class UploadError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export interface ParsedUpload {
  payload: Payload;
  fileName: string;
  dataDate: string;
  warnings: { duplicateDate: boolean; classMismatch: string | null };
}

export async function parseUpload(
  classId: string,
  file: File,
  userId: string,
  isAdmin: boolean,
): Promise<ParsedUpload> {
  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    throw new UploadError("Нужен файл XLSX или XLS — экспорт «Averagemarks».", 400);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new UploadError("Файл больше 10 МБ.", 413);
  }

  const classes = await listClasses();
  const room = classes.find((c) => c.id === classId);
  if (!room) throw new UploadError("Класс не найден.", 404);
  if (!isAdmin && !(room.teacherIds ?? []).includes(userId)) {
    throw new UploadError("У вас нет доступа к этому классу.", 403);
  }

  const buffer = await file.arrayBuffer();
  let parsed;
  try {
    parsed = readExport(buffer);
  } catch (e) {
    const message =
      e instanceof ParseError
        ? e.message
        : "Не удалось обработать файл. Проверьте, что это экспорт средних баллов «Averagemarks».";
    throw new UploadError(message, 400);
  }

  const dataDate = parsed.dataDate || new Date().toLocaleDateString("ru-RU");
  const payload = buildPayload(
    parsed.frame,
    room.name,
    dataDate,
    room.grade,
    parsed.periodStart,
  );

  const existing = await withRetry(() =>
    tablesDb().listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.snapshots,
      queries: [Query.equal("classId", room.id), Query.isNull("deletedAt"), Query.limit(500)],
    }),
  );
  const duplicateDate = (existing.rows as unknown as { dataDate: string }[]).some(
    (r) => r.dataDate === dataDate,
  );

  return {
    payload,
    fileName: file.name,
    dataDate,
    warnings: {
      duplicateDate,
      classMismatch:
        parsed.className && parsed.className !== room.name ? parsed.className : null,
    },
  };
}
