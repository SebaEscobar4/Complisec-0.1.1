import nodemailer from 'nodemailer';

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }

  return transporter;
};

/**
 * Envía el correo con el código de verificación.
 * Si no hay SMTP configurado (entorno de desarrollo), el código se imprime en consola.
 */
export const sendVerificationEmail = async (email, code) => {
  const t = getTransporter();

  if (!t) {
    console.log(`[email-dev] Código de verificación para ${email}: ${code}`);
    return;
  }

  await t.sendMail({
    from: process.env.SMTP_FROM || 'CompliSec <no-reply@complisec.com>',
    to: email,
    subject: 'Tu código de verificación - CompliSec',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">CompliSec</h2>
        <p>Usa el siguiente código para verificar tu correo electrónico y continuar con tu registro:</p>
        <div style="font-size: 2rem; font-weight: 700; letter-spacing: 0.3em; text-align: center; padding: 1rem; background: #f1f5f9; border-radius: 0.5rem;">${code}</div>
        <p style="color: #64748b; font-size: 0.85rem;">Este código vence en 15 minutos. Si no solicitaste este código, puedes ignorar este correo.</p>
      </div>
    `,
  });
};
