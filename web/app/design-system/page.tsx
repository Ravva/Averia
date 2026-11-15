"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Check, Copy } from "lucide-react";
import { Button } from "@ui-sdk/react/button";
import { Toggle } from "@ui-sdk/react/toggle";
import { Switch, SwitchThumb } from "@ui-sdk/react/switch";
import { Checkbox, CheckboxIndicator } from "@ui-sdk/react/checkbox";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@ui-sdk/react/tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@ui-sdk/react/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui-sdk/react/select";
import { Popover, PopoverContent, PopoverTrigger, PopoverTitle } from "@ui-sdk/react/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui-sdk/react/tooltip";
import { Meter, MeterTrack, MeterIndicator, MeterLabel, MeterValue } from "@ui-sdk/react/meter";
import { Field, FieldLabel, FieldDescription } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { SubjectsChart, DistributionBar } from "@/components/design-system/charts";
import { DynamicsLineChart, IsometricLayers } from "@/components/design-system/advanced-charts";

const sections = [
  { id: "color", label: "Цвет" },
  { id: "type", label: "Типографика" },
  { id: "space", label: "Сетка и формы" },
  { id: "components", label: "Компоненты" },
  { id: "charts", label: "Графики" },
  { id: "themes", label: "Темы" },
];

const neutralRamp = [
  { token: "--paper", name: "Paper", note: "фон страницы" },
  { token: "--paper-2", name: "Surface", note: "карточки, панели" },
  { token: "--band", name: "Band", note: "заливка, hover" },
  { token: "--zebra", name: "Zebra", note: "чередование строк" },
  { token: "--rule", name: "Rule", note: "основные линии" },
  { token: "--rule-2", name: "Rule soft", note: "тонкие разделители" },
  { token: "--ink", name: "Ink", note: "основной текст" },
  { token: "--ink-2", name: "Ink soft", note: "вторичный текст" },
];

const grades = [
  { token: "--m5", mark: "5", name: "Отлично", light: "#4C9A6A", dark: "#5FB584", count: 299 },
  { token: "--m4", mark: "4", name: "Хорошо", light: "#C9A227", dark: "#DCBB42", count: 128 },
  { token: "--m3", mark: "3", name: "Удовлетворительно", light: "#C77B3C", dark: "#DB9155", count: 17 },
  { token: "--m2", mark: "2", name: "Неудовлетворительно", light: "#DC2626", dark: "#EB514A", count: 1 },
];

const typeScale = [
  { name: "Display", size: "44 / 1.05", weight: 600, sample: "4,55", cls: "text-[44px] leading-none font-semibold tracking-tight" },
  { name: "Title", size: "30 / 1.15", weight: 600, sample: "Анализ успеваемости", cls: "text-3xl font-semibold tracking-tight" },
  { name: "Heading", size: "20 / 1.3", weight: 600, sample: "Средний балл по предметам", cls: "text-xl font-semibold" },
  { name: "Body", size: "16 / 1.5", weight: 400, sample: "Доля учеников, имеющих только оценки 4 и 5.", cls: "text-base" },
  { name: "Small", size: "13 / 1.45", weight: 400, sample: "Источник: averageMarks.xlsx, класс 9-Ю.", cls: "text-[13px]" },
  { name: "Micro", size: "11 / 1.2", weight: 600, sample: "КАЧЕСТВО ЗНАНИЙ", cls: "text-[11px] font-semibold uppercase tracking-[0.08em]" },
];

function Swatch({ token, name, note }: { token: string; name: string; note: string }) {
  return (
    <div className="group">
      <div
        className="h-16 w-full rounded-lg border border-rule2"
        style={{ background: `var(${token})` }}
      />
      <div className="mt-2 text-sm font-medium">{name}</div>
      <div className="font-mono text-[11px] text-ink2">{token}</div>
      <div className="text-xs text-ink2">{note}</div>
    </div>
  );
}

function SectionHeading({ id, title, note }: { id: string; title: string; note?: string }) {
  return (
    <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-rule pb-3" id={id}>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {note && <span className="text-[13px] text-ink2">{note}</span>}
    </div>
  );
}

