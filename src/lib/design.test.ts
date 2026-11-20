import { describe, expect, it } from "vitest";
import { copyDoc, docSchema, uploadIdsIn } from "@/lib/design";
import { STARTER_TEMPLATES } from "@/lib/starterTemplates";

describe("design documents", () => {
  it("accepts every bundled template", () => {
    for (const t of STARTER_TEMPLATES) expect(docSchema.safeParse(t.doc).success).toBe(true);
  });

  it("copies with fresh ids and the same content", () => {
    const doc = STARTER_TEMPLATES[0]!.doc;
    const copy = copyDoc(doc);
    expect(copy.pages[0]!.id).not.toBe(doc.pages[0]!.id);
    expect(copy.pages[0]!.elements.map((e) => e.type)).toEqual(doc.pages[0]!.elements.map((e) => e.type));
  });

  it("lists the uploads a document places, not logos", () => {
    const base = { x: 0, y: 0, w: 10, h: 10, rotation: 0 };
    const doc = docSchema.parse({
      pages: [
        {
          id: "p",
          background: "#ffffff",
          elements: [
            { ...base, id: "a", type: "image", source: "upload", assetId: "u1" },
            { ...base, id: "b", type: "image", source: "logo", assetId: "l1" },
          ],
        },
      ],
    });
    expect(uploadIdsIn(doc)).toEqual(["u1"]);
  });

  it("refuses colours that aren't hex", () => {
    expect(
      docSchema.safeParse({ pages: [{ id: "p", background: "red", elements: [] }] }).success,
    ).toBe(false);
  });
});
