import { createFileRoute } from "@tanstack/react-router";
import { addLogo } from "@/server/brand";
import { asMember } from "@/server/http";
import { checkImage } from "@/server/uploads";
import { ForbiddenError } from "@/server/users";
import { isAdmin } from "@every-app/sdk/server";

export const Route = createFileRoute("/api/brand/logos")({
  server: {
    handlers: {
      POST: ({ request }) =>
        asMember(request, async (user) => {
          if (!isAdmin(user)) throw new ForbiddenError("Only admins can change the brand kit");
          const form = await request.formData();
          const created = await addLogo(user, checkImage(form.get("file")));
          return Response.json(created, { status: 201 });
        }),
    },
  },
});
