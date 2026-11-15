import type { Metadata } from "next";
import { Golos_Text, Spectral } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { StoreProvider } from "@/lib/store";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@ui-sdk/core/web.css";
import "./globals.css";

const golos = Golos_Text({
  subsets: ["cyrillic", "latin"],
  variable: "--font-golos",
  display: "swap",
});

const spectral = Spectral({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-spectral",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Averia — анализ успеваемости класса",
  description:
    "Загрузка средних баллов, текущая аналитика и динамика класса для классных руководителей.",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${golos.variable} ${spectral.variable}`}
    >
      <body className="grain antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <StoreProvider>
            <TooltipProvider delayDuration={200}>
              {children}
              <Toaster position="bottom-right" richColors={false} />
            </TooltipProvider>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}