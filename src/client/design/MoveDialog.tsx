import { Folder, FolderUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { message } from "@/client/design/NameDialog";

export function MoveDialog({
  folders,
  current,
  onMove,
  onClose,
}: {
  folders: { id: string; name: string }[];
  current: string | null;
  onMove: (folderId: string | null) => Promise<unknown>;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const move = async (folderId: string | null) => {
    try {
      await onMove(folderId);
      onClose();
    } catch (cause) {
      setError(message(cause));
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to folder</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {current ? (
            <Button variant="outline" className="justify-start" onClick={() => move(null)}>
              <FolderUp /> Top level
            </Button>
          ) : null}
          {folders
            .filter((f) => f.id !== current)
            .map((f) => (
              <Button key={f.id} variant="outline" className="justify-start" onClick={() => move(f.id)}>
                <Folder /> {f.name}
              </Button>
            ))}
          {folders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No folders yet. Create one on the Designs page.</p>
          ) : null}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
