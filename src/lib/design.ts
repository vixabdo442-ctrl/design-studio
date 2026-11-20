import { z } from "zod";

// The design document, shared by the editor, the server and export.

export const FONTS = [
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Trebuchet MS",
  "Impact",
] as const;

export const PRESETS = [
  { key: "social", label: "Social post", width: 1080, height: 1080 },
  { key: "story", label: "Story", width: 1080, height: 1920 },
  { key: "presentation", label: "Presentation", width: 1920, height: 1080 },
  { key: "a4", label: "A4 poster", width: 2480, height: 3508 },
  { key: "flyer", label: "Flyer", width: 1275, height: 1650 },
] as const;

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const num = z.number().finite();

const base = {
  id: z.string().min(1).max(64),
  x: num,
  y: num,
  w: num.min(1),
  h: num.min(1),
  rotation: num.default(0),
};

const textElement = z.object({
  ...base,
  type: z.literal("text"),
  text: z.string().max(5000),
  fontFamily: z.string().max(64),
  fontSize: num.min(4).max(1000),
  fontWeight: z.enum(["400", "700"]),
  color,
  align: z.enum(["left", "center", "right"]),
});

const shapeElement = z.object({
  ...base,
  type: z.enum(["rect", "ellipse", "line"]),
  fill: color.nullable(),
  stroke: color.nullable(),
  strokeWidth: num.min(0).max(500),
});

const imageElement = z.object({
  ...base,
  type: z.literal("image"),
  source: z.enum(["upload", "logo"]),
  assetId: z.string().min(1).max(64),
});

export const elementSchema = z.discriminatedUnion("type", [
  textElement,
  shapeElement,
  imageElement,
]);

export const pageSchema = z.object({
  id: z.string().min(1).max(64),
  background: color,
  elements: z.array(elementSchema).max(500),
});

export const docSchema = z.object({
  pages: z.array(pageSchema).min(1).max(100),
});

export type DesignElement = z.infer<typeof elementSchema>;
export type TextElement = z.infer<typeof textElement>;
export type ShapeElement = z.infer<typeof shapeElement>;
export type ImageElement = z.infer<typeof imageElement>;
export type DesignPage = z.infer<typeof pageSchema>;
export type DesignDoc = z.infer<typeof docSchema>;

export function newId(): string {
  return crypto.randomUUID().slice(0, 12);
}

export function blankDoc(): DesignDoc {
  return { pages: [{ id: newId(), background: "#ffffff", elements: [] }] };
}

/** The same document with fresh page and element ids. */
export function copyDoc(doc: DesignDoc): DesignDoc {
  return {
    pages: doc.pages.map((page) => ({
      ...page,
      id: newId(),
      elements: page.elements.map((el) => ({ ...el, id: newId() })),
    })),
  };
}

/** Upload ids an image element of the document uses. */
export function uploadIdsIn(doc: DesignDoc): string[] {
  return doc.pages.flatMap((page) =>
    page.elements.flatMap((el) =>
      el.type === "image" && el.source === "upload" ? [el.assetId] : [],
    ),
  );
}
