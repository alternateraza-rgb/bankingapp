"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageTransition } from "@/lib/motion";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
