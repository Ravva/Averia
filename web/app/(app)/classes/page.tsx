"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Pencil, Plus, School, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { classSnapshots, useStore } from "@/lib/store";
import type { ClassRoom } from "@/lib/types";
import { CLASS_NAME_RE, cn, fmtNum, normalizeClassNameInput, plural } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GRADES = [7, 8, 9, 10, 11];

function ClassFormDialog({
  room,
  open,
  onOpenChange,
}: {
  room: ClassRoom | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { state, createClass, updateClass } = useStore();
  const [grade, setGrade] = useState(room ? String(room.grade) : "9");
  const [letter, setLetter] = useState(room?.letter ?? "");
  const [teacherIds, setTeacherIds] = useState<string[]>(room?.teacherIds ?? []);
  const [error, setError] = useState("");
  const [normalized, setNormalized] = useState(false);

  const name = `${grade}${letter.toUpperCase()}`;
  const valid = CLASS_NAME_RE.test(name);
  const duplicate = state.classes.some(
    (c) => !c.deletedAt && c.name === name && c.id !== room?.id,
  );

  const onLetterChange = (raw: string) => {
    const cleaned = raw.replace(/[^А-Яа-яЁё]/g, "").slice(0, 1);
    setLetter(cleaned);
    setNormalized(raw !== cleaned && raw.length > 0);
    setError("");
  };

  const submit = () => {
    if (!valid) {
      setError("Формат: параллель 7–11 и одна заглавная буква, без дефиса. Например, 9А.");
      return;
    }
    if (duplicate) {
      setError(`Класс ${name} уже существует.`);
      return;
    }
    if (room) {
      updateClass(room.id, { name, grade: Number(grade), letter: letter.toUpperCase(), teacherIds });
      toast.success(`Класс ${name} обновлён`);
    } else {
      createClass({ name, grade: Number(grade), letter: letter.toUpperCase(), teacherIds });
      toast.success(`Класс ${name} создан`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{room ? `Изменить класс ${room.name}` : "Новый класс"}</DialogTitle>
          <DialogDescription>
            Имя строго вида «9А»: параллель и литера слитно, без дефиса и пробела.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="space-y-1.5">
              <Label>Параллель</Label>
              <Select value={grade} onValueChange={(v) => { setGrade(v); setError(""); }}>
                <SelectTrigger className="w-24" aria-label="Параллель">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map((g) => (
                    <SelectItem key={g} value={String(g)}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="letter">Литера</Label>
              <Input
                id="letter"
                value={letter}
                onChange={(e) => onLetterChange(e.target.value)}
                placeholder="Ю"
                className="w-20 text-center uppercase"
                maxLength={1}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Имя класса</Label>
              <div
                className={cn(
                  "flex h-9 min-w-24 items-center justify-center rounded-md border px-4 font-display text-lg font-bold",
                  valid && !duplicate ? "border-m5 bg-m5/10 text-ink" : "border-rule bg-band text-ink2",
                )}
              >
                {letter ? name : "—"}
              </div>
            </div>
          </div>
          {normalized && (
            <p className="text-xs text-ink2">Допустима только одна буква — лишние символы убраны.</p>
          )}
          <div className="space-y-1.5">
            <Label>Классные руководители</Label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-rule2 p-2">
              {state.users.map((u) => (
                <label
                  key={u.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-band"
                >
                  <input
                    type="checkbox"
                    checked={teacherIds.includes(u.id)}
                    onChange={(e) =>
                      setTeacherIds((ids) =>
                        e.target.checked ? [...ids, u.id] : ids.filter((x) => x !== u.id),
                      )
                    }
                    className="size-4 accent-[var(--ink)]"
                  />
                  <span className="flex-1">{u.name}</span>
                  <span className="text-xs text-ink2">{u.email}</span>
                  {u.role === "admin" && <Badge variant="secondary">админ</Badge>}
                </label>
              ))}
            </div>
          </div>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-md bg-m2/10 px-3 py-2 text-sm text-m2"
              role="alert"
            >
              {error}
            </motion.p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={submit} disabled={!valid || duplicate}>
            {room ? "Сохранить" : "Создать класс"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ClassesPage() {
  const { state, currentUser, deleteClass, restoreClass } = useStore();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClassRoom | null>(null);
  const [deleting, setDeleting] = useState<ClassRoom | null>(null);

  const rows = useMemo(() => {
    const alive = state.classes.filter((c) => !c.deletedAt);
    const q = query.trim().toLowerCase();
    const filtered = q
      ? alive.filter((c) => {
          const teachers = state.users
            .filter((u) => c.teacherIds.includes(u.id))
            .map((u) => u.name)
            .join(" ");
          return c.name.toLowerCase().includes(q) || teachers.toLowerCase().includes(q);
        })
      : alive;
    const withMeta = filtered.map((c) => {
      const snaps = classSnapshots(state, c.id);
      const last = snaps[snaps.length - 1];
      return { room: c, last, students: last?.payload.kpis.students ?? 0, avg: last?.payload.kpis.avg ?? null };
    });
    withMeta.sort((a, b) => {
      switch (sort) {
        case "students": return b.students - a.students;
        case "avg": return (b.avg ?? -1) - (a.avg ?? -1);
        case "recent": return (b.last?.uploadedAt ?? "").localeCompare(a.last?.uploadedAt ?? "");
        default: return a.room.name.localeCompare(b.room.name, "ru", { numeric: true });
      }
    });
    return withMeta;
  }, [state, query, sort]);

  if (currentUser?.role !== "admin") {
    return (
      <div className="py-16 text-center text-sm text-ink2">
        Раздел доступен только администратору.
      </div>
    );
  }

  const confirmDelete = () => {
    if (!deleting) return;
    const room = deleting;
    deleteClass(room.id);
    setDeleting(null);
    toast(`Класс ${room.name} удалён`, {
      description: "Срезы данных сохранены и восстановятся вместе с классом.",
      action: { label: "Вернуть", onClick: () => restoreClass(room.id) },
      duration: 6000,
    });
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Классы</h1>
          <p className="mt-1 text-sm text-ink2">
            {rows.length} {plural(rows.length, "класс", "класса", "классов")} · имена строго вида «9А», без дефиса
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus /> Создать класс
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по имени или учителю…"
            className="pl-9"
            aria-label="Поиск классов"
          />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-48" aria-label="Сортировка">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">По имени</SelectItem>
            <SelectItem value="students">По числу учеников</SelectItem>
            <SelectItem value="avg">По среднему баллу</SelectItem>
            <SelectItem value="recent">По свежести данных</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ room, last, students, avg }, i) => {
          const teachers = state.users.filter((u) => room.teacherIds.includes(u.id));
          return (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="group rounded-lg border border-rule2 bg-paper2 p-5 transition-colors hover:border-rule"
            >
              <div className="mb-3 flex items-start justify-between">
                <span className="font-display text-3xl font-bold tracking-tight">{room.name}</span>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost" size="icon" aria-label={`Изменить ${room.name}`}
                    onClick={() => { setEditing(room); setFormOpen(true); }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" aria-label={`Удалить ${room.name}`}
                    className="hover:text-m2"
                    onClick={() => setDeleting(room)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {teachers.length === 0 ? (
                  <span className="text-xs text-ink2 italic">руководитель не назначен</span>
                ) : (
                  teachers.map((t) => <Badge key={t.id} variant="secondary">{t.name}</Badge>)
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-rule2 pt-3 text-center">
                <div>
                  <div className="text-lg font-semibold">{students || "—"}</div>
                  <div className="text-[11px] text-ink2">{plural(students, "ученик", "ученика", "учеников")}</div>
                </div>
                <div>
                  <div className="text-lg font-semibold">{fmtNum(avg)}</div>
                  <div className="text-[11px] text-ink2">ср. балл</div>
                </div>
                <div>
                  <div className="text-lg font-semibold">{last ? last.dataDate.slice(0, 5) : "—"}</div>
                  <div className="text-[11px] text-ink2">срез</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {rows.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-rule py-16 text-center">
          <School className="size-8 text-ink2" />
          <p className="text-sm text-ink2">
            {query ? "Ничего не найдено." : "Классов пока нет — создайте первый."}
          </p>
        </div>
      )}

      <ClassFormDialog
        key={editing?.id ?? "new"}
        room={editing}
        open={formOpen}
        onOpenChange={setFormOpen}
      />

      <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Удалить класс {deleting?.name}?</DialogTitle>
            <DialogDescription>
              Класс исчезнет из списков, но его срезы данных сохранятся. Действие можно
              отменить сразу после удаления.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Отмена</Button>
            <Button variant="destructive" onClick={confirmDelete}>Удалить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}