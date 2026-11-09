import { CheckCircle2, Circle, CircleDashed, BookOpen, PenLine, Send, XCircle, Trophy } from "lucide-react";
import { STATUS_STYLES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "To read": Circle,
  Reading: BookOpen,
  Completed: CheckCircle2,
  Planning: CircleDashed,
  Writing: PenLine,
  Submitted: Send,
  Accepted: Trophy,
  Rejected: XCircle,
};

/** Status pill with icon + label (never colour alone). */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const Icon = ICONS[status] ?? Circle;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}
