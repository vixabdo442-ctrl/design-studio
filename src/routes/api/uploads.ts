import { createFileRoute } from "@tanstack/react-router";
import { asMember } from "@/server/http";
import { checkImage, createUpload } from "@/server/uploads";

export const Route = createFileRoute("/api/uploads")({
  server: {
    handlers: {
      POST: ({ request }) =>
        asMember(request, async (user) => {
          const form = await request.formData();
          const file = checkImage(form.get("file"));
          const folder = form.get("folderId");
          const created = await createUpload(
            user,
            file,
            typeof folder === "string" && folder ? folder : null,
          );
          return Response.json(created, { status: 201 });
        }),
    },
  },
});
