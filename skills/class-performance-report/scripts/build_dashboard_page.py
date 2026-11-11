#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Generate the single-file HTML dashboard from a school averages export.

Usage:
    python build_dashboard_page.py --source averageMarks.xlsx --output dashboard.html \
        --class "9А" [--date "09.11.2026"]

The page is written from the data, never hand-edited: every number in it comes
from the same arithmetic as the XLSX workbook, so the two can never disagree.
Charts are inline SVG laid out by CSS grid, so nothing can overlap.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from build_dashboard_data import build_payload, read_source  # noqa: E402

HTML = """<!DOCTYPE html>
<html lang="ru" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__</title>
<style>
:root{
  --paper:#F7F5F0; --paper-2:#FFFFFF; --ink:#1A1D21; --ink-2:#5A5F66;
  --rule:#C9C7C4; --rule-2:#E3E0DA; --band:#EFEDE7; --zebra:#F1EFE9;
  --m5:#4C9A6A; --m4:#C9A227; --m3:#C77B3C; --m2:#DC2626;
  --accent:#2F4B7C; --focus:#2F4B7C;
  --pill-ink:#1A1D21; --pill-ink-2:#FFFFFF;
  --shadow:none;
}
html[data-theme="dark"]{
  --paper:#14161A; --paper-2:#1B1E23; --ink:#E8E6E1; --ink-2:#A6ABB2;
  --rule:#3A4048; --rule-2:#2A2F36; --band:#1F232A; --zebra:#20242B;
  --m5:#5FB584; --m4:#DCBB42; --m3:#DB9155; --m2:#EB514A;
  --accent:#7FA3D8; --focus:#7FA3D8;
  --pill-ink:#14161A; --pill-ink-2:#14161A;
  --shadow:none;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{
  background:var(--paper); color:var(--ink);
  font-family:"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  font-size:16px; line-height:1.45;
  font-variant-numeric:tabular-nums; -webkit-font-smoothing:antialiased;
}
.wrap{max-width:1440px;margin:0 auto;padding:32px 40px 72px}
.num{font-variant-numeric:tabular-nums}
h1,h2,h3{margin:0;font-weight:600;letter-spacing:-.015em}
.rule{border:0;border-top:1px solid var(--rule);margin:0}

/* ---- header ---- */
.head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;
  padding-bottom:14px;border-bottom:2px solid var(--ink);margin-bottom:0}
.head h1{font-size:30px;line-height:1.15}
.head .meta{font-size:30px;line-height:1.15;font-weight:600;letter-spacing:-.015em;
  text-align:right;white-space:nowrap}
.theme-btn{
  font:inherit;font-size:13px;font-weight:600;letter-spacing:.02em;
  color:var(--ink);background:var(--paper-2);border:1px solid var(--rule);
  border-radius:3px;padding:7px 14px;cursor:pointer;
}
.theme-btn:hover{border-color:var(--ink)}
.theme-btn:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.topbar{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;
  padding:14px 0 12px}

/* ---- KPI band ---- */
/* the header already carries a bold rule; the band needs only its own
   lower rule, so the page does not show two dividers under the title */
.kpis{display:grid;grid-template-columns:repeat(4,1fr);padding-top:22px;
  border-bottom:1px solid var(--rule);margin-bottom:28px}
.kpi{padding:20px 24px 18px;border-left:1px solid var(--rule)}
.kpi:first-child{border-left:0;padding-left:0}
.kpi .lab{font-size:13px;color:var(--ink-2);margin-bottom:2px}
.kpi .val{font-size:44px;font-weight:600;line-height:1.05;letter-spacing:-.025em}
.kpi .val small{font-size:22px;font-weight:600;margin-left:2px}
.kpi .hint{font-size:12.5px;color:var(--ink-2);margin-top:6px;line-height:1.35}

/* ---- section headers ---- */
.sec{display:flex;align-items:baseline;justify-content:space-between;gap:16px;
  border-bottom:1px solid var(--rule);padding-bottom:7px;margin:0 0 16px}
.sec h2{font-size:17px}
.sec .note{font-size:12.5px;color:var(--ink-2)}
/* top-level blocks breathe apart; a nested .sec inside one of them does not
   get a second gap, so the rule targets the section, not the header */
section[aria-labelledby]{margin-bottom:34px}
section[aria-labelledby] > .sec:first-child{margin-top:0}
section[aria-labelledby] > .sec ~ *{margin-top:0}

/* ---- legend ---- */
.legend{display:grid;grid-template-columns:1fr 1.15fr 1.35fr;gap:0;
  border:1px solid var(--rule);margin-bottom:28px;background:var(--paper-2)}
.lg{padding:14px 18px;border-left:1px solid var(--rule)}
.lg:first-child{border-left:0}
.lg h3{font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-2);
  font-weight:600;margin-bottom:10px}
.keyrow{display:flex;align-items:center;gap:9px;padding:3px 0;font-size:13.5px}
.keyrow .sw{width:15px;height:15px;flex:0 0 15px;border-radius:2px}
.keyrow .kk{font-weight:600;width:12px}
.keyrow .kd{color:var(--ink-2);flex:1}
.keyrow .kc{font-weight:600}
.keyrow .ks{color:var(--ink-2);width:48px;text-align:right}
.keyrows{margin-top:12px}
.scale{display:flex;height:15px;border-radius:2px;overflow:hidden;margin:2px 0 6px}
.scale i{flex:1}
.scale-lbl{display:flex;justify-content:space-between;font-size:12px;color:var(--ink-2)}
.catrow{display:flex;align-items:baseline;gap:8px;padding:3px 0;font-size:13.5px}
.catrow .cn{flex:1}
.catrow .cc{font-weight:600}
.catrow .cs{color:var(--ink-2);width:46px;text-align:right}

/* ---- charts ---- */
.grid2{display:grid;grid-template-columns:1.55fr 1fr;gap:32px;margin-bottom:34px}
.grid2-half{grid-template-columns:1fr 1fr;gap:28px;align-items:stretch}
svg{display:block;max-width:100%}
.bar-label{font-size:12px;fill:var(--ink-2)}
.bar-value{font-size:12.5px;font-weight:600;fill:var(--ink)}
.axis-line{stroke:var(--rule);stroke-width:1}
.axis-text{font-size:11.5px;fill:var(--ink-2)}

/* ---- absence widget ---- */
.absent{border:1px solid var(--rule);background:var(--paper-2);padding:16px 20px;
  margin-bottom:30px;height:100%}
.absent h3{font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-2);
  font-weight:600;margin-bottom:12px}
.abs-head{display:flex;justify-content:flex-end;align-items:baseline;gap:10px;
  padding:0 0 6px;border-bottom:1px solid var(--rule)}
.abs-head .as{font-size:13.5px;font-weight:600}
.abs-head .ac{font-size:12.5px;color:var(--ink-2);white-space:nowrap}
.abs-next{text-align:right;font-size:11px;letter-spacing:.06em;text-transform:uppercase;
  color:var(--ink-2);font-weight:600;padding-top:16px;margin-top:12px;
  border-top:1px solid var(--rule-2)}
.abs-names{display:flex;flex-wrap:wrap;gap:6px 28px;padding:9px 0 14px}
.abs-n{display:block;font-size:13px;line-height:1.4}
.abs-n b{display:block;font-weight:600}
.abs-n i{display:block;font-style:normal;color:var(--ink-2);font-size:12px}
.abs-total{display:flex;align-items:baseline;justify-content:space-between;gap:12px;
  margin-top:4px;padding-top:9px;border-top:1px solid var(--rule);
  font-size:13px;color:var(--ink-2)}
.abs-total b{color:var(--ink);font-weight:600}

/* ---- strong and weak subjects ---- */
.ptblock{margin-bottom:14px}
.ptblock:last-child{margin-bottom:0}
.ptlabel{font-size:12.5px;font-weight:600;color:var(--ink-2);margin-bottom:5px}
.pthead{display:flex;align-items:baseline;gap:9px;padding:0 0 5px;
  border-bottom:1px solid var(--rule);font-size:11px;letter-spacing:.06em;
  text-transform:uppercase;color:var(--ink-2)}
.pthead .pn{flex:1}
.pthead .pv{width:82px;text-align:right}
.ptrow{display:flex;align-items:center;gap:9px;padding:5px 0;font-size:13.5px;
  border-top:1px solid var(--rule-2)}
.ptrow:first-of-type{border-top:0}
.ptrow .pd{width:9px;height:9px;flex:0 0 9px;border-radius:2px}
.ptrow .pn{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ptrow .pv{width:82px;text-align:right;font-weight:600}

/* ---- ranking ---- */
.rk{border-collapse:collapse;width:100%;font-size:13.5px}
.rk th{text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;
  color:var(--ink-2);font-weight:600;padding:6px 6px;border-bottom:1px solid var(--rule)}
.rk td{padding:5px 6px;border-bottom:1px solid var(--rule-2)}
.rk tbody tr:nth-child(even) td{background:var(--zebra)}
.rk .pl{color:var(--ink-2)}
.rk .av{font-weight:600;text-align:right}
.rk tr.top .pl{color:var(--ink);font-weight:700}
.pill{display:inline-block;font-size:11.5px;font-weight:600;padding:1px 7px;border-radius:2px;
  color:var(--pill-ink);white-space:nowrap}
.pill.m2{color:var(--pill-ink-2)}

/* ---- analysis groups ---- */
.groups{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--rule);
  background:var(--paper-2)}
.grp{padding:15px 18px;border-left:1px solid var(--rule)}
.grp:first-child{border-left:0}
.grp .gh{display:flex;align-items:center;gap:8px;margin-bottom:3px}
.grp .dot{width:11px;height:11px;border-radius:2px;flex:0 0 11px}
.grp .gt{font-size:14px;font-weight:600}
.grp .gc{margin-left:auto;font-size:19px;font-weight:600}
.grp .gsub{font-size:12px;color:var(--ink-2);margin-bottom:10px}
.grp ul{list-style:none;margin:0;padding:0}
.grp li{font-size:13px;padding:3px 0;border-top:1px solid var(--rule-2);line-height:1.35}
.grp li:first-child{border-top:0}
.grp .none{font-size:13px;color:var(--ink-2);font-style:italic}

/* ---- subject table ---- */
.sbt{width:100%;border-collapse:collapse;font-size:13.5px}
.sbt th{text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;
  color:var(--ink-2);font-weight:600;padding:7px 8px;border-bottom:1px solid var(--rule)}
.sbt th.n,.sbt td.n{text-align:right}
.sbt td{padding:6px 8px;border-bottom:1px solid var(--rule-2)}
.sbt tbody tr:nth-child(even) td{background:var(--zebra)}
.sbt{table-layout:fixed}
.sbt .nm{width:30%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sbt .av{font-weight:600;width:14%;text-align:right}
.sbt th.cnt{width:7%;text-align:center}
.sbt td.cnt{text-align:center;font-weight:600;color:var(--pill-ink)}
.sbt .cnt.z{color:var(--ink-2);font-weight:400;background:none}
.sbt .cnt.m5{background:var(--m5)}
.sbt .cnt.m4{background:var(--m4)}
.sbt .cnt.m3{background:var(--m3)}
.sbt .cnt.m2{background:var(--m2);color:var(--pill-ink-2)}
.sbt .pc{width:12%;text-align:right;font-variant-numeric:tabular-nums}
.sbt tr:last-child td{border-bottom:0}

/* ---- top three ---- */
.top3{width:100%;border-collapse:collapse;font-size:13.5px;table-layout:fixed}
.top3 td{padding:6px 4px;border-bottom:1px solid var(--rule-2)}
.top3 .pl{width:30px;color:var(--ink-2)}
.top3 .nm{width:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.top3 .av{width:56px;text-align:right;font-weight:600}
.top3 .ct{width:auto}
.top3 tr:last-child td{border-bottom:0}

/* ---- ranking with mark counts ---- */
/* the name column must not swallow the row: the table sits next to the
   subject table, so every column gets an explicit share of the width */
.rk{table-layout:fixed}
.rk .pl{width:7%}
/* every column needs an explicit share: in a fixed layout a width:auto
   column claims the leftover space and squeezes the name into one word
   per line */
.rk .nm{width:34%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rk .av{width:14%}
.rk th.cnt{width:8.5%;text-align:center}
.rk td.cnt{text-align:center;font-weight:600;font-variant-numeric:tabular-nums;
  color:var(--pill-ink)}
.rk .cnt.z{color:var(--ink-2);font-weight:400;background:none}
.rk .cnt.m5{background:var(--m5)}
.rk .cnt.m4{background:var(--m4)}
.rk .cnt.m3{background:var(--m3)}
.rk .cnt.m2{background:var(--m2);color:var(--pill-ink-2)}
.rk .cnt.has{font-weight:700}

/* ---- footer ---- */
.foot{margin-top:38px;padding-top:16px;border-top:1px solid var(--rule);
  font-size:13px;color:var(--ink-2);line-height:1.6}
.foot b{color:var(--ink);font-weight:600}

@media (max-width:1080px){
  .wrap{padding:24px 22px 56px}
  .kpis{grid-template-columns:repeat(2,1fr)}
  .kpi:nth-child(3){border-left:0;padding-left:0}
  .kpi:nth-child(-n+2){border-bottom:1px solid var(--rule)}
  .legend{grid-template-columns:1fr}
  .lg{border-left:0;border-top:1px solid var(--rule)}
  .lg:first-child{border-top:0}
  .groups{grid-template-columns:repeat(2,1fr)}
  .grp:nth-child(3){border-left:0;border-top:1px solid var(--rule)}
  .grp:nth-child(4){border-top:1px solid var(--rule)}
  .grid2{grid-template-columns:1fr;gap:26px}
  .head{flex-direction:column;align-items:flex-start;gap:14px}
  .head .meta{text-align:left}
  .head h1,.head .meta{font-size:24px}
}
@media (max-width:700px){
  .groups{grid-template-columns:1fr}
  .grp{border-left:0;border-top:1px solid var(--rule)}
  .grp:first-child{border-top:0}
  /* a table that cannot fit becomes stacked blocks: each row reads as a
     card instead of forcing a sideways scroll */
  .rk,.rk tbody,.rk tr,.rk td{display:block;width:auto}
  .rk thead{position:absolute;left:-9999px}
  .rk tr{border-bottom:1px solid var(--rule);padding:9px 0}
  .rk td{border:0;padding:0 0 0 34px;position:relative;display:inline-block;
    width:auto;margin-right:6px}
  .rk .nm{width:auto;max-width:calc(100% - 40px);white-space:normal}
  .rk .pl{position:absolute;left:0;top:0;width:26px}
  .rk .av{display:inline;margin-left:8px}
  .rk{font-size:13.5px}
  .rk .cnt{width:auto;min-width:22px;display:inline-block}
  .sbt{font-size:12.5px}
  .sbt th,.sbt td{padding:5px 5px}
  .sbt .nm{width:26%}
  .sbt .cnt{width:26px}
  .sbt .pc{width:62px}
}
@media print{
  body{background:#fff}
  .theme-btn{display:none}
  .wrap{max-width:none;padding:0}
}
</style>
</head>
<body>
<div class="wrap">

<header class="head">
  <div>
    <h1>__TITLE__</h1>
  </div>
  <div style="display:flex;align-items:flex-start;gap:18px">
    <div class="meta">Данные на __DATE__</div>
    <button class="theme-btn" id="themeBtn" type="button" aria-pressed="false">
      Тёмная тема
    </button>
  </div>
</header>

<section class="kpis" aria-label="Показатели класса">
__KPI__
</section>

<section aria-labelledby="legendH">
  <div class="sec">
    <h2 id="legendH">Легенда</h2>
    <span class="note">Каждый цвет на этой странице означает ровно одно</span>
  </div>
  <div class="legend">
__LEGEND__
  </div>
</section>

<div class="grid2 grid2-half">
  <div>__ABSENT__</div>
  <div>__SUBJPOINTS__</div>
</div>

<section aria-labelledby="subjH">
  <div class="sec">
    <h2 id="subjH">Средний балл по предметам</h2>
    <span class="note">Шкала 3,50 — 5,00 · цвет = шкала оценки</span>
  </div>
  <div class="grid2">
    <div>__SUBJCHART__</div>
    <div>
      <div class="sec"><h2>Распределение оценок</h2></div>
      __MARKCHART__
      <div class="sec" style="margin-top:26px"><h2>Лучшие результаты</h2></div>
      __TOP__
    </div>
  </div>
</section>

<section aria-labelledby="anH">
  <div class="sec">
    <h2 id="anH">Анализ успеваемости</h2>
    <span class="note">Кто в какой группе</span>
  </div>
  __GROUPS__
</section>

<section aria-labelledby="rkH">
  <div class="grid2 grid2-tight">
    <div>
      <div class="sec">
        <h2 id="rkH">Рейтинг обучающихся</h2>
      </div>
      __RANKING__
    </div>
    <div>
      <div class="sec">
        <h2 id="sbH">Статистика по предметам</h2>
      </div>
      __SUBJECTS__
    </div>
  </div>
</section>

<footer class="foot">
  <p><b>Как читать показатели.</b>
  <b>Успеваемость</b> — __DEF_SUCCESS__;
  <b>Качество знаний</b> — __DEF_QUALITY__;
  <b>Средний балл</b> — __DEF_AVG__.</p>
  <p>Округление итоговой оценки — по арифметическому правилу: 0,5 и выше вверх.
  Пустая ячейка означает, что по предмету не было ни одной оценки; это не ноль
  и в средние баллы не входит.</p>
  <p>Источник: __SOURCE__, класс __CLASS__, данные на __DATE__.
  Страница сгенерирована автоматически из исходной таблицы.</p>
</footer>

</div>
<script>
(function(){
  var root=document.documentElement, btn=document.getElementById('themeBtn');
  var KEY='cpr-theme';
  function apply(t){
    root.setAttribute('data-theme',t);
    var dark=t==='dark';
    btn.textContent=dark?'Светлая тема':'Тёмная тема';
    btn.setAttribute('aria-pressed',dark?'true':'false');
  }
  var saved=null;
  try{saved=localStorage.getItem(KEY);}catch(e){}
  apply(saved||'light');
  btn.addEventListener('click',function(){
    var next=root.getAttribute('data-theme')==='dark'?'light':'dark';
    apply(next);
    try{localStorage.setItem(KEY,next);}catch(e){}
  });
})();
</script>
</body>
</html>
"""


