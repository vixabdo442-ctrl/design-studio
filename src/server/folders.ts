import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { designs, folders, uploads } from "@/db/schema";
import { ownFolder } from "@/server/designs";
import type { User } from "@/server/users";

const name = z.string().trim().min(1, "Name is required").max(80);
export const createFolderInput = z.object({ name }).strict();
export const renameFolderInput = z.object({ id: z.string().min(1), name }).strict();
export const folderIdInput = z.object({ id: z.string().min(1) }).strict();

export function listFolders(user: User) {
  return db
    .select({ id: folders.id, name: folders.name })
    .from(folders)
    .where(and(eq(folders.orgId, user.orgId), eq(folders.ownerId, user.id)))
    .orderBy(asc(folders.name));
}

export async function createFolder(user: User, input: z.infer<typeof createFolderInput>) {
  const id = crypto.randomUUID();
  await db
    .insert(folders)
    .values({ id, orgId: user.orgId, ownerId: user.id, name: input.name });
  return { id };
}

export async function renameFolder(user: User, input: z.infer<typeof renameFolderInput>) {
  await ownFolder(user, input.id);
  await db.update(folders).set({ name: input.name }).where(eq(folders.id, input.id));
}

/** Deletes the folder; what was in it goes back to the top level. */
export async function deleteFolder(user: User, id: string) {
  await ownFolder(user, id);
  await db.batch([
    db
      .update(designs)
      .set({ folderId: null })
      .where(and(eq(designs.folderId, id), eq(designs.ownerId, user.id))),
    db
      .update(uploads)
      .set({ folderId: null })
      .where(and(eq(uploads.folderId, id), eq(uploads.ownerId, user.id))),
    db.delete(folders).where(eq(folders.id, id)),
  ]);
}
