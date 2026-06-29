import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/app/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns · Marketing Agent" }] }),
  component: CampaignsPage,
});

function CampaignsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
        <p className="text-sm text-muted-foreground">
          Generate end-to-end campaign briefs with calendar, channel mix, and KPIs.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick start</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Use Content Studio → kind <strong className="text-foreground">Campaign brief</strong> to
            generate a full campaign with calendar and KPIs. Pinning campaigns as first-class
            objects is coming next.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
