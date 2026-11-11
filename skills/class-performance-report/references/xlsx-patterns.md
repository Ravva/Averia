# openpyxl recipes for the performance report

Patterns proven on real school exports. Each one exists because the naive version failed somewhere.

## 1. Locating the header row

School exports wrap the table in metadata (`Дата:`, `Период:`, `Класс:`, `Оценки:`), and the header sits at an unpredictable row.

```python
probe = pd.read_excel(path, sheet_name=sheet, header=None, dtype=str)
for idx in range(min(30, len(probe))):
    if str(probe.iloc[idx, 0]).strip().lower().startswith(("обучающ", "ученик", "student", "фио")):
        header_row = idx
        break
```

Never hardcode `header=0`; never assume the metadata block is a fixed height.

## 2. `0.00` means "no grades"

Averages arrive as strings with zero standing in for an absent mark. Left alone, `AVERAGE` treats zero as a real score and a subject with 12 blanks collapses from 5.00 to a third of its value.

```python
frame = frame.apply(pd.to_numeric, errors="coerce")
frame = frame.map(lambda v: v if (pd.notna(v) and v > 0) else None)
```

Then write `None`, never `0`, into the cells. `AVERAGE` and `COUNT` skip empties but count zeros.

## 3. Guard `ROUND` against blanks

`ROUND("", 0)` and `ROUND(empty, 0)` produce `#VALUE!` or `0`. Both are wrong.

```python
f'=IF(ISNUMBER(\'Средние баллы\'!{col}{r}),ROUND(\'Средние баллы\'!{col}{r},0),"")'
```

## 4. Cross-sheet references need quoted names

Sheet names contain spaces and Cyrillic; always quote and escape:

```python
f"=AVERAGE('Средние баллы'!B{r}:Q{r})"
```

An unquoted space in a sheet name yields `#NAME?` or a broken file.

## 5. Hidden sort keys must not self-reference

The ranking sheet needs a unique tiebreaker, because `LARGE` over equal averages returns the same name repeatedly. Add a key on the *same* sheet that owns the average, referencing its own cell:

```python
key_cell = ws.cell(r, c_key, f'=IFERROR(${average_letter}{r}-ROW()/100000,"")')
ws.column_dimensions[get_column_letter(c_key)].hidden = True
```

Writing `='Итоговые оценки'!$R5-ROW()/100000` *on* sheet «Итоговые оценки» at `$R5` is a circular reference. Excel refuses to open it and LibreOffice reports `Err:522`. Keep the offset in a helper column instead of appending it to every rank comparison, and hide that column.

Ranking then reads:

```python
kz = f"'Итоговые оценки'!$Z${first}:$Z${last}"
idx = f"MATCH(LARGE({kz},{i+1}),{kz},0)"
name = f"=INDEX('Итоговые оценки'!$A${first}:$A${last},{idx})"
```

## 6. Data bars need a bounded scale

A default `DataBarRule` rescales to the data, making 4.10 look as long as 5.00. Pin it:

```python
from openpyxl.formatting.rule import DataBarRule
ws.conditional_formatting.add("B5:B20",
    DataBarRule(start_type="num", start_value=3.5, end_type="num", end_value=5,
                color="5B9BD5", showValue=True))
```

## 7. Colour per-point in a column chart

`Series`-level fill colours every bar the same. Mark colours (green/amber/red) need individual points:

```python
from openpyxl.chart.marker import DataPoint
from openpyxl.chart.shapes import GraphicalProperties

bar.series[0].data_points = []
for idx, colour in enumerate(["70AD47", "FFC000", "E15759", "9C0006"]):
    pt = DataPoint(idx=idx)
    pt.graphicalProperties = GraphicalProperties(solidFill=colour)
    bar.series[0].data_points.append(pt)
```

## 8. Chart value axes on a percentage-free scale

For averages, set `scaling.min = 3` and `scaling.max = 5`; otherwise a 4.1–5.0 spread fills the whole plot and exaggerates differences. Turn off `majorGridlines` on horizontal bar charts and keep the value axis visible with `x_axis.delete = False` where the scale matters.

## 9. Seed formula caches or the first open shows nothing

openpyxl writes formulas without results. Cells read `None` until Excel calculates, and any consumer using `data_only=True` sees blanks. Two moves:

```python
from openpyxl.workbook.properties import CalcProperties
wb.calculation = CalcProperties(fullCalcOnLoad=True)
```

plus one LibreOffice recalculation pass (`office-recalculate`) so the file also carries cached values.

## 10. Verification loop

```python
# formulas survive
wb = load_workbook(path, data_only=False)
assert all(isinstance(ws.cell(r, c).value, str) and ws.cell(r, c).value.startswith("=")
           for r in range(first, last + 1) for c in range(2, 18))

# caches agree with an independent recomputation
import decimal
def half_up(x):
    return int(decimal.Decimal(str(x)).quantize(decimal.Decimal("1"),
                                                rounding=decimal.ROUND_HALF_UP))
```

