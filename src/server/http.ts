import { getEveryAppUser } from "@every-app/sdk/server";
import { env } from "cloudflare:workers";
import { ZodError } from "zod";
import { UploadRefused } from "@/server/uploads";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  seeUser,
  type User,
} from "@/server/users";

/** Runs a server route's work as the signed-in member, mapping errors to statuses. */
export async function asMember(
  request: Request,
  work: (user: User) => Promise<Response>,
): Promise<Response> {
  const user = await getEveryAppUser(request, env);
  if (!user) return Response.json({ error: "Sign in" }, { status: 401 });
  try {
    await seeUser(user);
    return await work(user);
  } catch (error) {
    if (error instanceof NotFoundError)
      return Response.json({ error: error.message }, { status: 404 });
    if (error instanceof ForbiddenError)
      return Response.json({ error: error.message }, { status: 403 });
    if (error instanceof ConflictError)
      return Response.json({ error: error.message }, { status: 409 });
    if (error instanceof UploadRefused)
      return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof ZodError || error instanceof SyntaxError)
      return Response.json({ error: "Invalid request" }, { status: 400 });
    throw error;
  }
}

/** An image from storage, never rendered as a page of the app. */
export function imageResponse(object: R2ObjectBody | null): Response {
  if (!object) return Response.json({ error: "Not found" }, { status: 404 });
  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "cache-control": "private, no-cache",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
