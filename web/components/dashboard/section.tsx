"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({
  title,
  note,
  children,
  className,
}: {
  title: string;
  note?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mb-9", className)}>
      <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-rule pb-2">
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        {note && <span className="text-right text-xs text-ink2">{note}</span>}
      </div>
      {children}
    </section>
  );
}

export function Rise({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}