import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { getCurrentWorkspace, renameWorkspace, getUsage } from "@/lib/workspace.functions";
import {
  listTeam,
  inviteMember,
  revokeInvite,
  changeMemberRole,
  removeMember,
} from "@/lib/team.functions";
import { listMcpConnections, createMcpConnection, deleteMcpConnection } from "@/lib/mcp.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  Save,
  Users,
  CreditCard,
  MoreHorizontal,
  Trash2,
  Shield,
  User,
  Crown,
  Copy,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings · Marketing Agent" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const ws = useQuery({ queryKey: ["current-workspace"], queryFn: () => getCurrentWorkspace() });
  const workspaceId = ws.data?.workspace?.id;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Workspace, team, usage, and billing.
        </p>
      </div>

      <Tabs defaultValue="workspace" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="workspace">
          <WorkspaceTab workspaceId={workspaceId} />
        </TabsContent>
        <TabsContent value="team">
          <TeamTab workspaceId={workspaceId} />
        </TabsContent>
        <TabsContent value="usage">
          <UsageTab workspaceId={workspaceId} />
        </TabsContent>
        <TabsContent value="billing">
          <BillingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WorkspaceTab({ workspaceId }: { workspaceId?: string }) {
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Workspace</CardTitle>
        <CardDescription>Rename your workspace and view its plan.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Plan: <Badge variant="secondary">{ws.data?.workspace?.plan ?? "free"}</Badge>
          </div>
          <Button
            onClick={() => save.mutate()}
            disabled={!name.trim() || save.isPending || name === ws.data?.workspace?.name}
          >
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamTab({ workspaceId }: { workspaceId?: string }) {
  const qc = useQueryClient();
  const team = useQuery({
    queryKey: ["team", workspaceId],
    queryFn: () => listTeam({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviteOpen, setInviteOpen] = useState(false);

  const canManage = team.data?.myRole === "owner" || team.data?.myRole === "admin";

  const invite = useMutation({
    mutationFn: () =>
      inviteMember({
        data: { workspaceId: workspaceId!, email: inviteEmail, role: inviteRole },
      }),
    onSuccess: (res) => {
      toast.success("Invitation sent");
      setInviteEmail("");
      setInviteOpen(false);
      qc.invalidateQueries({ queryKey: ["team", workspaceId] });
      const link = `${window.location.origin}/invite/${res.token}`;
      navigator.clipboard.writeText(link);
      toast.success("Invite link copied to clipboard");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: (inviteId: string) =>
      revokeInvite({ data: { workspaceId: workspaceId!, inviteId } }),
    onSuccess: () => {
      toast.success("Invite revoked");
      qc.invalidateQueries({ queryKey: ["team", workspaceId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRole = useMutation({
    mutationFn: (args: { userId: string; role: "owner" | "admin" | "member" }) =>
      changeMemberRole({ data: { workspaceId: workspaceId!, userId: args.userId, role: args.role } }),
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["team", workspaceId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (userId: string) =>
      removeMember({ data: { workspaceId: workspaceId!, userId } }),
    onSuccess: () => {
      toast.success("Member removed");
      qc.invalidateQueries({ queryKey: ["team", workspaceId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!workspaceId) return <TeamSkeleton />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Members</CardTitle>
            <CardDescription>
              {team.data?.members.length ?? 0} member
              {(team.data?.members.length ?? 0) !== 1 ? "s" : ""} ·{" "}
              {team.data?.invites.length ?? 0} pending invite
              {(team.data?.invites.length ?? 0) !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          {canManage && (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Mail className="mr-2 h-4 w-4" />
                  Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite a teammate</DialogTitle>
                  <DialogDescription>
                    Admins can manage the workspace; members can create content and research.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as typeof inviteRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member — can create and edit</SelectItem>
                        <SelectItem value="admin">Admin — can manage workspace and billing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => invite.mutate()}
                    disabled={!inviteEmail.trim() || invite.isPending}
                  >
                    {invite.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send invite
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {team.isLoading ? (
            <TeamSkeleton />
          ) : (
            <ul className="divide-y divide-border/60">
              {team.data?.members.map((m) => (
                <li key={m.userId} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {m.fullName || m.email || "Unnamed member"}
                        {m.isSelf && (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            you
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{m.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RoleBadge role={m.role} />
                    {canManage && !m.isSelf && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {team.data?.myRole === "owner" && m.role !== "owner" && (
                            <DropdownMenuItem
                              onClick={() => updateRole.mutate({ userId: m.userId, role: "owner" })}
                            >
                              <Crown className="mr-2 h-4 w-4" />
                              Make owner
                            </DropdownMenuItem>
                          )}
                          {m.role !== "admin" && (
                            <DropdownMenuItem
                              onClick={() => updateRole.mutate({ userId: m.userId, role: "admin" })}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              Make admin
                            </DropdownMenuItem>
                          )}
                          {m.role !== "member" && (
                            <DropdownMenuItem
                              onClick={() => updateRole.mutate({ userId: m.userId, role: "member" })}
                            >
                              <User className="mr-2 h-4 w-4" />
                              Make member
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => remove.mutate(m.userId)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {(team.data?.invites.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending invites</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border/60">
              {team.data?.invites.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium">{i.email}</div>
                    <div className="text-xs text-muted-foreground">
                      Expires {new Date(i.expiresAt).toLocaleDateString()} · <RoleBadge role={i.role} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const link = `${window.location.origin}/invite/${i.id}`;
                        navigator.clipboard.writeText(link);
                        toast.success("Invite link copied");
                      }}
                      title="Copy invite link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => revoke.mutate(i.id)}
                        disabled={revoke.isPending}
                        title="Revoke invite"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: "owner" | "admin" | "member" }) {
  const variants: Record<typeof role, { icon: React.ReactNode; label: string }> = {
    owner: { icon: <Crown className="h-3 w-3" />, label: "Owner" },
    admin: { icon: <Shield className="h-3 w-3" />, label: "Admin" },
    member: { icon: <User className="h-3 w-3" />, label: "Member" },
  };
  const v = variants[role];
  return (
    <Badge variant="secondary" className="gap-1 text-[10px] uppercase tracking-wider">
      {v.icon}
      {v.label}
    </Badge>
  );
}

function TeamSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            <div className="space-y-1">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-48 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsageTab({ workspaceId }: { workspaceId?: string }) {
  const usage = useQuery({
    queryKey: ["usage", workspaceId],
    queryFn: () => getUsage({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });

  if (!workspaceId) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Loading workspace…
        </CardContent>
      </Card>
    );
  }

  if (usage.isLoading) {
    return (
      <Card>
        <CardContent className="space-y-6 py-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-2 w-full animate-pulse rounded bg-muted" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const snap = usage.data;
  if (!snap) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Could not load usage data.
        </CardContent>
      </Card>
    );
  }

  const meters = [
    { label: "Content generations", used: snap.used.contentRuns, limit: snap.limits.contentRuns },
    { label: "Research runs", used: snap.used.researchRuns, limit: snap.limits.researchRuns },
    { label: "Brands", used: snap.counts.brands, limit: snap.limits.brands },
    { label: "Seats", used: snap.counts.seats, limit: snap.limits.seats },
    { label: "MCP servers", used: snap.counts.mcpServers, limit: snap.limits.mcpServers },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Usage</CardTitle>
        <CardDescription>
          Current period: {snap.period} · Resets {new Date(snap.resetsAt).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {meters.map((m) => {
          const pct = Math.min(100, Math.round((m.used / m.limit) * 100));
          return (
            <div key={m.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{m.label}</span>
                <span className="font-mono text-muted-foreground">
                  {m.used} / {m.limit}
                </span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function BillingTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Billing
        </CardTitle>
        <CardDescription>Upgrade or manage your subscription.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { name: "Free", price: "$0", runs: 10, research: 5, seats: 1 },
            { name: "Pro", price: "$29", runs: 200, research: 60, seats: 3 },
            { name: "Team", price: "$99", runs: 1000, research: 300, seats: 20 },
          ].map((p) => (
            <div
              key={p.name}
              className="rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-primary/40"
            >
              <div className="text-lg font-semibold">{p.name}</div>
              <div className="text-2xl font-semibold tracking-tight">
                {p.price}<span className="text-sm font-normal text-muted-foreground">/mo</span>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                <li>{p.runs} content runs / month</li>
                <li>{p.research} research runs / month</li>
                <li>{p.seats} seat{p.seats !== 1 ? "s" : ""}</li>
              </ul>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Stripe checkout is managed separately. Contact an admin to change plans.
        </p>
      </CardContent>
    </Card>
  );
}
