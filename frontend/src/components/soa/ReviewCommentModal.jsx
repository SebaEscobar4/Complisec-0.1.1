import React, { useState } from 'react';

/**
 * Modal de confirmación con comentario opcional, usado al aprobar/rechazar evidencias.
 * Reemplaza window.prompt() para mantener el estilo visual de la app.
 */
const ReviewCommentModal = ({ status, onConfirm, onCancel }) => {
  const [comment, setComment] = useState('');
  const isApprove = status === 'APPROVED';

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
      }}
    >
      <div className="glass-panel" style={{ width: '100%', maxWidth: 480, borderTop: `3px solid ${isApprove ? 'var(--success)' : 'var(--danger)'}` }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', fontWeight: 700 }}>
          {isApprove ? '✅ Aprobar evidencia' : '❌ Rechazar evidencia'}
        </h3>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
          Opcional: deja un comentario sobre tu revisión
        </label>
        <textarea
          autoFocus
          rows={3}
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Comentario (opcional)..."
          style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,.25)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.7rem 1rem', color: 'var(--text-primary)', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} className="btn-primary outline" style={{ padding: '0.6rem 1.25rem' }}>
            Cancelar
          </button>
          <button type="button" onClick={() => onConfirm(comment)} className="btn-primary" style={{ padding: '0.6rem 1.25rem' }}>
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewCommentModal;
