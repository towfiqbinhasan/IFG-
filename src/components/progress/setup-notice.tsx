import { Database } from "lucide-react";

/** Shown when migration 003 hasn't been run yet, instead of crashing the page. */
export function ProgressSetupNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
      <Database className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        <strong>Progress tracking isn&apos;t set up yet.</strong> An admin needs to run{" "}
        <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">supabase/migrations/003_preparations.sql</code> once in the
        Supabase SQL Editor.
      </p>
    </div>
  );
}
