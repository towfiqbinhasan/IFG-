import { Shield } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { AdminNav } from "@/components/admin/admin-nav";

/** Every /admin page requires the admin role (also enforced by RLS + API checks). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Admin panel</h1>
      </div>
      <AdminNav />
      {children}
    </div>
  );
}