def esc(s) -> str:
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def fmt_num(v, digits=2) -> str:
    if v is None:
        return "—"
    return f"{v:.{digits}f}".replace(".", ",")


def fmt_pct(v) -> str:
    if v is None:
        return "—"
    return f"{v * 100:.1f}%".replace(".", ",")


def mark_color(v) -> str:
    """Colour by the rounded mark scale, matching the legend."""
    if v is None:
        return "var(--rule)"
    if v >= 5:
        return "var(--m5)"
    if v >= 4:
        return "var(--m4)"
    if v >= 3:
        return "var(--m3)"
    return "var(--m2)"


def band_of(avg) -> str:
    if avg is None:
        return "нет данных"
    if avg >= 4.75:
        return "отлично"
    if avg >= 4.25:
        return "хорошо"
    if avg >= 3.75:
        return "удовл."
    return "нужно внимания"


def build_kpis(d: dict) -> str:
    k = d["kpis"]
    cells = [
        ("Средний балл класса", fmt_num(k["avg"]),
         f'{esc(d["definitions"]["avg"])} · {k["students"]} учеников'),
        ("Успеваемость", fmt_pct(k["success"]),
         esc(d["definitions"]["success"])),
        ("Качество знаний", fmt_pct(k["quality"]),
         esc(d["definitions"]["quality"])),
        ("Всего оценок", str(k["marks"]),
         f'{k["subjects"]} предметов · среднее {fmt_num(k["avg"])}'),
    ]
    out = []
    for lab, val, hint in cells:
        out.append(
            f'<div class="kpi"><div class="lab">{lab}</div>'
            f'<div class="val num">{val}</div>'
            f'<div class="hint">{hint}</div></div>'
        )
    return "\n".join(out)


