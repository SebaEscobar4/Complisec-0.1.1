import React, { useState, useEffect, useRef } from 'react';
import axios from '../../utils/axiosSetup';
import { jwtDecode } from 'jwt-decode';
import ReviewCommentModal from './ReviewCommentModal';

const EvidencesModal = ({ control, soaId, onClose }) => {
  const [evidences, setEvidences] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const [reviewPrompt, setReviewPrompt] = useState(null); // { evidenceId, status }
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [file, setFile]           = useState(null);
  const [dragOver, setDragOver]   = useState(false);
  const fileInputRef              = useRef(null);

  const token = localStorage.getItem('token');
  const userRole = token ? (jwtDecode(token)?.role || '') : '';
  const canReview = ['ADMIN', 'CISO', 'AUDITOR'].includes(userRole);

  useEffect(() => { fetchEvidences(); }, [soaId]);

  const fetchEvidences = async () => {
    setLoading(true); setError('');
    try {
      const res = await axios.get(`/api/evidences/${soaId}`);
      setEvidences(res.data.data || []);
    } catch { setError('No se pudieron cargar las evidencias.'); }
    finally { setLoading(false); }
  };

  const handleFileChange = (e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); };
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]); };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) { setError('Selecciona un archivo primero.'); return; }
    setUploading(true); setError(''); setSuccess('');
    const fd = new FormData();
    fd.append('file', file); fd.append('soa_id', soaId);
    try {
      await axios.post('/api/evidences', fd);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSuccess('✅ Evidencia subida correctamente.');
      fetchEvidences();
    } catch { setError('Error al subir el archivo. Verifica que no supere 5 MB.'); }
    finally { setUploading(false); }
  };

  const handleReview = (evidenceId, status) => setReviewPrompt({ evidenceId, status });

  const confirmReview = async (comment) => {
    const { evidenceId, status } = reviewPrompt;
    setReviewPrompt(null);
    setReviewing(evidenceId); setError(''); setSuccess('');
    try {
      await axios.patch(`/api/evidences/${evidenceId}/review`, { review_status: status, review_comment: comment });
      setSuccess(status === 'APPROVED' ? '✅ Evidencia aprobada.' : '❌ Evidencia rechazada.');
      fetchEvidences();
    } catch { setError('No se pudo guardar la revisión.'); }
    finally { setReviewing(null); }
  };

  const fileIcon = (name) => {
    const ext = name?.split('.').pop().toLowerCase();
    if (ext === 'pdf')                        return '📄';
    if (['doc','docx'].includes(ext))         return '📝';
    if (['xls','xlsx'].includes(ext))         return '📊';
    if (['png','jpg','jpeg'].includes(ext))   return '🖼️';
    return '📎';
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' });
  const fmtSize = (b) => b ? (b < 1024*1024 ? `${(b/1024).toFixed(0)} KB` : `${(b/1024/1024).toFixed(1)} MB`) : '';

  const ReviewBadge = ({ status }) => {
    const map = {
      APPROVED: { label:'✅ Aprobada',          color:'var(--success)', bg:'rgba(16,185,129,.1)'  },
      REJECTED: { label:'❌ Rechazada',          color:'var(--danger)',  bg:'rgba(239,68,68,.1)'   },
      PENDING:  { label:'⏳ Pendiente revisión', color:'var(--warning)', bg:'rgba(245,158,11,.1)'  },
    };
    const s = map[status] || map.PENDING;
    return <span style={{ fontSize:'0.72rem', fontWeight:600, color:s.color, background:s.bg, borderRadius:10, padding:'2px 8px', flexShrink:0 }}>{s.label}</span>;
  };

  return (
    <div className="glass-panel" style={{ borderTop:'3px solid var(--accent)', marginBottom:'1.5rem' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.3rem', flexWrap:'wrap' }}>
            <span style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--success)', background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.2)', borderRadius:20, padding:'2px 9px' }}>{control.control_number}</span>
            <span style={{ fontSize:'0.72rem', color:'var(--text-secondary)', background:'rgba(255,255,255,.06)', borderRadius:10, padding:'2px 8px' }}>Cláusula 7.5</span>
            {canReview && <span style={{ fontSize:'0.72rem', color:'var(--accent)', background:'rgba(59,130,246,.1)', border:'1px solid rgba(59,130,246,.2)', borderRadius:10, padding:'2px 8px' }}>🔍 Modo revisión · {userRole}</span>}
          </div>
          <h3 style={{ margin:'0 0 0.2rem', fontSize:'1rem', fontWeight:700 }}>Evidencias — {control.control_name}</h3>
          <p style={{ margin:0, fontSize:'0.8rem', color:'var(--text-secondary)' }}>
            {evidences.length} registrada{evidences.length!==1?'s':''} · {evidences.filter(e=>e.review_status==='APPROVED').length} aprobada{evidences.filter(e=>e.review_status==='APPROVED').length!==1?'s':''}
          </p>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'1px solid var(--border)', color:'var(--text-secondary)', borderRadius:6, padding:'0.3rem 0.8rem', cursor:'pointer', fontSize:'0.85rem' }}>Cerrar ✕</button>
      </div>

      {error   && <div className="alert-error"   style={{ marginBottom:'1rem' }}>{error}</div>}
      {success && <div className="alert-success" style={{ marginBottom:'1rem' }}>{success}</div>}

      {/* Lista */}
      <div style={{ marginBottom:'1.5rem' }}>
        {loading ? (
          <p style={{ color:'var(--text-secondary)', fontSize:'0.88rem' }}>Cargando evidencias...</p>
        ) : evidences.length === 0 ? (
          <div style={{ textAlign:'center', padding:'1.5rem', background:'rgba(255,255,255,.03)', borderRadius:10, border:'1px dashed var(--border)' }}>
            <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>📭</div>
            <p style={{ color:'var(--text-secondary)', fontSize:'0.85rem', margin:0 }}>No hay evidencias registradas para este control.</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
            {evidences.map(ev => (
              <div key={ev.id} style={{
                padding:'0.85rem 1rem', borderRadius:10,
                background: ev.review_status==='APPROVED'?'rgba(16,185,129,.04)':ev.review_status==='REJECTED'?'rgba(239,68,68,.04)':'rgba(255,255,255,.03)',
                border: `1px solid ${ev.review_status==='APPROVED'?'rgba(16,185,129,.2)':ev.review_status==='REJECTED'?'rgba(239,68,68,.2)':'var(--border)'}`,
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                  <span style={{ fontSize:'1.4rem', flexShrink:0 }}>{fileIcon(ev.document_name)}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'0.88rem', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.document_name}</div>
                    <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)', marginTop:2 }}>
                      Subido por <strong>{ev.uploader_name || 'Usuario'}</strong> · {fmtDate(ev.uploaded_at)}
                      {ev.reviewer_name && ev.review_status !== 'PENDING' && (
                        <span> · Revisado por <strong>{ev.reviewer_name}</strong></span>
                      )}
                    </div>
                    {ev.review_comment && (
                      <div style={{ fontSize:'0.75rem', marginTop:'0.4rem', color:'var(--text-secondary)', fontStyle:'italic', background:'rgba(0,0,0,0.1)', padding:'0.4rem 0.6rem', borderRadius:'6px', borderLeft:`2px solid ${ev.review_status==='APPROVED'?'var(--success)':'var(--danger)'}` }}>
                        "{ev.review_comment}"
                      </div>
                    )}
                  </div>
                  <ReviewBadge status={ev.review_status} />
                  <a href={ev.file_url} target="_blank" rel="noopener noreferrer"
                    style={{ background:'rgba(59,130,246,.1)', border:'1px solid rgba(59,130,246,.25)', color:'var(--accent)', borderRadius:6, padding:'0.3rem 0.7rem', fontSize:'0.78rem', textDecoration:'none', flexShrink:0, fontWeight:600 }}>
                    Ver ↗
                  </a>
                </div>

                {/* Botones de revisión */}
                {canReview && ev.review_status === 'PENDING' && (
                  <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.75rem', paddingTop:'0.75rem', borderTop:'1px solid var(--border)', alignItems:'center' }}>
                    <span style={{ fontSize:'0.78rem', color:'var(--text-secondary)', flex:1 }}>¿Esta evidencia es válida para el control?</span>
                    <button onClick={() => handleReview(ev.id, 'APPROVED')} disabled={reviewing===ev.id}
                      style={{ padding:'0.35rem 0.9rem', borderRadius:6, fontSize:'0.78rem', fontWeight:600, border:'1px solid rgba(16,185,129,.4)', background:'rgba(16,185,129,.08)', color:'var(--success)', cursor:'pointer' }}>
                      {reviewing===ev.id?'...':'✅ Aprobar'}
                    </button>
                    <button onClick={() => handleReview(ev.id, 'REJECTED')} disabled={reviewing===ev.id}
                      style={{ padding:'0.35rem 0.9rem', borderRadius:6, fontSize:'0.78rem', fontWeight:600, border:'1px solid rgba(239,68,68,.4)', background:'rgba(239,68,68,.08)', color:'var(--danger)', cursor:'pointer' }}>
                      {reviewing===ev.id?'...':'❌ Rechazar'}
                    </button>
                  </div>
                )}
                {canReview && ev.review_status === 'REJECTED' && (
                  <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'0.5rem' }}>
                    <button onClick={() => handleReview(ev.id, 'PENDING')} style={{ background:'none', border:'none', color:'var(--text-secondary)', fontSize:'0.75rem', cursor:'pointer', textDecoration:'underline' }}>
                      Volver a pendiente
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subir */}
      <div>
        <h4 style={{ margin:'0 0 0.75rem', fontSize:'0.9rem', fontWeight:600 }}>Subir nueva evidencia</h4>
        <form onSubmit={handleUpload}>
          <div
            onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}
            onClick={()=>fileInputRef.current?.click()}
            style={{ border:`2px dashed ${dragOver?'var(--accent)':file?'var(--success)':'var(--border)'}`, borderRadius:10, padding:'1.5rem', textAlign:'center', cursor:'pointer', background:dragOver?'rgba(59,130,246,.06)':file?'rgba(16,185,129,.04)':'rgba(255,255,255,.02)', transition:'all .15s', marginBottom:'0.75rem' }}>
            <input ref={fileInputRef} type="file" id="evidence-upload" onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" style={{ display:'none' }} />
            {file ? (
              <div><div style={{ fontSize:'1.5rem', marginBottom:'0.3rem' }}>{fileIcon(file.name)}</div>
              <div style={{ fontSize:'0.88rem', fontWeight:600, color:'var(--success)' }}>{file.name}</div>
              <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)', marginTop:2 }}>{fmtSize(file.size)}</div></div>
            ) : (
              <div><div style={{ fontSize:'1.5rem', marginBottom:'0.3rem' }}>📁</div>
              <div style={{ fontSize:'0.85rem', color:'var(--text-secondary)' }}>Arrastra un archivo aquí o <span style={{ color:'var(--accent)', fontWeight:600 }}>haz clic para seleccionar</span></div>
              <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)', marginTop:'0.3rem' }}>PDF, Word, Excel, imágenes · Máximo 5 MB</div></div>
            )}
          </div>
          <div style={{ display:'flex', gap:'0.75rem' }}>
            {file && <button type="button" onClick={()=>{setFile(null);if(fileInputRef.current)fileInputRef.current.value='';}}
              style={{ background:'none', border:'1px solid var(--border)', color:'var(--text-secondary)', padding:'0.6rem 1rem', borderRadius:8, cursor:'pointer', fontSize:'0.85rem' }}>Quitar</button>}
            <button type="submit" className="btn-primary" disabled={uploading||!file}
              style={{ flex:1, opacity:(!file||uploading)?0.6:1, cursor:(!file||uploading)?'not-allowed':'pointer' }}>
              {uploading?'Subiendo...':'⬆️ Subir evidencia'}
            </button>
          </div>
        </form>
      </div>
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

export default EvidencesModal;