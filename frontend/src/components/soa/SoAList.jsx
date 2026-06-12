import React, { useState, useEffect } from 'react';
import axios from '../../utils/axiosSetup';
import SoAForm from './SoAForm';
import EvidencesModal from './EvidencesModal';

const SoAList = ({ organizationId, viewParams }) => {
  const [controls, setControls]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [selectedControl, setSelectedControl] = useState(null);
  const [viewingEvidences, setViewingEvidences] = useState(null);
  const [filterStatus, setFilterStatus]   = useState(viewParams?.filter || 'ALL');
  const [filterDomain, setFilterDomain]   = useState('ALL');
  const [search, setSearch]               = useState(viewParams?.search || '');

  const fetchSoA = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`/api/soa?organization_id=${organizationId}`);
      setControls(response.data.data || []);
    } catch (err) {
      setError('Error al cargar la Declaración de Aplicabilidad.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSoA(); }, [organizationId]);

  // Si el usuario navega desde el Dashboard con un filtro nuevo, lo aplicamos
  useEffect(() => {
    if (viewParams && viewParams.filter) {
      setFilterStatus(viewParams.filter);
    }
    if (viewParams && viewParams.search) {
      setSearch(viewParams.search);
      setFilterStatus('ALL');
      setFilterDomain('ALL');
    }
  }, [viewParams]);

  const handleSoAUpdated = (updatedSoA) => {
    setControls(prev => prev.map(c =>
      c.control_id === updatedSoA.control_id
        ? { ...c, soa_id: updatedSoA.id, is_applicable: updatedSoA.is_applicable, justification: updatedSoA.justification, implementation_status: updatedSoA.implementation_status }
        : c
    ));
    setSelectedControl(null);
  };

  // ── Métricas ──────────────────────────────────────────────────────────────
  const total       = controls.length;
  const evaluated   = controls.filter(c => c.soa_id).length;
  const implemented = controls.filter(c => c.implementation_status === 'FULLY_IMPLEMENTED').length;
  const partial     = controls.filter(c => c.implementation_status === 'PARTIAL').length;
  const pending     = controls.filter(c => c.soa_id && c.implementation_status === 'NOT_IMPLEMENTED').length;
  const notEvaluated = controls.filter(c => !c.soa_id).length;
  const pct = total > 0 ? Math.round((implemented / total) * 100) : 0;

  // ── Dominios únicos para el filtro ───────────────────────────────────────
  const domains = [...new Set(controls.map(c => c.control_domain))];

  // ── Filtros ───────────────────────────────────────────────────────────────
  const filtered = controls.filter(c => {
    const matchesDomain = filterDomain === 'ALL' || c.control_domain === filterDomain;
    const matchesSearch = !search || c.control_name.toLowerCase().includes(search.toLowerCase()) || c.control_number.includes(search);
    const matchesStatus = (() => {
      if (filterStatus === 'ALL')              return true;
      if (filterStatus === 'NOT_EVALUATED')    return !c.soa_id;
      if (filterStatus === 'NOT_IMPLEMENTED')  return c.implementation_status === 'NOT_IMPLEMENTED';
      if (filterStatus === 'PARTIAL')          return c.implementation_status === 'PARTIAL';
      if (filterStatus === 'FULLY_IMPLEMENTED')return c.implementation_status === 'FULLY_IMPLEMENTED';
      return true;
    })();
    return matchesDomain && matchesSearch && matchesStatus;
  });

  // ── Badge de estado ───────────────────────────────────────────────────────
  const StatusBadge = ({ control }) => {
    if (!control.soa_id) return <span style={{ fontSize:'0.75rem', color:'var(--text-secondary)', background:'rgba(255,255,255,.06)', borderRadius:10, padding:'2px 8px' }}>Sin evaluar</span>;
    if (!control.is_applicable) return <span style={{ fontSize:'0.75rem', color:'var(--text-secondary)', background:'rgba(255,255,255,.06)', borderRadius:10, padding:'2px 8px' }}>No aplica</span>;
    const map = {
      FULLY_IMPLEMENTED: { label:'Implementado',  color:'var(--success)', bg:'rgba(16,185,129,.12)' },
      PARTIAL:           { label:'Parcial',        color:'var(--warning)', bg:'rgba(245,158,11,.12)' },
      NOT_IMPLEMENTED:   { label:'Pendiente',      color:'var(--danger)',  bg:'rgba(239,68,68,.12)'  },
    };
    const s = map[control.implementation_status] || map.NOT_IMPLEMENTED;
    return <span style={{ fontSize:'0.75rem', fontWeight:600, color:s.color, background:s.bg, borderRadius:10, padding:'2px 9px' }}>{s.label}</span>;
  };

  const ApplicableBadge = ({ control }) => {
    if (!control.soa_id) return <span style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>—</span>;
    return control.is_applicable
      ? <span style={{ fontSize:'0.75rem', color:'var(--success)' }}>✅ Sí</span>
      : <span style={{ fontSize:'0.75rem', color:'var(--danger)' }}>❌ No</span>;
  };

  return (
    <div>
      <div className="section-header" style={{ marginBottom:'1.5rem' }}>
        <div>
          <h2 style={{ margin:'0 0 0.25rem' }}>Declaración de Aplicabilidad (SoA)</h2>
          <p style={{ margin:0, color:'var(--text-secondary)', fontSize:'0.88rem' }}>
            Gestiona los {total} controles del Anexo A — ISO/IEC 27001:2022
          </p>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* ── Resumen de progreso ── */}
      <div className="glass-panel" style={{ marginBottom:'1.5rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.5rem' }}>
          <span style={{ fontWeight:600, fontSize:'0.9rem' }}>Progreso de implementación</span>
          <span style={{ color:'var(--success)', fontWeight:700 }}>{pct}%</span>
        </div>
        <div style={{ height:8, background:'rgba(255,255,255,.06)', borderRadius:4, overflow:'hidden', marginBottom:'1rem' }}>
          <div style={{ height:8, width:`${pct}%`, background:'linear-gradient(90deg,var(--accent),var(--success))', borderRadius:4, transition:'width .6s ease' }} />
        </div>
        <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>
          {[
            [implemented, '✅ Implementados',  'var(--success)', 'FULLY_IMPLEMENTED'],
            [partial,     '🟡 Parciales',       'var(--warning)', 'PARTIAL'          ],
            [pending,     '❌ Pendientes',      'var(--danger)',  'NOT_IMPLEMENTED'  ],
            [notEvaluated,'⏳ Sin evaluar',     'var(--text-secondary)', 'NOT_EVALUATED'],
          ].map(([n, label, color, status]) => (
            <button key={label} onClick={() => setFilterStatus(filterStatus === status ? 'ALL' : status)}
              style={{ display:'flex', alignItems:'center', gap:'0.4rem', background: filterStatus===status?`${color}15`:'rgba(255,255,255,.03)', border:`1px solid ${filterStatus===status?color:'var(--border)'}`, borderRadius:10, padding:'0.4rem 0.85rem', cursor:'pointer', transition:'all .15s' }}>
              <span style={{ fontSize:'1.1rem', fontWeight:700, color }}>{n}</span>
              <span style={{ fontSize:'0.75rem', color: filterStatus===status ? color : 'var(--text-secondary)' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Formulario de evaluación (aparece inline) ── */}
      {selectedControl && (
        <SoAForm
          control={selectedControl}
          organizationId={organizationId}
          onSuccess={handleSoAUpdated}
          onCancel={() => setSelectedControl(null)}
        />
      )}

      {/* ── Modal de evidencias ── */}
      {viewingEvidences && (
        <div style={{ marginBottom:'1.5rem' }}>
          <EvidencesModal
            control={viewingEvidences}
            soaId={viewingEvidences.soa_id}
            onClose={() => setViewingEvidences(null)}
          />
        </div>
      )}

      {/* ── Filtros ── */}
      <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1rem', flexWrap:'wrap', alignItems:'center' }}>
        <input
          type="text" placeholder="🔍 Buscar control..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background:'rgba(0,0,0,.25)', border:'1px solid var(--border)', borderRadius:8, padding:'0.55rem 0.9rem', color:'var(--text-primary)', fontSize:'0.85rem', outline:'none', minWidth:200 }}
        />
        <select value={filterDomain} onChange={e => setFilterDomain(e.target.value)}
          style={{ background:'rgba(0,0,0,.25)', border:'1px solid var(--border)', borderRadius:8, padding:'0.55rem 0.9rem', color:'var(--text-primary)', fontSize:'0.85rem', outline:'none', cursor:'pointer' }}>
          <option value="ALL">Todos los dominios</option>
          {domains.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {(filterStatus !== 'ALL' || filterDomain !== 'ALL' || search) && (
          <button onClick={() => { setFilterStatus('ALL'); setFilterDomain('ALL'); setSearch(''); }}
            style={{ background:'none', border:'1px solid var(--border)', color:'var(--text-secondary)', fontSize:'0.8rem', padding:'0.5rem 0.9rem', borderRadius:8, cursor:'pointer' }}>
            ✕ Limpiar filtros
          </button>
        )}
        <span style={{ marginLeft:'auto', fontSize:'0.8rem', color:'var(--text-secondary)' }}>
          {filtered.length} de {total} controles
        </span>
      </div>

      {/* ── Tabla ── */}
      <div className="glass-panel">
        {loading ? (
          <div className="loading-container"><p>Cargando controles...</p></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-secondary)' }}>
            No hay controles que coincidan con los filtros.
          </div>
        ) : (
          <table className="assets-table" data-testid="soa-table">
            <thead>
              <tr>
                <th style={{ width:'40%' }}>Control</th>
                <th>Dominio</th>
                <th>Aplicable</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(control => (
                <tr key={control.control_id} data-testid={`soa-row-${control.control_number}`}
                  style={{ background: selectedControl?.control_id === control.control_id ? 'rgba(59,130,246,.05)' : '' }}>
                  <td>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:'0.6rem' }}>
                      <span style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--success)', background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.2)', borderRadius:10, padding:'1px 7px', flexShrink:0, marginTop:2 }}>
                        {control.control_number}
                      </span>
                      <div>
                        <div style={{ fontSize:'0.88rem', fontWeight:600 }}>{control.control_name}</div>
                        {control.justification && (
                          <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:340 }}>
                            {control.justification}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize:'0.78rem', color:'var(--text-secondary)', background:'rgba(255,255,255,.05)', borderRadius:8, padding:'2px 8px' }}>
                      {control.control_domain}
                    </span>
                  </td>
                  <td><ApplicableBadge control={control} /></td>
                  <td><StatusBadge control={control} /></td>
                  <td>
                    <div style={{ display:'flex', gap:'0.4rem' }}>
                      <button
                        className="btn-primary outline"
                        style={{ padding:'0.25rem 0.65rem', fontSize:'0.78rem' }}
                        onClick={() => { setSelectedControl(control); setViewingEvidences(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        data-testid={`btn-evaluar-${control.control_number}`}
                      >
                        {control.soa_id ? 'Editar' : 'Evaluar'}
                      </button>
                      {control.soa_id && control.is_applicable && (
                        <button
                          className="btn-primary"
                          style={{ padding:'0.25rem 0.65rem', fontSize:'0.78rem' }}
                          onClick={() => { setViewingEvidences(control); setSelectedControl(null); }}
                        >
                          Evidencias
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SoAList;