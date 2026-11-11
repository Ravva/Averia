"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { ArrowRight, Minus, TrendingDown, TrendingUp, UserMinus, UserPlus } from "lucide-react";
import { comparePayloads } from "@/lib/dynamics";
import type { Snapshot } from "@/lib/types";
import { cn, categoryBadgeVariant, fmtDelta, fmtDeltaPp, fmtNum, plural } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Rise, Section } from "./section";

const MARK_BG: Record<string, string> = {
  "5": "bg-m5",
  "4": "bg-m4",
  "3": "bg-m3",
  "2": "bg-m2",
};

function DeltaChip({ value, pp = false }: { value: number | null; pp?: boolean }) {
  if (value === null) return <span className="text-ink2">—</span>;
  const flat = Math.abs(value) < (pp ? 0.0005 : 0.005);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[13px] font-semibold",
        flat ? "bg-band text-ink2" : value > 0 ? "bg-m5/12 text-m5" : "bg-m2/12 text-m2",
      )}
    >
      {flat ? <Minus className="size-3.5" /> : value > 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
      {pp ? fmtDeltaPp(value) : fmtDelta(value)}
    </span>
  );
}

export function DynamicsView({
  prev,
  curr,
  onSelectStudent,
}: {
  prev: Snapshot;
  curr: Snapshot;
  onSelectStudent: (name: string) => void;
}) {
  const cmp = useMemo(() => comparePayloads(prev.payload, curr.payload), [prev, curr]);
  const maxSubjDelta = Math.max(0.05, ...cmp.subjects.map((s) => Math.abs(s.delta ?? 0)));

  return (
    <div>
      <Rise>
        <div className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-rule bg-rule2 lg:grid-cols-4">
          {[
            { label: "Средний балл", now: fmtNum(curr.payload.kpis.avg), was: fmtNum(prev.payload.kpis.avg), delta: cmp.kpis.avg, pp: false },
            { label: "Успеваемость", now: `${fmtNum((curr.payload.kpis.success ?? 0) * 100, 1)}%`, was: `${fmtNum((prev.payload.kpis.success ?? 0) * 100, 1)}%`, delta: cmp.kpis.success, pp: true },
            { label: "Качество знаний", now: `${fmtNum((curr.payload.kpis.quality ?? 0) * 100, 1)}%`, was: `${fmtNum((prev.payload.kpis.quality ?? 0) * 100, 1)}%`, delta: cmp.kpis.quality, pp: true },
            { label: "Ученики", now: String(curr.payload.kpis.students), was: String(prev.payload.kpis.students), delta: cmp.kpis.students, pp: false, digits: 0 },
          ].map((item) => (
            <div key={item.label} className="bg-paper2 p-5">
              <div className="micro-label mb-2">{item.label}</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold tracking-tight">{item.now}</span>
                <span className="text-sm text-ink2">было {item.was}</span>
              </div>
              <div className="mt-2">
                <DeltaChip value={item.delta} pp={item.pp} />
              </div>
            </div>
          ))}
        </div>
      </Rise>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Кто вырос" note="рост среднего балла">
          {cmp.improved.length === 0 ? (
            <p className="text-sm text-ink2 italic">Никто не вырос — возможно, срез ранний.</p>
          ) : (
            <div className="space-y-1">
              {cmp.improved.slice(0, 6).map((s, i) => (
                <Rise key={s.name} delay={i * 0.05}>
                  <button
                    onClick={() => onSelectStudent(s.name)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-rule2 bg-paper2 px-3 py-2 text-left transition-colors hover:border-rule"
                  >
                    <span className="flex-1 truncate text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-ink2">{fmtNum(s.prevAvg)} → {fmtNum(s.currAvg)}</span>
                    <DeltaChip value={s.delta} />
                  </button>
                </Rise>
              ))}
            </div>
          )}
        </Section>

        <Section title="Кто снизил" note="падение среднего балла">
          {cmp.declined.length === 0 ? (
            <p className="text-sm text-ink2 italic">Снижений нет.</p>
          ) : (
            <div className="space-y-1">
              {cmp.declined.slice(0, 6).map((s, i) => (
                <Rise key={s.name} delay={i * 0.05}>
                  <button
                    onClick={() => onSelectStudent(s.name)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-rule2 bg-paper2 px-3 py-2 text-left transition-colors hover:border-rule"
                  >
                    <span className="flex-1 truncate text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-ink2">{fmtNum(s.prevAvg)} → {fmtNum(s.currAvg)}</span>
                    <DeltaChip value={s.delta} />
                  </button>
                </Rise>
              ))}
            </div>
          )}
        </Section>
      </div>

      <Section title="Предметы: изменение среднего балла" note={`${prev.dataDate} → ${curr.dataDate}`}>
        <div className="space-y-1.5">
          {[...cmp.subjects]
            .filter((s) => s.delta !== null)
            .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
            .map((s, i) => {
              const d = s.delta ?? 0;
              const width = (Math.abs(d) / maxSubjDelta) * 50;
              return (
                <div key={s.name} className="flex items-center gap-3 text-[13px]">
                  <span className="w-44 truncate sm:w-56" title={s.name}>{s.name}</span>
                  <div className="relative h-4 flex-1">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-rule" />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${width}%` }}
                      transition={{ duration: 0.5, delay: i * 0.03 }}
                      className={cn(
                        "absolute inset-y-0.5 rounded-sm",
                        d >= 0 ? "left-1/2 bg-m5" : "right-1/2 bg-m2",
                      )}
                    />
                  </div>
                  <span className={cn("w-16 text-right font-semibold", d > 0 ? "text-m5" : d < 0 ? "text-m2" : "text-ink2")}>
                    {fmtDelta(d)}
                  </span>
                </div>
              );
            })}
        </div>
      </Section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Состав оценок" note="было → стало">
          <div className="space-y-2">
            {cmp.marksShift.map((m) => (
              <div key={m.value} className="flex items-center gap-3 text-[13px]">
                <span className={cn("flex size-6 items-center justify-center rounded-sm text-[12px] font-bold text-pillink", MARK_BG[m.value], m.value === "2" && "text-pillink2")}>
                  {m.value}
                </span>
                <span className="w-20 text-ink2">{m.prev} → <span className="font-semibold text-ink">{m.curr}</span></span>
                <span className={cn("font-semibold", m.delta > 0 ? (m.value === "2" || m.value === "3" ? "text-m2" : "text-m5") : m.delta < 0 ? (m.value === "2" || m.value === "3" ? "text-m5" : "text-m2") : "text-ink2")}>
                  {fmtDelta(m.delta, 0)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-snug text-ink2">
            Рост пятёрок и четвёрок — зелёный, рост троек и двоек — красный.
          </p>
        </Section>

        <Section title="Переходы между категориями" note={`${cmp.transitions.length} ${plural(cmp.transitions.length, "ученик", "ученика", "учеников")}`}>
          {cmp.transitions.length === 0 ? (
            <p className="text-sm text-ink2 italic">Категории не изменились.</p>
          ) : (
            <div className="space-y-1.5">
              {cmp.transitions.map((s) => (
                <button
                  key={s.name}
                  onClick={() => onSelectStudent(s.name)}
                  className="flex w-full cursor-pointer flex-wrap items-center gap-2 rounded-md border border-rule2 bg-paper2 px-3 py-2 text-left text-[13px] transition-colors hover:border-rule"
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="ml-auto flex items-center gap-1.5">
                    <Badge variant={categoryBadgeVariant(s.prevCategory ?? "")}>{s.prevCategory}</Badge>
                    <ArrowRight className="size-3.5 text-ink2" />
                    <Badge variant={categoryBadgeVariant(s.currCategory ?? "")}>{s.currCategory}</Badge>
                  </span>
                </button>
              ))}
            </div>
          )}
        </Section>
      </div>

      {(cmp.newcomers.length > 0 || cmp.leavers.length > 0) && (
        <Section title="Изменения в составе класса">
          <div className="grid gap-4 sm:grid-cols-2">
            {cmp.newcomers.length > 0 && (
              <div className="rounded-md border border-rule2 bg-paper2 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-m5">
                  <UserPlus className="size-4" /> Новые ученики
                </div>
                <ul className="space-y-1 text-[13px]">
                  {cmp.newcomers.map((s) => (
                    <li key={s.name}>{s.name} · {fmtNum(s.currAvg)}</li>
                  ))}
                </ul>
              </div>
            )}
            {cmp.leavers.length > 0 && (
              <div className="rounded-md border border-rule2 bg-paper2 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink2">
                  <UserMinus className="size-4" /> Выбыли из выгрузки
                </div>
                <ul className="space-y-1 text-[13px]">
                  {cmp.leavers.map((s) => (
                    <li key={s.name}>{s.name} · был {fmtNum(s.prevAvg)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}