import { query } from '../config/db.js';
import { sendVerificationEmail } from './emailService.js';

const CODE_TTL_MINUTES = 15;

const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));

/**
 * Genera un código de 6 dígitos, lo guarda y lo envía al correo indicado.
 */
export const requestVerificationCode = async (email) => {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rows.length > 0) {
    throw new Error('Email already registered');
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  await query(
    `INSERT INTO email_verifications (email, code, verified, expires_at) VALUES ($1, $2, false, $3)`,
    [normalizedEmail, code, expiresAt]
  );

  await sendVerificationEmail(normalizedEmail, code);
};

/**
 * Verifica el código ingresado por el usuario y, si es correcto, marca el correo como verificado.
 */
export const confirmVerificationCode = async (email, code) => {
  const normalizedEmail = email.trim().toLowerCase();

  const result = await query(
    `SELECT id FROM email_verifications
     WHERE email = $1 AND code = $2 AND verified = false AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [normalizedEmail, code]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid or expired code');
  }

  await query('UPDATE email_verifications SET verified = true WHERE id = $1', [result.rows[0].id]);
};

/**
 * Indica si el correo tiene una verificación válida y vigente.
 */
export const isEmailVerified = async (email) => {
  const normalizedEmail = email.trim().toLowerCase();

  const result = await query(
    `SELECT id FROM email_verifications
     WHERE email = $1 AND verified = true AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [normalizedEmail]
  );

  return result.rows.length > 0;
};
