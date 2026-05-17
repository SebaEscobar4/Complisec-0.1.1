import React, { useState, useEffect } from 'react';
import axios from '../../utils/axiosSetup';
import AuditDetail from './AuditDetail';
import AuditForm from './AuditForm';

export const STATUS_MAP = {
  NOT_STARTED: { label: 'No iniciada', color: 'var(--text-secondary)', bg: 'rgba(255,255,255,.06)' },
  IN_PROGRESS: { label: 'En proceso',  color: 'var(--warning)',        bg: 'rgba(245,158,11,.1)'  },
  COMPLETED:   { label: 'Terminada',   color: 'var(--success)',        bg: 'rgba(16,185,129,.1)'  },
};

export const RATING_MAP = {
  APPROVED:                  { label: 'Aprobada',                   color: 'var(--success)' },
  APPROVED_WITH_OBSERVATIONS:{ label: 'Aprobada con observaciones', color: 'var(--warning)' },
  NOT_APPROVED:              { label: 'No aprobada',                color: 'var(--danger)'  },
};

export const ACTION_STAGES = [
  'Sin iniciar',
  '1. Comunicación de inicio y alcance',
  '2. Recolección de evidencias',
  '3. Análisis y validación de evidencias',
  '4. Auditor valida evidencias en repositorio',
  '5. Sesión de ajustes y validación de evidencia adicional',
  '6. Ajustes adicionales basados en observaciones',
  '7. Recepción de borrador y revisión con responsables',
  '8. Sesión de borrador de informe y acciones correctivas',
  '9. Formalizar planes y responsables',
  '10. Cierre e informe final',
];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const progressPct = (stage) => stage === 0 ? 0 : Math.round((stage / 10) * 100);

