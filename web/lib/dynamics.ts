import type { Payload } from "./types";

export interface StudentDelta {
  name: string;
  prevAvg: number | null;
  currAvg: number | null;
  delta: number | null;
  prevCategory: string | null;
  currCategory: string | null;
  status: "same" | "new" | "left";
}

export interface SubjectDelta {
  name: string;
  prevAvg: number | null;
  currAvg: number | null;
  delta: number | null;
  prevQuality: number | null;
  currQuality: number | null;
}

export interface Comparison {
  kpis: {
    avg: number | null;
    success: number | null;
    quality: number | null;
    students: number;
    marks: number;
  };
  students: StudentDelta[];
  improved: StudentDelta[];
  declined: StudentDelta[];
  newcomers: StudentDelta[];
  leavers: StudentDelta[];
  transitions: StudentDelta[];
  subjects: SubjectDelta[];
  marksShift: { value: string; prev: number; curr: number; delta: number }[];
}

const diff = (a: number | null, b: number | null): number | null =>
  a === null || b === null ? null : b - a;

export function comparePayloads(prev: Payload, curr: Payload): Comparison {
  const prevByName = new Map(prev.rows.map((r) => [r.name, r]));
  const currByName = new Map(curr.rows.map((r) => [r.name, r]));

  const students: StudentDelta[] = [];
  for (const r of curr.rows) {
    const p = prevByName.get(r.name);
    students.push({
      name: r.name,
      prevAvg: p?.avg ?? null,
      currAvg: r.avg,
      delta: diff(p?.avg ?? null, r.avg),
      prevCategory: p?.category ?? null,
      currCategory: r.category,
      status: p ? "same" : "new",
    });
  }
  for (const p of prev.rows) {
    if (!currByName.has(p.name)) {
      students.push({
        name: p.name,
        prevAvg: p.avg,
        currAvg: null,
        delta: null,
        prevCategory: p.category,
        currCategory: null,
        status: "left",
      });
    }
  }

  const both = students.filter((s) => s.status === "same" && s.delta !== null);
  const improved = [...both].sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0)).filter((s) => (s.delta ?? 0) > 0);
  const declined = [...both].sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0)).filter((s) => (s.delta ?? 0) < 0);
  const transitions = both.filter(
    (s) => s.prevCategory && s.currCategory && s.prevCategory !== s.currCategory,
  );

  const prevSubj = new Map(prev.subjects.map((s) => [s.name, s]));
  const subjects: SubjectDelta[] = curr.subjects.map((s) => {
    const p = prevSubj.get(s.name);
    return {
      name: s.name,
      prevAvg: p?.avg ?? null,
      currAvg: s.avg,
      delta: diff(p?.avg ?? null, s.avg),
      prevQuality: p?.quality ?? null,
      currQuality: s.quality,
    };
  });

  const prevMarks = new Map(prev.marks.map((m) => [m.value, m.count]));
  const marksShift = curr.marks.map((m) => {
    const p = prevMarks.get(m.value) ?? 0;
    return { value: m.value, prev: p, curr: m.count, delta: m.count - p };
  });

  return {
    kpis: {
      avg: diff(prev.kpis.avg, curr.kpis.avg),
      success: diff(prev.kpis.success, curr.kpis.success),
      quality: diff(prev.kpis.quality, curr.kpis.quality),
      students: curr.kpis.students - prev.kpis.students,
      marks: curr.kpis.marks - prev.kpis.marks,
    },
    students,
    improved,
    declined,
    newcomers: students.filter((s) => s.status === "new"),
    leavers: students.filter((s) => s.status === "left"),
    transitions,
    subjects,
    marksShift,
  };
}