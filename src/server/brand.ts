import { isAdmin } from "@every-app/sdk/server";
import { and, asc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { db } from "@/db";
import { brandKits, brandLogos } from "@/db/schema";
import { FONTS } from "@/lib/design";
import { ForbiddenError, NotFoundError, type User } from "@/server/users";

const font = z.enum(FONTS).nullable();
export const brandInput = z
  .object({
    colors: z
      .array(
        z.object({
          name: z.string().trim().max(40),
          hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        }),
      )
      .max(24),
    headingFont: font,
    subheadingFont: font,
    bodyFont: font,
  })
  .strict();

export type BrandColor = { name: string; hex: string };

export async function getBrand(user: User) {
  const [kit] = await db.select().from(brandKits).where(eq(brandKits.orgId, user.orgId));
  const logos = await db
    .select({ id: brandLogos.id, name: brandLogos.name })
    .from(brandLogos)
    .where(eq(brandLogos.orgId, user.orgId))
    .orderBy(asc(brandLogos.createdAt));
  return {
    colors: kit ? (JSON.parse(kit.colors) as BrandColor[]) : [],
    headingFont: kit?.headingFont ?? null,
    subheadingFont: kit?.subheadingFont ?? null,
    bodyFont: kit?.bodyFont ?? null,
    logos,
    canEdit: isAdmin(user),
  };
}

function requireAdmin(user: User) {
  if (!isAdmin(user)) throw new ForbiddenError("Only admins can change the brand kit");
}

export async function updateBrand(user: User, input: z.infer<typeof brandInput>) {
  requireAdmin(user);
  const values = {
    colors: JSON.stringify(input.colors),
    headingFont: input.headingFont,
    subheadingFont: input.subheadingFont,
    bodyFont: input.bodyFont,
    updatedAt: new Date().toISOString(),
  };
  await db
    .insert(brandKits)
    .values({ orgId: user.orgId, ...values })
    .onConflictDoUpdate({ target: brandKits.orgId, set: values });
}

export async function addLogo(user: User, file: File) {
  requireAdmin(user);
  const id = crypto.randomUUID();
  await env.files.put(`logos/${id}`, file.stream(), {
    httpMetadata: { contentType: file.type },
  });
  await db.insert(brandLogos).values({
    id,
    orgId: user.orgId,
    name: file.name.slice(0, 200) || "logo",
    contentType: file.type,
  });
  return { id };
}

export async function deleteLogo(user: User, id: string) {
  requireAdmin(user);
  const [row] = await db
    .select({ id: brandLogos.id })
    .from(brandLogos)
    .where(and(eq(brandLogos.id, id), eq(brandLogos.orgId, user.orgId)));
  if (!row) throw new NotFoundError("Logo not found");
  await db.delete(brandLogos).where(eq(brandLogos.id, id));
  await env.files.delete(`logos/${id}`);
}

export async function readLogo(user: User, id: string) {
  const [row] = await db
    .select({ id: brandLogos.id })
    .from(brandLogos)
    .where(and(eq(brandLogos.id, id), eq(brandLogos.orgId, user.orgId)));
  if (!row) return null;
  return env.files.get(`logos/${id}`);
}
