"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useReducedMotion } from "framer-motion";
import { WiseLogo } from "@/components/shared/wise-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInSchema, type SignInValues } from "@/lib/validators";
import { useAppStore } from "@/store/app-store";
import { simulateStep } from "@/services/api";
import {
  ensureSupabaseSession,
  fetchCloudCards,
  fetchCloudTransactions,
  isSupabaseConfigured,
} from "@/services/wise-cloud";
import { toast } from "sonner";
import { useState } from "react";
import { easeOut } from "@/lib/motion";

export default function LoginPage() {
  const router = useRouter();
  const signIn = useAppStore((s) => s.signIn);
  const mergeCloudData = useAppStore((s) => s.mergeCloudData);
  const [loading, setLoading] = useState(false);
  const reduce = useReducedMotion();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "raza@wise.com",
      password: "wise1234",
    },
  });

  const finishSignIn = async () => {
    if (isSupabaseConfigured()) {
      try {
        const [cards, transactions] = await Promise.all([
          fetchCloudCards(),
          fetchCloudTransactions(),
        ]);
        mergeCloudData({ cards, transactions });
      } catch (e) {
        console.warn("Cloud sync on login failed", e);
      }
    }
    signIn();
    toast.success("Signed in");
    router.replace("/home");
  };

  const onSubmit = async (values: SignInValues) => {
    setLoading(true);
    try {
      await simulateStep();
      if (isSupabaseConfigured()) {
        const session = await ensureSupabaseSession({
          email: values.email,
          password: values.password,
        });
        if (!session.ok) {
          toast.error(
            session.message ??
              "Cloud sign-in failed. Check Supabase Auth / confirm email."
          );
          // Still allow local demo sign-in
        }
      }
      await finishSignIn();
    } finally {
      setLoading(false);
    }
  };

  const continueAsGuest = async () => {
    setLoading(true);
    try {
      await simulateStep();
      if (isSupabaseConfigured()) {
        const session = await ensureSupabaseSession();
        if (!session.ok) {
          toast.message("Continuing offline", {
            description:
              session.message ??
              "Enable Anonymous sign-ins or create a user in Supabase.",
          });
        }
      }
      await finishSignIn();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-black px-5 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOut }}
      >
        <WiseLogo href={null} size="lg" />
        <h1 className="mt-10 text-3xl font-bold tracking-tight text-white">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-wise-body">
          Sign in to your Wise account.
        </p>
      </motion.div>

      <motion.form
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.4, ease: easeOut }}
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 space-y-4"
        noValidate
      >
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            className="mt-1.5"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email ? (
            <p className="mt-1 text-sm text-wise-negative" role="alert">
              {errors.email.message}
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            className="mt-1.5"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password ? (
            <p className="mt-1 text-sm text-wise-negative" role="alert">
              {errors.password.message}
            </p>
          ) : null}
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </motion.form>

      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.35 }}
      >
        <Button
          variant="secondary"
          className="mt-3 w-full"
          onClick={continueAsGuest}
          disabled={loading}
        >
          Continue
        </Button>

        <p className="mt-6 text-center text-sm text-wise-body">
          New here?{" "}
          <Link
            href="/signup"
            className="font-semibold text-wise-forest underline"
          >
            Create account
          </Link>
        </p>
        <p className="mt-auto pt-10 text-center text-xs text-wise-mute">
          Money without borders
        </p>
      </motion.div>
    </div>
  );
}
