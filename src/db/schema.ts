import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`);

// Members the app has seen, keyed by the Gateway's user id.
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  email: text("email").notNull(),
  createdAt: createdAt(),
});

export const folders = sqliteTable(
  "folders",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("folders_owner").on(t.orgId, t.ownerId)],
);

export const designs = sqliteTable(
  "designs",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    ownerId: text("owner_id").notNull(),
    folderId: text("folder_id"),
    name: text("name").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    // The design document (pages and elements) as JSON.
    doc: text("doc").notNull(),
    version: integer("version").notNull().default(1),
    // Access for every member of the organization who has the link.
    linkAccess: text("link_access", { enum: ["none", "view", "edit"] })
      .notNull()
      .default("none"),
    createdAt: createdAt(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("designs_owner").on(t.orgId, t.ownerId)],
);

export const designShares = sqliteTable(
  "design_shares",
  {
    designId: text("design_id").notNull(),
    email: text("email").notNull(),
    role: text("role", { enum: ["view", "edit"] }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.designId, t.email] }),
    index("design_shares_email").on(t.email),
  ],
);

export const templates = sqliteTable(
  "templates",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    creatorId: text("creator_id").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    doc: text("doc").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("templates_org").on(t.orgId)],
);

export const uploads = sqliteTable(
  "uploads",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    ownerId: text("owner_id").notNull(),
    folderId: text("folder_id"),
    name: text("name").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("uploads_owner").on(t.orgId, t.ownerId)],
);

export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    designId: text("design_id").notNull(),
    authorId: text("author_id").notNull(),
    authorEmail: text("author_email").notNull(),
    parentId: text("parent_id"),
    pageIndex: integer("page_index"),
    body: text("body").notNull(),
    resolved: integer("resolved", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("comments_design").on(t.designId)],
);

export const brandKits = sqliteTable("brand_kits", {
  orgId: text("org_id").primaryKey(),
  colors: text("colors").notNull().default("[]"),
  headingFont: text("heading_font"),
  subheadingFont: text("subheading_font"),
  bodyFont: text("body_font"),
  updatedAt: text("updated_at").notNull(),
});

export const brandLogos = sqliteTable(
  "brand_logos",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    name: text("name").notNull(),
    contentType: text("content_type").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("brand_logos_org").on(t.orgId)],
);
