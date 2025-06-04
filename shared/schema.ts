import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  sender: text("sender").notNull(), // 'user' or 'ai'
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  fileSize: text("file_size").notNull(),
  uploadTimestamp: timestamp("upload_timestamp").defaultNow().notNull(),
  status: text("status").notNull().default("processing"), // 'processing', 'completed', 'failed'
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
  sender: true,
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  filename: true,
  originalName: true,
  fileSize: true,
  status: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Flowise API types
export interface FlowiseRequest {
  question: string;
  chatId?: string;
}

export interface FlowiseResponse {
  text: string;
  chatId?: string;
  sourceDocuments?: any[];
}

export interface FlowiseDocumentRequest {
  overrideConfig?: {
    fileUpload?: string;
  };
}
