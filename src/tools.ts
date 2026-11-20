// The app's tools for AI clients, served by the Gateway at /mcp.
import { defineTools } from "@every-app/sdk/server";
import { z } from "zod";
import * as designs from "@/server/designs";

export const tools = defineTools({
  list_designs: {
    description: "List the user's own designs with their names, sizes and last edit time.",
    risk: "read",
    input: z.object({ q: z.string().max(120).optional() }).strict(),
    handler: async (input, { user }) =>
      (await designs.listMyDesigns(user, { q: input.q })).map((d) => ({
        id: d.id,
        name: d.name,
        width: d.width,
        height: d.height,
        updatedAt: d.updatedAt,
      })),
  },
});
