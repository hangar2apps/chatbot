import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { tool } from "ai";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

// Supabase setup
const supabase = createClient(
  process.env.SUPABASE_PROJECT_URL,
  process.env.SUPABASE_API_KEY
);

const embeddingModel = openai.embedding("text-embedding-ada-002");

//CHUNK SOURCE MATERIAL
// break down source material into smaller chunks.  this will split it at the periods, returning an array of strings.
export const generateChunks = (input) => {
  return input
    .trim()
    .split(".")
    .filter((i) => i !== "");
};

//CREATE EMBEDDINGS
// using embedding model, take source material as input and return promise of an array of objects, each containing an embedding and content in a format that is ready to save to the database
export const generateEmbeddings = async (value) => {
  const chunks = generateChunks(value);
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks,
  });
  return embeddings.map((e, i) => ({ content: chunks[i], embedding: e }));
};

//CREATE EMBEDDING
// using embedding model, take user input and embed it. this will then be used to search the database for semantic similarities
export const generateEmbedding = async (value) => {
  const input =
    value && value.question ? value.question.replaceAll("\\n", " ") : "";
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });
  return embedding;
};

// Utility function to calculate cosine similarity
const cosineSimilarity = (vec1, vec2) => {
  const dotProduct = vec1.reduce((sum, val, idx) => sum + val * vec2[idx], 0);
  const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val ** 2, 0));
  const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val ** 2, 0));
  return dotProduct / (magnitude1 * magnitude2);
};

const findRelevantContent = async (userQuery) => {
  try {

    // Generate the embedding for the user query
    const userQueryEmbedded = await generateEmbedding(userQuery);

    // Fetch embeddings from the database
    const { data: embeddings, error: fetchError } = await supabase
      .from("embeddings")
      .select("id, content, embedding, resource:resource_id (source_file)");

    if (fetchError) {
      throw new Error(`Error fetching embeddings: ${fetchError.message}`);
    }

    if (!embeddings || embeddings.length === 0) {
      return [];
    }

    // Calculate cosine similarity for each embedding
    const similarityResults = embeddings.map((item) => {
      // Parse the embedding if it is stored as a string
      const parsedEmbedding =
        typeof item.embedding === "string"
          ? JSON.parse(item.embedding) // Convert string to array
          : item.embedding;

      const similarity = cosineSimilarity(userQueryEmbedded, parsedEmbedding);
      return {
        id: item.id,
        content: item.content,
        similarity,
        source_file: item.resource?.source_file,
      };
    });

    // Filter and sort by similarity
    const relevantContent = similarityResults
      .filter((item) => item.similarity > 0.5)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 4); // Limit to top 4 results

    return relevantContent;
  } catch (error) {
    console.error("Error finding relevant content:", error);
    return [];
  }
};

// Define the findRelevantContent tool
export const findRelevantContentTool = tool({
  description: `Check your knowledge base before answering any questions.
    Only respond to questions using information from tool calls.
    if no relevant information is found in the tool calls, respond, "Sorry bro, I don't have that info."`,
  parameters: z.object({
    question: z.string().describe("the users question"),
  }),
  execute: async ({ question }) => {
    console.log('gn2 execute')
    const result = await findRelevantContent({ question })
    return result;
  }
});
