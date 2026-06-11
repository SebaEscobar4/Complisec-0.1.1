import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "complisec_user",
  password: "complisec_password",
  database: "complisec",
});

async function run() {
  const r = await pool.query("SELECT id, threat, treatment_decision FROM risk_profiles;");
  console.log("Risks:", r.rows);
  const s = await pool.query("SELECT id, control_id, risk_profile_id FROM soa;");
  console.log("SoA:", s.rows);
  pool.end();
}
run();
