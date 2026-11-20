import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Circle,
  Copy,
  Minus,
  Plus,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@/client/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import { BrandPanel, type Brand } from "@/client/design/BrandPanel";
import { CommentsPanel } from "@/client/design/CommentsPanel";
import { PageSvg, rotation, type ImageHref } from "@/client/design/PageSvg";
import { PropertiesPanel } from "@/client/design/PropertiesPanel";
import type { useEditorDoc } from "@/client/design/useEditor";
import {
  newId,
  type DesignDoc,
  type DesignElement,
  type DesignPage,
} from "@/lib/design";

type Doc = ReturnType<typeof useEditorDoc>;
type Drag = {
  mode: "move" | "resize" | "rotate";
  id: string;
  start: { x: number; y: number };
  orig: DesignElement;
  base: DesignDoc;
  moved: boolean;
};

export interface Upload {
  id: string;
  name: string;
}

export function Editor({
  design,
  editor,
  canEdit,
  pageIndex,
  setPageIndex,
  imageHref,
  uploads,
  brand,
}: {
  design: { id: string; width: number; height: number };
  editor: Doc;
  canEdit: boolean;
  pageIndex: number;
  setPageIndex: (i: number) => void;
  imageHref: ImageHref;
  uploads: Upload[];
  brand: Brand;
}) {
  const { doc, commit, preview } = editor;
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState(canEdit ? "edit" : "comments");
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);
  const page = doc.pages[Math.min(pageIndex, doc.pages.length - 1)]!;
  const element = page.elements.find((e) => e.id === selected) ?? null;
  const { width: W, height: H } = design;

  const setPage = (next: DesignPage, base?: DesignDoc) =>
    commit({ pages: doc.pages.map((p, i) => (i === pageIndex ? next : p)) }, base);
  const setPages = (pages: DesignPage[]) => commit({ pages });
  const updateElement = (id: string, change: Partial<DesignElement>) =>
    setPage({
      ...page,
      elements: page.elements.map((e) => (e.id === id ? ({ ...e, ...change } as DesignElement) : e)),
    });
  const add = (el: DesignElement) => {
    setPage({ ...page, elements: [...page.elements, el] });
    setSelected(el.id);
    setTab("edit");
  };

  const unit = Math.min(W, H);
  const addText = (fontFamily = "Arial", fontWeight: "400" | "700" = "400", size = Math.round(unit / 14)) =>
    add({
      id: newId(),
      type: "text",
      x: W * 0.1,
      y: H / 2 - size / 2,
      w: W * 0.8,
      h: size * 1.2,
      rotation: 0,
      text: "Your text here",
      fontFamily,
      fontSize: size,
      fontWeight,
      color: "#111827",
      align: "center",
    });
  const addShape = (type: "rect" | "ellipse" | "line") => {
    const s = unit * 0.3;
    add({
      id: newId(),
      type,
      x: W / 2 - s / 2,
      y: type === "line" ? H / 2 - 10 : H / 2 - s / 2,
      w: s,
      h: type === "line" ? 20 : s,
      rotation: 0,
      fill: type === "line" ? null : "#6366f1",
      stroke: type === "line" ? "#111827" : null,
      strokeWidth: type === "line" ? Math.max(2, Math.round(unit / 150)) : 0,
    });
  };
  const addImage = (source: "upload" | "logo", assetId: string, natural?: { w: number; h: number }) => {
    const max = unit * (source === "logo" ? 0.2 : 0.5);
    const ratio = natural && natural.w > 0 ? natural.h / natural.w : 1;
    const w = ratio > 1 ? max / ratio : max;
    const h = w * ratio;
    add({
      id: newId(),
      type: "image",
      source,
      assetId,
      x: source === "logo" ? W * 0.04 : W / 2 - w / 2,
      y: source === "logo" ? H * 0.04 : H / 2 - h / 2,
      w,
      h,
      rotation: 0,
    });
  };

  const layer = (delta: 1 | -1) => {
    if (!element) return;
    const els = [...page.elements];
    const i = els.findIndex((e) => e.id === element.id);
    const j = i + delta;
    if (j < 0 || j >= els.length) return;
    [els[i], els[j]] = [els[j]!, els[i]!];
    setPage({ ...page, elements: els });
  };
  const duplicateElement = () => {
    if (!element) return;
    const copy = { ...element, id: newId(), x: element.x + unit * 0.03, y: element.y + unit * 0.03 };
    setPage({ ...page, elements: [...page.elements, copy] });
    setSelected(copy.id);
  };
  const deleteElement = () => {
    if (!element) return;
    setPage({ ...page, elements: page.elements.filter((e) => e.id !== element.id) });
    setSelected(null);
  };

  // Pages
  const addPage = () => {
    setPages([...doc.pages.slice(0, pageIndex + 1), { id: newId(), background: "#ffffff", elements: [] }, ...doc.pages.slice(pageIndex + 1)]);
    setPageIndex(pageIndex + 1);
    setSelected(null);
  };
  const duplicatePage = () => {
    const copy = { ...page, id: newId(), elements: page.elements.map((e) => ({ ...e, id: newId() })) };
    setPages([...doc.pages.slice(0, pageIndex + 1), copy, ...doc.pages.slice(pageIndex + 1)]);
    setPageIndex(pageIndex + 1);
    setSelected(null);
  };
  const deletePage = () => {
    if (doc.pages.length < 2) return;
    setPages(doc.pages.filter((_, i) => i !== pageIndex));
    setPageIndex(Math.max(0, pageIndex - 1));
    setSelected(null);
  };
  const movePage = (delta: 1 | -1) => {
    const j = pageIndex + delta;
    if (j < 0 || j >= doc.pages.length) return;
    const pages = [...doc.pages];
    [pages[pageIndex], pages[j]] = [pages[j]!, pages[pageIndex]!];
    setPages(pages);
    setPageIndex(j);
  };

  // Pointer handling, in design pixels.
  const point = (e: { clientX: number; clientY: number }) => {
    const ctm = svg.current?.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };
  const begin = (mode: Drag["mode"], el: DesignElement, e: ReactPointerEvent) => {
    if (!canEdit) return;
    e.stopPropagation();
    setSelected(el.id);
    drag.current = { mode, id: el.id, start: point(e), orig: el, base: doc, moved: false };
    svg.current?.setPointerCapture(e.pointerId);
  };
  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = point(e);
    const dx = p.x - d.start.x;
    const dy = p.y - d.start.y;
    if (!d.moved && Math.hypot(dx, dy) < 2) return;
    d.moved = true;
    let change: Partial<DesignElement>;
    if (d.mode === "move") change = { x: Math.round(d.orig.x + dx), y: Math.round(d.orig.y + dy) };
    else if (d.mode === "resize") change = { w: Math.max(4, Math.round(d.orig.w + dx)), h: Math.max(4, Math.round(d.orig.h + dy)) };
    else {
      const cx = d.orig.x + d.orig.w / 2;
      const cy = d.orig.y + d.orig.h / 2;
      change = { rotation: Math.round((Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI + 90) };
    }
    const base = d.base.pages[pageIndex]!;
    preview({
      pages: d.base.pages.map((pg, i) =>
        i === pageIndex
          ? { ...base, elements: base.elements.map((el) => (el.id === d.id ? ({ ...el, ...change } as DesignElement) : el)) }
          : pg,
      ),
    });
  };
  const end = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved) commit(editor.docRef.current, d.base);
  };

  useEffect(() => {
    if (!canEdit) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable], [role=dialog]")) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) editor.redo();
        else editor.undo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && element) {
        e.preventDefault();
        deleteElement();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const handle = unit / 40;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-3">
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-card p-1">
            <Button variant="ghost" size="icon-sm" aria-label="Add text" onClick={() => addText()}><Type /></Button>
            <Button variant="ghost" size="icon-sm" aria-label="Add rectangle" onClick={() => addShape("rect")}><Square /></Button>
            <Button variant="ghost" size="icon-sm" aria-label="Add ellipse" onClick={() => addShape("ellipse")}><Circle /></Button>
            <Button variant="ghost" size="icon-sm" aria-label="Add line" onClick={() => addShape("line")}><Minus /></Button>
            <span className="mx-1 h-5 w-px bg-border" />
            <Button variant="ghost" size="icon-sm" aria-label="Undo" disabled={!editor.canUndo} onClick={editor.undo}><Undo2 /></Button>
            <Button variant="ghost" size="icon-sm" aria-label="Redo" disabled={!editor.canRedo} onClick={editor.redo}><Redo2 /></Button>
            <span className="mx-1 h-5 w-px bg-border" />
            <Button variant="ghost" size="icon-sm" aria-label="Bring forward" disabled={!element} onClick={() => layer(1)}><ArrowUp /></Button>
            <Button variant="ghost" size="icon-sm" aria-label="Send backward" disabled={!element} onClick={() => layer(-1)}><ArrowDown /></Button>
            <Button variant="ghost" size="icon-sm" aria-label="Duplicate element" disabled={!element} onClick={duplicateElement}><Copy /></Button>
            <Button variant="ghost" size="icon-sm" aria-label="Delete element" disabled={!element} onClick={deleteElement}><Trash2 /></Button>
          </div>
        ) : null}

        <div
          data-testid="canvas-area"
          className="flex min-h-[320px] items-center justify-center rounded-md bg-muted p-4 md:p-8"
          onPointerDown={() => setSelected(null)}
        >
          <PageSvg
            ref={svg}
            data-testid="canvas"
            page={page}
            width={W}
            height={H}
            imageHref={imageHref}
            className="max-h-[70vh] max-w-full touch-none shadow-md select-none"
            style={{ aspectRatio: `${W} / ${H}`, width: W >= H ? "100%" : "auto", height: W >= H ? "auto" : "70vh" }}
            onPointerMove={onMove}
            onPointerUp={end}
            onPointerCancel={end}
            renderElement={(el, node) => (
              <g
                key={el.id}
                data-testid="element"
                data-type={el.type}
                className={canEdit ? "cursor-move" : undefined}
                onPointerDown={(e) => begin("move", el, e)}
              >
                {node}
                <rect x={el.x} y={el.y} width={el.w} height={el.h} transform={rotation(el)} fill="transparent" />
              </g>
            )}
            overlay={
              element && canEdit ? (
                <g transform={rotation(element)} pointerEvents="none">
                  <rect
                    x={element.x}
                    y={element.y}
                    width={element.w}
                    height={element.h}
                    fill="none"
                    className="stroke-primary"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                  <rect
                    data-testid="resize-handle"
                    x={element.x + element.w - handle / 2}
                    y={element.y + element.h - handle / 2}
                    width={handle}
                    height={handle}
                    className="cursor-nwse-resize fill-background stroke-primary"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="all"
                    onPointerDown={(e) => begin("resize", element, e)}
                  />
                  <circle
                    data-testid="rotate-handle"
                    cx={element.x + element.w / 2}
                    cy={element.y - handle * 2}
                    r={handle / 2}
                    className="cursor-grab fill-background stroke-primary"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="all"
                    onPointerDown={(e) => begin("rotate", element, e)}
                  />
                </g>
              ) : null
            }
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {doc.pages.map((p, i) => (
            <button
              key={p.id}
              type="button"
              data-testid="page-thumb"
              aria-label={`Page ${i + 1}`}
              aria-current={i === pageIndex}
              onClick={() => {
                setPageIndex(i);
                setSelected(null);
              }}
              className="flex h-16 w-20 items-center justify-center rounded-md border border-border bg-muted p-1 aria-[current=true]:border-primary aria-[current=true]:ring-2 aria-[current=true]:ring-primary/30"
            >
              <PageSvg page={p} width={W} height={H} imageHref={imageHref} className="max-h-full max-w-full" style={{ aspectRatio: `${W} / ${H}` }} />
            </button>
          ))}
          {canEdit ? (
            <div className="flex flex-wrap gap-1">
              <Button variant="outline" size="sm" onClick={addPage}><Plus /> Add page</Button>
              <Button variant="ghost" size="sm" onClick={duplicatePage}>Duplicate page</Button>
              <Button variant="ghost" size="sm" disabled={doc.pages.length < 2} onClick={deletePage}>Delete page</Button>
              <Button variant="ghost" size="icon-sm" aria-label="Move page left" disabled={pageIndex === 0} onClick={() => movePage(-1)}><ArrowLeft /></Button>
              <Button variant="ghost" size="icon-sm" aria-label="Move page right" disabled={pageIndex >= doc.pages.length - 1} onClick={() => movePage(1)}><ArrowRight /></Button>
            </div>
          ) : null}
          <span className="text-xs text-muted-foreground">
            Page {pageIndex + 1} of {doc.pages.length}
          </span>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))} className="w-full shrink-0 lg:w-80">
        <TabsList className="w-full">
          {canEdit ? <TabsTrigger value="edit">Edit</TabsTrigger> : null}
          {canEdit ? <TabsTrigger value="uploads">Uploads</TabsTrigger> : null}
          {canEdit ? <TabsTrigger value="brand">Brand</TabsTrigger> : null}
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>
        {canEdit ? (
          <TabsContent value="edit" className="pt-3">
            <PropertiesPanel
              element={element}
              page={page}
              onElement={(change) => element && updateElement(element.id, change)}
              onBackground={(background) => setPage({ ...page, background })}
            />
          </TabsContent>
        ) : null}
        {canEdit ? (
          <TabsContent value="uploads" className="pt-3">
            {uploads.length === 0 ? (
              <p className="text-sm text-muted-foreground">No uploads yet. Add images on the Uploads page.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {uploads.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    data-testid="place-upload"
                    className="space-y-1 rounded-md border border-border bg-card p-1.5 text-left hover:bg-muted"
                    onClick={(e) => {
                      const img = e.currentTarget.querySelector("img");
                      addImage("upload", u.id, img ? { w: img.naturalWidth, h: img.naturalHeight } : undefined);
                    }}
                  >
                    <span className="flex aspect-square items-center justify-center overflow-hidden rounded bg-muted">
                      <img src={`/files/u/${u.id}`} alt="" className="max-h-full max-w-full object-contain" />
                    </span>
                    <span className="block truncate text-xs">{u.name}</span>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        ) : null}
        {canEdit ? (
          <TabsContent value="brand" className="pt-3">
            <BrandPanel
              brand={brand}
              element={element}
              onColor={(hex) => {
                if (!element) return setPage({ ...page, background: hex });
                if (element.type === "text") updateElement(element.id, { color: hex });
                else if (element.type === "line") updateElement(element.id, { stroke: hex });
                else if (element.type !== "image") updateElement(element.id, { fill: hex });
              }}
              onFont={(font, role) => {
                const weight = role === "body" ? "400" : "700";
                if (element?.type === "text") updateElement(element.id, { fontFamily: font, fontWeight: weight });
                else addText(font, weight, Math.round(unit / (role === "heading" ? 9 : role === "subheading" ? 14 : 20)));
              }}
              onLogo={(id, natural) => addImage("logo", id, natural)}
            />
          </TabsContent>
        ) : null}
        <TabsContent value="comments" className="pt-3">
          <CommentsPanel designId={design.id} pageIndex={pageIndex} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
