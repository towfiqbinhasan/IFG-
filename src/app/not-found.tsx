import Link from "next/link";
import { Home } from "lucide-react";
import { AuthBackdrop } from "@/components/auth/auth-backdrop";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <AuthBackdrop>
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <BrandLockup size={72} />
        <div>
          <p className="font-display text-6xl font-extrabold text-forge">404</p>
          <h1 className="mt-2 text-xl font-semibold">This page isn&apos;t in the lab</h1>
          <p className="mt-1 text-sm text-muted-foreground">It may have been moved or deleted.</p>
        </div>
        <Button asChild variant="forge" size="lg">
          <Link href="/dashboard">
            <Home /> Back to dashboard
          </Link>
        </Button>
      </div>
    </AuthBackdrop>
  );
}
