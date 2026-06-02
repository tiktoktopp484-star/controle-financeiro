import mysql from "mysql2/promise";

const conn = await mysql.createConnection({
  host: "gateway01.us-east-1.prod.aws.tidbcloud.com",
  port: 4000,
  user: "2iJnZj5ucUEiomK.root",
  password: "EyTP7THatmXvA81h",
  database: "controle_financeiro",
  ssl: {},
});
await conn.execute(
  "UPDATE users SET passwordHash = ? WHERE email = ?",
  ["5cc00eb59743f70738286b43b7eeeba8:06547d3812ac0406aeaec6ee3e2b891956eb515456114cbda17ec016e62828a7169222bff649504d98cc68982b4256875689918d7a9adfdbf5130dad3f522f70", "teste@teste.com"]
);
console.log("Password updated for teste@teste.com");
await conn.end();
