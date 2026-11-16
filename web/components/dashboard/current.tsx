"use client";

import { motion, useReducedMotion } from "motion/react";
import { Info } from "lucide-react";
import type { Payload } from "@/lib/types";
import { cn, fmtNum, fmtPct, markTone, plural } from "@/lib/utils";
import { AnimatedNumber } from "@/components/animated-number";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SubjectsBarChart } from "./charts";
import { Rise } from "./section";

const MARK_LABELS: Record<string, string> = {
  "5": "отлично",
  "4": "хорошо",
  "3": "удовлетворительно",
  "2": "неудовлетворительно",
};

const MARK_BG: Record<string, string> = {
  m5: "bg-m5",
  m4: "bg-m4",
  m3: "bg-m3",
  m2: "bg-m2",
};

export function KpiBand({ payload }: { payload: Payload }) {
  const k = payload.kpis;
  const items = [
    {
      label: "Средний балл класса",
      value: k.avg,
      digits: 2,
      suffix: "",
      hint: payload.definitions.avg,
    },
    {
      label: "Успеваемость",
      value: k.success === null ? null : k.success * 100,
      digits: 1,
      suffix: "%",
      hint: payload.definitions.success,
    },
    {
      label: "Качество знаний",
      value: k.quality === null ? null : k.quality * 100,
      digits: 1,
      suffix: "%",
      hint: payload.definitions.quality,
    },
    {
      label: "Ученики · оценки",
      value: k.students,
      digits: 0,
      suffix: "",
      hint: `${k.marks} ${plural(k.marks, "оценка", "оценки", "оценок")} по ${k.subjects} ${plural(k.subjects, "предмету", "предметам", "предметам")}`,
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, i) => (
        <Rise key={item.label} delay={i * 0.08} className="glass-surface relative min-h-48 overflow-hidden p-6 sm:p-7">
          <span aria-hidden="true" className="absolute -right-5 -top-8 select-none text-[120px] leading-none font-black text-ink/[.035]">0{i + 1}</span>
          <div className="relative mb-5 flex items-center gap-1.5 text-sm font-semibold text-ink2">
            {item.label}
            <Tooltip>
              <TooltipTrigger asChild><Info className="size-4 cursor-help" /></TooltipTrigger>
              <TooltipContent>{item.hint}</TooltipContent>
            </Tooltip>
          </div>
          <div className="relative text-[clamp(2.5rem,4vw,4.25rem)] leading-none font-bold tracking-[-.035em]">
            {item.value === null ? "—" : <AnimatedNumber value={item.value} digits={item.digits} suffix={item.suffix} />}
          </div>
          <div className="relative mt-4 max-w-[28ch] text-sm leading-snug text-ink2">{item.hint}</div>
        </Rise>
      ))}
    </div>
  );
}

