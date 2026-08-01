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
import {
  isSupabaseConfigured,
  profileFromAuthUser,
  signInWithEmail,
} from "@/services/auth";
import {
  fetchCloudCards,
  fetchCloudTransactions,
} from "@/services/wise-cloud";
import { toast } from "sonner";
import { useState } from "react";
import { easeOut } from "@/lib/motion";

export default function LoginPage() {
  const router = useRouter();
  const establishSession = useAppStore((s) => s.establishSession);
  const replaceCloudData = useAppStore((s) => s.replaceCloudData);
  const [loading, setLoading] = useState(false);
  const reduce = useReducedMotion();
  const configured = isSupabaseConfigured();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: SignInValues) => {
    if (!configured) {
      toast.error("Supabase is not configured on this deployment.");
      return;
    }
    setLoading(true);
    try {
      const result = await signInWithEmail(values.email, values.password);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      const profile = profileFromAuthUser(result.user);
      establishSession({
        userId: result.user.id,
        profile,
      });

      try {
        const [cards, transactions] = await Promise.all([
          fetchCloudCards(),
          fetchCloudTransactions(),
        ]);
        replaceCloudData({ cards, transactions });
      } catch (e) {
        console.warn("Initial cloud sync failed", e);
        toast.message("Signed in", {
          description: "Could not load cloud data yet — pull to refresh in Activity.",
        });
      }

      toast.success("Signed in");
      router.replace("/home");
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
          Sign in with your Supabase account.
        </p>
      </motion.div>

      {!configured ? (
        <p className="mt-6 rounded-2xl bg-wise-surface p-4 text-sm text-wise-yellow">
          Missing{" "}
          <code className="text-white">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="text-white">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
        </p>
      ) : null}

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
        <Button type="submit" className="w-full" disabled={loading || !configured}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </motion.form>

      <p className="mt-6 text-center text-sm text-wise-body">
        New here?{" "}
        <Link
          href="/signup"
          className="font-semibold text-wise-forest underline"
        >
          Create account
        </Link>
      </p>
    </div>
  );
}