Recompute with `decimal.ROUND_HALF_UP`, never Python's `round()`, which is banker's rounding: `round(4.5)` is `4`, but the arithmetic rule the teacher asked for gives `5`. Compare every cell, and fail loudly on mismatch.

## 11. Structural asserts worth keeping

- category counts sum to the student count, verified by a formula in the sheet itself
- `SUM(5,4,3,2 tallies) == SUM(marks per student)` — catches double counting and dropped rows
- every student keeps a row: no silent `dropna()`
- rounding mode is stated in the workbook, not just the code

## 12. Wording trap

`Без троек` cannot name both "students with no 3 and no 2" (18) and a category in a partition (11). When two populations share a label, every downstream percentage is misreadable. Use `Успеваемость` for the share without a `2` and `Качество знаний` for the share without `3` or `2`, and keep category labels describing exactly one population each.

## 13. Dark chart panels

Charts read as part of the sheet when the plot area uses the same navy as the header band. `chart.graphical_properties` paints the chart space; the axes need their own fill, and all ink has to flip to a light colour or it disappears.

```python
chart.graphical_properties = GraphicalProperties(solidFill="1F3864")
chart.graphical_properties.line = LineProperties(solidFill="1F3864")
chart.title.tx.rich = _rich("FFFFFF", sz=1200, b=True, text=_title_text(chart))
axis.txPr = _rich("BFD1E8", sz=900)
axis.spPr = GraphicalProperties()
axis.spPr.line = LineProperties(solidFill="3C5A8C")
```

Two traps here:

- **Recreating `title.tx.rich` drops the title text.** `openpyxl` stores it in `p.r[0].t`; read it back before replacing the rich text, or the chart ends up untitled.
- **`PieChart` has no `x_axis`/`y_axis`.** A shared styling helper must skip axes that do not exist instead of assuming both.

Data labels need the light ink too: `chart.dataLabels.txPr = _rich("FFFFFF", sz=900, b=True)`.

## 14. Rotating axis labels

`openpyxl` has no `textRotation` on axes — the angle lives in `txPr.bodyPr.rot`, in 60000ths of a degree. Setting `axis.textRotation` silently does nothing.

```python
axis.txPr = _rich("BFD1E8", sz=800, rot=-5400000)   # 90° counter-clockwise
```

Sixteen subject names on a horizontal axis collide unless they are turned; a dedicated style helper takes a `cat_rot` argument because a later styling pass overwrites `txPr` and would erase the rotation.

## 15. Pie chart legend outside the chart

A built-in legend on a pie chart renders in a font that is unreadable at report scale. Turn it off, keep the percentages on the slices, and render the legend as a sheet table next to the chart:

```python
pie.legend = None
pie.dataLabels.showVal = True
pie.dataLabels.showPercent = True
pie.dataLabels.dLblPos = "outEnd"
```

Each legend row is a swatch cell filled with the same colour as its wedge, the category name, and a live formula (`=C{row}`) pointing at the count cell, so the legend updates with the data instead of going stale.

## 16. Ranking chart direction

A horizontal bar chart plots the first category at the bottom. To put rank 1 on top, flip the category axis:

```python
rt.y_axis.scaling.orientation = "maxMin"
rt.y_axis.delete = False
```

The data is already sorted descending by the `LARGE`/`INDEX` formulas, so this alone yields a descending chart from top to bottom.

## 17. A dark chart panel is not a dark theme

Filling a chart's plot area with a dark colour on a light sheet produces a dark rectangle floating on white — the chart reads as a foreign object, and the axis labels and data labels have to fight the sheet's own text colour to stay legible. The request "dark charts" and the result "a dark panel on a white page" are different things, and only the second one is what the teacher complained about.

A real dark theme is the whole surface: the page ground, the ink, the rules and the chart panel all change together, so the chart belongs to the page instead of sitting on it. In CSS that is one set of custom properties under two selectors:

```css
:root{ --paper:#F7F5F0; --ink:#1A1D21; --rule:#C9C7C4; }
html[data-theme="dark"]{
  --paper:#14161A; --ink:#E8E6E1; --rule:#3A4048;
}
```

The chart reads its colours from the same variables, so a theme switch repaints every chart without touching the drawing code.

## 18. Colour on a coloured pill needs its own ink

A white label on a mid-tone fill is not automatically readable. Measured against the muted school palette, white on the ochre `#C9A227` gives 2.42:1 and white on the green `#4C9A6A` gives 3.42:1, both far under AA. Dark ink on the same fills gives 6.99:1 and 4.94:1.

The rule that survives every palette: pick the ink per fill, not per component. One dark ink works on green, ochre and terracotta; the red needs the opposite ink, because dark text on red falls to 3.56:1 while white reaches 4.75:1.

