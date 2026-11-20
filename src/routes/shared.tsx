import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/client/components/AppShell";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { DesignCard, GRID } from "@/client/design/DesignCard";
import { listShared } from "@/serverFunctions/designs";

export const Route = createFileRoute("/shared")({
  loader: () => listShared({ data: {} }),
  head: () => ({ meta: [{ title: "Shared with me · Design Studio" }] }),
  component: Shared,
});

function Shared() {
  const designs = Route.useLoaderData();
  return (
    <AppShell>
      <PageHeader title="Shared with me" />
      {designs.length === 0 ? (
        <EmptyState title="Nothing shared with you yet" description="Designs others share with you appear here." />
      ) : (
        <div className={GRID}>
          {designs.map((d) => (
            <DesignCard
              key={d.id}
              design={d}
              meta={`${d.ownerEmail} · ${d.role === "edit" ? "Can edit" : "Can view"}`}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
