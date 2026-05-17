import React, { useState } from 'react';
import axios from '../../utils/axiosSetup';
import { STATUS_MAP } from './AuditList';

const AuditForm = ({ organizationId, onSuccess, onCancel }) => {
  const [form, setForm] = useState({
    organization_id:  organizationId,
    title:            '',
    auditor_name:     '',
    responsible_name: '',
    start_date:       '',
    end_date:         '',
    status:           'NOT_STARTED',
    observations:     '',
  });
  const [errors, setErrors]           = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting]   = useState(false);

  const ch = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors(p => ({ ...p, [e.target.name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim())            errs.title            = 'El nombre de la auditoría es obligatorio.';
    if (!form.auditor_name.trim())     errs.auditor_name     = 'El nombre del auditor es obligatorio.';
    if (!form.responsible_name.trim()) errs.responsible_name = 'El responsable del proceso es obligatorio.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true); setServerError('');
    try {
      const payload = { ...form, start_date: form.start_date || null };
      const res = await axios.post('/api/audits', payload);
      onSuccess(res.data.data);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Error al crear la auditoría. Verifica que el servidor esté corriendo.');
    } finally { setSubmitting(false); }
  };

  const inputStyle = (name) => ({
    background: 'rgba(0,0,0,.25)',
    border: `1px solid ${errors[name] ? 'var(--danger)' : 'var(--border)'}`,
    borderRadius: 8,
    padding: '0.7rem 1rem',
    color: 'var(--text-primary)',
    fontSize: '0.88rem',
    outline: 'none',
    width: '100%',
  });

  return (
    <div className="glass-panel" style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--accent)' }}>
      <form onSubmit={handleSubmit}>
        <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700 }}>Nueva auditoría</h3>

        {serverError && <div className="alert-error" style={{ marginBottom: '1rem' }}>{serverError}</div>}

        {/* Nombre */}
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Nombre de la auditoría *</label>
          <input name="title" value={form.title} onChange={ch} style={inputStyle('title')}
            placeholder="Ej: Auditoría interna ISO 27001 — 2026" />
          {errors.title && <span className="error-text">{errors.title}</span>}
        </div>

        {/* Auditor + Responsable */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Nombre del auditor *</label>
            <input name="auditor_name" value={form.auditor_name} onChange={ch} style={inputStyle('auditor_name')}
              placeholder="Ej: Oscar Pérez" />
            {errors.auditor_name && <span className="error-text">{errors.auditor_name}</span>}
          </div>
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Responsable del proceso *</label>
            <input name="responsible_name" value={form.responsible_name} onChange={ch} style={inputStyle('responsible_name')}
              placeholder="Ej: Millaray Miranda" />
            {errors.responsible_name && <span className="error-text">{errors.responsible_name}</span>}
          </div>
        </div>

        {/* Fechas + Estado */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Fecha de inicio</label>
            <input type="date" name="start_date" value={form.start_date} onChange={ch} style={inputStyle('start_date')} />
          </div>
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Fecha de cierre estimada</label>
            <input type="date" name="end_date" value={form.end_date} onChange={ch} style={inputStyle('end_date')} />
          </div>
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Estado inicial</label>
            <select name="status" value={form.status} onChange={ch} style={{ ...inputStyle('status'), cursor: 'pointer' }}>
              {Object.entries(STATUS_MAP).map(([v, { label }]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Observaciones */}
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Observaciones iniciales</label>
          <textarea name="observations" value={form.observations} onChange={ch} rows={3}
            style={{ ...inputStyle('observations'), resize: 'vertical' }}
            placeholder="Alcance, contexto o notas iniciales de la auditoría..." />
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" className="btn-primary outline" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={submitting} style={{ flex: 1 }}>
            {submitting ? 'Creando...' : 'Crear auditoría'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AuditForm;