import "dotenv/config";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("No DATABASE_URL set, skipping migrations");
    return;
  }

  console.log("Running database migrations...");
  const connection = await mysql.createConnection(url);
  const db = drizzle(connection);

  await migrate(db, { migrationsFolder: "./drizzle" });
  await connection.end();
  console.log("Migrations complete");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
