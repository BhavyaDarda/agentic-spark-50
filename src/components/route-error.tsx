import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

/** Brutalist per-route failure panel so one bad query never blanks the app shell. */
export function RouteError({ error }: { error?: Error }) {
  return (
    <div className="mx-auto max-w-lg border-[3px] border-border bg-card p-8 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-primary" />
      <h2 className="mt-4 text-lg font-semibold">This screen didn't load</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {error?.message || "Something went wrong on our side."}
      </p>
      <Button className="mt-5" onClick={() => window.location.reload()}>
        Try again
      </Button>
    </div>
  );
}

/** Blocky placeholder cards used while a list query is in flight. */
export function ListSkeleton({
  count = 3,
  lines = 3,
  columns = 1,
}: {
  count?: number;
  lines?: number;
  columns?: 1 | 2 | 3;
}) {
  const grid =
    columns === 3
      ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      : columns === 2
        ? "grid gap-4 md:grid-cols-2"
        : "grid gap-4";
  return (
    <div className={grid} aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border-[3px] border-border bg-card p-5">
          <div className="brut-pulse h-4 w-1/2 bg-muted" />
          {Array.from({ length: lines }).map((__, j) => (
            <div
              key={j}
              className="brut-pulse mt-3 h-3 bg-muted"
              style={{ width: `${88 - j * 16}%`, animationDelay: `${(i + j) * 90}ms` }}
            />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

/** Shared empty state: what the screen is for plus the single action that fills it. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-[3px] border-border bg-card p-10 text-center">
      {icon ? (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border-[3px] border-border bg-secondary text-secondary-foreground">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold uppercase tracking-tight">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
