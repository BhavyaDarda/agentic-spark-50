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
