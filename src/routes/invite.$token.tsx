import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { peekInvite, acceptInvite } from "@/lib/team.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  next: z.string().optional(),
});

export const Route = createFileRoute("/invite/$token")({
  head: () => ({ meta: [{ title: "Accept invitation · Marketing Agent" }] }),
  validateSearch: searchSchema,
  component: InvitePage,
  // The invite acceptance requires an authenticated Supabase session.
  // This route is client-only so the browser client can read localStorage.
  ssr: false,
});

function InvitePage() {
  const { token } = Route.useParams();
  const { next } = useSearch({ from: "/invite/$token" });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ["invite-session", token],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const inviteQuery = useQuery({
    queryKey: ["invite", token],
    queryFn: () => peekInvite({ data: { token } }),
    enabled: !!sessionQuery.data,
  });

  useEffect(() => {
    if (sessionQuery.isLoading) return;
    if (!sessionQuery.data) {
      // Preserve this invite URL so the user returns after signing in.
      const returnTo = `/invite/${token}${next ? `?next=${encodeURIComponent(next)}` : ""}`;
      navigate({ to: "/auth", search: { next: returnTo } });
    }
  }, [sessionQuery.data, sessionQuery.isLoading, token, next, navigate]);

  const accept = useMutation({
    mutationFn: () => acceptInvite({ data: { token } }),
    onSuccess: (res) => {
      toast.success("You're in!");
      qc.invalidateQueries({ queryKey: ["current-workspace"] });
      qc.invalidateQueries({ queryKey: ["my-workspaces"] });
      navigate({ to: next || "/app", replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (sessionQuery.isLoading || inviteQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!sessionQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const invite = inviteQuery.data;

  if (!invite || invite.expired || invite.accepted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Invitation unavailable
            </CardTitle>
            <CardDescription>
              {!invite
                ? "This invitation link is not valid."
                : invite.accepted
                  ? "This invitation has already been used."
                  : "This invitation has expired. Ask the workspace owner for a new one."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate({ to: "/app" })}>Go to Marketing Agent</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const emailMismatch =
    sessionQuery.data.user.email?.toLowerCase() !== invite.email.toLowerCase();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-none bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <CardTitle>Join {invite.workspaceName}</CardTitle>
          <CardDescription>
            You've been invited as a{" "}
            <span className="font-medium text-foreground">{invite.role}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-none border border-border/60 bg-muted/30 p-3 text-sm">
            <div className="text-muted-foreground">Invitation sent to</div>
            <div className="font-medium">{invite.email}</div>
            <div className="mt-2 text-muted-foreground">You are signed in as</div>
            <div className="font-medium">{sessionQuery.data.user.email}</div>
          </div>

          {emailMismatch && (
            <div className="flex items-start gap-2 rounded-none border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                This invitation was sent to a different email address. Sign out and sign in with{" "}
                <strong>{invite.email}</strong>, or ask the sender to invite{" "}
                {sessionQuery.data.user.email} instead.
              </span>
            </div>
          )}

          <Button
            className="w-full"
            disabled={emailMismatch || accept.isPending}
            onClick={() => accept.mutate()}
          >
            {accept.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Accept invitation
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
