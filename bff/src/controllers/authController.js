import { authenticateUser } from '../services/authService.js';
import { requestVerificationCode, confirmVerificationCode } from '../services/verificationService.js';
import { query } from '../config/db.js';

/**
 * POST /api/auth/login
 * Autentica al usuario y retorna el token JWT con los datos del usuario.
 */
export const handleLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authenticateUser(email, password);

    return res.status(200).json({
      message: 'Inicio de sesión exitoso.',
      data: { user, token },
    });
  } catch (error) {
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ error: 'Unauthorized', message: 'Correo o contraseña incorrectos.' });
    }
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Devuelve los datos del usuario autenticado según el JWT.
 * Usado por el frontend para obtener el nombre después del login.
 */
export const handleGetMe = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, email, role, organization_id FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Usuario no encontrado.' });
    }

    return res.status(200).json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/send-code
 * Genera y envía un código de verificación al correo indicado.
 */
export const handleSendCode = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Bad Request', message: 'Ingresa un correo electrónico válido.' });
    }

    await requestVerificationCode(email);

    return res.status(200).json({ message: 'Código enviado. Revisa tu correo electrónico.' });
  } catch (error) {
    if (error.message === 'Email already registered') {
      return res.status(409).json({ error: 'Conflict', message: 'Este correo ya está registrado. Por favor inicia sesión.' });
    }
    next(error);
  }
};

/**
 * POST /api/auth/verify-code
 * Verifica el código enviado al correo del usuario.
 */
export const handleVerifyCode = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Bad Request', message: 'Correo y código son requeridos.' });
    }

    await confirmVerificationCode(email, code);

    return res.status(200).json({ message: 'Correo verificado correctamente.' });
  } catch (error) {
    if (error.message === 'Invalid or expired code') {
      return res.status(400).json({ error: 'Bad Request', message: 'El código es inválido o ha expirado.' });
    }
    next(error);
  }
};
