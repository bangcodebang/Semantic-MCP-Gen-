import { pgTable, text, integer, boolean, jsonb, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Projects ───────────────────────────────────────────────────────────────
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  dbType: text("db_type").notNull().default("postgresql"), // postgresql | mysql | sqlite
  connectionString: text("connection_string").notNull().default(""),
  status: text("status").notNull().default("draft"), // draft | introspecting | enriching | ready
  tableCount: integer("table_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// ─── Tables (from introspection) ─────────────────────────────────────────────
export const dbTables = pgTable("db_tables", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  symbolicId: text("symbolic_id").notNull(), // short alias e.g. T1
  tableName: text("table_name").notNull(),
  description: text("description").notNull().default(""),
  domain: text("domain").notNull().default("General"), // business domain category
  isHidden: boolean("is_hidden").notNull().default(false),
  isCore: boolean("is_core").notNull().default(false), // likely a core entity
  rowCount: integer("row_count").notNull().default(0),
});

export const insertDbTableSchema = createInsertSchema(dbTables).omit({ id: true });
export type InsertDbTable = z.infer<typeof insertDbTableSchema>;
export type DbTable = typeof dbTables.$inferSelect;

// ─── Columns ─────────────────────────────────────────────────────────────────
export const dbColumns = pgTable("db_columns", {
  id: serial("id").primaryKey(),
  tableId: integer("table_id").notNull(),
  projectId: integer("project_id").notNull(),
  symbolicId: text("symbolic_id").notNull(), // short alias e.g. C1
  columnName: text("column_name").notNull(),
  dataType: text("data_type").notNull(),
  description: text("description").notNull().default(""),
  isPrimaryKey: boolean("is_primary_key").notNull().default(false),
  isForeignKey: boolean("is_foreign_key").notNull().default(false),
  isNullable: boolean("is_nullable").notNull().default(true),
  isPii: boolean("is_pii").notNull().default(false), // PII flag
  isHidden: boolean("is_hidden").notNull().default(false), // hidden from agent
  piiMaskStrategy: text("pii_mask_strategy").notNull().default("mask"), // mask | exclude
  sampleValues: jsonb("sample_values").$type<string[]>().default([]),
  minValue: text("min_value"),
  maxValue: text("max_value"),
});

export const insertDbColumnSchema = createInsertSchema(dbColumns).omit({ id: true });
export type InsertDbColumn = z.infer<typeof insertDbColumnSchema>;
export type DbColumn = typeof dbColumns.$inferSelect;

// ─── Relationships (FK Graph) ─────────────────────────────────────────────────
export const dbRelationships = pgTable("db_relationships", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  fromTableId: integer("from_table_id").notNull(),
  fromColumnId: integer("from_column_id").notNull(),
  toTableId: integer("to_table_id").notNull(),
  toColumnId: integer("to_column_id").notNull(),
  label: text("label").notNull().default(""), // human-readable e.g. "Customer Purchase History"
  isEnabled: boolean("is_enabled").notNull().default(true),
});

export const insertDbRelationshipSchema = createInsertSchema(dbRelationships).omit({ id: true });
export type InsertDbRelationship = z.infer<typeof insertDbRelationshipSchema>;
export type DbRelationship = typeof dbRelationships.$inferSelect;

// ─── Query Log ───────────────────────────────────────────────────────────────
export const queryLogs = pgTable("query_logs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  queryJson: jsonb("query_json").notNull(),
  generatedSql: text("generated_sql").notNull().default(""),
  status: text("status").notNull().default("pending"), // pending | success | error
  errorMessage: text("error_message").notNull().default(""),
  rowsReturned: integer("rows_returned").notNull().default(0),
  executedAt: timestamp("executed_at").notNull().defaultNow(),
});

export const insertQueryLogSchema = createInsertSchema(queryLogs).omit({ id: true, executedAt: true });
export type InsertQueryLog = z.infer<typeof insertQueryLogSchema>;
export type QueryLog = typeof queryLogs.$inferSelect;
