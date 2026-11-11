"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
import {
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  School,
  Sun,
  Upload,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard, admin: false },
  { href: "/upload", label: "Загрузка", icon: Upload, admin: false },
  { href: "/classes", label: "Классы", icon: School, admin: true },
  { href: "/teachers", label: "Учителя", icon: Users, admin: true },
];

const SIDEBAR_KEY = "averia-sidebar-collapsed";

function NavLinks({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { currentUser } = useStore();
  return (
    <nav className={cn("flex flex-col gap-1", collapsed ? "items-center px-2" : "px-3")}>
      {NAV.filter((item) => !item.admin || currentUser?.role === "admin").map(
        (item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              className={cn(
                "relative flex items-center gap-3 rounded-md text-sm font-medium transition-colors",
                collapsed ? "size-10 justify-center" : "px-3 py-2",
                active ? "text-ink" : "text-ink2 hover:text-ink hover:bg-band",
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-md bg-band border border-rule2"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <item.icon className="relative size-4 shrink-0" />
              {!collapsed && <span className="relative">{item.label}</span>}
            </Link>
          );
        },
      )}
    </nav>
  );
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className={cn("flex items-center gap-3 py-5", collapsed ? "justify-center px-2" : "px-5")}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <GraduationCap className="size-5" />
      </span>
      {!collapsed && (
        <span className="leading-tight">
          <span className="block font-display text-lg font-bold tracking-tight">Averia</span>
          <span className="block text-[11px] text-ink2">анализ успеваемости</span>
        </span>
      )}
    </Link>
  );
}

function UserBlock({ collapsed = false }: { collapsed?: boolean }) {
  const { currentUser, logout, resetDemo } = useStore();
  const router = useRouter();
  if (!currentUser) return null;
  return (
    <div className={cn("mt-auto pb-4", collapsed ? "px-2" : "px-3")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            title={collapsed ? currentUser.name : undefined}
            className={cn(
              "flex w-full cursor-pointer items-center gap-3 rounded-md border border-rule2 bg-paper2 text-left transition-colors hover:border-rule",
              collapsed ? "justify-center p-1.5" : "px-3 py-2.5",
            )}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {currentUser.name.slice(0, 1)}
            </span>
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-sm font-medium">{currentUser.name}</span>
                  <span className="block truncate text-[11px] text-ink2">{currentUser.email}</span>
                </span>
                {currentUser.role === "admin" && (
                  <Badge variant="secondary" className="shrink-0">админ</Badge>
                )}
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-60">
          <DropdownMenuLabel>{currentUser.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              resetDemo();
              toast.success("Демо-данные восстановлены");
            }}
          >
            <RotateCcw /> Сбросить демо-данные
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            <LogOut /> Выйти
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="text-ink2 hover:text-ink"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="block"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { currentUser } = useStore();

  useEffect(() => {
    if (localStorage.getItem(SIDEBAR_KEY) === "1") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <div className="relative z-10 flex min-h-screen">
      {/* desktop sidebar — collapsible to a narrow rail */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-rule2 bg-paper transition-[width] duration-300 ease-in-out lg:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <Brand collapsed={collapsed} />
        <NavLinks collapsed={collapsed} />
        <div className="mt-auto">
          <div
            className={cn(
              "flex items-center pb-2",
              collapsed ? "flex-col gap-1 px-2" : "justify-between px-5",
            )}
          >
            {!collapsed && <span className="micro-label">Тема</span>}
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
              title={collapsed ? "Развернуть меню" : "Свернуть меню"}
              onClick={toggleCollapsed}
              className="text-ink2 hover:text-ink"
            >
              {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </Button>
          </div>
          <UserBlock collapsed={collapsed} />
        </div>
      </aside>

      {/* mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-rule2 bg-paper px-4 lg:hidden">
        <Button variant="ghost" size="icon" aria-label="Меню" onClick={() => setMobileOpen(true)}>
          <Menu className="size-5" />
        </Button>
        <span className="font-display text-base font-bold">Averia</span>
        <ThemeToggle />
      </div>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-[var(--scrim)] lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-paper lg:hidden"
            >
              <div className="flex items-center justify-between pr-3">
                <Brand />
                <Button variant="ghost" size="icon" aria-label="Закрыть" onClick={() => setMobileOpen(false)}>
                  <X className="size-5" />
                </Button>
              </div>
              <NavLinks onNavigate={() => setMobileOpen(false)} />
              <div className="mt-auto">
                <UserBlock />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main
        className={cn(
          "min-w-0 flex-1 px-4 pt-20 pb-16 transition-[margin] duration-300 ease-in-out sm:px-6 lg:px-10 lg:pt-8",
          collapsed ? "lg:ml-16" : "lg:ml-60",
        )}
      >
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}