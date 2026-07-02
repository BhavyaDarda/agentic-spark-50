import { Link, useNavigate, useMatchRoute } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Plus,
  Library,
  Building2,
  Settings as SettingsIcon,
  MessageSquare,
  Loader2,
  Search,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentWorkspace } from "@/lib/workspace.functions";
import { listConversations, createConversation } from "@/lib/chat.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";

export function AppSidebar() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const matchRoute = useMatchRoute();
  const [filter, setFilter] = useState("");

  const ws = useQuery({ queryKey: ["current-workspace"], queryFn: () => getCurrentWorkspace() });
  const workspaceId = ws.data?.workspace?.id;

  const conversations = useQuery({
    queryKey: ["conversations", workspaceId],
    queryFn: () => listConversations({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });

  const createChat = useMutation({
    mutationFn: () => createConversation({ data: { workspaceId: workspaceId! } }),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["conversations", workspaceId] });
      navigate({ to: "/app/c/$conversationId", params: { conversationId: row.id } });
    },
  });

  const filtered = useMemo(() => {
    const items = conversations.data ?? [];
    if (!filter.trim()) return items;
    const f = filter.toLowerCase();
    return items.filter((c) => (c.title ?? "").toLowerCase().includes(f));
  }, [conversations.data, filter]);

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border/60 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="font-semibold tracking-tight">Marketing Agent</span>
      </div>

      <div className="p-3">
        <Button
          className="w-full justify-start gap-2"
          onClick={() => createChat.mutate()}
          disabled={!workspaceId || createChat.isPending}
        >
          {createChat.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          New chat
        </Button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search chats"
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 [scrollbar-width:thin]">
        <div className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Recent
        </div>
        {conversations.isLoading ? (
          <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            No conversations yet.
          </div>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((c) => {
              const active = !!matchRoute({
                to: "/app/c/$conversationId",
                params: { conversationId: c.id },
              });
              return (
                <li key={c.id}>
                  <Link
                    to="/app/c/$conversationId"
                    params={{ conversationId: c.id }}
                    className={cn(
                      "group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      active && "bg-sidebar-accent text-sidebar-accent-foreground",
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    <span className="truncate">{c.title || "New chat"}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <nav className="border-t border-border/60 p-2">
        <SidebarLink to="/app/artifacts" icon={Library} label="Artifact Library" />
        <SidebarLink to="/app/brands" icon={Building2} label="Brands" />
        <SidebarLink to="/app/settings" icon={SettingsIcon} label="Settings" />
      </nav>

      <div className="border-t border-border/60 p-3 text-[10px] text-muted-foreground">
        <div className="font-mono uppercase tracking-widest">
          {ws.data?.workspace?.plan ?? "free"} · v2.0
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      activeProps={{
        className:
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm bg-sidebar-accent text-sidebar-accent-foreground",
      }}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
