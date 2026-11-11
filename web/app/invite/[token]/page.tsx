"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { CheckCircle2, GraduationCap, Link2Off, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { state, hydrated, acceptInvite } = useStore();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const invite = useMemo(
    () => state.invites.find((i) => i.token === params.token),
    [state.invites, params.token],
  );
  const inviter = state.users.find((u) => u.id === invite?.invitedBy);
  const classNames = state.classes
    .filter((c) => invite?.classIds.includes(c.id) && !c.deletedAt)
    .map((c) => c.name);

  if (!hydrated) return null;

  const invalid =
    !invite ||
    invite.status !== "pending" ||
    new Date(invite.expiresAt).getTime() < Date.now();

  const invalidReason = !invite
    ? "Ссылка не найдена. Возможно, она была скопирована не полностью."
    : invite.status === "revoked"
      ? "Ссылка отозвана администратором."
      : invite.status === "accepted"
        ? "Ссылка уже использована. Войдите с вашим email и паролем."
        : "Срок действия ссылки истёк. Попросите администратора прислать новую.";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Укажите имя и фамилию.");
      return;
    }
    if (password.length < 6) {
      setError("Пароль — минимум 6 символов.");
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают.");
      return;
    }
    const res = acceptInvite(params.token, name, password);
    if (!res.ok) {
      setError(res.error ?? "Не удалось принять приглашение.");
      return;
    }
    toast.success("Добро пожаловать! Аккаунт создан.");
    router.replace("/dashboard");
  };

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="size-6" />
          </span>
          <span className="font-display text-2xl font-bold">Averia</span>
        </div>

        <div className="rounded-lg border border-rule2 bg-paper2 p-8 shadow-sm">
          {invalid ? (
            <div className="space-y-4 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-m2/10 text-m2">
                <Link2Off className="size-6" />
              </span>
              <h1 className="font-display text-xl font-semibold">Ссылка недействительна</h1>
              <p className="text-sm leading-relaxed text-ink2">{invalidReason}</p>
              <Button variant="outline" className="w-full" onClick={() => router.replace("/login")}>
                Перейти ко входу
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2 text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-m5/10 text-m5">
                  <ShieldCheck className="size-6" />
                </span>
                <h1 className="font-display text-xl font-semibold">Приглашение для учителя</h1>
                <p className="text-sm text-ink2">
                  {inviter?.name ?? "Администратор"} приглашает вас в Averia
                  {classNames.length > 0 && (
                    <>
                      {" "}для работы с классами{" "}
                      <span className="inline-flex gap-1 align-middle">
                        {classNames.map((n) => (
                          <Badge key={n} variant="secondary">{n}</Badge>
                        ))}
                      </span>
                    </>
                  )}
                  .
                </p>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={invite.email} disabled className="bg-band" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Имя и фамилия</Label>
                  <Input
                    id="name"
                    required
                    placeholder="Имя Фамилия"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError("");
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pw">Пароль</Label>
                    <Input
                      id="pw"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pw2">Ещё раз</Label>
                    <Input
                      id="pw2"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => {
                        setConfirm(e.target.value);
                        setError("");
                      }}
                    />
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
                <Button type="submit" className="w-full">
                  <CheckCircle2 /> Создать аккаунт
                </Button>
                <p className="text-center text-[11px] leading-relaxed text-ink2">
                  Ссылка действует до{" "}
                  {new Date(invite.expiresAt).toLocaleDateString("ru-RU")} и может быть
                  использована один раз.
                </p>
              </form>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}