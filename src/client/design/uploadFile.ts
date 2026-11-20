const TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

/** Sends one image to a server route; throws the server's message when refused. */
export async function uploadFile(url: string, file: File, folderId?: string | null) {
  if (!TYPES.includes(file.type)) throw new Error("Use a PNG, JPG, WebP or SVG image");
  if (file.size > 10 * 1024 * 1024) throw new Error("Images can be up to 10 MB");
  const body = new FormData();
  body.set("file", file);
  if (folderId) body.set("folderId", folderId);
  const res = await fetch(url, { method: "POST", body });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Upload failed");
  }
  return (await res.json()) as { id: string };
}
