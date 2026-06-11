import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function run() {
  const res = await pool.query("SELECT * FROM risk_tasks LIMIT 5;");
  console.log("Tasks:", res.rows);
  const soaRes = await pool.query("SELECT * FROM soa LIMIT 5;");
  console.log("SoA:", soaRes.rows);
  pool.end();
}
run();
