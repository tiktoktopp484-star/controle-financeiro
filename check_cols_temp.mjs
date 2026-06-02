import mysql from "mysql2/promise";
const conn = await mysql.createConnection({
  host: "gateway01.us-east-1.prod.aws.tidbcloud.com",
  port: 4000,
  user: "2iJnZj5ucUEiomK.root",
  password: "EyTP7THatmXvA81h",
  database: "controle_financeiro",
  ssl: {},
});
const [cols] = await conn.execute("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'controle_financeiro' AND TABLE_NAME = 'users'");
console.log("Columns:", cols.map(c => c.COLUMN_NAME).join(", "));
await conn.end();