def build_legend(d: dict) -> str:
    marks = {m["value"]: m for m in d["marks"]}
    words = {"5": "отлично", "4": "хорошо", "3": "удовлетворительно", "2": "неудовлетворительно"}
    rows = []
    for v in ("5", "4", "3", "2"):
        m = marks[v]
        rows.append(
            f'<div class="keyrow"><span class="sw" style="background:var(--m{v})"></span>'
            f'<span class="kk">{v}</span><span class="kd">{words[v]}</span>'
            f'<span class="kc num">{m["count"]}</span></div>'
        )
    scale = (
        '<div class="scale">'
        '<i style="background:var(--m2)"></i><i style="background:var(--m3)"></i>'
        '<i style="background:var(--m4)"></i><i style="background:var(--m5)"></i>'
        '</div>'
        '<div class="scale-lbl"><span>2,00</span><span>3,00</span><span>4,00</span><span>5,00</span></div>'
        '<div class="scale-lbl" style="margin-top:8px">средний балл предмета</div>'
    )
    cats = []
    for c in d["categories"]:
        if c["count"] == 0:
            continue
        cats.append(
            f'<div class="catrow"><span class="cn">{esc(c["name"])}</span>'
            f'<span class="cc num">{c["count"]}</span>'
            f'<span class="cs num">{fmt_pct(c["share"])}</span></div>'
        )
    if not cats:
        cats.append('<div class="catrow"><span class="cn">Нет данных</span></div>')
    return (
        f'<div class="lg"><h3>Оценки</h3>{"".join(rows)}</div>'
        f'<div class="lg"><h3>Шкала среднего балла</h3>{scale}</div>'
        f'<div class="lg"><h3>Категории класса</h3>{"".join(cats)}</div>'
    )


