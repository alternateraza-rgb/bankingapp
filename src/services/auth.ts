"use client";

import { tryCreateClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { User } from "@supabase/supabase-js";

export { isSupabaseConfigured };

export type AuthResult =
  | { ok: true; user: User; sessionReady: true }
  | {
      ok: false;
      reason: "not_configured" | "invalid_credentials" | "confirm_email" | "auth_failed";
      message: string;
    };

function requireClient() {
  if (!isSupabaseConfigured()) {
    return {
      ok: false as const,
      reason: "not_configured" as const,
      message:
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }
  const supabase = tryCreateClient();
  if (!supabase) {
    return {
      ok: false as const,
      reason: "not_configured" as const,
      message: "Could not create Supabase client.",
    };
  }
  return { ok: true as const, supabase };
}

/** Sign in only — never creates an account. */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const client = requireClient();
  if (!client.ok) return client;

  const { data, error } = await client.supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.user || !data.session) {
    return {
      ok: false,
      reason: "invalid_credentials",
      message: error?.message ?? "Invalid email or password.",
    };
  }

  return { ok: true, user: data.user, sessionReady: true };
}

/** Sign up only — does not fall back to sign-in inventively. */
export async function signUpWithEmail(input: {
  email: string;
  password: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
}): Promise<AuthResult> {
  const client = requireClient();
  if (!client.ok) return client;

  const { data, error } = await client.supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        first_name: input.firstName ?? "",
        last_name: input.lastName ?? "",
      },
    },
  });

  if (error) {
    return {
      ok: false,
      reason: "auth_failed",
      message: error.message,
    };
  }

  if (!data.user) {
    return {
      ok: false,
      reason: "auth_failed",
      message: "Sign up failed.",
    };
  }

  // Email confirmation required — user exists but no session yet
  if (!data.session) {
    return {
      ok: false,
      reason: "confirm_email",
      message:
        "Account created. Confirm your email, then sign in. (Or disable Confirm email in Supabase Auth settings for demos.)",
    };
  }

  return { ok: true, user: data.user, sessionReady: true };
}

export async function getSupabaseUser() {
  const supabase = tryCreateClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function getSupabaseSession() {
  const supabase = tryCreateClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function signOutSupabase() {
  const supabase = tryCreateClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export function profileFromAuthUser(user: User) {
  const meta = user.user_metadata ?? {};
  const first =
    (meta.first_name as string | undefined)?.trim() ||
    (meta.full_name as string | undefined)?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "User";
  const last =
    (meta.last_name as string | undefined)?.trim() ||
    (meta.full_name as string | undefined)?.split(" ").slice(1).join(" ") ||
    "";
  const initials = `${first[0] ?? "U"}${last[0] ?? ""}`.toUpperCase();
  return {
    id: user.id,
    firstName: first,
    lastName: last,
    email: user.email ?? "",
    avatarInitials: initials,
  };
}
