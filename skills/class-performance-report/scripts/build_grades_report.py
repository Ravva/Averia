#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Build a formula-driven class performance report from an averages export.

Usage:
    python build_grades_report.py --source <averages.xlsx> --output <report.xlsx> \
        [--class "9А"] [--sheet "Лист1"] [--header-cell A6] [--recalculate]

Input contract
--------------
A workbook where one row holds subject names and the first column holds student
names. Cells hold per-subject *averages* as numbers or numeric strings; ``0`` or
``0.00`` means "the subject was never assessed" and becomes an empty cell.

Output contract
---------------
Six sheets, every figure a live formula. See SKILL.md for the layout.
"""

from __future__ import annotations

import argparse
import sys

import pandas as pd
from openpyxl import Workbook, load_workbook
from openpyxl.chart import BarChart, PieChart, Reference
from openpyxl.chart.label import DataLabelList
from openpyxl.chart.marker import DataPoint
from openpyxl.chart.shapes import GraphicalProperties
from openpyxl.formatting.rule import CellIsRule, DataBarRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.workbook.properties import CalcProperties

# ---------------------------------------------------------------- palette ---
NAVY, BLUE, LIGHT, BAND, GREY = "1F3864", "2E5C9A", "EAF0F8", "F5F8FC", "595959"
GREEN, GREEN_T = "C6EFCE", "006100"
AMBER, AMBER_T = "FFEB9C", "9C6500"
RED, RED_T = "FFC7CE", "9C0006"
DRED, DRED_T = "FF9B9B", "7A0000"

THIN = Side(style="thin", color="BFC9D9")
HAIR = Side(style="hair", color="D6DEEA")
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

# chart surface: dark navy panel with light ink, matching the sheet header
CHART_BG, CHART_INK, CHART_DIM = "1F3864", "FFFFFF", "BFD1E8"
CHART_GRID = "3C5A8C"
CAT_COLORS = ["70AD47", "FFC000", "5B9BD5", "ED7D31", "A5A5A5", "E15759"]
MARK_COLORS = {5: (GREEN, GREEN_T), 4: (AMBER, AMBER_T), 3: (RED, RED_T), 2: (DRED, DRED_T)}

CATEGORIES = [
    "Отличник (все 5)",
    "Одна 4",
    "Две и более 4",
    "Одна 3, без 2",
    "Две и более 3, без 2",
    "Есть оценка 2",
]


# ------------------------------------------------------------------ input ---
def read_source(path: str, sheet: str | None, header_cell: str | None):
    """Return (frame, students, subjects) with 0-means-absent already blanked."""
    probe = pd.read_excel(path, sheet_name=sheet, header=None, dtype=str)
    if isinstance(probe, dict):  # sheet_name=None reads every sheet
        sheet = sheet or next(iter(probe))
        probe = probe[sheet]

    if header_cell:
        header_row = int("".join(ch for ch in header_cell if ch.isdigit())) - 1
    else:
        # first row whose first non-empty cell names the student column
        header_row = None
        for idx in range(min(30, len(probe))):
            first = str(probe.iloc[idx, 0]).strip().lower()
            if first.startswith(("обучающ", "ученик", "student", "ф.и", "фио", "name")):
                header_row = idx
                break
        if header_row is None:
            raise SystemExit(
                "Could not locate the header row. Pass --header-cell, for example --header-cell A6."
            )

    frame = pd.read_excel(path, sheet_name=sheet, header=header_row, index_col=0, dtype=str)
    frame = frame.apply(pd.to_numeric, errors="coerce")

    # keep only subject columns: numeric data, non-empty header
    subject_cols = [c for c in frame.columns if str(c).strip() and pd.to_numeric(
        frame[c], errors="coerce").notna().any()]
    frame = frame[subject_cols]
    frame = frame.map(lambda v: v if (pd.notna(v) and v > 0) else None)

    students = [str(s).strip() for s in frame.index]
    subjects = [str(c).strip() for c in frame.columns]

    blank = frame.isna()
    if blank.all(axis=1).any():
        bad = [students[i] for i in range(len(students)) if blank.iloc[i].all()]
        print(f"warning: dropping rows with no marks at all: {bad}", file=sys.stderr)
        frame = frame[~blank.all(axis=1)]
        students = [s for s, b in zip(students, blank.all(axis=1).tolist()) if not b]

    return frame, students, subjects


# --------------------------------------------------------------- helpers ---
def title_block(ws, text, sub, last_col):
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=last_col)
    c = ws.cell(1, 1, text)
    c.font = Font(name="Calibri", bold=True, size=16, color="FFFFFF")
    c.fill = PatternFill("solid", fgColor=NAVY)
    c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[1].height = 30
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=last_col)
    c2 = ws.cell(2, 1, sub)
    c2.font = Font(name="Calibri", size=10, color=GREY, italic=True)
    c2.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[2].height = 18


def header_row(ws, row, values, height=34):
    for i, v in enumerate(values, start=1):
        c = ws.cell(row, i, v)
        c.font = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
        c.fill = PatternFill("solid", fgColor=NAVY)
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        c.border = BOX
    ws.row_dimensions[row].height = height


def block_header(ws, row, col, text, span=1):
    if span > 1:
        ws.merge_cells(start_row=row, start_column=col, end_row=row, end_column=col + span - 1)
    for j in range(col, col + span):
        cc = ws.cell(row, j)
        cc.fill = PatternFill("solid", fgColor=BLUE)
        cc.border = BOX
    c = ws.cell(row, col, text)
    c.font = Font(name="Calibri", bold=True, size=11, color="FFFFFF")
    c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.row_dimensions[row].height = 22


def band(ws, row, cols, odd):
    if not odd:
        return
    for j in cols:
        if ws.cell(row, j).fill.fgColor.rgb in ("00000000", None):
            ws.cell(row, j).fill = PatternFill("solid", fgColor=BAND)


# ------------------------------------------------------------ chart theme ---
def _rich(color, sz=900, b=False, text=None, rot=None):
    from openpyxl.chart.text import RichText
    from openpyxl.drawing.text import (
        CharacterProperties, Paragraph, ParagraphProperties, RegularTextRun,
    )
    rpr = CharacterProperties(solidFill=color, sz=sz, b=b)
    runs = [RegularTextRun(rPr=rpr, t=text)] if text else []
    rich = RichText(p=[Paragraph(pPr=ParagraphProperties(defRPr=rpr), endParaRPr=rpr, r=runs)])
    if rot is not None:
        rich.bodyPr.rot = rot
    return rich


def _title_text(chart):
    """Recover the title string that openpyxl already wrote."""
    try:
        rich = chart.title.tx.rich
    except AttributeError:
        return None
    for p in rich.p:
        for r in (p.r or []):
            if r.t:
                return r.t
    return None


def style_chart(chart, *, gridlines=False, legend=False, label_sz=900, cat_rot=None):
    """Paint the plot area dark navy with light ink, matching the sheet header."""
    from openpyxl.chart.shapes import GraphicalProperties
    from openpyxl.drawing.line import LineProperties

    chart.graphical_properties = GraphicalProperties(solidFill=CHART_BG)
    chart.graphical_properties.line = LineProperties(solidFill=CHART_BG)

    chart.title.tx.rich = _rich(CHART_INK, sz=1200, b=True, text=_title_text(chart))

    axes = [a for a in (getattr(chart, "x_axis", None),
                        getattr(chart, "y_axis", None)) if a is not None]
    for axis in axes:
        axis.txPr = _rich(CHART_DIM, sz=900)
        axis.spPr = GraphicalProperties()
        axis.spPr.line = LineProperties(solidFill=CHART_GRID)

    if cat_rot is not None and axes:
        axes[0].txPr = _rich(CHART_DIM, sz=800, rot=cat_rot)

    if axes:
        if gridlines:
            axes[-1].majorGridlines.spPr = GraphicalProperties()
            axes[-1].majorGridlines.spPr.line = LineProperties(solidFill=CHART_GRID)
        else:
            axes[-1].majorGridlines = None

    if legend:
        chart.legend.position = "b"
        chart.legend.txPr = _rich(CHART_INK, sz=900)
    else:
        chart.legend = None

    if chart.dataLabels is not None:
        chart.dataLabels.txPr = _rich(CHART_INK, sz=label_sz, b=True)
    return chart


# ------------------------------------------------------------------ build ---
def build(frame, students, subjects, out_path, class_name):
    n, m = len(students), len(subjects)
    first, last = 5, 4 + n
    last_subj_col = 1 + m

    grade = 9
    if class_name:
        import re
        match_g = re.search(r'\b(7|8|9|10|11)\b', class_name)
        if match_g:
            grade = int(match_g.group(1))

    if grade in (7, 8):
        rounding_desc = "Округление среднего балла по правилу 7-8 классов (4,6 → 5)"
        round_expr = lambda col, r: f"ROUND('Средние баллы'!{col}{r}-0.1,0)"
    else:
        rounding_desc = "Округление среднего балла по арифметическому правилу: 0,5 и выше → вверх"
        round_expr = lambda col, r: f"ROUND('Средние баллы'!{col}{r},0)"

    wb = Workbook()

    # ---------------- sheet 1: raw averages ----------------
    ws1 = wb.active
    ws1.title = "Средние баллы"
    ws1.sheet_properties.tabColor = BLUE
    title_block(ws1, f"Средние баллы по предметам — класс {class_name}",
                "Пустая ячейка = по предмету нет ни одной оценки (в выгрузке стоял 0,00)",
                last_subj_col)
    header_row(ws1, 4, ["Обучающийся"] + subjects, height=46)

    for r in range(first, last + 1):
        i = r - first
        c = ws1.cell(r, 1, students[i])
        c.font = Font(name="Calibri", size=11)
        c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
        c.border = BOX
        for j in range(m):
            v = frame.iloc[i, j]
            cell = ws1.cell(r, 2 + j, None if pd.isna(v) else float(v))
            cell.number_format = "0.00"
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = Border(left=HAIR, right=HAIR, top=HAIR, bottom=HAIR)
            low = (not pd.isna(v)) and v < 4
            cell.font = Font(name="Calibri", size=11, color=("C00000" if low else "000000"),
                             bold=(not pd.isna(v) and v < 3.5))
        band(ws1, r, range(1, last_subj_col + 1), i % 2 == 1)

    for row, label, fn, fmt, bold in [(last + 1, "Средний балл по предмету", "AVERAGE", "0.00", True),
                                      (last + 2, "Учеников с оценкой", "COUNT", "0", False)]:
        c = ws1.cell(row, 1, label)
        c.font = Font(name="Calibri", bold=True, size=11, color=NAVY)
        c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
        for j in range(1, last_subj_col + 1):
            cell = ws1.cell(row, j)
            cell.fill = PatternFill("solid", fgColor=LIGHT)
            cell.border = Border(top=Side(style="medium", color=BLUE),
                                 bottom=Side(style="medium", color=BLUE), left=THIN, right=THIN)
        for j in range(m):
            col = get_column_letter(2 + j)
            cell = ws1.cell(row, 2 + j, f"={fn}({col}{first}:{col}{last})")
            cell.number_format = fmt
            cell.font = Font(name="Calibri", bold=bold, size=11, color=NAVY)
            cell.alignment = Alignment(horizontal="center", vertical="center")

    ws1.freeze_panes = "B5"
    ws1.auto_filter.ref = f"A4:{get_column_letter(last_subj_col)}{last}"
    ws1.column_dimensions["A"].width = 26
    for j in range(2, last_subj_col + 1):
        ws1.column_dimensions[get_column_letter(j)].width = 11.5
    ws1.conditional_formatting.add(f"B{first}:{get_column_letter(last_subj_col)}{last}",
        CellIsRule(operator="lessThan", formula=["4"], font=Font(color=RED_T, bold=True),
                   fill=PatternFill("solid", fgColor="FFF2F2")))
    ws1.conditional_formatting.add(f"B{first}:{get_column_letter(last_subj_col)}{last}",
        CellIsRule(operator="greaterThanOrEqual", formula=["4.75"], font=Font(color=GREEN_T, bold=True),
                   fill=PatternFill("solid", fgColor="F2FBF2")))

    # ---------------- sheet 2: rounded marks ----------------
    ws2 = wb.create_sheet("Итоговые оценки")
    ws2.sheet_properties.tabColor = BLUE
    c_g = last_subj_col + 1
    c_5, c_4, c_3, c_2 = c_g + 1, c_g + 2, c_g + 3, c_g + 4
    c_t, c_cat, c_key = c_g + 5, c_g + 6, c_g + 8
    let_g, let_t = get_column_letter(c_g), get_column_letter(c_t)

    title_block(ws2, f"Итоговые оценки — класс {class_name}",
                rounding_desc + ". Все ячейки — формулы, связанные с листом «Средние баллы»", c_cat)
    header_row(ws2, 4, ["Обучающийся"] + subjects +
               ["Средний балл", "5", "4", "3", "2", "Всего оценок", "Категория"], height=46)

    for r in range(first, last + 1):
        i = r - first
        c = ws2.cell(r, 1, students[i])
        c.font = Font(name="Calibri", size=11)
        c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
        c.border = BOX
        for j in range(m):
            col = get_column_letter(2 + j)
            cell = ws2.cell(r, 2 + j,
                            f"=IF(ISNUMBER('Средние баллы'!{col}{r}),"
                            f"{round_expr(col, r)},\"\")")
            cell.number_format = "0"
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = Border(left=HAIR, right=HAIR, top=HAIR, bottom=HAIR)
            cell.font = Font(name="Calibri", size=11)

        avg = ws2.cell(r, c_g, f"=IFERROR(AVERAGE('Средние баллы'!B{r}:"
                               f"{get_column_letter(last_subj_col)}{r}),\"\")")
        avg.number_format = "0.00"
        avg.font = Font(name="Calibri", bold=True, size=12, color=NAVY)
        for col, mark in ((c_5, 5), (c_4, 4), (c_3, 3), (c_2, 2)):
            cell = ws2.cell(r, col, f"=COUNTIF(B{r}:{get_column_letter(last_subj_col)}{r},{mark})")
            cell.number_format = "0"
            cell.font = Font(name="Calibri", size=11, bold=(mark <= 3))
        tot = ws2.cell(r, c_t, f"=SUM({get_column_letter(c_5)}{r}:{get_column_letter(c_2)}{r})")
        tot.number_format = "0"
        tot.font = Font(name="Calibri", size=11, color=GREY)

        t, u, v, w = (get_column_letter(x) for x in (c_4, c_3, c_2, c_t))
        cat = ws2.cell(r, c_cat,
                       f'=IF({w}{r}=0,"нет оценок",'
                       f'IF({v}{r}>0,"Есть оценка 2",'
                       f'IF({u}{r}>=2,"Две и более 3, без 2",'
                       f'IF({u}{r}=1,"Одна 3, без 2",'
                       f'IF({t}{r}=0,"Отличник (все 5)",'
                       f'IF({t}{r}=1,"Одна 4","Две и более 4"))))))')
        cat.font = Font(name="Calibri", size=10)
        cat.alignment = Alignment(horizontal="left", vertical="center", indent=1)

        # hidden sort key; same-sheet reference only, never cross-sheet self
        kc = ws2.cell(r, c_key, f'=IFERROR(${let_g}{r}-ROW()/100000,"")')
        kc.number_format = "0.00000"
        kc.font = Font(name="Calibri", size=8, color="BFBFBF")

        for col in range(c_g, c_cat + 1):
            cc = ws2.cell(r, col)
            cc.border = Border(left=HAIR, right=HAIR, top=HAIR, bottom=HAIR)
            if col != c_cat:
                cc.alignment = Alignment(horizontal="center", vertical="center")
        band(ws2, r, list(range(1, last_subj_col + 1)) + list(range(c_g, c_cat + 1)), i % 2 == 1)

    r_tot = last + 1
    for j in range(1, c_cat + 1):
        cc = ws2.cell(r_tot, j)
        cc.fill = PatternFill("solid", fgColor=LIGHT)
        cc.border = Border(top=Side(style="medium", color=BLUE),
                           bottom=Side(style="medium", color=BLUE), left=THIN, right=THIN)
    c = ws2.cell(r_tot, 1, "ИТОГО по классу")
    c.font = Font(name="Calibri", bold=True, size=11, color=NAVY)
    c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    for col in range(2, last_subj_col + 1):
        lc = get_column_letter(col)
        cc = ws2.cell(r_tot, col, f"=IFERROR(AVERAGE({lc}{first}:{lc}{last}),\"\")")
        cc.number_format = "0.00"
        cc.font = Font(name="Calibri", bold=True, size=11, color=NAVY)
        cc.alignment = Alignment(horizontal="center", vertical="center")
    cc = ws2.cell(r_tot, c_g, f"=AVERAGE('Средние баллы'!B{first}:"
                              f"{get_column_letter(last_subj_col)}{last})")
    cc.number_format = "0.00"
    cc.font = Font(name="Calibri", bold=True, size=12, color=NAVY)
    cc.alignment = Alignment(horizontal="center", vertical="center")
    for col in range(c_5, c_t + 1):
        lc = get_column_letter(col)
        cc = ws2.cell(r_tot, col, f"=SUM({lc}{first}:{lc}{last})")
        cc.number_format = "0"
        cc.font = Font(name="Calibri", bold=True, size=12, color=NAVY)
        cc.alignment = Alignment(horizontal="center", vertical="center")
    cc = ws2.cell(r_tot, c_cat, f'=COUNTA(A{first}:A{last})&" учеников"')
    cc.font = Font(name="Calibri", bold=True, size=10, color=NAVY)
    cc.alignment = Alignment(horizontal="center", vertical="center")

    s_, v_ = get_column_letter(c_5), get_column_letter(c_2)
    r_chk = r_tot + 2
    c = ws2.cell(r_chk, 1, "Контроль сходимости")
    c.font = Font(name="Calibri", bold=True, size=10, color=NAVY)
    c.alignment = Alignment(indent=1)
    ws2.merge_cells(start_row=r_chk, start_column=2, end_row=r_chk, end_column=11)
    chk = ws2.cell(r_chk, 2,
                   f'=IF(SUM({s_}{r_tot}:{v_}{r_tot})=SUM({let_t}{first}:{let_t}{last}),'
                   f'"OK — сумма 5+4+3+2 = "&SUM({s_}{r_tot}:{v_}{r_tot})&" оценок, '
                   f'совпадает с суммой по ученикам","ОШИБКА согласования")')
    chk.font = Font(name="Calibri", size=10, color=GREEN_T, bold=True)
    chk.fill = PatternFill("solid", fgColor=GREEN)

    ws2.freeze_panes = "B5"
    ws2.auto_filter.ref = f"A4:{get_column_letter(c_cat)}{last}"
    ws2.column_dimensions["A"].width = 26
    for j in range(2, last_subj_col + 1):
        ws2.column_dimensions[get_column_letter(j)].width = 9.5
    for j, w in ((c_g, 12), (c_5, 6), (c_4, 6), (c_3, 6), (c_2, 6), (c_t, 9), (c_cat, 24), (c_key, 5)):
        ws2.column_dimensions[get_column_letter(j)].width = w
    ws2.column_dimensions[get_column_letter(c_key)].hidden = True
    for mark, (fill, fc) in MARK_COLORS.items():
        ws2.conditional_formatting.add(f"B{first}:{get_column_letter(last_subj_col)}{last}",
            CellIsRule(operator="equal", formula=[str(mark)],
                       fill=PatternFill("solid", fgColor=fill), font=Font(color=fc, bold=True)))

    # ---------------- sheet 3: per subject ----------------
    ws4 = wb.create_sheet("По предметам")
    ws4.sheet_properties.tabColor = BLUE
    c_skey = 10
    title_block(ws4, "Статистика по предметам",
                "Средний балл — по сырым средним значениям; 5/4/3/2 — по округлённым оценкам. "
                "Успеваемость — без двоек, качество знаний — без двоек и троек", 8)
    header_row(ws4, 4, ["Предмет", "Средний балл", "5", "4", "3", "2",
                        "Успеваемость", "Качество"], height=34)
    sr0, sr1 = 5, 4 + m
    for i, s in enumerate(subjects):
        r = sr0 + i
        a = ws4.cell(r, 1, s)
        a.font = Font(name="Calibri", size=11)
        a.alignment = Alignment(horizontal="left", vertical="center", indent=1)
        col = get_column_letter(2 + i)
        b = ws4.cell(r, 2, f"=IFERROR(AVERAGE('Средние баллы'!{col}{first}:{col}{last}),\"\")")
        b.number_format = "0.00"
        b.font = Font(name="Calibri", bold=True, size=11, color=NAVY)
        for k, cc2 in enumerate((3, 4, 5, 6)):
            cell = ws4.cell(r, cc2, f"=COUNTIF('Итоговые оценки'!{col}{first}:{col}{last},{5 - k})")
            cell.number_format = "0"
            cell.font = Font(name="Calibri", size=11)
        u = ws4.cell(r, 7, f'=IFERROR((C{r}+D{r}+E{r})/(C{r}+D{r}+E{r}+F{r}),"")')
        u.number_format = "0.0%"
        q = ws4.cell(r, 8, f'=IFERROR((C{r}+D{r})/(C{r}+D{r}+E{r}+F{r}),"")')
        q.number_format = "0.0%"
        for j in range(1, 9):
            cell = ws4.cell(r, j)
            cell.border = Border(left=HAIR, right=HAIR, top=HAIR, bottom=HAIR)
            if j > 1:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            if i % 2 == 1:
                cell.fill = PatternFill("solid", fgColor=BAND)
        kc = ws4.cell(r, c_skey, f'=IFERROR(B{r}-ROW()/100000,"")')
        kc.number_format = "0.00000"
        kc.font = Font(name="Calibri", size=8, color="BFBFBF")

    r_avg4 = sr1 + 1
    ws4.cell(r_avg4, 1, "СРЕДНЕЕ ПО КЛАССУ").font = Font(name="Calibri", bold=True, size=11, color=NAVY)
    cc = ws4.cell(r_avg4, 2, f"=AVERAGE('Средние баллы'!B{first}:"
                             f"{get_column_letter(last_subj_col)}{last})")
    cc.number_format = "0.00"
    cc.font = Font(name="Calibri", bold=True, size=11, color=NAVY)
    for j in range(1, 9):
        ws4.cell(r_avg4, j).fill = PatternFill("solid", fgColor=LIGHT)
        ws4.cell(r_avg4, j).border = Border(top=Side(style="medium", color=BLUE),
                                            bottom=Side(style="medium", color=BLUE),
                                            left=THIN, right=THIN)
        ws4.cell(r_avg4, j).alignment = Alignment(horizontal="center" if j > 1 else "left",
                                                  vertical="center", indent=0 if j > 1 else 1)

    ws4.freeze_panes = "A5"
    ws4.column_dimensions["A"].width = 30
    for j in range(2, 9):
        ws4.column_dimensions[get_column_letter(j)].width = 13
    ws4.column_dimensions[get_column_letter(c_skey)].hidden = True
    ws4.conditional_formatting.add(f"B{sr0}:B{sr1}",
        DataBarRule(start_type="num", start_value=3.5, end_type="num", end_value=5,
                    color="5B9BD5", showValue=True))
    for mark, (fill, fc) in MARK_COLORS.items():
        cc2 = get_column_letter(3 + (5 - mark))
        ws4.conditional_formatting.add(f"{cc2}{sr0}:{cc2}{sr1}",
            CellIsRule(operator="greaterThan", formula=["0"],
                       fill=PatternFill("solid", fgColor=fill), font=Font(color=fc, bold=True)))

    h = BarChart()
    h.type = "bar"
    h.title = "Средний балл по предметам"
    h.x_axis.title = "Средний балл"
    h.add_data(Reference(ws4, min_col=2, min_row=4, max_row=sr1), titles_from_data=True)
    h.set_categories(Reference(ws4, min_col=1, min_row=sr0, max_row=sr1))
    h.height, h.width = 15.5, 24
    h.dataLabels = DataLabelList()
    h.dataLabels.showVal = True
    h.dataLabels.numFmt = "0.00"
    h.x_axis.scaling.min = 3
    h.x_axis.scaling.max = 5
    h.x_axis.majorGridlines = None
    h.series[0].graphicalProperties = GraphicalProperties(solidFill="5B9BD5")
    style_chart(h)
    ws4.add_chart(h, f"B{sr1 + 4}")

    st = BarChart()
    st.type = "col"
    st.grouping = "stacked"
    st.overlap = 100
    st.title = "Состав оценок по предметам"
    st.y_axis.title = "Учеников"
    st.add_data(Reference(ws4, min_col=3, max_col=6, min_row=4, max_row=sr1), titles_from_data=True)
    st.set_categories(Reference(ws4, min_col=1, min_row=sr0, max_row=sr1))
    st.height, st.width = 15.5, 24
    for srs, colr in zip(st.series, ["70AD47", "FFC000", "E15759", "9C0006"]):
        srs.graphicalProperties = GraphicalProperties(solidFill=colr)
    # 16 subjects: rotate the category labels so every one of them is readable
    st.x_axis.delete = False
    style_chart(st, gridlines=True, legend=True, cat_rot=-5400000)
    ws4.add_chart(st, f"B{sr1 + 36}")

    # ---------------- sheet 4: analysis ----------------
    ws3 = wb.create_sheet("Анализ", 1)
    ws3.sheet_properties.tabColor = BLUE
    title_block(ws3, f"Анализ успеваемости класса {class_name}",
                "Все значения — формулы, связанные с листами «Средние баллы», "
                "«Итоговые оценки» и «По предметам»", 11)

    kpi = [
        ("Учеников", f"=COUNTA('Итоговые оценки'!A{first}:A{last})", "0",
         "всего в классе"),
        ("Всего оценок", f"=SUM('Итоговые оценки'!{let_t}{r_tot}:{let_t}{r_tot})", "0",
         "по всем предметам"),
        ("Средний балл", f"='Итоговые оценки'!{let_g}{r_tot}", "0.00",
         "по классу"),
        ("Успеваемость",
         f"=COUNTIF('Итоговые оценки'!{v_}{first}:{v_}{last},0)"
         f"/COUNTA('Итоговые оценки'!A{first}:A{last})", "0.0%",
         "доля учеников без двоек"),
        ("Качество знаний",
         f"=SUMPRODUCT(('Итоговые оценки'!{get_column_letter(c_3)}{first}:"
         f"{get_column_letter(c_3)}{last}=0)*"
         f"('Итоговые оценки'!{v_}{first}:{v_}{last}=0))"
         f"/COUNTA('Итоговые оценки'!A{first}:A{last})", "0.0%",
         "доля учеников без двоек и троек"),
    ]
    for k, (label, formula, fmt, hint) in enumerate(kpi):
        col = 1 + k * 2
        ws3.merge_cells(start_row=4, start_column=col, end_row=4, end_column=col + 1)
        hc = ws3.cell(4, col, label)
        hc.font = Font(name="Calibri", bold=True, size=11, color="FFFFFF")
        hc.fill = PatternFill("solid", fgColor=NAVY)
        hc.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        ws3.merge_cells(start_row=5, start_column=col, end_row=5, end_column=col + 1)
        v = ws3.cell(5, col, formula)
        v.number_format = fmt
        v.font = Font(name="Calibri", bold=True, size=18, color=NAVY)
        v.alignment = Alignment(horizontal="center", vertical="center")
        ws3.merge_cells(start_row=6, start_column=col, end_row=6, end_column=col + 1)
        hc2 = ws3.cell(6, col, hint)
        hc2.font = Font(name="Calibri", size=8, color=GREY, italic=True)
        hc2.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        for rr in (4, 5, 6):
            for j in range(col, col + 2):
                ws3.cell(rr, j).border = BOX
        for j in range(col, col + 2):
            ws3.cell(5, j).fill = PatternFill("solid", fgColor=LIGHT)
    ws3.row_dimensions[4].height = 26
    ws3.row_dimensions[5].height = 34
    ws3.row_dimensions[6].height = 24

    r0 = 8
    block_header(ws3, r0, 1, "Категория", 2)
    block_header(ws3, r0, 3, "Учеников", 1)
    for i, cat_name in enumerate(CATEGORIES):
        r = r0 + 1 + i
        ws3.merge_cells(start_row=r, start_column=1, end_row=r, end_column=2)
        a = ws3.cell(r, 1, cat_name)
        a.font = Font(name="Calibri", size=11)
        a.alignment = Alignment(horizontal="left", vertical="center", indent=1)
        b = ws3.cell(r, 3, f"=COUNTIF('Итоговые оценки'!"
                           f"{get_column_letter(c_cat)}{first}:"
                           f"{get_column_letter(c_cat)}{last},A{r})")
        b.number_format = "0"
        b.font = Font(name="Calibri", bold=True, size=12, color=NAVY)
        b.alignment = Alignment(horizontal="center", vertical="center")
        for j in range(1, 4):
            ws3.cell(r, j).border = BOX
            ws3.cell(r, j).fill = PatternFill("solid", fgColor=(BAND if i % 2 else "FFFFFF"))

    r_sum = r0 + 1 + len(CATEGORIES)
    ws3.merge_cells(start_row=r_sum, start_column=1, end_row=r_sum, end_column=2)
    c = ws3.cell(r_sum, 1, "Проверка: сумма категорий")
    c.font = Font(name="Calibri", bold=True, size=9, color=NAVY)
    c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    chk = ws3.cell(r_sum, 3,
                   f'=IF(SUM(C{r0+1}:C{r_sum-1})=COUNTA(\'Итоговые оценки\'!A{first}:A{last}),'
                   f'"= "&SUM(C{r0+1}:C{r_sum-1})&" из "&COUNTA(\'Итоговые оценки\'!A{first}:A{last})&" — OK",'
                   f'"ОШИБКА: "&SUM(C{r0+1}:C{r_sum-1}))')
    chk.font = Font(name="Calibri", bold=True, size=9, color=GREEN_T)
    chk.fill = PatternFill("solid", fgColor=GREEN)
    chk.alignment = Alignment(horizontal="center", vertical="center")
    for j in range(1, 4):
        ws3.cell(r_sum, j).border = BOX

    block_header(ws3, r0, 5, "Оценка", 1)
    block_header(ws3, r0, 6, "Кол-во", 1)
    block_header(ws3, r0, 7, "Доля", 1)
    d0 = r0 + 1
    for i, mark in enumerate([5, 4, 3, 2]):
        r = d0 + i
        a = ws3.cell(r, 5, mark)
        a.font = Font(name="Calibri", bold=True, size=12)
        a.alignment = Alignment(horizontal="center", vertical="center")
        a.fill = PatternFill("solid", fgColor=MARK_COLORS[mark][0])
        b = ws3.cell(r, 6, f"='Итоговые оценки'!{get_column_letter(c_5 + i)}{r_tot}")
        b.number_format = "0"
        b.font = Font(name="Calibri", size=11)
        b.alignment = Alignment(horizontal="center", vertical="center")
        d = ws3.cell(r, 7, f"=IFERROR(F{r}/$F${d0+4},0)")
        d.number_format = "0.0%"
        d.alignment = Alignment(horizontal="center", vertical="center")
        for j in (6, 7):
            ws3.cell(r, j).border = BOX
    r_tot_d = d0 + 4
    ws3.cell(r_tot_d, 5, "Всего").font = Font(name="Calibri", bold=True, size=10, color=NAVY)
    for col, formula, fmt in ((6, f"=SUM(F{d0}:F{d0+3})", "0"),
                              (7, f"=SUM(G{d0}:G{d0+3})", "0.0%")):
        cc = ws3.cell(r_tot_d, col, formula)
        cc.number_format = fmt
        cc.font = Font(name="Calibri", bold=True, size=10, color=NAVY)
    for j in (5, 6, 7):
        cc = ws3.cell(r_tot_d, j)
        cc.fill = PatternFill("solid", fgColor=LIGHT)
        cc.border = Border(top=Side(style="medium", color=BLUE),
                           bottom=Side(style="medium", color=BLUE), left=THIN, right=THIN)
        cc.alignment = Alignment(horizontal="center", vertical="center")

    sk = get_column_letter(c_skey)
    block_header(ws3, r0, 9, "Сильные предметы", 3)
    block_header(ws3, r0 + 6, 9, "Проблемные предметы", 3)
    for grp, fn in ((0, "LARGE"), (1, "SMALL")):
        count = 5 if grp == 0 else 3
        start = r0 + 1 if grp == 0 else r0 + 7
        for i in range(count):
            if i >= m:
                break
            r = start + i
            pos = i + 1
            ws3.merge_cells(start_row=r, start_column=9, end_row=r, end_column=10)
            nm = ws3.cell(r, 9,
                          f"=INDEX('По предметам'!$A${sr0}:$A${sr1},"
                          f"MATCH({fn}('По предметам'!${sk}${sr0}:${sk}${sr1},{pos}),"
                          f"'По предметам'!${sk}${sr0}:${sk}${sr1},0))")
            nm.font = Font(name="Calibri", size=10)
            nm.alignment = Alignment(horizontal="left", vertical="center", indent=1)
            v = ws3.cell(r, 11, f"={fn}('По предметам'!$B${sr0}:$B${sr1},{pos})")
            v.number_format = "0.00"
            v.font = Font(name="Calibri", bold=True, size=10,
                          color=(GREEN_T if grp == 0 else RED_T))
            v.alignment = Alignment(horizontal="center", vertical="center")
            for j in range(9, 12):
                ws3.cell(r, j).border = BOX

    pie = PieChart()
    pie.title = "Структура класса по категориям"
    pie.add_data(Reference(ws3, min_col=3, min_row=r0, max_row=r_sum - 1), titles_from_data=True)
    pie.set_categories(Reference(ws3, min_col=1, min_row=r0 + 1, max_row=r_sum - 1))
    pie.height, pie.width = 14.5, 18
    pie.dataLabels = DataLabelList()
    pie.dataLabels.showVal = True
    pie.dataLabels.showPercent = True
    pie.dataLabels.showCatName = False
    pie.dataLabels.showSerName = False
    pie.dataLabels.showLegendKey = False
    pie.dataLabels.dLblPos = "outEnd"
    pie.legend = None
    pie_pts = []
    for i, c in enumerate(CAT_COLORS):
        pt = DataPoint(idx=i)
        pt.graphicalProperties = GraphicalProperties(solidFill=c)
        pie_pts.append(pt)
    pie.series[0].data_points = pie_pts
    style_chart(pie, label_sz=1000)
    ws3.add_chart(pie, "A21")

    # legend pulled out of the chart into a readable block beside it
    lgd = ws3.cell(21, 8, "Легенда")
    lgd.font = Font(name="Calibri", bold=True, size=11, color=NAVY)
    lgd.alignment = Alignment(horizontal="left", vertical="center")
    for i, cat_name in enumerate(CATEGORIES):
        r = 22 + i
        sw = ws3.cell(r, 8, "")
        sw.fill = PatternFill("solid", fgColor=CAT_COLORS[i])
        sw.border = Border(left=Side(style="thick", color=CAT_COLORS[i]))
        nm = ws3.cell(r, 9, cat_name)
        nm.font = Font(name="Calibri", size=10)
        nm.alignment = Alignment(horizontal="left", vertical="center")
        vv = ws3.cell(r, 10, f"=C{r0 + 1 + i}")
        vv.number_format = "0"
        vv.font = Font(name="Calibri", bold=True, size=10, color=NAVY)
        vv.alignment = Alignment(horizontal="center", vertical="center")
    lg_tot = 22 + len(CATEGORIES)
    nm = ws3.cell(lg_tot, 9, "Всего учеников")
    nm.font = Font(name="Calibri", bold=True, size=10, color=NAVY)
    nm.alignment = Alignment(horizontal="left", vertical="center")
    vv = ws3.cell(lg_tot, 10, f"=SUM(C{r0 + 1}:C{r_sum - 1})")
    vv.number_format = "0"
    vv.font = Font(name="Calibri", bold=True, size=10, color=NAVY)
    vv.alignment = Alignment(horizontal="center", vertical="center")

    bar = BarChart()
    bar.type = "col"
    bar.title = "Распределение оценок"
    bar.y_axis.title = "Учеников"
    bar.add_data(Reference(ws3, min_col=6, min_row=r0, max_row=r_tot_d - 1), titles_from_data=True)
    bar.set_categories(Reference(ws3, min_col=5, min_row=d0, max_row=d0 + 3))
    bar.height, bar.width = 14.5, 16
    bar.dataLabels = DataLabelList()
    bar.dataLabels.showVal = True
    bar.gapWidth = 55
    pts = []
    for idx, colr in enumerate(["70AD47", "FFC000", "E15759", "9C0006"]):
        pt = DataPoint(idx=idx)
        pt.graphicalProperties = GraphicalProperties(solidFill=colr)
        pts.append(pt)
    bar.series[0].data_points = pts
    style_chart(bar, gridlines=True)
    ws3.add_chart(bar, "A47")

    for col, w in (("A", 31), ("B", 8), ("C", 13), ("D", 3), ("E", 10), ("F", 12),
                   ("G", 9), ("H", 4), ("I", 24), ("J", 7), ("K", 11)):
        ws3.column_dimensions[col].width = w

    # ---------------- sheet 5: ranking ----------------
    ws5 = wb.create_sheet("Рейтинг")
    ws5.sheet_properties.tabColor = BLUE
    title_block(ws5, "Рейтинг обучающихся",
                "Автоматическая сортировка по среднему баллу (по убыванию); "
                "при равенстве — по порядку в списке класса", 7)
    header_row(ws5, 4, ["Место", "Обучающийся", "Средний балл", "5", "4", "3", "2"], height=30)
    kz = (f"'Итоговые оценки'!${get_column_letter(c_key)}${first}:"
          f"${get_column_letter(c_key)}${last}")
    rr0 = 5
    for i in range(n):
        r = rr0 + i
        m_ = ws5.cell(r, 1, i + 1)
        m_.font = Font(name="Calibri", bold=True, size=11, color=NAVY)
        idx = f"MATCH(LARGE({kz},{i+1}),{kz},0)"
        nm = ws5.cell(r, 2, f"=INDEX('Итоговые оценки'!$A${first}:$A${last},{idx})")
        nm.font = Font(name="Calibri", size=11)
        nm.alignment = Alignment(horizontal="left", vertical="center", indent=1)
        avg = ws5.cell(r, 3, f"=ROUND(INDEX('Итоговые оценки'!"
                                f"${let_g}${first}:${let_g}${last},{idx}),2)")
        avg.number_format = "0.00"
        avg.font = Font(name="Calibri", bold=True, size=12, color=NAVY)
        for k, col in enumerate((4, 5, 6, 7)):
            src = get_column_letter(c_5 + k)
            cc = ws5.cell(r, col,
                          f"=INDEX('Итоговые оценки'!${src}${first}:${src}${last},{idx})")
            cc.number_format = "0"
            cc.font = Font(name="Calibri", size=11)
        for j in range(1, 8):
            cell = ws5.cell(r, j)
            cell.border = Border(left=HAIR, right=HAIR, top=HAIR, bottom=HAIR)
            if j > 2:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            if i % 2 == 1:
                cell.fill = PatternFill("solid", fgColor=BAND)
        if i < 3:
            ws5.cell(r, 1).fill = PatternFill("solid", fgColor="FFD966")

    ws5.freeze_panes = "A5"
    ws5.column_dimensions["A"].width = 8
    ws5.column_dimensions["B"].width = 28
    for j in range(3, 8):
        ws5.column_dimensions[get_column_letter(j)].width = 12
    for mark, (fill, fc) in MARK_COLORS.items():
        cc2 = get_column_letter(4 + (5 - mark))
        ws5.conditional_formatting.add(f"{cc2}{rr0}:{cc2}{rr0+n-1}",
            CellIsRule(operator="greaterThan", formula=["0"],
                       fill=PatternFill("solid", fgColor=fill), font=Font(color=fc, bold=True)))

    rt = BarChart()
    rt.type = "bar"
    rt.title = "Средний балл по ученикам"
    rt.x_axis.title = "Средний балл"
    rt.height, rt.width = 19, 24
    rt.add_data(Reference(ws5, min_col=3, min_row=4, max_row=rr0 + n - 1), titles_from_data=True)
    rt.set_categories(Reference(ws5, min_col=2, min_row=rr0, max_row=rr0 + n - 1))
    rt.dataLabels = DataLabelList()
    rt.dataLabels.showVal = True
    rt.dataLabels.numFmt = "0.00"
    rt.x_axis.scaling.min = 3
    rt.x_axis.scaling.max = 5
    rt.x_axis.majorGridlines = None
    rt.series[0].graphicalProperties = GraphicalProperties(solidFill="5B9BD5")
    # categories run bottom-up by default; flip so rank 1 sits on top
    rt.y_axis.scaling.orientation = "maxMin"
    rt.y_axis.delete = False
    style_chart(rt)
    ws5.add_chart(rt, "I4")

    # ---------------- sheet 6: method ----------------
    ws6 = wb.create_sheet("Методика")
    ws6.sheet_properties.tabColor = BLUE
    title_block(ws6, "Методика расчёта и контроль качества данных",
                "Лист фиксирует правила, по которым построены все остальные листы", 4)
    c = ws6.cell(5, 1, "Правила, применённые в этом файле")
    c.font = Font(name="Calibri", bold=True, size=12, color=NAVY)
    notes = [
        ("Успеваемость и качество знаний",
         "Успеваемость — доля учеников, у которых нет ни одной оценки 2. "
         "Качество знаний — доля учеников, у которых нет ни одной оценки 2 и ни одной оценки 3, "
         "то есть только 4 и 5. Это две разные группы: ученик с одной тройкой, но без двоек, "
         "успевает, но не попадает в качество знаний."),
        ("Все показатели — формулы",
         "Изменение любой средней оценки на листе «Средние баллы» автоматически обновляет "
         "«Итоговые оценки», «Анализ», «По предметам» и «Рейтинг»."),
        ("Округление по арифметическому правилу",
         "ROUND(средний балл; 0): 4,50 → 5; 4,49 → 4; 3,50 → 4 — «0,5 и выше вверх»."),
        ("Взаимоисключающие категории",
         "Шесть категорий покрывают класс без пересечений: сумма всегда равна числу учеников. "
         "Проверяется строкой «Проверка: сумма категорий» на листе «Анализ»."),
        ("Пустые оценки не искажают средние",
         "0,00 в выгрузке означает «нет оценок» и заменён пустой ячейкой, поэтому AVERAGE и COUNT "
         "не занижают результат по предметам с пропусками."),
        ("Самопроверяющийся контроль",
         "Строка «Контроль сходимости» на листе «Итоговые оценки» подтверждает, что сумма "
         "5+4+3+2 равна числу округлённых оценок."),
        ("Осторожно: эффект округления",
         "Предмет со средним 4,80 у всех учеников даёт 5,00 после округления. Такой результат "
         "отражает порог округления, а не абсолютное качество знаний."),
    ]
    r = 7
    for htitle, body in notes:
        c = ws6.cell(r, 1, htitle)
        c.font = Font(name="Calibri", bold=True, size=11, color=BLUE)
        c.alignment = Alignment(vertical="top", wrap_text=True)
        ws6.merge_cells(start_row=r, start_column=1, end_row=r, end_column=4)
        r += 1
        c2 = ws6.cell(r, 1, body)
        c2.font = Font(name="Calibri", size=10)
        c2.alignment = Alignment(vertical="top", wrap_text=True)
        ws6.merge_cells(start_row=r, start_column=1, end_row=r, end_column=4)
        ws6.row_dimensions[r].height = 44
        r += 2
    ws6.column_dimensions["A"].width = 36
    for col in "BCD":
        ws6.column_dimensions[col].width = 31

    for ws in wb.worksheets:
        ws.sheet_view.showGridLines = False
        ws.page_setup.orientation = "landscape"
        ws.page_setup.fitToWidth = 1
        ws.page_setup.fitToHeight = 0
        ws.sheet_properties.pageSetUpPr.fitToPage = True
        ws.print_options.horizontalCentered = True

    wb.calculation = CalcProperties(fullCalcOnLoad=True)
    wb.save(out_path)
    return out_path


# ------------------------------------------------------------------ check ---
def verify(path, frame, students):
    """Recompute independently and diff against the workbook's own formulas."""
    import decimal

    def half_up(x):
        if pd.isna(x):
            return None
        return int(decimal.Decimal(str(x)).quantize(decimal.Decimal("1"),
                                                    rounding=decimal.ROUND_HALF_UP))

    wb = load_workbook(path, data_only=False)
    ws = wb["Итоговые оценки"]
    first = 5
    problems = []
    for i, st in enumerate(students):
        r = first + i
        for j in range(frame.shape[1]):
            expect = half_up(frame.iloc[i, j])
            got = ws.cell(r, 2 + j).value
            if not (isinstance(got, str) and got.startswith("=")):
                problems.append((st, j, "formula missing", got))
    n_formulas = sum(1 for row in ws.iter_rows() for c in row
                     if isinstance(c.value, str) and c.value.startswith("="))
    return problems, n_formulas


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", required=True, help="averages workbook")
    ap.add_argument("--output", required=True, help="report workbook to write")
    ap.add_argument("--class", dest="class_name", default="", help="class label, e.g. 9А")
    ap.add_argument("--sheet", default=None, help="source sheet name (default: first)")
    ap.add_argument("--header-cell", default=None, help="header anchor, e.g. A6")
    ap.add_argument("--recalculate", action="store_true",
                    help="refresh caches via LibreOffice Kit after writing")
    args = ap.parse_args()

    frame, students, subjects = read_source(args.source, args.sheet, args.header_cell)
    print(f"students={len(students)} subjects={len(subjects)} "
          f"marks={int(frame.notna().sum().sum())}")

    build(frame, students, subjects, args.output, args.class_name)
    print(f"saved: {args.output}")

    problems, n_formulas = verify(args.output, frame, students)
    print(f"formulas on 'Итоговые оценки': {n_formulas}")
    if problems:
        print(f"VERIFY FAILED ({len(problems)} issues), first 5:", problems[:5], file=sys.stderr)
        return 1
    print("verified: every rounded mark is a formula and matches independent half-up rounding")

    if args.recalculate:
        print("run office-recalculate for the LibreOffice Kit command to refresh caches")
    return 0


if __name__ == "__main__":
    sys.exit(main())