def build_absent(d: dict) -> str:
    """Subjects where some students were never assessed, with the count and names.

    A subject nobody was assessed in has no average at all and is listed too;
    both mean "absence", never zero.
    """
    n_students = d["kpis"]["students"]
    items = []
    for s in d["subjects"]:
        missing = n_students - s["assessed"]
        if missing <= 0:
            continue
        items.append({
            "subject": s["name"],
            "missing": missing,
            "students": s.get("missingStudents", []),
        })
    for name in d.get("emptySubjects", []):
        if not any(item["subject"] == name for item in items):
            items.append({"subject": name, "missing": 0, "students": []})
    if not items:
        return ""

    def names_html(names):
        """Surname and first name on two lines, names side by side."""
        cells = []
        for full in names:
            parts = str(full).split()
            surname = parts[0] if parts else str(full)
            firstname = " ".join(parts[1:])
            cells.append(
                f'<span class="abs-n"><b>{esc(surname)}</b>'
                + (f'<i>{esc(firstname)}</i>' if firstname else "")
                + "</span>"
            )
        return "".join(cells)

    blocks = []
    for idx, item in enumerate(items):
        word = ("ученик" if item["missing"] == 1 else
                "ученика" if item["missing"] < 5 else "учеников")
        if idx:
            blocks.append('<div class="abs-next">Следующий предмет без оценок</div>')
        blocks.append(
            f'<div class="abs-head"><span class="as">{esc(item["subject"])}</span>'
            f'<span class="ac">{item["missing"]} {word} без оценок</span></div>'
        )
        blocks.append(
            f'<div class="abs-names">{names_html(item["students"])}</div>'
            if item["students"] else
            '<div class="abs-names"><span class="abs-n"><i>оценок нет ни у кого</i></span></div>'
        )

    total = sum(n_students - s["assessed"] for s in d["subjects"])
    return (
        '<section class="absent" aria-labelledby="absH">'
        '<h3 id="absH">Отсутствуют оценки</h3>'
        + "".join(blocks)
        + f'<div class="abs-total"><span>Всего невыставленных оценок</span>'
          f'<b class="num">{total}</b></div>'
        '</section>'
    )


