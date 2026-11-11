"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import type { Payload, Snapshot } from "@/lib/types";
import { cn, categoryBadgeVariant, fmtDelta, fmtNum, markTone, plural } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

const MARK_BG: Record<string, string> = {
  m5: "bg-m5 text-pillink",
  m4: "bg-m4 text-pillink",
  m3: "bg-m3 text-pillink",
  m2: "bg-m2 text-pillink2",
};

export function StudentDrawer({
  name,
  payload,
  prevPayload,
  snapshots,
  open,
  onOpenChange,
}: {
  name: string | null;
  payload: Payload;
  prevPayload: Payload | null;
  snapshots: Snapshot[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const row = name ? payload.rows.find((r) => r.name === name) : null;
  const prevRow = name ? prevPayload?.rows.find((r) => r.name === name) : null;
  const delta = row?.avg != null && prevRow?.avg != null ? row.avg - prevRow.avg : null;

  const history = name
    ? snapshots
        .map((s) => ({ snap: s, r: s.payload.rows.find((x) => x.name === name) }))
        .filter((x) => x.r?.avg != null)
    : [];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        {row && (
          <div className="mx-auto w-full max-w-3xl px-6 pb-10">
            <DrawerHeader className="px-0">
              <div className="flex flex-wrap items-center gap-3">
                <DrawerTitle>{row.name}</DrawerTitle>
                <Badge variant={categoryBadgeVariant(row.category)}>
                  {row.category}
                </Badge>
              </div>
              <DrawerDescription>
                {payload.class} · срез {payload.date} · {row.total} {plural(row.total, "оценка", "оценки", "оценок")}
              </DrawerDescription>
            </DrawerHeader>

            <div className="mb-6 flex flex-wrap items-end gap-6 border-b border-rule pb-4">
              <div>
                <div className="micro-label mb-1">Средний балл</div>
                <div className="text-4xl font-semibold tracking-tight">{fmtNum(row.avg)}</div>
              </div>
              {delta !== null && (
                <div
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold",
                    delta > 0 && "bg-m5/12 text-m5",
                    delta < 0 && "bg-m2/12 text-m2",
                    delta === 0 && "bg-band text-ink2",
                  )}
                >
                  {delta > 0 ? <TrendingUp className="size-4" /> : delta < 0 ? <TrendingDown className="size-4" /> : null}
                  {fmtDelta(delta)} к прошлому срезу
                </div>
              )}
              {prevRow && prevRow.category !== row.category && (
                <div className="text-sm text-ink2">
                  Категория: <span className="font-medium text-ink">{prevRow.category}</span>
                  {" → "}
                  <span className="font-medium text-ink">{row.category}</span>
                </div>
              )}
            </div>

            <h3 className="micro-label mb-3">Оценки по предметам</h3>
            <div className="mb-6 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              {payload.subjectNames.map((subj, j) => {
                const mark = row.marks[j];
                const raw = row.raw[j];
                return (
                  <div
                    key={subj}
                    className="flex items-center justify-between gap-3 border-b border-rule2 py-1.5 text-[13.5px]"
                  >
                    <span className="truncate">{subj}</span>
                    {mark === null ? (
                      <span className="text-xs text-ink2 italic">нет оценок</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-ink2">{fmtNum(raw)}</span>
                        <span className={cn("inline-flex min-w-7 justify-center rounded-sm px-1.5 py-0.5 text-[12px] font-bold", MARK_BG[markTone(mark)])}>
                          {mark}
                        </span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {history.length > 1 && (
              <>
                <h3 className="micro-label mb-3">История среднего балла</h3>
                <div className="flex items-end gap-3">
                  {history.map(({ snap, r }) => (
                    <div key={snap.id} className="flex flex-1 flex-col items-center gap-1.5">
                      <span className="text-sm font-semibold">{fmtNum(r!.avg)}</span>
                      <div className="flex h-24 w-full items-end rounded-sm bg-band">
                        <div
                          className="w-full rounded-sm bg-primary transition-all duration-500"
                          style={{ height: `${((r!.avg ?? 0) / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-ink2">{snap.dataDate.slice(0, 5)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}