"use client";

import { useState } from "react";

/* Catmull-Rom spline -> cubic Bezier path, for a smooth sinusoidal curve */
function smoothPath(points: { x: number; y: number }[], tension = 0.5) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + ((p2.x - p0.x) / 6) * tension * 2;
    const c1y = p1.y + ((p2.y - p0.y) / 6) * tension * 2;
    const c2x = p2.x - ((p3.x - p1.x) / 6) * tension * 2;
    const c2y = p2.y - ((p3.y - p1.y) / 6) * tension * 2;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

const dynamicsData = [
  { period: "Сен", avg: 4.12, marks: 386 },
  { period: "Окт", avg: 4.28, marks: 402 },
  { period: "Ноя", avg: 4.21, marks: 395 },
  { period: "Дек", avg: 4.42, marks: 418 },
  { period: "Янв", avg: 4.38, marks: 407 },
  { period: "Фев", avg: 4.55, marks: 431 },
  { period: "Мар", avg: 4.61, marks: 445 },
  { period: "Апр", avg: 4.58, marks: 438 },
];

export function DynamicsLineChart() {
  const [active, setActive] = useState<number | null>(null);
  const W = 720;
  const H = 320;
  const padL = 40;
  const padR = 24;
  const padT = 24;
  const padB = 40;
  const min = 4.0;
  const max = 4.8;
  const x = (i: number) => padL + (i / (dynamicsData.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);

  const pts = dynamicsData.map((d, i) => ({ x: x(i), y: y(d.avg) }));
  const line = smoothPath(pts);
  const area = `${line} L ${x(dynamicsData.length - 1)} ${H - padB} L ${padL} ${H - padB} Z`;
  const ticks = [4.0, 4.2, 4.4, 4.6, 4.8];
  const activePoint = active === null ? null : pts[active];
  const activeData = active === null ? null : dynamicsData[active];
  const tooltipW = 132;
  const tooltipH = 62;
  const tooltipX = activePoint
    ? Math.min(Math.max(activePoint.x - tooltipW / 2, padL), W - padR - tooltipW)
    : 0;
  const tooltipY = activePoint
    ? activePoint.y - tooltipH - 16 >= 8
      ? activePoint.y - tooltipH - 16
      : activePoint.y + 18
    : 0;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="group"
      aria-label="Динамика среднего балла. Наведите на точку или перейдите к ней клавишей Tab, чтобы увидеть значение."
      onMouseLeave={() => setActive(null)}
    >
      <defs>
        <linearGradient id="dyn-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {ticks.map((t) => (
        <g key={t}>
          <line className="chart-grid" x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} />
          <text className="chart-axis-text" x={padL - 10} y={y(t) + 4} textAnchor="end">
            {t.toFixed(1).replace(".", ",")}
          </text>
        </g>
      ))}

      <path d={area} fill="url(#dyn-fill)" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />

      {activePoint && (
        <line
          x1={activePoint.x}
          y1={padT}
          x2={activePoint.x}
          y2={H - padB}
          stroke="var(--accent)"
          strokeWidth="1"
          strokeDasharray="3 4"
          opacity="0.55"
          pointerEvents="none"
        />
      )}

      {pts.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r={active === i ? 6 : 4.5}
            fill="var(--paper-2)"
            stroke="var(--accent)"
            strokeWidth="2.5"
            pointerEvents="none"
          />
          <text className="chart-axis-text" x={p.x} y={H - padB + 20} textAnchor="middle">
            {dynamicsData[i].period}
          </text>
          <circle
            cx={p.x}
            cy={p.y}
            r="18"
            fill="transparent"
            tabIndex={0}
            role="graphics-symbol"
            aria-label={`${dynamicsData[i].period}: средний балл ${dynamicsData[i].avg.toFixed(2).replace(".", ",")}`}
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
          />
        </g>
      ))}

      {active === null && (
        <text
          x={pts[pts.length - 1].x}
          y={pts[pts.length - 1].y - 14}
          textAnchor="end"
          className="chart-bar-value"
          fill="var(--accent)"
        >
          4,58
        </text>
      )}

      {activePoint && activeData && (
        <g pointerEvents="none" role="status" aria-live="polite">
          <rect
            x={tooltipX}
            y={tooltipY}
            width={tooltipW}
            height={tooltipH}
            rx="6"
            fill="var(--paper-2)"
            stroke="var(--rule)"
          />
          <text x={tooltipX + 12} y={tooltipY + 20} fontSize="11" fill="var(--ink-2)">
            {activeData.period} · {activeData.marks} оценок
          </text>
          <text x={tooltipX + 12} y={tooltipY + 45} fontSize="20" fontWeight="600" fill="var(--ink)">
            {activeData.avg.toFixed(2).replace(".", ",")}
          </text>
        </g>
      )}
    </svg>
  );
}

/* ---- Isometric layered diagram (docs-diagrams style) ---- */

type IsoLayer = {
  id: string;
  index: string;
  title: string;
  caption: string;
  accent: string;
  rows: { label: string; value: string; highlight?: boolean }[];
};

