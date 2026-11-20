import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/client/components/AppShell";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { GRID } from "@/client/design/DesignCard";
import { message } from "@/client/design/NameDialog";
import { imageHrefFor, Thumbnail } from "@/client/design/PageSvg";
import { deleteTemplate, listTemplates, useTemplate as copyTemplate } from "@/serverFunctions/designs";
import { toast } from "sonner";

export const Route = createFileRoute("/templates")({
  loader: () => listTemplates({ data: {} }),
  head: () => ({ meta: [{ title: "Templates · Design Studio" }] }),
  component: Templates,
});

function Templates() {
  const templates = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);
  const categories = useMemo(
    () => [...new Set(templates.map((t) => t.category))].sort(),
    [templates],
  );
  const shown = templates.filter(
    (t) =>
      (!category || t.category === category) &&
      t.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  async function use(id: string) {
    setBusy(id);
    try {
      const created = await copyTemplate({ data: { id } });
      await navigate({ to: "/d/$id", params: { id: created.id } });
    } catch (cause) {
      toast.error(message(cause));
      setBusy(null);
    }
  }

  return (
    <AppShell>
      <PageHeader title="Templates" />
      <div className="space-y-3">
        <Input
          aria-label="Search templates"
          placeholder="Search templates"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            data-testid="category-all"
            variant={category === null ? "secondary" : "ghost"}
            aria-pressed={category === null}
            onClick={() => setCategory(null)}
          >
            All
          </Button>
          {categories.map((c) => (
            <Button
              key={c}
              size="sm"
              data-testid={`category-${c}`}
              variant={category === c ? "secondary" : "ghost"}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      </div>
      {shown.length === 0 ? (
        <EmptyState kind="filtered" title="No templates match" />
      ) : (
        <div className={GRID}>
          {shown.map((t) => (
            <div key={t.id} data-testid="template-card" className="space-y-2">
              <Thumbnail
                page={t.doc.pages[0]}
                width={t.width}
                height={t.height}
                imageHref={imageHrefFor({ template: t.team ? t.id : undefined })}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.name}</p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{t.category}</span>
                  <span>·</span>
                  <span>
                    {t.width} × {t.height}
                  </span>
                  {t.team ? <Badge variant="secondary">Team</Badge> : null}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" pending={busy === t.id} onClick={() => use(t.id)}>
                  Use template
                </Button>
                {t.canDelete ? (
                  <Button size="sm" variant="ghost" onClick={() => setDeleting({ id: t.id, name: t.name })}>
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
      {deleting ? (
        <ConfirmDialog
          title={`Delete the “${deleting.name}” template?`}
          confirmLabel="Delete"
          destructive
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await deleteTemplate({ data: { id: deleting.id } });
            } catch (cause) {
              toast.error(message(cause));
            }
            setDeleting(null);
            await router.invalidate();
          }}
        />
      ) : null}
    </AppShell>
  );
}
