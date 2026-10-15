"use client";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { NetworkStatus } from "@/components/service/pwa";
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <NetworkStatus />
      {children}
    </ThemeProvider>
  );
}
