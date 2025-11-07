// server.js handles chat requests for the AI coding assistant and reads project files

import "dotenv/config"; // load env variables (API KEY)
import express from "express"; 
import cors from "cors";
import fs from "fs";
//import fetch from "node-fetch";
import OpenAI from "openai";

// enabling communication between chatbot and server
const app = express();
app.use(cors());
app.use("/chatbot", express.static("chatbot"));
app.use(express.json());

console.log("Loaded key prefix:", process.env.OPENAI_API_KEY?.slice(0, 7)); // verify key is loaded
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Your PyScript deployment URL
const PYSCRIPT_BASE = "https://infania.pyscriptapps.com/bones-copy/latest";

// List files in the project directory
const allowedExtensions = [".js", ".html", ".css", ".py", ".toml", ".json", ".md", ".png", ".svg"];

app.get("/api/files", (req, res) => {
  const files = fs.readdirSync(".");
  res.json(files.filter(f => allowedExtensions.some(ext => f.endsWith(ext))));
});


// Read a file - tries local first, then fetches from PyScript
app.get("/api/file/:filename", async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Try local first
    if (fs.existsSync(filename)) {
      console.log(`✓ Found locally: ${filename}`);
      const content = fs.readFileSync(filename, "utf-8");
      return res.send(content);
    }
    
    // If not local, fetch from PyScript deployment
    const pyscriptUrl = `${PYSCRIPT_BASE}/${filename}`;
    console.log(`→ Fetching from PyScript: ${pyscriptUrl}`);
    
    const response = await fetch(pyscriptUrl);
    
    if (response.ok) {
      const content = await response.text();
      console.log(`✓ Fetched from PyScript: ${filename}`);
      return res.send(content);
    }
    
    console.error(`✗ File not found: ${filename}`);
    res.status(404).send("File not found locally or on PyScript");
    
  } catch (err) {
    console.error(`Error loading file ${req.params.filename}:`, err.message);
    res.status(500).send("Error loading file");
  }
});


// Chat endpoint - accepts message, fileContext, and systemPrompt
app.post("/api/chat", async (req, res) => {
  try {
    const { message, fileContext, systemPrompt } = req.body;

    // Default system prompt if none provided
    const defaultSystemPrompt = "You are an assistant that helps with web development, PyScript, and component integration. Provide clear, concise code examples.";
    
    const systemMessage = systemPrompt || defaultSystemPrompt;

    console.log(`💬 Chat request: "${message.substring(0, 50)}..."`);
    
    // Send prompt to OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        // System prompt to guide the AI's behavior
        { role: "system", content: systemMessage },
        // User includes message and file context if any
        { 
          role: "user", 
          content: `User message: ${message}\n\nFile Context:\n${fileContext || "No file context provided."}` 
        }
      ]
    });
    
    console.log(`✓ AI responded`);
    
    // Return AI response to frontend
    res.json({ reply: response.choices[0].message.content });
    
  } catch (error) {
    console.error("OpenAI API error:", error.message);
    res.status(500).json({ 
      error: "Failed to get AI response", 
      details: error.message 
    });
  }
});


// Start server
app.listen(3000, () => console.log("🤖 AI dev assistant running on http://localhost:3000"));