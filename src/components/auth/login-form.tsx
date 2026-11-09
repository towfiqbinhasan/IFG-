"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AtSign, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/shared/field";
import { Logo } from "@/components/brand/logo";
import { PasswordInput } from "./password-input";
import { createClient } from "@/lib/supabase/client";
import { normalizeUsername, usernameToEmail } from "@/lib/auth";
import { brand } from "@/config/brand";

const REASONS: Record<string, string> = {
  inactive: "Your account has been deactivated. Contact the lab admin.",
  missing: "Your profile could not be found. Contact the lab admin.",
  signedout: "You have been signed out.",
};

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  useEffect(() => {
    const reason = params.get("reason");
    if (reason && REASONS[reason]) toast.info(REASONS[reason]);
  }, [params]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const u = normalizeUsername(username);
    if (!u || !password) {
      setError("Enter your username and password.");
      setShake((s) => s + 1);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email: usernameToEmail(u), password });
    if (authError) {
      setLoading(false);
      setShake((s) => s + 1);
      setError(
        /banned/i.test(authError.message)
          ? REASONS.inactive!
          : /invalid login/i.test(authError.message)
            ? "Invalid username or password."
            : authError.message,
      );
      return;
    }
    toast.success("Welcome back!");
    const next = params.get("next");
    // Server layout will redirect to /change-password if required.
    router.replace(next && next.startsWith("/") ? next : "/dashboard");
    router.refresh();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
      className="w-full max-w-sm"
    >
      <motion.div key={shake} animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.4 }}>
        <Card className="border-border/60 bg-card/80 p-6 shadow-xl backdrop-blur-xl sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <motion.div initial={{ rotate: -10, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", delay: 0.1 }}>
              <Logo size={64} />
            </motion.div>
            <h1 className="mt-4 text-xl font-semibold tracking-tight">{brand.appName}</h1>
            <p className="text-sm text-muted-foreground">Sign in to your {brand.tagline.toLowerCase()}</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Field label="Username" htmlFor="username">
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="your.username"
                  className="pl-9"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </Field>
            <Field label="Password" htmlFor="password">
              <PasswordInput
                id="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-destructive" role="alert">
                {error}
              </motion.p>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              {!loading && <LogIn />}
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Accounts are created by your lab admin. Forgot your password? Ask the admin to reset it.
          </p>
        </Card>
      </motion.div>
    </motion.div>
  );
}
