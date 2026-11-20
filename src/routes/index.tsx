import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Folder, FolderPlus, Plus } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { AppShell } from "@/client/components/AppShell";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { DesignCard, GRID } from "@/client/design/DesignCard";
import { MoveDialog } from "@/client/design/MoveDialog";
import { NameDialog } from "@/client/design/NameDialog";
import { NewDesignDialog } from "@/client/design/NewDesignDialog";
import {
  createFolder,
  deleteDesign,
  deleteFolder,
  duplicateDesign,
  listDesigns,
  listFolders,
  moveDesign,
  renameDesign,
  renameFolder,
} from "@/serverFunctions/designs";

const search = z.object({
  folder: z.string().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: search,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [designs, folders] = await Promise.all([
      listDesigns({ data: { folderId: deps.folder ?? null, q: deps.q } }),
      listFolders({ data: {} }),
    ]);
    return { designs, folders };
  },
  head: () => ({ meta: [{ title: "Designs · Design Studio" }] }),
  component: Home,
});

type Dialog =
  | { kind: "new" }
  | { kind: "newFolder" }
  | { kind: "renameFolder" }
  | { kind: "deleteFolder" }
  | { kind: "rename"; id: string; name: string }
  | { kind: "move"; id: string; folderId: string | null }
  | { kind: "delete"; id: string; name: string };

function Home() {
  const { designs, folders } = Route.useLoaderData();
  const { folder: folderId, q } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [pending, setPending] = useState(false);
  const folder = folders.find((f) => f.id === folderId);
  const close = () => setDialog(null);
  const refresh = () => router.invalidate();

  return (
    <AppShell>
      <PageHeader
        title={folder ? folder.name : "Designs"}
        backLink={
          folder ? (
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← All designs
            </Link>
          ) : undefined
        }
        actions={
          <>
            {folder ? (
              <>
                <Button variant="outline" onClick={() => setDialog({ kind: "renameFolder" })}>
                  Rename folder
                </Button>
                <Button variant="outline" onClick={() => setDialog({ kind: "deleteFolder" })}>
                  Delete folder
                </Button>
              </>
            ) : (
              <Button variant="outline" data-testid="new-folder" onClick={() => setDialog({ kind: "newFolder" })}>
                <FolderPlus /> New folder
              </Button>
            )}
            <Button data-testid="new-design" onClick={() => setDialog({ kind: "new" })}>
              <Plus /> New design
            </Button>
          </>
        }
      />

      {!folder ? (
        <div className="space-y-4">
          <Input
            data-testid="search-designs"
            aria-label="Search designs"
            placeholder="Search designs"
            defaultValue={q ?? ""}
            onChange={(e) =>
              navigate({ search: { q: e.target.value || undefined }, replace: true })
            }
            className="max-w-sm"
          />
          {folders.length > 0 && !q ? (
            <div className="flex flex-wrap gap-2">
              {folders.map((f) => (
                <Link
                  key={f.id}
                  to="/"
                  search={{ folder: f.id }}
                  data-testid="folder"
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted"
                >
                  <Folder className="size-4 text-muted-foreground" /> {f.name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {designs.length === 0 ? (
        <EmptyState
          kind={q ? "filtered" : "no-data"}
          title={q ? "No designs match" : folder ? "This folder is empty" : "No designs yet"}
          description={
            q ? undefined : folder ? "Move designs here from the Designs page." : "Create one from a size or a template."
          }
        />
      ) : (
        <div className={GRID}>
          {designs.map((d) => (
            <DesignCard
              key={d.id}
              design={d}
              actions={[
                { label: "Rename", onSelect: () => setDialog({ kind: "rename", id: d.id, name: d.name }) },
                {
                  label: "Duplicate",
                  onSelect: async () => {
                    await duplicateDesign({ data: { id: d.id } });
                    await refresh();
                  },
                },
                { label: "Move to folder", onSelect: () => setDialog({ kind: "move", id: d.id, folderId: d.folderId }) },
                { label: "Delete", destructive: true, onSelect: () => setDialog({ kind: "delete", id: d.id, name: d.name }) },
              ]}
            />
          ))}
        </div>
      )}

      {dialog?.kind === "new" ? <NewDesignDialog onClose={close} /> : null}
      {dialog?.kind === "newFolder" ? (
        <NameDialog
          title="New folder"
          submitLabel="Create"
          onClose={close}
          onSubmit={async (name) => {
            await createFolder({ data: { name } });
            await refresh();
          }}
        />
      ) : null}
      {dialog?.kind === "renameFolder" && folder ? (
        <NameDialog
          title="Rename folder"
          initial={folder.name}
          submitLabel="Save"
          onClose={close}
          onSubmit={async (name) => {
            await renameFolder({ data: { id: folder.id, name } });
            await refresh();
          }}
        />
      ) : null}
      {dialog?.kind === "deleteFolder" && folder ? (
        <ConfirmDialog
          title={`Delete “${folder.name}”?`}
          confirmLabel="Delete"
          destructive
          pending={pending}
          onClose={close}
          onConfirm={async () => {
            setPending(true);
            await deleteFolder({ data: { id: folder.id } });
            setPending(false);
            close();
            await navigate({ to: "/", search: {} });
          }}
        >
          Its designs and uploads move back to the top level.
        </ConfirmDialog>
      ) : null}
      {dialog?.kind === "rename" ? (
        <NameDialog
          title="Rename design"
          initial={dialog.name}
          submitLabel="Save"
          onClose={close}
          onSubmit={async (name) => {
            await renameDesign({ data: { id: dialog.id, name } });
            await refresh();
          }}
        />
      ) : null}
      {dialog?.kind === "move" ? (
        <MoveDialog
          folders={folders}
          current={dialog.folderId}
          onClose={close}
          onMove={async (target) => {
            await moveDesign({ data: { id: dialog.id, folderId: target } });
            await refresh();
          }}
        />
      ) : null}
      {dialog?.kind === "delete" ? (
        <ConfirmDialog
          title={`Delete “${dialog.name}”?`}
          confirmLabel="Delete"
          destructive
          pending={pending}
          onClose={close}
          onConfirm={async () => {
            setPending(true);
            await deleteDesign({ data: { id: dialog.id } });
            setPending(false);
            close();
            await refresh();
          }}
        >
          People it's shared with lose access too.
        </ConfirmDialog>
      ) : null}
    </AppShell>
  );
}
