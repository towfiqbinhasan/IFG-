"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/shared/field";
import { Logo } from "@/components/brand/logo";
import { PasswordInput } from "./password-input";
import { createClient } from "@/lib/supabase/client";
import { usernameToEmail, validatePassword } from "@/lib/auth";

/**
 * Password change form.
 *  - forced=true  (first login): new + confirm only.
 *  - forced=false (settings):   current + new + confirm.
 * The server route verifies the current password and clears must_change_password.
 */
export function ChangePasswordForm({
  username,
  fullName,
  forced,
  variant = "card",
}: {
  username: string;
  fullName?: string;
  forced: boolean;
  variant?: "card" | "inline";
}) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const invalid = validatePassword(next);
    if (invalid) return setError(invalid);
    if (next !== confirm) return setError("Passwords do not match.");
    if (!forced && !current) return setError("Enter your current password.");
    if (!forced && current === next) return setError("New password must be different.");

    setLoading(true);
    const res = await fetch("/api/account/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: forced ? undefined : current, newPassword: next }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoading(false);
      return setError(body.error ?? "Could not change password.");
    }

    // Re-authenticate with the new password so the session is fresh.
    await createClient().auth.signInWithPassword({ email: usernameToEmail(username), password: next });
    toast.success("Password updated");
    setCurrent("");
    setNext("");
    setConfirm("");
    setLoading(false);
    if (forced) router.replace("/dashboard");
    router.refresh();
  }

  const form = (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {!forced && (
        <Field label="Current password" htmlFor="current">
          <PasswordInput id="current" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
      )}
      <Field label="New password" htmlFor="new" hint="At least 8 characters, with letters and numbers.">
        <PasswordInput id="new" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm">
        <PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" variant={variant === "card" ? "forge" : "default"} className={variant === "card" ? "w-full" : ""} loading={loading}>
        {!loading && <KeyRound />}
        {forced ? "Set password & continue" : "Update password"}
      </Button>
    </form>
  );

  if (variant === "inline") return form;

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
      <Card className="bg-card/80 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={60} glow />
          <div className="mt-4 flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <h1 className="text-lg font-semibold text-foreground">{forced ? "Choose a new password" : "Change password"}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {forced
              ? `Hi ${fullName || username}! For security, replace the temporary password before continuing.`
              : "Update the password for your account."}
          </p>
        </div>
        {form}
        <div className="mt-4 text-center">
          <a href="/api/auth/signout" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
            Sign out
          </a>
        </div>
      </Card>
    </motion.div>
  );
}
