import { createFileRoute, Outlet, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, UserCircle } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { useQuery } from "@tanstack/react-query";
import { getCurrentWorkspace } from "@/lib/workspace.functions";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const ws = useQuery({
    queryKey: ["current-workspace"],
    queryFn: () => getCurrentWorkspace(),
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/auth" });
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Workspace</span>
            <span className="rounded-md border border-border/60 bg-card px-2 py-0.5 text-xs font-medium">
              {ws.data?.workspace?.name ?? "—"}
            </span>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-primary">
              {ws.data?.workspace?.plan ?? "free"}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <UserCircle className="h-4 w-4" />
                <span className="hidden text-sm md:inline">{email ?? "Account"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
