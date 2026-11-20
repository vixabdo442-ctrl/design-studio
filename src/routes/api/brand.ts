import { createFileRoute } from "@tanstack/react-router";
import { brandInput, getBrand, updateBrand } from "@/server/brand";
import { asMember } from "@/server/http";

export const Route = createFileRoute("/api/brand")({
  server: {
    handlers: {
      GET: ({ request }) =>
        asMember(request, async (user) => Response.json(await getBrand(user))),
      PUT: ({ request }) =>
        asMember(request, async (user) => {
          await updateBrand(user, brandInput.parse(await request.json()));
          return Response.json(await getBrand(user));
        }),
    },
  },
});
