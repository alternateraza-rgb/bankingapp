"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useReducedMotion } from "framer-motion";
import { NiroLogo } from "@/components/shared/wise-logo";
import { AuthHeading, AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInSchema, type SignInValues } from "@/lib/validators";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { easeOut } from "@/lib/motion";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const reduce = useReducedMotion();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: SignInValues) => {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
    router.replace("/home");
    router.refresh();
  };

  return (
    <AuthShell>
      <NiroLogo href={null} size="md" animate />
      <AuthHeading
        title="Welcome back"
        subtitle="Sign in to continue to your Niro account."
      />

      <motion.form
        initial={reduce ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.45, ease: easeOut }}
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 flex flex-1 flex-col"
        noValidate
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              className="mt-2"
              {...register("email")}
            />
            {errors.email ? (
              <p className="mt-1.5 text-sm text-wise-negative" role="alert">
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
              className="mt-2"
              {...register("password")}
            />
            {errors.password ? (
              <p className="mt-1.5 text-sm text-wise-negative" role="alert">
                {errors.password.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-auto space-y-4 pt-10">
          <Button
            type="submit"
            className="h-14 w-full text-[15px]"
            size="lg"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-wise-mute">
            New to Niro?{" "}
            <Link
              href="/signup"
              className="font-semibold text-white underline-offset-4 hover:underline"
            >
              Create account
            </Link>
          </p>
          <p className="text-center text-[11px] tracking-wide text-wise-mute-2">
            Simulated banking · Demo balances only
          </p>
        </div>
      </motion.form>
    </AuthShell>
  );
}
