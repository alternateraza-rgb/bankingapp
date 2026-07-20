"use client";

import { MobileHeader } from "@/components/layout/mobile-header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PrivacyPage() {
  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Privacy" showBack backHref="/profile" />
      <main className="space-y-4 px-4 pb-8">
        <div className="rounded-[24px] bg-wise-surface p-5 text-sm leading-relaxed text-wise-body">
          <p>
            We protect your account data and only use it to run your Wise account.
          </p>
          <p className="mt-3">
            Never share your passcode, card CVV, or one-time codes with anyone.
          </p>
        </div>
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            localStorage.removeItem("wise-storage");
            toast.success("Local data cleared — reload to restore defaults");
          }}
        >
          Clear account data
        </Button>
      </main>
    </div>
  );
}
