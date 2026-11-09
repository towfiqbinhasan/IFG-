import { WifiOff } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export const dynamic = "force-static";
export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo size={56} />
      <WifiOff className="h-8 w-8 text-muted-foreground" />
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The lab tracker needs an internet connection to sync with the database. Reconnect and try again.
      </p>
    </main>
  );
}
