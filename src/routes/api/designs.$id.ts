import { createFileRoute } from "@tanstack/react-router";
import { getDesign, saveDesign, saveInput } from "@/server/designs";
import { asMember } from "@/server/http";

export const Route = createFileRoute("/api/designs/$id")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        asMember(request, async (user) => Response.json(await getDesign(user, params.id))),
      PUT: ({ request, params }) =>
        asMember(request, async (user) => {
          const input = saveInput.parse(await request.json());
          return Response.json(await saveDesign(user, params.id, input));
        }),
    },
  },
});
