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
            "group toast group-[.toaster]:bg-paper2 group-[.toaster]:text-ink group-[.toaster]:border-rule group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg",
          description: "group-[.toast]:text-ink2",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-sm",
          cancelButton:
            "group-[.toast]:bg-band group-[.toast]:text-ink group-[.toast]:rounded-sm",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };