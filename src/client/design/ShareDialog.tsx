import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { message } from "@/client/design/NameDialog";
import { getSharing, setLinkAccess, setShare } from "@/serverFunctions/designs";

type Sharing = Awaited<ReturnType<typeof getSharing>>;
const ROLE_LABEL = { view: "Can view", edit: "Can edit" } as const;

function Choice<T extends string>({
  value,
  options,
  onChange,
  testid,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  testid: (v: T) => string;
}) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <Button
          key={o.value}
          type="button"
          size="sm"
          data-testid={testid(o.value)}
          aria-pressed={value === o.value}
          variant={value === o.value ? "secondary" : "ghost"}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}

const ROLES = [
  { value: "view" as const, label: ROLE_LABEL.view },
  { value: "edit" as const, label: ROLE_LABEL.edit },
];

export function ShareDialog({ designId, onClose }: { designId: string; onClose: () => void }) {
  const [sharing, setSharing] = useState<Sharing | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"view" | "edit">("view");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => setSharing(await getSharing({ data: { id: designId } })), [designId]);
  useEffect(() => {
    void load();
  }, [load]);

  async function run(work: () => Promise<unknown>) {
    setError(null);
    try {
      await work();
      await load();
      return true;
    } catch (cause) {
      setError(message(cause));
      return false;
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!email.trim()) return;
            setPending(true);
            if (await run(() => setShare({ data: { id: designId, email: email.trim(), role } }))) setEmail("");
            setPending(false);
          }}
        >
          <Label htmlFor="share-email">Email</Label>
          <div className="flex flex-wrap gap-2">
            <Input id="share-email" type="email" placeholder="name@company.com" className="min-w-0 flex-1" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Choice value={role} options={ROLES} onChange={setRole} testid={(v) => `share-role-${v}`} />
            <Button type="submit" pending={pending}>
              Add
            </Button>
          </div>
        </form>
        {sharing ? (
          <div className="space-y-2">
            {sharing.shares.map((s) => (
              <div key={s.email} data-testid="share-row" className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{s.email}</span>
                <div className="flex items-center gap-1">
                  <Choice
                    value={s.role}
                    options={ROLES}
                    testid={(v) => `row-role-${v}`}
                    onChange={(r) => run(() => setShare({ data: { id: designId, email: s.email, role: r } }))}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${s.email}`}
                    onClick={() => run(() => setShare({ data: { id: designId, email: s.email, role: "none" } }))}
                  >
                    <X />
                  </Button>
                </div>
              </div>
            ))}
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-sm font-medium">Anyone in the organization with the link</p>
              <Choice
                value={sharing.linkAccess}
                options={[{ value: "none" as const, label: "No access" }, ...ROLES]}
                testid={(v) => `link-${v}`}
                onChange={(v) => run(() => setLinkAccess({ data: { id: designId, linkAccess: v } }))}
              />
            </div>
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
