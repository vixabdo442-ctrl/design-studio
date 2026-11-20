import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, LayoutTemplate, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/client/components/AppShell";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { Editor } from "@/client/design/Editor";
import { ExportDialog } from "@/client/design/ExportDialog";
import { NameDialog } from "@/client/design/NameDialog";
import { imageHrefFor } from "@/client/design/PageSvg";
import { ShareDialog } from "@/client/design/ShareDialog";
import { useEditorDoc, type SaveState } from "@/client/design/useEditor";
import { getBrand, getDesign, listUploads, saveAsTemplate } from "@/serverFunctions/designs";

export const Route = createFileRoute("/d/$id")({
  ssr: false,
  loader: async ({ params }) => {
    const design = await getDesign({ data: { id: params.id } });
    if (!design) return { design: null, brand: null, uploads: [] };
    const canEdit = design.role !== "view";
    const [brand, uploads] = await Promise.all([
      getBrand({ data: {} }),
      canEdit ? listUploads({ data: { all: true } }) : Promise.resolve([]),
    ]);
    return { design, brand, uploads };
  },
  staleTime: Infinity,
  gcTime: 0,
  shouldReload: false,
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.design ? `${loaderData.design.name} · Design Studio` : "Design Studio" }],
  }),
  component: DesignPage,
});

const STATUS: Record<SaveState, string> = {
  saved: "Saved",
  dirty: "Unsaved changes",
  saving: "Saving…",
  error: "Not saved",
  conflict: "Not saved",
};

function DesignPage() {
  const { design, brand, uploads } = Route.useLoaderData();
  if (!design || !brand)
    return (
      <AppShell>
        <EmptyState
          kind="error"
          title="Design not found"
          description="It was deleted, or it isn't shared with you."
          action={<Button variant="outline" render={<Link to="/" />}>Back to designs</Button>}
        />
      </AppShell>
    );
  return <Loaded design={design} brand={brand} uploads={uploads} />;
}

function Loaded({
  design,
  brand,
  uploads,
}: {
  design: NonNullable<ReturnType<typeof Route.useLoaderData>["design"]>;
  brand: NonNullable<ReturnType<typeof Route.useLoaderData>["brand"]>;
  uploads: { id: string; name: string }[];
}) {
  const canEdit = design.role !== "view";
  const isOwner = design.role === "owner";
  const editor = useEditorDoc(design, canEdit);
  const [pageIndex, setPageIndex] = useState(0);
  const [dialog, setDialog] = useState<"export" | "share" | "template" | null>(null);
  const imageHref = useMemo(() => imageHrefFor({ design: design.id }), [design.id]);
  const [category, setCategory] = useState("");

  return (
    <AppShell wide>
      <PageHeader
        title={design.name}
        backLink={
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Designs
          </Link>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span data-testid="design-size">
              {design.width} × {design.height} px
            </span>
            ·
            {canEdit ? (
              <span data-testid="save-status">{STATUS[editor.save]}</span>
            ) : (
              <Badge variant="secondary" data-testid="read-only">
                View only
              </Badge>
            )}
          </span>
        }
        actions={
          <>
            {isOwner ? (
              <Button variant="outline" onClick={() => setDialog("template")}>
                <LayoutTemplate /> Save as template
              </Button>
            ) : null}
            {isOwner ? (
              <Button variant="outline" onClick={() => setDialog("share")}>
                <Share2 /> Share
              </Button>
            ) : null}
            <Button onClick={() => setDialog("export")}>
              <Download /> Export
            </Button>
          </>
        }
      />
      {editor.save === "conflict" ? (
        <Alert variant="destructive" data-testid="conflict">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            This design was changed elsewhere. Your latest changes weren't saved.
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              Load the latest version
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      <Editor
        design={design}
        editor={editor}
        canEdit={canEdit && editor.save !== "conflict"}
        pageIndex={Math.min(pageIndex, editor.doc.pages.length - 1)}
        setPageIndex={setPageIndex}
        imageHref={imageHref}
        uploads={uploads}
        brand={brand}
      />
      {dialog === "export" ? (
        <ExportDialog design={design} doc={editor.doc} pageIndex={pageIndex} imageHref={imageHref} onClose={() => setDialog(null)} />
      ) : null}
      {dialog === "share" ? <ShareDialog designId={design.id} onClose={() => setDialog(null)} /> : null}
      {dialog === "template" ? (
        <NameDialog
          title="Save as team template"
          initial={design.name}
          submitLabel="Save template"
          onClose={() => setDialog(null)}
          onSubmit={async (name) => {
            await saveAsTemplate({ data: { designId: design.id, name, category: category.trim() } });
            toast.success("Saved as a team template");
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="template-category">Category</Label>
            <Input id="template-category" placeholder="Social, Events…" value={category} maxLength={40} onChange={(e) => setCategory(e.target.value)} />
          </div>
        </NameDialog>
      ) : null}
    </AppShell>
  );
}
