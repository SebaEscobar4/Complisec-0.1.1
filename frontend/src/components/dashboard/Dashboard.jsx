import React, { useState, useEffect } from 'react';
import axios from '../../utils/axiosSetup';

// ─── Mapeo: dominio de riesgo del diagnóstico → controles ISO a implementar ──
// Cada entrada tiene: control número, nombre, descripción de la tarea, prioridad base
const DOMAIN_TASKS = {
  acceso: [
    { control: 'A.9.2',   task: 'Documentar proceso de altas y bajas de accesos',          iso: 'A.9.2'   },
    { control: 'A.9.4.2', task: 'Implementar autenticación de doble factor (MFA)',          iso: 'A.9.4.2' },
    { control: 'A.9.1',   task: 'Definir política de control de acceso',                    iso: 'A.9.1'   },
  ],
  cripto: [
    { control: 'A.10.1',  task: 'Cifrar datos sensibles en reposo (bases de datos, discos)', iso: 'A.10.1' },
    { control: 'A.10.1',  task: 'Verificar cifrado en tránsito en todos los servicios',      iso: 'A.10.1' },
    { control: 'A.8.24',  task: 'Documentar política de uso de criptografía',                iso: 'A.8.24' },
  ],
  ops: [
    { control: 'A.8.15',  task: 'Configurar logs de acceso con retención ≥90 días',         iso: 'A.8.15' },
    { control: 'A.8.8',   task: 'Establecer proceso de gestión de parches de seguridad',    iso: 'A.8.8'  },
    { control: 'A.8.13',  task: 'Implementar y probar backups de datos críticos',            iso: 'A.8.13' },
  ],
  inc: [
    { control: 'A.5.24',  task: 'Documentar plan de respuesta a incidentes de seguridad',   iso: 'A.5.24' },
    { control: 'A.5.26',  task: 'Definir responsable y canal de reporte de incidentes',     iso: 'A.5.26' },
    { control: 'A.6.3',   task: 'Ejecutar capacitación en seguridad para empleados',        iso: 'A.6.3'  },
  ],
  cont: [
    { control: 'A.5.29',  task: 'Definir RTO y RPO para sistemas críticos',                 iso: 'A.5.29' },
    { control: 'A.5.30',  task: 'Documentar plan de continuidad de negocio',                iso: 'A.5.30' },
    { control: 'A.8.13',  task: 'Probar restauración de backups y documentar resultado',    iso: 'A.8.13' },
  ],
};

// Controles del SoA que no están implementados → tareas pendientes
const SOA_STATUS_TASKS = {
  NOT_IMPLEMENTED: { label: 'Pendiente',    color: 'var(--danger)',  icon: '❌' },
  PARTIAL:         { label: 'En progreso',  color: 'var(--warning)', icon: '🟡' },
};

const diagColor = (score) => {
  if (score >= 70) return 'var(--danger)';
  if (score >= 45) return 'var(--warning)';
  if (score >= 20) return 'var(--accent)';
  return 'var(--success)';
};

const riskLevelClass = (level) => {
  if (level >= 15) return 'risk-high';
  if (level >= 8)  return 'risk-medium';
  return 'risk-low';
};

