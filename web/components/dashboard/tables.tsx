"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { MarkCounts, Payload } from "@/lib/types";
import { cn, fmtNum, fmtPct } from "@/lib/utils";

const MARKS: (keyof MarkCounts)[] = ["5", "4", "3", "2"];

function cntClass(counts: MarkCounts, mk: keyof MarkCounts, bold = false): string {
  if (counts[mk] <= 0) return "cnt z";
  return cn("cnt", `m${mk}`, bold && "has");
}

type Sort = { field: string; dir: 1 | -1 };

function SortTh({
  label,
  field,
  sort,
  onSort,
  className,
}: {
  label: string;
  field: string;
  sort: Sort;
  onSort: (f: string) => void;
  className?: string;
}) {
  const active = sort.field === field;
  const Icon = active ? (sort.dir === 1 ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className={className}>
      <button
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-ink",
          active && "text-ink",
        )}
      >
        {label}
        <Icon className="size-3" />
      </button>
    </th>
  );
}

export function SubjectsTable({ payload }: { payload: Payload }) {
  const [sort, setSort] = useState<Sort>({ field: "avg", dir: -1 });
  const onSort = (field: string) =>
    setSort((s) => (s.field === field ? { field, dir: s.dir === 1 ? -1 : 1 } : { field, dir: -1 }));

  const rows = useMemo(() => {
    const val = (s: Payload["subjects"][number]) => {
      switch (sort.field) {
        case "name": return s.name;
        case "quality": return s.quality ?? -1;
        default: return s.avg ?? -1;
      }
    };
    return [...payload.subjects].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      const cmp = typeof va === "string" ? va.localeCompare(vb as string, "ru") : (va as number) - (vb as number);
      return cmp * sort.dir;
    });
  }, [payload.subjects, sort]);

  return (
    <div className="overflow-x-auto">
      <table className="atlas-table min-w-[680px]">
        <thead>
          <tr>
            <SortTh label="Предмет" field="name" sort={sort} onSort={onSort} className="w-[30%]" />
            <SortTh label="Средний балл" field="avg" sort={sort} onSort={onSort} className="w-[14%] text-right" />
            {MARKS.map((mk) => (
              <th key={mk} className="cnt w-[7%]">{mk}</th>
            ))}
            <SortTh label="Качество" field="quality" sort={sort} onSort={onSort} className="w-[12%] text-right" />
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.name}>
              <td className="truncate font-medium" title={s.name}>{s.name}</td>
              <td className="av">{fmtNum(s.avg)}</td>
              {MARKS.map((mk) => (
                <td key={mk} className={cntClass(s.counts, mk)}>{s.counts[mk]}</td>
              ))}
              <td className="pc">{fmtPct(s.quality)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RankingTable({
  payload,
  onSelect,
}: {
  payload: Payload;
  onSelect: (name: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="atlas-table min-w-[560px]">
        <thead>
          <tr>
            <th className="w-[8%]">Место</th>
            <th className="w-[38%]">Обучающийся</th>
            <th className="w-[14%] text-right">Средний</th>
            {MARKS.map((mk) => (
              <th key={mk} className="cnt w-[10%]">{mk}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {payload.ranking.map((r) => (
            <tr key={r.name} className="cursor-pointer" onClick={() => onSelect(r.name)}>
              <td className={cn("text-ink2", r.place <= 3 && "font-bold text-ink")}>
                {r.place}
              </td>
              <td className="truncate font-medium" title={r.name}>{r.name}</td>
              <td className="av">{fmtNum(r.avg)}</td>
              {MARKS.map((mk) => (
                <td key={mk} className={cntClass(r.counts, mk, true)}>{r.counts[mk]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}