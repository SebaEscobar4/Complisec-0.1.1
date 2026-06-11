import React, { useState, useEffect, useRef } from 'react';
import axios from '../../utils/axiosSetup';
import { jwtDecode } from 'jwt-decode';

const TaskExecutionModal = ({ riskContext, organizationId, onClose }) => {
  const [tasks, setTasks] = useState([]);
  const [soaControl, setSoaControl] = useState(null);
  const [evidences, setEvidences] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Evidences state
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  // User role (Security check)
  const token = localStorage.getItem('token');
  const userRole = token ? (jwtDecode(token)?.role || '') : '';
  const canReview = ['ADMIN', 'CISO', 'AUDITOR'].includes(userRole);

  useEffect(() => {
    fetchData();
  }, [riskContext.id, organizationId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Tasks
      const tasksRes = await axios.get(`/api/risks/${riskContext.id}/tasks`);
      setTasks(tasksRes.data.data || []);

      // 2. Fetch SoA to find the linked control
      const soaRes = await axios.get(`/api/soa?organization_id=${organizationId}`);
      const linkedSoa = soaRes.data.data?.find(s => s.risk_profile_id === riskContext.id);
      
      if (linkedSoa) {
        setSoaControl(linkedSoa);
        // 3. Fetch evidences
        const evRes = await axios.get(`/api/evidences/${linkedSoa.soa_id}`);
        setEvidences(evRes.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching execution plan data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskStatus = async (task) => {
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await axios.put(`/api/risks/tasks/${task.id}`, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    } catch (err) {
      alert('Error al actualizar tarea.');
    }
  };

  const handleFileChange = (e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); };
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]); };
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !soaControl) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file); fd.append('soa_id', soaControl.soa_id);
    try {
      await axios.post('/api/evidences', fd);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchData(); 
    } catch {
      alert('Error al subir evidencia. Máximo 5MB.');
    } finally {
      setUploading(false);
    }
  };

  const handleReview = async (evidenceId, status) => {
    if (!canReview) return; // Capa extra de seguridad front-end
    const comment = window.prompt('Deja un comentario sobre tu revisión:');
    if (comment === null) return;
    try {
      await axios.patch(`/api/evidences/${evidenceId}/review`, { review_status: status, review_comment: comment });
      fetchData(); 
    } catch {
      alert('No se pudo guardar la revisión.');
    }
  };

  const completeControl = async () => {
    if (!canReview) {
      alert('Solo el rol Auditor, CISO o Admin puede dar el visto bueno final del control.');
      return;
    }
    if (!soaControl) return;
    try {
      await axios.put('/api/soa', {
        organization_id: organizationId,
        control_id: soaControl.control_id,
        is_applicable: true,
        justification: soaControl.justification || 'Implementado por plan de mitigación.',
        implementation_status: 'FULLY_IMPLEMENTED',
        risk_profile_id: riskContext.id
      });
      alert('¡Control verificado y marcado como implementado exitosamente! El dashboard ha sido actualizado.');
      onClose();
    } catch (err) {
      alert('Error al marcar el control como implementado.');
    }
  };

  const allTasksCompleted = tasks.length > 0 && tasks.every(t => t.status === 'COMPLETED');
  const hasApprovedEvidence = evidences.some(e => e.review_status === 'APPROVED');
  const canComplete = allTasksCompleted && hasApprovedEvidence;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)', background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: '12px' }}>
                ✅ Panel de Ejecución
              </span>
              {soaControl && (
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', background: 'rgba(59,130,246,0.1)', padding: '3px 8px', borderRadius: '12px' }}>
                  Control {soaControl.control_number}
                </span>
              )}
            </div>
            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>{soaControl?.control_name || 'Cargando control...'}</h2>
            <p className="text-secondary" style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
              Mitigando riesgo: <strong>{riskContext.threat}</strong>
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando detalles operativos...</div>
        ) : (
          <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Checklist */}
            <section>
              <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                1. Checklist Técnico
                <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: allTasksCompleted ? 'var(--success)' : 'var(--text-secondary)' }}>
                  {tasks.filter(t => t.status === 'COMPLETED').length} de {tasks.length} completadas
                </span>
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {tasks.map(task => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <input
                      type="checkbox"
                      checked={task.status === 'COMPLETED'}
                      onChange={() => toggleTaskStatus(task)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.9rem', color: task.status === 'COMPLETED' ? 'var(--text-secondary)' : '#fff', textDecoration: task.status === 'COMPLETED' ? 'line-through' : 'none' }}>
                      {task.description}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Evidencias */}
            {soaControl && (
              <section>
                <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  2. Evidencias y Auditoría
                  <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: hasApprovedEvidence ? 'var(--success)' : 'var(--text-secondary)' }}>
                    {evidences.filter(e => e.review_status === 'APPROVED').length} aprobadas
                  </span>
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  
                  {/* Lista de Evidencias */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {evidences.length === 0 ? (
                      <div style={{ padding: '1rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                        <p className="text-secondary" style={{ margin: 0, fontSize: '0.85rem' }}>No se han subido evidencias aún.</p>
                      </div>
                    ) : evidences.map(ev => (
                      <div key={ev.id} style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${ev.review_status === 'APPROVED' ? 'rgba(16,185,129,0.3)' : ev.review_status === 'REJECTED' ? 'rgba(239,68,68,0.3)' : 'var(--border)'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{ev.document_name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {ev.review_status === 'APPROVED' ? '✅ Aprobada' : ev.review_status === 'REJECTED' ? '❌ Rechazada' : '⏳ Pendiente de Auditoría'}
                            </div>
                          </div>
                          <a href={ev.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>Ver ↗</a>
                        </div>
                        
                        {/* Botones SOLO para Auditor/Ciso/Admin */}
                        {canReview && ev.review_status === 'PENDING' && (
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border)' }}>
                            <button onClick={() => handleReview(ev.id, 'APPROVED')} style={{ flex: 1, padding: '0.3rem', fontSize: '0.7rem', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>✅ Aprobar</button>
                            <button onClick={() => handleReview(ev.id, 'REJECTED')} style={{ flex: 1, padding: '0.3rem', fontSize: '0.7rem', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>❌ Rechazar</button>
                          </div>
                        )}
                        {ev.review_comment && (
                          <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.15)', padding: '0.5rem', borderRadius: '4px', borderLeft: `2px solid ${ev.review_status === 'APPROVED' ? 'var(--success)' : 'var(--danger)'}` }}>
                            <strong>Comentario del auditor:</strong> {ev.review_comment}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Subir Evidencia */}
                  <form onSubmit={handleUpload}>
                    <div
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      style={{ border: `2px dashed ${dragOver ? 'var(--accent)' : file ? 'var(--success)' : 'var(--border)'}`, borderRadius: '8px', padding: '1.5rem 1rem', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}
                    >
                      <input ref={fileInputRef} type="file" onChange={handleFileChange} style={{ display: 'none' }} />
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{file ? '📄' : '📁'}</div>
                      <div style={{ fontSize: '0.8rem', color: file ? 'var(--success)' : 'var(--text-secondary)' }}>
                        {file ? file.name : 'Sube tu evidencia aquí'}
                      </div>
                    </div>
                    <button type="submit" className="btn-primary" disabled={!file || uploading} style={{ width: '100%', marginTop: '0.5rem', padding: '0.6rem' }}>
                      {uploading ? 'Subiendo...' : 'Subir archivo'}
                    </button>
                  </form>
                </div>
              </section>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {!canReview && <span>🔒 Solo los auditores o administradores pueden dar la aprobación final.</span>}
            {canReview && !canComplete && <span>⚠️ Requiere 100% tareas y 1 evidencia aprobada.</span>}
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={onClose} className="btn-primary outline">Cerrar</button>
            
            {/* Botón Maestro solo para auditores/ciso/admin */}
            {canReview && (
              <button 
                onClick={completeControl} 
                className="btn-primary" 
                disabled={!canComplete || soaControl?.implementation_status === 'FULLY_IMPLEMENTED'}
                style={{ 
                  background: canComplete ? 'var(--success)' : 'var(--border)', 
                  borderColor: canComplete ? 'var(--success)' : 'var(--border)',
                  opacity: canComplete ? 1 : 0.5 
                }}
              >
                {soaControl?.implementation_status === 'FULLY_IMPLEMENTED' ? '✅ Control Cumplido y Auditado' : '🏆 Aprobar Control Implementado'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TaskExecutionModal;