const isoLayers: IsoLayer[] = [
  {
    id: "excellent",
    index: "01",
    title: "createExcellence",
    caption: "299 оценок «5». 67,2% всех отметок.",
    accent: "var(--m5)",
    rows: [
      { label: "Отличники", value: "2 ученика" },
      { label: "Обществознание", value: "5,00", highlight: true },
      { label: "История", value: "4,87" },
    ],
  },
  {
    id: "good",
    index: "02",
    title: "createProgress",
    caption: "128 оценок «4». Основа качества знаний.",
    accent: "var(--m4)",
    rows: [
      { label: "Две и более 4", value: "14 учеников" },
      { label: "Биология", value: "4,44", highlight: true },
      { label: "Алгебра", value: "4,25" },
    ],
  },
  {
    id: "risk",
    index: "03",
    title: "createAttention",
    caption: "17 оценок «3» и 1 «2». Точки роста.",
    accent: "var(--m2)",
    rows: [
      { label: "Одна 3, без 2", value: "6 учеников" },
      { label: "Геометрия", value: "4,09", highlight: true },
      { label: "Химия", value: "3,89" },
    ],
  },
];

export function IsometricLayers() {
  const W = 760;
  const cardW = 360;
  const cardH = 92;
  const skew = 0.42;
  const stepY = 158;
  const lastTop = 56 + (isoLayers.length - 1) * stepY;
  const contentBottom = lastTop + cardH + cardW * skew;
  const H = Math.ceil(contentBottom + 44);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Изометрическая диаграмма состава класса">
      <rect x="0" y="0" width={W} height={H} rx="16" fill="var(--iso-canvas)" />

      {/* corner plus marks */}
      {[
        [24, 24],
        [W - 24, 24],
        [24, H - 24],
        [W - 24, H - 24],
      ].map(([cx, cy], i) => (
        <g key={i} stroke="var(--iso-grid)" strokeWidth="1.5">
          <line x1={cx - 7} y1={cy} x2={cx + 7} y2={cy} />
          <line x1={cx} y1={cy - 7} x2={cx} y2={cy + 7} />
        </g>
      ))}

      {/* dashed vertical guide through the stack */}
      <line
        x1="232"
        y1="60"
        x2="232"
        y2={contentBottom - 12}
        stroke="var(--iso-grid)"
        strokeWidth="1"
        strokeDasharray="3 5"
      />

      {isoLayers.map((layer, i) => {
        const topY = 56 + i * stepY;
        const cx = 60;
        const cy = topY;
        // isometric parallelogram transform
        const transform = `translate(${cx} ${cy}) matrix(1 ${skew} 0 1 0 0)`;
        const callX = 470;
        const callY = topY + 30;
        const edgeX = cx + cardW;
        const edgeY = cy + cardW * skew + 14;

        return (
          <g key={layer.id}>
            {/* connector to callout */}
            <path
              d={`M ${edgeX} ${edgeY} L ${callX - 14} ${callY - 6}`}
              stroke="var(--iso-connector)"
              strokeWidth="1"
              fill="none"
            />
            <circle cx={edgeX} cy={edgeY} r="2.5" fill={layer.accent} />

            {/* card body */}
            <g transform={transform}>
              <rect
                x="0"
                y="0"
                width={cardW}
                height={cardH}
                rx="10"
                fill="var(--iso-card)"
                stroke="var(--iso-rule)"
                strokeWidth="1.25"
              />
              <rect x="0" y="0" width={cardW} height="4" rx="2" fill={layer.accent} opacity="0.85" />
              {layer.rows.map((r, ri) => (
                <g key={ri}>
                  <text
                    x="18"
                    y={30 + ri * 22}
                    fill={r.highlight ? "var(--iso-text)" : "var(--iso-muted)"}
                    fontSize="12.5"
                    fontFamily="inherit"
                  >
                    {r.label}
                  </text>
                  <text
                    x={cardW - 18}
                    y={30 + ri * 22}
                    textAnchor="end"
                    fill={r.highlight ? layer.accent : "var(--iso-value)"}
                    fontSize="12.5"
                    fontWeight="600"
                  >
                    {r.value}
                  </text>
                  {r.highlight && (
                    <rect
                      x={cardW - 96}
                      y={30 + ri * 22 - 13}
                      width="86"
                      height="18"
                      rx="4"
                      fill="none"
                      stroke={layer.accent}
                      strokeWidth="1"
                      opacity="0.6"
                    />
                  )}
                </g>
              ))}
            </g>

            {/* callout */}
            <g>
              <rect x={callX - 14} y={callY - 22} width="24" height="18" rx="4" fill="none" stroke="var(--iso-connector)" />
              <text x={callX - 2} y={callY - 9} textAnchor="middle" fill="var(--iso-muted)" fontSize="10.5" fontFamily="monospace">
                {layer.index}
              </text>
              <text x={callX + 20} y={callY - 8} fill="var(--iso-text)" fontSize="16" fontWeight="600">
                {layer.title}
              </text>
              <text x={callX + 20} y={callY + 14} fill="var(--iso-muted)" fontSize="12.5">
                {layer.caption}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
