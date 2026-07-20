"use client";

import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-wise-surface-2">
        <WifiOff className="h-7 w-7 text-white" aria-hidden />
      </div>
      <h1 className="text-2xl font-bold text-white">You&apos;re offline</h1>
      <p className="text-sm text-wise-body">
        Core screens may still load from cache. Reconnect to refresh rates and
        continue when you&apos;re back online.
      </p>
      <Button asChild>
        <Link href="/home">Try home</Link>
      </Button>
    </div>
  );
}
