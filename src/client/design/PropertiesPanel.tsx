import { AlignCenter, AlignLeft, AlignRight, Bold } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { Textarea } from "@/client/components/ui/textarea";
import { FONTS, type DesignElement, type DesignPage } from "@/lib/design";

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  min,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
}) {
  return (
    <Field id={id} label={label}>
      <Input
        id={id}
        type="number"
        value={Math.round(value)}
        min={min}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (e.target.value !== "" && Number.isFinite(n) && (min === undefined || n >= min)) onChange(n);
        }}
      />
    </Field>
  );
}

function lineHeight(text: string, size: number) {
  return Math.max(1, text.split("\n").length) * size * 1.2;
}

export function PropertiesPanel({
  element,
  page,
  onElement,
  onBackground,
}: {
  element: DesignElement | null;
  page: DesignPage;
  onElement: (change: Partial<DesignElement>) => void;
  onBackground: (hex: string) => void;
}) {
  return (
    <div className="space-y-5">
      {element ? (
        <div className="space-y-4">
          {element.type === "text" ? (
            <>
              <Field id="prop-text" label="Text">
                <Textarea
                  id="prop-text"
                  rows={3}
                  value={element.text}
                  onChange={(e) => onElement({ text: e.target.value, h: lineHeight(e.target.value, element.fontSize) })}
                />
              </Field>
              <Field id="prop-font" label="Font">
                <Select value={element.fontFamily} onValueChange={(v) => v && onElement({ fontFamily: String(v) })}>
                  <SelectTrigger id="prop-font" className="w-full">
                    <SelectValue data-testid="font-value" />
                  </SelectTrigger>
                  <SelectContent>
                    {FONTS.map((f) => (
                      <SelectItem key={f} value={f} style={{ fontFamily: f }}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  id="prop-font-size"
                  label="Font size"
                  min={4}
                  value={element.fontSize}
                  onChange={(n) => onElement({ fontSize: n, h: lineHeight(element.text, n) })}
                />
                <Field id="prop-color" label="Color">
                  <Input id="prop-color" type="color" className="p-1" value={element.color} onChange={(e) => onElement({ color: e.target.value })} />
                </Field>
              </div>
              <div className="flex gap-1">
                <Button
                  variant={element.fontWeight === "700" ? "secondary" : "ghost"}
                  size="icon-sm"
                  aria-label="Bold"
                  aria-pressed={element.fontWeight === "700"}
                  onClick={() => onElement({ fontWeight: element.fontWeight === "700" ? "400" : "700" })}
                >
                  <Bold />
                </Button>
                {(
                  [
                    ["left", AlignLeft],
                    ["center", AlignCenter],
                    ["right", AlignRight],
                  ] as const
                ).map(([align, Icon]) => (
                  <Button
                    key={align}
                    variant={element.align === align ? "secondary" : "ghost"}
                    size="icon-sm"
                    aria-label={`Align ${align}`}
                    aria-pressed={element.align === align}
                    onClick={() => onElement({ align })}
                  >
                    <Icon />
                  </Button>
                ))}
              </div>
            </>
          ) : null}
          {element.type === "rect" || element.type === "ellipse" || element.type === "line" ? (
            <div className="grid grid-cols-2 gap-3">
              {element.type !== "line" ? (
                <Field id="prop-fill" label="Fill">
                  <Input id="prop-fill" type="color" className="p-1" value={element.fill ?? "#ffffff"} onChange={(e) => onElement({ fill: e.target.value })} />
                </Field>
              ) : null}
              <Field id="prop-stroke" label={element.type === "line" ? "Color" : "Stroke"}>
                <Input
                  id="prop-stroke"
                  type="color"
                  className="p-1"
                  value={element.stroke ?? "#000000"}
                  onChange={(e) => onElement({ stroke: e.target.value, strokeWidth: element.strokeWidth || 4 })}
                />
              </Field>
              <NumberField id="prop-stroke-width" label={element.type === "line" ? "Thickness" : "Stroke width"} min={0} value={element.strokeWidth} onChange={(n) => onElement({ strokeWidth: n })} />
              {element.type !== "line" ? (
                <div className="flex items-end gap-1">
                  <Button variant="ghost" size="sm" disabled={!element.fill} onClick={() => onElement({ fill: null })}>No fill</Button>
                  <Button variant="ghost" size="sm" disabled={!element.stroke} onClick={() => onElement({ stroke: null })}>No stroke</Button>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <NumberField id="prop-x" label="X" value={element.x} onChange={(n) => onElement({ x: n })} />
            <NumberField id="prop-y" label="Y" value={element.y} onChange={(n) => onElement({ y: n })} />
            <NumberField id="prop-w" label="Width" min={1} value={element.w} onChange={(n) => onElement({ w: n })} />
            <NumberField id="prop-h" label="Height" min={1} value={element.h} onChange={(n) => onElement({ h: n })} />
            <NumberField id="prop-rotation" label="Rotation (°)" value={element.rotation} onChange={(n) => onElement({ rotation: n })} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select something on the page to change it.</p>
      )}
      <div className="border-t border-border pt-4">
        <Field id="page-background" label="Background">
          <Input id="page-background" type="color" className="w-20 p-1" value={page.background} onChange={(e) => onBackground(e.target.value)} />
        </Field>
      </div>
    </div>
  );
}
