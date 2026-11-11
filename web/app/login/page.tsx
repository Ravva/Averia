"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { GraduationCap, KeyRound, Mail } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const { login, state } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, password)) {
      router.replace("/dashboard");
    } else {
      setError("Неверный email или пароль.");
    }
  };

  const demoLogin = (demoEmail: string, demoPassword: string) => {
    if (login(demoEmail, demoPassword)) {
      toast.success("Вход выполнен");
      router.replace("/dashboard");
    }
  };

  const admin = state.users.find((u) => u.role === "admin");
  const teacher = state.users.find((u) => u.role === "teacher");

  return (
    <div className="relative z-10 flex min-h-screen">
      {/* brand panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 31px, currentColor 31px, currentColor 32px)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-paper2/15">
            <GraduationCap className="size-6" />
          </span>
          <span className="font-display text-2xl font-bold">Averia</span>
        </div>
        <div className="relative space-y-6">
          <h1 className="font-display text-4xl leading-tight font-bold">
            Успеваемость класса —<br />на одном экране
          </h1>
          <p className="max-w-md text-sm leading-relaxed opacity-85">
            Загрузите экспорт средних баллов, получите текущую аналитику
            и динамику к предыдущему срезу. Для классных руководителей
            и администрации школы.
          </p>
          <div className="flex gap-2">
            {(["bg-m5", "bg-m4", "bg-m3", "bg-m2"] as const).map((cls, i) => (
              <motion.span
                key={cls}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.3 + i * 0.12, duration: 0.5 }}
                className={`h-2 w-16 origin-left rounded-sm ${cls}`}
              />
            ))}
          </div>
        </div>
        <p className="relative text-xs opacity-70">
          Персональные данные учеников · только для внутреннего использования школы
        </p>
      </motion.div>

      {/* form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full max-w-sm space-y-6"
        >
          <div className="space-y-1 lg:hidden">
            <span className="font-display text-2xl font-bold">Averia</span>
            <p className="text-sm text-ink2">анализ успеваемости класса</p>
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-semibold">Вход для учителей</h2>
            <p className="text-sm text-ink2">
              Регистрация — по magic-link ссылке от администратора.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink2" />
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@school.ru"
                  className="pl-9"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Пароль</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink2" />
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
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
            <Button type="submit" className="w-full">Войти</Button>
          </form>

          <div className="rounded-lg border border-rule2 bg-paper2 p-4">
            <p className="micro-label mb-3">Демо-доступ</p>
            <div className="flex flex-col gap-2">
              {admin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => demoLogin(admin.email, admin.password)}
                >
                  Администратор · {admin.email}
                </Button>
              )}
              {teacher && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => demoLogin(teacher.email, teacher.password)}
                >
                  Учитель · {teacher.name}
                </Button>
              )}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-ink2">
              Прототип: пароли хранятся локально в браузере. В боевой версии —
              Appwrite Auth и magic-link сессии на сервере.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}