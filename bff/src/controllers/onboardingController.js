import { createOrganizationAndAdmin } from '../services/onboardingService.js';
import { generateTokenForUser } from '../services/authService.js';
import { isEmailVerified } from '../services/verificationService.js';

/**
 * POST /api/onboarding
 * Crea la organización y su usuario administrador en una transacción atómica.
 * Retorna el token JWT para que el frontend haga auto-login.
 *
 * Body esperado:
 * {
 *   organization: { name, industry, size },
 *   admin: { name, email, password }
 * }
 */
export const handleOnboarding = async (req, res, next) => {
  try {
    const { organization, admin } = req.body;

    const verified = await isEmailVerified(admin.email);
    if (!verified) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Debes verificar tu correo electrónico antes de completar el registro.',
      });
    }

    const result = await createOrganizationAndAdmin(organization, admin);

    const token = generateTokenForUser({
      id:              result.user.id,
      name:            result.user.name,   // ← FIX: incluir name en el JWT
      organization_id: result.organizationId,
      role:            result.user.role,
    });

    return res.status(201).json({
      message: 'Organización y Administrador creados exitosamente.',
      data: {
        organizationId: result.organizationId,
        user: result.user,
        token,
      },
    });
  } catch (error) {
    console.error('Onboarding Error:', error);

    // Email duplicado (constraint users_email_key)
    if (error.code === '23505' && error.constraint === 'users_email_key') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Este correo ya está registrado. Por favor inicia sesión.',
      });
    }

    next(error);
  }
};