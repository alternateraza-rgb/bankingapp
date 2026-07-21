"use client";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  hideNav?: boolean;
  className?: string;
}

export function AppShell({ children, hideNav, className }: AppShellProps) {
  return (
    <div className="min-h-dvh w-full max-w-[100vw] overflow-x-hidden bg-black">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl">
        {!hideNav ? <DesktopSidebar /> : null}
        <div
          className={cn(
            "relative mx-auto flex min-h-dvh w-full max-w-full flex-1 flex-col overflow-x-hidden bg-black app-safe-top sm:max-w-[430px] lg:max-w-md lg:border-x lg:border-white/5",
            !hideNav && "pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0",
            className
          )}
        >
          {children}
        </div>
      </div>
      {!hideNav ? <BottomNavigation /> : null}
    </div>
  );
}
