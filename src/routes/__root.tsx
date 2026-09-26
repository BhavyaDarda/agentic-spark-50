import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

// Fonts are bundled locally — no network calls, no CSP surprises.
import "@fontsource/unbounded/200.css";
import "@fontsource/unbounded/400.css";
import "@fontsource/unbounded/700.css";
import "@fontsource/unbounded/900.css";
import "@fontsource/alata/400.css";
import "@fontsource-variable/jetbrains-mono";



import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SITE } from "../lib/site";

function NotFoundComponent() {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="brut max-w-md bg-card p-8 text-center">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
          Error 404
        </p>
        <h1 className="mt-2 font-display text-7xl font-black text-foreground">Lost</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          That page does not exist or has moved. Nothing was deleted on your side.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="brut-sm brut-press inline-flex items-center justify-center bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            Go home
          </Link>
          <Link
            to="/app"
            className="brut-sm brut-press inline-flex items-center justify-center bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground"
          >
            Open the app
          </Link>
        </div>
      </div>
    </main>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="brut max-w-md bg-card p-8 text-center" role="alert">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
          Something broke
        </p>
        <h1 className="mt-2 font-display text-2xl font-black text-foreground">
          This page didn't load
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The error has been logged on our side. Try again, or head back home; your work is saved
          as you go.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="brut-sm brut-press inline-flex items-center justify-center bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            Try again
          </button>
          <a
            href="/"
            className="brut-sm brut-press inline-flex items-center justify-center bg-background px-4 py-2 text-sm font-bold text-foreground"
          >
            Go home
          </a>
        </div>
      </div>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SITE.name },
      { name: "description", content: SITE.description },
      { name: "theme-color", content: "#ffffff" },
      { name: "application-name", content: SITE.name },
      { property: "og:site_name", content: SITE.name },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
