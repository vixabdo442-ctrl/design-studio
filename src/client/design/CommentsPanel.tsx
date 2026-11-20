import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Checkbox } from "@/client/components/ui/checkbox";
import { Textarea } from "@/client/components/ui/textarea";
import { formatDate } from "@/client/design/DesignCard";
import { message } from "@/client/design/NameDialog";
import { addComment, deleteComment, listComments, resolveThread } from "@/serverFunctions/designs";

type Thread = Awaited<ReturnType<typeof listComments>>[number];

export function CommentsPanel({ designId, pageIndex }: { designId: string; pageIndex: number }) {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [body, setBody] = useState("");
  const [onPage, setOnPage] = useState(false);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    setThreads(await listComments({ data: { id: designId } }));
  }, [designId]);
  useEffect(() => {
    void load();
  }, [load]);

  async function act(work: () => Promise<unknown>) {
    try {
      await work();
      await load();
    } catch (cause) {
      toast.error(message(cause));
    }
  }

  return (
    <div className="space-y-4">
      <form
        className="space-y-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!body.trim()) return;
          setPending(true);
          await act(() =>
            addComment({ data: { designId, body: body.trim(), pageIndex: onPage ? pageIndex : null, parentId: null } }),
          );
          setBody("");
          setPending(false);
        }}
      >
        <Textarea aria-label="Add a comment" placeholder="Add a comment" rows={2} value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} />
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox aria-label="On this page" checked={onPage} onCheckedChange={(v) => setOnPage(v === true)} />
            On page {pageIndex + 1}
          </label>
          <Button type="submit" size="sm" pending={pending} disabled={!body.trim()}>
            Comment
          </Button>
        </div>
      </form>
      {threads === null ? null : threads.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="space-y-3">
          {threads.map((t) => (
            <ThreadView key={t.id} thread={t} act={act} designId={designId} />
          ))}
        </div>
      )}
    </div>
  );
}

function ThreadView({
  thread,
  act,
  designId,
}: {
  thread: Thread;
  act: (work: () => Promise<unknown>) => Promise<void>;
  designId: string;
}) {
  const [reply, setReply] = useState("");
  return (
    <div data-testid="comment-thread" className="space-y-3 rounded-md border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {thread.pageIndex !== null ? <Badge variant="outline">Page {thread.pageIndex + 1}</Badge> : null}
        {thread.resolved ? (
          <Badge variant="success" data-testid="resolved">
            Resolved
          </Badge>
        ) : null}
      </div>
      {[thread, ...thread.replies].map((c) => (
        <div key={c.id} className="space-y-0.5">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="truncate">
              {c.authorEmail} · {formatDate(c.createdAt)}
            </span>
            {c.mine ? (
              <Button variant="ghost" size="xs" onClick={() => act(() => deleteComment({ data: { id: c.id } }))}>
                Delete
              </Button>
            ) : null}
          </div>
          <p className="text-sm whitespace-pre-wrap">{c.body}</p>
        </div>
      ))}
      <form
        className="space-y-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!reply.trim()) return;
          await act(() => addComment({ data: { designId, body: reply.trim(), pageIndex: null, parentId: thread.id } }));
          setReply("");
        }}
      >
        <Textarea aria-label="Reply" placeholder="Reply" rows={1} value={reply} maxLength={2000} onChange={(e) => setReply(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => act(() => resolveThread({ data: { id: thread.id, resolved: !thread.resolved } }))}
          >
            {thread.resolved ? "Reopen" : "Resolve"}
          </Button>
          <Button type="submit" variant="outline" size="sm" disabled={!reply.trim()}>
            Reply
          </Button>
        </div>
      </form>
    </div>
  );
}
