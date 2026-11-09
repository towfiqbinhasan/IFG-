import { Shield, ShieldAlert } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { serverKeyProblem } from "@/lib/api";
import { AdminNav } from "@/components/admin/admin-nav";

/** Every /admin page requires the admin role (also enforced by RLS + API checks). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const keyProblem = await serverKeyProblem();
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Admin panel</h1>
      </div>
      <AdminNav />
      {keyProblem && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Creating users, resetting passwords and deleting users won&apos;t work until this is fixed.</p>
            <p className="mt-1 text-foreground/80">{keyProblem}</p>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
