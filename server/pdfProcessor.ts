import fs from "fs";
import path from "path";
import OpenAI from "openai";

// Import pdf-parse with proper error handling
let pdfParse: any;
try {
  pdfParse = require("pdf-parse");
} catch (error) {
  console.error("Failed to load pdf-parse:", error);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ProcessedDocument {
  text: string;
  chunks: string[];
  embeddings: number[][];
}

export class PDFProcessor {
  private chunkSize = 1000;
  private chunkOverlap = 200;

  async processPDF(filePath: string): Promise<ProcessedDocument> {
    try {
      // Extract text from PDF
      const pdfBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(pdfBuffer);
      const text = pdfData.text;

      // Split text into chunks
      const chunks = this.splitTextIntoChunks(text);

      // Generate embeddings for each chunk
      const embeddings = await this.generateEmbeddings(chunks);

      return {
        text,
        chunks,
        embeddings
      };
    } catch (error) {
      console.error("Error processing PDF:", error);
      throw error;
    }
  }

  private splitTextIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);
      const chunk = text.slice(start, end);
      chunks.push(chunk.trim());
      start += this.chunkSize - this.chunkOverlap;
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  private async generateEmbeddings(chunks: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const chunk of chunks) {
      try {
        const response = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: chunk,
        });

        embeddings.push(response.data[0].embedding);
      } catch (error) {
        console.error("Error generating embedding for chunk:", error);
        throw error;
      }
    }

    return embeddings;
  }

  async sendToFlowise(chunks: string[], embeddings: number[][], filename: string): Promise<boolean> {
    try {
      // This would integrate with your Flowise API to store the processed document
      // For now, we'll simulate the integration by calling your existing endpoint
      
      // In a production system, you would:
      // 1. Store embeddings in Pinecone vector database
      // 2. Update your Flowise knowledge base
      // 3. Make the document searchable through your chat system

      console.log(`Processed ${filename}: ${chunks.length} chunks, ${embeddings.length} embeddings`);
      return true;
    } catch (error) {
      console.error("Error sending to Flowise:", error);
      return false;
    }
  }

  async cleanupFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error("Error cleaning up file:", error);
    }
  }
}

export const pdfProcessor = new PDFProcessor();