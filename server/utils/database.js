import { z } from "zod";
import { tool, generateText } from "ai";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { openai } from "@ai-sdk/openai";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_PROJECT_URL,
  process.env.SUPABASE_API_KEY
);

// Helper function to clean SQL from markdown
function cleanSQLFromMarkdown(text) {
  // Remove markdown SQL code block if present
  const sqlMatch = text.match(/```sql\n?([\s\S]*?)```/);
  if (sqlMatch) {
    return sqlMatch[1].trim();
  }
  return text.trim();
}

// Helper function to generate SQL from natural language
async function generateSQLFromQuestion(question) {
  try {
    const response = await generateText({
      model: openai("gpt-4o-mini"),
      system: `You are a SQL query generator. Generate only SELECT queries for the following tables: movie, tv_show, and season. The movie table has columns for release_date, runtime, and title. The tv_show table has columns for release_date and title. The season table has tv_show_id, title, season_number, and release_date. You can join the tv_show table to the season table with the season.tv_show_id. Always start with SELECT. Current date: ${new Date()}`,
      messages: [
        {
          role: "user",
          content: `Generate an SQL SELECT query for: ${question}. Return only the SQL query without any markdown formatting or explanation.`,
        },
      ],
      max_tokens: 1024, // Adjust based on expected query length
    });

    const generatedSQL = cleanSQLFromMarkdown(response.text);
    console.log("generatedSQL", generatedSQL);
    if (!generatedSQL.toUpperCase().startsWith("SELECT")) {
      throw new Error("Generated query does not start with SELECT.");
    }
    return generatedSQL;
  } catch (error) {
    console.error("Error generating SQL:", error);
    throw new Error("Failed to generate SQL query");
  }
}

// Define the weather tool
export const databaseTool = tool({
  description:
    "Run PostgreSQL queries based on questions the user asks. Only run SELECT statements. Do not modify any data. Uses AI to generate SQL from natural language.",
  parameters: z.object({
    question: z
      .string()
      .describe("The question the user will ask about the database"),
  }),
  execute: async ({ question }) => {
    console.log("question in sql query", question);
    try {
      //determine the query based on question asked
      const sqlQuery = await generateSQLFromQuestion(question);
      console.log("sqlQuery", sqlQuery);

      let data, count, error;

      // Extract the table name from the query or fallback to logic
      const tableMatch = sqlQuery.toLowerCase().match(/from\s+(\w+)/i);
      const table = tableMatch
        ? tableMatch[1]
        : question.toLowerCase().includes("movie")
        ? "movie"
        : "tv_show";

      if (!table) {
        throw new Error("Could not determine the table name.");
      }

      // Extract columns from the query
      const columnsMatch = sqlQuery.match(/SELECT\s+(.*?)\s+FROM/i);
      const columns = columnsMatch ? columnsMatch[1].trim() : "*";

      const isAggregateQuery = sqlQuery.toUpperCase().includes("COUNT(*)");
      console.log("isAggregateQuery", isAggregateQuery);

      const isJoin = sqlQuery.toUpperCase().includes("JOIN");
      console.log('isJoin', isJoin)

      if (isAggregateQuery) {
        ({ count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true }));
      } 
      else if(isJoin){
        let semicolonRemovedSql = sqlQuery.trim().replace(/;$/, "");
        ({ data, error } = await supabase.rpc("execute_raw_sql", { sql: semicolonRemovedSql }));
      }
      else {
        ({ data, error } = await supabase.from(table).select(columns));
      }

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      if(count || count === 0){
        return JSON.stringify(count, null, 2);
      }
      else{
          return JSON.stringify(data, null, 2);
      }

    } catch (error) {
      console.error("Database tool error:", error);
      throw new Error("Failed to execute database query");
    }
  },
});
