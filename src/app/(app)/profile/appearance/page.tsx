"use client";

import { MobileHeader } from "@/components/layout/mobile-header";

export default function AppearancePage() {
  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Appearance" showBack backHref="/profile" />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-8">
        <div className="rounded-[24px] bg-wise-surface px-5 py-6">
          <p className="text-lg font-semibold text-white">Dark</p>
          <p className="mt-2 text-sm text-wise-mute">
            Niro uses a dark black-and-white theme only. Light mode is not
            available in this release.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="h-16 flex-1 rounded-[16px] border-2 border-wise-green bg-black" />
          <div className="h-16 flex-1 rounded-[16px] border border-white/10 bg-[#1a1a1a] opacity-40" />
          <div className="h-16 flex-1 rounded-[16px] border border-white/10 bg-white opacity-30" />
        </div>
        <p className="text-center text-xs text-wise-mute">Selected: Dark</p>
      </main>
    </div>
  );
}
