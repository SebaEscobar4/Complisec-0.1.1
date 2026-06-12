import React, { useState, useEffect } from 'react';
import axios from '../../utils/axiosSetup';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import GoalsModal from './GoalsModal';

// Controles del SoA que no están implementados → tareas pendientes
const SOA_STATUS_TASKS = {
  NOT_IMPLEMENTED: { label: 'Pendiente',    color: 'var(--danger)',  icon: '❌' },
  PARTIAL:         { label: 'En progreso',  color: 'var(--warning)', icon: '🟡' },
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
  const [complianceGoals, setComplianceGoals] = useState([]);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError('');
      try {
        const [risksRes, assetsRes, soaRes, auditsRes, goalsRes] = await Promise.all([
          axios.get(`/api/risks?organization_id=${organizationId}`),
          axios.get(`/api/assets?organization_id=${organizationId}`),
          axios.get(`/api/soa?organization_id=${organizationId}`),
          axios.get(`/api/audits?organization_id=${organizationId}`).catch(()=>({data:{data:[]}})),
          axios.get(`/api/organizations/${organizationId}/goals`).catch(()=>({data:{data:[]}})),
        ]);
        setRisks(risksRes.data.data   || []);
        setAssets(assetsRes.data.data || []);
        setControls(soaRes.data.data  || []);
        setAudits(auditsRes.data.data || []);
        setComplianceGoals(goalsRes.data.data || []);

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

  // Deduplicar por ISO y limitar
  const allTaskIds = new Set();
  const tasks = soaTasks
    .filter(t => {
      if (allTaskIds.has(t.iso)) return false;
      allTaskIds.add(t.iso);
      return true;
    })
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 8);

  // ── Road Map Logic ──────────────────────────────────────────────────────────
  // Fase 1: Activos (100% si hay al menos 1)
  const phase1Pct = assets.length > 0 ? 100 : 0;
  // Fase 2: Riesgos (% de riesgos gestionados: tratados con plan, o aceptados/transferidos/evitados)
  const managedRisksCount = risks.filter(r => r.treatment_decision !== 'MITIGATE' || r.has_plan).length;
  const phase2Pct = hasManualRisks
    ? Math.round((managedRisksCount / risks.length) * 100)
    : (hasDiagnostic ? 50 : 0);
  // Fase 3: Controles
  const phase3Pct = compliancePct;
  // Fase 4: Auditorías
  const phase4Pct = audits.length > 0 ? 100 : 0;

  const currentPhase = phase1Pct < 100 ? 1 : phase2Pct < 100 ? 2 : phase3Pct < 100 ? 3 : 4;

  const getFriendlyTask = (task) => {
    // Convertir lenguaje técnico a algo más amable
    if (task.source === 'soa') {
      return `Tienes que implementar el control: ${task.task}`;
    }
    return `Para reducir tus riesgos debes: ${task.task.toLowerCase()}`;
  };

  // ── Preparar datos del Gráfico de Metas ──
  const defaultGoalsData = [
    { month: 'Mes 1', expected: 20 }, { month: 'Mes 2', expected: 40 },
    { month: 'Mes 3', expected: 60 }, { month: 'Mes 4', expected: 80 },
    { month: 'Mes 5', expected: 90 }, { month: 'Mes 6', expected: 100 },
  ];
  
  const goalsToUse = complianceGoals && complianceGoals.length > 0 ? complianceGoals : defaultGoalsData;
  const chartData = goalsToUse.map((goal, i) => {
    const isLast = i === goalsToUse.length - 1;
    // Línea de referencia con el cumplimiento actual real
    return {
      month: goal.month,
      expected: goal.expected,
      actual: isLast ? null : compliancePct
    };
  });

  if (loading) return <div className="loading-container"><p>Cargando panel de control...</p></div>;

  return (
    <div>
      <div className="section-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.2rem' }}>Panel de Control ISO 27001</h2>
          <p className="text-secondary" style={{ margin: 0, fontSize: '0.95rem' }}>Visualiza tu avance, próximos pasos y métricas de seguridad.</p>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* ── ROADMAP VISUAL ── */}
      <div className="glass-panel" style={{ marginBottom:'2rem', padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>🗺️ Plan de Implementación</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
          {/* Línea de fondo del roadmap */}
          <div style={{ position: 'absolute', top: '24px', left: '10%', right: '10%', height: '4px', background: 'rgba(255,255,255,0.05)', zIndex: 0, borderRadius: '2px' }} />
          
          {[
            { phase: 1, title: 'Contexto y Activos', pct: phase1Pct, link: 'assets' },
            { phase: 2, title: 'Gestión de Riesgos', pct: phase2Pct, link: 'risks' },
            { phase: 3, title: 'Controles y Evidencias', pct: phase3Pct, link: 'soa' },
            { phase: 4, title: 'Auditoría Interna', pct: phase4Pct, link: 'audits' }
          ].map((step) => {
            const isActive = currentPhase === step.phase;
            const isDone = step.pct === 100;
            const color = isDone ? 'var(--success)' : isActive ? 'var(--accent)' : 'var(--text-secondary)';
            const bg = isDone ? 'rgba(16,185,129,0.1)' : isActive ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)';
            
            return (
              <div key={step.phase} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, width: '25%', textAlign: 'center', cursor: 'pointer' }} onClick={() => onNavigate(step.link)}>
                <div style={{ 
                  width: '52px', height: '52px', borderRadius: '50%', background: bg, border: `3px solid ${color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold', color: color,
                  marginBottom: '0.75rem', transition: 'all 0.3s', transform: isActive ? 'scale(1.15)' : 'scale(1)',
                  boxShadow: isActive ? '0 0 15px rgba(59,130,246,0.4)' : 'none'
                }}>
                  {isDone ? '✓' : step.phase}
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: isDone || isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{step.title}</div>
                <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: color }}>
                  {step.pct}% completado
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── KPIs y Cumplimiento ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* Métricas Globales */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '1rem', height: '100%' }}>
          {[
            [compliancePct + '%', 'Cumplimiento',    'var(--accent)', 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.02))', 'ALL' ],
            [implementedControls, 'Controles OK', 'var(--success)', 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.02))', 'FULLY_IMPLEMENTED'],
            [partialControls,     'En Progreso',     'var(--warning)', 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.02))', 'PARTIAL'],
            [pendingControls, 'Pendientes', 'var(--danger)', 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.02))', 'NOT_IMPLEMENTED'],
          ].map(([val, label, color, bg, filterType]) => (
            <div 
              key={label} 
              className="glass-panel kpi-card-hover" 
              onClick={() => onNavigate('soa', { filter: filterType })}
              style={{ padding: '1.25rem', textAlign: 'center', background: bg, border: `1px solid ${color}33`, cursor: 'pointer', transition: 'all 0.2s ease-in-out', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', boxSizing: 'border-box' }}
            >
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color }}>{val}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Próximos pasos y Tareas */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>📋 Tareas de Remediación</h3>
            <button className="btn-primary outline" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => onNavigate('soa')}>Ver todas</button>
          </div>
          
          {tasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>¡Excelente nivel de cumplimiento! No hay tareas urgentes.</p>
              {!hasDiagnostic && <button className="btn-primary" style={{ alignSelf: 'center' }} onClick={onOpenDiagnostic}>Realizar diagnóstico inicial</button>}
            </div>
          ) : (
            <div className="thin-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', flex: 1, minHeight: 0, maxHeight: '260px', paddingRight: '0.75rem', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
              {tasks.map((t, i) => (
                <div key={t.id} className="task-card-hover" style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                  background: 'rgba(255,255,255,0.03)', borderLeft: `3px solid ${t.priority === 1 ? 'var(--danger)' : 'var(--warning)'}`,
                  borderRadius: '0.5rem', cursor: 'pointer', border: '1px solid var(--border)'
                }} onClick={() => onNavigate('tasks', { controlNumber: t.iso })}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {getFriendlyTask(t)}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--success)', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px' }}>ISO {t.iso}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{t.status === 'NOT_IMPLEMENTED' ? 'Pendiente' : 'En progreso'}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Gestionar →</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── GRÁFICO DE PROGRESO EN EL TIEMPO ── */}
      <div className="glass-panel" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: '0', fontSize: '1.1rem' }}>📈 Evolución del Cumplimiento</h3>
            <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
              Comparación del avance actual ({compliancePct}%) vs la línea base esperada.
            </p>
          </div>
          <button 
            className="btn-primary outline" 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}
            onClick={() => setShowGoalsModal(true)}
          >
            <span>⚙️</span> Configurar Metas
          </button>
        </div>

        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--text-secondary)" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="var(--text-secondary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid var(--border)', borderRadius: '8px' }}
                itemStyle={{ color: '#f8fafc' }}
                formatter={(value) => [`${value}%`]}
              />
              <Area type="monotone" dataKey="expected" name="Esperado" stroke="var(--text-secondary)" strokeDasharray="5 5" fillOpacity={1} fill="url(#colorExpected)" />
              <Area type="monotone" dataKey="actual" name="Avance Real" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Grid inferior ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'1.5rem' }}>

        {/* ── Riesgos ── */}
        <div className="glass-panel">
          <div className="section-header" style={{ marginBottom:'1rem' }}>
            <h3 style={{ margin:0, fontSize:'1.1rem' }}>⚠️ Riesgos</h3>
            <button className="btn-primary outline" style={{ padding:'0.2rem 0.5rem', fontSize:'0.7rem' }} onClick={() => onNavigate('risks')}>Evaluar</button>
          </div>

          <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem' }}>
            {[['Críticos', risks.filter(r=>r.risk_level>=15).length, 'var(--danger)'],
              ['Altos',   risks.filter(r=>r.risk_level>=8&&r.risk_level<15).length, 'var(--warning)'],
              ['Bajos',     risks.filter(r=>r.risk_level<8).length, 'var(--success)']]
            .map(([l, n, c]) => (
              <div key={l} style={{ flex:1, background:'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius:'0.5rem', padding:'0.5rem', textAlign:'center' }}>
                <div style={{ fontSize:'1.4rem', fontWeight:700, color:c }}>{n}</div>
                <div style={{ fontSize:'0.65rem', color:'var(--text-secondary)' }}>{l}</div>
              </div>
            ))}
          </div>

          {hasManualRisks ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
              {risks.slice(0, 3).map(risk => (
                <div key={risk.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.5rem', background:'rgba(0,0,0,0.15)', borderRadius:'0.5rem' }}>
                  <div style={{ flex:1, minWidth:0, fontSize:'0.8rem', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{risk.asset_name}</div>
                  <span className={`status-badge ${riskLevelClass(risk.risk_level)}`} style={{ transform: 'scale(0.8)', margin: 0 }}>{risk.risk_level}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-secondary text-small" style={{ margin:0 }}>Aún no se han evaluado riesgos por activo.</p>
          )}
        </div>

        {/* ── Activos ── */}
        <div className="glass-panel">
          <div className="section-header" style={{ marginBottom:'1rem' }}>
            <h3 style={{ margin:0, fontSize:'1.1rem' }}>🗃️ Activos</h3>
            <button className="btn-primary outline" style={{ padding:'0.2rem 0.5rem', fontSize:'0.7rem' }} onClick={() => onNavigate('assets')}>Añadir</button>
          </div>

          {assets.length > 0 ? (() => {
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
                  ['Críticos', alta,  'var(--danger)',  'rgba(239,68,68,.05)',  'rgba(239,68,68,.2)'],
                  ['Medios',   media, 'var(--warning)', 'rgba(245,158,11,.05)', 'rgba(245,158,11,.2)'],
                  ['Bajos',    baja,  'var(--success)', 'rgba(16,185,129,.05)', 'rgba(16,185,129,.2)'],
                ].map(([label, count, color, bg, border]) => (
                  <div key={label} style={{ flex:1, background:bg, border:`1px solid ${border}`, borderRadius:'0.5rem', padding:'0.5rem', textAlign:'center' }}>
                    <div style={{ fontSize:'1.4rem', fontWeight:700, color }}>{count}</div>
                    <div style={{ fontSize:'0.65rem', color, fontWeight:600, textTransform:'uppercase' }}>{label}</div>
                  </div>
                ))}
              </div>
            );
          })() : <p className="text-secondary" style={{ fontSize: '0.8rem', textAlign: 'center' }}>No hay activos</p>}

          <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
            {assets.slice(0, 3).map(asset => {
              const cia = asset.confidentiality_req + asset.integrity_req + asset.availability_req;
              return (
                <div key={asset.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.5rem', background:'rgba(0,0,0,0.15)', borderRadius:'0.5rem' }}>
                  <div style={{ flex:1, minWidth:0, fontSize:'0.8rem', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{asset.name}</div>
                  <span style={{ fontSize:'0.7rem', color:'var(--text-secondary)' }}>CIA: <strong>{cia}</strong></span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Auditorías y Acciones rápidas ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-panel" style={{ flex: 1 }}>
            <div className="section-header" style={{ marginBottom:'1rem' }}>
              <h3 style={{ margin:0, fontSize:'1.1rem' }}>🔍 Auditorías</h3>
              <button className="btn-primary outline" style={{ padding:'0.2rem 0.5rem', fontSize:'0.7rem' }} onClick={() => onNavigate('audits')}>Ir</button>
            </div>
            
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'0.5rem', marginBottom:'1rem' }}>
              {[
                [audits.filter(a=>a.status==='IN_PROGRESS').length, 'En proceso', 'var(--warning)'],
                [audits.filter(a=>a.status==='COMPLETED').length,   'Terminadas', 'var(--success)'],
              ].map(([n,label,color]) => (
                <div key={label} style={{ background:'rgba(0,0,0,.2)', borderRadius:'0.5rem', padding:'0.5rem', textAlign:'center' }}>
                  <div style={{ fontSize:'1.2rem', fontWeight:700, color, lineHeight:1 }}>{n}</div>
                  <div style={{ fontSize:'0.65rem', color:'var(--text-secondary)', marginTop:'0.2rem' }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              {[['➕ Registrar nuevo activo',     'assets'],
                ['⚠️ Evaluar riesgo', 'risks' ],
                ['📎 Subir evidencia',  'evidences' ],
              ].map(([label, view]) => (
                <button key={label} className="btn-primary outline full-width"
                  style={{ textAlign:'left', padding:'0.5rem', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
                  onClick={() => onNavigate(view)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .task-card-hover:hover {
          background: rgba(255,255,255,0.06) !important;
          border-color: rgba(255,255,255,0.2) !important;
        }
        .kpi-card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.3) !important;
          filter: brightness(1.1);
        }
      `}</style>

      {showGoalsModal && (
        <GoalsModal 
          organizationId={organizationId} 
          initialGoals={complianceGoals}
          onClose={() => setShowGoalsModal(false)}
          onSave={(newGoals) => {
            setComplianceGoals(newGoals);
            setShowGoalsModal(false);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;