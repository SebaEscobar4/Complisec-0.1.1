import React, { useState, useEffect } from 'react';
import axios from '../../utils/axiosSetup';
import RiskForm from './RiskForm';
import RiskPlanningModal from './RiskPlanningModal';

const PAGE_SIZE = 8;

const SkeletonRow = () => (
  <tr>
    {[130, 200, 70, 60, 80, 70].map((w, i) => (
      <td key={i}>
        <div style={{
          height: 14, width: w, borderRadius: 6,
          background: 'linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.1) 50%,rgba(255,255,255,.04) 75%)',
          backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
        }} />
      </td>
    ))}
  </tr>
);

const RiskAssessment = ({ organizationId }) => {
  const [assets, setAssets]               = useState([]);
  const [risks, setRisks]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [editingRisk, setEditingRisk]     = useState(null);
  const [error, setError]                 = useState('');
  const [page, setPage]                   = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deletingId, setDeletingId]       = useState(null);
  const [planningModalRisk, setPlanningModalRisk] = useState(null);

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const [assetsRes, risksRes] = await Promise.all([
        axios.get(`/api/assets?organization_id=${organizationId}`),
        axios.get(`/api/risks?organization_id=${organizationId}`),
      ]);
      setAssets(assetsRes.data.data || []);
      setRisks(risksRes.data.data || []);
    } catch { setError('Error al cargar los datos. Verifique la conexión con el servidor.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (organizationId) fetchData(); }, [organizationId]);

  const handleRiskCreated = (newRisk) => {
    const asset = assets.find(a => a.id === newRisk.asset_id);
    const enriched = { ...newRisk, asset_name: asset?.name || 'Desconocido' };
    setRisks(prev => [enriched, ...prev].sort((a, b) => b.risk_level - a.risk_level));
    setSelectedAsset(null);
    setPage(1);
  };

  const handleRiskUpdated = (updated) => {
    const asset = assets.find(a => a.id === updated.asset_id);
    const enriched = { ...updated, asset_name: asset?.name || 'Desconocido' };
    setRisks(prev => prev.map(r => r.id === enriched.id ? enriched : r).sort((a,b) => b.risk_level - a.risk_level));
    setEditingRisk(null);
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await axios.delete(`/api/risks/${id}?organization_id=${organizationId}`);
      const next = risks.filter(r => r.id !== id);
      setRisks(next);
      setConfirmDelete(null);
      if ((page - 1) * PAGE_SIZE >= next.length && page > 1) setPage(p => p - 1);
    } catch { setError('No se pudo eliminar el riesgo.'); }
    finally { setDeletingId(null); }
  };

  const riskClass = (l) => l >= 15 ? 'risk-high' : l >= 8 ? 'risk-medium' : 'risk-low';
  const treatmentLabel = (d) => ({ MITIGATE:'Mitigar', ACCEPT:'Aceptar', TRANSFER:'Transferir', AVOID:'Evitar' }[d] || d);

  const totalPages = Math.ceil(risks.length / PAGE_SIZE);
  const paginated  = risks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="risks-container">
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .act-btn{background:none;border:1px solid var(--border);border-radius:6px;padding:.3rem .65rem;font-size:.75rem;cursor:pointer;color:var(--text-secondary);transition:all .15s}
        .act-btn:disabled{opacity:.4;cursor:not-allowed}
        .act-btn:not(:disabled):hover{background:rgba(255,255,255,.07)}
        .act-btn.edit:not(:disabled):hover{border-color:rgba(59,130,246,.5);color:var(--accent);background:rgba(59,130,246,.08)}
        .act-btn.danger:not(:disabled):hover{border-color:rgba(239,68,68,.5);color:var(--danger);background:rgba(239,68,68,.08)}
        .act-btn.active{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:700}
      `}</style>

      <div className="section-header">
        <div>
          <h2>Evaluación de Riesgos</h2>
          <p className="text-secondary text-small" style={{ margin:'0.25rem 0 0' }}>
            Cláusula 6.1.2 — {risks.length} riesgo{risks.length !== 1 ? 's' : ''} registrado{risks.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* Modal confirmación borrado */}
      {confirmDelete && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="glass-panel" style={{ maxWidth:380, width:'90%', padding:'1.75rem', textAlign:'center' }}>
            <div style={{ fontSize:'2rem', marginBottom:'.75rem' }}>⚠️</div>
            <h3 style={{ margin:'0 0 .5rem' }}>¿Eliminar riesgo?</h3>
            <p className="text-secondary" style={{ marginBottom:'1.5rem', fontSize:'.88rem' }}>Esta acción no se puede deshacer.</p>
            <div style={{ display:'flex', gap:'.75rem', justifyContent:'center' }}>
              <button className="act-btn" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button
                className="btn-primary"
                style={{ background:'var(--danger)', borderColor:'var(--danger)', opacity:deletingId?.7:1 }}
                disabled={!!deletingId}
                onClick={() => handleDelete(confirmDelete)}
              >
                {deletingId ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:'2rem' }}>

        {/* Panel izquierdo: activos */}
        <div className="glass-panel" style={{ alignSelf:'start' }}>
          <h3 style={{ margin:'0 0 .5rem' }}>Seleccionar activo</h3>
          <p className="text-small text-secondary" style={{ marginBottom:'1rem' }}>Elige un activo para registrar una amenaza.</p>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'.5rem' }}>
              {[...Array(4)].map((_,i) => (
                <div key={i} style={{ height:36, borderRadius:8, background:'linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.1) 50%,rgba(255,255,255,.04) 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite' }} />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <p className="text-small text-secondary" style={{ color:'var(--danger)' }}>No hay activos. Regístralos primero en "Activos".</p>
          ) : (
            <ul style={{ listStyle:'none', padding:0, margin:0 }}>
              {assets.map(asset => (
                <li key={asset.id} style={{ marginBottom:'.5rem' }}>
                  <button
                    className={`btn-primary ${selectedAsset === asset.id ? '' : 'outline'} full-width`}
                    onClick={() => { setSelectedAsset(selectedAsset === asset.id ? null : asset.id); setEditingRisk(null); }}
                    style={{ textAlign:'left' }}
                  >
                    {asset.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Panel derecho */}
        <div>
          {selectedAsset && !editingRisk ? (
            <RiskForm
              organizationId={organizationId}
              assetId={selectedAsset}
              onSuccess={handleRiskCreated}
              onCancel={() => setSelectedAsset(null)}
            />
          ) : editingRisk ? (
            <RiskForm
              organizationId={organizationId}
              assetId={editingRisk.asset_id}
              initialData={editingRisk}
              onSuccess={handleRiskUpdated}
              onCancel={() => setEditingRisk(null)}
            />
          ) : (
            <div className="glass-panel">
              <h3 style={{ margin:'0 0 1rem' }}>Matriz de riesgos</h3>
              {loading ? (
                <table className="assets-table">
                  <thead><tr><th>Activo</th><th>Amenaza</th><th>Inherente</th><th>Residual</th><th>Tratamiento</th><th>Acciones</th></tr></thead>
                  <tbody>{[...Array(4)].map((_,i) => <SkeletonRow key={i} />)}</tbody>
                </table>
              ) : risks.length === 0 ? (
                <p className="text-secondary">Aún no se han evaluado riesgos. Selecciona un activo a la izquierda para comenzar.</p>
              ) : (
                <>
                  <table className="assets-table" data-testid="risks-table">
                    <thead>
                      <tr>
                        <th>Activo</th><th>Amenaza</th><th>Inherente</th><th>Residual</th><th>Tratamiento</th>
                        <th style={{ textAlign:'right' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map(risk => (
                        <tr key={risk.id} data-testid={`risk-row-${risk.id}`}>
                          <td><strong>{risk.asset_name}</strong></td>
                          <td>
                            <div style={{ fontSize: '0.85rem' }}><strong>A:</strong> {risk.threat}</div>
                            <div className="text-secondary text-small"><strong>V:</strong> {risk.vulnerability}</div>
                          </td>
                          <td>
                            <div className={`status-badge ${riskClass(risk.risk_level)}`} style={{ padding: '0.2rem 0.5rem', margin: 0, fontSize: '0.7rem' }}>
                              {risk.risk_level} ({risk.likelihood}x{risk.impact})
                            </div>
                          </td>
                          <td>
                            {risk.treatment_decision === 'MITIGATE' && risk.residual_risk_level ? (
                              <div className={`status-badge ${riskClass(risk.residual_risk_level)}`} style={{ padding: '0.2rem 0.5rem', margin: 0, fontSize: '0.7rem' }}>
                                {risk.residual_risk_level} ({risk.residual_likelihood}x{risk.residual_impact})
                              </div>
                            ) : <span className="text-secondary">—</span>}
                          </td>
                          <td>
                            <span className="badge" style={{ marginBottom: '0.25rem', display: 'inline-block' }}>{treatmentLabel(risk.treatment_decision)}</span>
                            {risk.treatment_decision === 'MITIGATE' && (
                              risk.has_plan ? (
                                <button 
                                  disabled
                                  style={{ display: 'block', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', fontSize: '0.7rem', padding: '0.2rem 0.5rem', cursor: 'not-allowed', fontWeight: 600, marginTop: '0.2rem', opacity: 0.8 }}
                                >
                                  ✅ Planificado
                                </button>
                              ) : (
                                <button 
                                  onClick={() => setPlanningModalRisk(risk)}
                                  style={{ display: 'block', background: 'rgba(59,130,246,0.1)', color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '4px', fontSize: '0.7rem', padding: '0.2rem 0.5rem', cursor: 'pointer', fontWeight: 600, marginTop: '0.2rem' }}
                                >
                                  📅 Planificar
                                </button>
                              )
                            )}
                          </td>
                          <td>
                            <div style={{ display:'flex', gap:'.4rem', justifyContent:'flex-end' }}>
                              <button className="act-btn edit" onClick={() => { setEditingRisk(risk); setSelectedAsset(null); }}>✏️ Editar</button>
                              <button className="act-btn danger" onClick={() => setConfirmDelete(risk.id)}>🗑️ Eliminar</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {totalPages > 1 && (
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'1rem', paddingTop:'1rem', borderTop:'1px solid var(--border)' }}>
                      <span style={{ fontSize:'.8rem', color:'var(--text-secondary)' }}>
                        Mostrando {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,risks.length)} de {risks.length}
                      </span>
                      <div style={{ display:'flex', gap:'.4rem' }}>
                        <button className="act-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}>← Anterior</button>
                        {[...Array(totalPages)].map((_,i) => (
                          <button key={i} className={`act-btn${page===i+1?' active':''}`} onClick={() => setPage(i+1)}>{i+1}</button>
                        ))}
                        <button className="act-btn" disabled={page===totalPages} onClick={() => setPage(p=>p+1)}>Siguiente →</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      
      {planningModalRisk && (
        <RiskPlanningModal 
          risk={planningModalRisk} 
          organizationId={organizationId} 
          onClose={() => setPlanningModalRisk(null)} 
        />
      )}
    </div>
  );
};

export default RiskAssessment;