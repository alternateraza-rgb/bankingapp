"use client";

import { MobileHeader } from "@/components/layout/mobile-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { ChevronRight, Search } from "lucide-react";

const topics = [
  {
    title: "How do transfers work?",
    body: "When you confirm, we debit your balance and send money to the recipient. Most transfers arrive within a day.",
  },
  {
    title: "Are exchange rates real?",
    body: "We use the mid-market rate and show our fee upfront so you always know what you pay.",
  },
  {
    title: "Is the card real?",
    body: "Your Niro card works online and in stores. Freeze it anytime from the Cards tab.",
  },
  {
    title: "How do I reset my data?",
    body: "Open Profile and choose Reset account data, or clear local storage from Privacy settings.",
  },
];

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const filtered = topics.filter((t) =>
    t.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Help center" showBack backHref="/profile" />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-8">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wise-mute" />
          <Input
            className="pl-10"
            placeholder="Search help"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="overflow-hidden rounded-[24px] bg-wise-surface">
          {filtered.map((topic) => (
            <button
              key={topic.title}
              type="button"
              className="flex w-full flex-col border-b border-border px-4 py-4 text-left last:border-0"
              onClick={() =>
                setOpen(open === topic.title ? null : topic.title)
              }
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold text-white">{topic.title}</span>
                <ChevronRight
                  className={`h-4 w-4 text-wise-mute transition-transform ${open === topic.title ? "rotate-90" : ""}`}
                />
              </span>
              {open === topic.title ? (
                <span className="mt-2 text-sm text-wise-body">{topic.body}</span>
              ) : null}
            </button>
          ))}
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            toast.message("Support", {
              description: "Thanks — our team will get back to you shortly.",
            })
          }
        >
          Contact support
        </Button>
      </main>
    </div>
  );
}
