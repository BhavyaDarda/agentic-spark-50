import { createFileRoute, Outlet, useNavigate, redirect, useRouterState } from "@tanstack/react-router";
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
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { LogOut, UserCircle, Menu, Settings as SettingsIcon } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { useQuery } from "@tanstack/react-query";
import { getCurrentWorkspace } from "@/lib/workspace.functions";

export const Route = createFileRoute("/app")({
  staticData: { sitemap: "exclude-subtree" },
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/auth" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <AppSidebar />
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent
          side="left"
          className="w-[86vw] max-w-xs border-r-[4px] border-border p-0 shadow-none"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppSidebar variant="drawer" />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b-[4px] border-border bg-background px-3 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 md:hidden"
              aria-label="Open navigation"
              aria-expanded={navOpen}
              onClick={() => setNavOpen(true)}
            >
              <Menu className="h-4 w-4" strokeWidth={2.5} />
            </Button>
            <span className="hidden font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground sm:inline">
              Workspace
            </span>
            <span className="truncate border-[3px] border-border bg-card px-2 py-0.5 font-display text-xs font-black uppercase">
              {ws.data?.workspace?.name ?? "—"}
            </span>
            <span className="hidden border-[3px] border-border bg-secondary px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-secondary-foreground sm:inline">
              {ws.data?.workspace?.plan ?? "free"}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2" aria-label="Account menu">
                <UserCircle className="h-4 w-4" />
                <span className="hidden max-w-[220px] truncate text-sm md:inline">{email ?? "Account"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate({ to: "/app/settings" })}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
