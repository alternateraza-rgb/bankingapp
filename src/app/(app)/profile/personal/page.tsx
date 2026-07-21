"use client";

import { MobileHeader } from "@/components/layout/mobile-header";
import { useAuth } from "@/components/auth-provider";

export default function PersonalProfilePage() {
  const { profile, user, loading } = useAuth();

  const rows = [
    { label: "Full name", value: profile?.full_name },
    { label: "Handle", value: profile?.handle ? `@${profile.handle}` : null },
    { label: "Email", value: profile?.email ?? user?.email },
    { label: "Primary currency", value: profile?.primary_currency },
    { label: "User ID", value: profile?.id ?? user?.id },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Personal information" showBack backHref="/profile" />
      <main className="flex flex-1 flex-col px-4 pb-8">
        {loading ? (
          <p className="py-10 text-center text-sm text-wise-mute">Loading…</p>
        ) : (
          <div className="rounded-[24px] bg-wise-surface p-2">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-start justify-between gap-3 px-3 py-3"
              >
                <span className="text-sm text-wise-mute">{row.label}</span>
                <span className="max-w-[60%] break-all text-right text-sm font-semibold text-white">
                  {row.value || "—"}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-center text-xs text-wise-mute">
          Profile edits from the app UI are coming soon.
        </p>
      </main>
    </div>
  );
}
