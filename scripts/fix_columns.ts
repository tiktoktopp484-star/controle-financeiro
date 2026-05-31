import mysql from "mysql2/promise";

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const parsed = new URL(DATABASE_URL);
  const conn = await mysql.createConnection({
    host: parsed.hostname,
    port: Number(parsed.port),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
    ssl: {},
  });

  const [rows] = await conn.execute("SHOW COLUMNS FROM users");
  const existing = (rows as any[]).map(r => r.Field);
  console.log("Existing columns:", existing);

  const needed = ["asaasCustomerId", "asaasSubscriptionId"];
  for (const col of needed) {
    if (!existing.includes(col)) {
      console.log(`Adding column: ${col}`);
      if (col === "asaasCustomerId") {
        await conn.execute(`ALTER TABLE users ADD \`${col}\` varchar(64)`);
      } else {
        await conn.execute(`ALTER TABLE users ADD \`${col}\` varchar(64)`);
      }
      console.log(`Added ${col}`);
    } else {
      console.log(`Column ${col} already exists`);
    }
  }

  await conn.end();
  console.log("Done");
}

main().catch(console.error);
