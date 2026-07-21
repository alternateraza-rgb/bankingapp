"use client";

import { useState } from "react";
import { Check, Copy, QrCode } from "lucide-react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";

export default function ReceivePage() {
  const { profile, loading } = useAuth();
  const [copied, setCopied] = useState(false);
  const handle = profile?.handle ? `@${profile.handle}` : null;

  const copy = async () => {
    if (!handle) return;
    await navigator.clipboard.writeText(handle);
    setCopied(true);
    toast.success("Handle copied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Receive" showBack backHref="/home" />
      <main className="flex flex-1 flex-col items-center px-5 pb-10 pt-4">
        <p className="text-center text-sm text-wise-mute">
          Share your Niro handle so friends can send you money instantly.
        </p>

        <div className="mt-8 flex h-48 w-48 flex-col items-center justify-center rounded-[28px] border border-dashed border-white/20 bg-wise-surface">
          <QrCode className="h-16 w-16 text-wise-mute" aria-hidden />
          <p className="mt-3 px-4 text-center text-xs text-wise-mute-2">
            QR placeholder — scan coming soon
          </p>
        </div>

        <div className="mt-8 w-full rounded-[24px] bg-wise-surface px-5 py-5 text-center">
          <p className="text-xs uppercase tracking-wider text-wise-mute">
            Your handle
          </p>
          {loading ? (
            <p className="mt-2 text-2xl font-semibold text-wise-mute">…</p>
          ) : handle ? (
            <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
              {handle}
            </p>
          ) : (
            <p className="mt-2 text-sm text-wise-mute">No handle on profile</p>
          )}
          {profile?.full_name ? (
            <p className="mt-1 text-sm text-wise-mute">{profile.full_name}</p>
          ) : null}
        </div>

        <Button
          className="mt-6 w-full"
          onClick={copy}
          disabled={!handle}
          variant="secondary"
        >
          {copied ? (
            <Check className="h-4 w-4" aria-hidden />
          ) : (
            <Copy className="h-4 w-4" aria-hidden />
          )}
          {copied ? "Copied" : "Copy handle"}
        </Button>
      </main>
    </div>
  );
}
