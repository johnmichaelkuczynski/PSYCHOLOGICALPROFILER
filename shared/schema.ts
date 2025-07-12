import { pgTable, text, uuid, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User credentials + account with UUID for better security
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  token_balance: integer("token_balance").default(0),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password_hash: true,
  token_balance: true,
});

// Token usage tracking table
export const tokenUsage = pgTable("token_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  session_id: text("session_id"), // For anonymous users
  event_type: text("event_type").notNull(), // 'analysis', 'upload', 'storage', 'purchase'
  tokens_used: integer("tokens_used").notNull(),
  tokens_remaining: integer("tokens_remaining").notNull(),
  description: text("description"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertTokenUsageSchema = createInsertSchema(tokenUsage).pick({
  user_id: true,
  session_id: true,
  event_type: true,
  tokens_used: true,
  tokens_remaining: true,
  description: true,
});

// Payment transactions table
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  stripe_payment_intent_id: text("stripe_payment_intent_id").notNull(),
  amount_cents: integer("amount_cents").notNull(),
  tokens_purchased: integer("tokens_purchased").notNull(),
  status: text("status").notNull(), // 'pending', 'succeeded', 'failed'
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(payments).pick({
  user_id: true,
  stripe_payment_intent_id: true,
  amount_cents: true,
  tokens_purchased: true,
  status: true,
});

// Anonymous sessions for free users
export const anonymousSessions = pgTable("anonymous_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  session_id: text("session_id").notNull().unique(),
  tokens_used: integer("tokens_used").default(0),
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  last_activity: timestamp("last_activity").defaultNow().notNull(),
});

export const insertAnonymousSessionSchema = createInsertSchema(anonymousSessions).pick({
  session_id: true,
  tokens_used: true,
  ip_address: true,
  user_agent: true,
});

// Documents table with user isolation
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  filename: text("filename").notNull(),
  content: text("content").notNull(),
  word_count: integer("word_count"),
  uploaded_at: timestamp("uploaded_at").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  user_id: true,
  filename: true,
  content: true,
  word_count: true,
});

// Analysis requests with user isolation
export const analysisRequests = pgTable("analysis_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  text: text("text").notNull(),
  result: text("result"),
  analysis_type: text("analysis_type").notNull(), // 'cognitive' or 'psychological'
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnalysisRequestSchema = createInsertSchema(analysisRequests).pick({
  user_id: true,
  text: true,
  analysis_type: true,
});

// Comprehensive reports with user isolation
export const comprehensiveReports = pgTable("comprehensive_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  analysis_request_id: uuid("analysis_request_id").references(() => analysisRequests.id, { onDelete: "cascade" }).notNull(),
  report_type: text("report_type").notNull(), // 'cognitive' or 'psychological'
  provider: text("provider").notNull(), // 'openai', 'anthropic', 'deepseek', 'perplexity'
  report_data: text("report_data").notNull(), // JSON string of the report
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertComprehensiveReportSchema = createInsertSchema(comprehensiveReports).pick({
  user_id: true,
  analysis_request_id: true,
  report_type: true,
  provider: true,
  report_data: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertAnalysisRequest = z.infer<typeof insertAnalysisRequestSchema>;
export type AnalysisRequest = typeof analysisRequests.$inferSelect;
export type InsertComprehensiveReport = z.infer<typeof insertComprehensiveReportSchema>;
export type ComprehensiveReport = typeof comprehensiveReports.$inferSelect;
export type InsertTokenUsage = z.infer<typeof insertTokenUsageSchema>;
export type TokenUsage = typeof tokenUsage.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertAnonymousSession = z.infer<typeof insertAnonymousSessionSchema>;
export type AnonymousSession = typeof anonymousSessions.$inferSelect;
