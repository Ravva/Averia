#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Generate seed payloads with the authoritative Python arithmetic.

Reads the synthetic averages fixture (fixtures/averages-sample.xlsx), derives
an earlier snapshot by perturbing raw averages, and synthesises two more
classes (7Б, 10В) so the web prototype opens populated. Every name and every
number is fabricated: no real school data enters the repository.

Output: web/lib/seed/payloads.json
"""
import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "skills" / "class-performance-report" / "scripts"))

import pandas as pd
from build_dashboard_data import build_payload, read_source, extract_grade

rng = random.Random(20261111)

FIRST = ["Александр", "Дмитрий", "Максим", "Артём", "Иван", "Михаил", "Даниил", "Кирилл",
         "Андрей", "Егор", "Никита", "Илья", "Роман", "Тимофей", "Владимир", "Павел",
         "Анна", "Мария", "София", "Алиса", "Дарья", "Полина", "Елизавета", "Виктория",
         "Ксения", "Валерия", "Арина", "Вероника", "Таисия", "Ульяна"]
LAST = ["Смирнов", "Иванов", "Кузнецов", "Соколов", "Попов", "Лебедев", "Козлов", "Новиков",
        "Петров", "Волков", "Соловьёв", "Васильев", "Зайцев", "Павлов", "Семёнов",
        "Голубев", "Виноградов", "Богданов", "Воробьёв", "Фёдоров", "Михайлов", "Беляев",
        "Тарасов", "Белов", "Комаров", "Орлов", "Киселёв", "Макаров", "Андреев", "Ершов"]

SUBJ_7 = ["Русский язык", "Литература", "Алгебра", "Геометрия", "История", "Обществознание",
          "География", "Биология", "Английский язык", "Информатика", "Физика", "ИЗО",
          "Музыка", "Технология", "Физкультура"]
SUBJ_10 = ["Русский язык", "Литература", "Алгебра", "Геометрия", "История", "Обществознание",
           "География", "Биология", "Химия", "Физика", "Английский язык", "Информатика",
           "Астрономия", "ОБЗР", "Физкультура"]


def perturb(frame: pd.DataFrame, scale: float) -> pd.DataFrame:
    out = frame.copy()
    for i in range(len(out.index)):
        drift = rng.uniform(-0.22, 0.10)  # earlier snapshot: slightly weaker overall
        for j in range(len(out.columns)):
            v = out.iat[i, j]
            if pd.notna(v):
                nv = float(v) + drift + rng.uniform(-scale, scale)
                out.iat[i, j] = round(min(5.0, max(2.0, nv)), 2)
    return out


def synth_class(n: int, subjects: list[str], base: float) -> pd.DataFrame:
    names = []
    used = set()
    while len(names) < n:
        sex = rng.random() < 0.5
        first = rng.choice(FIRST[:16] if sex else FIRST[16:])
        last = rng.choice(LAST)
        if not sex:
            last = last + "а" if not last.endswith(("ий", "ой")) else last[:-2] + "ая"
        name = f"{last} {first}"
        if name not in used:
            used.add(name)
            names.append(name)
    data = {}
    for s in subjects:
        subj_base = base + rng.uniform(-0.45, 0.35)
        col = []
        for _ in names:
            if rng.random() < 0.04:
                col.append(None)
            else:
                col.append(round(min(5.0, max(2.0, rng.gauss(subj_base, 0.55))), 2))
        data[s] = col
    return pd.DataFrame(data, index=names)


def main() -> None:
    src = ROOT / "web" / "fixtures" / "averages-sample.xlsx"
    frame = read_source(str(src), None, None)
    grade = extract_grade(str(src), "9А", None)
    curr = build_payload(frame, "9А", "09.11.2026", grade)
    prev = build_payload(perturb(frame, 0.12), "9А", "22.10.2026", grade)

    out = {"9А": {"prev": prev, "curr": curr}}
    for name, n, subjects, base, gr in [("7Б", 24, SUBJ_7, 4.3, 7), ("10В", 25, SUBJ_10, 4.25, 10)]:
        f = synth_class(n, subjects, base)
        out[name] = {
            "prev": build_payload(perturb(f, 0.12), name, "22.10.2026", gr),
            "curr": build_payload(f, name, "09.11.2026", gr),
        }

    dest = Path(__file__).resolve().parents[1] / "lib" / "seed" / "payloads.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    with open(dest, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False)
    for k, v in out.items():
        c, p = v["curr"]["kpis"], v["prev"]["kpis"]
        print(f"{k}: curr avg={c['avg']} success={c['success']} quality={c['quality']} | "
              f"prev avg={p['avg']} students={c['students']}")
    print(f"saved: {dest}")


if __name__ == "__main__":
    main()