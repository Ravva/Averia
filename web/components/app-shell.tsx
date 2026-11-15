"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
import {
  Orbit,
  LayoutDashboard,
  Palette,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  School,
  Sun,
  Upload,
  Users,
  X,
} from "lucide-react";
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
  { href: "/design-system", label: "Дизайн-система", icon: Palette, admin: false },
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
                "relative flex items-center gap-3 rounded-xl text-sm font-semibold transition-colors",
                collapsed ? "size-11 justify-center" : "px-4 py-3",
                active ? "text-ink" : "text-ink2 hover:text-ink hover:bg-paper2/60",
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl bg-paper2/80 shadow-[0_8px_24px_rgba(16,46,89,.12)] ring-1 ring-[var(--glass-edge)]"
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
      className={cn("flex items-center gap-3 pt-9 pb-11", collapsed ? "justify-center px-2" : "px-6")}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--scene)] text-white shadow-[0_12px_28px_rgba(25,77,150,.28)] ring-1 ring-white/25">
        <Orbit className="size-5" />
      </span>
      {!collapsed && (
        <span className="leading-tight">
          <span className="block text-xl font-bold tracking-tight">Averia<span className="text-brand">.</span></span>
          <span className="block text-xs text-ink2">данные об успеваемости</span>
        </span>
      )}
    </Link>
  );
}

function UserBlock({ collapsed = false }: { collapsed?: boolean }) {
  const { currentUser, logout } = useStore();
  const router = useRouter();
  if (!currentUser) return null;
  return (
    <div className={cn("mt-auto pb-4", collapsed ? "px-2" : "px-3")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            title={collapsed ? currentUser.name : undefined}
            className={cn(
              "flex w-full cursor-pointer items-center gap-3 rounded-xl border border-[var(--glass-edge)] bg-[var(--glass)] text-left shadow-[var(--shadow-1)] transition-colors hover:bg-paper2",
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
            onClick={async () => {
              await logout();
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
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-[var(--glass-edge)] bg-[var(--glass)] shadow-[8px_0_48px_rgba(20,48,89,.08)] backdrop-blur-2xl transition-[width] duration-300 ease-in-out lg:flex",
          collapsed ? "w-20" : "w-64",
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
      <div className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--glass-edge)] bg-[var(--glass)] px-4 backdrop-blur-2xl lg:hidden">
        <Button variant="ghost" size="icon" aria-label="Меню" onClick={() => setMobileOpen(true)}>
          <Menu className="size-5" />
        </Button>
        <span className="flex items-center gap-2 text-base font-bold"><Orbit className="size-5 text-brand" /> Averia</span>
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
          "min-w-0 flex-1 px-4 pt-24 pb-20 transition-[margin] duration-300 ease-in-out sm:px-7 lg:px-12 lg:pt-12",
          collapsed ? "lg:ml-20" : "lg:ml-64",
        )}
      >
        <div className="mx-auto max-w-[1480px]">{children}</div>
      </main>
    </div>
  );
}