import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { ThemePreferenceRadio } from "@/client/components/ThemePreferenceMenuItems";

/**
 * The frame every page sits in: a bar with the way back to the Gateway and
 * the theme pick, then one scrolling column. The document itself doesn't
 * scroll (src/client/styles/app.css); the column does. A page starts with a
 * `PageHeader`. An app with more than one page puts its tabs or links in
 * `nav`.
 */
export function AppShell({
  nav = <AppNav />,
  wide = false,
  children,
}: {
  nav?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  const column = wide ? WIDE_COLUMN : COLUMN;
  // From the root route's loader (src/serverFunctions/gateway.ts).
  const gatewayUrl = useRouterState({
    select: (state) => {
      const root = state.matches[0]?.loaderData;
      return root && "gatewayUrl" in root ? root.gatewayUrl : null;
    },
  });
  return (
    <div className="flex h-dvh flex-col">
      <header className="shrink-0 border-b border-border">
        <div
          className={`${column} flex h-12 items-center justify-between gap-3`}
        >
          <div className="flex min-w-0 items-center gap-4 overflow-x-auto">
            {gatewayUrl ? (
              <a
                href={gatewayUrl}
                className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft className="size-4" aria-hidden />
                All apps
              </a>
            ) : null}
            {nav}
          </div>
          <ThemePreferenceRadio />
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className={`${column} space-y-8 pt-8 pb-24 md:pt-10`}>
          {children}
        </main>
      </div>
    </div>
  );
}

/** The column the bar and the page share. */
const COLUMN = "mx-auto w-full max-w-5xl px-4 md:px-10";
const WIDE_COLUMN = "mx-auto w-full max-w-[1600px] px-4 md:px-6";

const NAV = [
  { to: "/", label: "Designs" },
  { to: "/shared", label: "Shared with me" },
  { to: "/templates", label: "Templates" },
  { to: "/uploads", label: "Uploads" },
  { to: "/brand", label: "Brand kit" },
] as const;

function AppNav() {
  return (
    <nav className="flex items-center gap-3 text-sm">
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: true, includeSearch: false }}
          className="shrink-0 whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground data-[status=active]:font-medium data-[status=active]:text-foreground"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
