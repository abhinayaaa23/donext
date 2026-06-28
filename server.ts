import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { decomposeTask, estimateEffort, getNudgeResponse } from "./src/server/gemini.js";

// Setup __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // 1. AI Task Decomposition
  app.post("/api/decompose", async (req, res) => {
    try {
      const { title, description, estimatedHours } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Task title is required" });
      }
      const subtasks = await decomposeTask(title, description || "", estimatedHours);
      res.json({ subtasks });
    } catch (error: any) {
      console.error("Decompose API error:", error);
      res.status(500).json({ error: error.message || "Failed to decompose task" });
    }
  });

  // 2. Intelligent Effort Estimation
  app.post("/api/estimate", async (req, res) => {
    try {
      const { title, description } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Task title is required" });
      }
      const estimate = await estimateEffort(title, description || "");
      res.json(estimate);
    } catch (error: any) {
      console.error("Estimate API error:", error);
      res.status(500).json({ error: error.message || "Failed to estimate effort" });
    }
  });

  // 3. Nudge AI Assistant Chat
  app.post("/api/nudge", async (req, res) => {
    try {
      const { message, context, history } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      const chatHistory = history || [];
      const chatContext = context || { tasks: [] };
      const responseText = await getNudgeResponse(message, chatContext, chatHistory);
      res.json({ response: responseText });
    } catch (error: any) {
      console.error("Nudge API error:", error);
      res.status(500).json({ error: error.message || "Failed to get response from Nudge" });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite HMR middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[DoNext Server] Running at http://localhost:${PORT}`);
    console.log(`Press Ctrl+C to stop`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start DoNext server:", err);
  process.exit(1);
});
