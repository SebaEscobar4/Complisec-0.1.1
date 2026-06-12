import React, { useState, useEffect } from 'react';
import axios from '../../utils/axiosSetup';
import { STATUS_MAP } from './Auditlist';

const AuditForm = ({ organizationId, onSuccess, onCancel }) => {
  const [form, setForm] = useState({
    organization_id:  organizationId,
    title:            '',
    auditor_name:     '',
    responsible_name: '',
    start_date:       '',
    status:           'NOT_STARTED',
    audit_type:       'INTERNAL',
    observations:     '',
  });
  const [errors, setErrors]           = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting]   = useState(false);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const ch = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors(p => ({ ...p, [e.target.name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim())            errs.title            = 'Requerido.';
    if (!form.auditor_name.trim())     errs.auditor_name     = 'Requerido.';
    if (!form.responsible_name.trim()) errs.responsible_name = 'Requerido.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true); setServerError('');
    try {
      const res = await axios.post('/api/audits', { ...form, start_date: form.start_date || null });
      onSuccess(res.data.data);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Error al crear la auditoría.');
    } finally { setSubmitting(false); }
  };

  // ── Estilos reutilizables ─────────────────────────────────────────────────
  const fieldStyle = (name) => ({
    background: 'rgba(255,255,255,.05)',
    border: `1px solid ${errors[name] ? 'var(--danger)' : 'rgba(255,255,255,.12)'}`,
    borderRadius: 8,
    padding: '0.75rem 1rem',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color .15s',
  });

  const Label = ({ text, required }) => (
    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
      {text}
      {required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
    </label>
  );

  return (
    // Overlay
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 500, padding: '1rem',
      }}
    >
      {/* Modal */}
      <div style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        width: '100%',
        maxWidth: 680,
        boxShadow: '0 24px 64px rgba(0,0,0,.5)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
        }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Nueva auditoría</h3>
          <button onClick={onCancel}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.3rem', lineHeight: 1, padding: '0 2px', display: 'flex', alignItems: 'center' }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

            {serverError && <div className="alert-error">{serverError}</div>}

            {/* Fila 1 — Proceso a auditar */}
            <div>
              <Label text="Proceso a auditar" required />
              <input
                name="title" value={form.title} onChange={ch}
                style={fieldStyle('title')}
                placeholder="Ej: Control de acceso — Auditoría interna ISO 27001"
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = errors.title ? 'var(--danger)' : 'rgba(255,255,255,.12)'}
              />
              {errors.title && <span className="error-text">{errors.title}</span>}
            </div>

            {/* Fila 2 — Fecha | Responsable | Auditor */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <Label text="Fecha de inicio" />
                <input type="date" name="start_date" value={form.start_date} onChange={ch}
                  style={fieldStyle('start_date')}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,.12)'}
                />
              </div>
              <div>
                <Label text="Responsable auditoría" required />
                <input name="responsible_name" value={form.responsible_name} onChange={ch}
                  style={fieldStyle('responsible_name')} placeholder="Ej: Ana Torres"
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = errors.responsible_name ? 'var(--danger)' : 'rgba(255,255,255,.12)'}
                />
                {errors.responsible_name && <span className="error-text">{errors.responsible_name}</span>}
              </div>
              <div>
                <Label text="Nombre auditor" required />
                <input name="auditor_name" value={form.auditor_name} onChange={ch}
                  style={fieldStyle('auditor_name')} placeholder="Ej: Oscar Pérez"
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = errors.auditor_name ? 'var(--danger)' : 'rgba(255,255,255,.12)'}
                />
                {errors.auditor_name && <span className="error-text">{errors.auditor_name}</span>}
              </div>
            </div>

            {/* Fila 3 — Estado | Tipo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <Label text="Estado inicial" />
                <select name="status" value={form.status} onChange={ch}
                  style={{ ...fieldStyle('status'), cursor:'pointer', colorScheme:'dark', background:'var(--panel-bg)' }}>
                  {Object.entries(STATUS_MAP).map(([v, { label }]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label text="Tipo de auditoría" />
                <select name="audit_type" value={form.audit_type} onChange={ch}
                  style={{ ...fieldStyle('audit_type'), cursor:'pointer', colorScheme:'dark', background:'var(--panel-bg)' }}>
                  <option value="INTERNAL">Interna</option>
                  <option value="EXTERNAL">Externa</option>
                </select>
              </div>
            </div>

            {/* Fila 4 — Observaciones */}
            <div>
              <Label text="Observaciones" />
              <textarea name="observations" value={form.observations} onChange={ch} rows={3}
                style={{ ...fieldStyle('observations'), resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="Alcance, contexto o notas iniciales..."
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,.12)'}
              />
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', gap: '0.75rem',
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border)',
            background: 'rgba(0,0,0,.15)',
          }}>
            <button type="button" className="btn-primary outline" onClick={onCancel}
              style={{ minWidth: 100 }}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}
              style={{ flex: 1 }}>
              {submitting ? 'Creando...' : 'Crear auditoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuditForm;