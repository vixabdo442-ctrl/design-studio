import { isAdmin } from "@every-app/sdk/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { templates, users } from "@/db/schema";
import { copyDoc, type DesignDoc } from "@/lib/design";
import { STARTER_TEMPLATES } from "@/lib/starterTemplates";
import { createDesign, requireAccess } from "@/server/designs";
import { ForbiddenError, NotFoundError, type User } from "@/server/users";

export const saveTemplateInput = z
  .object({
    designId: z.string().min(1),
    name: z.string().trim().min(1, "Name is required").max(120),
    category: z.string().trim().min(1, "Category is required").max(40),
  })
  .strict();
export const templateIdInput = z.object({ id: z.string().min(1) }).strict();

export interface TemplateView {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  doc: DesignDoc;
  team: boolean;
  creatorEmail: string | null;
  canDelete: boolean;
}

export async function listTemplates(user: User): Promise<TemplateView[]> {
  const rows = await db
    .select({ template: templates, creatorEmail: users.email })
    .from(templates)
    .leftJoin(users, eq(users.id, templates.creatorId))
    .where(eq(templates.orgId, user.orgId))
    .orderBy(desc(templates.createdAt));
  const team = rows.map(({ template, creatorEmail }) => ({
    id: template.id,
    name: template.name,
    category: template.category,
    width: template.width,
    height: template.height,
    doc: JSON.parse(template.doc) as DesignDoc,
    team: true,
    creatorEmail,
    canDelete: template.creatorId === user.id || isAdmin(user),
  }));
  const starters = STARTER_TEMPLATES.map((t) => ({
    ...t,
    team: false,
    creatorEmail: null,
    canDelete: false,
  }));
  return [...team, ...starters];
}

/** A new private design that copies the template. */
export async function useTemplate(user: User, id: string) {
  const starter = STARTER_TEMPLATES.find((t) => t.id === id);
  if (starter)
    return createDesign(user, {
      name: starter.name,
      width: starter.width,
      height: starter.height,
      doc: copyDoc(starter.doc),
    });
  const [row] = await db
    .select()
    .from(templates)
    .where(and(eq(templates.id, id), eq(templates.orgId, user.orgId)));
  if (!row) throw new NotFoundError("Template not found");
  return createDesign(user, {
    name: row.name,
    width: row.width,
    height: row.height,
    doc: copyDoc(JSON.parse(row.doc) as DesignDoc),
  });
}

export async function saveAsTemplate(user: User, input: z.infer<typeof saveTemplateInput>) {
  const { row } = await requireAccess(user, input.designId, "owner");
  const id = crypto.randomUUID();
  await db.insert(templates).values({
    id,
    orgId: user.orgId,
    creatorId: user.id,
    name: input.name,
    category: input.category,
    width: row.width,
    height: row.height,
    doc: JSON.stringify(copyDoc(JSON.parse(row.doc) as DesignDoc)),
  });
  return { id };
}

export async function deleteTemplate(user: User, id: string) {
  const [row] = await db
    .select({ creatorId: templates.creatorId })
    .from(templates)
    .where(and(eq(templates.id, id), eq(templates.orgId, user.orgId)));
  if (!row) throw new NotFoundError("Template not found");
  if (row.creatorId !== user.id && !isAdmin(user))
    throw new ForbiddenError("Only its creator or an admin can delete this template");
  await db.delete(templates).where(eq(templates.id, id));
}
