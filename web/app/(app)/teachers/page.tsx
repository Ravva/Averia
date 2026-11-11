"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, Copy, Link2, MailPlus, ShieldCheck, UserX, Users } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import type { Invite } from "@/lib/types";
import { cn, fmtDateTime, plural } from "@/lib/utils";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function inviteLink(token: string): string {
  if (typeof window === "undefined") return `/invite/${token}`;
  return `${window.location.origin}/invite/${token}`;
}

function CopyLinkButton({ token, small = false }: { token: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const link = inviteLink(token);
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    toast.success("Ссылка скопирована");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant={small ? "ghost" : "outline"} size={small ? "icon" : "sm"} onClick={copy} aria-label="Скопировать ссылку">
      {copied ? <Check className="text-m5" /> : <Copy />}
      {!small && (copied ? "Скопировано" : "Копировать")}
    </Button>
  );
}

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, createInvite } = useStore();
  const [email, setEmail] = useState("");
  const [classIds, setClassIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Invite | null>(null);

  const alive = state.classes.filter((c) => !c.deletedAt);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const alreadyUser = state.users.some((u) => u.email === email.trim().toLowerCase());
  const alreadyInvited = state.invites.some(
    (i) => i.email === email.trim().toLowerCase() && i.status === "pending",
  );

  const reset = () => {
    setEmail("");
    setClassIds([]);
    setError("");
    setCreated(null);
  };

  const submit = () => {
    if (!emailValid) {
      setError("Укажите корректный email.");
      return;
    }
    if (alreadyUser) {
      setError("Этот email уже зарегистрирован — учитель может войти сам.");
      return;
    }
    if (alreadyInvited) {
      setError("Для этого email уже есть активное приглашение.");
      return;
    }
    const invite = createInvite(email, classIds);
    setCreated(invite);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Ссылка готова</DialogTitle>
              <DialogDescription>
                Отправьте её учителю любым удобным способом. Ссылка одноразовая и действует 7 дней.
              </DialogDescription>
            </DialogHeader>
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 rounded-md border border-m5/40 bg-m5/10 p-3">
                <Link2 className="size-4 shrink-0 text-m5" />
                <code className="min-w-0 flex-1 truncate text-xs text-ink">{inviteLink(created.token)}</code>
                <CopyLinkButton token={created.token} />
              </div>
              <p className="text-xs text-ink2">
                Для: <span className="font-medium text-ink">{created.email}</span>
                {created.classIds.length > 0 && (
                  <> · классы {alive.filter((c) => created.classIds.includes(c.id)).map((c) => c.name).join(", ")}</>
                )}
              </p>
            </motion.div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { reset(); }}>Создать ещё</Button>
              <Button onClick={() => onOpenChange(false)}>Готово</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Пригласить учителя</DialogTitle>
              <DialogDescription>
                Учитель откроет magic-link, задаст имя и пароль — и сразу получит доступ к выбранным классам.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email учителя</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="newteacher@school.ru"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Классы (можно выбрать позже)</Label>
                <div className="flex flex-wrap gap-2">
                  {alive.map((c) => {
                    const on = classIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() =>
                          setClassIds((ids) => (on ? ids.filter((x) => x !== c.id) : [...ids, c.id]))
                        }
                        className={cn(
                          "cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium transition-all",
                          on ? "border-primary bg-primary text-primary-foreground" : "border-rule bg-paper2 text-ink hover:border-ink2",
                        )}
                      >
                        {c.name}
                      </button>
                    );
                  })}
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
              <Button onClick={submit} disabled={!emailValid}>
                <MailPlus /> Создать ссылку
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const STATUS_LABEL: Record<Invite["status"], string> = {
  pending: "ожидает",
  accepted: "принято",
  revoked: "отозвано",
};

export default function TeachersPage() {
  const { state, currentUser, revokeInvite } = useStore();
  const [inviteOpen, setInviteOpen] = useState(false);

  const teachers = useMemo(
    () => state.users.map((u) => ({
      user: u,
      classes: state.classes.filter((c) => !c.deletedAt && c.teacherIds.includes(u.id)),
    })),
    [state.users, state.classes],
  );

  const invites = useMemo(
    () => [...state.invites].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.invites],
  );

  if (currentUser?.role !== "admin") {
    return (
      <div className="py-16 text-center text-sm text-ink2">
        Раздел доступен только администратору.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Учителя</h1>
          <p className="mt-1 text-sm text-ink2">
            {teachers.length} {plural(teachers.length, "аккаунт", "аккаунта", "аккаунтов")} · регистрация только по magic-link
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <MailPlus /> Пригласить учителя
        </Button>
      </div>

      <div className="mb-9">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[26%]">Учитель</TableHead>
              <TableHead className="w-[26%]">Email</TableHead>
              <TableHead className="w-[14%]">Роль</TableHead>
              <TableHead className="w-[22%]">Классы</TableHead>
              <TableHead className="w-[12%]">С нами с</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.map(({ user, classes }) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                      {user.name.slice(0, 1)}
                    </span>
                    <span className="truncate font-medium">{user.name}</span>
                  </div>
                </TableCell>
                <TableCell className="truncate text-ink2">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {user.role === "admin" ? "админ" : "учитель"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {classes.length === 0 ? (
                      <span className="text-xs text-ink2 italic">нет</span>
                    ) : (
                      classes.map((c) => <Badge key={c.id} variant="outline">{c.name}</Badge>)
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-ink2">
                  {new Date(user.createdAt).toLocaleDateString("ru-RU")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mb-4 flex items-baseline justify-between border-b border-rule pb-2">
        <h2 className="font-display text-lg font-semibold">Приглашения</h2>
        <span className="text-xs text-ink2">{invites.length} всего</span>
      </div>
      <div className="space-y-2">
        {invites.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-rule py-12 text-center">
            <Users className="size-7 text-ink2" />
            <p className="text-sm text-ink2">Приглашений пока нет.</p>
          </div>
        )}
        {invites.map((inv, i) => {
          const expired = inv.status === "pending" && new Date(inv.expiresAt).getTime() < Date.now();
          const classNames = state.classes.filter((c) => inv.classIds.includes(c.id)).map((c) => c.name);
          return (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
              className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-rule2 bg-paper2 px-4 py-3"
            >
              <div className="min-w-48">
                <div className="text-sm font-medium">{inv.email}</div>
                <div className="text-[11px] text-ink2">создано {fmtDateTime(inv.createdAt)}</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {classNames.map((n) => <Badge key={n} variant="outline">{n}</Badge>)}
              </div>
              <Badge
                variant={inv.status === "accepted" ? "m5" : inv.status === "revoked" || expired ? "m2" : "m4"}
              >
                {expired ? "истекло" : STATUS_LABEL[inv.status]}
              </Badge>
              <div className="ml-auto flex items-center gap-2">
                {inv.status === "pending" && !expired && (
                  <>
                    <CopyLinkButton token={inv.token} small />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Отозвать приглашение"
                      className="text-ink2 hover:text-m2"
                      onClick={() => {
                        revokeInvite(inv.id);
                        toast("Приглашение отозвано");
                      }}
                    >
                      <UserX className="size-4" />
                    </Button>
                  </>
                )}
                {inv.status === "accepted" && <ShieldCheck className="size-4 text-m5" />}
              </div>
            </motion.div>
          );
        })}
      </div>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}