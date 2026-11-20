import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Trash2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/client/components/AppShell";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { message } from "@/client/design/NameDialog";
import { uploadFile } from "@/client/design/uploadFile";
import { FONTS } from "@/lib/design";
import { deleteLogo, getBrand, updateBrand } from "@/serverFunctions/designs";

export const Route = createFileRoute("/brand")({
  loader: () => getBrand({ data: {} }),
  head: () => ({ meta: [{ title: "Brand kit · Design Studio" }] }),
  component: Brand,
});

const ROLES = [
  { key: "headingFont", label: "Heading", testid: "font-heading" },
  { key: "subheadingFont", label: "Subheading", testid: "font-subheading" },
  { key: "bodyFont", label: "Body", testid: "font-body" },
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Brand() {
  const brand = Route.useLoaderData();
  const router = useRouter();
  const [colors, setColors] = useState(brand.colors);
  const [fonts, setFonts] = useState({
    headingFont: brand.headingFont,
    subheadingFont: brand.subheadingFont,
    bodyFont: brand.bodyFont,
  });
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#4f46e5");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const edit = brand.canEdit;

  async function save() {
    setSaving(true);
    try {
      await updateBrand({ data: { colors, ...fonts } });
      toast.success("Brand kit saved");
      await router.invalidate();
    } catch (cause) {
      toast.error(message(cause));
    } finally {
      setSaving(false);
    }
  }

  async function addLogo(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadFile("/api/brand/logos", file);
      await router.invalidate();
    } catch (cause) {
      toast.error(message(cause));
    } finally {
      setUploading(false);
      if (logoInput.current) logoInput.current.value = "";
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Brand kit"
        description={edit ? undefined : "Admins edit the brand kit. Apply it from the Brand tab in the editor."}
        actions={
          edit ? (
            <Button pending={saving} onClick={save}>
              Save brand kit
            </Button>
          ) : undefined
        }
      />

      <Section title="Colors">
        {colors.length === 0 ? <p className="text-sm text-muted-foreground">No colors yet.</p> : null}
        <div className="flex flex-wrap gap-3">
          {colors.map((c, i) => (
            <div key={`${c.hex}-${i}`} data-testid="brand-color" className="flex items-center gap-2 rounded-md border border-border bg-card py-1.5 pr-2 pl-1.5">
              <span className="size-7 rounded border border-border" style={{ backgroundColor: c.hex }} />
              <span className="text-sm">
                {c.name || c.hex}
                <span className="ml-1 text-xs text-muted-foreground">{c.hex}</span>
              </span>
              {edit ? (
                <Button variant="ghost" size="icon-xs" aria-label={`Remove ${c.name || c.hex}`} onClick={() => setColors(colors.filter((_, j) => j !== i))}>
                  <X />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
        {edit ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input aria-label="Color name" placeholder="Name" value={colorName} maxLength={40} onChange={(e) => setColorName(e.target.value)} className="w-40" />
            <Input aria-label="Color value" type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} className="w-14 p-1" />
            <Button
              variant="outline"
              disabled={colors.length >= 24}
              onClick={() => {
                setColors([...colors, { name: colorName.trim(), hex: colorHex }]);
                setColorName("");
              }}
            >
              Add color
            </Button>
          </div>
        ) : null}
      </Section>

      <Section title="Fonts">
        <div className="space-y-4">
          {ROLES.map((role) => (
            <div key={role.key} data-testid={role.testid} className="space-y-2">
              <p className="text-sm font-medium">
                {role.label}
                {!edit ? <span className="ml-2 font-normal text-muted-foreground">{fonts[role.key] ?? "Not set"}</span> : null}
              </p>
              {edit ? (
                <div className="flex flex-wrap gap-1.5">
                  {FONTS.map((font) => (
                    <Button
                      key={font}
                      size="sm"
                      variant={fonts[role.key] === font ? "secondary" : "outline"}
                      aria-pressed={fonts[role.key] === font}
                      style={{ fontFamily: font }}
                      onClick={() => setFonts({ ...fonts, [role.key]: fonts[role.key] === font ? null : font })}
                    >
                      {font}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Logos">
        {brand.logos.length === 0 ? <p className="text-sm text-muted-foreground">No logos yet.</p> : null}
        <div className="flex flex-wrap gap-3">
          {brand.logos.map((logo) => (
            <div key={logo.id} data-testid="logo" className="relative flex size-28 items-center justify-center rounded-md border border-border bg-muted p-2">
              <img src={`/files/logo/${logo.id}`} alt={logo.name} className="max-h-full max-w-full object-contain" />
              {edit ? (
                <Button
                  variant="secondary"
                  size="icon-xs"
                  className="absolute top-1 right-1"
                  aria-label={`Delete ${logo.name}`}
                  onClick={async () => {
                    await deleteLogo({ data: { id: logo.id } });
                    await router.invalidate();
                  }}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
        {edit ? (
          <>
            <input ref={logoInput} data-testid="logo-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(e) => addLogo(e.target.files)} />
            <Button variant="outline" pending={uploading} onClick={() => logoInput.current?.click()}>
              <Upload /> Add logo
            </Button>
          </>
        ) : null}
      </Section>
    </AppShell>
  );
}
