#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Compute the dashboard payload from a school averages export.

Usage:
    python build_dashboard_data.py --source averageMarks.xlsx --output dashboard-data.json

The arithmetic is the same as the workbook build (half-up rounding, the six
mutually exclusive categories), so the dashboard and the XLSX can never
disagree. The output is a JSON document meant to be embedded into the
generated HTML, not to be edited by hand.
"""

from __future__ import annotations

import argparse
import decimal
import json
import sys

import pandas as pd

CATEGORIES = [
    ("Отличник (все 5)", "Все оценки — пятёрки"),
    ("Одна 4", "Единственная четвёрка, остальные — пятёрки"),
    ("Две и более 4", "Две и более четвёрок, без троек и двоек"),
    ("Одна 3, без 2", "Единственная тройка, двоек нет"),
    ("Две и более 3, без 2", "Две и более троек, двоек нет"),
    ("Есть оценка 2", "Хотя бы одна двойка"),
]


def extract_grade(path: str, class_name: str | None = None, sheet: str | None = None) -> int:
    if class_name:
        import re
        m = re.search(r'\b(7|8|9|10|11)\b', class_name)
        if m:
            return int(m.group(1))
    try:
        probe = pd.read_excel(path, sheet_name=sheet, header=None, dtype=str)
        if isinstance(probe, dict):
            sheet = sheet or next(iter(probe))
            probe = probe[sheet]
        if len(probe) > 2:
            row3 = str(probe.iloc[2, 0])
            import re
            m = re.search(r'\b(7|8|9|10|11)\b', row3)
            if m:
                return int(m.group(1))
    except Exception:
        pass
    return 9


def half_up(x, grade=9) -> int | None:
    if x is None or (not isinstance(x, (int, float)) and pd.isna(x)):
        return None
    try:
        value = float(x)
    except (TypeError, ValueError):
        return None
    if pd.isna(value):
        return None
    effective = value - 0.1 if grade in (7, 8) else value
    return int(decimal.Decimal(str(effective)).quantize(decimal.Decimal("1"),
                                                         rounding=decimal.ROUND_HALF_UP))


def read_source(path: str, sheet: str | None, header_cell: str | None):
    probe = pd.read_excel(path, sheet_name=sheet, header=None, dtype=str)
    if isinstance(probe, dict):
        sheet = sheet or next(iter(probe))
        probe = probe[sheet]

    if header_cell:
        header_row = int("".join(ch for ch in header_cell if ch.isdigit())) - 1
    else:
        header_row = None
        for idx in range(min(30, len(probe))):
            first = str(probe.iloc[idx, 0]).strip().lower()
            if first.startswith(("обучающ", "ученик", "student", "ф.и", "фио", "name")):
                header_row = idx
                break
        if header_row is None:
            raise SystemExit("Could not locate the header row; pass --header-cell.")

    frame = pd.read_excel(path, sheet_name=sheet, header=header_row, index_col=0, dtype=str)
    frame = frame.apply(pd.to_numeric, errors="coerce")
    frame = frame[[c for c in frame.columns
                   if str(c).strip() and frame[c].notna().any()]]
    # 0.00 means "never assessed" -> absent, not zero
    frame = frame.map(lambda v: v if (pd.notna(v) and v > 0) else None)
    frame = frame.dropna(how="all")
    return frame


def build_payload(frame: pd.DataFrame, class_name: str, data_date: str, grade: int = 9) -> dict:
    subjects = [str(c).strip() for c in frame.columns]
    students = [str(s).strip() for s in frame.index]
    n, m = len(students), len(subjects)

    # pandas.map() leaves NaN untouched, so the absent cells are rounded by
    # hand and the grid is kept as plain Python lists
    raw_grid = [[frame.iat[i, j] for j in range(m)] for i in range(n)]
    raw_grid = [[None if pd.isna(v) else float(v) for v in row] for row in raw_grid]
    marks = [[half_up(v, grade) for v in row] for row in raw_grid]

    # ---- per student ----
    rows = []
    cat_counts = {name: 0 for name, _ in CATEGORIES}
    tally = {5: 0, 4: 0, 3: 0, 2: 0}
    for i, name in enumerate(students):
        vals = marks[i]
        present = [v for v in vals if v is not None]
        counts = {mk: present.count(mk) for mk in (5, 4, 3, 2)}
        for mk, c in counts.items():
            tally[mk] += c
        
        subj_by_mark = {subjects[j]: vals[j] for j in range(m) if vals[j] is not None}

        if not present:
            cat = "нет оценок"
        elif counts[2] > 0:
            cat = "Есть оценка 2"
        elif counts[3] >= 2:
            cat = "Две и более 3, без 2"
        elif counts[3] == 1:
            cat = "Одна 3, без 2"
        elif counts[4] == 0:
            cat = "Отличник (все 5)"
        elif counts[4] == 1:
            cat = "Одна 4"
        else:
            cat = "Две и более 4"
        if cat in cat_counts:
            cat_counts[cat] += 1
        raw = raw_grid[i]
        present_raw = [v for v in raw if v is not None]
        rows.append({
            "name": name,
            "marks": vals,
            "raw": raw,
            "avg": round(sum(present_raw) / len(present_raw), 4) if present_raw else None,
            "counts": {str(k): int(v) for k, v in counts.items()},
            "total": int(len(present)),
            "category": cat,
            "subjByMark": subj_by_mark,
        })

    # ---- per subject ----
    subject_rows = []
    for j, subj in enumerate(subjects):
        col = [marks[i][j] for i in range(n)]
        present = [v for v in col if v is not None]
        raw = [raw_grid[i][j] for i in range(n)]
        raw_present = [v for v in raw if v is not None]
        missing_students = [students[i] for i in range(n) if raw_grid[i][j] is None]
        c = {mk: present.count(mk) for mk in (5, 4, 3, 2)}
        graded = c[5] + c[4] + c[3] + c[2]
        subject_rows.append({
            "name": subj,
            "avg": round(sum(raw_present) / len(raw_present), 4) if raw_present else None,
            "counts": {str(k): int(v) for k, v in c.items()},
            "graded": int(graded),
            "assessed": int(len(raw_present)),
            "success": round((c[5] + c[4] + c[3]) / graded, 4) if graded else None,
            "quality": round((c[5] + c[4]) / graded, 4) if graded else None,
            "missingStudents": missing_students,
        })

    # ---- class KPIs ----
    total_marks = sum(tally.values())
    n_students = n
    all_avgs = [r["avg"] for r in rows if r["avg"] is not None]
    without_2 = sum(1 for r in rows if r["counts"]["2"] == 0)
    without_2_3 = sum(1 for r in rows if r["counts"]["2"] == 0 and r["counts"]["3"] == 0)
    kpis = {
        "students": n_students,
        "marks": total_marks,
        "subjects": m,
        "avg": round(sum(all_avgs) / len(all_avgs), 4) if all_avgs else None,
        "success": round(without_2 / n_students, 4) if n_students else None,
        "quality": round(without_2_3 / n_students, 4) if n_students else None,
    }

    # a student with no marks at all is a real case the renderer must show
    # as absent, never as a zero
    no_marks_students = [r["name"] for r in rows if r["total"] == 0]
    # a subject nobody was assessed in has no average and no shares
    empty_subjects = [s["name"] for s in subject_rows if s["graded"] == 0]

    ranking = sorted([r for r in rows if r["avg"] is not None],
                     key=lambda r: (-r["avg"], rows.index(r)))

    def group_items(pred, detail_fn):
        res = []
        for r in rows:
            if pred(r):
                det = detail_fn(r)
                res.append({"name": r["name"], "detail": det})
        return res

    groups = [
        {"key": "excellent", "title": "Отличники",
         "hint": "только пятёрки",
         "items": group_items(lambda r: r["total"] > 0 and r["counts"]["5"] == r["total"], lambda r: ""),
         "tone": "m5"},
        {"key": "one_four", "title": "Одна четвёрка",
         "hint": "пятёрки и одна четвёрка",
         "items": group_items(
             lambda r: r["total"] > 0 and r["counts"]["2"] == 0 and r["counts"]["3"] == 0 and r["counts"]["4"] == 1,
             lambda r: next((f"{subj}: 4" for subj, m in r["subjByMark"].items() if m == 4), "")
         ),
         "tone": "m4"},
        {"key": "one_three", "title": "Одна тройка",
         "hint": "оценки 3, 4 и 5, тройка одна",
         "items": group_items(
             lambda r: r["total"] > 0 and r["counts"]["2"] == 0 and r["counts"]["3"] == 1,
             lambda r: next((f"{subj}: 3" for subj, m in r["subjByMark"].items() if m == 3), "")
         ),
         "tone": "m3"},
        {"key": "problem", "title": "Проблемные",
         "hint": "есть хотя бы одна двойка",
         "items": group_items(
             lambda r: r["counts"]["2"] > 0,
             lambda r: ", ".join(f"{subj}: {m}" for subj, m in r["subjByMark"].items() if m == 2)
         ),
         "tone": "m2"},
    ]

    # the subjects that carry the class and the subjects that need work
    graded_subjects = [s for s in subject_rows if s["avg"] is not None]
    by_avg = sorted(graded_subjects, key=lambda s: -s["avg"])
    strong = by_avg[:5]
    weak = sorted(graded_subjects, key=lambda s: s["avg"])[:3]

    return {
        "class": class_name,
        "date": data_date,
        "kpis": kpis,
        "definitions": {
            "success": "доля учеников, имеющих только оценки 3, 4 и 5",
            "quality": "доля учеников, имеющих только оценки 4 и 5",
            "avg": "средний балл класса по всем предметам",
        },
        "noMarksStudents": no_marks_students,
        "emptySubjects": empty_subjects,
        "groups": groups,
        "strongSubjects": [{"name": s["name"], "avg": s["avg"]} for s in strong],
        "weakSubjects": [{"name": s["name"], "avg": s["avg"]} for s in weak],
        "marks": [
            {"value": str(mk), "count": int(tally[mk]),
             "share": round(tally[mk] / total_marks, 4) if total_marks else None}
            for mk in (5, 4, 3, 2)
        ],
        "categories": [
            {"name": name, "hint": hint, "count": int(cat_counts[name]),
             "share": round(cat_counts[name] / n_students, 4) if n_students else None}
            for name, hint in CATEGORIES
        ],
        "subjects": subject_rows,
        "ranking": [
            {"place": i + 1, "name": r["name"], "avg": r["avg"],
             "counts": r["counts"], "total": r["total"], "category": r["category"]}
            for i, r in enumerate(ranking)
        ],
        "rows": rows,
        "subjectNames": subjects,
        "studentNames": students,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--source", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--class", dest="class_name", default="")
    ap.add_argument("--sheet", default=None)
    ap.add_argument("--header-cell", default=None)
    ap.add_argument("--date", default="", help="data date shown in the header")
    args = ap.parse_args()

    frame = read_source(args.source, args.sheet, args.header_cell)
    grade = extract_grade(args.source, args.class_name, args.sheet)
    payload = build_payload(frame, args.class_name, args.date, grade)

    # structural checks: the dashboard must not be able to show an
    # inconsistent class
    assert sum(c["count"] for c in payload["categories"]) == payload["kpis"]["students"], \
        "category counts do not sum to the student count"
    assert sum(m["count"] for m in payload["marks"]) == payload["kpis"]["marks"], \
        "mark counts do not sum to the total number of marks"
    assert len(payload["ranking"]) == payload["kpis"]["students"], \
        "ranking does not cover every student"

    with open(args.output, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=1)

    k = payload["kpis"]
    print(f"students={k['students']} subjects={k['subjects']} marks={k['marks']} "
          f"avg={k['avg']} success={k['success']} quality={k['quality']}")
    print(f"saved: {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
