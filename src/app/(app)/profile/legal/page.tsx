"use client";

import { MobileHeader } from "@/components/layout/mobile-header";
import { PageTransition } from "@/lib/motion";

export default function LegalPage() {
  return (
    <PageTransition>
      <MobileHeader title="Legal" showBack backHref="/profile" />
      <main className="space-y-4 px-4 pb-8 text-sm text-wise-body">
        <section className="rounded-[24px] bg-wise-surface p-5">
          <h2 className="font-bold text-white">Terms of use</h2>
          <p className="mt-2 leading-relaxed">
            By using Wise you agree to our customer agreement and the laws that
            apply where you live. Keep your login details private and tell us
            right away if you notice anything unusual on your account.
          </p>
        </section>
        <section className="rounded-[24px] bg-wise-surface p-5">
          <h2 className="font-bold text-white">Privacy</h2>
          <p className="mt-2 leading-relaxed">
            We collect the information we need to run your account, prevent
            fraud, and meet regulatory requirements. You can manage notification
            preferences anytime in Settings.
          </p>
        </section>
        <section className="rounded-[24px] bg-wise-surface p-5">
          <h2 className="font-bold text-white">Licenses</h2>
          <p className="mt-2 leading-relaxed">
            Wise Payments Limited and its affiliates are authorized to provide
            payment services in the regions where we operate. Card services are
            provided with our banking partners.
          </p>
        </section>
      </main>
    </PageTransition>
  );
}
