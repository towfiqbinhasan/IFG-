import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";

export function UserAvatar({
  name,
  src,
  className,
}: {
  name?: string | null;
  src?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("h-9 w-9", className)}>
      {src && <AvatarImage src={src} alt={name ?? "avatar"} />}
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
