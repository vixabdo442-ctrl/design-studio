import { and, desc, eq, inArray, like, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  comments,
  designs,
  designShares,
  folders,
  uploads,
  users,
} from "@/db/schema";
import {
  blankDoc,
  copyDoc,
  docSchema,
  uploadIdsIn,
  type DesignDoc,
} from "@/lib/design";
import {
  ConflictError,
  emailOf,
  ForbiddenError,
  NotFoundError,
  type User,
} from "@/server/users";

export type Role = "owner" | "edit" | "view";
const RANK = { none: 0, view: 1, edit: 2, owner: 3 } as const;

const size = z.number().int().min(16).max(8000);
export const createDesignInput = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    width: size,
    height: size,
    doc: docSchema.optional(),
  })
  .strict();
export const idInput = z.object({ id: z.string().min(1).max(64) }).strict();
export const renameInput = z
  .object({ id: z.string().min(1), name: z.string().trim().min(1).max(120) })
  .strict();
export const moveInput = z
  .object({ id: z.string().min(1), folderId: z.string().min(1).nullable() })
  .strict();
export const saveInput = z
  .object({ version: z.number().int().min(1), doc: docSchema })
  .strict();
export const listInput = z
  .object({
    folderId: z.string().min(1).nullable().optional(),
    q: z.string().max(120).optional(),
  })
  .strict();
export const shareInput = z
  .object({
    id: z.string().min(1),
    email: z.string().trim().toLowerCase().email().max(254),
    role: z.enum(["view", "edit", "none"]),
  })
  .strict();
export const linkInput = z
  .object({ id: z.string().min(1), linkAccess: z.enum(["none", "view", "edit"]) })
  .strict();

type DesignRow = typeof designs.$inferSelect;

export interface DesignView {
  id: string;
  name: string;
  width: number;
  height: number;
  doc: DesignDoc;
  version: number;
  updatedAt: string;
  role: Role;
  folderId: string | null;
}

function view(row: DesignRow, role: Role): DesignView {
  return {
    id: row.id,
    name: row.name,
    width: row.width,
    height: row.height,
    doc: JSON.parse(row.doc) as DesignDoc,
    version: row.version,
    updatedAt: row.updatedAt,
    role,
    // Folders are the owner's own.
    folderId: role === "owner" ? row.folderId : null,
  };
}

function now(): string {
  return new Date().toISOString();
}

/** The design and what this member may do with it, or null when they may not see it. */
export async function access(
  user: User,
  id: string,
): Promise<{ row: DesignRow; role: Role } | null> {
  const [row] = await db
    .select()
    .from(designs)
    .where(and(eq(designs.id, id), eq(designs.orgId, user.orgId)));
  if (!row) return null;
  if (row.ownerId === user.id) return { row, role: "owner" };
  const [share] = await db
    .select({ role: designShares.role })
    .from(designShares)
    .where(
      and(eq(designShares.designId, id), eq(designShares.email, emailOf(user))),
    );
  const shared = share?.role ?? "none";
  const best = RANK[shared] >= RANK[row.linkAccess] ? shared : row.linkAccess;
  return best === "none" ? null : { row, role: best };
}

export async function requireAccess(user: User, id: string, needed: Role) {
  const found = await access(user, id);
  if (!found) throw new NotFoundError("Design not found");
  if (RANK[found.role] < RANK[needed]) throw new ForbiddenError("Not allowed");
  return found;
}

export async function getDesign(user: User, id: string): Promise<DesignView> {
  const { row, role } = await requireAccess(user, id, "view");
  return view(row, role);
}

export async function listMyDesigns(
  user: User,
  { folderId, q }: z.infer<typeof listInput>,
) {
  const filters = [eq(designs.orgId, user.orgId), eq(designs.ownerId, user.id)];
  const search = q?.trim();
  if (search) filters.push(like(designs.name, `%${search}%`));
  else if (folderId) filters.push(eq(designs.folderId, folderId));
  const rows = await db
    .select()
    .from(designs)
    .where(and(...filters))
    .orderBy(desc(designs.updatedAt));
  return rows
    .filter((row) => search || folderId || row.folderId === null)
    .map((row) => summary(view(row, "owner")));
}

function summary(design: DesignView) {
  return { ...design, doc: { pages: design.doc.pages.slice(0, 1) } };
}

export async function listSharedWithMe(user: User) {
  const rows = await db
    .select({ design: designs, role: designShares.role, ownerEmail: users.email })
    .from(designShares)
    .innerJoin(designs, eq(designs.id, designShares.designId))
    .leftJoin(users, eq(users.id, designs.ownerId))
    .where(
      and(
        eq(designShares.email, emailOf(user)),
        eq(designs.orgId, user.orgId),
        ne(designs.ownerId, user.id),
      ),
    )
    .orderBy(desc(designs.updatedAt));
  return rows.map((r) => ({
    ...summary(view(r.design, r.role)),
    ownerEmail: r.ownerEmail ?? "",
  }));
}

