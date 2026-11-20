import type { DesignDoc, DesignElement } from "@/lib/design";

export interface StarterTemplate {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  doc: DesignDoc;
}

let n = 0;
const id = () => `s${++n}`;

function text(
  x: number,
  y: number,
  w: number,
  h: number,
  value: string,
  fontSize: number,
  color: string,
  extra: Partial<{ fontFamily: string; fontWeight: "400" | "700"; align: "left" | "center" | "right" }> = {},
): DesignElement {
  return {
    id: id(),
    type: "text",
    x,
    y,
    w,
    h,
    rotation: 0,
    text: value,
    fontSize,
    color,
    fontFamily: extra.fontFamily ?? "Arial",
    fontWeight: extra.fontWeight ?? "700",
    align: extra.align ?? "left",
  };
}

function shape(
  type: "rect" | "ellipse" | "line",
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string | null,
  stroke: string | null = null,
  strokeWidth = 0,
  rotation = 0,
): DesignElement {
  return { id: id(), type, x, y, w, h, rotation, fill, stroke, strokeWidth };
}

// Bundled starting points, shown to every organization. Using one copies it.
export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "starter-sale-post",
    name: "Weekend sale",
    category: "Social",
    width: 1080,
    height: 1080,
    doc: {
      pages: [
        {
          id: id(),
          background: "#fff4e6",
          elements: [
            shape("ellipse", 620, -160, 640, 640, "#ff8c42"),
            shape("rect", 80, 640, 920, 8, "#1f2937"),
            text(80, 300, 900, 280, "WEEKEND\nSALE", 150, "#1f2937", { fontFamily: "Impact", fontWeight: "400" }),
            text(80, 700, 900, 80, "Up to 40% off all week long", 56, "#1f2937", { fontWeight: "400" }),
            text(80, 900, 900, 60, "shop.example.com", 40, "#ff8c42"),
          ],
        },
      ],
    },
  },
  {
    id: "starter-event-story",
    name: "Event night",
    category: "Story",
    width: 1080,
    height: 1920,
    doc: {
      pages: [
        {
          id: id(),
          background: "#111827",
          elements: [
            shape("rect", 0, 0, 1080, 760, "#6366f1"),
            shape("ellipse", 340, 520, 400, 400, "#f59e0b"),
            text(80, 1040, 920, 300, "Open Mic\nNight", 150, "#ffffff", { fontFamily: "Georgia", align: "center" }),
            text(80, 1420, 920, 80, "Friday · 8 pm · Main Hall", 54, "#f59e0b", { fontWeight: "400", align: "center" }),
          ],
        },
      ],
    },
  },
  {
    id: "starter-pitch-deck",
    name: "Quarterly review",
    category: "Presentation",
    width: 1920,
    height: 1080,
    doc: {
      pages: [
        {
          id: id(),
          background: "#f8fafc",
          elements: [
            shape("rect", 0, 0, 640, 1080, "#0f766e"),
            text(760, 360, 1080, 180, "Quarterly review", 120, "#0f172a"),
            text(760, 560, 1080, 80, "Results, lessons and next steps", 56, "#475569", { fontWeight: "400" }),
          ],
        },
        {
          id: id(),
          background: "#ffffff",
          elements: [
            text(120, 100, 1680, 120, "Highlights", 96, "#0f766e"),
            shape("line", 120, 240, 400, 1, null, "#0f766e", 8),
            text(120, 320, 1680, 400, "• Revenue up 18%\n• Two new markets\n• Support replies under 2 hours", 64, "#0f172a", { fontWeight: "400" }),
          ],
        },
      ],
    },
  },
  {
    id: "starter-poster",
    name: "Community garden",
    category: "Poster",
    width: 2480,
    height: 3508,
    doc: {
      pages: [
        {
          id: id(),
          background: "#ecfdf5",
          elements: [
            shape("ellipse", -400, -400, 1800, 1800, "#34d399"),
            shape("ellipse", 1500, 2500, 1400, 1400, "#065f46"),
            text(200, 1500, 2080, 700, "Community\nGarden Day", 300, "#064e3b", { fontFamily: "Georgia" }),
            text(200, 2300, 2080, 160, "Plant, share and learn together", 120, "#065f46", { fontWeight: "400" }),
          ],
        },
      ],
    },
  },
  {
    id: "starter-flyer",
    name: "Lost cat",
    category: "Flyer",
    width: 1275,
    height: 1650,
    doc: {
      pages: [
        {
          id: id(),
          background: "#ffffff",
          elements: [
            shape("rect", 0, 0, 1275, 360, "#dc2626"),
            text(60, 100, 1155, 200, "LOST CAT", 170, "#ffffff", { fontFamily: "Impact", fontWeight: "400", align: "center" }),
            shape("rect", 237, 460, 800, 600, "#f3f4f6", "#9ca3af", 6),
            text(60, 1140, 1155, 260, "Grey tabby, answers to Pepper.\nLast seen near Elm Street.", 56, "#111827", { fontWeight: "400", align: "center" }),
            text(60, 1460, 1155, 80, "Call 555-0142", 72, "#dc2626", { align: "center" }),
          ],
        },
      ],
    },
  },
];