def build_subject_chart(d: dict) -> str:
    """Horizontal bars for every subject, scaled to a fixed 3.50–5.00 axis.

    Sorted by the average, descending, so the chart and the subject table
    read in the same order.
    """
    subjects = sorted(d["subjects"],
                      key=lambda x: -(x["avg"] if x["avg"] is not None else -1))
    if not subjects:
        return '<p class="bar-label">Нет предметов</p>'
    row_h = 30
    label_w = 250
    value_w = 58
    plot_w = 430
    top = 22
    height = top + row_h * len(subjects) + 26
    lo, hi = 3.5, 5.0

    def x(v):
        return label_w + (v - lo) / (hi - lo) * plot_w

    parts = [f'<svg viewBox="0 0 {label_w + plot_w + value_w + 8} {height}" '
             f'width="100%" role="img" aria-label="Средний балл по предметам">']
    # scale ticks
    for tick in (3.5, 4.0, 4.5, 5.0):
        tx = x(tick)
        parts.append(f'<line class="axis-line" x1="{tx:.1f}" y1="{top - 6}" '
                     f'x2="{tx:.1f}" y2="{height - 20}"/>')
        parts.append(f'<text class="axis-text" x="{tx:.1f}" y="{height - 6}" '
                     f'text-anchor="middle">{fmt_num(tick, 1)}</text>')
    for i, s in enumerate(subjects):
        y = top + i * row_h
        avg = s["avg"]
        parts.append(f'<text class="bar-label" x="0" y="{y + 13}">{esc(s["name"])}</text>')
        if avg is None:
            parts.append(f'<text class="bar-value" x="{label_w}" y="{y + 13}" '
                         f'fill="var(--ink-2)">нет оценок</text>')
            continue
        x0, x1 = x(lo), x(avg)
        parts.append(f'<rect x="{x0:.1f}" y="{y + 3}" width="{max(x1 - x0, 1):.1f}" '
                     f'height="15" fill="{mark_color(round(avg))}" rx="1.5"/>')
        parts.append(f'<text class="bar-value" x="{x1 + 7:.1f}" y="{y + 15}">'
                     f'{fmt_num(avg)}</text>')
    parts.append("</svg>")
    return "".join(parts)


