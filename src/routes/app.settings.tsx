import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getCurrentWorkspace, renameWorkspace } from "@/lib/workspace.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings · Marketing Agent" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const ws = useQuery({ queryKey: ["current-workspace"], queryFn: () => getCurrentWorkspace() });
  const qc = useQueryClient();
  const [name, setName] = useState("");
  useEffect(() => {
    if (ws.data?.workspace?.name) setName(ws.data.workspace.name);
  }, [ws.data]);

  const save = useMutation({
    mutationFn: async () =>
      renameWorkspace({ data: { workspaceId: ws.data!.workspace.id, name } }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["current-workspace"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Workspace, billing, and account.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Plan:{" "}
              <span className="font-mono uppercase text-primary">
                {ws.data?.workspace?.plan ?? "free"}
              </span>
            </div>
            <Button
              onClick={() => save.mutate()}
              disabled={!name.trim() || save.isPending || name === ws.data?.workspace?.name}
            >
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Plans: Free · Pro · Team. Stripe checkout is wired separately by an admin.</p>
          <ul className="mt-2 list-disc pl-5 text-xs">
            <li>Free — 10 content runs / month</li>
            <li>Pro — 200 content runs / month</li>
            <li>Team — 1,000 content runs / month + seats</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