const treatmentLabel = (d) => ({ MITIGATE:'Mitigar', ACCEPT:'Aceptar', TRANSFER:'Transferir', AVOID:'Evitar' }[d] || d);

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
const Dashboard = ({ organizationId, onNavigate, diagnosticRisks, onOpenDiagnostic }) => {
  const [risks, setRisks]       = useState([]);
  const [assets, setAssets]     = useState([]);
  const [controls, setControls] = useState([]);
  const [diagRisks, setDiagRisks] = useState(diagnosticRisks || []);
  const [audits, setAudits]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError('');
      try {
        const [risksRes, assetsRes, soaRes, auditsRes] = await Promise.all([
          axios.get(`/api/risks?organization_id=${organizationId}`),
          axios.get(`/api/assets?organization_id=${organizationId}`),
          axios.get(`/api/soa?organization_id=${organizationId}`),
          axios.get(`/api/audits?organization_id=${organizationId}`).catch(()=>({data:{data:[]}})),
        ]);
        setRisks(risksRes.data.data   || []);
        setAssets(assetsRes.data.data || []);
        setControls(soaRes.data.data  || []);
        setAudits(auditsRes.data.data || []);

        if (!diagnosticRisks || diagnosticRisks.length === 0) {
          try {
            const diagRes = await axios.get(`/api/diagnostic?organization_id=${organizationId}`);
            setDiagRisks(diagRes.data.data || []);
          } catch { /* no bloquea */ }
        }
      } catch (err) {
        setError('Error al cargar los datos del dashboard.');
      } finally {
        setLoading(false);
      }
    };
    if (organizationId) fetchAll();
  }, [organizationId]);

  // ── Métricas ──────────────────────────────────────────────────────────────
  const totalControls       = controls.length;
  const implementedControls = controls.filter(c => c.implementation_status === 'FULLY_IMPLEMENTED').length;
  const partialControls     = controls.filter(c => c.implementation_status === 'PARTIAL').length;
  const pendingControls     = controls.filter(c => c.implementation_status === 'NOT_IMPLEMENTED').length;
  const compliancePct       = totalControls > 0 ? Math.round((implementedControls / totalControls) * 100) : 0;

  const hasManualRisks = risks.length > 0;
  const hasDiagnostic  = diagRisks.length > 0;
  const showDiagnostic = !hasManualRisks && hasDiagnostic;

  // ── Generar lista de tareas ───────────────────────────────────────────────
  // Fuente 1: controles del SoA que están NOT_IMPLEMENTED o PARTIAL
  const soaTasks = controls
    .filter(c => c.soa_id && (c.implementation_status === 'NOT_IMPLEMENTED' || c.implementation_status === 'PARTIAL'))
    .map(c => ({
      id:       `soa-${c.control_id}`,
      task:     c.control_name,
      iso:      c.control_number,
      status:   c.implementation_status,
      source:   'soa',
      priority: c.implementation_status === 'NOT_IMPLEMENTED' ? 1 : 2,
    }));

  // Fuente 2: tareas generadas desde el diagnóstico (dominios con riesgo alto/crítico)
  const diagTasks = hasDiagnostic
    ? diagRisks
        .filter(r => r.risk_score >= 45) // Solo alto y crítico generan tareas
        .sort((a, b) => b.risk_score - a.risk_score)
        .flatMap(r => (DOMAIN_TASKS[r.domain_key] || []).map(t => ({
          id:       `diag-${r.domain_key}-${t.control}`,
          task:     t.task,
          iso:      t.iso,
          status:   'NOT_IMPLEMENTED',
          source:   'diagnostic',
          riskScore: r.risk_score,
          riskLabel: r.risk_level_label,
          priority: r.risk_score >= 70 ? 1 : 2,
        })))
    : [];

  // Combinar, deduplicar por ISO y limitar
  const allTaskIds = new Set();
  const tasks = [...soaTasks, ...diagTasks]
    .filter(t => {
      if (allTaskIds.has(t.iso)) return false;
      allTaskIds.add(t.iso);
      return true;
    })
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 8);

  if (loading) return <div className="loading-container"><p>Cargando dashboard...</p></div>;

  return (
    <div>
      <div className="section-header">
        <h2>Panel de Control</h2>
        <span className="badge" style={{ fontSize:'0.85rem', padding:'0.4rem 0.75rem' }}>ISO/IEC 27001:2022</span>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* ── KPIs ── */}
      <div className="dashboard-summary">
        {[
          [compliancePct + '%', 'Cumplimiento general',    'var(--accent)' ],
          [implementedControls, 'Controles implementados', 'var(--success)'],
          [partialControls,     'Controles parciales',     'var(--warning)'],
          [hasManualRisks ? risks.filter(r=>r.risk_level>=15).length : diagRisks.filter(r=>r.risk_score>=70).length, 'Riesgos críticos', 'var(--danger)'],
          [assets.length,       'Activos registrados',     'var(--text-primary)'],
        ].map(([val, label, color]) => (
          <div key={label} className="glass-panel summary-card">
            <div className="big-number" style={{ color }}>{val}</div>
            <div className="card-label">{label}</div>
          </div>
        ))}
        {/* Card especial: activos con criticidad alta
        {(() => {
          const critCount = assets.filter(a => (a.confidentiality_req + a.integrity_req + a.availability_req) >= 12).length;
          return (
            <div className="glass-panel summary-card" style={{ borderColor: critCount > 0 ? 'rgba(239,68,68,.25)' : undefined }}>
              <div className="big-number" style={{ color: critCount > 0 ? 'var(--danger)' : 'var(--success)' }}>{critCount}</div>
              <div className="card-label">Activos críticos</div>
            </div>
          );
        })()} */}
      </div>

      {/* ── Barra de cumplimiento ── */}
      <div className="glass-panel" style={{ marginBottom:'2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.5rem' }}>
          <span style={{ fontWeight:600 }}>Progreso global de implementación</span>
          <span style={{ color:'var(--text-secondary)', fontSize:'0.85rem' }}>{implementedControls} de {totalControls} controles</span>
        </div>
        <div style={{ background:'rgba(0,0,0,0.3)', borderRadius:'9999px', height:'10px', overflow:'hidden' }}>
          <div style={{ width:`${compliancePct}%`, height:'100%', background: compliancePct>=70?'var(--success)':compliancePct>=40?'var(--warning)':'var(--danger)', borderRadius:'9999px', transition:'width 0.6s ease' }} />
        </div>
        <div style={{ display:'flex', gap:'1.5rem', marginTop:'0.75rem', fontSize:'0.8rem', color:'var(--text-secondary)' }}>
          <span>✅ Implementados: <strong style={{ color:'var(--success)' }}>{implementedControls}</strong></span>
          <span>🟡 Parciales: <strong style={{ color:'var(--warning)' }}>{partialControls}</strong></span>
          <span>❌ Pendientes: <strong style={{ color:'var(--danger)' }}>{pendingControls}</strong></span>
        </div>
      </div>

      {/* ── LISTA DE TAREAS PRIORITARIAS ── */}
      <div className="glass-panel" style={{ marginBottom:'2rem' }}>
        <div className="section-header" style={{ marginBottom:'1rem' }}>
          <h3 style={{ margin:0, fontSize:'1.1rem' }}>📋 Tareas prioritarias de remediación</h3>
          <button className="btn-primary outline" style={{ padding:'0.3rem 0.75rem', fontSize:'0.8rem' }}
            onClick={() => onNavigate('soa')}>
            Ver todos los controles
          </button>
        </div>

        {tasks.length === 0 ? (
          <div style={{ textAlign:'center', padding:'2rem 0' }}>
            <p style={{ color:'var(--text-secondary)', marginBottom:'1rem' }}>
              {hasDiagnostic || totalControls > 0
                ? '🎉 No hay tareas pendientes. ¡Excelente nivel de cumplimiento!'
                : 'Completa el diagnóstico o configura controles en el SoA para ver las tareas.'}
            </p>
            {!hasDiagnostic && (
              <button className="btn-primary" onClick={onOpenDiagnostic}>
                Iniciar diagnóstico ISO 27001
              </button>
            )}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
            {tasks.map((t, i) => {
              const isPriority1 = t.priority === 1;
              const statusColor = t.status === 'NOT_IMPLEMENTED' ? 'var(--danger)' : 'var(--warning)';
              const statusLabel = t.status === 'NOT_IMPLEMENTED' ? 'Pendiente' : 'En progreso';
              return (
                <div key={t.id} style={{
                  display:'flex', alignItems:'center', gap:'0.75rem',
                  padding:'0.85rem 1rem',
                  background: isPriority1 ? 'rgba(239,68,68,.04)' : 'rgba(255,255,255,.03)',
                  border: `1px solid ${isPriority1 ? 'rgba(239,68,68,.15)' : 'var(--border)'}`,
                  borderRadius:10,
                }}>
                  {/* Número de orden */}
                  <div style={{
                    width:24, height:24, borderRadius:'50%', flexShrink:0,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'0.75rem', fontWeight:700,
                    background: isPriority1 ? 'rgba(239,68,68,.15)' : 'rgba(255,255,255,.06)',
                    color: isPriority1 ? 'var(--danger)' : 'var(--text-secondary)',
                  }}>
                    {i + 1}
                  </div>

                  {/* Descripción de la tarea */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'0.88rem', fontWeight:600, color:'var(--text-primary)', marginBottom:2 }}>
                      {t.task}
                    </div>
                    <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap' }}>
                      {t.source === 'diagnostic' && t.riskLabel && (
                        <span style={{ fontSize:'0.7rem', color: diagColor(t.riskScore), background:`${diagColor(t.riskScore)}18`, border:`1px solid ${diagColor(t.riskScore)}33`, borderRadius:10, padding:'1px 7px', fontWeight:600 }}>
                          Riesgo {t.riskLabel}
                        </span>
                      )}
                      {t.source === 'soa' && (
                        <span style={{ fontSize:'0.7rem', color:'var(--accent)', background:'rgba(59,130,246,.1)', border:'1px solid rgba(59,130,246,.2)', borderRadius:10, padding:'1px 7px', fontWeight:600 }}>
                          SoA
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Control ISO */}
                  <span style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--success)', background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.2)', borderRadius:10, padding:'2px 8px', flexShrink:0 }}>
                    {t.iso}
                  </span>

                  {/* Estado */}
                  <span style={{ fontSize:'0.72rem', color:statusColor, background:`${statusColor}15`, border:`1px solid ${statusColor}33`, borderRadius:10, padding:'2px 8px', flexShrink:0, fontWeight:600 }}>
                    {statusLabel}
                  </span>

                  {/* Botón acción */}
                  <button
                    onClick={() => onNavigate('soa')}
                    style={{ background:'none', border:'1px solid var(--border)', color:'var(--text-secondary)', fontSize:'0.75rem', padding:'0.3rem 0.65rem', borderRadius:6, cursor:'pointer', flexShrink:0, whiteSpace:'nowrap' }}
                  >
                    Gestionar →
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tasks.length > 0 && (
          <div style={{ marginTop:'1rem', padding:'0.75rem 1rem', background:'rgba(59,130,246,.05)', border:'1px solid rgba(59,130,246,.15)', borderRadius:8, fontSize:'0.8rem', color:'var(--text-secondary)' }}>
            💡 Las tareas con borde rojo son críticas según tu perfil de riesgo. Las tareas SoA provienen de controles que has marcado en tu Declaración de Aplicabilidad.
          </div>
        )}
      </div>

      {/* ── Grid inferior ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2rem' }}>

        {/* ── Riesgos ── */}
        <div className="glass-panel">
          <div className="section-header" style={{ marginBottom:'1rem' }}>
            <h3 style={{ margin:0, fontSize:'1.1rem' }}>
              ⚠️ {showDiagnostic ? 'Diagnóstico de riesgos' : 'Riesgos prioritarios'}
            </h3>
            <button className="btn-primary outline" style={{ padding:'0.3rem 0.75rem', fontSize:'0.8rem' }}
              onClick={() => onNavigate('risks')}>
              {hasManualRisks ? 'Ver todos' : 'Evaluar riesgos'}
            </button>
          </div>

          {!hasManualRisks && !hasDiagnostic && (
            <div style={{ textAlign:'center', padding:'2rem 0' }}>
              <p className="text-secondary">No hay riesgos evaluados aún.</p>
              <button className="btn-primary" onClick={() => onNavigate('risks')}>Evaluar primer riesgo</button>
            </div>
          )}

          {hasManualRisks && (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
              {risks.slice(0, 5).map(risk => (
                <div key={risk.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.6rem 0.75rem', background:'rgba(0,0,0,0.15)', borderRadius:'0.5rem', gap:'1rem' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'0.85rem', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{risk.asset_name}</div>
                    <div className="text-secondary text-small">{risk.threat}</div>
                  </div>
                  <span className={`status-badge ${riskLevelClass(risk.risk_level)}`}>{risk.risk_level}</span>
                  <span className="badge" style={{ fontSize:'0.7rem' }}>{treatmentLabel(risk.treatment_decision)}</span>
                </div>
              ))}
            </div>
          )}

          {showDiagnostic && (
            <>
              <div style={{ background:'rgba(245,158,11,.08)', border:'0.5px solid rgba(245,158,11,.3)', borderRadius:8, padding:'8px 12px', fontSize:11, color:'#F39C12', marginBottom:'1rem' }}>
                Perfil del diagnóstico inicial. Evalúa riesgos específicos para mayor detalle.
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                {diagRisks.map(r => (
                  <div key={r.domain_key} style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.6rem 0.75rem', background:'rgba(0,0,0,0.15)', borderRadius:'0.5rem' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'0.85rem', fontWeight:600 }}>{r.domain_label}</div>
                    </div>
                    <div style={{ width:80, height:5, background:'rgba(255,255,255,.1)', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:5, width:`${r.risk_score}%`, background:diagColor(r.risk_score), borderRadius:3, transition:'width .5s' }} />
                    </div>
                    <span style={{ fontSize:'0.72rem', fontWeight:600, color:diagColor(r.risk_score), width:48, textAlign:'right', flexShrink:0 }}>
                      {r.risk_level_label}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Activos ── */}
        <div className="glass-panel">
          <div className="section-header" style={{ marginBottom:'1rem' }}>
            <h3 style={{ margin:0, fontSize:'1.1rem' }}>🗃️ Activos registrados</h3>
            <button className="btn-primary outline" style={{ padding:'0.3rem 0.75rem', fontSize:'0.8rem' }}
              onClick={() => onNavigate('assets')}>
              {assets.length > 0 ? 'Ver todos' : 'Registrar activo'}
            </button>
          </div>

          {/* Resumen de criticidad */}
          {assets.length > 0 && (() => {
            const getCriticality = (a) => {
              const cia = a.confidentiality_req + a.integrity_req + a.availability_req;
              if (cia >= 12) return 'alta';
              if (cia >= 8)  return 'media';
              return 'baja';
            };
            const alta  = assets.filter(a => getCriticality(a) === 'alta').length;
            const media = assets.filter(a => getCriticality(a) === 'media').length;
            const baja  = assets.filter(a => getCriticality(a) === 'baja').length;
            return (
              <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem' }}>
                {[
                  ['Críticos', alta,  'var(--danger)',  'rgba(239,68,68,.1)',  'rgba(239,68,68,.25)'],
                  ['Medios',   media, 'var(--warning)', 'rgba(245,158,11,.1)', 'rgba(245,158,11,.25)'],
                  ['Bajos',    baja,  'var(--success)', 'rgba(16,185,129,.1)', 'rgba(16,185,129,.25)'],
                ].map(([label, count, color, bg, border]) => (
                  <div key={label} style={{ flex:1, background:bg, border:`1px solid ${border}`, borderRadius:8, padding:'0.5rem', textAlign:'center' }}>
                    <div style={{ fontSize:'1.4rem', fontWeight:700, color }}>{count}</div>
                    <div style={{ fontSize:'0.65rem', color, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {assets.length === 0 ? (
            <div style={{ textAlign:'center', padding:'2rem 0' }}>
              <p className="text-secondary">No hay activos registrados.</p>
              <button className="btn-primary" onClick={() => onNavigate('assets')}>Registrar primer activo</button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              {assets.slice(0, 6).map(asset => {
                const cia = asset.confidentiality_req + asset.integrity_req + asset.availability_req;
                const criticality = cia >= 12 ? 'CRÍTICA' : cia >= 8 ? 'MEDIA' : 'BAJA';
                const critColor   = cia >= 12 ? 'var(--danger)' : cia >= 8 ? 'var(--warning)' : 'var(--success)';
                const critBg      = cia >= 12 ? 'rgba(239,68,68,.12)' : cia >= 8 ? 'rgba(245,158,11,.12)' : 'rgba(16,185,129,.12)';
                const critBorder  = cia >= 12 ? 'rgba(239,68,68,.3)'  : cia >= 8 ? 'rgba(245,158,11,.3)'  : 'rgba(16,185,129,.3)';
                const critIcon    = cia >= 12 ? '🔴' : cia >= 8 ? '🟡' : '🟢';
                return (
                  <div key={asset.id} style={{
                    display:'flex', alignItems:'center', gap:'0.75rem',
                    padding:'0.65rem 0.85rem',
                    background: cia >= 12 ? 'rgba(239,68,68,.04)' : 'rgba(0,0,0,0.15)',
                    border: `1px solid ${cia >= 12 ? 'rgba(239,68,68,.15)' : 'var(--border)'}`,
                    borderRadius:'0.5rem',
                  }}>
                    {/* Icono de criticidad */}
                    <span style={{ fontSize:'0.9rem', flexShrink:0 }}>{critIcon}</span>

                    {/* Info del activo */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'0.85rem', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {asset.name}
                      </div>
                      <div style={{ display:'flex', gap:'0.4rem', marginTop:'2px', fontSize:'0.7rem', color:'var(--text-secondary)' }}>
                        <span title="Confidencialidad">C: <strong>{asset.confidentiality_req}</strong></span>
                        <span>·</span>
                        <span title="Integridad">I: <strong>{asset.integrity_req}</strong></span>
                        <span>·</span>
                        <span title="Disponibilidad">A: <strong>{asset.availability_req}</strong></span>
                        <span>·</span>
                        <span>CIA: <strong>{cia}</strong>/15</span>
                      </div>
                    </div>

                    {/* Badge de criticidad */}
                    <span style={{
                      fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.04em',
                      color: critColor, background: critBg,
                      border: `1px solid ${critBorder}`,
                      borderRadius: 6, padding:'2px 8px', flexShrink:0,
                    }}>
                      {criticality}
                    </span>
                  </div>
                );
              })}
              {assets.length > 6 && (
                <button
                  onClick={() => onNavigate('assets')}
                  style={{ background:'none', border:'1px solid var(--border)', color:'var(--text-secondary)', fontSize:'0.78rem', padding:'0.5rem', borderRadius:6, cursor:'pointer', textAlign:'center', marginTop:'0.25rem' }}
                >
                  Ver {assets.length - 6} activos más →
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Distribución de riesgos ── */}
        <div className="glass-panel">
          <h3 style={{ margin:'0 0 1rem', fontSize:'1.1rem' }}>📊 Distribución de riesgos</h3>
          <div style={{ display:'flex', gap:'1rem' }}>
            {(showDiagnostic
              ? [['Críticos (≥70)', diagRisks.filter(r=>r.risk_score>=70).length, 'var(--danger)'],
                 ['Altos (45–69)',  diagRisks.filter(r=>r.risk_score>=45&&r.risk_score<70).length, 'var(--warning)'],
                 ['Bajos (<45)',    diagRisks.filter(r=>r.risk_score<45).length, 'var(--success)']]
              : [['Críticos (≥15)', risks.filter(r=>r.risk_level>=15).length, 'var(--danger)'],
                 ['Altos (8–14)',   risks.filter(r=>r.risk_level>=8&&r.risk_level<15).length, 'var(--warning)'],
                 ['Bajos (<8)',     risks.filter(r=>r.risk_level<8).length, 'var(--success)']]
            ).map(([l, n, c]) => (
              <div key={l} style={{ flex:1, background:'rgba(0,0,0,0.2)', borderRadius:'0.75rem', padding:'1rem', textAlign:'center' }}>
                <div style={{ fontSize:'2rem', fontWeight:700, color:c }}>{n}</div>
                <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)', marginTop:'0.25rem' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>


        {/* ── Resumen de auditorías ── */}
        <div className="glass-panel">
          <div className="section-header" style={{ marginBottom:'1rem' }}>
            <h3 style={{ margin:0, fontSize:'1.1rem' }}>Auditorías</h3>
            <button className="btn-primary outline" style={{ padding:'0.3rem 0.75rem', fontSize:'0.8rem' }}
              onClick={() => onNavigate('audits')}>
              Ver todas
            </button>
          </div>
          {audits.length === 0 ? (
            <div style={{ textAlign:'center', padding:'1.5rem 0' }}>
              <p className="text-secondary" style={{ marginBottom:'0.75rem' }}>No hay auditorías registradas.</p>
              <button className="btn-primary" style={{ fontSize:'0.82rem', padding:'0.5rem 1rem' }}
                onClick={() => onNavigate('audits')}>
                Registrar primera auditoría
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              {/* Mini KPIs */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.5rem', marginBottom:'0.75rem' }}>
                {[
                  [audits.filter(a=>a.status==='IN_PROGRESS').length, 'En proceso', 'var(--warning)'],
                  [audits.filter(a=>a.status==='COMPLETED').length,   'Terminadas', 'var(--success)'],
                  [audits.filter(a=>a.rating==='NOT_APPROVED').length,'No aprobadas','var(--danger)'],
                ].map(([n,label,color]) => (
                  <div key={label} style={{ background:'rgba(0,0,0,.2)', borderRadius:8, padding:'0.6rem', textAlign:'center' }}>
                    <div style={{ fontSize:'1.4rem', fontWeight:700, color, lineHeight:1 }}>{n}</div>
                    <div style={{ fontSize:'0.68rem', color:'var(--text-secondary)', marginTop:'0.2rem' }}>{label}</div>
                  </div>
                ))}
              </div>
              {/* Últimas auditorías */}
              {audits.slice(0,3).map(a => {
                const pct = a.action_plan_stage > 0 ? Math.round((a.action_plan_stage/10)*100) : 0;
                const stColor = a.status==='COMPLETED'?'var(--success)':a.status==='IN_PROGRESS'?'var(--warning)':'var(--text-secondary)';
                const stLabel = a.status==='COMPLETED'?'Terminada':a.status==='IN_PROGRESS'?'En proceso':'No iniciada';
                return (
                  <div key={a.id} onClick={()=>onNavigate('audits')}
                    style={{ padding:'0.6rem 0.75rem', background:'rgba(0,0,0,.15)', borderRadius:8, cursor:'pointer' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.3rem' }}>
                      <span style={{ fontSize:'0.85rem', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'60%' }}>{a.title}</span>
                      <span style={{ fontSize:'0.7rem', fontWeight:600, color:stColor, flexShrink:0 }}>{stLabel}</span>
                    </div>
                    <div style={{ height:4, background:'rgba(255,255,255,.06)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:4, width:`${pct}%`, background:pct===100?'var(--success)':'var(--accent)', borderRadius:2 }} />
                    </div>
                    <div style={{ fontSize:'0.7rem', color:'var(--text-secondary)', marginTop:'0.25rem' }}>
                      Plan de acción: {pct}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Acciones rápidas ── */}
        <div className="glass-panel">
          <h3 style={{ margin:'0 0 1rem', fontSize:'1.1rem' }}>🚀 Acciones rápidas</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {[['➕ Registrar nuevo activo',     'assets'],
              ['⚠️ Evaluar riesgo sobre activo', 'risks' ],
              ['📋 Actualizar controles (SoA)',  'soa'   ],
              ['📎 Subir evidencia de control',  'soa'   ],
            ].map(([label, view]) => (
              <button key={label} className="btn-primary outline"
                style={{ textAlign:'left', padding:'0.65rem 1rem', display:'flex', gap:'0.5rem', alignItems:'center' }}
                onClick={() => onNavigate(view)}>
                {label}
              </button>
            ))}
            {onOpenDiagnostic && (
              <button className="btn-primary outline"
                style={{ textAlign:'left', padding:'0.65rem 1rem', display:'flex', gap:'0.5rem', alignItems:'center', borderColor:'rgba(16,185,129,.3)', color:'var(--success)' }}
                onClick={onOpenDiagnostic}>
                🩺 Repetir diagnóstico ISO 27001
              </button>
            )}
          </div>
        </div>

        </div>
    </div>
  );
};

export default Dashboard;