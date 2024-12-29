import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cases = pgTable("cases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => cases.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const nodes = pgTable("nodes", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => cases.id, { onDelete: "cascade" }).notNull(),
  type: text("type", { enum: ["text", "link"] }).notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  embedding: jsonb("embedding"),
  x: integer("x"),
  y: integer("y"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const nodeTags = pgTable("node_tags", {
  id: serial("id").primaryKey(),
  nodeId: integer("node_id").references(() => nodes.id, { onDelete: "cascade" }).notNull(),
  tagId: integer("tag_id").references(() => tags.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const relationships = pgTable("relationships", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => cases.id, { onDelete: "cascade" }).notNull(),
  sourceId: integer("source_id").references(() => nodes.id, { onDelete: "cascade" }).notNull(),
  targetId: integer("target_id").references(() => nodes.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(),
  strength: integer("strength").default(1)
});

export const usersRelations = relations(users, ({ many }) => ({
  cases: many(cases)
}));

export const casesRelations = relations(cases, ({ many, one }) => ({
  nodes: many(nodes),
  relationships: many(relationships),
  tags: many(tags),
  user: one(users, { fields: [cases.userId], references: [users.id] })
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  case: one(cases, { fields: [tags.caseId], references: [cases.id] }),
  nodeTags: many(nodeTags)
}));

export const nodesRelations = relations(nodes, ({ one, many }) => ({
  case: one(cases, { fields: [nodes.caseId], references: [cases.id] }),
  nodeTags: many(nodeTags),
  sourceRelationships: many(relationships, { relationName: "source" }),
  targetRelationships: many(relationships, { relationName: "target" })
}));

export const nodeTagsRelations = relations(nodeTags, ({ one }) => ({
  node: one(nodes, { fields: [nodeTags.nodeId], references: [nodes.id] }),
  tag: one(tags, { fields: [nodeTags.tagId], references: [tags.id] })
}));

export const relationshipsRelations = relations(relationships, ({ one }) => ({
  case: one(cases, { fields: [relationships.caseId], references: [cases.id] }),
  source: one(nodes, { fields: [relationships.sourceId], references: [nodes.id] }),
  target: one(nodes, { fields: [relationships.targetId], references: [nodes.id] })
}));

export const insertCaseSchema = createInsertSchema(cases);
export const selectCaseSchema = createSelectSchema(cases);
export const insertNodeSchema = createInsertSchema(nodes);
export const selectNodeSchema = createSelectSchema(nodes);
export const insertTagSchema = createInsertSchema(tags);
export const selectTagSchema = createSelectSchema(tags);
export const insertNodeTagSchema = createInsertSchema(nodeTags);
export const selectNodeTagSchema = createSelectSchema(nodeTags);
export const insertRelationshipSchema = createInsertSchema(relationships);
export const selectRelationshipSchema = createSelectSchema(relationships);
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export type User = typeof users.$inferSelect;
export type Case = typeof cases.$inferSelect;
export type Node = typeof nodes.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type NodeTag = typeof nodeTags.$inferSelect;
export type Relationship = typeof relationships.$inferSelect;