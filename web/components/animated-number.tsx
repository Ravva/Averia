"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "motion/react";

export function AnimatedNumber({
  value,
  digits = 2,
  suffix = "",
  className,
}: {
  value: number;
  digits?: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 90, damping: 22 });
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  useEffect(() => {
    if (inView) motionValue.set(value);
  }, [inView, value, motionValue]);

  useEffect(() => {
    return spring.on("change", (v) => {
      if (ref.current) {
        ref.current.textContent =
          v.toLocaleString("ru-RU", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
          }) + suffix;
      }
    });
  }, [spring, digits, suffix]);

  return (
    <span ref={ref} className={className}>
      {value.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits }) + suffix}
    </span>
  );
}