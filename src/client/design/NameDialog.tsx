import { useState, type ReactNode } from "react";
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

/** A dialog asking for one name. */
export function NameDialog({
  title,
  initial = "",
  submitLabel,
  onSubmit,
  onClose,
  children,
}: {
  title: string;
  initial?: string;
  submitLabel: string;
  onSubmit: (name: string) => Promise<unknown>;
  onClose: () => void;
  children?: ReactNode;
}) {
  const [name, setName] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) return setError("Name is required");
            setPending(true);
            setError(null);
            try {
              await onSubmit(name.trim());
              onClose();
            } catch (cause) {
              setError(message(cause));
            } finally {
              setPending(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="name-dialog-input">Name</Label>
            <Input
              id="name-dialog-input"
              value={name}
              autoFocus
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {children}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" pending={pending}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function message(cause: unknown): string {
  if (cause instanceof Error && cause.message) {
    try {
      const parsed = JSON.parse(cause.message);
      if (Array.isArray(parsed) && parsed[0]?.message) return parsed[0].message;
    } catch {
      // Not a validation error.
    }
    return cause.message;
  }
  return "Something went wrong";
}
