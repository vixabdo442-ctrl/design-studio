import { useState } from "react";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { exportDesign, type ExportFormat } from "@/client/design/exporter";
import { message } from "@/client/design/NameDialog";
import type { ImageHref } from "@/client/design/PageSvg";
import type { DesignDoc } from "@/lib/design";

function Row<T extends string | number>({
  label,
  value,
  options,
  onChange,
  testid,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  testid: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <Button
            key={o.value}
            type="button"
            size="sm"
            data-testid={`${testid}-${o.value}`}
            aria-pressed={value === o.value}
            variant={value === o.value ? "secondary" : "outline"}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function ExportDialog({
  design,
  doc,
  pageIndex,
  imageHref,
  onClose,
}: {
  design: { name: string; width: number; height: number };
  doc: DesignDoc;
  pageIndex: number;
  imageHref: ImageHref;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<ExportFormat>("png");
  const [pages, setPages] = useState<"current" | "all">("current");
  const [scale, setScale] = useState<1 | 2>(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Row
            label="Format"
            testid="format"
            value={format}
            onChange={setFormat}
            options={[
              { value: "png", label: "PNG" },
              { value: "jpg", label: "JPG" },
              { value: "pdf", label: "PDF" },
            ]}
          />
          {format !== "pdf" ? (
            <Row
              label="Pages"
              testid="pages"
              value={pages}
              onChange={setPages}
              options={[
                { value: "current", label: `Page ${pageIndex + 1}` },
                { value: "all", label: `All ${doc.pages.length} pages` },
              ]}
            />
          ) : null}
          <Row
            label="Size"
            testid="scale"
            value={scale}
            onChange={setScale}
            options={[
              { value: 1, label: `1× · ${design.width} × ${design.height} px` },
              { value: 2, label: `2× · ${design.width * 2} × ${design.height * 2} px` },
            ]}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button
            pending={pending}
            onClick={async () => {
              setPending(true);
              setError(null);
              try {
                await exportDesign({ ...design, doc }, { format, pages, currentPage: pageIndex, scale }, imageHref);
                onClose();
              } catch (cause) {
                setError(message(cause));
              } finally {
                setPending(false);
              }
            }}
          >
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
