"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { StepProgress } from "@/components/send/step-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/app-store";
import { getContacts, searchProfiles } from "@/services/niro";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STEPS = ["Recipient", "Amount", "Review", "Done"];

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

export default function SendPage() {
  const router = useRouter();
  const setSendTarget = useAppStore((s) => s.setSendTarget);
  const setTransferDraft = useAppStore((s) => s.setTransferDraft);
  const sendTarget = useAppStore((s) => s.sendTarget);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileHit[]>([]);
  const [contacts, setContacts] = useState<ProfileHit[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    void getContacts()
      .then((rows) => {
        const list = rows
          .map((r) => normalizeProfile(r.profiles))
          .filter((p): p is ProfileHit => Boolean(p));
        setContacts(list);
      })
      .catch(() => toast.error("Could not load contacts"));
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      void searchProfiles(q)
        .then((data) => setResults((data as ProfileHit[]) ?? []))
        .catch(() => toast.error("Search failed"))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const select = (p: ProfileHit) => {
    setSendTarget({
      id: p.id,
      handle: p.handle,
      fullName: p.full_name,
      initials: p.avatar_initials || p.handle.slice(0, 2).toUpperCase(),
    });
    setTransferDraft({ recipientId: p.id });
    router.push("/send/amount");
  };

  const list = query.trim().length >= 2 ? results : contacts;

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Send" showBack backHref="/home" />
      <StepProgress steps={STEPS} current={0} className="mb-4" />
      <main className="flex flex-1 flex-col px-4 pb-28">
        <div className="relative mb-4">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wise-mute"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search @handle or name"
            className="pl-10"
            aria-label="Search Niro users"
          />
        </div>

        <p className="mb-2 text-sm font-medium text-wise-mute">
          {query.trim().length >= 2
            ? searching
              ? "Searching…"
              : "Results"
            : "Contacts"}
        </p>

        <div className="space-y-2" role="listbox" aria-label="People">
          {list.map((p) => {
            const selected = sendTarget?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => select(p)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[20px] bg-wise-surface px-4 py-3.5 text-left transition-colors hover:bg-wise-surface-2",
                  selected && "ring-2 ring-wise-green"
                )}
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
              </button>
            );
          })}
          {list.length === 0 ? (
            <p className="py-10 text-center text-sm text-wise-mute">
              {query.trim().length >= 2
                ? "No users found"
                : "No contacts yet — search by @handle"}
            </p>
          ) : null}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-white/5 bg-black/90 px-4 pt-3 backdrop-blur-md safe-pb lg:static lg:max-w-none lg:border-0 lg:bg-transparent lg:px-4 lg:pb-6">
        <Button
          className="w-full"
          disabled={!sendTarget}
          onClick={() => {
            if (!sendTarget) {
              toast.error("Select someone to continue");
              return;
            }
            router.push("/send/amount");
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
