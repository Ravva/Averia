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
  { mark: "5", label: "отлично", count: 299, share: 67.2, color: "var(--m5)" },
  { mark: "4", label: "хорошо", count: 128, share: 28.8, color: "var(--m4)" },
  { mark: "3", label: "удовлетворительно", count: 17, share: 3.8, color: "var(--m3)" },
  { mark: "2", label: "неудовлетворительно", count: 1, share: 0.2, color: "var(--m2)" },
];

function markColor(avg: number) {
  if (avg >= 4.5) return "var(--m5)";
  if (avg >= 3.5) return "var(--m4)";
  if (avg >= 2.5) return "var(--m3)";
  return "var(--m2)";
}

export function SubjectsChart() {
  const W = 720;
  const left = 210;
  const right = 60;
  const rowH = 30;
  const top = 8;
  const H = top + subjects.length * rowH + 26;
  const min = 3.5;
  const max = 5.0;
  const scale = (v: number) => left + ((v - min) / (max - min)) * (W - left - right);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Средний балл по предметам">
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
          <g key={s.name}>
            <text className="chart-bar-label" x={0} y={y + 15}>
              {s.name}
            </text>
            <rect x={left} y={y + 4} width={scale(s.avg) - left} height={14} fill={markColor(s.avg)} rx={3} />
            <text className="chart-bar-value" x={scale(s.avg) + 8} y={y + 16}>
              {s.avg.toFixed(2).replace(".", ",")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function DistributionBar() {
  return (
    <div>
      <div className="flex h-9 w-full overflow-hidden rounded-md">
        {distribution.map((d) => (
          <div key={d.mark} style={{ width: `${d.share}%`, background: d.color }} />
        ))}
      </div>
      <div className="mt-4 space-y-1.5">
        {distribution.map((d) => (
          <div key={d.mark} className="flex items-center gap-3 text-sm">
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
