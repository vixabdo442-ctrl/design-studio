import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { message } from "@/client/design/NameDialog";
import { PRESETS } from "@/lib/design";
import { createDesign } from "@/serverFunctions/designs";

export function NewDesignDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<string>("social");
  const [name, setName] = useState("");
  const [width, setWidth] = useState("1200");
  const [height, setHeight] = useState("800");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chosen = PRESETS.find((p) => p.key === preset);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const w = chosen?.width ?? Number(width);
    const h = chosen?.height ?? Number(height);
    if (!name.trim()) return setError("Name is required");
    if (!Number.isInteger(w) || !Number.isInteger(h) || w < 16 || h < 16 || w > 8000 || h > 8000)
      return setError("Width and height must be between 16 and 8000 px");
    setPending(true);
    setError(null);
    try {
      const { id } = await createDesign({ data: { name: name.trim(), width: w, height: h } });
      await navigate({ to: "/d/$id", params: { id } });
    } catch (cause) {
      setError(message(cause));
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form className="space-y-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>New design</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[...PRESETS, { key: "custom", label: "Custom size", width: 0, height: 0 }].map((p) => (
              <Button
                key={p.key}
                type="button"
                data-testid={`preset-${p.key}`}
                aria-pressed={preset === p.key}
                variant={preset === p.key ? "secondary" : "outline"}
                className="h-auto flex-col items-start gap-0.5 py-2 text-left"
                onClick={() => setPreset(p.key)}
              >
                <span>{p.label}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {p.width ? `${p.width} × ${p.height} px` : "Any size"}
                </span>
              </Button>
            ))}
          </div>
          {preset === "custom" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="custom-width">Width (px)</Label>
                <Input id="custom-width" type="number" min={16} max={8000} value={width} onChange={(e) => setWidth(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-height">Height (px)</Label>
                <Input id="custom-height" type="number" min={16} max={8000} value={height} onChange={(e) => setHeight(e.target.value)} />
              </div>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="design-name">Name</Label>
            <Input id="design-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" pending={pending}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