```css
.pill{ color:var(--pill-ink); }          /* dark ink on green / ochre / terracotta */
.pill.m2{ color:var(--pill-ink-2); }     /* white ink on red */
```

With a dark theme the ink variables invert: on the dark theme's lighter red, dark ink wins again (5.12:1) and white loses (3.54:1). Measure both themes; the answer is not the same twice.

## 19. A table that must fit a phone

A ranking table with a category column overflows a 390px viewport, and a horizontal scroll on a projected report is a dead end. The fix is to stop treating the rows as table rows:

```css
@media (max-width:700px){
  .rk,.rk tbody,.rk tr,.rk td{display:block;width:auto}
  .rk thead{position:absolute;left:-9999px}   /* hidden, not dropped */
  .rk td{padding:0 0 0 34px;position:relative}
  .rk .pl{position:absolute;left:0;top:0}
}
```

Two details matter: the header is hidden rather than removed, so the column meanings survive for a screen reader, and the place number is taken out of the flow and pinned to the row's left edge so the row still reads as a ranked list.

Keep the phone breakpoint separate from the tablet one. Folding both into a single `max-width:1080px` rule turns the tables into blocks on a 1024px laptop too, where there is plenty of room for them, and the page grows to nearly three times its height.

## 20. `table-layout:fixed` needs a width on every column

In a fixed layout the first row sets the column widths, and a column left at `width:auto` claims all the leftover space. A name column set to `auto` inside a narrow column gets one word per line, and the table grows to three times its intended height — the symptom looks like a layout bug but is a width declaration missing.

Every column needs an explicit share, and the class has to be on the header cell too, because the header is the row that decides:

```html
<th class="nm">Обучающийся</th>
```

```css
.rk{table-layout:fixed}
.rk .nm{width:34%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
```

## 21. Counts on a tinted cell, not coloured text

Writing the mark count in the mark's own colour on the page ground fails contrast: `#4C9A6A` green on `#F7F5F0` paper gives 3.14:1, and the ochre gives 2.22:1. A saturated colour is a fill, not an ink.

Put the count on a tinted cell with dark ink instead — which is also what a school journal looks like:

```css
.rk td.cnt{color:var(--pill-ink)}
.rk td.cnt.m5{background:var(--m5)}
.rk td.cnt.m4{background:var(--m4)}
.rk td.cnt.m2{background:var(--m2);color:var(--pill-ink-2)}
```

A zero is left unpainted, so the eye finds the marks that are actually there. The header cell carries the width only; a fill on the header would paint the column label.

## 22. Zebra rows

Alternating rows belong to the data cells, not the row, because the row background does not show through cells that carry their own fill:

```css
.rk tbody tr:nth-child(even) td{background:var(--zebra)}
```

The zebra tone has to be defined per theme: a light `--zebra:#F1EFE9` on the paper ground in the light theme, and a slightly lifted `--zebra:#20242B` on the dark ground. A zebra that is too strong competes with the mark colours; it should be felt, not read.

## 23. Saying what a metric excludes

"Успеваемость — доля учеников без оценок 2" reads as a careful explanation of something the reader already assumes. Say what the metric contains instead:

- успеваемость — доля учеников, имеющих только оценки 3, 4 и 5;
- качество знаний — доля учеников, имеющих только оценки 4 и 5.

Category names are a different matter and keep their exclusions: "Одна 3, без 2" и "Две и более 3, без 2" are two different populations, and without "без 2" they would collide with the groups that carry a two.

## 24. One legend language, used twice

A page that explains its colours in one block and then re-explains them in a second, differently styled block reads as two documents. The mark distribution chart and the legend block must speak the same language: swatch, mark, word, count, share — the same markup, the same classes, the same order.

```python
f'<div class="keyrow"><span class="sw" style="background:var(--m{v})"></span>'
f'<span class="kk">{v}</span><span class="kd">{words[v]}</span>'
f'<span class="kc num">{count}</span><span class="ks num">{share}</span></div>'
```

Draw the stacked bar itself in SVG, but leave the rows below it as HTML. Text inside an SVG cannot use the page's classes, cannot be styled by the theme switch, and is measured differently by a screen reader.

## 25. Two rules under a title look like a mistake

A bold rule under the page title plus a hairline under it reads as a rendering accident. One rule carries the separation: the bold one under the title, and the band below it starts with padding instead of a second border.

```css
.head{border-bottom:2px solid var(--ink);margin-bottom:0}
.kpis{padding-top:22px;border-bottom:1px solid var(--rule);border-top:0}
```

## 26. Metadata worth reading is metadata worth sizing

The data date sits next to the title and is the second thing a reader looks for. Set it at the title's size and weight rather than as a grey caption — it is a fact, not a footnote.

```css
.head h1{font-size:30px}
.head .meta{font-size:30px;font-weight:600;letter-spacing:-.015em}
```
