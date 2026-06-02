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

  const dbName = connection.config.database || new URL(url).pathname.slice(1);
  console.log(`  Database: ${dbName}`);

  const [rows] = await connection.execute<any[]>(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'",
    [dbName]
  );
  const existing = new Set(rows.map((r: any) => r.COLUMN_NAME));

  const columns: { name: string; definition: string }[] = [
    { name: "passwordHash", definition: "ADD COLUMN `passwordHash` varchar(255)" },
    { name: "premium", definition: "ADD COLUMN `premium` boolean DEFAULT false NOT NULL" },
    { name: "premiumUntil", definition: "ADD COLUMN `premiumUntil` timestamp NULL" },
    { name: "trialUsed", definition: "ADD COLUMN `trialUsed` boolean DEFAULT false NOT NULL" },
    { name: "paymentReceiptUrl", definition: "ADD COLUMN `paymentReceiptUrl` text" },
    { name: "asaasCustomerId", definition: "ADD COLUMN `asaasCustomerId` varchar(64)" },
    { name: "asaasSubscriptionId", definition: "ADD COLUMN `asaasSubscriptionId` varchar(64)" },
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
