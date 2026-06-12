import React, { useState, useEffect } from 'react';
import axios from '../../utils/axiosSetup';
import { jwtDecode } from 'jwt-decode';
import ReviewCommentModal from './ReviewCommentModal';

/**
 * Repositorio central de evidencias.
 * Muestra todas las evidencias de todos los controles de la organización.
 * ADMIN/CISO pueden aprobar o rechazar desde aquí también.
 */
const EvidenceRepository = ({ organizationId }) => {
  const [evidences, setEvidences] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [reviewing, setReviewing] = useState(null);
  const [reviewPrompt, setReviewPrompt] = useState(null); // { evidenceId, status }
  const [filterStatus, setFilterStatus]   = useState('ALL');
  const [filterDomain, setFilterDomain]   = useState('ALL');
  const [search, setSearch]               = useState('');

  const token = localStorage.getItem('token');
  const userRole = token ? (jwtDecode(token)?.role || '') : '';
  const canReview = ['ADMIN', 'CISO', 'AUDITOR'].includes(userRole);

  useEffect(() => { fetchRepository(); }, [organizationId]);

  const fetchRepository = async () => {
    setLoading(true); setError('');
    try {
      const res = await axios.get(`/api/evidences/repository?organization_id=${organizationId}`);
      setEvidences(res.data.data || []);
    } catch { setError('Error al cargar el repositorio de evidencias.'); }
    finally { setLoading(false); }
  };

  const handleReview = (evidenceId, status) => setReviewPrompt({ evidenceId, status });

  const confirmReview = async (comment) => {
    const { evidenceId, status } = reviewPrompt;
    setReviewPrompt(null);
    setReviewing(evidenceId);
    try {
      await axios.patch(`/api/evidences/${evidenceId}/review`, { review_status: status, review_comment: comment });
      setEvidences(prev => prev.map(e =>
        e.id === evidenceId ? { ...e, review_status: status, review_comment: comment, reviewer_name: userRole, reviewed_at: new Date().toISOString() } : e
      ));
    } catch { setError('No se pudo guardar la revisión.'); }
    finally { setReviewing(null); }
  };

  // ── Métricas ──────────────────────────────────────────────────────────────
  const total    = evidences.length;
  const approved = evidences.filter(e => e.review_status === 'APPROVED').length;
  const pending  = evidences.filter(e => e.review_status === 'PENDING').length;
  const rejected = evidences.filter(e => e.review_status === 'REJECTED').length;

  // ── Dominios únicos ───────────────────────────────────────────────────────
  const domains = [...new Set(evidences.map(e => e.control_domain))];

  // ── Filtros ───────────────────────────────────────────────────────────────
  const filtered = evidences.filter(e => {
    const matchStatus = filterStatus === 'ALL' || e.review_status === filterStatus;
    const matchDomain = filterDomain === 'ALL' || e.control_domain === filterDomain;
    const matchSearch = !search ||
      e.document_name.toLowerCase().includes(search.toLowerCase()) ||
      e.control_name.toLowerCase().includes(search.toLowerCase()) ||
      e.control_number.includes(search);
    return matchStatus && matchDomain && matchSearch;
  });

  const fileIcon = (name) => {
    const ext = name?.split('.').pop().toLowerCase();
    if (ext === 'pdf')                       return '📄';
    if (['doc','docx'].includes(ext))        return '📝';
    if (['xls','xlsx'].includes(ext))        return '📊';
    if (['png','jpg','jpeg'].includes(ext))  return '🖼️';
    return '📎';
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' });

  const ReviewBadge = ({ status }) => {
    const map = {
      APPROVED: { label:'✅ Aprobada',          color:'var(--success)', bg:'rgba(16,185,129,.12)' },
      REJECTED: { label:'❌ Rechazada',          color:'var(--danger)',  bg:'rgba(239,68,68,.12)'  },
      PENDING:  { label:'⏳ Pendiente revisión', color:'var(--warning)', bg:'rgba(245,158,11,.12)' },
    };
    const s = map[status] || map.PENDING;
    return <span style={{ fontSize:'0.72rem', fontWeight:600, color:s.color, background:s.bg, borderRadius:10, padding:'2px 9px', flexShrink:0 }}>{s.label}</span>;
  };

  if (loading) return <div className="loading-container"><p>Cargando repositorio...</p></div>;

  return (
    <div>
      <div className="section-header" style={{ marginBottom:'1.5rem' }}>
        <div>
          <h2 style={{ margin:'0 0 0.25rem' }}>Repositorio de Evidencias</h2>
          <p style={{ margin:0, color:'var(--text-secondary)', fontSize:'0.88rem' }}>
            Todas las evidencias de los controles aplicados — Cláusula 7.5
          </p>
        </div>
        {canReview && (
          <span style={{ fontSize:'0.8rem', color:'var(--accent)', background:'rgba(59,130,246,.1)', border:'1px solid rgba(59,130,246,.2)', borderRadius:8, padding:'0.4rem 0.85rem', fontWeight:600 }}>
            🔍 Vista de revisión · {userRole}
          </span>
        )}
      </div>

      {error && <div className="alert-error" style={{ marginBottom:'1rem' }}>{error}</div>}

      {/* ── KPIs ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'1.5rem' }}>
        {[
          [total,    'Total evidencias',    'var(--text-primary)', 'ALL'     ],
          [approved, '✅ Aprobadas',        'var(--success)',      'APPROVED'],
          [pending,  '⏳ Pendientes',       'var(--warning)',      'PENDING' ],
          [rejected, '❌ Rechazadas',       'var(--danger)',       'REJECTED'],
        ].map(([n, label, color, status]) => (
          <div key={label} className="glass-panel summary-card"
            onClick={() => setFilterStatus(filterStatus === status ? 'ALL' : status)}
            style={{ cursor:'pointer', border:`1px solid ${filterStatus===status?color:'var(--border)'}`, transition:'all .15s' }}>
            <div className="big-number" style={{ color }}>{n}</div>
            <div className="card-label">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1rem', flexWrap:'wrap', alignItems:'center' }}>
        <input type="text" placeholder="🔍 Buscar por archivo o control..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background:'rgba(0,0,0,.25)', border:'1px solid var(--border)', borderRadius:8, padding:'0.55rem 0.9rem', color:'var(--text-primary)', fontSize:'0.85rem', outline:'none', minWidth:240 }} />
        <select value={filterDomain} onChange={e => setFilterDomain(e.target.value)}
          style={{ background:'rgba(0,0,0,.25)', border:'1px solid var(--border)', borderRadius:8, padding:'0.55rem 0.9rem', color:'var(--text-primary)', fontSize:'0.85rem', outline:'none', cursor:'pointer' }}>
          <option value="ALL">Todos los dominios</option>
          {domains.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {(filterStatus !== 'ALL' || filterDomain !== 'ALL' || search) && (
          <button onClick={() => { setFilterStatus('ALL'); setFilterDomain('ALL'); setSearch(''); }}
            style={{ background:'none', border:'1px solid var(--border)', color:'var(--text-secondary)', fontSize:'0.8rem', padding:'0.5rem 0.9rem', borderRadius:8, cursor:'pointer' }}>
            ✕ Limpiar
          </button>
        )}
        <span style={{ marginLeft:'auto', fontSize:'0.8rem', color:'var(--text-secondary)' }}>
          {filtered.length} de {total} evidencias
        </span>
      </div>

      {/* ── Lista de evidencias ── */}
      {filtered.length === 0 ? (
        <div className="glass-panel" style={{ textAlign:'center', padding:'3rem' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>
            {total === 0 ? '📭' : '🔍'}
          </div>
          <p style={{ color:'var(--text-secondary)', margin:0 }}>
            {total === 0
              ? 'No hay evidencias registradas aún. Sube evidencias desde el módulo SoA.'
              : 'No hay evidencias que coincidan con los filtros.'}
          </p>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding:0, overflow:'hidden' }}>
          {filtered.map((ev, i) => (
            <div key={ev.id} style={{
              padding:'1rem 1.25rem',
              borderBottom: i < filtered.length-1 ? '1px solid var(--border)' : 'none',
              background: ev.review_status==='APPROVED'?'rgba(16,185,129,.03)':ev.review_status==='REJECTED'?'rgba(239,68,68,.03)':'transparent',
              transition:'background .15s',
            }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:'0.85rem' }}>

                {/* Icono */}
                <span style={{ fontSize:'1.6rem', flexShrink:0, marginTop:2 }}>{fileIcon(ev.document_name)}</span>

                {/* Info principal */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.25rem', flexWrap:'wrap' }}>
                    <span style={{ fontSize:'0.88rem', fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:300 }}>
                      {ev.document_name}
                    </span>
                    <ReviewBadge status={ev.review_status} />
                  </div>
                  <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', alignItems:'center', marginBottom:'0.25rem' }}>
                    <span style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--success)', background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.2)', borderRadius:10, padding:'1px 7px' }}>
                      {ev.control_number}
                    </span>
                    <span style={{ fontSize:'0.78rem', color:'var(--text-secondary)' }}>{ev.control_name}</span>
                    <span style={{ fontSize:'0.72rem', color:'var(--text-secondary)', background:'rgba(255,255,255,.06)', borderRadius:8, padding:'1px 6px' }}>{ev.control_domain}</span>
                  </div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>
                    Subido por <strong>{ev.uploader_name || 'Usuario'}</strong> · {fmtDate(ev.uploaded_at)}
                    {ev.reviewer_name && ev.review_status !== 'PENDING' && (
                      <span> · Revisado por <strong>{ev.reviewer_name}</strong> · {fmtDate(ev.reviewed_at)}</span>
                    )}
                  </div>
                  {ev.review_comment && (
                    <div style={{ fontSize:'0.75rem', marginTop:'0.5rem', color:'var(--text-secondary)', fontStyle:'italic', background:'rgba(0,0,0,0.1)', padding:'0.4rem 0.6rem', borderRadius:'6px', borderLeft:`2px solid ${ev.review_status==='APPROVED'?'var(--success)':'var(--danger)'}` }}>
                      "{ev.review_comment}"
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexShrink:0 }}>
                  {canReview && ev.review_status === 'PENDING' && (
                    <>
                      <button onClick={() => handleReview(ev.id, 'APPROVED')} disabled={reviewing===ev.id}
                        style={{ padding:'0.35rem 0.75rem', borderRadius:6, fontSize:'0.78rem', fontWeight:600, border:'1px solid rgba(16,185,129,.4)', background:'rgba(16,185,129,.08)', color:'var(--success)', cursor:'pointer' }}>
                        {reviewing===ev.id?'...':'✅ Aprobar'}
                      </button>
                      <button onClick={() => handleReview(ev.id, 'REJECTED')} disabled={reviewing===ev.id}
                        style={{ padding:'0.35rem 0.75rem', borderRadius:6, fontSize:'0.78rem', fontWeight:600, border:'1px solid rgba(239,68,68,.4)', background:'rgba(239,68,68,.08)', color:'var(--danger)', cursor:'pointer' }}>
                        {reviewing===ev.id?'...':'❌ Rechazar'}
                      </button>
                    </>
                  )}
                  {canReview && ev.review_status === 'REJECTED' && (
                    <button onClick={() => handleReview(ev.id, 'PENDING')}
                      style={{ background:'none', border:'none', color:'var(--text-secondary)', fontSize:'0.75rem', cursor:'pointer', textDecoration:'underline', padding:'0.35rem' }}>
                      Reabrir
                    </button>
                  )}
                  <a href={ev.file_url} target="_blank" rel="noopener noreferrer"
                    style={{ background:'rgba(59,130,246,.1)', border:'1px solid rgba(59,130,246,.25)', color:'var(--accent)', borderRadius:6, padding:'0.35rem 0.75rem', fontSize:'0.78rem', textDecoration:'none', fontWeight:600 }}>
                    Ver ↗
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {reviewPrompt && (
        <ReviewCommentModal
          status={reviewPrompt.status}
          onConfirm={confirmReview}
          onCancel={() => setReviewPrompt(null)}
        />
      )}
    </div>
  );
};

export default EvidenceRepository;