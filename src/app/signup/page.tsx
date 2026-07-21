"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { NiroLogo } from "@/components/shared/wise-logo";
import {
  AuthHeading,
  AuthShell,
  StepDots,
} from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpSchema, type SignUpValues } from "@/lib/validators";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { easeOut } from "@/lib/motion";

const STEPS = [
  {
    key: "name",
    title: "What’s your name?",
    subtitle: "We’ll use this on your profile and virtual cards.",
  },
  {
    key: "handle",
    title: "Choose a handle",
    subtitle: "This is how people find you for instant P2P transfers.",
  },
  {
    key: "email",
    title: "Add your email",
    subtitle: "Used to sign in and keep your account secure.",
  },
  {
    key: "password",
    title: "Create a password",
    subtitle: "At least 8 characters. Make it something only you know.",
  },
] as const;

const stepFields: Record<number, (keyof SignUpValues)[]> = {
  0: ["firstName", "lastName"],
  1: ["handle"],
  2: ["email"],
  3: ["password", "confirmPassword"],
};

const slide = {
  enter: (dir: number) => ({
    x: dir > 0 ? 28 : -28,
    opacity: 0,
    filter: "blur(4px)",
  }),
  center: { x: 0, opacity: 1, filter: "blur(0px)" },
  exit: (dir: number) => ({
    x: dir > 0 ? -24 : 24,
    opacity: 0,
    filter: "blur(4px)",
  }),
};

export default function SignupPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    mode: "onTouched",
    defaultValues: {
      firstName: "",
      lastName: "",
      handle: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleValue = watch("handle");
  const meta = STEPS[step];

  const goNext = async () => {
    const ok = await trigger(stepFields[step]);
    if (!ok) return;
    if (step < STEPS.length - 1) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (step === 0) return;
    setDirection(-1);
    setStep((s) => s - 1);
  };

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

  const primaryLabel = useMemo(() => {
    if (step < STEPS.length - 1) return "Continue";
    return loading ? "Creating…" : "Create account";
  }, [step, loading]);

  return (
    <AuthShell>
      <div className="flex items-center justify-between">
        <NiroLogo href={null} size="sm" animate />
        <StepDots total={STEPS.length} current={step} />
      </div>

      <AuthHeading title={meta.title} subtitle={meta.subtitle} />

      <form
        className="mt-8 flex flex-1 flex-col"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="relative min-h-[220px] overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={reduce ? undefined : slide}
              initial={reduce ? false : "enter"}
              animate="center"
              exit={reduce ? undefined : "exit"}
              transition={{ duration: 0.38, ease: easeOut }}
              className="space-y-4"
            >
              {step === 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      className="mt-2"
                      autoFocus
                      autoComplete="given-name"
                      {...register("firstName")}
                    />
                    {errors.firstName ? (
                      <p className="mt-1.5 text-xs text-wise-negative">
                        {errors.firstName.message}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      className="mt-2"
                      autoComplete="family-name"
                      {...register("lastName")}
                    />
                    {errors.lastName ? (
                      <p className="mt-1.5 text-xs text-wise-negative">
                        {errors.lastName.message}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {step === 1 ? (
                <div>
                  <Label htmlFor="handle">Handle</Label>
                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-wise-mute">
                      @
                    </span>
                    <Input
                      id="handle"
                      className="pl-8"
                      placeholder="yourname"
                      autoFocus
                      autoCapitalize="none"
                      autoCorrect="off"
                      {...register("handle")}
                    />
                  </div>
                  <p className="mt-2 text-xs text-wise-mute">
                    niro.app/
                    <span className="text-white/80">
                      {handleValue || "yourname"}
                    </span>
                  </p>
                  {errors.handle ? (
                    <p className="mt-1.5 text-sm text-wise-negative">
                      {errors.handle.message}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {step === 2 ? (
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    className="mt-2"
                    autoFocus
                    autoComplete="email"
                    placeholder="you@company.com"
                    {...register("email")}
                  />
                  {errors.email ? (
                    <p className="mt-1.5 text-sm text-wise-negative">
                      {errors.email.message}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {step === 3 ? (
                <>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      className="mt-2"
                      autoFocus
                      autoComplete="new-password"
                      {...register("password")}
                    />
                    {errors.password ? (
                      <p className="mt-1.5 text-sm text-wise-negative">
                        {errors.password.message}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      className="mt-2"
                      autoComplete="new-password"
                      {...register("confirmPassword")}
                    />
                    {errors.confirmPassword ? (
                      <p className="mt-1.5 text-sm text-wise-negative">
                        {errors.confirmPassword.message}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-auto space-y-3 pt-8">
          <div className="flex gap-2">
            {step > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-14 w-14 shrink-0 px-0"
                onClick={goBack}
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            ) : null}
            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                size="lg"
                className="h-14 flex-1 gap-2 text-[15px]"
                onClick={() => void goNext()}
              >
                {primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="lg"
                className="h-14 flex-1 gap-2 text-[15px]"
                disabled={loading}
              >
                {loading ? primaryLabel : (
                  <>
                    {primaryLabel}
                    <Check className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
          <p className="text-center text-sm text-wise-mute">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-white underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </AuthShell>
  );
}