const AuditList = ({ organizationId }) => {
  const [audits, setAudits]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [selected, setSelected]     = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [filterStatus, setFilterStatus]           = useState('ALL');
  const [filterRating, setFilterRating]           = useState('ALL');
  const [filterResponsible, setFilterResponsible] = useState('');

  const fetchAudits = async () => {
    setLoading(true); setError('');
    try {
      const res = await axios.get(`/api/audits?organization_id=${organizationId}`);
      setAudits(res.data.data || []);
    } catch { setError('Error al cargar las auditorías.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAudits(); }, [organizationId]);

  const handleCreated = (a) => { setAudits(prev => [a, ...prev]); setShowForm(false); };
  const handleUpdated = (a) => { setAudits(prev => prev.map(x => x.id === a.id ? a : x)); setSelected(a); };

  const responsibles = [...new Set(audits.map(a => a.responsible_name).filter(Boolean))];
  const filtered = audits.filter(a => {
    const okS = filterStatus === 'ALL' || a.status === filterStatus;
    const okR = filterRating === 'ALL' || a.rating === filterRating;
    const okP = !filterResponsible || a.responsible_name === filterResponsible;
    return okS && okR && okP;
  });

  if (selected) return <AuditDetail audit={selected} organizationId={organizationId} onBack={() => setSelected(null)} onUpdated={handleUpdated} />;

  return (
    <div>
      <div className="section-header" style={{ marginBottom:'1.5rem' }}>
        <div>
          <h2 style={{ margin:'0 0 .25rem' }}>Auditorías</h2>
          <p style={{ margin:0, color:'var(--text-secondary)', fontSize:'0.88rem' }}>
            Registro y seguimiento de auditorías — Cláusula 9.2
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancelar' : '+ Nueva auditoría'}
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}
      {showForm && <AuditForm organizationId={organizationId} onSuccess={handleCreated} onCancel={() => setShowForm(false)} />}

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'1.5rem' }}>
        {[
          [audits.length, 'Total', 'var(--text-primary)'],
          [audits.filter(a=>a.status==='IN_PROGRESS').length, 'En proceso', 'var(--warning)'],
          [audits.filter(a=>a.status==='COMPLETED').length, 'Terminadas', 'var(--success)'],
          [audits.filter(a=>a.rating==='NOT_APPROVED').length, 'No aprobadas', 'var(--danger)'],
        ].map(([n,label,color]) => (
          <div key={label} className="glass-panel summary-card">
            <div className="big-number" style={{ color }}>{n}</div>
            <div className="card-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1.25rem', flexWrap:'wrap', alignItems:'center' }}>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
          style={{ background:'rgba(0,0,0,.25)', border:'1px solid var(--border)', borderRadius:8, padding:'0.55rem 0.9rem', color:'var(--text-primary)', fontSize:'0.85rem', outline:'none', cursor:'pointer' }}>
          <option value="ALL">Todos los estados</option>
          {Object.entries(STATUS_MAP).map(([v,{label}]) => <option key={v} value={v}>{label}</option>)}
        </select>
        <select value={filterRating} onChange={e=>setFilterRating(e.target.value)}
          style={{ background:'rgba(0,0,0,.25)', border:'1px solid var(--border)', borderRadius:8, padding:'0.55rem 0.9rem', color:'var(--text-primary)', fontSize:'0.85rem', outline:'none', cursor:'pointer' }}>
          <option value="ALL">Todas las calificaciones</option>
          {Object.entries(RATING_MAP).map(([v,{label}]) => <option key={v} value={v}>{label}</option>)}
        </select>
        <select value={filterResponsible} onChange={e=>setFilterResponsible(e.target.value)}
          style={{ background:'rgba(0,0,0,.25)', border:'1px solid var(--border)', borderRadius:8, padding:'0.55rem 0.9rem', color:'var(--text-primary)', fontSize:'0.85rem', outline:'none', cursor:'pointer' }}>
          <option value="">Todos los responsables</option>
          {responsibles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {(filterStatus!=='ALL'||filterRating!=='ALL'||filterResponsible) && (
          <button onClick={()=>{setFilterStatus('ALL');setFilterRating('ALL');setFilterResponsible('');}}
            style={{ background:'none', border:'1px solid var(--border)', color:'var(--text-secondary)', fontSize:'0.8rem', padding:'0.5rem 0.9rem', borderRadius:8, cursor:'pointer' }}>
            Limpiar filtros
          </button>
        )}
        <span style={{ marginLeft:'auto', fontSize:'0.8rem', color:'var(--text-secondary)' }}>
          {filtered.length} de {audits.length}
        </span>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="loading-container"><p>Cargando auditorías...</p></div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel" style={{ textAlign:'center', padding:'3rem' }}>
          <p style={{ color:'var(--text-secondary)', margin:'0 0 1rem' }}>
            {audits.length === 0 ? 'No hay auditorías registradas aún.' : 'Sin resultados con los filtros aplicados.'}
          </p>
          {audits.length === 0 && <button className="btn-primary" onClick={()=>setShowForm(true)}>Registrar primera auditoría</button>}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          {filtered.map(audit => {
            const st  = STATUS_MAP[audit.status] || STATUS_MAP.NOT_STARTED;
            const rt  = RATING_MAP[audit.rating];
            const pct = progressPct(audit.action_plan_stage || 0);
            return (
              <div key={audit.id} onClick={()=>setSelected(audit)} className="glass-panel"
                style={{ cursor:'pointer', padding:'1.25rem 1.5rem', transition:'border-color .15s' }}
                onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(59,130,246,.4)'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:'1rem' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    {/* Título y badges */}
                    <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.4rem', flexWrap:'wrap' }}>
                      <span style={{ fontSize:'1rem', fontWeight:700 }}>{audit.title}</span>
                      <span style={{ fontSize:'0.72rem', fontWeight:600, color:st.color, background:st.bg, borderRadius:10, padding:'2px 9px' }}>{st.label}</span>
                      {rt && <span style={{ fontSize:'0.72rem', fontWeight:600, color:rt.color, background:`${rt.color}18`, borderRadius:10, padding:'2px 9px' }}>{rt.label}</span>}
                    </div>
                    {/* Meta */}
                    <div style={{ display:'flex', gap:'1.5rem', fontSize:'0.8rem', color:'var(--text-secondary)', flexWrap:'wrap', marginBottom:'0.75rem' }}>
                      <span>Auditor: <strong style={{ color:'var(--text-primary)' }}>{audit.auditor_name}</strong></span>
                      <span>Responsable: <strong style={{ color:'var(--text-primary)' }}>{audit.responsible_name}</strong></span>
                      <span>{fmtDate(audit.start_date)}{audit.end_date?` → ${fmtDate(audit.end_date)}`:''}</span>
                    </div>
                    {/* Barra de plan de acción */}
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.3rem' }}>
                        <span style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>
                          {audit.action_plan_stage > 0 ? ACTION_STAGES[audit.action_plan_stage] : 'Plan de acción no iniciado'}
                        </span>
                        <span style={{ fontSize:'0.75rem', fontWeight:600, color:pct===100?'var(--success)':'var(--accent)' }}>{pct}%</span>
                      </div>
                      <div style={{ height:5, background:'rgba(255,255,255,.06)', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:5, width:`${pct}%`, background:pct===100?'var(--success)':'linear-gradient(90deg,var(--accent),var(--success))', borderRadius:3, transition:'width .4s' }} />
                      </div>
                    </div>
                  </div>
                  {/* Indicador informe */}
                  <div style={{ flexShrink:0, textAlign:'center' }}>
                    <span style={{ fontSize:'0.72rem', color: audit.report_url?'var(--success)':'var(--text-secondary)', background: audit.report_url?'rgba(16,185,129,.1)':'rgba(255,255,255,.04)', border:`1px solid ${audit.report_url?'rgba(16,185,129,.2)':'var(--border)'}`, borderRadius:8, padding:'3px 8px', display:'block' }}>
                      {audit.report_url ? 'Informe subido' : 'Sin informe'}
                    </span>
                    <div style={{ fontSize:'0.7rem', color:'var(--text-secondary)', marginTop:'0.4rem' }}>Ver detalle →</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AuditList;