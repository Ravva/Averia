"use client";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Snapshot } from "@/lib/types";
import { useStore } from "@/lib/store";
import { fmtDateTime, fmtNum, fmtPct, plural } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Rise, Section } from "./section";
import { HistoryChart } from "./charts";

export function HistoryView({
  snapshots,
  canDelete,
}: {
  snapshots: Snapshot[];
  canDelete: boolean;
}) {
  const { deleteSnapshot, restoreSnapshot } = useStore();

  const onDelete = (s: Snapshot) => {
    deleteSnapshot(s.id);
    toast(`Срез ${s.dataDate} удалён`, {
      action: {
        label: "Вернуть",
        onClick: () => restoreSnapshot(s.id),
      },
      duration: 6000,
    });
  };

  return (
    <div>
      {snapshots.length >= 2 && (
        <Section title="Динамика показателей" note="пунктир — ключевые отметки метрик">
          <Rise>
            <HistoryChart snapshots={snapshots} />
          </Rise>
        </Section>
      )}

      <Section title="Загруженные срезы" note={`${snapshots.length} ${plural(snapshots.length, "файл", "файла", "файлов")}`}>
        <div className="space-y-2">
          {[...snapshots].reverse().map((s, i) => (
            <Rise key={s.id} delay={i * 0.05}>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-rule2 bg-paper2 px-4 py-3">
                <div className="min-w-28">
                  <div className="text-sm font-semibold">{s.dataDate}</div>
                  <div className="text-[11px] text-ink2">период с {s.periodStart || "—"}</div>
                </div>
                <div className="text-[13px] text-ink2">
                  ср. балл <span className="font-semibold text-ink">{fmtNum(s.payload.kpis.avg)}</span>
                </div>
                <div className="text-[13px] text-ink2">
                  успев. <span className="font-semibold text-ink">{fmtPct(s.payload.kpis.success)}</span>
                </div>
                <div className="text-[13px] text-ink2">
                  качество <span className="font-semibold text-ink">{fmtPct(s.payload.kpis.quality)}</span>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <div className="text-right text-[11px] leading-tight text-ink2">
                    <div>{s.fileName}</div>
                    <div>{fmtDateTime(s.uploadedAt)}</div>
                  </div>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Удалить срез ${s.dataDate}`}
                      className="text-ink2 hover:text-m2"
                      onClick={() => onDelete(s)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Rise>
          ))}
        </div>
      </Section>
    </div>
  );
}