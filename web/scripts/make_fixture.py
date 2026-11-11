#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Generate the synthetic averages fixture used by the app and by the parity test.

The fixture mimics the shape of a real school export — four header rows, a
header row of subjects, then one row per student with averages as text and
`0.00` meaning "never assessed" — but every value is fabricated and every
name is a placeholder, so no personal data ever reaches the repository.

Usage:
    python make_fixture.py
"""
import random
from pathlib import Path

from openpyxl import Workbook

SEED = 20261111
STUDENTS = 28
DATE = "09.11.2026"
PERIOD = "01.09.2026 — 31.08.2027"
CLASS = "9А"

SUBJECTS = [
    "Алгебра", "Биология", "Вероятность и статистика", "География", "Геометрия",
    "Иностранный (английский) язык", "Информатика", "История", "Литература",
    "Обществознание", "Основы безопасности и защиты Родины", "Русский язык",
    "Труд (технология)", "Физика", "Физическая культура", "Химия",
]

# Values that exercise the half-up rounding rule on the boundary: 4.50 -> 5,
# 4.49 -> 4, 4.60 -> 6 for the 7-8 threshold rule.
EDGE = ["4.50", "4.49", "4.45", "4.55", "4.60", "2.50", "3.50"]


def main() -> None:
    rng = random.Random(SEED)
    wb = Workbook()
    ws = wb.active
    ws.title = "Лист1"

    ws["A1"] = f"Дата: {DATE} 12:00"
    ws["A2"] = f"Период: {PERIOD}"
    ws["A3"] = f"Класс: {CLASS}"
    ws["A4"] = "Оценки: Все"
    ws["A6"] = "Обучающийся"
    for c, subj in enumerate(SUBJECTS, start=2):
        ws.cell(row=6, column=c, value=subj)

    for i in range(STUDENTS):
        row = 7 + i
        ws.cell(row=row, column=1, value=f"Ученик {i + 1:02d}")
        ability = rng.gauss(4.42, 0.38)
        for c in range(2, 2 + len(SUBJECTS)):
            if rng.random() < 0.008:
                value = 0.0  # never assessed
            elif rng.random() < 0.05:
                value = float(EDGE[rng.randrange(len(EDGE))])
            else:
                value = round(min(5.0, max(2.0, rng.gauss(ability, 0.30))), 2)
            ws.cell(row=row, column=c, value=f"{value:.2f}")

    # A few hand-set rows so every category is represented in the demo data:
    # an all-fives student, one with a single 4, one with a single 3, one with
    # several 3s and one carrying an unsatisfactory mark.
    def pin(row: int, subject_index: int, value: str) -> None:
        ws.cell(row=row, column=2 + subject_index, value=value)

    def fill(row: int, value: str) -> None:
        for c in range(2, 2 + len(SUBJECTS)):
            ws.cell(row=row, column=c, value=value)

    fill(7, "5.00")
    fill(8, "5.00")
    pin(8, 3, "4.00")
    fill(9, "5.00")
    pin(9, 5, "3.00")
    fill(10, "5.00")
    pin(10, 2, "3.00")
    pin(10, 7, "3.00")
    fill(11, "5.00")
    pin(11, 9, "2.00")
    pin(11, 11, "3.00")

    dest = Path(__file__).resolve().parents[1] / "fixtures" / "averages-sample.xlsx"
    dest.parent.mkdir(parents=True, exist_ok=True)
    wb.save(dest)
    print(f"saved: {dest}")


if __name__ == "__main__":
    main()
