const mysql = require('mysql2');
const url = 'mysql://2iJnZj5ucUEiomK.root:jJ8lO49ARGPcQ7OL@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}';
console.log('URL:', url);
const conn = mysql.createConnection(url);
conn.connect(err => {
  if (err) {
    console.error('Error:', err.message);
  } else {
    console.log('Connected!');
    conn.query('SELECT 1', (err2, rows) => {
      console.log('Query:', err2 ? err2.message : 'OK', rows);
      conn.end();
    });
  }
});
