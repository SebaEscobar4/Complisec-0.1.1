import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// En hosts como Render/Railway, la base se configura con DATABASE_URL.
// En Docker local seguimos usando las variables DB_* sueltas.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    })
  : new Pool({
      host: process.env.DB_HOST || 'database',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'complisec_user',
      password: process.env.DB_PASSWORD || 'complisec_password',
      database: process.env.DB_NAME || 'complisec',
    });

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();
