import { generateEmbeddings } from "./embeddings.js";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { z } from "zod";
import { tool } from "ai";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_PROJECT_URL,
  process.env.SUPABASE_API_KEY
);

// Define Zod schema for validation
const insertResourceSchema = z.object({
  content: z.string(),
});

const createResource = async (input) => {
    console.log('input in createResource', input)
  try {
    const { content } = insertResourceSchema.parse(input);

    // Insert the resource into the database
    const { data: resource, error: resourceError } = await supabase
      .from("resource")
      .insert([{ content }])
      .select("*")
      .single();

    if (resourceError) {
      throw new Error(`Resource insertion error: ${resourceError.message}`);
    }

    // Generate embeddings
    const embeddings = await generateEmbeddings(content);

    // Insert embeddings into the database
    const embeddingsData = embeddings.map((embedding) => ({
      resource_id: resource.id,
      embedding: embedding.embedding,
      content: embedding.content,
    }));

    const { error: embeddingError } = await supabase
      .from("embeddings")
      .insert(embeddingsData);

    if (embeddingError) {
      throw new Error(`Embedding insertion error: ${embeddingError.message}`);
    }

    return "Resource successfully created and embedded.";
  } catch (error) {
    return error instanceof Error && error.message.length > 0
      ? error.message
      : "Error, please try again.";
  }
};

// Define the createResource tool
export const createResourceTool = tool({
    description: `add a resource to your knowledge base.
            If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation.`,
    parameters: z.object({
      content: z
        .string()
        .describe("the content or resource to add to the knowledge base"),
    }),
    execute: async ({ content }) => createResource({ content }),
  });