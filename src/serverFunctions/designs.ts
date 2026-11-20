import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@every-app/sdk/tanstack-start";
import { z } from "zod";
import * as brand from "@/server/brand";
import * as comments from "@/server/comments";
import * as designs from "@/server/designs";
import * as folders from "@/server/folders";
import * as templates from "@/server/templates";
import * as uploads from "@/server/uploads";
import { NotFoundError, seeUser } from "@/server/users";

// Every server function runs as the member the Gateway signed in, recorded
// on first sight; each query takes them and checks what they may do.
const member = createMiddleware({ type: "function" })
  .middleware([ensureUserMiddleware])
  .server(async ({ next, context }) => {
    await seeUser(context.user);
    return next();
  });


const empty = z.object({}).strict();

// Designs
export const listDesigns = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => designs.listInput.parse(data))
  .handler(({ data, context }) =>
  designs.listMyDesigns(context.user, data),
);
export const listShared = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => empty.parse(data))
  .handler(({ context }) =>
  designs.listSharedWithMe(context.user),
);
export const getDesign = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => designs.idInput.parse(data))
  .handler(async ({ data, context }) => {
  try {
    return await designs.getDesign(context.user, data.id);
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }
});
export const createDesign = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => designs.createDesignInput.parse(data))
  .handler(({ data, context }) =>
  designs.createDesign(context.user, data),
);
export const renameDesign = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => designs.renameInput.parse(data))
  .handler(({ data, context }) =>
  designs.renameDesign(context.user, data),
);
export const duplicateDesign = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => designs.idInput.parse(data))
  .handler(({ data, context }) =>
  designs.duplicateDesign(context.user, data.id),
);
export const deleteDesign = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => designs.idInput.parse(data))
  .handler(({ data, context }) =>
  designs.deleteDesign(context.user, data.id),
);
export const moveDesign = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => designs.moveInput.parse(data))
  .handler(({ data, context }) =>
  designs.moveDesign(context.user, data),
);
export const getSharing = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => designs.idInput.parse(data))
  .handler(({ data, context }) =>
  designs.getSharing(context.user, data.id),
);
export const setShare = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => designs.shareInput.parse(data))
  .handler(({ data, context }) =>
  designs.setShare(context.user, data),
);
export const setLinkAccess = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => designs.linkInput.parse(data))
  .handler(({ data, context }) =>
  designs.setLinkAccess(context.user, data),
);

// Folders
export const listFolders = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => empty.parse(data))
  .handler(({ context }) =>
  folders.listFolders(context.user),
);
export const createFolder = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => folders.createFolderInput.parse(data))
  .handler(({ data, context }) =>
  folders.createFolder(context.user, data),
);
export const renameFolder = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => folders.renameFolderInput.parse(data))
  .handler(({ data, context }) =>
  folders.renameFolder(context.user, data),
);
export const deleteFolder = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => folders.folderIdInput.parse(data))
  .handler(({ data, context }) =>
  folders.deleteFolder(context.user, data.id),
);

// Uploads
export const listUploads = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => uploads.listUploadsInput.parse(data))
  .handler(({ data, context }) =>
  uploads.listUploads(context.user, data),
);
export const deleteUpload = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => designs.idInput.parse(data))
  .handler(({ data, context }) =>
  uploads.deleteUpload(context.user, data.id),
);
export const moveUpload = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => uploads.moveUploadInput.parse(data))
  .handler(({ data, context }) =>
  uploads.moveUpload(context.user, data),
);

// Templates
export const listTemplates = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => empty.parse(data))
  .handler(({ context }) =>
  templates.listTemplates(context.user),
);
export const useTemplate = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => templates.templateIdInput.parse(data))
  .handler(({ data, context }) =>
  templates.useTemplate(context.user, data.id),
);
export const saveAsTemplate = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => templates.saveTemplateInput.parse(data))
  .handler(({ data, context }) =>
  templates.saveAsTemplate(context.user, data),
);
export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => templates.templateIdInput.parse(data))
  .handler(({ data, context }) =>
  templates.deleteTemplate(context.user, data.id),
);

// Comments
export const listComments = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => designs.idInput.parse(data))
  .handler(({ data, context }) =>
  comments.listComments(context.user, data.id),
);
export const addComment = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => comments.addCommentInput.parse(data))
  .handler(({ data, context }) =>
  comments.addComment(context.user, data),
);
export const resolveThread = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => comments.resolveInput.parse(data))
  .handler(({ data, context }) =>
  comments.resolveThread(context.user, data),
);
export const deleteComment = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => comments.commentIdInput.parse(data))
  .handler(({ data, context }) =>
  comments.deleteComment(context.user, data.id),
);

// Brand kit
export const getBrand = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => empty.parse(data))
  .handler(({ context }) => brand.getBrand(context.user));
export const updateBrand = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => brand.brandInput.parse(data))
  .handler(({ data, context }) =>
  brand.updateBrand(context.user, data),
);
export const deleteLogo = createServerFn({ method: "POST" })
  .middleware([member])
  .validator((data: unknown) => designs.idInput.parse(data))
  .handler(({ data, context }) =>
  brand.deleteLogo(context.user, data.id),
);