def build_mark_chart(d: dict) -> str:
    """A stacked composition bar plus per-mark rows."""
    marks = d["marks"]
    total = sum(m["count"] for m in marks) or 1
    bar_h = 34
    w = 360
    parts = [f'<svg viewBox="0 0 {w} {bar_h}" width="100%" role="img" '
             f'aria-label="Распределение оценок">']
    x = 0.0
    for m in marks:
        seg = m["count"] / total * w
        if seg <= 0:
            continue
        parts.append(f'<rect x="{x:.1f}" y="0" width="{seg:.1f}" height="{bar_h}" '
                     f'fill="var(--m{m["value"]})"/>')
        x += seg
    parts.append("</svg>")
    # the rows below reuse the legend's own language: swatch, mark, word, count
    words = {"5": "отлично", "4": "хорошо", "3": "удовлетворительно",
             "2": "неудовлетворительно"}
    rows = []
    for m in marks:
        rows.append(
            f'<div class="keyrow"><span class="sw" style="background:var(--m{m["value"]})"></span>'
            f'<span class="kk">{m["value"]}</span>'
            f'<span class="kd">{words[m["value"]]}</span>'
            f'<span class="kc num">{m["count"]}</span>'
            f'<span class="ks num">{fmt_pct(m["share"])}</span></div>'
        )
    return "".join(parts) + '<div class="keyrows">' + "".join(rows) + "</div>"


