import { and, asc, eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { requireAccess } from "@/server/designs";
import { emailOf, ForbiddenError, NotFoundError, type User } from "@/server/users";

export const addCommentInput = z
  .object({
    designId: z.string().min(1),
    body: z.string().trim().min(1, "Write a comment").max(2000),
    pageIndex: z.number().int().min(0).nullable(),
    parentId: z.string().min(1).nullable(),
  })
  .strict();
export const resolveInput = z
  .object({ id: z.string().min(1), resolved: z.boolean() })
  .strict();
export const commentIdInput = z.object({ id: z.string().min(1) }).strict();

export async function listComments(user: User, designId: string) {
  await requireAccess(user, designId, "view");
  const rows = await db
    .select()
    .from(comments)
    .where(eq(comments.designId, designId))
    .orderBy(asc(comments.createdAt), asc(comments.id));
  const show = (c: (typeof rows)[number]) => ({
    id: c.id,
    body: c.body,
    authorEmail: c.authorEmail,
    pageIndex: c.pageIndex,
    resolved: c.resolved,
    createdAt: c.createdAt,
    mine: c.authorId === user.id,
  });
  return rows
    .filter((c) => !c.parentId)
    .map((c) => ({
      ...show(c),
      replies: rows.filter((r) => r.parentId === c.id).map(show),
    }));
}

export async function addComment(user: User, input: z.infer<typeof addCommentInput>) {
  await requireAccess(user, input.designId, "view");
  let pageIndex = input.pageIndex;
  if (input.parentId) {
    const [parent] = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, input.parentId), eq(comments.designId, input.designId)));
    if (!parent || parent.parentId) throw new NotFoundError("Thread not found");
    pageIndex = parent.pageIndex;
  }
  const id = crypto.randomUUID();
  await db.insert(comments).values({
    id,
    designId: input.designId,
    authorId: user.id,
    authorEmail: emailOf(user),
    parentId: input.parentId,
    pageIndex,
    body: input.body,
  });
  return { id };
}

async function findComment(user: User, id: string) {
  const [row] = await db.select().from(comments).where(eq(comments.id, id));
  if (!row) throw new NotFoundError("Comment not found");
  await requireAccess(user, row.designId, "view");
  return row;
}

export async function resolveThread(user: User, input: z.infer<typeof resolveInput>) {
  const row = await findComment(user, input.id);
  if (row.parentId) throw new NotFoundError("Thread not found");
  await db.update(comments).set({ resolved: input.resolved }).where(eq(comments.id, row.id));
}

export async function deleteComment(user: User, id: string) {
  const row = await findComment(user, id);
  if (row.authorId !== user.id) throw new ForbiddenError("You can delete only your own comments");
  await db.delete(comments).where(or(eq(comments.id, id), eq(comments.parentId, id)));
}
