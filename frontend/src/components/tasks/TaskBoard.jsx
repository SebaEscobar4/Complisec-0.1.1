import React, { useState, useEffect } from 'react';
import axios from '../../utils/axiosSetup';
import TaskExecutionModal from './TaskExecutionModal';

const TaskBoard = ({ organizationId, viewParams }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Para el modal
  const [selectedRisk, setSelectedRisk] = useState(null);

  useEffect(() => {
    if (organizationId) {
      fetchPlans();
    }
  }, [organizationId]);

  // Si venimos del Dashboard con un control específico, abrir su panel directamente
  useEffect(() => {
    if (!viewParams?.controlNumber || plans.length === 0) return;
    const plan = plans.find(p => p.control_number === viewParams.controlNumber);
    if (plan) {
      setSelectedRisk({ id: plan.risk_profile_id, threat: plan.threat, vulnerability: plan.vulnerability });
    }
  }, [viewParams, plans]);

  const fetchPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`/api/risks/organization/${organizationId}/mitigation-plans`);
      setPlans(res.data.data || []);
    } catch (err) {
      setError('Error al cargar los planes de mitigación del tablero.');
    } finally {
      setLoading(false);
    }
  };

  const getPlanStatus = (plan) => {
    if (plan.implementation_status === 'FULLY_IMPLEMENTED') return 'COMPLETED';
    const hasProgress = plan.tasks.some(t => t.status === 'COMPLETED' || t.status === 'IN_PROGRESS');
    if (hasProgress) return 'IN_PROGRESS';
    return 'PENDING';
  };

  // Separar en columnas
  const pendingPlans = plans.filter(p => getPlanStatus(p) === 'PENDING');
  const inProgressPlans = plans.filter(p => getPlanStatus(p) === 'IN_PROGRESS');
  const completedPlans = plans.filter(p => getPlanStatus(p) === 'COMPLETED');

  const PlanCard = ({ plan }) => {
    const completedTasks = plan.tasks.filter(t => t.status === 'COMPLETED').length;
    
    return (
      <div 
        style={{ 
          background: 'rgba(255,255,255,0.05)', 
          border: '1px solid var(--border)', 
          borderRadius: '8px', 
          padding: '1rem', 
          marginBottom: '0.75rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          transition: 'transform 0.2s',
          cursor: 'pointer'
        }}
        onClick={() => setSelectedRisk({ id: plan.risk_profile_id, threat: plan.threat, vulnerability: plan.vulnerability })}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', background: 'rgba(59,130,246,0.1)', color: 'var(--accent)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(59,130,246,0.2)', fontWeight: 600 }}>
            Control ISO {plan.control_number}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            {completedTasks}/{plan.tasks.length} tareas
          </span>
        </div>

        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>
          {plan.control_name}
        </div>
        
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Riesgo mitigado: <strong>{plan.threat}</strong> en {plan.asset_name}
        </div>

        {/* Progress bar inside card */}
        {plan.tasks.length > 0 && (
          <div style={{ marginTop: '0.5rem', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(completedTasks / plan.tasks.length) * 100}%`, background: 'var(--accent)', transition: 'width 0.3s' }} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.8rem' }}>Tablero Kanban de Mitigación</h1>
        <p className="text-secondary" style={{ margin: 0 }}>Gestiona los planes operativos para mitigar los riesgos detectados.</p>
      </div>

      {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {selectedRisk ? (
        <div>
          <button
            onClick={() => { setSelectedRisk(null); fetchPlans(); }}
            className="btn-primary outline"
            style={{ marginBottom: '1rem' }}
          >
            ← Volver al tablero
          </button>
          <TaskExecutionModal
            riskContext={selectedRisk}
            organizationId={organizationId}
            onClose={() => {
              setSelectedRisk(null);
              fetchPlans();
            }}
          />
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Cargando tablero...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Columna Pendiente */}
          <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>To Do (Pendiente)</span>
              <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px' }}>{pendingPlans.length}</span>
            </h3>
            <div style={{ minHeight: '200px' }}>
              {pendingPlans.length === 0 ? <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Sin planes</p> : pendingPlans.map(p => <PlanCard key={p.risk_profile_id} plan={p} />)}
            </div>
          </div>

          {/* Columna En Progreso */}
          <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(245,158,11,0.02)', borderTop: '3px solid var(--warning)' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>In Progress</span>
              <span style={{ fontSize: '0.8rem', background: 'rgba(245,158,11,0.1)', color: 'var(--warning)', padding: '2px 8px', borderRadius: '12px' }}>{inProgressPlans.length}</span>
            </h3>
            <div style={{ minHeight: '200px' }}>
              {inProgressPlans.length === 0 ? <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Sin planes</p> : inProgressPlans.map(p => <PlanCard key={p.risk_profile_id} plan={p} />)}
            </div>
          </div>

          {/* Columna Completado */}
          <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(16,185,129,0.02)', borderTop: '3px solid var(--success)' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Done (Completado)</span>
              <span style={{ fontSize: '0.8rem', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', padding: '2px 8px', borderRadius: '12px' }}>{completedPlans.length}</span>
            </h3>
            <div style={{ minHeight: '200px' }}>
              {completedPlans.length === 0 ? <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Sin planes</p> : completedPlans.map(p => <PlanCard key={p.risk_profile_id} plan={p} />)}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default TaskBoard;
