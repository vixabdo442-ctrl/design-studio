import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Folder, FolderInput, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/client/components/AppShell";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import { GRID } from "@/client/design/DesignCard";
import { MoveDialog } from "@/client/design/MoveDialog";
import { message } from "@/client/design/NameDialog";
import { uploadFile } from "@/client/design/uploadFile";
import { deleteUpload, listFolders, listUploads, moveUpload } from "@/serverFunctions/designs";

export const Route = createFileRoute("/uploads")({
  validateSearch: z.object({ folder: z.string().optional() }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [uploads, folders] = await Promise.all([
      listUploads({ data: { folderId: deps.folder ?? null } }),
      listFolders({ data: {} }),
    ]);
    return { uploads, folders };
  },
  head: () => ({ meta: [{ title: "Uploads · Design Studio" }] }),
  component: Uploads,
});

function size(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Uploads() {
  const { uploads, folders } = Route.useLoaderData();
  const { folder: folderId } = Route.useSearch();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const folder = folders.find((f) => f.id === folderId);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    for (const file of Array.from(files)) {
      try {
        await uploadFile("/api/uploads", file, folderId);
      } catch (cause) {
        setError(`${file.name}: ${message(cause)}`);
      }
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    await router.invalidate();
  }

  return (
    <AppShell>
      <PageHeader
        title={folder ? `Uploads · ${folder.name}` : "Uploads"}
        description="PNG, JPG, WebP or SVG, up to 10 MB each."
        actions={
          <>
            <input
              ref={input}
              data-testid="upload-input"
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="sr-only"
              onChange={(e) => onFiles(e.target.files)}
            />
            <Button pending={busy} onClick={() => input.current?.click()}>
              <Upload /> Upload images
            </Button>
          </>
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {folders.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={folder ? "ghost" : "secondary"} render={<Link to="/uploads" search={{}} />}>
            Top level
          </Button>
          {folders.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={f.id === folderId ? "secondary" : "ghost"}
              render={<Link to="/uploads" search={{ folder: f.id }} />}
            >
              <Folder /> {f.name}
            </Button>
          ))}
        </div>
      ) : null}
      {uploads.length === 0 ? (
        <EmptyState title="No uploads here" description="Upload images to place them in your designs." />
      ) : (
        <div className={GRID}>
          {uploads.map((u) => (
            <div key={u.id} data-testid="upload-card" className="space-y-2">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-muted p-2">
                <img src={`/files/u/${u.id}`} alt={u.name} className="max-h-full max-w-full object-contain" />
              </div>
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{size(u.size)}</p>
                </div>
                <div className="flex shrink-0">
                  <Button variant="ghost" size="icon-sm" aria-label={`Move ${u.name}`} onClick={() => setMoving(u.id)}>
                    <FolderInput />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label={`Delete ${u.name}`} onClick={() => setDeleting(u)}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {moving ? (
        <MoveDialog
          folders={folders}
          current={folderId ?? null}
          onClose={() => setMoving(null)}
          onMove={async (target) => {
            await moveUpload({ data: { id: moving, folderId: target } });
            await router.invalidate();
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          confirmLabel="Delete"
          destructive
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await deleteUpload({ data: { id: deleting.id } });
            } catch (cause) {
              toast.error(message(cause));
            }
            setDeleting(null);
            await router.invalidate();
          }}
        >
          Designs using it will show an empty frame instead.
        </ConfirmDialog>
      ) : null}
    </AppShell>
  );
}
