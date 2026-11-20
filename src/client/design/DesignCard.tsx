import { Link } from "@tanstack/react-router";
import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { imageHrefFor, Thumbnail } from "@/client/design/PageSvg";
import type { DesignDoc } from "@/lib/design";

export function DesignCard({
  design,
  meta,
  actions,
}: {
  design: { id: string; name: string; width: number; height: number; doc: DesignDoc; updatedAt: string };
  meta?: ReactNode;
  actions?: { label: string; onSelect: () => void; destructive?: boolean }[];
}) {
  return (
    <div data-testid="design-card" className="group relative space-y-2">
      <Link to="/d/$id" params={{ id: design.id }} className="block space-y-2">
        <Thumbnail
          page={design.doc.pages[0]}
          width={design.width}
          height={design.height}
          imageHref={imageHrefFor({ design: design.id })}
        />
      </Link>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            to="/d/$id"
            params={{ id: design.id }}
            className="block truncate text-sm font-medium hover:underline"
          >
            {design.name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {meta ?? <>Edited {formatDate(design.updatedAt)}</>}
          </p>
        </div>
        {actions ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label="Design actions" />}
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.map((a) => (
                <DropdownMenuItem
                  key={a.label}
                  variant={a.destructive ? "destructive" : "default"}
                  onClick={a.onSelect}
                >
                  {a.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}

export function formatDate(iso: string): string {
  const date = new Date(iso.includes("T") ? iso : `${iso.replace(" ", "T")}Z`);
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export const GRID = "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4";
