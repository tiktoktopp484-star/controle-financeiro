import mysql from "mysql2/promise";

async function main() {
  // Check controle_financeiro database
  const conn1 = await mysql.createConnection({
    host: "gateway01.us-east-1.prod.aws.tidbcloud.com",
    port: 4000,
    user: "2iJnZj5ucUEiomK.root",
    password: "EyTP7THatmXvA81h",
    database: "controle_financeiro",
    ssl: {},
  });
  const [tables1] = await conn1.execute("SHOW TABLES");
  console.log("Database 'controle_financeiro' tables:", tables1.map(r => Object.values(r)[0]).join(", "));
  await conn1.end();

  // Check sys database
  const conn2 = await mysql.createConnection({
    host: "gateway01.us-east-1.prod.aws.tidbcloud.com",
    port: 4000,
    user: "2iJnZj5ucUEiomK.root",
    password: "EyTP7THatmXvA81h",
    database: "sys",
    ssl: {},
  });
  const [tables2] = await conn2.execute("SHOW TABLES");
  console.log("Database 'sys' tables:", tables2.map(r => Object.values(r)[0]).join(", "));
  await conn2.end();
}
main().catch((e) => console.error("Error:", e.message));
