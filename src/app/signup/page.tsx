"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { NiroLogo } from "@/components/shared/wise-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpSchema, type SignUpValues } from "@/lib/validators";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (values: SignUpValues) => {
    setLoading(true);
    const supabase = createClient();
    const fullName = `${values.firstName} ${values.lastName}`.trim();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          handle: values.handle.toLowerCase(),
          full_name: fullName,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      toast.success("Welcome to Niro");
      router.replace("/home");
      router.refresh();
      return;
    }
    toast.success("Check your email to confirm, then sign in");
    router.push("/login");
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-black px-5 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <NiroLogo href={null} size="md" />
      <h1 className="mt-8 text-3xl font-bold text-white">Create account</h1>
      <p className="mt-2 text-sm text-wise-body">
        Join Niro — multi-currency banking, cards, and crypto.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 space-y-4"
        noValidate
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" className="mt-1.5" {...register("firstName")} />
            {errors.firstName ? (
              <p className="mt-1 text-xs text-wise-negative" role="alert">
                {errors.firstName.message}
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" className="mt-1.5" {...register("lastName")} />
            {errors.lastName ? (
              <p className="mt-1 text-xs text-wise-negative" role="alert">
                {errors.lastName.message}
              </p>
            ) : null}
          </div>
        </div>
        <div>
          <Label htmlFor="handle">Handle</Label>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-wise-mute">
              @
            </span>
            <Input
              id="handle"
              className="pl-8"
              placeholder="yourname"
              autoCapitalize="none"
              {...register("handle")}
            />
          </div>
          {errors.handle ? (
            <p className="mt-1 text-sm text-wise-negative" role="alert">
              {errors.handle.message}
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" className="mt-1.5" {...register("email")} />
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
            className="mt-1.5"
            {...register("password")}
          />
          {errors.password ? (
            <p className="mt-1 text-sm text-wise-negative" role="alert">
              {errors.password.message}
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            className="mt-1.5"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword ? (
            <p className="mt-1 text-sm text-wise-negative" role="alert">
              {errors.confirmPassword.message}
            </p>
          ) : null}
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-white underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
