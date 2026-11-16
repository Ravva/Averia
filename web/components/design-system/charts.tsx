"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const subjects = [
  { name: "Обществознание", avg: 5.0 },
  { name: "Труд (технология)", avg: 4.9 },
  { name: "История", avg: 4.87 },
  { name: "Информатика", avg: 4.83 },
  { name: "Физкультура", avg: 4.8 },
  { name: "Литература", avg: 4.68 },
  { name: "География", avg: 4.63 },
  { name: "Русский язык", avg: 4.61 },
  { name: "Биология", avg: 4.44 },
  { name: "Английский язык", avg: 4.37 },
  { name: "Физика", avg: 4.28 },
  { name: "Алгебра", avg: 4.25 },
  { name: "Геометрия", avg: 4.09 },
  { name: "Химия", avg: 3.89 },
];

const distribution = [
  { mark: "5", label: "отлично", count: 212, share: 47.6, color: "var(--m5)" },
  { mark: "4", label: "хорошо", count: 211, share: 47.4, color: "var(--m4)" },
  { mark: "3", label: "удовлетворительно", count: 21, share: 4.7, color: "var(--m3)" },
  { mark: "2", label: "неудовлетворительно", count: 1, share: 0.2, color: "var(--m2)" },
];

function markColor(avg: number) {
  if (avg >= 4.5) return "var(--m5)";
  if (avg >= 4.0) return "var(--m4)";
  if (avg >= 3.5) return "var(--m3)";
  return "var(--m2)";
}

export function SubjectsChart() {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);

  /* One viewBox unit is one rendered pixel, so the chart type matches the
     surrounding text instead of being scaled with the container. */
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(520, Math.round(el.clientWidth)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = width;
  const left = 210;
  const right = 60;
  const rowH = 30;
  const top = 8;
  const H = top + subjects.length * rowH + 26;
  const min = 3.5;
  const max = 5.0;
  const scale = (v: number) => left + ((v - min) / (max - min)) * (W - left - right);

  return (
    <div ref={wrapRef} className="min-w-[520px]">
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Средний балл по предметам">
      {[3.5, 4.0, 4.5, 5.0].map((t) => (
        <g key={t}>
          <line className="chart-grid" x1={scale(t)} y1={top} x2={scale(t)} y2={H - 26} />
          <text className="chart-axis-text" x={scale(t)} y={H - 8} textAnchor="middle">
            {t.toFixed(1).replace(".", ",")}
          </text>
        </g>
      ))}
      {subjects.map((s, i) => {
        const y = top + i * rowH;
        return (
          <g key={s.name} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
            {active === i && <rect x={0} y={y} width={W} height={rowH} rx={6} fill="var(--band)" />}
            <text className="chart-bar-label" x={0} y={y + 15} fill={active === i ? "var(--ink)" : undefined}>
              {s.name}
            </text>
            <motion.rect x={left} y={y + 8} width={scale(s.avg) - left} height={10} fill={markColor(s.avg)} rx={3}
              initial={reduceMotion ? false : { scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : Math.min(i * 0.04, 0.5) }}
              style={{ transformBox: "fill-box", transformOrigin: "left center", filter: active === i ? `drop-shadow(0 0 5px ${markColor(s.avg)})` : undefined }} />
            <text className="chart-bar-value" x={scale(s.avg) + 8} y={y + 16}>
              {s.avg.toFixed(2).replace(".", ",")}
            </text>
            <rect x={0} y={y} width={W} height={rowH} fill="transparent" tabIndex={0}
              role="graphics-symbol" aria-label={`${s.name}: ${s.avg.toFixed(2).replace(".", ",")}`}
              onFocus={() => setActive(i)} onBlur={() => setActive(null)} />
          </g>
        );
      })}
    </svg>
    </div>
  );
}

export function DistributionBar() {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState<string | null>(null);
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-sm">
        {distribution.map((d, i) => (
          <motion.div key={d.mark} title={`${d.mark}: ${d.count} оценок · ${d.share.toFixed(1).replace(".", ",")}%`}
            onMouseEnter={() => setActive(d.mark)} onMouseLeave={() => setActive(null)}
            initial={reduceMotion ? false : { scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: reduceMotion ? 0 : 0.65, delay: reduceMotion ? 0 : i * 0.09 }}
            style={{ width: `${d.share}%`, background: d.color, transformOrigin: "left center", filter: active === d.mark ? `brightness(1.18) drop-shadow(0 0 4px ${d.color})` : undefined }} />
        ))}
      </div>
      <div className="mt-4 space-y-1.5">
        {distribution.map((d) => (
          <div key={d.mark} className="flex items-center gap-3 rounded-md px-1 text-sm transition-colors hover:bg-band" onMouseEnter={() => setActive(d.mark)} onMouseLeave={() => setActive(null)}>
            <span className="h-3.5 w-3.5 shrink-0 rounded-sm" style={{ background: d.color }} />
            <span className="w-3 font-semibold">{d.mark}</span>
            <span className="flex-1 text-ink2">{d.label}</span>
            <span className="font-mono font-medium tabular-nums">{d.count}</span>
            <span className="w-14 text-right font-mono text-ink2 tabular-nums">
              {d.share.toFixed(1).replace(".", ",")}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const gradeScale = distribution;
