import React, { useState, useRef } from 'react';
import axios from '../../utils/axiosSetup';
import { STATUS_MAP, RATING_MAP, ACTION_STAGES } from './Auditlist';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const progressPct = (stage) => stage === 0 ? 0 : Math.round((stage / 10) * 100);

const AuditDetail = ({ audit: initialAudit, organizationId, onBack, onUpdated }) => {
  const [audit, setAudit]         = useState(initialAudit);
  const [editing, setEditing]     = useState(false);
  const [form, setForm]           = useState({ ...initialAudit });
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const fileRef                   = useRef(null);

  const st  = STATUS_MAP[audit.status]  || STATUS_MAP.NOT_STARTED;
  const rt  = RATING_MAP[audit.rating];
  const pct = progressPct(audit.action_plan_stage || 0);

  const ch = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await axios.put(`/api/audits/${audit.id}`, form);
      setAudit(res.data.data);
      onUpdated(res.data.data);
      setEditing(false);
      setSuccess('Cambios guardados correctamente.');
    } catch { setError('No se pudieron guardar los cambios.'); }
    finally { setSaving(false); }
  };

  const handleUploadReport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(''); setSuccess('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await axios.post(`/api/audits/${audit.id}/report`, fd);
      setAudit(res.data.data);
      onUpdated(res.data.data);
      setSuccess('Informe subido correctamente.');
    } catch { setError('Error al subir el informe.'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  // ── Campo de texto editable / no editable ──────────────────────────────────
  const Field = ({ label, iso, value, name, type='text', textarea=false, children }) => (
    <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
        <span style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)' }}>{label}</span>
        {iso && <span style={{ fontSize:'0.68rem', fontWeight:700, color:'var(--success)', background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.2)', borderRadius:20, padding:'1px 7px' }}>{iso}</span>}
      </div>
      {children || (editing
        ? (textarea
          ? <textarea name={name} value={form[name]||''} onChange={ch} rows={3}
              style={{ background:'rgba(0,0,0,.25)', border:'1px solid var(--border)', borderRadius:8, padding:'0.65rem 0.9rem', color:'var(--text-primary)', fontSize:'0.88rem', outline:'none', width:'100%', resize:'vertical' }} />
          : <input type={type} name={name} value={form[name]||''} onChange={ch}
              style={{ background:'rgba(0,0,0,.25)', border:'1px solid var(--border)', borderRadius:8, padding:'0.65rem 0.9rem', color:'var(--text-primary)', fontSize:'0.88rem', outline:'none', width:'100%' }} />
          )
        : <span style={{ fontSize:'0.92rem', color: value ? 'var(--text-primary)' : 'var(--text-secondary)', fontStyle: value ? 'normal' : 'italic' }}>{value || 'Sin registrar'}</span>
      )}
    </div>
  );

  return (
    <div>
      {/* Navegación */}
      <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1.5rem' }}>
        <button onClick={onBack}
          style={{ background:'none', border:'1px solid var(--border)', color:'var(--text-secondary)', padding:'0.4rem 0.9rem', borderRadius:8, cursor:'pointer', fontSize:'0.85rem' }}>
          ← Volver
        </button>
        <h2 style={{ margin:0, fontSize:'1.2rem', fontWeight:700, flex:1 }}>{audit.title}</h2>
        {!editing
          ? <button className="btn-primary outline" onClick={() => { setForm({...audit}); setEditing(true); }}>Editar</button>
          : <div style={{ display:'flex', gap:'0.5rem' }}>
              <button className="btn-primary outline" onClick={() => setEditing(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving?'Guardando...':'Guardar cambios'}</button>
            </div>
        }
      </div>

      {error   && <div className="alert-error"   style={{ marginBottom:'1rem' }}>{error}</div>}
      {success && <div className="alert-success" style={{ marginBottom:'1rem' }}>{success}</div>}

      {/* Barra de progreso */}
      <div className="glass-panel" style={{ marginBottom:'1.5rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.6rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', flexWrap:'wrap' }}>
            <span style={{ fontWeight:600 }}>Plan de acción</span>
            <span style={{ fontSize:'0.72rem', fontWeight:600, color:st.color, background:st.bg, borderRadius:10, padding:'2px 9px' }}>{st.label}</span>
            {rt && <span style={{ fontSize:'0.72rem', fontWeight:600, color:rt.color, background:`${rt.color}18`, borderRadius:10, padding:'2px 9px' }}>{rt.label}</span>}
          </div>
          <span style={{ fontSize:'0.85rem', fontWeight:700, color:pct===100?'var(--success)':'var(--accent)' }}>{pct}%</span>
        </div>
        <div style={{ height:8, background:'rgba(255,255,255,.06)', borderRadius:4, overflow:'hidden', marginBottom:'1rem' }}>
          <div style={{ height:8, width:`${pct}%`, background:pct===100?'var(--success)':'linear-gradient(90deg,var(--accent),var(--success))', borderRadius:4, transition:'width .4s' }} />
        </div>
        {/* Etapas visuales */}
        <div style={{ display:'flex', gap:'0.3rem', flexWrap:'wrap' }}>
          {ACTION_STAGES.slice(1).map((label, i) => {
            const stageNum = i + 1;
            const isDone   = (audit.action_plan_stage || 0) >= stageNum;
            const isCurrent = (audit.action_plan_stage || 0) === stageNum;
            return (
              <div key={stageNum} style={{ flex:'1 1 auto', minWidth:80, padding:'0.4rem 0.5rem', borderRadius:6, textAlign:'center', fontSize:'0.65rem', fontWeight:600, background: isDone?'rgba(16,185,129,.12)':'rgba(255,255,255,.04)', border:`1px solid ${isCurrent?'var(--success)':isDone?'rgba(16,185,129,.3)':'var(--border)'}`, color: isDone?'var(--success)':'var(--text-secondary)', transition:'all .2s' }}>
                {stageNum}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize:'0.78rem', color:'var(--text-secondary)', marginTop:'0.6rem' }}>
          {(audit.action_plan_stage || 0) > 0 ? ACTION_STAGES[audit.action_plan_stage] : 'Sin iniciar'}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>

        {/* Datos principales */}
        <div className="glass-panel" style={{ display:'flex', flexDirection:'column', gap:'1.1rem' }}>
          <div style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'.06em' }}>Información general</div>
          <Field label="Auditor" value={audit.auditor_name} name="auditor_name" />
          <Field label="Responsable del proceso" iso="Cláusula 5.3" value={audit.responsible_name} name="responsible_name" />
          <Field label="Fecha de inicio" value={fmtDate(audit.start_date)} name="start_date" type="date" />
          <Field label="Fecha de cierre" value={fmtDate(audit.end_date)} name="end_date" type="date" />
        </div>

        {/* Estado y calificación */}
        <div className="glass-panel" style={{ display:'flex', flexDirection:'column', gap:'1.1rem' }}>
          <div style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'.06em' }}>Estado y calificación</div>

          <Field label="Estado" value={st.label} name="status">
            {editing && (
              <select name="status" value={form.status||'NOT_STARTED'} onChange={ch}
                style={{ background:'rgba(0,0,0,.25)', border:'1px solid var(--border)', borderRadius:8, padding:'0.65rem 0.9rem', color:'var(--text-primary)', fontSize:'0.88rem', outline:'none', width:'100%' }}>
                {Object.entries(STATUS_MAP).map(([v,{label}]) => <option key={v} value={v}>{label}</option>)}
              </select>
            )}
          </Field>

          <Field label="Calificación" value={rt?.label || null} name="rating">
            {editing && (
              <select name="rating" value={form.rating||''} onChange={ch}
                style={{ background:'rgba(0,0,0,.25)', border:'1px solid var(--border)', borderRadius:8, padding:'0.65rem 0.9rem', color:'var(--text-primary)', fontSize:'0.88rem', outline:'none', width:'100%' }}>
                <option value="">Sin calificación</option>
                {Object.entries(RATING_MAP).map(([v,{label}]) => <option key={v} value={v}>{label}</option>)}
              </select>
            )}
          </Field>

          <Field label="Plan de acción — etapa actual" value={ACTION_STAGES[audit.action_plan_stage||0]} name="action_plan_stage">
            {editing && (
              <select name="action_plan_stage" value={form.action_plan_stage||0} onChange={e=>setForm(p=>({...p,action_plan_stage:parseInt(e.target.value)}))}
                style={{ background:'rgba(0,0,0,.25)', border:'1px solid var(--border)', borderRadius:8, padding:'0.65rem 0.9rem', color:'var(--text-primary)', fontSize:'0.88rem', outline:'none', width:'100%' }}>
                {ACTION_STAGES.map((label, i) => <option key={i} value={i}>{label}</option>)}
              </select>
            )}
          </Field>
        </div>

        {/* Observaciones */}
        <div className="glass-panel" style={{ gridColumn:'1/-1', display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          <div style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'.06em' }}>Observaciones generales</div>
          <Field label="" iso="Cláusula 9.2" value={audit.observations} name="observations" textarea />
        </div>

        {/* Informe final */}
        <div className="glass-panel" style={{ gridColumn:'1/-1' }}>
          <div style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'1rem' }}>
            Informe final de auditoría
          </div>
          {audit.report_url ? (
            <div style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'0.85rem 1rem', background:'rgba(16,185,129,.05)', border:'1px solid rgba(16,185,129,.2)', borderRadius:10 }}>
              <span style={{ fontSize:'1.4rem' }}>📄</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'0.9rem', fontWeight:600 }}>{audit.report_name || 'Informe de auditoría'}</div>
                <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>Informe final cargado</div>
              </div>
              <a href={audit.report_url} target="_blank" rel="noopener noreferrer"
                style={{ background:'rgba(59,130,246,.1)', border:'1px solid rgba(59,130,246,.25)', color:'var(--accent)', borderRadius:6, padding:'0.4rem 0.85rem', fontSize:'0.82rem', textDecoration:'none', fontWeight:600, flexShrink:0 }}>
                Descargar ↗
              </a>
              <button onClick={() => fileRef.current?.click()}
                style={{ background:'none', border:'1px solid var(--border)', color:'var(--text-secondary)', borderRadius:6, padding:'0.4rem 0.85rem', fontSize:'0.82rem', cursor:'pointer', flexShrink:0 }}>
                Reemplazar
              </button>
            </div>
          ) : (
            <div onClick={() => fileRef.current?.click()}
              style={{ padding:'2rem', border:'2px dashed var(--border)', borderRadius:10, textAlign:'center', cursor:'pointer', transition:'all .15s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--accent)';e.currentTarget.style.background='rgba(59,130,246,.04)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='transparent';}}>
              <div style={{ fontSize:'0.9rem', color:'var(--text-secondary)', marginBottom:'0.3rem' }}>
                Haz clic para subir el informe final
              </div>
              <div style={{ fontSize:'0.78rem', color:'var(--text-secondary)' }}>PDF, Word · Máximo 20 MB</div>
            </div>
          )}
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display:'none' }} onChange={handleUploadReport} />
          {uploading && <div style={{ fontSize:'0.82rem', color:'var(--text-secondary)', marginTop:'0.5rem' }}>Subiendo informe...</div>}
        </div>

      </div>
    </div>
  );
};

export default AuditDetail;