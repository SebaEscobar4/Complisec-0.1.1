import React, { useState, useMemo } from 'react';
import axios from '../../utils/axiosSetup';

/**
 * Formulario de registro: crea la organización y el usuario administrador.
 * POST /api/onboarding → { organization: {...}, admin: {...} }
 * Al completarse llama a onRegisterSuccess(data) con { user, token, organizationId }.
 */
const RegisterForm = ({ onRegisterSuccess, onGoToLogin }) => {
  const [formData, setFormData] = useState({
    orgName: '',
    industry: '',
    size: '',
    adminName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── Verificación de correo (paso previo al formulario) ──────────────────
  const [step, setStep] = useState('email'); // 'email' | 'code' | 'form'
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [verificationInfo, setVerificationInfo] = useState('');

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setVerificationError('');
    setVerificationInfo('');

    if (!isValidEmail(formData.email)) {
      setVerificationError('Ingresa un correo electrónico válido.');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post('/api/auth/send-code', { email: formData.email.trim().toLowerCase() });
      setVerificationInfo(`Te enviamos un código a ${formData.email.trim().toLowerCase()}.`);
      setStep('code');
    } catch (err) {
      if (err.response?.status === 409) {
        setVerificationError(err.response.data.message || 'Este correo ya está registrado.');
      } else {
        setVerificationError('No se pudo enviar el código. Inténtalo de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setVerificationError('');

    if (!verificationCode.trim()) {
      setVerificationError('Ingresa el código que recibiste.');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post('/api/auth/verify-code', {
        email: formData.email.trim().toLowerCase(),
        code: verificationCode.trim(),
      });
      setStep('form');
    } catch (err) {
      setVerificationError(err.response?.data?.message || 'El código es inválido o ha expirado.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (serverError) setServerError('');
  };

  // ── Password strength ─────────────────────────────────────────────────────
  const passwordChecks = useMemo(() => {
    const p = formData.password;
    return {
      length:    p.length >= 8,
      uppercase: /[A-Z]/.test(p),
      lowercase: /[a-z]/.test(p),
      number:    /[0-9]/.test(p),
    };
  }, [formData.password]);

  const strengthLevel = useMemo(() => {
    const passed = Object.values(passwordChecks).filter(Boolean).length;
    if (passed <= 1) return { level: 0, label: 'Débil',    class: 'active-weak'   };
    if (passed === 2) return { level: 1, label: 'Regular',  class: 'active-fair'   };
    if (passed === 3) return { level: 2, label: 'Buena',    class: 'active-good'   };
    return                    { level: 3, label: 'Fuerte',   class: 'active-strong' };
  }, [passwordChecks]);

  // ── Validación local ──────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!formData.orgName.trim() || formData.orgName.trim().length < 2)
      e.orgName = 'El nombre de la organización debe tener al menos 2 caracteres.';
    if (!formData.industry.trim() || formData.industry.trim().length < 2)
      e.industry = 'Selecciona o escribe una industria.';
    if (!formData.size)
      e.size = 'Selecciona el tamaño de la empresa.';
    if (!formData.adminName.trim() || formData.adminName.trim().length < 2)
      e.adminName = 'El nombre debe tener al menos 2 caracteres.';
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      e.email = 'Ingresa un correo electrónico válido.';
    if (formData.password.length < 8)
      e.password = 'La contraseña debe tener al menos 8 caracteres.';
    if (formData.password !== formData.confirmPassword)
      e.confirmPassword = 'Las contraseñas no coinciden.';
    return e;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post('/api/onboarding', {
        organization: {
          name:     formData.orgName.trim(),
          industry: formData.industry.trim(),
          size:     formData.size || undefined,
        },
        admin: {
          name:     formData.adminName.trim(),
          email:    formData.email.trim().toLowerCase(),
          password: formData.password,
        },
      });

      const { data } = response.data;
      // Guardar token
      if (data.token) localStorage.setItem('token', data.token);
      // Callback al padre
      onRegisterSuccess(data);
    } catch (err) {
      if (err.response?.status === 409) {
        setServerError(err.response.data.message || 'Este correo ya está registrado.');
      } else if (err.response?.status === 400 && err.response.data.details) {
        // Mapear errores Zod del backend
        const zodErrors = {};
        err.response.data.details.forEach(d => {
          const path = d.path;
          if (path.includes('organization.name'))     zodErrors.orgName   = d.message;
          if (path.includes('organization.industry')) zodErrors.industry  = d.message;
          if (path.includes('admin.name'))            zodErrors.adminName = d.message;
          if (path.includes('admin.email'))           zodErrors.email     = d.message;
          if (path.includes('admin.password'))        zodErrors.password  = d.message;
        });
        if (Object.keys(zodErrors).length > 0) {
          setErrors(zodErrors);
        } else {
          setServerError('Error de validación. Revisa los campos.');
        }
      } else {
        setServerError('Ocurrió un error inesperado. Inténtalo de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = (field) => ({
    background: 'rgba(0,0,0,0.2)',
    border: `1px solid ${errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    color: 'var(--text-primary)',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    outline: 'none',
    fontSize: '1rem',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  });

  return (
    <div className="onboarding-container glass-panel" style={{ maxWidth: '480px', margin: '2rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'var(--accent)', margin: '0 0 0.5rem' }}>Registrar Organización</h2>
        <p className="subtitle" style={{ margin: 0 }}>
          Crea tu cuenta para comenzar con la gestión ISO 27001
        </p>
      </div>

      {serverError && (
        <div className="alert-error" data-testid="server-error">{serverError}</div>
      )}

      {/* ── Paso 1: verificación de correo ──────────────────────────────── */}
      {step === 'email' && (
        <form onSubmit={handleSendCode} data-testid="email-step-form">
          <p className="subtitle" style={{ marginTop: 0 }}>
            Para comenzar, ingresa tu correo electrónico. Te enviaremos un código de verificación.
          </p>

          {verificationError && (
            <div className="alert-error">{verificationError}</div>
          )}

          <div className="form-group">
            <label htmlFor="reg-email-step">Correo electrónico *</label>
            <input
              id="reg-email-step" type="email" name="email"
              value={formData.email} onChange={handleChange}
              placeholder="Ej: admin@miempresa.com"
              autoComplete="email"
              style={inputStyle('email')}
              data-testid="input-admin-email"
            />
          </div>

          <button type="submit" className="btn-primary full-width" disabled={isLoading}>
            {isLoading ? 'Enviando código...' : 'Enviar código de verificación'}
          </button>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <p className="text-small text-secondary">
              ¿Ya tienes una cuenta?{' '}
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit' }}
                onClick={onGoToLogin}
              >
                Inicia sesión
              </button>
            </p>
          </div>
        </form>
      )}

      {/* ── Paso 2: ingreso del código recibido ─────────────────────────── */}
      {step === 'code' && (
        <form onSubmit={handleVerifyCode} data-testid="code-step-form">
          {verificationInfo && (
            <div className="alert-success">{verificationInfo}</div>
          )}
          {verificationError && (
            <div className="alert-error">{verificationError}</div>
          )}

          <div className="form-group">
            <label htmlFor="reg-code">Código de verificación *</label>
            <input
              id="reg-code" type="text" name="verificationCode"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              style={inputStyle('code')}
              data-testid="input-verification-code"
            />
          </div>

          <button type="submit" className="btn-primary full-width" disabled={isLoading}>
            {isLoading ? 'Verificando...' : 'Verificar código'}
          </button>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit' }}
              onClick={handleSendCode}
              disabled={isLoading}
            >
              Reenviar código
            </button>
            {' · '}
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit' }}
              onClick={() => { setStep('email'); setVerificationCode(''); setVerificationError(''); setVerificationInfo(''); }}
            >
              Cambiar correo
            </button>
          </div>
        </form>
      )}

      {/* ── Paso 3: formulario de registro ──────────────────────────────── */}
      {step === 'form' && (
      <form onSubmit={handleSubmit} data-testid="register-form">
        {/* ── Organización ────────────────────────────────────────────── */}
        <fieldset>
          <legend>Datos de la organización</legend>

          <div className="form-group">
            <label htmlFor="reg-org-name">Nombre de la organización *</label>
            <input
              id="reg-org-name" type="text" name="orgName"
              value={formData.orgName} onChange={handleChange}
              placeholder="Ej: Mi Empresa S.A."
              style={inputStyle('orgName')}
              data-testid="input-org-name"
            />
            {errors.orgName && <span className="error-text">{errors.orgName}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-industry">Industria *</label>
            <select
              id="reg-industry" name="industry"
              value={formData.industry} onChange={handleChange}
              style={inputStyle('industry')}
              data-testid="input-org-industry"
            >
              <option value="">Seleccionar industria...</option>
              <option value="Tecnología">Tecnología</option>
              <option value="Finanzas">Finanzas</option>
              <option value="Salud">Salud</option>
              <option value="Educación">Educación</option>
              <option value="Comercio">Comercio</option>
              <option value="Manufactura">Manufactura</option>
              <option value="Gobierno">Gobierno</option>
              <option value="Servicios">Servicios</option>
              <option value="Otro">Otro</option>
            </select>
            {errors.industry && <span className="error-text">{errors.industry}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-size">Tamaño de la empresa *</label>
            <select
              id="reg-size" name="size"
              value={formData.size} onChange={handleChange}
              style={inputStyle('size')}
            >
              <option value="">Seleccionar...</option>
              <option value="MICRO">1 – 10 empleados</option>
              <option value="SMALL">11 – 50 empleados</option>
              <option value="MEDIUM">51 – 200 empleados</option>
              <option value="LARGE">Más de 200 empleados</option>
            </select>
            {errors.size && <span className="error-text">{errors.size}</span>}
          </div>
        </fieldset>

        {/* ── Administrador ───────────────────────────────────────────── */}
        <fieldset>
          <legend>Tu cuenta de administrador</legend>

          <div className="form-group">
            <label htmlFor="reg-admin-name">Nombre completo *</label>
            <input
              id="reg-admin-name" type="text" name="adminName"
              value={formData.adminName} onChange={handleChange}
              placeholder="Ej: Juan Pérez"
              style={inputStyle('adminName')}
            />
            {errors.adminName && <span className="error-text">{errors.adminName}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Correo electrónico *</label>
            <input
              id="reg-email" type="email" name="email"
              value={formData.email} readOnly
              style={{ ...inputStyle('email'), opacity: 0.7, cursor: 'not-allowed' }}
              data-testid="input-admin-email"
            />
            <span className="text-small text-secondary">✅ Correo verificado</span>
            {errors.email && <span className="error-text" data-testid="error-admin-email">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Contraseña *</label>
            <div className="password-wrapper">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                style={inputStyle('password')}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(p => !p)}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && <span className="error-text">{errors.password}</span>}

            {/* Barra de fortaleza */}
            {formData.password.length > 0 && (
              <>
                <div className="password-strength-bars">
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      className={`strength-bar ${i <= strengthLevel.level ? strengthLevel.class : ''}`}
                    />
                  ))}
                </div>
                <div className="password-checklist">
                  {[
                    [passwordChecks.length,    'Al menos 8 caracteres'],
                    [passwordChecks.uppercase, 'Una letra mayúscula'],
                    [passwordChecks.lowercase, 'Una letra minúscula'],
                    [passwordChecks.number,    'Un número'],
                  ].map(([valid, text]) => (
                    <div key={text} className={`check-item ${valid ? 'valid' : ''}`}>
                      <span className="check-circle" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="reg-confirm-password">Confirmar contraseña *</label>
            <input
              id="reg-confirm-password"
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repite la contraseña"
              autoComplete="new-password"
              style={inputStyle('confirmPassword')}
            />
            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
          </div>
        </fieldset>

        <button
          type="submit"
          className="btn-primary full-width"
          disabled={isLoading}
        >
          {isLoading ? 'Creando cuenta...' : '🚀 Crear cuenta y comenzar'}
        </button>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <p className="text-small text-secondary">
            ¿Ya tienes una cuenta?{' '}
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit' }}
              onClick={onGoToLogin}
            >
              Inicia sesión
            </button>
          </p>
        </div>
      </form>
      )}
    </div>
  );
};

export default RegisterForm;
