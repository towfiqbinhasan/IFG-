import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ChartCard({
  title,
  description,
  children,
  className,
  empty,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** When true, a quiet "no data yet" message replaces the chart. */
  empty?: boolean;
}) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1">
        {empty ? (
          <div className="flex h-56 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            No data yet
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
