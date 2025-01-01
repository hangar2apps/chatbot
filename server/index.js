// server/index.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { openai } from "@ai-sdk/openai";    //comment 
import { streamText } from "ai";
import path from "path";
import { fileURLToPath } from "url";

import { weatherTool } from "./utils/weather.js";
import { databaseTool } from "./utils/database.js";
import { createResourceTool } from "./utils/resources.js";
import { findRelevantContentTool } from "./utils/embeddings.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Define __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the React build folder
app.use(express.static(path.join(__dirname, "../client/build")));

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.get("/", (req, res) => {
  res.send("hello from server");
});

app.post("/api/chat", async (req, res) => {
  console.log('gn2 chat')
  try {
    const { messages } = req.body;


    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Invalid request payload. "messages" must be an array.',
      });
    }

    // Start streaming response headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: `You are a surfer bot. Stay chill and use surfer slang in all your responses. Always be relaxed and fun while being helpful.
        You have access to several tools including: 
          -a 'weather' tool to get weather information for a specific location. If asked about the weather, use this tool to respond. 
          -a 'database' tool. The connected database has Netflix movie and tv show information. If asked about Netflix, tv shows, or movies, use the database tool to respond. 
          -an 'addResource' tool. This is the first part of a two part RAG tool. With this you will take in random pieces of information the user gives you and add it to your knowledge base. You do not need to ask for confirmation to do this.
          -a 'findContent' tool: Use this tool for any user query that might involve meeting notes, stored knowledge, or user-provided information. For example:
      - User: "What meeting notes do you have access to?" => Use 'findContent'.
      - User: "Do I like tellatubbies?" => Use 'findContent' to check if this information is in the knowledge base.
      - User: "Summarize the meeting on July 22nd." => Use 'findContent' to find and summarize the meeting notes.

  Rules:
  1. If the user asks about something that might be in the knowledge base, you MUST use the 'findContent' tool.
  2. Only respond directly if the question is general knowledge or unrelated to the knowledge base.
 
          
          The current date: ${new Date()}`,
      messages,
      tools: {
        weather: weatherTool,
        database: databaseTool,
        addResource: createResourceTool,
        findContent: findRelevantContentTool,
      },
      maxSteps: 5,
    });

    console.log("Tools registered:", {
      weather: weatherTool,
      database: databaseTool,
      addResource: createResourceTool,
      findContent: findRelevantContentTool,
    });
    

    try {
      // Stream the text incrementally
      for await (const chunk of result.textStream) {
        res.write(chunk);
      }
    } catch (error) {
      console.error("for await error", error);
    }

    // End the response stream
    res.end();
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Catch-all route to serve React app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