export async function createDesign(
  user: User,
  input: z.infer<typeof createDesignInput>,
): Promise<{ id: string }> {
  const id = crypto.randomUUID();
  const doc = input.doc ?? blankDoc();
  await db.insert(designs).values({
    id,
    orgId: user.orgId,
    ownerId: user.id,
    name: input.name,
    width: input.width,
    height: input.height,
    doc: JSON.stringify(doc),
    updatedAt: now(),
  });
  return { id };
}

export async function renameDesign(user: User, input: z.infer<typeof renameInput>) {
  await requireAccess(user, input.id, "edit");
  await db
    .update(designs)
    .set({ name: input.name, updatedAt: now() })
    .where(eq(designs.id, input.id));
}

export async function duplicateDesign(user: User, id: string) {
  const { row } = await requireAccess(user, id, "owner");
  return createDesign(user, {
    name: `${row.name} (copy)`,
    width: row.width,
    height: row.height,
    doc: copyDoc(JSON.parse(row.doc) as DesignDoc),
  });
}

export async function deleteDesign(user: User, id: string) {
  await requireAccess(user, id, "owner");
  await db.batch([
    db.delete(designShares).where(eq(designShares.designId, id)),
    db.delete(comments).where(eq(comments.designId, id)),
    db.delete(designs).where(eq(designs.id, id)),
  ]);
}

export async function moveDesign(user: User, input: z.infer<typeof moveInput>) {
  await requireAccess(user, input.id, "owner");
  if (input.folderId) await ownFolder(user, input.folderId);
  await db
    .update(designs)
    .set({ folderId: input.folderId })
    .where(eq(designs.id, input.id));
}

export async function ownFolder(user: User, folderId: string) {
  const [folder] = await db
    .select({ id: folders.id })
    .from(folders)
    .where(
      and(
        eq(folders.id, folderId),
        eq(folders.orgId, user.orgId),
        eq(folders.ownerId, user.id),
      ),
    );
  if (!folder) throw new NotFoundError("Folder not found");
}

/** Saves when `version` is the stored one; a stale save is refused. */
export async function saveDesign(
  user: User,
  id: string,
  input: z.infer<typeof saveInput>,
): Promise<{ version: number; updatedAt: string }> {
  const { row } = await requireAccess(user, id, "edit");
  // An image newly placed must be one of the saver's own uploads.
  const before = new Set(uploadIdsIn(JSON.parse(row.doc) as DesignDoc));
  const added = [...new Set(uploadIdsIn(input.doc))].filter((u) => !before.has(u));
  if (added.length) {
    const owned = await db
      .select({ id: uploads.id })
      .from(uploads)
      .where(
        and(
          inArray(uploads.id, added),
          eq(uploads.ownerId, user.id),
          eq(uploads.orgId, user.orgId),
        ),
      );
    if (owned.length !== added.length)
      throw new ForbiddenError("That image isn't in your uploads");
  }
  const updatedAt = now();
  const [saved] = await db
    .update(designs)
    .set({ doc: JSON.stringify(input.doc), version: input.version + 1, updatedAt })
    .where(and(eq(designs.id, id), eq(designs.version, input.version)))
    .returning({ version: designs.version });
  if (!saved) throw new ConflictError("This design was changed elsewhere");
  return { version: saved.version, updatedAt };
}

export async function getSharing(user: User, id: string) {
  const { row } = await requireAccess(user, id, "owner");
  const shares = await db
    .select({ email: designShares.email, role: designShares.role })
    .from(designShares)
    .where(eq(designShares.designId, id))
    .orderBy(designShares.createdAt);
  return { linkAccess: row.linkAccess, shares };
}

export async function setShare(user: User, input: z.infer<typeof shareInput>) {
  await requireAccess(user, input.id, "owner");
  if (input.email === emailOf(user)) throw new ForbiddenError("You own this design");
  if (input.role === "none") {
    await db
      .delete(designShares)
      .where(
        and(eq(designShares.designId, input.id), eq(designShares.email, input.email)),
      );
    return;
  }
  await db
    .insert(designShares)
    .values({ designId: input.id, email: input.email, role: input.role })
    .onConflictDoUpdate({
      target: [designShares.designId, designShares.email],
      set: { role: input.role },
    });
}

export async function setLinkAccess(user: User, input: z.infer<typeof linkInput>) {
  await requireAccess(user, input.id, "owner");
  await db
    .update(designs)
    .set({ linkAccess: input.linkAccess })
    .where(eq(designs.id, input.id));
}
