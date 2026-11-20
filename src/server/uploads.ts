import { and, desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { db } from "@/db";
import { uploads } from "@/db/schema";
import { uploadIdsIn, type DesignDoc } from "@/lib/design";
import { access, ownFolder } from "@/server/designs";
import { NotFoundError, type User } from "@/server/users";
import { templates } from "@/db/schema";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
] as const;

export const moveUploadInput = z
  .object({ id: z.string().min(1), folderId: z.string().min(1).nullable() })
  .strict();
export const listUploadsInput = z
  .object({
    folderId: z.string().min(1).nullable().optional(),
    all: z.boolean().optional(),
  })
  .strict();

export class UploadRefused extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Checks the file is an image of an allowed kind and size. */
export function checkImage(file: unknown): File {
  if (!(file instanceof File)) throw new UploadRefused("Choose a file", 400);
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type))
    throw new UploadRefused("Use a PNG, JPG, WebP or SVG image", 415);
  if (file.size > MAX_UPLOAD_BYTES)
    throw new UploadRefused("Images can be up to 10 MB", 413);
  if (file.size === 0) throw new UploadRefused("The file is empty", 400);
  return file;
}

export async function createUpload(user: User, file: File, folderId: string | null) {
  if (folderId) await ownFolder(user, folderId);
  const id = crypto.randomUUID();
  await env.files.put(`uploads/${id}`, file.stream(), {
    httpMetadata: { contentType: file.type },
  });
  const row = {
    id,
    orgId: user.orgId,
    ownerId: user.id,
    folderId,
    name: file.name.slice(0, 200) || "image",
    contentType: file.type,
    size: file.size,
  };
  await db.insert(uploads).values(row);
  return { id, name: row.name, contentType: row.contentType, size: row.size };
}

export function listUploads(
  user: User,
  { folderId, all }: z.infer<typeof listUploadsInput>,
) {
  const filters = [eq(uploads.orgId, user.orgId), eq(uploads.ownerId, user.id)];
  return db
    .select({
      id: uploads.id,
      name: uploads.name,
      contentType: uploads.contentType,
      size: uploads.size,
      folderId: uploads.folderId,
    })
    .from(uploads)
    .where(and(...filters))
    .orderBy(desc(uploads.createdAt))
    .then((rows) =>
      all ? rows : rows.filter((r) => (folderId ? r.folderId === folderId : r.folderId === null)),
    );
}

async function ownUpload(user: User, id: string) {
  const [row] = await db
    .select()
    .from(uploads)
    .where(and(eq(uploads.id, id), eq(uploads.orgId, user.orgId), eq(uploads.ownerId, user.id)));
  if (!row) throw new NotFoundError("Upload not found");
  return row;
}

export async function deleteUpload(user: User, id: string) {
  await ownUpload(user, id);
  await db.delete(uploads).where(eq(uploads.id, id));
  await env.files.delete(`uploads/${id}`);
}

export async function moveUpload(user: User, input: z.infer<typeof moveUploadInput>) {
  await ownUpload(user, input.id);
  if (input.folderId) await ownFolder(user, input.folderId);
  await db.update(uploads).set({ folderId: input.folderId }).where(eq(uploads.id, input.id));
}

/**
 * The upload's bytes when this member may see it: it's theirs, or it is
 * placed in a design or team template they can open.
 */
export async function readUpload(
  user: User,
  id: string,
  via: { design?: string | null; template?: string | null },
): Promise<R2ObjectBody | null> {
  const [row] = await db
    .select()
    .from(uploads)
    .where(and(eq(uploads.id, id), eq(uploads.orgId, user.orgId)));
  if (!row) return null;
  let allowed = row.ownerId === user.id;
  if (!allowed && via.design) {
    const found = await access(user, via.design);
    allowed = !!found && uploadIdsIn(JSON.parse(found.row.doc) as DesignDoc).includes(id);
  }
  if (!allowed && via.template) {
    const [template] = await db
      .select({ doc: templates.doc })
      .from(templates)
      .where(and(eq(templates.id, via.template), eq(templates.orgId, user.orgId)));
    allowed = !!template && uploadIdsIn(JSON.parse(template.doc) as DesignDoc).includes(id);
  }
  if (!allowed) return null;
  return env.files.get(`uploads/${id}`);
}
