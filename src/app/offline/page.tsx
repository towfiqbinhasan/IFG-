import { WifiOff } from "lucide-react";
import { AuthBackdrop } from "@/components/auth/auth-backdrop";
import { BrandLockup } from "@/components/brand/brand-lockup";

export const dynamic = "force-static";
export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <AuthBackdrop>
      <div className="flex max-w-sm flex-col items-center gap-6 text-center">
        <BrandLockup size={72} />
        <div className="flex flex-col items-center gap-2">
          <span className="rounded-full bg-muted p-3 text-muted-foreground">
            <WifiOff className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-semibold">You&apos;re offline</h1>
          <p className="text-sm text-muted-foreground">
            The lab tracker needs an internet connection to sync with the database. Reconnect and try again.
          </p>
        </div>
      </div>
    </AuthBackdrop>
  );
}
