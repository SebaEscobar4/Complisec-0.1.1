import React, { useState } from 'react';
import axios from '../../utils/axiosSetup';

const GoalsModal = ({ organizationId, initialGoals, onClose, onSave }) => {
  // Configuración predeterminada si el usuario no tiene metas
  const defaultGoals = initialGoals && initialGoals.length > 0 ? initialGoals : [
    { month: 'Mes 1', expected: 20 },
    { month: 'Mes 2', expected: 40 },
    { month: 'Mes 3', expected: 60 },
    { month: 'Mes 4', expected: 80 },
    { month: 'Mes 5', expected: 90 },
    { month: 'Mes 6', expected: 100 },
  ];

  const [goals, setGoals] = useState(defaultGoals);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoalChange = (index, value) => {
    const newGoals = [...goals];
    newGoals[index].expected = Math.min(100, Math.max(0, parseInt(value, 10) || 0));
    setGoals(newGoals);
  };

  const addMonth = () => {
    if (goals.length >= 24) return; // Límite razonable de 2 años
    setGoals([...goals, { month: `Mes ${goals.length + 1}`, expected: 100 }]);
  };

  const removeMonth = () => {
    if (goals.length <= 1) return;
    const newGoals = [...goals];
    newGoals.pop();
    setGoals(newGoals);
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.put(`/api/organizations/${organizationId}/goals`, { goals });
      onSave(res.data.data);
    } catch (err) {
      console.error(err);
      setError('Error al guardar las metas de cumplimiento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: 500, padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: '0 0 0.25rem' }}>⚙️ Configurar Metas</h2>
            <p className="text-secondary" style={{ margin: 0, fontSize: '0.85rem' }}>
              Define el % esperado de cumplimiento para cada mes de tu plan.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Duración del plan: {goals.length} meses</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={removeMonth} disabled={goals.length <= 1} className="btn-primary outline" style={{ padding: '0.3rem 0.6rem' }}>- Mes</button>
            <button type="button" onClick={addMonth} disabled={goals.length >= 24} className="btn-primary outline" style={{ padding: '0.3rem 0.6rem' }}>+ Mes</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          {goals.map((goal, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <span style={{ width: '60px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {goal.month}
              </span>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={goal.expected} 
                onChange={(e) => handleGoalChange(index, e.target.value)}
                style={{ flex: 1, accentColor: 'var(--accent)' }}
              />
              <span style={{ width: '45px', textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>
                {goal.expected}%
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="button" className="btn-primary outline" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={loading} style={{ flex: 2 }}>
            {loading ? 'Guardando...' : '💾 Guardar Metas'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default GoalsModal;
