import { defineEveryApp } from "@every-app/sdk";

export default defineEveryApp({
  id: "design-studio",
  name: "Design Studio",
  description:
    "Make social posts, posters and slides from templates, your own images and the team's brand kit, then share, comment and export.",
  resources: {
    d1: ["DB"],
    r2: ["files"],
  },
});
