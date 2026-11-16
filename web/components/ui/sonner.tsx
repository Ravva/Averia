"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  const { theme = "light" } = useTheme();
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-accent group-[.toaster]:text-accent-ink group-[.toaster]:border-accent group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg",
          description: "group-[.toast]:text-accent-ink/90",
          actionButton:
            "group-[.toast]:bg-paper2 group-[.toast]:text-ink group-[.toast]:rounded-sm font-medium",
          cancelButton:
            "group-[.toast]:bg-accent-soft group-[.toast]:text-accent-ink group-[.toast]:rounded-sm",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };