import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("No DATABASE_URL set, skipping column check");
    return;
  }

  console.log("Checking for missing columns...");
  const connection = await mysql.createConnection(url);

  const [rows] = await connection.execute<any[]>(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'",
    [connection.config.database]
  );
  const existing = new Set(rows.map((r: any) => r.COLUMN_NAME));

  const columns: { name: string; definition: string }[] = [
    { name: "passwordHash", definition: "ADD COLUMN `passwordHash` varchar(255)" },
    { name: "premium", definition: "ADD `premium` boolean DEFAULT false NOT NULL" },
    { name: "premiumUntil", definition: "ADD `premiumUntil` timestamp NULL" },
    { name: "trialUsed", definition: "ADD `trialUsed` boolean DEFAULT false NOT NULL" },
    { name: "asaasCustomerId", definition: "ADD `asaasCustomerId` varchar(64)" },
    { name: "asaasSubscriptionId", definition: "ADD `asaasSubscriptionId` varchar(64)" },
  ];

  for (const col of columns) {
    if (!existing.has(col.name)) {
      try {
        await connection.execute(`ALTER TABLE users ${col.definition}`);
        console.log(`  ✓ Added column: ${col.name}`);
      } catch (err: any) {
        console.warn(`  ✗ Failed to add ${col.name}: ${err.message}`);
      }
    } else {
      console.log(`  - Column already exists: ${col.name}`);
    }
  }

  await connection.end();
  console.log("Column check complete");
}

main().catch((err) => {
  console.error("Column check failed:", err);
  process.exit(1);
});
