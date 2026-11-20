import { createFileRoute } from "@tanstack/react-router";
import { readLogo } from "@/server/brand";
import { asMember, imageResponse } from "@/server/http";

export const Route = createFileRoute("/files/logo/$id")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        asMember(request, async (user) => imageResponse(await readLogo(user, params.id))),
    },
  },
});