export default function DesignSystemPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const [region, setRegion] = useState<string | null>("9yu");

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* masthead */}
      <header className="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-8 py-3.5">
          <div className="flex items-baseline gap-3">
            <span className="text-[15px] font-semibold tracking-tight">Averia</span>
            <span className="h-3.5 w-px bg-rule" />
            <span className="text-[13px] text-ink2">Дизайн-система «Graphite Ledger»</span>
          </div>
          <button
            type="button"
            onClick={() => setTheme(dark ? "light" : "dark")}
            aria-pressed={dark}
            className="inline-flex items-center gap-2 rounded-md border border-rule bg-paper2 px-3 py-1.5 text-[13px] font-medium transition-colors hover:border-ink2"
          >
            {dark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            {dark ? "Светлая тема" : "Тёмная тема"}
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1200px] grid-cols-[180px_1fr] gap-10 px-8 py-10 max-lg:grid-cols-1">
        {/* rail */}
        <nav className="sticky top-24 self-start max-lg:static" aria-label="Содержание">
          <ul className="space-y-1 text-[13px] max-lg:flex max-lg:flex-wrap max-lg:gap-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block rounded-md px-2.5 py-1.5 text-ink2 transition-colors hover:bg-band hover:text-ink"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 space-y-16">
          {/* intro */}
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Дизайн-система Averia</h1>
            <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-ink2">
              Точный измерительный инструмент для школьной аналитики. Графитовые нейтрали,
              один индиго-акцент для интерактива и фиксированная палитра оценок — единственный
              тёплый сигнал. Компоненты построены на ui-sdk, графики — на данных класса 9-Ю.
            </p>
          </div>

          {/* COLOR */}
          <section aria-labelledby="color">
            <SectionHeading id="color" title="Цвет" note="Токены — единственный источник цвета" />
            <h3 className="micro-label mb-4">Нейтральная шкала</h3>
            <div className="grid grid-cols-4 gap-5 max-md:grid-cols-2">
              {neutralRamp.map((n) => (
                <Swatch key={n.token} token={n.token} name={n.name} note={n.note} />
              ))}
            </div>

            <h3 className="micro-label mb-4 mt-10">Палитра оценок</h3>
            <div className="grid grid-cols-4 gap-5 max-md:grid-cols-2">
              {grades.map((g) => (
                <div key={g.token}>
                  <div
                    className="flex h-16 items-center justify-between rounded-lg px-4"
                    style={{ background: `var(${g.token})` }}
                  >
                    <span className="text-2xl font-semibold text-white">{g.mark}</span>
                    <span className="font-mono text-xs text-white/85">{g.count} оц.</span>
                  </div>
                  <div className="mt-2 text-sm font-medium">{g.name}</div>
                  <div className="font-mono text-[11px] text-ink2">
                    {g.light} · dark {g.dark}
                  </div>
                </div>
              ))}
            </div>

            <h3 className="micro-label mb-4 mt-10">Акцент</h3>
            <div className="grid grid-cols-4 gap-5 max-md:grid-cols-2">
              <Swatch token="--accent" name="Accent" note="интерактив, фокус, выделение" />
              <Swatch token="--accent-soft" name="Accent soft" note="подложка акцентных элементов" />
            </div>
            <p className="mt-6 max-w-[62ch] text-[13px] leading-relaxed text-ink2">
              Цвет никогда не единственный носитель смысла: каждая оценка подписана числом и текстом.
              Контраст текста соответствует WCAG AA в обеих темах.
            </p>
          </section>

          {/* TYPE */}
          <section aria-labelledby="type">
            <SectionHeading id="type" title="Типографика" note="Golos Text · табличные цифры" />
            <div className="divide-y divide-rule2 border-y border-rule2">
              {typeScale.map((t) => (
                <div key={t.name} className="flex items-baseline gap-6 py-4 max-md:flex-col max-md:gap-1">
                  <div className="w-28 shrink-0">
                    <div className="text-[13px] font-medium">{t.name}</div>
                    <div className="font-mono text-[11px] text-ink2">{t.size}</div>
                  </div>
                  <div className={`${t.cls} min-w-0 truncate`}>{t.sample}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[13px] text-ink2">
              Числа в данных — <span className="font-mono">моноширинные</span> и табличные
              (<code className="rounded bg-band px-1 py-0.5 font-mono text-[12px]">font-variant-numeric: tabular-nums</code>),
              чтобы колонки не прыгали.
            </p>
          </section>

          {/* SPACE */}
          <section aria-labelledby="space">
            <SectionHeading id="space" title="Сетка и формы" note="8px базовый шаг" />
            <div className="grid grid-cols-2 gap-8 max-md:grid-cols-1">
              <div>
                <h3 className="micro-label mb-4">Радиусы</h3>
                <div className="flex items-end gap-5">
                  {[4, 6, 8, 12].map((r) => (
                    <div key={r} className="text-center">
                      <div
                        className="h-14 w-14 border border-rule bg-paper2"
                        style={{ borderRadius: r }}
                      />
                      <div className="mt-2 font-mono text-[11px] text-ink2">{r}px</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="micro-label mb-4">Линии</h3>
                <div className="space-y-4">
                  <div className="border-t border-rule pt-2 text-[13px] text-ink2">1px · Rule — разделы, таблицы</div>
                  <div className="border-t border-rule2 pt-2 text-[13px] text-ink2">1px · Rule soft — строки, тонкие разделители</div>
                  <div className="border-t-2 border-ink pt-2 text-[13px] text-ink2">2px · Ink — верхняя линия мастхеда</div>
                </div>
              </div>
            </div>
          </section>

          {/* COMPONENTS */}
          <section aria-labelledby="components">
            <SectionHeading id="components" title="Компоненты" note="ui-sdk · без стилей по умолчанию" />

            <div className="space-y-10">
              {/* buttons */}
              <div>
                <h3 className="micro-label mb-4">Кнопки и переключатели</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <Button className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-ink transition-opacity hover:opacity-90">
                    Основное действие
                  </Button>
                  <Button className="rounded-md border border-rule bg-paper2 px-4 py-2 text-sm font-medium transition-colors hover:border-ink2">
                    Вторичное
                  </Button>
                  <Button disabled className="rounded-md border border-rule2 bg-band px-4 py-2 text-sm font-medium text-ink2 opacity-60">
                    Недоступно
                  </Button>
                  <Toggle className="rounded-md border border-rule px-4 py-2 text-sm font-medium transition-colors data-pressed:bg-ink data-pressed:text-paper">
                    Закладка
                  </Toggle>
                </div>
              </div>

              {/* switch + checkbox */}
              <div className="flex flex-wrap items-center gap-10">
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <Switch
                    defaultChecked
                    className="flex h-5 w-9 items-center rounded-full bg-rule p-0.5 transition-colors data-checked:bg-brand"
                  >
                    <SwitchThumb className="size-4 rounded-full bg-white shadow transition-transform data-checked:translate-x-4" />
                  </Switch>
                  Уведомления о срезах
                </label>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <Checkbox
                    defaultChecked
                    className="flex size-4.5 items-center justify-center rounded border border-rule bg-paper2 data-checked:border-brand data-checked:bg-brand"
                  >
                    <CheckboxIndicator>
                      <Check className="size-3.5 text-brand-ink" strokeWidth={3} />
                    </CheckboxIndicator>
                  </Checkbox>
                  Показывать учеников без оценок
                </label>
              </div>

              {/* select + input */}
              <div className="grid grid-cols-2 gap-6 max-md:grid-cols-1">
                <div>
                  <h3 className="micro-label mb-3">Выбор класса</h3>
                  <Select items={["9-Ю", "7-Б", "10-В"]} value={region} onValueChange={setRegion}>
                    <SelectTrigger className="flex w-full items-center justify-between rounded-md border border-rule bg-paper2 px-3 py-2 text-sm">
                      <SelectValue placeholder="Выберите класс" />
                      <span className="text-ink2">▾</span>
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border border-rule bg-paper2 p-1 shadow-2">
                      {["9-Ю", "7-Б", "10-В"].map((c) => (
                        <SelectItem
                          key={c}
                          value={c}
                          className="cursor-default rounded-md px-3 py-1.5 text-sm data-highlighted:bg-brand-soft"
                        >
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Field name="teacher">
                  <FieldLabel className="micro-label mb-3 block">Классный руководитель</FieldLabel>
                  <Input
                    placeholder="Учитель Иванова"
                    className="w-full rounded-md border border-rule bg-paper2 px-3 py-2 text-sm placeholder:text-ink2/70"
                  />
                  <FieldDescription className="mt-2 text-xs text-ink2">
                    Отображается в шапке отчёта для родительского собрания.
                  </FieldDescription>
                </Field>
              </div>

              {/* tabs */}
              <div>
                <h3 className="micro-label mb-3">Вкладки</h3>
                <Tabs defaultValue="current">
                  <TabsList className="flex gap-1 border-b border-rule">
                    {[
                      ["current", "Текущий срез"],
                      ["dynamics", "Динамика"],
                      ["history", "История"],
                    ].map(([v, l]) => (
                      <TabsTab
                        key={v}
                        value={v}
                        className="border-b-2 border-transparent px-3 py-2 text-sm text-ink2 transition-colors data-selected:border-brand data-selected:text-ink"
                      >
                        {l}
                      </TabsTab>
                    ))}
                  </TabsList>
                  <TabsPanel value="current" className="pt-4 text-sm text-ink2">
                    Срез на 09.11.2026 · 28 учеников · 16 предметов.
                  </TabsPanel>
                  <TabsPanel value="dynamics" className="pt-4 text-sm text-ink2">
                    Сравнение с предыдущим срезом: средний балл +0,14.
                  </TabsPanel>
                  <TabsPanel value="history" className="pt-4 text-sm text-ink2">
                    Все загруженные срезы класса за учебный год.
                  </TabsPanel>
                </Tabs>
              </div>

              {/* overlays */}
              <div>
                <h3 className="micro-label mb-3">Оверлеи и подсказки</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <Dialog>
                    <DialogTrigger className="rounded-md border border-rule bg-paper2 px-4 py-2 text-sm font-medium hover:border-ink2">
                      Открыть диалог
                    </DialogTrigger>
                    <DialogContent className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-rule bg-paper2 p-6 shadow-2">
                      <DialogTitle className="text-lg font-semibold">Удалить срез?</DialogTitle>
                      <DialogDescription className="mt-2 text-sm text-ink2">
                        Срез от 09.11.2026 будет удалён из истории класса 9-Ю. Действие нельзя отменить.
                      </DialogDescription>
                      <div className="mt-5 flex justify-end gap-3">
                        <DialogClose className="rounded-md border border-rule px-4 py-2 text-sm">Отмена</DialogClose>
                        <DialogClose className="rounded-md bg-m2 px-4 py-2 text-sm font-medium text-white">
                          Удалить
                        </DialogClose>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Popover>
                    <PopoverTrigger className="rounded-md border border-rule bg-paper2 px-4 py-2 text-sm font-medium hover:border-ink2">
                      Всплывающее окно
                    </PopoverTrigger>
                    <PopoverContent sideOffset={8} className="w-64 rounded-lg border border-rule bg-paper2 p-4 shadow-2">
                      <PopoverTitle className="text-sm font-semibold">Качество знаний</PopoverTitle>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-ink2">
                        Доля учеников, имеющих только оценки 4 и 5. Для 9-Ю — 64,3%.
                      </p>
                    </PopoverContent>
                  </Popover>

                  <Tooltip>
                    <TooltipTrigger className="rounded-md border border-rule bg-paper2 px-4 py-2 text-sm font-medium hover:border-ink2">
                      Наведите курсор
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6} className="rounded-md bg-ink px-2.5 py-1.5 text-xs text-paper shadow-1">
                      Средний балл по всем предметам
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* meter */}
              <div className="max-w-sm">
                <h3 className="micro-label mb-3">Шкала показателя</h3>
                <Meter value={64.3} min={0} max={100}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <MeterLabel className="text-sm">Качество знаний</MeterLabel>
                    <MeterValue className="font-mono text-sm font-medium" />
                  </div>
                  <MeterTrack className="h-2 overflow-hidden rounded-full bg-band">
                    <MeterIndicator className="h-full rounded-full bg-brand" />
                  </MeterTrack>
                </Meter>
              </div>
            </div>
          </section>

          {/* CHARTS */}
          <section aria-labelledby="charts">
            <SectionHeading id="charts" title="Графики" note="Данные класса 9-Ю · 09.11.2026" />
            <div className="grid grid-cols-[1.6fr_1fr] gap-10 max-lg:grid-cols-1">
              <div>
                <h3 className="micro-label mb-4">Средний балл по предметам</h3>
                <SubjectsChart />
              </div>
              <div>
                <h3 className="micro-label mb-4">Распределение оценок</h3>
                <DistributionBar />
                <p className="mt-5 text-[13px] leading-relaxed text-ink2">
                  Каждый график дублирует цвет числом и подписью. Цвет столбца следует шкале
                  среднего балла: зелёный — от 4,50, охра — 3,50–4,49.
                </p>
              </div>
            </div>

            <div className="mt-12">
              <h3 className="micro-label mb-4">Динамика среднего балла</h3>
              <p className="mb-5 max-w-[62ch] text-[13px] leading-relaxed text-ink2">
                Плавная кривая (сплайн Catmull-Rom) по срезам за учебный год. Область под линией
                залита акцентным градиентом, точки — срезы. Данные иллюстративные.
              </p>
              <DynamicsLineChart />
            </div>

            <div className="mt-12">
              <h3 className="micro-label mb-4">Состав класса · изометрия</h3>
              <p className="mb-5 max-w-[62ch] text-[13px] leading-relaxed text-ink2">
                Слоистая изометрическая диаграмма в стиле vercel/docs-diagrams: парящие плоскости,
                тонкие соединительные линии и выноски. Каждый слой — группа оценок с предметами
                и числом учеников. Построена на данных 9-Ю.
              </p>
              <IsometricLayers />
            </div>
          </section>

          {/* THEMES */}
          <section aria-labelledby="themes">
            <SectionHeading id="themes" title="Темы" note="Светлая и тёмная — равноправные" />
            <div className="grid grid-cols-2 gap-6 max-md:grid-cols-1">
              <div className="rounded-xl border border-rule bg-[#f6f7f9] p-5 text-[#16181d]">
                <div className="micro-label mb-3" style={{ color: "#565d6b" }}>Светлая</div>
                <div className="text-2xl font-semibold tracking-tight">4,55</div>
                <div className="mt-1 text-[13px]" style={{ color: "#565d6b" }}>средний балл класса</div>
                <div className="mt-4 flex gap-1.5">
                  {grades.map((g) => (
                    <span key={g.token} className="h-3 flex-1 rounded-sm" style={{ background: g.light }} />
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-[#2e333d] bg-[#101216] p-5 text-[#e7e9ee]">
                <div className="micro-label mb-3" style={{ color: "#9aa3b2" }}>Тёмная</div>
                <div className="text-2xl font-semibold tracking-tight">4,55</div>
                <div className="mt-1 text-[13px]" style={{ color: "#9aa3b2" }}>средний балл класса</div>
                <div className="mt-4 flex gap-1.5">
                  {grades.map((g) => (
                    <span key={g.token} className="h-3 flex-1 rounded-sm" style={{ background: g.dark }} />
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-5 max-w-[62ch] text-[13px] leading-relaxed text-ink2">
              Тёмная тема — настоящая графитовая поверхность, а не инверсия. Палитра оценок
              осветляется для сохранения контраста; акцент смещается к более светлому индиго.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