def build_top(d: dict) -> str:
    top = d["ranking"][:5]
    if not top:
        return '<p class="bar-label">Нет данных</p>'
    out = ['<table class="top3"><tbody>']
    for r in top:
        cat = r["category"]
        colour, pillcls = "var(--m5)", ""
        if "2" in cat:
            colour, pillcls = "var(--m2)", "m2"
        elif "3" in cat:
            colour = "var(--m3)"
        elif "4" in cat:
            colour = "var(--m4)"
        out.append(
            f'<tr class="top"><td class="pl num">{r["place"]}</td>'
            f'<td class="nm">{esc(r["name"])}</td>'
            f'<td class="av num">{fmt_num(r["avg"])}</td>'
            f'<td class="ct"><span class="pill {pillcls}" style="background:{colour}">{esc(cat)}</span></td></tr>'
        )
    out.append("</tbody></table>")
    return "".join(out)


def build_groups(d: dict) -> str:
    """Four named groups of pupils with subject details."""
    cells = []
    for g in d.get("groups", []):
        items_data = g.get("items", [])
        if items_data:
            items = "".join(
                f'<li><b>{esc(item["name"])}</b>'
                + (f' <span style="color:var(--ink-2);font-size:12px">({esc(item["detail"])})</span>' if item["detail"] else '')
                + f'</li>'
                for item in items_data
            )
        else:
            items = '<li class="none">нет</li>'
        cells.append(
            f'<div class="grp">'
            f'<div class="gh"><span class="dot" style="background:var(--{g["tone"]})"></span>'
            f'<span class="gt">{esc(g["title"])}</span>'
            f'<span class="gc num">{len(items_data)}</span></div>'
            f'<div class="gsub">{esc(g["hint"])}</div>'
            f'<ul>{items}</ul></div>'
        )
    return '<div class="groups">' + "".join(cells) + "</div>"


def build_subject_table(d: dict) -> str:
    """Per subject: average, mark counts and quality of knowledge.

    Sorted by the average, descending, so the table reads as a ranking.
    """
    rows = []
    for s in sorted(d["subjects"], key=lambda x: -(x["avg"] if x["avg"] is not None else -1)):
        cells = []
        for mk in ("5", "4", "3", "2"):
            n = s["counts"][mk]
            cls = "cnt" + (" z" if n == 0 else f" m{mk}")
            cells.append(f'<td class="{cls} num">{n}</td>')
        avg = fmt_num(s["avg"]) if s["avg"] is not None else "—"
        rows.append(
            f'<tr><td class="nm">{esc(s["name"])}</td>'
            f'<td class="n av num">{avg}</td>'
            + "".join(cells) +
            f'<td class="pc num">{fmt_pct(s["quality"])}</td></tr>'
        )
    return (
        '<table class="sbt"><thead><tr>'
        '<th class="nm">Предмет</th><th class="n av">Средний балл</th>'
        '<th class="n cnt">5</th><th class="n cnt">4</th>'
        '<th class="n cnt">3</th><th class="n cnt">2</th>'
        '<th class="n pc">Качество</th>'
        '</tr></thead><tbody>' + "".join(rows) + "</tbody></table>"
    )


