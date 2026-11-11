"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileUp,
  Loader2,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { buildPayload } from "@/lib/arith";
import { ParseError, readExport, type ParsedExport } from "@/lib/parse";
import { classSnapshots, useStore } from "@/lib/store";
import type { Payload } from "@/lib/types";
import { cn, fmtNum, fmtPct, plural } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Stage = "idle" | "working" | "preview" | "error";

const STEPS = ["Чтение файла", "Разбор таблицы", "Расчёт показателей", "Проверка целостности"];

export default function UploadPage() {
  const { state, visibleClasses, addSnapshot } = useStore();
  const router = useRouter();
  const [classId, setClassId] = useState(visibleClasses[0]?.id ?? "");
  const [stage, setStage] = useState<Stage>("idle");
  const [step, setStep] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState<ParsedExport | null>(null);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const room = visibleClasses.find((c) => c.id === classId) ?? null;

  const processFile = useCallback(
    async (file: File) => {
      if (!room) {
        setError("Сначала выберите класс.");
        setStage("error");
        return;
      }
      if (!/\.(xlsx|xls)$/i.test(file.name)) {
        setError("Нужен файл XLSX или XLS — экспорт «Averagemarks».");
        setStage("error");
        return;
      }
      setFileName(file.name);
      setStage("working");
      setStep(0);
      setError("");
      try {
        const buffer = await file.arrayBuffer();
        await new Promise((r) => setTimeout(r, 220));
        setStep(1);
        const result = readExport(buffer);
        await new Promise((r) => setTimeout(r, 220));
        setStep(2);
        const p = buildPayload(
          result.frame,
          room.name,
          result.dataDate || new Date().toLocaleDateString("ru-RU"),
          room.grade,
          result.periodStart,
        );
        await new Promise((r) => setTimeout(r, 220));
        setStep(3);
        await new Promise((r) => setTimeout(r, 200));
        setParsed(result);
        setPayload(p);
        setStage("preview");
      } catch (e) {
        setError(
          e instanceof ParseError
            ? e.message
            : "Не удалось обработать файл. Проверьте, что это экспорт средних баллов «Averagemarks».",
        );
        setStage("error");
      }
    },
    [room],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const save = () => {
    if (!payload || !room) return;
    addSnapshot(room.id, payload, fileName);
    toast.success(`Срез ${payload.date} сохранён для ${room.name}`, {
      description: `${payload.kpis.students} ${plural(payload.kpis.students, "ученик", "ученика", "учеников")} · ${payload.kpis.marks} ${plural(payload.kpis.marks, "оценка", "оценки", "оценок")}`,
    });
    router.push("/dashboard");
  };

  const reset = () => {
    setStage("idle");
    setParsed(null);
    setPayload(null);
    setFileName("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const sameDate = room
    ? classSnapshots(state, room.id).some((s) => s.dataDate === payload?.date)
    : false;
  const classMismatch =
    parsed?.className && room && parsed.className !== room.name
      ? parsed.className
      : null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 border-b-2 border-ink pb-4">
        <h1 className="font-display text-3xl font-bold tracking-tight">Загрузка оценок</h1>
        <p className="mt-1 text-sm text-ink2">
          XLSX-экспорт «Averagemarks» со средними баллами. Файл разбирается в браузере,
          в базу попадает готовый срез.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="text-sm text-ink2">Класс</span>
        <Select value={classId} onValueChange={(v) => { setClassId(v); reset(); }}>
          <SelectTrigger className="w-36" aria-label="Класс">
            <SelectValue placeholder="Выберите класс" />
          </SelectTrigger>
          <SelectContent>
            {visibleClasses.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {room && (
          <span className="text-xs text-ink2">
            Округление для {room.grade} параллели:{" "}
            {room.grade <= 8 ? "4,60 → 5 (порог средней школы)" : "4,50 → 5 (стандартное)"}
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {stage === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div
              role="button"
              tabIndex={0}
              aria-label="Выбрать файл"
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-4 rounded-lg border-2 border-dashed px-6 py-16 text-center transition-all",
                dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-rule bg-paper2 hover:border-ink2",
              )}
            >
              <motion.span
                animate={dragOver ? { y: -6 } : { y: 0 }}
                className="flex size-14 items-center justify-center rounded-full bg-band text-ink2"
              >
                <FileUp className="size-7" />
              </motion.span>
              <div>
                <p className="text-base font-medium">Перетащите файл сюда или нажмите для выбора</p>
                <p className="mt-1 text-sm text-ink2">averageMarks.xlsx · до 10 МБ</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) processFile(f);
                }}
              />
            </div>
            <div className="mt-4 rounded-md border border-rule2 bg-paper2 p-4 text-[13px] leading-relaxed text-ink2">
              <p className="mb-1 font-semibold text-ink">Что распознаётся автоматически</p>
              Дата и период из шапки · класс вида «9А» · строка «Обучающийся» · предметы.
              Значение 0,00 считается отсутствием оценки, а не нулём.
            </div>
          </motion.div>
        )}

        {stage === "working" && (
          <motion.div
            key="working"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-rule2 bg-paper2 p-8"
          >
            <div className="mb-5 flex items-center gap-3">
              <FileSpreadsheet className="size-5 text-ink" />
              <span className="truncate text-sm font-medium">{fileName}</span>
            </div>
            <div className="space-y-3">
              {STEPS.map((label, i) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  {i < step ? (
                    <CheckCircle2 className="size-4 text-m5" />
                  ) : i === step ? (
                    <Loader2 className="size-4 animate-spin text-ink" />
                  ) : (
                    <span className="size-4 rounded-full border border-rule" />
                  )}
                  <span className={cn(i <= step ? "text-ink" : "text-ink2")}>{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {stage === "preview" && payload && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="rounded-lg border border-rule2 bg-paper2 p-6">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <CheckCircle2 className="size-5 text-m5" />
                <span className="text-base font-semibold">Файл распознан</span>
                <Badge variant="secondary">{room?.name}</Badge>
                <span className="ml-auto truncate text-xs text-ink2">{fileName}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-rule2 pt-4 sm:grid-cols-4">
                {[
                  { l: "Дата данных", v: payload.date },
                  { l: "Ученики", v: String(payload.kpis.students) },
                  { l: "Предметы", v: String(payload.kpis.subjects) },
                  { l: "Оценки", v: String(payload.kpis.marks) },
                ].map((x) => (
                  <div key={x.l}>
                    <div className="micro-label mb-1">{x.l}</div>
                    <div className="text-xl font-semibold">{x.v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 border-t border-rule2 pt-4">
                <div>
                  <div className="micro-label mb-1">Ср. балл</div>
                  <div className="text-lg font-semibold">{fmtNum(payload.kpis.avg)}</div>
                </div>
                <div>
                  <div className="micro-label mb-1">Успеваемость</div>
                  <div className="text-lg font-semibold">{fmtPct(payload.kpis.success)}</div>
                </div>
                <div>
                  <div className="micro-label mb-1">Качество</div>
                  <div className="text-lg font-semibold">{fmtPct(payload.kpis.quality)}</div>
                </div>
              </div>
            </div>

            {classMismatch && (
              <div className="flex items-start gap-3 rounded-md border border-m4/40 bg-m4/10 p-4 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-m4" />
                <p>
                  В файле указан класс <span className="font-semibold">{classMismatch}</span>,
                  а выбран <span className="font-semibold">{room?.name}</span>. Срез будет
                  сохранён для {room?.name} — проверьте выбор.
                </p>
              </div>
            )}
            {sameDate && (
              <div className="flex items-start gap-3 rounded-md border border-rule bg-band p-4 text-sm text-ink2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>Срез с датой {payload.date} уже есть. Новый станет последним и будет сравниваться с предыдущим.</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={save} className="flex-1">
                <Save /> Сохранить срез
              </Button>
              <Button variant="outline" onClick={reset}>
                <X /> Другой файл
              </Button>
            </div>
          </motion.div>
        )}

        {stage === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-m2/40 bg-m2/5 p-6"
          >
            <div className="mb-3 flex items-center gap-3">
              <AlertTriangle className="size-5 text-m2" />
              <span className="text-base font-semibold text-m2">Не удалось разобрать файл</span>
            </div>
            <p className="mb-5 text-sm leading-relaxed text-ink2">{error}</p>
            <Button variant="outline" onClick={reset}>Попробовать другой файл</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}