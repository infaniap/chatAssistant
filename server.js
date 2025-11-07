// server.js handles chat requests for the AI coding assistant and reads project files

import "dotenv/config"; // load env variables (local dev only - Render uses environment vars)
import express from "express"; 
import cors from "cors";
import fs from "fs";
import OpenAI from "openai";

// enabling communication between chatbot and server
const app = express();
app.use(cors());
app.use(express.json());

console.log("Loaded key prefix:", process.env.OPENAI_API_KEY?.slice(0, 7));
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// PyScript deployment URL for your Componentize project
const PYSCRIPT_BASE = "https://infania.pyscriptapps.com/bones-copy/latest";

// List files in the project directory
const allowedExtensions = [".js", ".html", ".css", ".py", ".toml", ".json", ".md"];

app.get("/api/files", (req, res) => {
  try {
    const files = fs.readdirSync(".");
    res.json(files.filter(f => allowedExtensions.some(ext => f.endsWith(ext))));
  } catch (err) {
    res.json([]); // Return empty array if directory read fails
  }
});

// Read a file - tries local first, then fetches from PyScript
app.get("/api/file/:path(.*)", async (req, res) => {
  try {
    const filename = req.params.path;
    
    if (fs.existsSync(filename)) {
      console.log(`✓ Found locally: ${filename}`);
      const content = fs.readFileSync(filename, "utf-8");
      return res.send(content);
    }
    
    const pyscriptUrl = `${PYSCRIPT_BASE}/${filename}`;
    console.log(`→ Fetching from PyScript: ${pyscriptUrl}`);
    
    const response = await fetch(pyscriptUrl);
    
    if (response.ok) {
      const content = await response.text();
      console.log(`✓ Fetched from PyScript: ${filename}`);
      return res.send(content);
    }
    
    console.error(`✗ File not found: ${filename}`);
    res.status(404).send("File not found");
    
  } catch (err) {
    console.error(`Error loading file:`, err.message);
    res.status(500).send("Error loading file");
  }
});

// Chat endpoint - accepts message, fileContext, and systemPrompt
app.post("/api/chat", async (req, res) => {
  try {
    const { message, fileContext, systemPrompt } = req.body;

    const defaultSystemPrompt = "You are an assistant that helps with web development, PyScript, and component integration.";
    const systemMessage = systemPrompt || defaultSystemPrompt;

    console.log(`💬 Chat: "${message.substring(0, 50)}..."`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: `User message: ${message}\n\nFile Context:\n${fileContext || "No file context."}` }
      ]
    });
    
    console.log(`✓ AI responded`);
    res.json({ reply: response.choices[0].message.content });
    
  } catch (error) {
    console.error("OpenAI error:", error.message);
    res.status(500).json({ error: "AI request failed", details: error.message });
  }
});

// Use PORT from Render environment or default to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🤖 AI assistant running on port ${PORT}`));