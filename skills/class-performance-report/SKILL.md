---
name: class-performance-report
description: Turn a school grade export (average scores per student and subject) into a formula-driven XLSX performance report with categories, ranking, conditional formatting and charts. Use for "анализ успеваемости", "средние баллы", class/grade reports, отчёты по классу, or whenever a raw 0.00-marked averages dump must become an analyst-ready workbook.
whenToUse: The input is an XLSX of per-student subject averages (0.00 meaning "no grades"), and the output should be a polished multi-sheet report whose numbers recalculate from formulas.
---

# Class performance report

Build an analyst-ready workbook from a raw averages export. Every number stays a formula, so the teacher edits one average and the whole report — categories, totals, ranking, charts — follows.

## Workflow

1. **Read the source as text first.** Averages arrive as strings (`"4.60"`); header row is not always row 1. Locate the row whose first cell is `Обучающийся` / `Student` and use it as the header.
2. **Treat `0.00` as "no grades", not zero.** It means the subject was never assessed. Convert it to an empty cell; otherwise `AVERAGE` and `COUNT` silently deflate that subject's result.
3. **Round by grade level.**
   - **Grades 9–11**: standard half-up arithmetic rounding (`ROUND(x, 0)`), where 4.50 → 5 and 4.49 → 4.
   - **Grades 7–8**: middle-school threshold rule where 4.60 → 5 (`ROUND(x - 0.1, 0)`).
   The grade level is detected automatically from row 3 of the source export (`Класс: ...`) or passed via `--class`.
4. **Classify into mutually exclusive categories** (see below) and assert the category counts sum to the number of students.
5. **Build the workbook** with `scripts/build_grades_report.py`, then recalculate with LibreOffice and diff the cached values against a pandas recomputation.
6. **Verify before delivering**: category total equals student count, `5+4+3+2` equals the number of marks, and every rounded mark matches the independent Python rounding.

Run:

```text
<python> scripts/build_grades_report.py --source <averages.xlsx> --output <report.xlsx> --class "9А"
```

Add `--recalculate` to also refresh caches through the LibreOffice Kit CLI supplied by `office-recalculate`.

## The dashboard beside the workbook

The workbook is the working instrument; the dashboard is what gets shown. Both are generated from the same source by the same arithmetic, so they cannot disagree.

```text
<python> scripts/build_dashboard_page.py --source <averages.xlsx> --output dashboard.html \
    --class "9А" --date "09.11.2026"
```

The page is one self-contained HTML file: no build step, no CDN, no runtime dependency. It carries a real light and a real dark theme, one mark palette across every view, and charts drawn as inline SVG laid out by CSS grid, so nothing can overlap.

`build_dashboard_data.py` computes the payload the page is rendered from, and asserts its own consistency before writing: category counts sum to the student count, mark counts sum to the total number of marks, and the ranking covers every student. Use it directly when you want the numbers without the page.

**The class size is never assumed.** A class may hold fewer students than the last one; every count, share, chart and table is computed from the data, so a smaller class yields a smaller report with no leftovers of the previous one. Two cases need care and are handled:

- a **subject nobody was assessed in** has no average and no shares — it renders as "нет оценок" in the chart, not as zero;
- **absence is not zero**: a student with no mark in a subject contributes nothing to that subject's average, and every such gap is summarised in the "Отсутствуют оценки" widget, which is hidden entirely when there are none.

### Checking the page

`impeccable` is not needed for the page itself, but the mechanical checks are worth keeping. Measure the rendered page at 1440, 1024, 768 and 390 in both themes and assert: no horizontal scroll, no overlapping boxes, every text/background pair clears WCAG AA, and every chart drew shapes. A chart that renders as an empty box is the failure this catches.

## Categories

Evaluate in this order; the first match wins, so the result is a partition of the class:

| Order | Condition | Label |
|---|---|---|
| 1 | no marks at all | `нет оценок` |
| 2 | any `2` | `Есть оценка 2` |
| 3 | two or more `3` | `Две и более 3, без 2` |
| 4 | exactly one `3` | `Одна 3, без 2` |
| 5 | no `4` (all fives) | `Отличник (все 5)` |
| 6 | exactly one `4` | `Одна 4` |
| 7 | otherwise | `Две и более 4` |

Never merge "no 3 and no 2" into a category named `Без троек` alongside the partition — that label means two different populations in the same workbook. Keep `Успеваемость` (share without a `2`) and `Качество знаний` (share without `3` or `2`) as separately labelled KPIs.

## Sheet layout

| Sheet | Contents |
|---|---|
| `Средние баллы` | raw averages, blanks for unassessed, per-subject `AVERAGE`/`COUNT` footer — **the design reference for every other sheet** |
| `Итоговые оценки` | `ROUND`ed marks, per-student average, `COUNTIF` tallies, category formula, hidden sort key |
| `Анализ` | KPI cards with plain-language hints, category counts, mark distribution, strongest/weakest subjects, pie + column charts, legend rendered as a sheet table beside the pie |
| `По предметам` | per-subject average, mark composition, успеваемость/качество, data bars, bar + stacked charts with rotated subject labels |
| `Рейтинг` | `LARGE`/`INDEX` auto-sorted ranking plus a per-student bar chart running top-down |
| `Методика` | what was corrected, rounding rule, the definitions of успеваемость and качество знаний, abbreviations, data source |

## One design language

Every sheet is built from the same parts, so the workbook reads as one document: navy title band, navy table header, blue block headers, alternating `F5F8FC` row bands, hairline inner borders, `EAF0F8` footer band with medium blue rules, `1F3864` accents for figures, one shared tab colour. When a new sheet is added, copy the structure of `Средние баллы` rather than inventing a look — the teacher approved that sheet as the reference.

Charts follow the same rule: the plot area is painted the sheet navy with light ink, so a chart never floats on white as a foreign object.

## Metric definitions belong in the file

`Успеваемость` and `Качество знаний` look like one pair of grades until they are spelled out, and a reader who assumes otherwise will misquote the number. Every KPI card carries a one-line hint under the value, and the `Методика` sheet states the definitions in full:

- **Успеваемость** — share of students with no `2`.
- **Качество знаний** — share of students with no `2` and no `3` (only 4s and 5s).

A student with a single `3` and no `2` succeeds but does not count towards quality of knowledge; the two percentages describe different populations, and the hint line is what stops them being read as one.

## Rules that prevent the usual breakage

- **Never ship static numbers.** A report where the summary is pasted values cannot survive one grade change; build formulas and recalculate once to seed caches.
- **Hidden sort keys must not self-reference.** On the sheet that defines the average, the key is `=$R5-ROW()/100000`; a cross-sheet self reference creates a circular formula that only fails at open time.
- **Verify after writing, not after rendering.** Reopen with `data_only=False` to confirm formulas survive and `data_only=True` to confirm caches; compare against pandas.
- **Blank means blank.** `ROUND` on an empty cell yields `#VALUE!`, so guard with `IF(ISNUMBER(...))`.
- **Note the rounding amplification.** A subject averaging 4.80 across the class can round to 5.00 for every student; call this out instead of presenting it as a perfect result.

See `references/xlsx-patterns.md` for the openpyxl recipes behind charts, conditional formatting, hidden keys and the verification loop.
