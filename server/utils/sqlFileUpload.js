import dotenv from "dotenv";
import fs from 'fs';
import postgres from 'postgres'

dotenv.config();

async function main() {
  
  const connectionString = process.env.DATABASE_URL
  const sqlConnection = postgres(connectionString)
  
  try{
  const sql = fs.readFileSync('netflixdb-postgres.sql', 'utf-8')

  // Execute the SQL commands
  await sqlConnection.unsafe(sql);
  console.log("SQL executed successfully.");
  }
  catch(error){
    console.error('Error executing SQL:', error)
  }
finally {
  // Close the connection
  await sqlConnection.end();
  console.log("Connection closed.");
}
}

main().catch(console.error);
