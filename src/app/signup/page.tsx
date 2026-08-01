"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { WiseLogo } from "@/components/shared/wise-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpSchema, type SignUpValues } from "@/lib/validators";
import { useAppStore } from "@/store/app-store";
import {
  isSupabaseConfigured,
  profileFromAuthUser,
  signUpWithEmail,
} from "@/services/auth";
import { toast } from "sonner";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const establishSession = useAppStore((s) => s.establishSession);
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (values: SignUpValues) => {
    if (!configured) {
      toast.error("Supabase is not configured on this deployment.");
      return;
    }
    setLoading(true);
    try {
      const result = await signUpWithEmail({
        email: values.email,
        password: values.password,
        fullName: `${values.firstName} ${values.lastName}`,
        firstName: values.firstName,
        lastName: values.lastName,
      });

      if (!result.ok) {
        if (result.reason === "confirm_email") {
          toast.message("Confirm your email", {
            description: result.message,
          });
          router.push("/login");
          return;
        }
        toast.error(result.message);
        return;
      }

      const profile = profileFromAuthUser(result.user);
      establishSession({
        userId: result.user.id,
        profile: {
          ...profile,
          firstName: values.firstName,
          lastName: values.lastName,
          avatarInitials: `${values.firstName[0]}${values.lastName[0]}`.toUpperCase(),
        },
      });
      toast.success("Account created");
      router.replace("/home");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-black px-5 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <WiseLogo href={null} size="md" />
      <h1 className="mt-8 text-3xl font-bold text-white">Create account</h1>
      <p className="mt-2 text-sm text-wise-body">
        Create a real account — credentials are stored in Supabase Auth.
      </p>

      {!configured ? (
        <p className="mt-6 rounded-2xl bg-wise-surface p-4 text-sm text-wise-yellow">
          Missing{" "}
          <code className="text-white">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="text-white">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
        </p>
      ) : null}

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
        <Button type="submit" className="w-full" disabled={loading || !configured}>
          {loading ? "Creating…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-wise-forest underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
