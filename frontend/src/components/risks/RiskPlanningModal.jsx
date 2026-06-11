import React, { useState, useEffect } from 'react';
import axios from '../../utils/axiosSetup';
import { CONTROL_TASKS } from '../../utils/controlTasksDictionary';

const RiskPlanningModal = ({ risk, organizationId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [allControls, setAllControls] = useState([]);
  const [recommendedControls, setRecommendedControls] = useState([]);
  const [showAllControls, setShowAllControls] = useState(false);
  const [selectedControlId, setSelectedControlId] = useState('');
  
  const [pendingControlTasks, setPendingControlTasks] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const soaRes = await axios.get(`/api/soa?organization_id=${organizationId}`);
      const soaList = soaRes.data.data || [];
      setAllControls(soaList);
      calculateRecommendations(soaList);
    } catch (err) {
      setError('No se pudo cargar la información de controles ISO.');
    } finally {
      setLoading(false);
    }
  };

  const calculateRecommendations = (controlsList) => {
    const text = `${risk.threat} ${risk.vulnerability}`.toLowerCase();
    const rules = [
      { keywords: ['contraseña', 'acceso', 'autenticación', 'password', 'login'], control_number: '5.15' },
      { keywords: ['contraseña', 'acceso', 'autenticación', 'password', 'mfa'], control_number: '5.17' },
      { keywords: ['ransomware', 'virus', 'malware', 'antivirus', 'troyano'], control_number: '8.7' },
      { keywords: ['respaldo', 'backup', 'copia de seguridad', 'pérdida de datos'], control_number: '8.13' },
      { keywords: ['red', 'wifi', 'firewall', 'puerto', 'internet'], control_number: '8.20' },
      { keywords: ['incendio', 'robo', 'físico', 'puerta', 'oficina', 'inundación'], control_number: '7.1' },
      { keywords: ['phishing', 'ingeniería social', 'correo', 'engaño', 'capacitación'], control_number: '6.3' },
      { keywords: ['proveedor', 'tercero', 'contratista', 'nube', 'aws', 'tercerizado'], control_number: '5.19' },
      { keywords: ['dispositivo', 'laptop', 'celular', 'móvil', 'equipo', 'hardware'], control_number: '8.1' }
    ];

    const matches = new Set();
    rules.forEach(rule => {
      if (rule.keywords.some(kw => text.includes(kw))) {
        const matchedCtrl = controlsList.find(c => c.control_number === rule.control_number);
        if (matchedCtrl) matches.add(matchedCtrl);
      }
    });

    if (matches.size === 0) {
      ['5.1', '5.2', '8.8'].forEach(num => {
        const ctrl = controlsList.find(c => c.control_number === num);
        if (ctrl) matches.add(ctrl);
      });
    }

    setRecommendedControls(Array.from(matches).slice(0, 3));
  };

  const handleAddIsoControl = (cId = selectedControlId) => {
    if (!cId) return;
    const ctrl = allControls.find(c => c.control_id === cId);
    if (!ctrl) return;

    const suggestedTasks = CONTROL_TASKS[ctrl.control_number];
    
    if (suggestedTasks && suggestedTasks.length > 0) {
      setPendingControlTasks({
        control: ctrl,
        tasks: suggestedTasks.map((desc, idx) => ({ id: idx, description: desc, selected: true })),
        customTask: ''
      });
    } else {
      const taskText = `Implementar control ISO ${ctrl.control_number}: ${ctrl.control_name}`;
      confirmPendingTasksDirectly([taskText], ctrl);
    }
  };

  const confirmPendingTasksDirectly = async (tasksArray, ctrl) => {
    setIsAdding(true);
    try {
      // Crear tareas operativas para este riesgo
      const promises = tasksArray.map(desc => axios.post(`/api/risks/${risk.id}/tasks`, { description: desc }));
      await Promise.all(promises);
      
      // Conectar este riesgo con la Declaración de Aplicabilidad (SoA)
      await axios.post('/api/soa', {
        organization_id: organizationId,
        control_id: ctrl.control_id,
        is_applicable: true,
        justification: "Implementado para mitigar el riesgo: " + risk.threat,
        implementation_status: "PARTIAL",
        risk_profile_id: risk.id
      }).catch(console.error);

      // Cerrar y recargar
      onClose();
      window.location.reload(); 
    } catch (err) {
      setError('Error al guardar la planificación.');
      setIsAdding(false);
    }
  };

  const confirmPendingTasks = () => {
    if (!pendingControlTasks) return;
    const tasksToSave = pendingControlTasks.tasks.filter(t => t.selected).map(t => t.description);
    if (pendingControlTasks.customTask.trim()) tasksToSave.push(pendingControlTasks.customTask.trim());
    if (tasksToSave.length === 0) { setPendingControlTasks(null); return; }
    confirmPendingTasksDirectly(tasksToSave, pendingControlTasks.control);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', background: 'rgba(59,130,246,0.1)', padding: '3px 8px', borderRadius: '12px' }}>
                📅 Planificación Estratégica
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Asignar Plan de Acción</h2>
            <p className="text-secondary" style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
              Riesgo: <strong>{risk.threat}</strong> en el activo <strong>{risk.asset_name}</strong>
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        {error && <div className="alert-error" style={{ margin: '1rem 1.5rem 0' }}>{error}</div>}

        <div style={{ padding: '1.5rem', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Cargando inteligencia de controles...</div>
          ) : (
            <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem', color: 'var(--accent)', fontSize: '1rem' }}>✨ Recomendaciones de ISO 27001</h4>
              <p className="text-secondary" style={{ fontSize: '0.85rem', margin: '0 0 1rem' }}>
                Para mitigar este riesgo, te sugerimos planificar uno de los siguientes controles. Esto creará automáticamente las tareas necesarias en el Kanban del equipo operativo.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {recommendedControls.map(c => (
                  <div key={c.control_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.9rem' }}><strong>{c.control_number}</strong> - {c.control_name}</span>
                    <button onClick={() => handleAddIsoControl(c.control_id)} className="btn-primary" disabled={isAdding}>
                      Asignar Plan
                    </button>
                  </div>
                ))}
              </div>

              {!showAllControls ? (
                <button onClick={() => setShowAllControls(true)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
                  Buscar otro control en la lista completa (93 controles)...
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <select
                    value={selectedControlId}
                    onChange={(e) => setSelectedControlId(e.target.value)}
                    style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                  >
                    <option value="">-- Seleccionar un control ISO 27001 --</option>
                    {allControls.map(c => <option key={c.control_id} value={c.control_id}>{c.control_number} - {c.control_name}</option>)}
                  </select>
                  <button type="button" className="btn-primary" onClick={() => handleAddIsoControl()} disabled={!selectedControlId || isAdding}>Asignar</button>
                </div>
              )}
            </div>
          )}

          {pendingControlTasks && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--accent)', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
              <h4 style={{ margin: '0 0 0.5rem', color: '#fff', fontSize: '1rem' }}>
                Checklist Operativo: {pendingControlTasks.control.control_number}
              </h4>
              <p className="text-secondary" style={{ fontSize: '0.8rem', margin: '0 0 1rem' }}>Selecciona qué tareas requerirás que el equipo de TI implemente.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                {pendingControlTasks.tasks.map((t, idx) => (
                  <label key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={t.selected} onChange={(e) => {
                      const newTasks = [...pendingControlTasks.tasks];
                      newTasks[idx].selected = e.target.checked;
                      setPendingControlTasks({ ...pendingControlTasks, tasks: newTasks });
                    }} style={{ accentColor: 'var(--accent)', marginTop: '2px' }} />
                    <span style={{ fontSize: '0.85rem' }}>{t.description}</span>
                  </label>
                ))}
              </div>
              <input 
                type="text" 
                placeholder="¿Falta algo específico para tu empresa? Añade una tarea extra..." 
                value={pendingControlTasks.customTask} 
                onChange={(e) => setPendingControlTasks({ ...pendingControlTasks, customTask: e.target.value })} 
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '0.85rem', marginBottom: '1.5rem' }} 
              />
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button className="btn-primary outline" style={{ flex: 1 }} onClick={() => setPendingControlTasks(null)} disabled={isAdding}>Cancelar</button>
                <button className="btn-primary" style={{ flex: 2 }} onClick={confirmPendingTasks} disabled={isAdding}>
                  {isAdding ? 'Guardando...' : '🚀 Guardar y Enviar al Kanban de Tareas'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiskPlanningModal;
