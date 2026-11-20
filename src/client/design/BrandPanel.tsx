import { Button } from "@/client/components/ui/button";
import type { DesignElement } from "@/lib/design";

export interface Brand {
  colors: { name: string; hex: string }[];
  headingFont: string | null;
  subheadingFont: string | null;
  bodyFont: string | null;
  logos: { id: string; name: string }[];
}

export function BrandPanel({
  brand,
  onColor,
  onFont,
  onLogo,
}: {
  brand: Brand;
  element: DesignElement | null;
  onColor: (hex: string) => void;
  onFont: (font: string, role: "heading" | "subheading" | "body") => void;
  onLogo: (id: string, natural?: { w: number; h: number }) => void;
}) {
  const fonts = (
    [
      ["heading", "Heading", brand.headingFont],
      ["subheading", "Subheading", brand.subheadingFont],
      ["body", "Body", brand.bodyFont],
    ] as const
  ).filter(([, , font]) => font);
  const empty = brand.colors.length === 0 && fonts.length === 0 && brand.logos.length === 0;
  if (empty) return <p className="text-sm text-muted-foreground">The brand kit is empty. Admins set it up on the Brand kit page.</p>;
  return (
    <div className="space-y-5">
      {brand.colors.length ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Colors</p>
          <div className="flex flex-wrap gap-2">
            {brand.colors.map((c, i) => (
              <button
                key={i}
                type="button"
                data-testid="brand-swatch"
                onClick={() => onColor(c.hex)}
                className="flex items-center gap-1.5 rounded-md border border-border bg-card py-1 pr-2 pl-1 text-xs hover:bg-muted"
              >
                <span className="size-5 rounded border border-border" style={{ backgroundColor: c.hex }} />
                {c.name || c.hex}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {fonts.length ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Fonts</p>
          <div className="flex flex-col gap-1.5">
            {fonts.map(([role, label, font]) => (
              <Button key={role} variant="outline" className="justify-start" style={{ fontFamily: font! }} onClick={() => onFont(font!, role)}>
                {label} · {font}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      {brand.logos.length ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Logos</p>
          <div className="grid grid-cols-3 gap-2">
            {brand.logos.map((logo) => (
              <button
                key={logo.id}
                type="button"
                data-testid="brand-logo"
                aria-label={`Place ${logo.name}`}
                className="flex aspect-square items-center justify-center rounded-md border border-border bg-muted p-1.5 hover:bg-card"
                onClick={(e) => {
                  const img = e.currentTarget.querySelector("img");
                  onLogo(logo.id, img ? { w: img.naturalWidth, h: img.naturalHeight } : undefined);
                }}
              >
                <img src={`/files/logo/${logo.id}`} alt="" className="max-h-full max-w-full object-contain" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
