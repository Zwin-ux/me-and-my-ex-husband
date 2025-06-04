import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema, insertDocumentSchema, type FlowiseRequest, type FlowiseResponse } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { pdfProcessor } from "./pdfProcessor";

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

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

  // Get all documents
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documents" });
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

  // Upload PDF endpoint
  app.post("/api/upload", upload.single("pdf"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }

      // Save document metadata to database
      const document = await storage.createDocument({
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size.toString(),
        status: "processing"
      });

      // Process PDF in the background
      setTimeout(async () => {
        try {
          const filePath = path.join("uploads", req.file!.filename);
          
          // Process the PDF file
          const processedData = await pdfProcessor.processPDF(filePath);
          
          // Send to your Flowise system
          const success = await pdfProcessor.sendToFlowise(document.originalName);

          // Update document status
          await storage.updateDocumentStatus(
            document.id,
            processedData.success ? "completed" : "failed"
          );

          // Clean up the uploaded file
          await pdfProcessor.cleanupFile(filePath);
        } catch (error) {
          console.error("Error processing PDF:", error);
          await storage.updateDocumentStatus(document.id, "failed");
        }
      }, 1000);
      
      res.json({
        success: true,
        document,
        message: "PDF uploaded successfully. Processing started in background."
      });
    } catch (error) {
      console.error("Error uploading PDF:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to upload PDF" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
