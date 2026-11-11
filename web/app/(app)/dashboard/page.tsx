"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, FileSpreadsheet, Upload } from "lucide-react";
import { classSnapshots, useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Section } from "@/components/dashboard/section";
import {
  AbsentCard,
  CategoriesCard,
  GroupsCard,
  KpiBand,
  MarksCard,
  StrongWeak,
} from "@/components/dashboard/current";
import { RankingTable, SubjectsTable } from "@/components/dashboard/tables";
import { SubjectsBarChart } from "@/components/dashboard/charts";
import { DynamicsView } from "@/components/dashboard/dynamics";
import { HistoryView } from "@/components/dashboard/history";
import { StudentDrawer } from "@/components/dashboard/student-drawer";

export default function DashboardPage() {
  const { state, hydrated, visibleClasses, currentUser } = useStore();
  const [classId, setClassId] = useState<string>("");
  const [tab, setTab] = useState("current");
  const [student, setSelectedStudent] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [prevId, setPrevId] = useState<string>("");
  const [currId, setCurrId] = useState<string>("");

  useEffect(() => {
    if (!classId && visibleClasses.length > 0) setClassId(visibleClasses[0].id);
  }, [visibleClasses, classId]);

  const room = visibleClasses.find((c) => c.id === classId) ?? null;
  const snapshots = useMemo(
    () => (room ? classSnapshots(state, room.id) : []),
    [state, room],
  );
  const curr = snapshots[snapshots.length - 1] ?? null;
  const prev = snapshots[snapshots.length - 2] ?? null;

  useEffect(() => {
    if (snapshots.length >= 2) {
      setCurrId(snapshots[snapshots.length - 1].id);
      setPrevId(snapshots[snapshots.length - 2].id);
    }
  }, [classId, snapshots.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const dynPrev = snapshots.find((s) => s.id === prevId) ?? prev;
  const dynCurr = snapshots.find((s) => s.id === currId) ?? curr;

  const openStudent = (name: string) => {
    setSelectedStudent(name);
    setDrawerOpen(true);
  };

  if (!hydrated) return null;

  if (visibleClasses.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-band text-ink2">
          <FileSpreadsheet className="size-7" />
        </span>
        <h1 className="font-display text-2xl font-semibold">Пока нет классов</h1>
        <p className="max-w-sm text-sm text-ink2">
          {currentUser?.role === "admin"
            ? "Создайте класс в разделе «Классы», затем загрузите экспорт средних баллов."
            : "Администратор ещё не назначил вам класс. Попросите доступ или дождитесь приглашения."}
        </p>
        {currentUser?.role === "admin" && (
          <Button asChild>
            <Link href="/classes">Создать класс</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* page header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Анализ успеваемости
          </h1>
          <p className="mt-1 text-sm text-ink2">
            {curr
              ? `Данные на ${curr.dataDate} · период с ${curr.periodStart || "—"} · загружено ${curr.fileName}`
              : "Нет загруженных данных"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-32" aria-label="Класс">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {visibleClasses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild variant="outline">
            <Link href="/upload">
              <Upload /> Загрузить
            </Link>
          </Button>
        </div>
      </div>

      {!curr ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-rule py-16 text-center">
          <CalendarDays className="size-8 text-ink2" />
          <p className="text-sm text-ink2">
            Для класса {room?.name} ещё нет срезов. Загрузите XLSX-экспорт «Averagemarks».
          </p>
          <Button asChild>
            <Link href="/upload"><Upload /> Загрузить файл</Link>
          </Button>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="current">Текущий срез</TabsTrigger>
            <TabsTrigger value="dynamics" disabled={snapshots.length < 2}>
              Динамика
            </TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab + classId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <TabsContent value="current">
                <KpiBand payload={curr.payload} />
                <div className="mt-7 grid gap-6 lg:grid-cols-2">
                  <MarksCard payload={curr.payload} />
                  <CategoriesCard payload={curr.payload} />
                </div>
                <div className="mt-9">
                  <Section title="Сильные и слабые предметы" note="по среднему баллу">
                    <StrongWeak payload={curr.payload} />
                  </Section>
                </div>
                <Section title="Средний балл по предметам" note="шкала 3,50–5,00 · цвет = оценка · пунктир — ключевые отметки">
                  <div className="border border-rule bg-paper2 p-4">
                    <SubjectsBarChart payload={curr.payload} />
                  </div>
                </Section>
                <Section title="По предметам" note="качество — доля оценок 4 и 5 · кубики — число оценок">
                  <SubjectsTable payload={curr.payload} />
                </Section>
                <Section title="Рейтинг учеников" note="нажмите на строку — карточка ученика">
                  <RankingTable payload={curr.payload} onSelect={openStudent} />
                </Section>
                <Section title="Группы внимания">
                  <GroupsCard payload={curr.payload} />
                </Section>
                <AbsentCard payload={curr.payload} />
              </TabsContent>

              <TabsContent value="dynamics">
                {dynPrev && dynCurr ? (
                  <>
                    <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
                      <span className="text-ink2">Сравниваем</span>
                      <Select value={dynCurr.id} onValueChange={setCurrId}>
                        <SelectTrigger className="w-36" aria-label="Новый срез">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {snapshots.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.dataDate}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-ink2">с</span>
                      <Select value={dynPrev.id} onValueChange={setPrevId}>
                        <SelectTrigger className="w-36" aria-label="Предыдущий срез">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {snapshots.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.dataDate}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <DynamicsView prev={dynPrev} curr={dynCurr} onSelectStudent={openStudent} />
                  </>
                ) : (
                  <p className="py-12 text-center text-sm text-ink2">
                    Нужно минимум два среза для сравнения.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="history">
                <HistoryView
                  snapshots={snapshots}
                  canDelete={currentUser?.role === "admin" || (room?.teacherIds.includes(currentUser?.id ?? "") ?? false)}
                />
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      )}

      {curr && (
        <StudentDrawer
          name={student}
          payload={curr.payload}
          prevPayload={prev?.payload ?? null}
          snapshots={snapshots}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        />
      )}
    </div>
  );
}