import { createFileRoute } from "@tanstack/react-router";
import { asMember, imageResponse } from "@/server/http";
import { readUpload } from "@/server/uploads";

export const Route = createFileRoute("/files/u/$id")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        asMember(request, async (user) => {
          const url = new URL(request.url);
          const object = await readUpload(user, params.id, {
            design: url.searchParams.get("design"),
            template: url.searchParams.get("template"),
          });
          return imageResponse(object);
        }),
    },
  },
});
