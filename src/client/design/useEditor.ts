import { useCallback, useEffect, useRef, useState } from "react";
import type { DesignDoc } from "@/lib/design";

export type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";

/** The document with undo/redo for this session, saved to the server as it changes. */
export function useEditorDoc(design: { id: string; doc: DesignDoc; version: number }, canEdit: boolean) {
  const [doc, setDocState] = useState(design.doc);
  const docRef = useRef(design.doc);
  const past = useRef<DesignDoc[]>([]);
  const future = useRef<DesignDoc[]>([]);
  const [, bump] = useState(0);
  const version = useRef(design.version);
  const [save, setSave] = useState<SaveState>("saved");
  const saveRef = useRef<SaveState>("saved");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

  const setStatus = (s: SaveState) => {
    saveRef.current = s;
    setSave(s);
  };

  const flush = useCallback(async () => {
    if (!canEdit || saveRef.current === "conflict") return;
    if (inFlight.current) return;
    inFlight.current = true;
    const sending = docRef.current;
    setStatus("saving");
    try {
      const res = await fetch(`/api/designs/${design.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version: version.current, doc: sending }),
      });
      if (res.status === 409) return setStatus("conflict");
      if (!res.ok) return setStatus("error");
      version.current = ((await res.json()) as { version: number }).version;
      setStatus(docRef.current === sending ? "saved" : "dirty");
    } catch {
      setStatus("error");
    } finally {
      inFlight.current = false;
      if (saveRef.current === "dirty") schedule();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, design.id]);

  function schedule() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 600);
  }

  const apply = (next: DesignDoc) => {
    docRef.current = next;
    setDocState(next);
    if (!canEdit || saveRef.current === "conflict") return;
    setStatus("dirty");
    schedule();
  };

  /** A change that undo can take back; `base` is the state before a drag began. */
  const commit = (next: DesignDoc, base: DesignDoc = docRef.current) => {
    past.current.push(base);
    if (past.current.length > 200) past.current.shift();
    future.current = [];
    apply(next);
    bump((n) => n + 1);
  };

  /** A live change during a drag, recorded once by `commit` at the end. */
  const preview = (next: DesignDoc) => {
    docRef.current = next;
    setDocState(next);
  };

  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(docRef.current);
    apply(prev);
    bump((n) => n + 1);
  };
  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(docRef.current);
    apply(next);
    bump((n) => n + 1);
  };

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (saveRef.current === "dirty" || saveRef.current === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  return {
    doc,
    docRef,
    commit,
    preview,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    save,
  };
}
