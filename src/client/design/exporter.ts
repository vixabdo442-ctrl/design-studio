import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DesignDoc, DesignElement } from "@/lib/design";
import { PageSvg, type ImageHref } from "@/client/design/PageSvg";

export type ExportFormat = "png" | "jpg" | "pdf";

interface Design {
  name: string;
  width: number;
  height: number;
  doc: DesignDoc;
}

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Draws one page onto a canvas at the given scale, from the saved document. */
async function renderPage(
  design: Design,
  pageIndex: number,
  scale: number,
  imageHref: ImageHref,
): Promise<HTMLCanvasElement> {
  const page = design.doc.pages[pageIndex]!;
  // Images inline as data URLs: an SVG drawn as an image loads nothing itself.
  const inlined = new Map<string, string | null>();
  for (const el of page.elements) {
    if (el.type !== "image") continue;
    const href = imageHref(el);
    if (href && !inlined.has(href)) inlined.set(href, await toDataUrl(href));
  }
  const exportPage = {
    ...page,
    elements: page.elements.filter(
      (el: DesignElement) => el.type !== "image" || inlined.get(imageHref(el) ?? ""),
    ),
  };
  const markup = renderToStaticMarkup(
    createElement(PageSvg, {
      page: exportPage,
      width: design.width,
      height: design.height,
      imageHref: (el) => inlined.get(imageHref(el) ?? "") ?? null,
    }),
  ).replace("<svg ", `<svg width="${design.width}" height="${design.height}" `);
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(design.width * scale);
  canvas.height = Math.round(design.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))), type, 0.92),
  );
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "design";
}

export async function exportDesign(
  design: Design,
  options: { format: ExportFormat; pages: "current" | "all"; currentPage: number; scale: 1 | 2 },
  imageHref: ImageHref,
): Promise<void> {
  const name = slug(design.name);
  if (options.format === "pdf") {
    const jpegs: { bytes: Uint8Array; w: number; h: number }[] = [];
    for (let i = 0; i < design.doc.pages.length; i++) {
      const canvas = await renderPage(design, i, options.scale, imageHref);
      const blob = await canvasBlob(canvas, "image/jpeg");
      jpegs.push({ bytes: new Uint8Array(await blob.arrayBuffer()), w: canvas.width, h: canvas.height });
    }
    save(buildPdf(jpegs, design.width * 0.75, design.height * 0.75), `${name}.pdf`);
    return;
  }
  const indexes =
    options.pages === "all" ? design.doc.pages.map((_, i) => i) : [options.currentPage];
  const type = options.format === "png" ? "image/png" : "image/jpeg";
  for (const i of indexes) {
    const canvas = await renderPage(design, i, options.scale, imageHref);
    const suffix = design.doc.pages.length > 1 ? `-${i + 1}` : "";
    save(await canvasBlob(canvas, type), `${name}${suffix}.${options.format}`);
    if (indexes.length > 1) await new Promise((r) => setTimeout(r, 300));
  }
}

/** A PDF with one JPEG per page, each page at the design's size in points. */
function buildPdf(pages: { bytes: Uint8Array; w: number; h: number }[], pw: number, ph: number): Blob {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    parts.push(bytes);
    length += bytes.length;
  };
  const object = (n: number, body: string) => {
    offsets[n] = length;
    push(`${n} 0 obj\n${body}\nendobj\n`);
  };
  push("%PDF-1.4\n");
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  pages.forEach((page, i) => {
    const n = 3 + i * 3;
    const w = pw.toFixed(2);
    const h = ph.toFixed(2);
    object(
      n,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 ${n + 2} 0 R >> >> /Contents ${n + 1} 0 R >>`,
    );
    const content = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
    object(n + 1, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    offsets[n + 2] = length;
    push(
      `${n + 2} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.w} /Height ${page.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`,
    );
    push(page.bytes);
    push("\nendstream\nendobj\n");
  });
  const count = 3 + pages.length * 3;
  const xref = length;
  let table = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let n = 1; n < count; n++) table += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  push(table);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}
