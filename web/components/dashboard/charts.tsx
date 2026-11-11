"use client";

import { useId } from "react";
import type { Payload, Snapshot } from "@/lib/types";
import { fmtNum, markTone } from "@/lib/utils";

const TONE_VAR: Record<string, string> = {
  m5: "var(--m5)",
  m4: "var(--m4)",
  m3: "var(--m3)",
  m2: "var(--m2)",
};

function trunc(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

/* Horizontal subject bars — the atlas canon chart. Vertical key-metric
   gridlines (3,5 / 4,0 / 4,5 / 5,0) are drawn dashed; each bar is tinted
   by the rounded mark so colour always means the same thing. */
export function SubjectsBarChart({ payload }: { payload: Payload }) {
  const subjects = [...payload.subjects]
    .filter((s) => s.avg !== null)
    .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
  if (subjects.length === 0) return null;

  const minAvg = Math.min(...subjects.map((s) => s.avg ?? 5));
  const lo = Math.min(3.5, Math.floor(minAvg * 2) / 2);
  const hi = 5;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + 1e-9; t += 0.5) ticks.push(Number(t.toFixed(1)));

  const left = 250;
  const right = 680;
  const plotW = right - left;
  const top = 16;
  const rowH = 30;
  const barH = 15;
  const plotBottom = top + subjects.length * rowH;
  const height = plotBottom + 22;
  const x = (v: number) => left + ((v - lo) / (hi - lo)) * plotW;

  return (
    <svg
      viewBox={`0 0 746 ${height}`}
      width="100%"
      role="img"
      aria-label="Средний балл по предметам"
      className="block max-w-full"
    >
      {ticks.map((t) => (
        <g key={t}>
          <line className="chart-grid" x1={x(t)} y1={top} x2={x(t)} y2={plotBottom} />
          <text className="chart-axis-text" x={x(t)} y={height - 6} textAnchor="middle">
            {t.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </text>
        </g>
      ))}
      {subjects.map((s, i) => {
        const avg = s.avg ?? 0;
        const y = top + i * rowH;
        const w = Math.max(0, x(avg) - left);
        const tone = TONE_VAR[markTone(Math.round(avg))];
        return (
          <g key={s.name}>
            <text className="chart-bar-label" x={0} y={y + 20}>
              {trunc(s.name, 34)}
            </text>
            <rect x={left} y={y + 9} width={w} height={barH} rx={1.5} fill={tone}>
              <title>{`${s.name} — ${fmtNum(avg)}`}</title>
            </rect>
            <text className="chart-bar-value" x={left + w + 7} y={y + 21}>
              {fmtNum(avg)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

type Point = { label: string; value: number };

/* One hand-drawn metric line with a dashed reference line on the key
   threshold (4,50 for the average; 100% for success/quality). */
function MetricLine({
  title,
  points,
  lo,
  hi,
  refValue,
  refLabel,
  format,
}: {
  title: string;
  points: Point[];
  lo: number;
  hi: number;
  refValue: number;
  refLabel: string;
  format: (v: number) => string;
}) {
  const gid = useId();
  const W = 320;
  const H = 168;
  const padL = 38;
  const padR = 14;
  const padT = 16;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = points.length;
  const x = (i: number) => (n <= 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW);
  const y = (v: number) => padT + ((hi - v) / (hi - lo)) * plotH;

  const yTicks = [lo, (lo + hi) / 2, hi];
  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const area = `${padL},${padT + plotH} ${line} ${x(n - 1)},${padT + plotH}`;
  const refY = y(Math.min(hi, Math.max(lo, refValue)));
  const lastY = y(points[n - 1].value);
  const refTextY = lastY < refY + 12 ? refY + 14 : refY - 5;

  return (
    <div className="border border-rule bg-paper2 p-4">
      <h3 className="micro-label mb-2">{title}</h3>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={title} className="block max-w-full">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ink)" stopOpacity="0.10" />
            <stop offset="100%" stopColor="var(--ink)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map((t) => (
          <g key={t}>
            <line className="chart-grid" x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} />
            <text className="chart-axis-text" x={padL - 6} y={y(t) + 4} textAnchor="end">
              {format(t)}
            </text>
          </g>
        ))}
        <polygon points={area} fill={`url(#${gid})`} />
        <line className="chart-ref" x1={padL} y1={refY} x2={W - padR} y2={refY} stroke="var(--m5)" />
        <text className="chart-ref-text" x={W - padR} y={refTextY} textAnchor="end" fill="var(--m5)">
          {refLabel}
        </text>
        <polyline points={line} fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.value)} r={3.25} fill="var(--paper-2)" stroke="var(--ink)" strokeWidth={2}>
              <title>{`${p.label}: ${format(p.value)}`}</title>
            </circle>
            <text className="chart-bar-value" x={x(i)} y={Math.max(10, y(p.value) - 8)} textAnchor="middle">
              {format(p.value)}
            </text>
            <text className="chart-axis-text" x={x(i)} y={H - 8} textAnchor="middle">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function HistoryChart({ snapshots }: { snapshots: Snapshot[] }) {
  const pts = (get: (s: Snapshot) => number) =>
    snapshots.map((s) => ({ label: s.dataDate.slice(0, 5), value: get(s) }));

  const avg = pts((s) => s.payload.kpis.avg ?? 0);
  const success = pts((s) => (s.payload.kpis.success ?? 0) * 100);
  const quality = pts((s) => (s.payload.kpis.quality ?? 0) * 100);

  const avgLo = Math.min(3.5, Math.floor(Math.min(...avg.map((p) => p.value)) * 2) / 2);
  const pctLo = (vals: Point[]) => Math.max(0, Math.floor((Math.min(...vals.map((p) => p.value)) - 5) / 10) * 10);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <MetricLine
        title="Средний балл"
        points={avg}
        lo={avgLo}
        hi={5}
        refValue={4.5}
        refLabel="4,50 — порог «5»"
        format={(v) => fmtNum(v)}
      />
      <MetricLine
        title="Успеваемость"
        points={success}
        lo={pctLo(success)}
        hi={100}
        refValue={100}
        refLabel="100% — цель"
        format={(v) => `${fmtNum(v, 0)}%`}
      />
      <MetricLine
        title="Качество знаний"
        points={quality}
        lo={pctLo(quality)}
        hi={100}
        refValue={100}
        refLabel="100% — цель"
        format={(v) => `${fmtNum(v, 0)}%`}
      />
    </div>
  );
}