def build_subject_points(d: dict) -> str:
    """The subjects that carry the class and the ones that need work.

    Both lists are sorted by the average, descending, and carry the same
    «Средний балл» column header the subject table uses.
    """
    def rows(items, tone):
        if not items:
            return '<div class="ptrow"><span class="pn">нет данных</span></div>'
        out = []
        for s in items:
            out.append(
                f'<div class="ptrow"><span class="pd" style="background:var(--{tone})"></span>'
                f'<span class="pn">{esc(s["name"])}</span>'
                f'<span class="pv num">{fmt_num(s["avg"])}</span></div>'
            )
        return "".join(out)

    # strong: best first. weak: the worst subject first, so the subject that
    # needs the most attention is the one the eye lands on
    strong = sorted(d.get("strongSubjects", []), key=lambda s: -s["avg"])
    weak = sorted(d.get("weakSubjects", []), key=lambda s: s["avg"])

    return (
        '<section class="absent" aria-labelledby="ptsH">'
        '<h3 id="ptsH">Сильные и проблемные предметы</h3>'
        '<div class="ptblock"><div class="ptlabel">Сильные предметы</div>'
        '<div class="pthead"><span class="pn">Предмет</span>'
        '<span class="pv">Средний балл</span></div>'
        + rows(strong, "m5") +
        '</div>'
        '<div class="ptblock"><div class="ptlabel">Проблемные предметы</div>'
        '<div class="pthead"><span class="pn">Предмет</span>'
        '<span class="pv">Средний балл</span></div>'
        + rows(weak, "m2") +
        '</div></section>'
    )


def build_ranking(d: dict) -> str:
    """Compact ranking with mark counts and subject breakdown for 2s and 3s."""
    rows = d["ranking"]
    if not rows:
        return '<p class="bar-label">Нет данных</p>'
    out = ['<table class="rk"><thead><tr><th>Место</th><th class="nm">Обучающийся</th>'
           '<th style="text-align:right">Средний</th>'
           '<th class="n cnt">5</th><th class="n cnt">4</th>'
           '<th class="n cnt">3</th><th class="n cnt">2</th>'
           '</tr></thead><tbody>']
    for r in rows:
        cells = []
        for mk in ("5", "4", "3", "2"):
            n = r["counts"][mk]
            cls = "cnt" + (" z" if n == 0 else f" m{mk} has")
            cells.append(f'<td class="{cls}">{n}</td>')
        
        detail_parts = []
        if r["counts"]["2"] > 0:
            twos = [subj for subj, mark in r.get("subjByMark", {}).items() if mark == 2]
            if twos:
                detail_parts.append(f"2: {', '.join(twos)}")
        if r["counts"]["3"] > 0:
            threes = [subj for subj, mark in r.get("subjByMark", {}).items() if mark == 3]
            if threes:
                detail_parts.append(f"3: {', '.join(threes)}")
        detail_str = " · ".join(detail_parts)
        sub_html = f'<br><span style="font-size:11.5px;color:var(--ink-2)">{esc(detail_str)}</span>' if detail_str else ''

        out.append(
            f'<tr><td class="pl num">{r["place"]}</td>'
            f'<td class="nm" title="{esc(r["name"])}">{esc(r["name"])}{sub_html}</td>'
            f'<td class="av num">{fmt_num(r["avg"])}</td>'
            + "".join(cells) + "</tr>"
        )
    out.append("</tbody></table>")
    return "".join(out)


def render(d: dict, source_name: str) -> str:
    html = HTML
    html = html.replace("__TITLE__", esc(f"Анализ успеваемости · {d['class']}"))
    html = html.replace("__CLASS__", esc(d["class"]))
    html = html.replace("__DATE__", esc(d["date"] or "—"))
    html = html.replace("__KPI__", build_kpis(d))
    html = html.replace("__LEGEND__", build_legend(d))
    html = html.replace("__ABSENT__", build_absent(d))
    html = html.replace("__SUBJPOINTS__", build_subject_points(d))
    html = html.replace("__SUBJCHART__", build_subject_chart(d))
    html = html.replace("__MARKCHART__", build_mark_chart(d))
    html = html.replace("__TOP__", build_top(d))
    html = html.replace("__RANKING__", build_ranking(d))
    html = html.replace("__GROUPS__", build_groups(d))
    html = html.replace("__SUBJECTS__", build_subject_table(d))
    html = html.replace("__DEF_SUCCESS__", esc(d["definitions"]["success"]))
    html = html.replace("__DEF_QUALITY__", esc(d["definitions"]["quality"]))
    html = html.replace("__DEF_AVG__", esc(d["definitions"]["avg"]))
    html = html.replace("__SOURCE__", esc(source_name))
    return html


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--source", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--class", dest="class_name", default="")
    ap.add_argument("--sheet", default=None)
    ap.add_argument("--header-cell", default=None)
    ap.add_argument("--date", default="")
    args = ap.parse_args()

    frame = read_source(args.source, args.sheet, args.header_cell)
    d = build_payload(frame, args.class_name, args.date)
    html = render(d, args.source)

    Path(args.output).write_text(html, encoding="utf-8")
    k = d["kpis"]
    print(f"students={k['students']} subjects={k['subjects']} marks={k['marks']} "
          f"avg={k['avg']}")
    print(f"saved: {args.output} ({len(html) // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
