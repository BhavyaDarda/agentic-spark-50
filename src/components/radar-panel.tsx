import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRadar, setRadar } from "@/lib/radar.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { toast } from "sonner";

type Cadence = "off" | "weekly" | "monthly";

export function RadarPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const radar = useQuery({
    queryKey: ["radar", projectId],
    queryFn: () => getRadar({ data: { projectId } }),
  });
  const save = useMutation({
    mutationFn: (cadence: Cadence) => setRadar({ data: { projectId, cadence } }),
    onSuccess: (_r, cadence) => {
      toast.success(cadence === "off" ? "Monitoring stopped" : `Monitoring ${cadence}`);
      qc.invalidateQueries({ queryKey: ["radar", projectId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mon = radar.data?.monitor;
  const current: Cadence = mon ? (mon.cadence as Cadence) : "off";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Radar · recurring monitor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Monitor cadence">
          {(["off", "weekly", "monthly"] as const).map((c) => (
            <Button
              key={c}
              size="sm"
              variant={current === c ? "default" : "outline"}
              aria-pressed={current === c}
              disabled={save.isPending || radar.isLoading}
              onClick={() => save.mutate(c)}
            >
              {c === "off" ? "Off" : c === "weekly" ? "Monitor weekly" : "Monitor monthly"}
            </Button>
          ))}
        </div>
        {mon && (
          <p className="text-muted-foreground">
            {mon.is_active
              ? `Next run ${new Date(mon.next_run_at).toLocaleString()}.`
              : "Paused after repeated failures. Pick a cadence again to resume."}
            {mon.last_run_at && ` Last run ${new Date(mon.last_run_at).toLocaleString()}.`}
            {mon.last_error && ` Last error: ${mon.last_error}`}
          </p>
        )}
        {(radar.data?.diffs.length ?? 0) > 0 ? (
          <div className="space-y-3">
            {radar.data!.diffs.map((d) => (
              <div key={d.id} className="border-2 border-foreground p-3">
                <div className="mb-1 font-mono text-xs text-muted-foreground">
                  What changed · {new Date(d.created_at).toLocaleString()}
                </div>
                <Markdown>{d.brief}</Markdown>
              </div>
            ))}
          </div>
        ) : (
          mon && <p className="text-muted-foreground">No scheduled runs yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
