/* Verify the TS port against the authoritative Python payload. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseExport } from "../lib/parse";
import type { Payload } from "../lib/types";

async function main() {
  const root = path.resolve(__dirname, "../..");
  const buf = readFileSync(path.join(root, "web/fixtures/averages-sample.xlsx"));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const ts = parseExport(ab, "9А", 9);

  const seed = JSON.parse(
    readFileSync(path.join(__dirname, "../lib/seed/payloads.json"), "utf8"),
  ) as Record<string, { prev: Payload; curr: Payload }>;
  const py = seed["9А"].curr;

  let failures = 0;
  const eq = (label: string, a: unknown, b: unknown) => {
    const ja = JSON.stringify(a);
    const jb = JSON.stringify(b);
    if (ja !== jb) {
      failures++;
      console.error(`MISMATCH ${label}\n  ts: ${ja}\n  py: ${jb}`);
    }
  };

  eq("kpis", ts.kpis, py.kpis);
  eq("marks", ts.marks, py.marks);
  eq("categories", ts.categories, py.categories);
  eq("subjectNames", ts.subjectNames, py.subjectNames);
  eq("studentNames", ts.studentNames, py.studentNames);
  eq("strongSubjects", ts.strongSubjects, py.strongSubjects);
  eq("weakSubjects", ts.weakSubjects, py.weakSubjects);
  eq("noMarksStudents", ts.noMarksStudents, py.noMarksStudents);
  eq("emptySubjects", ts.emptySubjects, py.emptySubjects);

  for (let i = 0; i < py.rows.length; i++) {
    eq(`row[${i}].avg`, ts.rows[i].avg, py.rows[i].avg);
    eq(`row[${i}].category`, ts.rows[i].category, py.rows[i].category);
    eq(`row[${i}].marks`, ts.rows[i].marks, py.rows[i].marks);
    eq(`row[${i}].counts`, ts.rows[i].counts, py.rows[i].counts);
    eq(`row[${i}].subjByMark`, ts.rows[i].subjByMark, py.rows[i].subjByMark);
  }
  for (let j = 0; j < py.subjects.length; j++) {
    eq(`subject[${j}]`, ts.subjects[j], py.subjects[j]);
  }
  eq("ranking", ts.ranking, py.ranking);
  eq("groups", ts.groups, py.groups);

  if (failures === 0) {
    console.log(
      `OK: TS port matches Python exactly — ${ts.kpis.students} students, ` +
        `${ts.kpis.subjects} subjects, ${ts.kpis.marks} marks, avg=${ts.kpis.avg}`,
    );
  } else {
    console.error(`${failures} mismatches`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});