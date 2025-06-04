import { messages, documents, type Message, type InsertMessage, type Document, type InsertDocument } from "@shared/schema";
import { db } from "./db";
import { desc } from "drizzle-orm";

export interface IStorage {
  getMessages(): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  getDocuments(): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
}

export class DatabaseStorage implements IStorage {
  async getMessages(): Promise<Message[]> {
    const result = await db.select().from(messages).orderBy(messages.timestamp);
    return result;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getDocuments(): Promise<Document[]> {
    const result = await db.select().from(documents).orderBy(desc(documents.uploadTimestamp));
    return result;
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values(insertDocument)
      .returning();
    return document;
  }
}

export const storage = new DatabaseStorage();
