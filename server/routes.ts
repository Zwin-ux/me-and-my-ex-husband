import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema, type FlowiseRequest, type FlowiseResponse } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all messages
  app.get("/api/messages", async (req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send message to Flowise and save both user message and AI response
  app.post("/api/messages", async (req, res) => {
    try {
      const { content } = insertMessageSchema.parse(req.body);
      
      // Save user message
      const userMessage = await storage.createMessage({
        content,
        sender: "user"
      });

      // Send to Flowise API
      const flowiseRequest: FlowiseRequest = {
        question: content
      };

      const flowiseResponse = await fetch("https://cloud.flowiseai.com/api/v1/prediction/4dae3805-7563-48ff-82d8-bf4f866ac51f", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(flowiseRequest)
      });

      if (!flowiseResponse.ok) {
        throw new Error(`Flowise API error: ${flowiseResponse.status}`);
      }

      const flowiseData: FlowiseResponse = await flowiseResponse.json();
      
      // Save AI response
      const aiMessage = await storage.createMessage({
        content: flowiseData.text,
        sender: "ai"
      });

      res.json({
        userMessage,
        aiMessage
      });
    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to process message" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
