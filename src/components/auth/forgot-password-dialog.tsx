"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AtSign, CheckCircle2, KeyRound, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/shared/field";

/**
 * "Forgot password?" flow. Logins are usernames (no real email), so instead
 * of a reset email the request goes to the lab admin, who issues a new
 * temporary password from Admin -> Users.
 */
export function ForgotPasswordDialog({ defaultUsername = "" }: { defaultUsername?: string }) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(defaultUsername);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onOpenChange(o: boolean) {
    setOpen(o);
    if (o) {
      setUsername((u) => u || defaultUsername);
      setSent(false);
      setError(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // The dialog renders in a portal, but React still bubbles the submit event
    // to the surrounding login <form>; stop it so sign-in isn't triggered.
    e.stopPropagation();
    if (!username.trim()) return setError("Enter your username.");
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, note: note || undefined }),
    });
    const body = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setError(body.error ?? "Something went wrong. Please try again.");
    setSent(true);
    setNote("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button type="button" className="text-xs font-medium text-primary underline-offset-4 hover:underline">
          Forgot password?
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <AnimatePresence mode="wait" initial={false}>
          {sent ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-4 text-center"
            >
              <motion.span
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 14 }}
                className="rounded-full bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"
              >
                <CheckCircle2 className="h-8 w-8" />
              </motion.span>
              <DialogTitle>Request sent</DialogTitle>
              <DialogDescription className="max-w-xs">
                If <strong>@{username.trim().toLowerCase()}</strong> is a lab account, your admin has been notified. They&apos;ll
                give you a temporary password. You&apos;ll choose a new one when you sign in with it.
              </DialogDescription>
              <Button className="mt-2" onClick={() => setOpen(false)}>Back to sign in</Button>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <DialogHeader>
                <div className="mb-1 w-fit rounded-xl bg-forge p-2.5 text-white shadow-sm shadow-sky-500/30">
                  <KeyRound className="h-5 w-5" />
                </div>
                <DialogTitle>Forgot your password?</DialogTitle>
                <DialogDescription>
                  Send a reset request to your lab admin. They&apos;ll set a temporary password for you to sign in with.
                </DialogDescription>
              </DialogHeader>
              <Field label="Username" htmlFor="fp-username" required>
                <div className="relative">
                  <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="fp-username"
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
              <Field label="Message to admin" htmlFor="fp-note" hint="Optional, e.g. how to reach you.">
                <Textarea id="fp-note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" variant="forge" loading={loading}>
                  {!loading && <Send />} Send request
                </Button>
              </DialogFooter>
            </motion.form>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
