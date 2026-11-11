import type { Group, MarkCounts, Payload, StudentRow, SubjectRow } from "./types";

export const CATEGORIES: [string, string][] = [
  ["Отличник (все 5)", "Все оценки — пятёрки"],
  ["Одна 4", "Единственная четвёрка, остальные — пятёрки"],
  ["Две и более 4", "Две и более четвёрок, без троек и двоек"],
  ["Одна 3, без 2", "Единственная тройка, двоек нет"],
  ["Две и более 3, без 2", "Две и более троек, двоек нет"],
  ["Есть оценка 2", "Хотя бы одна двойка"],
];

export const DEFINITIONS = {
  success: "доля учеников, имеющих только оценки 3, 4 и 5",
  quality: "доля учеников, имеющих только оценки 4 и 5",
  avg: "средний балл класса по всем предметам",
};

// Mirrors Decimal(str(x)).quantize(1, ROUND_HALF_UP) from the Python source.
// String(x) is the shortest round-trip repr, same as Python str().
export function halfUp(x: number | null, grade: number): number | null {
  if (x === null || Number.isNaN(x)) return null;
  const effective = grade === 7 || grade === 8 ? x - 0.1 : x;
  const s = String(effective);
  const negative = s.startsWith("-");
  const [intPart, fracPart = ""] = s.replace("-", "").split(".");
  let n = Number(intPart);
  if (fracPart.length > 0 && fracPart[0] >= "5") n += 1;
  return negative ? -n : n;
}

// Replicates Python round(x, 4): half-even on the exact binary value.
// toFixed(20) exposes the true binary expansion, so ties like 4.52875
// (stored as 4.52874999…) round down exactly as CPython does.
function round4(x: number): number {
  const s = x.toFixed(20);
  const negative = s.startsWith("-");
  const [intPart, fracPart = ""] = s.replace("-", "").split(".");
  const keep = fracPart.slice(0, 4).padEnd(4, "0");
  const rest = fracPart.slice(4).padEnd(16, "0");
  let q = Number(intPart + keep);
  const tie = "5000000000000000";
  if (rest > tie || (rest === tie && q % 2 !== 0)) q += 1;
  return (negative ? -q : q) / 10000;
}

function ratio4(num: number, den: number): number | null {
  if (den === 0) return null;
  return round4(num / den);
}

// CPython 3.12+ sum() uses Neumaier compensated summation; a naive reduce
// drifts by 1 ulp and flips half-even ties, so the port must match it.
function sumFloats(vals: number[]): number {
  let sum = 0;
  let c = 0;
  for (const v of vals) {
    const t = sum + v;
    if (Math.abs(sum) >= Math.abs(v)) c += sum - t + v;
    else c += v - t + sum;
    sum = t;
  }
  return sum + c;
}

function avg4(rawPresent: number[]): number | null {
  if (rawPresent.length === 0) return null;
  return round4(sumFloats(rawPresent) / rawPresent.length);
}

export interface SourceFrame {
  students: string[];
  subjects: string[];
  grid: (number | null)[][];
}

