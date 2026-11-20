import type { EveryAppUser } from "@every-app/sdk/server";
import { db } from "@/db";
import { users } from "@/db/schema";

export type User = Pick<EveryAppUser, "id" | "email" | "orgId" | "orgRole">;

/** Records the member on first sight and keeps the email current. */
export async function seeUser(user: User): Promise<void> {
  await db
    .insert(users)
    .values({ id: user.id, orgId: user.orgId, email: emailOf(user) })
    .onConflictDoUpdate({ target: users.id, set: { email: emailOf(user) } });
}

export function emailOf(user: Pick<User, "email">): string {
  return user.email.trim().toLowerCase();
}

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
  }
}

export class ForbiddenError extends Error {}

export class ConflictError extends Error {}