export function MarksCard({ payload }: { payload: Payload }) {
  const reduceMotion = useReducedMotion();
  const total = payload.kpis.marks;
  return (
    <div className="glass-surface h-full p-6 sm:p-8">
      <h3 className="mb-6 text-xl font-bold tracking-tight">Распределение оценок</h3>
      <div className="flex h-2.5 overflow-hidden rounded-sm shadow-[inset_0_2px_5px_rgba(0,0,0,.13)]">
        {payload.marks.map((m, i) => {
          const tone = MARK_BG[markTone(Number(m.value))];
          const width = total > 0 ? (m.count / total) * 100 : 0;
          return (
            <motion.div
              key={m.value}
              initial={reduceMotion ? false : { width: 0 }}
              animate={{ width: `${width}%` }}
              transition={{ duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : 0.15 + i * 0.08, ease: "easeOut" }}
              className={cn(tone, "h-full")}
              title={`${m.value}: ${m.count}`}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-ink2">
        <span>0</span>
        <span>{total} {plural(total, "оценка", "оценки", "оценок")}</span>
      </div>
      <div className="mt-6 space-y-2.5">
        {payload.marks.map((m) => (
          <div key={m.value} className="flex items-center gap-2.5 text-[13px]">
            <span className={cn("size-3.5 shrink-0 rounded-sm", MARK_BG[markTone(Number(m.value))])} />
            <span className="w-3 font-semibold">{m.value}</span>
            <span className="flex-1 text-ink2">{MARK_LABELS[m.value]}</span>
            <span className="font-semibold">{m.count}</span>
            <span className="w-14 text-right text-ink2">{fmtPct(m.share)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const CAT_TONE: Record<string, string> = {
  "Отличник (все 5)": "bg-m5",
  "Одна 4": "bg-m4",
  "Две и более 4": "bg-m4",
  "Одна 3, без 2": "bg-m3",
  "Две и более 3, без 2": "bg-m3",
  "Есть оценка 2": "bg-m2",
};

export function CategoriesCard({ payload }: { payload: Payload }) {
  const reduceMotion = useReducedMotion();
  const n = payload.kpis.students;
  return (
    <div className="glass-surface h-full p-6 sm:p-8">
      <h3 className="mb-6 text-xl font-bold tracking-tight">Категории учеников</h3>
      <div className="flex h-2.5 overflow-hidden rounded-sm shadow-[inset_0_2px_5px_rgba(0,0,0,.13)]">
        {payload.categories.map((c, i) => (
          <motion.div
            key={c.name}
            initial={reduceMotion ? false : { width: 0 }}
            animate={{ width: `${n > 0 ? (c.count / n) * 100 : 0}%` }}
            transition={{ duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : 0.1 + i * 0.06, ease: "easeOut" }}
            className={cn(CAT_TONE[c.name], "h-full")}
            title={`${c.name}: ${c.count}`}
          />
        ))}
      </div>
      <div className="mt-6 space-y-2.5">
        {payload.categories.map((c) => (
          <div key={c.name} className="flex items-baseline gap-2 text-[13px]">
            <span className={cn("size-2.5 shrink-0 translate-y-[-1px] rounded-sm", CAT_TONE[c.name])} />
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex-1 cursor-help truncate">{c.name}</span>
              </TooltipTrigger>
              <TooltipContent>{c.hint}</TooltipContent>
            </Tooltip>
            <span className="font-semibold">{c.count}</span>
            <span className="w-14 text-right text-ink2">{fmtPct(c.share)}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 border-t border-rule2 pt-2 text-[11px] leading-snug text-ink2">
        Категории не пересекаются: каждый ученик попадает ровно в одну.
      </p>
    </div>
  );
}

export function SubjectsCard({ payload }: { payload: Payload }) {
  return (
    <div className="glass-surface h-full p-6 sm:p-8">
      <div className="mb-6 flex items-baseline justify-between gap-3">
        <h3 className="text-xl font-bold tracking-tight">Средний балл по предметам</h3>
        <span className="text-[11px] text-ink2">цвет — уровень среднего · пунктир — деления шкалы</span>
      </div>
      <div className="overflow-x-auto">
        <SubjectsBarChart payload={payload} />
      </div>
    </div>
  );
}

export function StrongWeak({ payload }: { payload: Payload }) {
  const Block = ({
    label,
    items,
    tone,
  }: {
    label: string;
    items: { name: string; avg: number }[];
    tone: "m5" | "m2";
  }) => (
    <div>
      <div className="mb-2 flex items-baseline justify-between border-b border-rule pb-1.5">
        <span className="micro-label">{label}</span>
        <span className="micro-label">средний балл</span>
      </div>
      {items.length === 0 && <p className="text-sm text-ink2 italic">нет данных</p>}
      {items.map((s, i) => (
        <Rise key={s.name} delay={i * 0.05}>
          <div className="flex items-center gap-2.5 border-b border-rule2 py-1.5 text-[13.5px] last:border-b-0">
            <span className={cn("size-2 shrink-0 rounded-sm", tone === "m5" ? "bg-m5" : "bg-m2")} />
            <span className="flex-1 truncate">{s.name}</span>
            <span className="font-semibold">{fmtNum(s.avg)}</span>
          </div>
        </Rise>
      ))}
    </div>
  );
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <Block label="Сильные предметы" items={payload.strongSubjects} tone="m5" />
      <Block label="Слабые предметы" items={payload.weakSubjects} tone="m2" />
    </div>
  );
}

export function GroupsCard({ payload }: { payload: Payload }) {
  const toneBg: Record<string, string> = { m5: "bg-m5", m4: "bg-m4", m3: "bg-m3", m2: "bg-m2" };
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {payload.groups.map((g, i) => (
        <Rise
          key={g.key}
          delay={i * 0.08}
          className="glass-surface p-6"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className={cn("size-2.5 rounded-sm", toneBg[g.tone])} />
            <span className="text-sm font-semibold">{g.title}</span>
            <span className="ml-auto text-lg font-semibold">{g.items.length}</span>
          </div>
          {g.items.length === 0 ? (
            <p className="text-[13px] text-ink2 italic">нет учеников</p>
          ) : (
            <ul className="space-y-0">
              {g.items.map((item) => (
                <li key={item.name} className="border-t border-rule2 py-1 text-[13px] leading-snug first:border-t-0">
                  <span className="font-medium">{item.name}</span>
                  {item.detail && <span className="block text-xs text-ink2">{item.detail}</span>}
                </li>
              ))}
            </ul>
          )}
        </Rise>
      ))}
    </div>
  );
}

export function AbsentCard({ payload }: { payload: Payload }) {
  const withMissing = payload.subjects.filter((s) => s.missingStudents.length > 0);
  if (withMissing.length === 0 && payload.noMarksStudents.length === 0) return null;
  return (
    <div className="glass-surface h-full p-6 sm:p-8">
      <h3 className="mb-6 text-xl font-bold tracking-tight">Отсутствуют оценки</h3>
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {withMissing.map((s) => (
          <div key={s.name}>
            <div className="border-b border-rule2 pb-1.5 text-[13px] font-medium">{s.name}</div>
            <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
              {s.missingStudents.map((name) => (
                <li key={name} className="text-xs text-ink2">{name}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {payload.noMarksStudents.length > 0 && (
        <p className="mt-4 text-[13px] text-ink2">
          Совсем без оценок: <span className="font-medium text-ink">{payload.noMarksStudents.join(", ")}</span>
        </p>
      )}
      <p className="mt-4 border-t border-rule2 pt-2 text-[11px] text-ink2">
        Отсутствующая оценка не считается нулём и не занижает средний балл предмета.
      </p>
    </div>
  );
}