export function buildPayload(
  frame: SourceFrame,
  className: string,
  dataDate: string,
  grade: number,
  periodStart = "",
): Payload {
  const { students, subjects, grid } = frame;
  const n = students.length;
  const m = subjects.length;
  const marks = grid.map((row) => row.map((v) => halfUp(v, grade)));

  const rows: StudentRow[] = [];
  const catCounts: Record<string, number> = Object.fromEntries(
    CATEGORIES.map(([name]) => [name, 0]),
  );
  const tally: MarkCounts = { 5: 0, 4: 0, 3: 0, 2: 0 };

  for (let i = 0; i < n; i++) {
    const vals = marks[i];
    const present = vals.filter((v): v is number => v !== null);
    const counts: MarkCounts = {
      5: present.filter((v) => v === 5).length,
      4: present.filter((v) => v === 4).length,
      3: present.filter((v) => v === 3).length,
      2: present.filter((v) => v === 2).length,
    };
    (Object.keys(counts) as (keyof MarkCounts)[]).forEach((k) => {
      tally[k] += counts[k];
    });

    const subjByMark: Record<string, number> = {};
    for (let j = 0; j < m; j++) {
      if (vals[j] !== null) subjByMark[subjects[j]] = vals[j] as number;
    }

    let cat: string;
    if (present.length === 0) cat = "нет оценок";
    else if (counts[2] > 0) cat = "Есть оценка 2";
    else if (counts[3] >= 2) cat = "Две и более 3, без 2";
    else if (counts[3] === 1) cat = "Одна 3, без 2";
    else if (counts[4] === 0) cat = "Отличник (все 5)";
    else if (counts[4] === 1) cat = "Одна 4";
    else cat = "Две и более 4";
    if (cat in catCounts) catCounts[cat] += 1;

    const raw = grid[i];
    const presentRaw = raw.filter((v): v is number => v !== null);
    rows.push({
      name: students[i],
      marks: vals,
      raw,
      avg: avg4(presentRaw),
      counts,
      total: present.length,
      category: cat,
      subjByMark,
    });
  }

  const subjectRows: SubjectRow[] = subjects.map((subj, j) => {
    const col = marks.map((row) => row[j]);
    const present = col.filter((v): v is number => v !== null);
    const rawPresent = grid
      .map((row) => row[j])
      .filter((v): v is number => v !== null);
    const missingStudents = students.filter((_, i) => grid[i][j] === null);
    const counts: MarkCounts = {
      5: present.filter((v) => v === 5).length,
      4: present.filter((v) => v === 4).length,
      3: present.filter((v) => v === 3).length,
      2: present.filter((v) => v === 2).length,
    };
    const graded = counts[5] + counts[4] + counts[3] + counts[2];
    return {
      name: subj,
      avg: avg4(rawPresent),
      counts,
      graded,
      assessed: rawPresent.length,
      success: ratio4(counts[5] + counts[4] + counts[3], graded),
      quality: ratio4(counts[5] + counts[4], graded),
      missingStudents,
    };
  });

  const totalMarks = tally[5] + tally[4] + tally[3] + tally[2];
  const allAvgs = rows.map((r) => r.avg).filter((v): v is number => v !== null);
  const without2 = rows.filter((r) => r.counts[2] === 0).length;
  const without23 = rows.filter((r) => r.counts[2] === 0 && r.counts[3] === 0).length;

  const kpis = {
    students: n,
    marks: totalMarks,
    subjects: m,
    avg:
      allAvgs.length > 0
        ? round4(sumFloats(allAvgs) / allAvgs.length)
        : null,
    success: ratio4(without2, n),
    quality: ratio4(without23, n),
  };

  const noMarksStudents = rows.filter((r) => r.total === 0).map((r) => r.name);
  const emptySubjects = subjectRows.filter((s) => s.graded === 0).map((s) => s.name);

  const ranked = rows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.avg !== null)
    .sort((a, b) => (b.r.avg as number) - (a.r.avg as number) || a.i - b.i);

  const groupItems = (
    pred: (r: StudentRow) => boolean,
    detailFn: (r: StudentRow) => string,
  ) => rows.filter(pred).map((r) => ({ name: r.name, detail: detailFn(r) }));

  const groups: Group[] = [
    {
      key: "excellent",
      title: "Отличники",
      hint: "только пятёрки",
      items: groupItems(
        (r) => r.total > 0 && r.counts[5] === r.total,
        () => "",
      ),
      tone: "m5",
    },
    {
      key: "one_four",
      title: "Одна четвёрка",
      hint: "пятёрки и одна четвёрка",
      items: groupItems(
        (r) => r.total > 0 && r.counts[2] === 0 && r.counts[3] === 0 && r.counts[4] === 1,
        (r) => {
          const hit = Object.entries(r.subjByMark).find(([, mk]) => mk === 4);
          return hit ? `${hit[0]}: 4` : "";
        },
      ),
      tone: "m4",
    },
    {
      key: "one_three",
      title: "Одна тройка",
      hint: "оценки 3, 4 и 5, тройка одна",
      items: groupItems(
        (r) => r.total > 0 && r.counts[2] === 0 && r.counts[3] === 1,
        (r) => {
          const hit = Object.entries(r.subjByMark).find(([, mk]) => mk === 3);
          return hit ? `${hit[0]}: 3` : "";
        },
      ),
      tone: "m3",
    },
    {
      key: "problem",
      title: "Проблемные",
      hint: "есть хотя бы одна двойка",
      items: groupItems(
        (r) => r.counts[2] > 0,
        (r) =>
          Object.entries(r.subjByMark)
            .filter(([, mk]) => mk === 2)
            .map(([subj, mk]) => `${subj}: ${mk}`)
            .join(", "),
      ),
      tone: "m2",
    },
  ];

  const gradedSubjects = subjectRows.filter((s) => s.avg !== null);
  const byAvg = [...gradedSubjects].sort(
    (a, b) => (b.avg as number) - (a.avg as number),
  );
  const strong = byAvg.slice(0, 5);
  const weak = [...gradedSubjects].sort(
    (a, b) => (a.avg as number) - (b.avg as number),
  ).slice(0, 3);

  const payload: Payload = {
    class: className,
    date: dataDate,
    periodStart,
    grade,
    kpis,
    definitions: DEFINITIONS,
    noMarksStudents,
    emptySubjects,
    groups,
    strongSubjects: strong.map((s) => ({ name: s.name, avg: s.avg as number })),
    weakSubjects: weak.map((s) => ({ name: s.name, avg: s.avg as number })),
    marks: ([5, 4, 3, 2] as const).map((mk) => ({
      value: String(mk),
      count: tally[mk],
      share: ratio4(tally[mk], totalMarks),
    })),
    categories: CATEGORIES.map(([name, hint]) => ({
      name,
      hint,
      count: catCounts[name],
      share: ratio4(catCounts[name], n),
    })),
    subjects: subjectRows,
    ranking: ranked.map(({ r }, i) => ({
      place: i + 1,
      name: r.name,
      avg: r.avg as number,
      counts: r.counts,
      total: r.total,
      category: r.category,
    })),
    rows,
    subjectNames: subjects,
    studentNames: students,
  };

  assertPayload(payload);
  return payload;
}

export function assertPayload(p: Payload): void {
  const catSum = p.categories.reduce((s, c) => s + c.count, 0);
  if (catSum !== p.kpis.students)
    throw new Error("category counts do not sum to the student count");
  const markSum = p.marks.reduce((s, mk) => s + mk.count, 0);
  if (markSum !== p.kpis.marks)
    throw new Error("mark counts do not sum to the total number of marks");
  if (p.ranking.length !== p.kpis.students)
    throw new Error("ranking does not cover every student");
}