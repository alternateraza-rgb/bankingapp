"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Check, Mail } from "lucide-react";
import { WiseLogo } from "@/components/shared/wise-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passcodeSchema, type PasscodeValues } from "@/lib/validators";
import { useAppStore } from "@/store/app-store";
import { simulateStep } from "@/services/api";
import { toast } from "sonner";

function OnboardingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get("step") ?? "welcome";
  const [step, setStep] = useState(stepParam);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const setPasscodeCreated = useAppStore((s) => s.setPasscodeCreated);
  const authUserId = useAppStore((s) => s.authUserId);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasscodeValues>({
    resolver: zodResolver(passcodeSchema),
  });

  const verifyEmail = async () => {
    if (code.join("").length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    await simulateStep();
    setLoading(false);
    setStep("passcode");
    toast.success("Email verified");
  };

  const createPasscode = async () => {
    setLoading(true);
    await simulateStep();
    setPasscodeCreated();
    setLoading(false);
    setStep("done");
  };

  const finish = async () => {
    if (!authUserId) {
      toast.error("Sign in with Supabase before continuing");
      router.replace("/login");
      return;
    }
    setLoading(true);
    await simulateStep();
    completeOnboarding();
    setLoading(false);
    router.replace("/home");
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-black px-5 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <WiseLogo href={null} />

      {step === "welcome" ? (
        <div className="mt-12 flex flex-1 flex-col">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Money that moves with you
          </h1>
          <p className="mt-4 text-base text-wise-body">
            Hold balances, convert currencies, and explore international
            transfers with Wise.
          </p>
          <div className="mt-auto space-y-3 pt-10">
            <Button
              className="w-full"
              onClick={() => {
                if (!authUserId) {
                  router.replace("/signup");
                  return;
                }
                setStep("verify");
              }}
            >
              Get started
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => router.replace(authUserId ? "/home" : "/login")}
            >
              {authUserId ? "Go to home" : "Sign in"}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "verify" ? (
        <div className="mt-10">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-wise-green">
            <Mail className="h-6 w-6 text-wise-forest" />
          </div>
          <h1 className="text-2xl font-bold">Verify your email</h1>
          <p className="mt-2 text-sm text-wise-body">
            Enter the 6-digit code we sent to your email.
          </p>
          <div className="mt-6 flex justify-between gap-2">
            {code.map((digit, i) => (
              <Input
                key={i}
                inputMode="numeric"
                maxLength={1}
                className="h-14 w-12 text-center text-xl font-bold"
                value={digit}
                aria-label={`Digit ${i + 1}`}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(-1);
                  const next = [...code];
                  next[i] = v;
                  setCode(next);
                  const el = e.target.nextElementSibling as HTMLInputElement | null;
                  if (v && el) el.focus();
                }}
              />
            ))}
          </div>
          <Button className="mt-8 w-full" onClick={verifyEmail} disabled={loading}>
            {loading ? "Verifying…" : "Verify"}
          </Button>
        </div>
      ) : null}

      {step === "passcode" ? (
        <div className="mt-10">
          <h1 className="text-2xl font-bold">Create a passcode</h1>
          <p className="mt-2 text-sm text-wise-body">
            Choose a 6-digit passcode for this device.
          </p>
          <form
            onSubmit={handleSubmit(createPasscode)}
            className="mt-6 space-y-4"
            noValidate
          >
            <div>
              <Label htmlFor="passcode">Passcode</Label>
              <Input
                id="passcode"
                inputMode="numeric"
                maxLength={6}
                className="mt-1.5 tracking-[0.4em]"
                {...register("passcode")}
              />
              {errors.passcode ? (
                <p className="mt-1 text-sm text-wise-negative" role="alert">
                  {errors.passcode.message}
                </p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="confirm">Confirm passcode</Label>
              <Input
                id="confirm"
                inputMode="numeric"
                maxLength={6}
                className="mt-1.5 tracking-[0.4em]"
                {...register("confirm")}
              />
              {errors.confirm ? (
                <p className="mt-1 text-sm text-wise-negative" role="alert">
                  {errors.confirm.message}
                </p>
              ) : null}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving…" : "Continue"}
            </Button>
          </form>
        </div>
      ) : null}

      {step === "done" ? (
        <div className="mt-16 flex flex-1 flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-wise-green"
          >
            <Check className="h-10 w-10 text-wise-forest" strokeWidth={3} />
          </motion.div>
          <h1 className="mt-6 text-2xl font-bold">You&apos;re all set</h1>
          <p className="mt-2 max-w-sm text-sm text-wise-body">
            Explore balances, send money, and manage your Wise card.
          </p>
          <Button className="mt-10 w-full" onClick={finish} disabled={loading}>
            {loading ? "Opening…" : "Go to home"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-wise-mute">
          Loading…
        </div>
      }
    >
      <OnboardingInner />
    </Suspense>
  );
}
