"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { getContacts } from "@/services/niro";
import { toast } from "sonner";
import Link from "next/link";

type ProfileHit = {
  id: string;
  handle: string;
  full_name: string;
  avatar_initials: string;
};

function normalizeProfile(
  p: ProfileHit | ProfileHit[] | null | undefined
): ProfileHit | null {
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

export default function RecipientsPage() {
  const router = useRouter();
  const setSendTarget = useAppStore((s) => s.setSendTarget);
  const setTransferDraft = useAppStore((s) => s.setTransferDraft);
  const [contacts, setContacts] = useState<ProfileHit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getContacts()
      .then((rows) => {
        const list = rows
          .map((r) => normalizeProfile(r.profiles))
          .filter((p): p is ProfileHit => Boolean(p));
        setContacts(list);
      })
      .catch(() => toast.error("Could not load contacts"))
      .finally(() => setLoading(false));
  }, []);

  const sendTo = (p: ProfileHit) => {
    setSendTarget({
      id: p.id,
      handle: p.handle,
      fullName: p.full_name,
      initials: p.avatar_initials || p.handle.slice(0, 2).toUpperCase(),
    });
    setTransferDraft({ recipientId: p.id });
    router.push("/send/amount");
  };

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Recipients" />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-8">
        <Button asChild variant="secondary" className="w-full">
          <Link href="/send">Search Niro users</Link>
        </Button>

        {loading ? (
          <p className="py-10 text-center text-sm text-wise-mute">Loading…</p>
        ) : contacts.length === 0 ? (
          <p className="py-10 text-center text-sm text-wise-mute">
            No contacts yet. Send to someone to start building your list.
          </p>
        ) : (
          contacts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => sendTo(p)}
              className="flex w-full items-center gap-3 rounded-[20px] bg-wise-surface px-4 py-3.5 text-left hover:bg-wise-surface-2"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-wise-surface-2 text-sm font-bold text-white">
                {p.avatar_initials || p.handle.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-white">
                  {p.full_name || p.handle}
                </span>
                <span className="block truncate text-sm text-wise-mute">
                  @{p.handle}
                </span>
              </span>
              <span className="text-sm font-semibold text-wise-green">Send</span>
            </button>
          ))
        )}
      </main>
    </div>
  );
}
